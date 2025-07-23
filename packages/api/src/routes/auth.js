const express = require('express');
const authService = require('../services/authService');
const { 
  validateLogin, 
  validateRegisterPersonnel, 
  validateRefreshToken 
} = require('../middleware/validation');
const { authRateLimit } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// POST /api/auth/login
router.post('/login', 
  authRateLimit,
  validateLogin,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    const result = await authService.login(email, password);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  })
);

// POST /api/auth/register-personnel
router.post('/register-personnel',
  authRateLimit,
  validateRegisterPersonnel,
  asyncHandler(async (req, res) => {
    const { invite_code, name, email, password } = req.body;
    
    const result = await authService.registerPersonnel(invite_code, name, email, password);
    
    res.status(201).json({
      success: true,
      message: 'Personnel registration successful',
      data: result
    });
  })
);

// POST /api/auth/refresh-token
router.post('/refresh-token',
  validateRefreshToken,
  asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;
    
    const result = await authService.refreshAccessToken(refresh_token);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });
  })
);

// POST /api/auth/logout
router.post('/logout',
  asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;
    
    if (refresh_token) {
      await authService.revokeRefreshToken(refresh_token);
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

module.exports = router;