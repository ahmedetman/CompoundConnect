
const express = require('express');
const crypto = require('crypto');

const database = require('../config/database');
const { authenticateJWT } = require('../middleware/auth');
const { requireOwnerAccess, requireSameCompound } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { visitorQRCreateSchema, paginationSchema } = require('../schemas/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication to all owner routes
router.use(authenticateJWT);
router.use(requireOwnerAccess);

// GET /api/owner/qrcodes - Fetch user's personal QR codes
router.get('/qrcodes', async (req, res) => {
    try {
        const userId = req.user.id;
        const compoundId = req.user.compound_id;

        // Get current active season
        const currentSeason = await database.findOne('seasons', {
            compound_id: compoundId,
            is_active: true
        });

        if (!currentSeason) {
            return res.status(404).json({
                error: 'No Active Season',
                message: 'No active season found for payment verification'
            });
        }

        // Get user's units
        const userUnits = await database.query(`
            SELECT u.*, uu.relationship, uu.is_primary
            FROM units u
            JOIN unit_users uu ON u.id = uu.unit_id
            WHERE uu.user_id = ? AND u.compound_id = ? AND u.is_active = true
        `, [userId, compoundId]);

        if (userUnits.length === 0) {
            return res.status(404).json({
                error: 'No Units Found',
                message: 'No units assigned to your account'
            });
        }

        // Check payment status for primary unit
        const primaryUnit = userUnits.find(unit => unit.is_primary) || userUnits[0];
        
        const paymentStatus = await database.query(`
            SELECT 
                COUNT(*) as total_services,
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_services
            FROM payments 
            WHERE unit_id = ? AND season_id = ?
        `, [primaryUnit.id, currentSeason.id]);

        const payments = paymentStatus[0];
        const allPaid = payments.total_services > 0 && payments.paid_services === payments.total_services;

        // Get user's QR codes
        const qrCodes = await database.query(`
            SELECT 
                id,
                qr_type,
                title,
                description,
                is_active,
                requires_payment_check,
                valid_from,
                valid_until,
                current_uses,
                max_uses,
                created_at
            FROM qr_codes 
            WHERE user_id = ? AND compound_id = ? AND qr_type IN ('gate_access', 'pool_access', 'gym_access')
            ORDER BY qr_type, created_at DESC
        `, [userId, compoundId]);

        // Format QR codes with payment status
        const formattedQRCodes = qrCodes.map(qr => ({
            ...qr,
            can_use: qr.is_active && (!qr.requires_payment_check || allPaid),
            payment_required: qr.requires_payment_check && !allPaid
        }));

        res.json({
            qr_codes: formattedQRCodes,
            payment_status: {
                all_paid: allPaid,
                paid_services: payments.paid_services,
                total_services: payments.total_services
            },
            units: userUnits,
            current_season: currentSeason
        });

    } catch (error) {
        logger.error('Get QR codes error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve QR codes'
        });
    }
});

// POST /api/owner/visitors/generate - Create visitor QR code
router.post('/visitors/generate', validate(visitorQRCreateSchema), async (req, res) => {
    try {
        const {
            visitor_name,
            visitor_phone,
            num_persons = 1,
            vehicle_plate,
            valid_from,
            valid_until,
            notes
        } = req.body;

        const userId = req.user.id;
        const compoundId = req.user.compound_id;

        // Set default validity period (24 hours from now)
        const validFrom = valid_from ? new Date(valid_from) : new Date();
        const validUntil = valid_until ? new Date(valid_until) : new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Validate date range
        if (validUntil <= validFrom) {
            return res.status(400).json({
                error: 'Invalid Date Range',
                message: 'Valid until date must be after valid from date'
            });
        }

        // Generate unique QR code hash
        const qrData = `${userId}_${Date.now()}_${Math.random()}`;
        const qrHash = crypto.createHash('sha256').update(qrData).digest('hex');

        // Create visitor QR code
        const qrCodeId = await database.insert('qr_codes', {
            compound_id: compoundId,
            user_id: userId,
            code_hash: qrHash,
            qr_type: 'visitor_pass',
            title: `Visitor Pass for ${visitor_name}`,
            description: notes || `Visitor pass for ${visitor_name} - ${num_persons} person(s)`,
            is_active: true,
            requires_payment_check: false,
            valid_from: validFrom,
            valid_until: validUntil,
            visitor_name,
            visitor_phone,
            num_persons,
            vehicle_plate: vehicle_plate || null,
            metadata: JSON.stringify({
                created_by: req.user.email,
                created_at: new Date().toISOString()
            })
        });

        // Get the created QR code
        const createdQR = await database.findById('qr_codes', qrCodeId);

        logger.info(`Visitor QR code created by ${req.user.email} for ${visitor_name}`);

        res.status(201).json({
            message: 'Visitor QR code created successfully',
            qr_code: {
                id: createdQR.id,
                code: qrHash,
                visitor_name: createdQR.visitor_name,
                visitor_phone: createdQR.visitor_phone,
                num_persons: createdQR.num_persons,
                vehicle_plate: createdQR.vehicle_plate,
                valid_from: createdQR.valid_from,
                valid_until: createdQR.valid_until,
                is_active: createdQR.is_active
            }
        });

    } catch (error) {
        logger.error('Create visitor QR error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create visitor QR code'
        });
    }
});

// GET /api/owner/visitors - List user's visitor passes
router.get('/visitors', validate(paginationSchema, 'query'), async (req, res) => {
    try {
        const { page, limit, sort = 'created_at', order = 'DESC' } = req.query;
        const offset = (page - 1) * limit;

        const userId = req.user.id;
        const compoundId = req.user.compound_id;

        // Get visitor QR codes
        const visitorCodes = await database.query(`
            SELECT 
                id,
                code_hash,
                title,
                description,
                visitor_name,
                visitor_phone,
                num_persons,
                vehicle_plate,
                is_active,
                valid_from,
                valid_until,
                current_uses,
                created_at
            FROM qr_codes 
            WHERE user_id = ? AND compound_id = ? AND qr_type = 'visitor_pass'
            ORDER BY ${sort} ${order}
            LIMIT ? OFFSET ?
        `, [userId, compoundId, limit, offset]);

        // Get total count
        const totalResult = await database.query(`
            SELECT COUNT(*) as total 
            FROM qr_codes 
            WHERE user_id = ? AND compound_id = ? AND qr_type = 'visitor_pass'
        `, [userId, compoundId]);

        const total = totalResult[0].total;

        // Check if each QR is still valid
        const now = new Date();
        const formattedCodes = visitorCodes.map(code => ({
            ...code,
            is_expired: new Date(code.valid_until) < now,
            status: code.is_active ? (new Date(code.valid_until) < now ? 'expired' : 'active') : 'inactive'
        }));

        res.json({
            visitor_passes: formattedCodes,
            pagination: {
                current_page: page,
                per_page: limit,
                total_items: total,
                total_pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Get visitor passes error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve visitor passes'
        });
    }
});

// DELETE /api/owner/visitors/:id - Invalidate visitor pass
router.delete('/visitors/:id', async (req, res) => {
    try {
        const qrCodeId = parseInt(req.params.id);
        const userId = req.user.id;
        const compoundId = req.user.compound_id;

        // Verify ownership
        const qrCode = await database.findOne('qr_codes', {
            id: qrCodeId,
            user_id: userId,
            compound_id: compoundId,
            qr_type: 'visitor_pass'
        });

        if (!qrCode) {
            return res.status(404).json({
                error: 'Visitor Pass Not Found',
                message: 'Visitor pass not found or access denied'
            });
        }

        // Deactivate the QR code
        await database.update('qr_codes', 
            { is_active: false },
            { id: qrCodeId }
        );

        logger.info(`Visitor QR code ${qrCodeId} invalidated by ${req.user.email}`);

        res.json({
            message: 'Visitor pass invalidated successfully'
        });

    } catch (error) {
        logger.error('Invalidate visitor pass error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to invalidate visitor pass'
        });
    }
});

// GET /api/owner/units - Get user's units and payment status
router.get('/units', async (req, res) => {
    try {
        const userId = req.user.id;
        const compoundId = req.user.compound_id;

        // Get user's units with payment status
        const units = await database.query(`
            SELECT 
                u.*,
                uu.relationship,
                uu.is_primary,
                uu.start_date as occupancy_start,
                uu.end_date as occupancy_end,
                ups.season_name,
                ups.total_services,
                ups.paid_services,
                ups.total_due,
                ups.total_paid,
                ups.overall_status
            FROM units u
            JOIN unit_users uu ON u.id = uu.unit_id
            LEFT JOIN unit_payment_status ups ON u.id = ups.unit_id
            WHERE uu.user_id = ? AND u.compound_id = ?
            ORDER BY uu.is_primary DESC, u.unit_number ASC
        `, [userId, compoundId]);

        res.json({
            units: units
        });

    } catch (error) {
        logger.error('Get user units error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve unit information'
        });
    }
});

module.exports = router;
