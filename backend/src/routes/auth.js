
const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const database = require('../config/database');
const { authenticateJWT, generateTokens, verifyRefreshToken, updateLastLogin } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { loginSchema, registerSchema, refreshTokenSchema } = require('../schemas/validation');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await database.findOne('users', { email: email.toLowerCase() });

        if (!user) {
            logger.warn(`Login attempt with non-existent email: ${email}`);
            return res.status(401).json({
                error: 'Invalid Credentials',
                message: 'Email or password is incorrect'
            });
        }

        if (!user.is_active) {
            logger.warn(`Login attempt by inactive user: ${email}`);
            return res.status(401).json({
                error: 'Account Disabled',
                message: 'Your account has been disabled. Please contact administration.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            logger.warn(`Failed login attempt for user: ${email}`);
            return res.status(401).json({
                error: 'Invalid Credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Update last login
        await updateLastLogin(user.id);

        // Get compound information
        const compound = await database.findById('compounds', user.compound_id, 'id, name, logo_url');

        logger.info(`Successful login for user: ${email}`);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                photo_url: user.photo_url,
                compound: compound
            },
            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'Bearer',
                expires_in: process.env.JWT_EXPIRE || '24h'
            }
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Login processing failed'
        });
    }
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
    try {
        const { email, password, first_name, last_name, phone, invite_code } = req.body;

        // Check if email already exists
        const existingUser = await database.findOne('users', { email: email.toLowerCase() });

        if (existingUser) {
            return res.status(409).json({
                error: 'Email Already Exists',
                message: 'An account with this email already exists'
            });
        }

        // Verify invite code
        const inviteUser = await database.query(
            'SELECT * FROM users WHERE invite_code = ? AND invite_expires_at > NOW()',
            [invite_code]
        );

        if (inviteUser.length === 0) {
            return res.status(400).json({
                error: 'Invalid Invite Code',
                message: 'The invite code is invalid or has expired'
            });
        }

        const inviter = inviteUser[0];

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create new user
        const userId = await database.insert('users', {
            compound_id: inviter.compound_id,
            email: email.toLowerCase(),
            password_hash,
            first_name,
            last_name,
            phone: phone || null,
            role: 'owner', // Default role for registration
            is_active: true
        });

        // Clear the invite code
        await database.update('users', 
            { invite_code: null, invite_expires_at: null },
            { id: inviter.id }
        );

        // Get the created user
        const newUser = await database.findById('users', userId);
        const compound = await database.findById('compounds', newUser.compound_id, 'id, name, logo_url');

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(newUser);

        logger.info(`User registered successfully: ${email}`);

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: newUser.id,
                email: newUser.email,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                role: newUser.role,
                photo_url: newUser.photo_url,
                compound: compound
            },
            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'Bearer',
                expires_in: process.env.JWT_EXPIRE || '24h'
            }
        });

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Registration processing failed'
        });
    }
});

// POST /api/auth/refresh
router.post('/refresh', validate(refreshTokenSchema), async (req, res) => {
    try {
        const { refresh_token } = req.body;

        // Verify refresh token
        const user = await verifyRefreshToken(refresh_token);

        // Generate new tokens
        const { accessToken, refreshToken } = generateTokens(user);

        res.json({
            message: 'Token refreshed successfully',
            tokens: {
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'Bearer',
                expires_in: process.env.JWT_EXPIRE || '24h'
            }
        });

    } catch (error) {
        logger.error('Token refresh error:', error);
        res.status(401).json({
            error: 'Invalid Refresh Token',
            message: 'The refresh token is invalid or has expired'
        });
    }
});

// POST /api/auth/logout
router.post('/logout', authenticateJWT, async (req, res) => {
    try {
        // In a production environment, you might want to maintain a blacklist of tokens
        // For now, we'll just return success since JWTs are stateless
        
        logger.info(`User logged out: ${req.user.email}`);

        res.json({
            message: 'Logout successful'
        });

    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Logout processing failed'
        });
    }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticateJWT, async (req, res) => {
    try {
        const user = await database.findById('users', req.user.id, 
            'id, compound_id, email, first_name, last_name, role, phone, photo_url, last_login_at'
        );

        if (!user) {
            return res.status(404).json({
                error: 'User Not Found',
                message: 'User account not found'
            });
        }

        const compound = await database.findById('compounds', user.compound_id, 'id, name, logo_url');

        res.json({
            user: {
                ...user,
                compound: compound
            }
        });

    } catch (error) {
        logger.error('Get user info error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve user information'
        });
    }
});

module.exports = router;
