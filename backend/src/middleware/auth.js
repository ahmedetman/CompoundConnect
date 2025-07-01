
const passport = require('passport');
const jwt = require('jsonwebtoken');
const database = require('../config/database');
const logger = require('../utils/logger');

// JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            logger.error('JWT authentication error:', err);
            return res.status(500).json({ 
                error: 'Authentication Error', 
                message: 'Internal authentication error' 
            });
        }

        if (!user) {
            logger.warn('JWT authentication failed:', info);
            return res.status(401).json({ 
                error: 'Unauthorized', 
                message: 'Invalid or expired token' 
            });
        }

        req.user = user;
        next();
    })(req, res, next);
};

// Optional JWT Authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return next();
    }

    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            logger.error('Optional JWT authentication error:', err);
        }
        
        if (user) {
            req.user = user;
        }
        
        next();
    })(req, res, next);
};

// Generate JWT token
const generateTokens = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        compound_id: user.compound_id
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '24h',
        issuer: 'compoundconnect',
        audience: 'compoundconnect-api'
    });

    const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' }, 
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, 
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
            issuer: 'compoundconnect',
            audience: 'compoundconnect-api'
        }
    );

    return { accessToken, refreshToken };
};

// Verify refresh token
const verifyRefreshToken = async (token) => {
    try {
        const decoded = jwt.verify(
            token, 
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
            {
                issuer: 'compoundconnect',
                audience: 'compoundconnect-api'
            }
        );

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        const user = await database.findById('users', decoded.id);
        if (!user || !user.is_active) {
            throw new Error('User not found or inactive');
        }

        return user;
    } catch (error) {
        throw error;
    }
};

// Update last login timestamp
const updateLastLogin = async (userId) => {
    try {
        await database.update('users', 
            { last_login_at: new Date() }, 
            { id: userId }
        );
    } catch (error) {
        logger.error('Failed to update last login:', error);
    }
};

module.exports = {
    authenticateJWT,
    optionalAuth,
    generateTokens,
    verifyRefreshToken,
    updateLastLogin
};
