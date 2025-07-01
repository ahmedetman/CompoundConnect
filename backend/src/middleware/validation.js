
const { z } = require('zod');
const logger = require('../utils/logger');

// Generic validation middleware factory
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            let dataToValidate;
            
            switch (source) {
                case 'body':
                    dataToValidate = req.body;
                    break;
                case 'params':
                    dataToValidate = req.params;
                    break;
                case 'query':
                    dataToValidate = req.query;
                    break;
                default:
                    dataToValidate = req.body;
            }

            const result = schema.safeParse(dataToValidate);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));

                logger.warn('Validation failed:', { errors, data: dataToValidate });

                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'Request data validation failed',
                    details: errors
                });
            }

            // Replace original data with validated and potentially transformed data
            switch (source) {
                case 'body':
                    req.body = result.data;
                    break;
                case 'params':
                    req.params = result.data;
                    break;
                case 'query':
                    req.query = result.data;
                    break;
            }

            next();
        } catch (error) {
            logger.error('Validation middleware error:', error);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Validation processing failed'
            });
        }
    };
};

// Sanitization helpers
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, '');
};

const sanitizeEmail = (email) => {
    if (typeof email !== 'string') return email;
    return email.trim().toLowerCase();
};

// Custom validation middleware for file uploads
const validateFileUpload = (options = {}) => {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'],
        required = false
    } = options;

    return (req, res, next) => {
        if (!req.file && !required) {
            return next();
        }

        if (!req.file && required) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'File upload is required'
            });
        }

        if (req.file.size > maxSize) {
            return res.status(400).json({
                error: 'Validation Error',
                message: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
            });
        }

        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`
            });
        }

        next();
    };
};

// Rate limiting validation
const validateRateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
    const requests = new Map();

    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old requests
        if (requests.has(clientId)) {
            const clientRequests = requests.get(clientId).filter(time => time > windowStart);
            requests.set(clientId, clientRequests);
        }

        const clientRequests = requests.get(clientId) || [];

        if (clientRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        clientRequests.push(now);
        requests.set(clientId, clientRequests);

        next();
    };
};

module.exports = {
    validate,
    validateFileUpload,
    validateRateLimit,
    sanitizeString,
    sanitizeEmail
};
