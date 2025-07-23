const express = require('express');
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
  validateId 
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

module.exports = router;