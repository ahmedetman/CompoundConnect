const express = require('express');
const db = require('../database/connection');
const qrCodeService = require('../services/qrCodeService');
const {
  authenticate,
  authorize,
  checkUnitAccess,
  qrValidationRateLimit
} = require('../middleware/auth');
const {
  validateCreateVisitorQR,
  validateQR,
  validateId,
  validatePagination
} = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// POST /api/qrcodes/visitor - Create visitor QR code
router.post('/visitor',
  authenticate,
  authorize(['owner']),
  validateCreateVisitorQR,
  checkUnitAccess,
  asyncHandler(async (req, res) => {
    const { unit_id, visitor_name, num_persons, vehicle_plate, valid_from, valid_to } = req.body;
    const userId = req.user.userId;
    const compoundId = req.user.compoundId;
    
    const visitorData = {
      visitor_name,
      num_persons,
      vehicle_plate,
      valid_from,
      valid_to
    };
    
    const qrCode = await qrCodeService.createVisitorQR(userId, unit_id, compoundId, visitorData);
    
    res.status(201).json({
      success: true,
      message: 'Visitor QR code created successfully',
      data: qrCode
    });
  })
);

// GET /api/qrcodes/my - Get user's personal QR codes
router.get('/my',
  authenticate,
  authorize(['owner']),
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const compoundId = req.user.compoundId;
    
    const qrCodes = await qrCodeService.getUserPersonalQRs(userId, compoundId);
    
    res.json({
      success: true,
      message: 'Personal QR codes retrieved successfully',
      data: qrCodes
    });
  })
);

// GET /api/qrcodes/visitors - Get user's visitor QR codes
router.get('/visitors',
  authenticate,
  authorize(['owner']),
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { status = 'all' } = req.query;
    
    const qrCodes = await qrCodeService.getUserVisitorQRs(userId, status);
    
    res.json({
      success: true,
      message: 'Visitor QR codes retrieved successfully',
      data: qrCodes
    });
  })
);

// POST /api/qrcodes/validate - Validate QR code (Critical endpoint)
router.post('/validate',
  qrValidationRateLimit,
  authenticate,
  authorize(['security', 'pool_staff', 'facility_staff', 'management']),
  validateQR,
  asyncHandler(async (req, res) => {
    const { qr_data, location_tag } = req.body;
    const scannerUserId = req.user.userId;
    
    const result = await qrCodeService.validateQR(qr_data, scannerUserId, location_tag);
    
    res.json({
      success: true,
      message: 'QR code validation completed',
      data: result
    });
  })
);

// PUT /api/qrcodes/:id/invalidate - Invalidate specific QR code
router.put('/:id/invalidate',
  authenticate,
  authorize(['owner', 'management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const qrCodeId = req.params.id;
    const userId = req.user.userId;

    const result = await qrCodeService.invalidateQR(qrCodeId, userId);

    res.json({
      success: true,
      message: 'QR code invalidated successfully',
      data: result
    });
  })
);

// GET /api/qrcodes/all - Get all QR codes for management (Admin only)
router.get('/all',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit, type, status } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE qr.compound_id = ?';
    let params = [compoundId];

    if (type) {
      whereClause += ' AND qr.type = ?';
      params.push(type);
    }

    if (status === 'active') {
      whereClause += ' AND qr.is_active = 1 AND qr.valid_to > datetime("now")';
    } else if (status === 'expired') {
      whereClause += ' AND (qr.is_active = 0 OR qr.valid_to <= datetime("now"))';
    }

    const qrCodes = await db.all(`
      SELECT
        qr.*,
        u.name as owner_name,
        u.email as owner_email,
        units.unit_number,
        (SELECT COUNT(*) FROM scan_logs sl WHERE sl.qr_code_id = qr.id) as scan_count,
        (SELECT MAX(sl.scanned_at) FROM scan_logs sl WHERE sl.qr_code_id = qr.id) as last_scanned
      FROM qr_codes qr
      JOIN users u ON qr.user_id = u.id
      LEFT JOIN units ON qr.unit_id = units.id
      ${whereClause}
      ORDER BY qr.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count FROM qr_codes qr
      ${whereClause}
    `, params);

    res.json({
      success: true,
      message: 'QR codes retrieved successfully',
      data: {
        qr_codes: qrCodes,
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

// GET /api/qrcodes/stats - Get QR code statistics
router.get('/stats',
  authenticate,
  authorize(['management', 'super_admin']),
  asyncHandler(async (req, res) => {
    const compoundId = req.user.compoundId;

    const stats = await db.get(`
      SELECT
        COUNT(*) as total_codes,
        COUNT(CASE WHEN is_active = 1 AND valid_to > datetime('now') THEN 1 END) as active_codes,
        COUNT(CASE WHEN is_active = 0 OR valid_to <= datetime('now') THEN 1 END) as expired_codes,
        COUNT(CASE WHEN type = 'visitor' THEN 1 END) as visitor_codes,
        COUNT(CASE WHEN type LIKE 'owner_%' THEN 1 END) as owner_codes
      FROM qr_codes
      WHERE compound_id = ?
    `, [compoundId]);

    const scanStats = await db.get(`
      SELECT
        COUNT(*) as total_scans,
        COUNT(CASE WHEN result = 'success' THEN 1 END) as successful_scans,
        COUNT(CASE WHEN result = 'failure' THEN 1 END) as failed_scans
      FROM scan_logs sl
      JOIN qr_codes qr ON sl.qr_code_id = qr.id
      WHERE qr.compound_id = ?
    `, [compoundId]);

    const todayScans = await db.get(`
      SELECT COUNT(*) as today_scans
      FROM scan_logs sl
      JOIN qr_codes qr ON sl.qr_code_id = qr.id
      WHERE qr.compound_id = ? AND date(sl.scanned_at) = date('now')
    `, [compoundId]);

    res.json({
      success: true,
      message: 'QR code statistics retrieved successfully',
      data: {
        ...stats,
        ...scanStats,
        ...todayScans
      }
    });
  })
);

module.exports = router;