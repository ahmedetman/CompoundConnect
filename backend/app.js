
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');

const logger = require('./src/utils/logger');
const passportConfig = require('./src/config/passport');

// Import routes
const authRoutes = require('./src/routes/auth');
const ownerRoutes = require('./src/routes/owner');
const personnelRoutes = require('./src/routes/personnel');
const managementRoutes = require('./src/routes/management');

const app = express();

// Initialize Passport
passportConfig(passport);
app.use(passport.initialize());

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001'
        ];
        
        if (process.env.NODE_ENV === 'production') {
            // Add production origins here
            allowedOrigins.push(process.env.FRONTEND_URL);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/management', managementRoutes);

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message,
            details: err.details
        });
    }
    
    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }
    
    if (err.name === 'ForbiddenError' || err.status === 403) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions'
        });
    }
    
    // Default error response
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.name || 'Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});

module.exports = app;
