const authService = require('../services/authService');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired' 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed' 
    });
  }
};

// Authorization middleware - check user roles
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

// Compound access middleware - ensure user can only access their compound's data
const checkCompoundAccess = (req, res, next) => {
  const userCompoundId = req.user.compoundId;
  const requestedCompoundId = req.params.compoundId || req.body.compound_id || req.query.compound_id;

  // Super admins can access any compound
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Other users can only access their own compound
  if (requestedCompoundId && parseInt(requestedCompoundId) !== userCompoundId) {
    return res.status(403).json({ 
      error: 'Access denied. Cannot access other compound data.' 
    });
  }

  next();
};

// Unit ownership middleware - ensure user can only access units they own/manage
const checkUnitAccess = async (req, res, next) => {
  try {
    const db = require('../database/connection');
    const unitId = req.params.unitId || req.body.unit_id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Management and super admin can access any unit in their compound
    if (['management', 'super_admin'].includes(userRole)) {
      return next();
    }

    // Check if user is associated with the unit
    const unitAccess = await db.get(`
      SELECT uu.id 
      FROM unit_users uu
      JOIN units u ON uu.unit_id = u.id
      WHERE uu.unit_id = ? AND uu.user_id = ? AND u.compound_id = ?
    `, [unitId, userId, req.user.compoundId]);

    if (!unitAccess) {
      return res.status(403).json({ 
        error: 'Access denied. You do not have access to this unit.' 
      });
    }

    next();
  } catch (error) {
    console.error('Unit access check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later.'
);

const qrValidationRateLimit = createRateLimiter(
  60 * 1000, // 1 minute
  30, // 30 validations per minute
  'Too many QR validation requests, please slow down.'
);

const generalRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests, please try again later.'
);

module.exports = {
  authenticate,
  authorize,
  checkCompoundAccess,
  checkUnitAccess,
  authRateLimit,
  qrValidationRateLimit,
  generalRateLimit
};