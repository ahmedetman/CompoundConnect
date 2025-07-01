
const crypto = require('crypto');
const logger = require('./logger');

// Generate secure random string
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Generate alphanumeric code (for invite codes)
function generateAlphanumericCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Hash sensitive data
function hashData(data, salt = null) {
    const saltToUse = salt || crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(data + saltToUse).digest('hex');
    return { hash, salt: saltToUse };
}

// Verify hashed data
function verifyHash(data, hash, salt) {
    const newHash = crypto.createHash('sha256').update(data + salt).digest('hex');
    return newHash === hash;
}

// Sanitize user input
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/['"]/g, '') // Remove quotes to prevent SQL injection
        .substring(0, 1000); // Limit length
}

// Format phone number
function formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Add + prefix if not present and has country code
    if (digits.length > 10 && !phone.startsWith('+')) {
        return '+' + digits;
    }
    
    return phone;
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Format currency
function formatCurrency(amount, currency = 'USD') {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    } catch (error) {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

// Format date
function formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return null;
    
    const d = new Date(date);
    
    if (isNaN(d.getTime())) return null;
    
    switch (format) {
        case 'YYYY-MM-DD':
            return d.toISOString().split('T')[0];
        case 'DD/MM/YYYY':
            return d.toLocaleDateString('en-GB');
        case 'MM/DD/YYYY':
            return d.toLocaleDateString('en-US');
        case 'ISO':
            return d.toISOString();
        default:
            return d.toISOString().split('T')[0];
    }
}

// Calculate days between dates
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    
    return Math.round((secondDate - firstDate) / oneDay);
}

// Generate pagination metadata
function generatePaginationMeta(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    
    return {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_items: parseInt(total),
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1,
        next_page: page < totalPages ? page + 1 : null,
        prev_page: page > 1 ? page - 1 : null
    };
}

// Slugify string (for URLs)
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

// Deep merge objects
function deepMerge(target, source) {
    const output = Object.assign({}, target);
    
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    
    return output;
}

function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

// Generate QR code display data
function generateQRDisplayData(qrCode, additionalData = {}) {
    return {
        id: qrCode.id,
        code: qrCode.code_hash,
        type: qrCode.qr_type,
        title: qrCode.title,
        description: qrCode.description,
        is_active: qrCode.is_active,
        valid_from: qrCode.valid_from,
        valid_until: qrCode.valid_until,
        current_uses: qrCode.current_uses,
        max_uses: qrCode.max_uses,
        created_at: qrCode.created_at,
        ...additionalData
    };
}

// Validate file upload
function validateFileUpload(file, options = {}) {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
        allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
    } = options;

    const errors = [];

    if (!file) {
        errors.push('No file provided');
        return { valid: false, errors };
    }

    // Check file size
    if (file.size > maxSize) {
        errors.push(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
        errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    const fileExtension = '.' + file.originalname.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        errors.push(`File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Rate limiting helper
function createRateLimiter(windowMs, maxRequests) {
    const requests = new Map();

    return (identifier) => {
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old requests
        if (requests.has(identifier)) {
            const userRequests = requests.get(identifier).filter(time => time > windowStart);
            requests.set(identifier, userRequests);
        }

        const userRequests = requests.get(identifier) || [];

        if (userRequests.length >= maxRequests) {
            return {
                allowed: false,
                retryAfter: Math.ceil((windowMs - (now - userRequests[0])) / 1000)
            };
        }

        userRequests.push(now);
        requests.set(identifier, userRequests);

        return {
            allowed: true,
            remaining: maxRequests - userRequests.length
        };
    };
}

// Error response helper
function createErrorResponse(error, message = null, statusCode = 500) {
    const response = {
        error: error.name || 'Error',
        message: message || error.message || 'An error occurred',
        timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV !== 'production') {
        response.stack = error.stack;
    }

    return {
        statusCode,
        response
    };
}

// Success response helper
function createSuccessResponse(data, message = 'Success', meta = {}) {
    return {
        success: true,
        message,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            ...meta
        }
    };
}

module.exports = {
    generateSecureToken,
    generateAlphanumericCode,
    hashData,
    verifyHash,
    sanitizeInput,
    formatPhoneNumber,
    isValidEmail,
    formatCurrency,
    formatDate,
    daysBetween,
    generatePaginationMeta,
    slugify,
    deepMerge,
    generateQRDisplayData,
    validateFileUpload,
    createRateLimiter,
    createErrorResponse,
    createSuccessResponse
};
