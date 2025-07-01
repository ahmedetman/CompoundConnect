
const logger = require('../utils/logger');

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
    'super_admin': 5,
    'management': 4,
    'owner': 3,
    'security': 2,
    'pool_staff': 1
};

// Role-based access control middleware
const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        const hasRequiredRole = Array.isArray(requiredRoles) 
            ? requiredRoles.includes(userRole)
            : requiredRoles === userRole;

        if (!hasRequiredRole) {
            logger.warn(`Access denied for user ${req.user.email} with role ${userRole}. Required: ${requiredRoles}`);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions for this action'
            });
        }

        next();
    };
};

// Check if user has minimum role level
const requireMinRole = (minRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const minRoleLevel = ROLE_HIERARCHY[minRole] || 0;

        if (userRoleLevel < minRoleLevel) {
            logger.warn(`Access denied for user ${req.user.email} with role ${req.user.role}. Minimum required: ${minRole}`);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions for this action'
            });
        }

        next();
    };
};

// Check if user belongs to the same compound
const requireSameCompound = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }

    // Extract compound_id from request parameters or body
    const compoundId = req.params.compoundId || req.body.compound_id || req.query.compound_id;

    if (compoundId && parseInt(compoundId) !== req.user.compound_id) {
        logger.warn(`Compound access denied for user ${req.user.email}. User compound: ${req.user.compound_id}, Requested: ${compoundId}`);
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied to resources outside your compound'
        });
    }

    next();
};

// Check if user owns or has access to specific unit
const requireUnitAccess = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }

    // Super admin and management have access to all units in their compound
    if (['super_admin', 'management'].includes(req.user.role)) {
        return next();
    }

    try {
        const database = require('../config/database');
        const unitId = req.params.unitId || req.body.unit_id || req.query.unit_id;

        if (!unitId) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Unit ID is required'
            });
        }

        // Check if user has access to this unit
        const unitAccess = await database.query(`
            SELECT uu.* FROM unit_users uu
            JOIN units u ON uu.unit_id = u.id
            WHERE uu.unit_id = ? AND uu.user_id = ? AND u.compound_id = ?
        `, [unitId, req.user.id, req.user.compound_id]);

        if (unitAccess.length === 0) {
            logger.warn(`Unit access denied for user ${req.user.email} to unit ${unitId}`);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to this unit'
            });
        }

        req.unitAccess = unitAccess[0];
        next();
    } catch (error) {
        logger.error('Unit access check error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to verify unit access'
        });
    }
};

// Compound-specific admin roles
const requireCompoundAdmin = requireRole(['super_admin', 'management']);

// Owner or higher access
const requireOwnerAccess = requireRole(['super_admin', 'management', 'owner']);

// Staff access (security, pool staff)
const requireStaffAccess = requireRole(['super_admin', 'management', 'security', 'pool_staff']);

// QR validation access (personnel who can scan QR codes)
const requireQRValidationAccess = requireRole(['super_admin', 'management', 'security', 'pool_staff']);

module.exports = {
    requireRole,
    requireMinRole,
    requireSameCompound,
    requireUnitAccess,
    requireCompoundAdmin,
    requireOwnerAccess,
    requireStaffAccess,
    requireQRValidationAccess,
    ROLE_HIERARCHY
};
