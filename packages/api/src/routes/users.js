const express = require('express');
const db = require('../database/connection');
const { 
  authenticate, 
  authorize 
} = require('../middleware/auth');
const { 
  validatePagination 
} = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/users/profile - Get current user profile
router.get('/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const user = await db.get(`
      SELECT 
        u.id, u.name, u.email, u.profile_picture_url, u.role, u.created_at,
        c.name as compound_name,
        c.logo_url as compound_logo
      FROM users u
      JOIN compounds c ON u.compound_id = c.id
      WHERE u.id = ?
    `, [userId]);

    // Get user's units if they are an owner
    let units = [];
    if (user.role === 'owner') {
      units = await db.all(`
        SELECT 
          u.id, u.unit_number, uu.relationship
        FROM unit_users uu
        JOIN units u ON uu.unit_id = u.id
        WHERE uu.user_id = ?
      `, [userId]);
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user,
        units
      }
    });
  })
);

// GET /api/users/news - Get compound news for user
router.get('/news',
  authenticate,
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    const news = await db.all(`
      SELECT 
        id, title, content, type, priority, published_at, expires_at
      FROM news 
      WHERE compound_id = ? 
        AND is_published = 1 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY priority DESC, published_at DESC
      LIMIT ? OFFSET ?
    `, [compoundId, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count FROM news 
      WHERE compound_id = ? 
        AND is_published = 1 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `, [compoundId]);

    res.json({
      success: true,
      message: 'News retrieved successfully',
      data: {
        news,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// GET /api/users/payments - Get user's payment status (for owners)
router.get('/payments',
  authenticate,
  authorize(['owner']),
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const payments = await db.all(`
      SELECT 
        p.id,
        p.status,
        p.amount,
        p.paid_on_date,
        p.due_date,
        s.name as service_name,
        s.description as service_description,
        u.unit_number,
        se.name as season_name
      FROM payments p
      JOIN services s ON p.service_id = s.id
      JOIN units u ON p.unit_id = u.id
      JOIN seasons se ON p.season_id = se.id
      JOIN unit_users uu ON u.id = uu.unit_id
      WHERE uu.user_id = ? AND se.is_active = 1
      ORDER BY s.name
    `, [userId]);

    // Calculate summary
    const summary = {
      total_services: payments.length,
      paid_services: payments.filter(p => p.status === 'paid').length,
      due_services: payments.filter(p => p.status === 'due').length,
      overdue_services: payments.filter(p => p.status === 'overdue').length,
      total_amount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      paid_amount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0)
    };

    res.json({
      success: true,
      message: 'Payment status retrieved successfully',
      data: {
        payments,
        summary
      }
    });
  })
);

// GET /api/users/scan-history - Get user's QR scan history
router.get('/scan-history',
  authenticate,
  authorize(['owner']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const userId = req.user.userId;
    const offset = (page - 1) * limit;

    const scanHistory = await db.all(`
      SELECT 
        sl.id,
        sl.scanned_at,
        sl.location_tag,
        sl.result,
        qr.type as qr_type,
        qr.visitor_name,
        qr.facility_type,
        u.unit_number,
        scanner.name as scanner_name
      FROM scan_logs sl
      JOIN qr_codes qr ON sl.qr_code_id = qr.id
      LEFT JOIN units u ON qr.unit_id = u.id
      LEFT JOIN users scanner ON sl.scanner_user_id = scanner.id
      WHERE qr.user_id = ? AND sl.result = 'success'
      ORDER BY sl.scanned_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count 
      FROM scan_logs sl
      JOIN qr_codes qr ON sl.qr_code_id = qr.id
      WHERE qr.user_id = ? AND sl.result = 'success'
    `, [userId]);

    res.json({
      success: true,
      message: 'Scan history retrieved successfully',
      data: {
        scans: scanHistory,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// PUT /api/users/device-token - Update user's device token for push notifications
router.put('/device-token',
  authenticate,
  asyncHandler(async (req, res) => {
    const { device_token } = req.body;
    const userId = req.user.userId;

    await db.run(`
      UPDATE users SET device_token = ? WHERE id = ?
    `, [device_token, userId]);

    res.json({
      success: true,
      message: 'Device token updated successfully'
    });
  })
);

module.exports = router;