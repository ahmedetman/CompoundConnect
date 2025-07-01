
const express = require('express');
const database = require('../config/database');
const { authenticateJWT } = require('../middleware/auth');
const { requireQRValidationAccess, requireSameCompound } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { qrValidationSchema } = require('../schemas/validation');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication to all personnel routes
router.use(authenticateJWT);
router.use(requireQRValidationAccess);

// POST /api/personnel/validate-qr - CRITICAL ENDPOINT
router.post('/validate-qr', validate(qrValidationSchema), async (req, res) => {
    try {
        const { qr_code, scan_location, device_info } = req.body;
        const scannedByUser = req.user;
        const compoundId = req.user.compound_id;

        logger.info(`QR validation attempt by ${scannedByUser.email} at ${scan_location || 'unknown location'}`);

        // Find QR code by hash
        const qrCodeRecord = await database.findOne('qr_codes', {
            code_hash: qr_code,
            compound_id: compoundId
        });

        if (!qrCodeRecord) {
            await logScanResult(null, scannedByUser.id, 'invalid', scan_location, req, device_info);
            return res.status(404).json({
                success: false,
                result: 'invalid',
                message: 'QR code not found or invalid'
            });
        }

        // Check if QR code is active
        if (!qrCodeRecord.is_active) {
            await logScanResult(qrCodeRecord.id, scannedByUser.id, 'inactive', scan_location, req, device_info);
            return res.status(400).json({
                success: false,
                result: 'inactive',
                message: 'QR code has been deactivated'
            });
        }

        // Check date validity
        const now = new Date();
        const validFrom = new Date(qrCodeRecord.valid_from);
        const validUntil = qrCodeRecord.valid_until ? new Date(qrCodeRecord.valid_until) : null;

        if (now < validFrom || (validUntil && now > validUntil)) {
            await logScanResult(qrCodeRecord.id, scannedByUser.id, 'expired', scan_location, req, device_info);
            return res.status(400).json({
                success: false,
                result: 'expired',
                message: 'QR code is outside its valid time range'
            });
        }

        // Check max uses
        if (qrCodeRecord.max_uses && qrCodeRecord.current_uses >= qrCodeRecord.max_uses) {
            await logScanResult(qrCodeRecord.id, scannedByUser.id, 'max_uses_exceeded', scan_location, req, device_info);
            return res.status(400).json({
                success: false,
                result: 'max_uses_exceeded',
                message: 'QR code has reached maximum usage limit'
            });
        }

        // Payment status check for facility/owner QRs
        let paymentValid = true;
        let paymentDetails = null;

        if (qrCodeRecord.requires_payment_check && qrCodeRecord.user_id) {
            const paymentCheck = await checkPaymentStatus(qrCodeRecord.user_id, compoundId);
            paymentValid = paymentCheck.all_paid;
            paymentDetails = paymentCheck;

            if (!paymentValid) {
                await logScanResult(qrCodeRecord.id, scannedByUser.id, 'payment_required', scan_location, req, device_info);
                return res.status(402).json({
                    success: false,
                    result: 'payment_required',
                    message: 'Payment required for facility access',
                    payment_details: paymentDetails
                });
            }
        }

        // Get user/visitor profile data
        let profileData = {};
        
        if (qrCodeRecord.qr_type === 'visitor_pass') {
            profileData = {
                type: 'visitor',
                name: qrCodeRecord.visitor_name,
                phone: qrCodeRecord.visitor_phone,
                num_persons: qrCodeRecord.num_persons,
                vehicle_plate: qrCodeRecord.vehicle_plate,
                valid_until: qrCodeRecord.valid_until,
                created_by: qrCodeRecord.user_id ? await getUserBasicInfo(qrCodeRecord.user_id) : null
            };
        } else if (qrCodeRecord.user_id) {
            const user = await database.findById('users', qrCodeRecord.user_id, 
                'id, first_name, last_name, phone, photo_url'
            );
            const userUnits = await database.query(`
                SELECT u.unit_number, u.unit_type, uu.relationship, uu.is_primary
                FROM units u
                JOIN unit_users uu ON u.id = uu.unit_id
                WHERE uu.user_id = ? AND u.compound_id = ?
            `, [qrCodeRecord.user_id, compoundId]);

            profileData = {
                type: 'resident',
                name: `${user.first_name} ${user.last_name}`,
                phone: user.phone,
                photo_url: user.photo_url,
                units: userUnits,
                payment_status: paymentDetails
            };
        }

        // Update usage count
        await database.update('qr_codes', 
            { current_uses: qrCodeRecord.current_uses + 1 },
            { id: qrCodeRecord.id }
        );

        // Log successful scan
        await logScanResult(qrCodeRecord.id, scannedByUser.id, 'success', scan_location, req, device_info);

        // Send push notification to QR owner (if applicable)
        if (qrCodeRecord.user_id) {
            try {
                await notificationService.sendQRScanNotification(
                    qrCodeRecord.user_id,
                    scannedByUser,
                    qrCodeRecord,
                    scan_location
                );
            } catch (notifyError) {
                logger.error('Failed to send QR scan notification:', notifyError);
                // Don't fail the validation due to notification error
            }
        }

        logger.info(`QR validation successful: ${qrCodeRecord.qr_type} for ${profileData.name}`);

        res.json({
            success: true,
            result: 'success',
            message: 'QR code validated successfully',
            qr_details: {
                id: qrCodeRecord.id,
                type: qrCodeRecord.qr_type,
                title: qrCodeRecord.title,
                description: qrCodeRecord.description,
                current_uses: qrCodeRecord.current_uses + 1,
                max_uses: qrCodeRecord.max_uses
            },
            profile: profileData,
            scan_info: {
                scanned_by: `${scannedByUser.first_name} ${scannedByUser.last_name}`,
                scan_time: new Date().toISOString(),
                location: scan_location || 'Unknown'
            }
        });

    } catch (error) {
        logger.error('QR validation error:', error);
        res.status(500).json({
            success: false,
            result: 'error',
            message: 'QR validation processing failed'
        });
    }
});

// GET /api/personnel/scan-history - Get scan history for personnel
router.get('/scan-history', async (req, res) => {
    try {
        const { page = 1, limit = 20, date_from, date_to } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const compoundId = req.user.compound_id;

        let whereClause = 'WHERE qc.compound_id = ?';
        let queryParams = [compoundId];

        // Date range filter
        if (date_from) {
            whereClause += ' AND sl.scan_timestamp >= ?';
            queryParams.push(date_from + ' 00:00:00');
        }
        if (date_to) {
            whereClause += ' AND sl.scan_timestamp <= ?';
            queryParams.push(date_to + ' 23:59:59');
        }

        // Staff can only see their own scans unless they're management
        if (!['super_admin', 'management'].includes(req.user.role)) {
            whereClause += ' AND sl.scanned_by_user_id = ?';
            queryParams.push(req.user.id);
        }

        const scanHistory = await database.query(`
            SELECT 
                sl.*,
                qc.qr_type,
                qc.title as qr_title,
                qc.visitor_name,
                CONCAT(u.first_name, ' ', u.last_name) as qr_owner_name,
                CONCAT(scanner.first_name, ' ', scanner.last_name) as scanned_by_name
            FROM scan_logs sl
            JOIN qr_codes qc ON sl.qr_code_id = qc.id
            LEFT JOIN users u ON qc.user_id = u.id
            JOIN users scanner ON sl.scanned_by_user_id = scanner.id
            ${whereClause}
            ORDER BY sl.scan_timestamp DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), offset]);

        // Get total count
        const totalResult = await database.query(`
            SELECT COUNT(*) as total
            FROM scan_logs sl
            JOIN qr_codes qc ON sl.qr_code_id = qc.id
            ${whereClause}
        `, queryParams);

        const total = totalResult[0].total;

        res.json({
            scan_history: scanHistory,
            pagination: {
                current_page: parseInt(page),
                per_page: parseInt(limit),
                total_items: total,
                total_pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Get scan history error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve scan history'
        });
    }
});

// GET /api/personnel/active-visitors - Get currently active visitor passes
router.get('/active-visitors', async (req, res) => {
    try {
        const compoundId = req.user.compound_id;

        const activeVisitors = await database.query(`
            SELECT 
                qc.id,
                qc.visitor_name,
                qc.visitor_phone,
                qc.num_persons,
                qc.vehicle_plate,
                qc.valid_from,
                qc.valid_until,
                qc.current_uses,
                CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
                u.phone as created_by_phone,
                units.unit_numbers
            FROM qr_codes qc
            JOIN users u ON qc.user_id = u.id
            LEFT JOIN (
                SELECT 
                    uu.user_id,
                    GROUP_CONCAT(units.unit_number) as unit_numbers
                FROM unit_users uu
                JOIN units ON uu.unit_id = units.id
                WHERE units.compound_id = ?
                GROUP BY uu.user_id
            ) units ON u.id = units.user_id
            WHERE qc.compound_id = ? 
                AND qc.qr_type = 'visitor_pass'
                AND qc.is_active = true
                AND qc.valid_from <= NOW()
                AND (qc.valid_until IS NULL OR qc.valid_until > NOW())
            ORDER BY qc.valid_from DESC
        `, [compoundId, compoundId]);

        res.json({
            active_visitors: activeVisitors
        });

    } catch (error) {
        logger.error('Get active visitors error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve active visitors'
        });
    }
});

// Helper functions
async function logScanResult(qrCodeId, scannedByUserId, result, location, req, deviceInfo) {
    try {
        await database.insert('scan_logs', {
            qr_code_id: qrCodeId,
            scanned_by_user_id: scannedByUserId,
            scan_location: location || null,
            scan_result: result,
            scan_timestamp: new Date(),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent'),
            device_info: deviceInfo ? JSON.stringify(deviceInfo) : null
        });
    } catch (error) {
        logger.error('Failed to log scan result:', error);
    }
}

async function checkPaymentStatus(userId, compoundId) {
    try {
        // Get current active season
        const currentSeason = await database.findOne('seasons', {
            compound_id: compoundId,
            is_active: true
        });

        if (!currentSeason) {
            return { all_paid: false, reason: 'No active season' };
        }

        // Get user's primary unit
        const userUnit = await database.query(`
            SELECT u.id
            FROM units u
            JOIN unit_users uu ON u.id = uu.unit_id
            WHERE uu.user_id = ? AND u.compound_id = ? AND uu.is_primary = true
            LIMIT 1
        `, [userId, compoundId]);

        if (userUnit.length === 0) {
            return { all_paid: false, reason: 'No unit assigned' };
        }

        const unitId = userUnit[0].id;

        // Check payment status
        const paymentStatus = await database.query(`
            SELECT 
                COUNT(*) as total_services,
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_services,
                SUM(amount_due) as total_due,
                SUM(amount_paid) as total_paid
            FROM payments 
            WHERE unit_id = ? AND season_id = ?
        `, [unitId, currentSeason.id]);

        const payments = paymentStatus[0];
        const allPaid = payments.total_services > 0 && payments.paid_services === payments.total_services;

        return {
            all_paid: allPaid,
            paid_services: payments.paid_services,
            total_services: payments.total_services,
            total_due: payments.total_due,
            total_paid: payments.total_paid,
            season: currentSeason.name
        };

    } catch (error) {
        logger.error('Payment status check error:', error);
        return { all_paid: false, reason: 'Payment check failed' };
    }
}

async function getUserBasicInfo(userId) {
    try {
        const user = await database.findById('users', userId, 'first_name, last_name, phone');
        return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
    } catch (error) {
        return 'Unknown User';
    }
}

module.exports = router;
