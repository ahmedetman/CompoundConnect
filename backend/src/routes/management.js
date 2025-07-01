
const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const database = require('../config/database');
const { authenticateJWT } = require('../middleware/auth');
const { requireCompoundAdmin, requireSameCompound } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const {
    userCreateSchema,
    userUpdateSchema,
    unitCreateSchema,
    unitUpdateSchema,
    serviceCreateSchema,
    serviceUpdateSchema,
    paymentUpdateSchema,
    seasonCreateSchema,
    seasonUpdateSchema,
    newsAlertCreateSchema,
    newsAlertUpdateSchema,
    paginationSchema,
    dateRangeSchema
} = require('../schemas/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication and admin authorization to all management routes
router.use(authenticateJWT);
router.use(requireCompoundAdmin);

// ==================== USER MANAGEMENT ====================

// GET /api/management/users - List all users
router.get('/users', validate(paginationSchema, 'query'), async (req, res) => {
    try {
        const { page, limit, sort = 'created_at', order = 'DESC' } = req.query;
        const offset = (page - 1) * limit;
        const compoundId = req.user.compound_id;

        const users = await database.query(`
            SELECT 
                u.*,
                GROUP_CONCAT(CONCAT(units.unit_number, ' (', uu.relationship, ')') SEPARATOR ', ') as units
            FROM users u
            LEFT JOIN unit_users uu ON u.id = uu.user_id
            LEFT JOIN units ON uu.unit_id = units.id
            WHERE u.compound_id = ?
            GROUP BY u.id
            ORDER BY ${sort} ${order}
            LIMIT ? OFFSET ?
        `, [compoundId, limit, offset]);

        const totalResult = await database.query(
            'SELECT COUNT(*) as total FROM users WHERE compound_id = ?',
            [compoundId]
        );

        const total = totalResult[0].total;

        res.json({
            users: users.map(user => ({
                ...user,
                password_hash: undefined // Remove password hash from response
            })),
            pagination: {
                current_page: page,
                per_page: limit,
                total_items: total,
                total_pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve users'
        });
    }
});

// POST /api/management/users - Create new user
router.post('/users', validate(userCreateSchema), async (req, res) => {
    try {
        const {
            email,
            password,
            first_name,
            last_name,
            phone,
            role,
            unit_ids = [],
            relationship = 'owner'
        } = req.body;

        const compoundId = req.user.compound_id;

        // Check if email already exists
        const existingUser = await database.findOne('users', { email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                error: 'Email Already Exists',
                message: 'An account with this email already exists'
            });
        }

        let userData = {
            compound_id: compoundId,
            email: email.toLowerCase(),
            first_name,
            last_name,
            phone: phone || null,
            role,
            is_active: true
        };

        // Handle password or invite code
        if (password) {
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            userData.password_hash = await bcrypt.hash(password, saltRounds);
        } else {
            // Generate invite code for personnel
            userData.invite_code = uuidv4();
            userData.invite_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        }

        // Create user in transaction
        const userId = await database.transaction(async (connection) => {
            const [result] = await connection.execute(
                'INSERT INTO users SET ?',
                [userData]
            );

            const newUserId = result.insertId;

            // Link to units if provided
            if (unit_ids.length > 0) {
                for (const unitId of unit_ids) {
                    await connection.execute(
                        'INSERT INTO unit_users (unit_id, user_id, relationship, start_date) VALUES (?, ?, ?, ?)',
                        [unitId, newUserId, relationship, new Date()]
                    );
                }
            }

            return newUserId;
        });

        // Generate QR codes for new owners
        if (role === 'owner') {
            await generateUserQRCodes(userId, compoundId);
        }

        const newUser = await database.findById('users', userId);

        logger.info(`User created by ${req.user.email}: ${email}`);

        res.status(201).json({
            message: 'User created successfully',
            user: {
                ...newUser,
                password_hash: undefined
            },
            invite_code: userData.invite_code || null
        });

    } catch (error) {
        logger.error('Create user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create user'
        });
    }
});

// PUT /api/management/users/:id - Update user
router.put('/users/:id', validate(userUpdateSchema), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const compoundId = req.user.compound_id;

        // Verify user belongs to compound
        const user = await database.findOne('users', {
            id: userId,
            compound_id: compoundId
        });

        if (!user) {
            return res.status(404).json({
                error: 'User Not Found',
                message: 'User not found or access denied'
            });
        }

        const updateData = { ...req.body };
        updateData.updated_at = new Date();

        await database.update('users', updateData, { id: userId });

        const updatedUser = await database.findById('users', userId);

        logger.info(`User updated by ${req.user.email}: ${updatedUser.email}`);

        res.json({
            message: 'User updated successfully',
            user: {
                ...updatedUser,
                password_hash: undefined
            }
        });

    } catch (error) {
        logger.error('Update user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update user'
        });
    }
});

// DELETE /api/management/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const compoundId = req.user.compound_id;

        // Prevent self-deletion
        if (userId === req.user.id) {
            return res.status(400).json({
                error: 'Invalid Operation',
                message: 'Cannot delete your own account'
            });
        }

        // Verify user belongs to compound
        const user = await database.findOne('users', {
            id: userId,
            compound_id: compoundId
        });

        if (!user) {
            return res.status(404).json({
                error: 'User Not Found',
                message: 'User not found or access denied'
            });
        }

        await database.delete('users', { id: userId });

        logger.info(`User deleted by ${req.user.email}: ${user.email}`);

        res.json({
            message: 'User deleted successfully'
        });

    } catch (error) {
        logger.error('Delete user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete user'
        });
    }
});

// POST /api/management/users/:id/generate-invite - Generate new invite code
router.post('/users/:id/generate-invite', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const compoundId = req.user.compound_id;

        const user = await database.findOne('users', {
            id: userId,
            compound_id: compoundId
        });

        if (!user) {
            return res.status(404).json({
                error: 'User Not Found',
                message: 'User not found or access denied'
            });
        }

        const inviteCode = uuidv4();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await database.update('users', {
            invite_code: inviteCode,
            invite_expires_at: expiresAt
        }, { id: userId });

        logger.info(`Invite code generated for user ${user.email} by ${req.user.email}`);

        res.json({
            message: 'Invite code generated successfully',
            invite_code: inviteCode,
            expires_at: expiresAt
        });

    } catch (error) {
        logger.error('Generate invite code error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to generate invite code'
        });
    }
});

// ==================== UNIT MANAGEMENT ====================

// GET /api/management/units - List all units
router.get('/units', validate(paginationSchema, 'query'), async (req, res) => {
    try {
        const { page, limit, sort = 'unit_number', order = 'ASC' } = req.query;
        const offset = (page - 1) * limit;
        const compoundId = req.user.compound_id;

        const units = await database.query(`
            SELECT 
                u.*,
                GROUP_CONCAT(
                    CONCAT(users.first_name, ' ', users.last_name, ' (', uu.relationship, ')')
                    SEPARATOR ', '
                ) as residents,
                ups.overall_status as payment_status
            FROM units u
            LEFT JOIN unit_users uu ON u.id = uu.unit_id
            LEFT JOIN users ON uu.user_id = users.id
            LEFT JOIN unit_payment_status ups ON u.id = ups.unit_id
            WHERE u.compound_id = ?
            GROUP BY u.id
            ORDER BY ${sort} ${order}
            LIMIT ? OFFSET ?
        `, [compoundId, limit, offset]);

        const totalResult = await database.query(
            'SELECT COUNT(*) as total FROM units WHERE compound_id = ?',
            [compoundId]
        );

        const total = totalResult[0].total;

        res.json({
            units: units,
            pagination: {
                current_page: page,
                per_page: limit,
                total_items: total,
                total_pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Get units error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve units'
        });
    }
});

// POST /api/management/units - Create new unit
router.post('/units', validate(unitCreateSchema), async (req, res) => {
    try {
        const unitData = {
            ...req.body,
            compound_id: req.user.compound_id
        };

        const unitId = await database.insert('units', unitData);
        const newUnit = await database.findById('units', unitId);

        logger.info(`Unit created by ${req.user.email}: ${newUnit.unit_number}`);

        res.status(201).json({
            message: 'Unit created successfully',
            unit: newUnit
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Unit Already Exists',
                message: 'A unit with this number already exists in the compound'
            });
        }

        logger.error('Create unit error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create unit'
        });
    }
});

// PUT /api/management/units/:id - Update unit
router.put('/units/:id', validate(unitUpdateSchema), async (req, res) => {
    try {
        const unitId = parseInt(req.params.id);
        const compoundId = req.user.compound_id;

        const unit = await database.findOne('units', {
            id: unitId,
            compound_id: compoundId
        });

        if (!unit) {
            return res.status(404).json({
                error: 'Unit Not Found',
                message: 'Unit not found or access denied'
            });
        }

        const updateData = { ...req.body };
        updateData.updated_at = new Date();

        await database.update('units', updateData, { id: unitId });

        const updatedUnit = await database.findById('units', unitId);

        logger.info(`Unit updated by ${req.user.email}: ${updatedUnit.unit_number}`);

        res.json({
            message: 'Unit updated successfully',
            unit: updatedUnit
        });

    } catch (error) {
        logger.error('Update unit error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update unit'
        });
    }
});

// POST /api/management/units/:id/payment - Mark unit's service fees as paid
router.post('/units/:id/payment', validate(paymentUpdateSchema), async (req, res) => {
    try {
        const unitId = parseInt(req.params.id);
        const compoundId = req.user.compound_id;
        const { payment_status, amount_paid, payment_method, transaction_reference, notes } = req.body;

        // Verify unit belongs to compound
        const unit = await database.findOne('units', {
            id: unitId,
            compound_id: compoundId
        });

        if (!unit) {
            return res.status(404).json({
                error: 'Unit Not Found',
                message: 'Unit not found or access denied'
            });
        }

        // Get current season
        const currentSeason = await database.findOne('seasons', {
            compound_id: compoundId,
            is_active: true
        });

        if (!currentSeason) {
            return res.status(404).json({
                error: 'No Active Season',
                message: 'No active season found for payment processing'
            });
        }

        // Update payments for this unit in current season
        const updateData = {
            payment_status,
            updated_at: new Date()
        };

        if (amount_paid !== undefined) updateData.amount_paid = amount_paid;
        if (payment_method) updateData.payment_method = payment_method;
        if (transaction_reference) updateData.transaction_reference = transaction_reference;
        if (notes) updateData.notes = notes;
        if (payment_status === 'paid') updateData.paid_date = new Date();

        await database.query(
            'UPDATE payments SET ? WHERE unit_id = ? AND season_id = ?',
            [updateData, unitId, currentSeason.id]
        );

        logger.info(`Payment updated for unit ${unit.unit_number} by ${req.user.email}`);

        res.json({
            message: 'Payment status updated successfully'
        });

    } catch (error) {
        logger.error('Update payment error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update payment status'
        });
    }
});

// ==================== REPORTS ====================

// GET /api/management/reports/payments - Generate payments due reports
router.get('/reports/payments', validate(dateRangeSchema, 'query'), async (req, res) => {
    try {
        const compoundId = req.user.compound_id;
        const { start_date, end_date } = req.query;

        let whereClause = 'WHERE u.compound_id = ?';
        let queryParams = [compoundId];

        if (start_date) {
            whereClause += ' AND p.due_date >= ?';
            queryParams.push(start_date);
        }
        if (end_date) {
            whereClause += ' AND p.due_date <= ?';
            queryParams.push(end_date);
        }

        const paymentsReport = await database.query(`
            SELECT 
                u.unit_number,
                u.unit_type,
                s.name as service_name,
                p.amount_due,
                p.amount_paid,
                p.payment_status,
                p.due_date,
                p.paid_date,
                sea.name as season_name,
                GROUP_CONCAT(CONCAT(users.first_name, ' ', users.last_name) SEPARATOR ', ') as residents
            FROM payments p
            JOIN units u ON p.unit_id = u.id
            JOIN services s ON p.service_id = s.id
            JOIN seasons sea ON p.season_id = sea.id
            LEFT JOIN unit_users uu ON u.id = uu.unit_id
            LEFT JOIN users ON uu.user_id = users.id
            ${whereClause}
            GROUP BY p.id
            ORDER BY p.due_date DESC, u.unit_number ASC
        `, queryParams);

        // Summary statistics
        const summary = await database.query(`
            SELECT 
                COUNT(*) as total_payments,
                SUM(amount_due) as total_due,
                SUM(amount_paid) as total_paid,
                SUM(CASE WHEN payment_status = 'pending' THEN amount_due ELSE 0 END) as pending_amount,
                SUM(CASE WHEN payment_status = 'overdue' THEN amount_due ELSE 0 END) as overdue_amount
            FROM payments p
            JOIN units u ON p.unit_id = u.id
            ${whereClause}
        `, queryParams);

        res.json({
            payments: paymentsReport,
            summary: summary[0]
        });

    } catch (error) {
        logger.error('Generate payments report error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to generate payments report'
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

async function generateUserQRCodes(userId, compoundId) {
    try {
        const qrTypes = [
            { type: 'gate_access', title: 'Gate Access', description: 'Main gate access QR code', requiresPayment: false },
            { type: 'pool_access', title: 'Pool Access', description: 'Swimming pool access QR code', requiresPayment: true },
            { type: 'gym_access', title: 'Gym Access', description: 'Gymnasium access QR code', requiresPayment: true }
        ];

        for (const qrType of qrTypes) {
            const qrData = `${userId}_${qrType.type}_${Date.now()}_${Math.random()}`;
            const qrHash = crypto.createHash('sha256').update(qrData).digest('hex');

            await database.insert('qr_codes', {
                compound_id: compoundId,
                user_id: userId,
                code_hash: qrHash,
                qr_type: qrType.type,
                title: qrType.title,
                description: qrType.description,
                is_active: true,
                requires_payment_check: qrType.requiresPayment
            });
        }

        logger.info(`QR codes generated for user ID: ${userId}`);
    } catch (error) {
        logger.error('Generate QR codes error:', error);
    }
}

module.exports = router;
