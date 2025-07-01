
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const database = require('./database');
const logger = require('../utils/logger');

module.exports = (passport) => {
    // JWT Strategy
    passport.use(new JwtStrategy({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
        jsonWebTokenOptions: {
            ignoreExpiration: false,
            clockTolerance: 30 // 30-second clock tolerance
        }
    }, async (payload, done) => {
        try {
            // Find user by ID from JWT payload
            const user = await database.findById('users', payload.id, 
                'id, compound_id, email, first_name, last_name, role, is_active, photo_url'
            );

            if (!user) {
                logger.warn(`JWT authentication failed: User not found for ID ${payload.id}`);
                return done(null, false);
            }

            if (!user.is_active) {
                logger.warn(`JWT authentication failed: User ${user.email} is inactive`);
                return done(null, false);
            }

            // Add compound information
            const compound = await database.findById('compounds', user.compound_id, 'id, name');
            user.compound = compound;

            return done(null, user);
        } catch (error) {
            logger.error('JWT Strategy error:', error);
            return done(error, false);
        }
    }));

    // Serialize user for session (if using sessions)
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user from session (if using sessions)
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await database.findById('users', id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
};
