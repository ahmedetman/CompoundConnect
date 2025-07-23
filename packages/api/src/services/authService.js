const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../database/connection');

class AuthService {
  // Generate JWT token
  generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });
  }

  // Generate refresh token
  generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
  }

  // Verify JWT token
  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  }

  // Hash password
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  // Compare password
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Store refresh token in database
  async storeRefreshToken(userId, refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.run(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
      VALUES (?, ?, ?)
    `, [userId, tokenHash, expiresAt.toISOString()]);
  }

  // Verify refresh token from database
  async verifyRefreshTokenFromDB(refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const tokenRecord = await db.get(`
      SELECT rt.*, u.id as user_id, u.compound_id, u.role, u.name, u.email 
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = ? AND rt.is_revoked = 0 AND rt.expires_at > datetime('now')
    `, [tokenHash]);

    return tokenRecord;
  }

  // Revoke refresh token
  async revokeRefreshToken(refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    await db.run(`
      UPDATE refresh_tokens 
      SET is_revoked = 1 
      WHERE token_hash = ?
    `, [tokenHash]);
  }

  // Clean expired tokens
  async cleanExpiredTokens() {
    await db.run(`
      DELETE FROM refresh_tokens 
      WHERE expires_at < datetime('now') OR is_revoked = 1
    `);
  }

  // Login user
  async login(email, password) {
    // Find user by email
    const user = await db.get(`
      SELECT u.*, c.name as compound_name 
      FROM users u
      JOIN compounds c ON u.compound_id = c.id
      WHERE u.email = ? AND u.is_active = 1
    `, [email]);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      compoundId: user.compound_id,
      role: user.role,
      email: user.email
    };

    const accessToken = this.generateToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      accessToken,
      refreshToken
    };
  }

  // Register personnel with invite code
  async registerPersonnel(inviteCode, name, email, password) {
    // Verify invite code
    const invite = await db.get(`
      SELECT * FROM personnel_invites 
      WHERE invite_code = ? AND is_used = 0 AND expires_at > datetime('now')
    `, [inviteCode]);

    if (!invite) {
      throw new Error('Invalid or expired invite code');
    }

    // Check if email already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const userResult = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `, [invite.compound_id, name, email, passwordHash, invite.role]);

    // Mark invite as used
    await db.run(`
      UPDATE personnel_invites 
      SET is_used = 1, used_by_user_id = ?, used_at = datetime('now') 
      WHERE id = ?
    `, [userResult.id, invite.id]);

    // Get the created user
    const user = await db.get(`
      SELECT u.*, c.name as compound_name 
      FROM users u
      JOIN compounds c ON u.compound_id = c.id
      WHERE u.id = ?
    `, [userResult.id]);

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      compoundId: user.compound_id,
      role: user.role,
      email: user.email
    };

    const accessToken = this.generateToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    // Remove sensitive data
    delete user.password_hash;

    return {
      user,
      accessToken,
      refreshToken
    };
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    // Verify refresh token from database
    const tokenRecord = await this.verifyRefreshTokenFromDB(refreshToken);
    if (!tokenRecord) {
      throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const tokenPayload = {
      userId: tokenRecord.user_id,
      compoundId: tokenRecord.compound_id,
      role: tokenRecord.role,
      email: tokenRecord.email
    };

    const accessToken = this.generateToken(tokenPayload);

    return {
      accessToken,
      user: {
        id: tokenRecord.user_id,
        compound_id: tokenRecord.compound_id,
        role: tokenRecord.role,
        name: tokenRecord.name,
        email: tokenRecord.email
      }
    };
  }

  // Generate personnel invite code
  async generatePersonnelInvite(compoundId, role, createdByUserId, expiresInHours = 24) {
    const inviteCode = crypto.randomBytes(16).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await db.run(`
      INSERT INTO personnel_invites (compound_id, invite_code, role, created_by_user_id, expires_at) 
      VALUES (?, ?, ?, ?, ?)
    `, [compoundId, inviteCode, role, createdByUserId, expiresAt.toISOString()]);

    return {
      inviteCode,
      expiresAt,
      role
    };
  }
}

module.exports = new AuthService();