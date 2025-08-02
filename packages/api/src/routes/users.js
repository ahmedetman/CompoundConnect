const express = require('express');
const db = require('../database/connection');
const {
  authenticate,
  authorize
} = require('../middleware/auth');
const {
  validatePagination
} = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/users/profile - Get current user profile
router.get('/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const user = await db.get(`
      SELECT 
        u.id, u.name, u.email, u.profile_picture_url, u.role, u.created_at,
        c.name as compound_name,
        c.logo_url as compound_logo
      FROM users u
      JOIN compounds c ON u.compound_id = c.id
      WHERE u.id = ?
    `, [userId]);

    // Get user's units if they are an owner
    let units = [];
    if (user.role === 'owner') {
      units = await db.all(`
        SELECT 
          u.id, u.unit_number, uu.relationship
        FROM unit_users uu
        JOIN units u ON uu.unit_id = u.id
        WHERE uu.user_id = ?
      `, [userId]);
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user,
        units
      }
    });
  })
);

// GET /api/users/news - Get compound news for the user
router.get('/news',
  authenticate,
  validatePagination,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get user's compound
    const user = await db.get(`
      SELECT compound_id FROM users WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const news = await db.all(`
      SELECT
        n.id, n.title, n.content, n.type, n.priority, n.created_at,
        u.name as created_by_name
      FROM news n
      JOIN users u ON n.created_by = u.id
      WHERE n.compound_id = ?
        AND n.is_published = 1
        AND (n.expires_at IS NULL OR n.expires_at > datetime('now'))
      ORDER BY n.priority DESC, n.created_at DESC
      LIMIT ? OFFSET ?
    `, [user.compound_id, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count
      FROM news
      WHERE compound_id = ?
        AND is_published = 1
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `, [user.compound_id]);

    res.json({
      success: true,
      message: 'News retrieved successfully',
      data: {
        news,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// GET /api/users/payments - Get user's payment information
router.get('/payments',
  authenticate,
  authorize(['owner']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status, service_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        p.id, p.amount, p.status, p.due_date, p.paid_on_date,
        p.payment_method, p.transaction_id, p.notes,
        s.name as service_name, s.description as service_description,
        u.unit_number,
        se.name as season_name
      FROM payments p
      JOIN units u ON p.unit_id = u.id
      JOIN services s ON p.service_id = s.id
      JOIN seasons se ON p.season_id = se.id
      JOIN unit_users uu ON u.id = uu.unit_id
      WHERE uu.user_id = ? AND uu.relationship = 'owner'
    `;

    const params = [userId];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (service_id) {
      query += ` AND p.service_id = ?`;
      params.push(service_id);
    }

    query += ` ORDER BY p.due_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const payments = await db.all(query, params);

    // Get summary statistics
    const summary = await db.get(`
      SELECT
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) as total_overdue,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
      FROM payments p
      JOIN unit_users uu ON p.unit_id = uu.unit_id
      WHERE uu.user_id = ? AND uu.relationship = 'owner'
    `, [userId]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count
      FROM payments p
      JOIN unit_users uu ON p.unit_id = uu.unit_id
      WHERE uu.user_id = ? AND uu.relationship = 'owner'
    `, [userId]);

    res.json({
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        payments,
        summary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// GET /api/users/scan-history - Get user's QR scan history
router.get('/scan-history',
  authenticate,
  authorize(['owner']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const scanHistory = await db.all(`
      SELECT
        sl.id,
        sl.scanned_at,
        sl.location,
        sl.result,
        sl.failure_reason,
        qr.type as qr_type,
        qr.code_data,
        u.unit_number,
        scanner.name as scanned_by
      FROM scan_logs sl
      JOIN qr_codes qr ON sl.qr_code_id = qr.id
      JOIN units u ON qr.unit_id = u.id
      LEFT JOIN users scanner ON sl.scanner_user_id = scanner.id
      WHERE qr.user_id = ?
      ORDER BY sl.scanned_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count
      FROM scan_logs sl
      JOIN qr_codes qr ON sl.qr_code_id = qr.id
      WHERE qr.user_id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'Scan history retrieved successfully',
      data: {
        scans: scanHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// PUT /api/users/device-token - Update user's device token
router.put('/device-token',
  authenticate,
  asyncHandler(async (req, res) => {
    const { device_token } = req.body;
    const userId = req.user.userId;

    if (!device_token) {
      return res.status(400).json({
        success: false,
        message: 'Device token is required'
      });
    }

    await db.run(`
      UPDATE users SET device_token = ?, updated_at = datetime('now') WHERE id = ?
    `, [device_token, userId]);

    res.json({
      success: true,
      message: 'Device token updated successfully'
    });
  })
);


// GET /api/users/notifications/preferences - Get user's notification preferences
router.get('/notifications/preferences',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const user = await db.get(`
      SELECT notification_preferences FROM users WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let preferences = { push: true, email: true, sms: false };
    try {
      if (user.notification_preferences) {
        preferences = JSON.parse(user.notification_preferences);
      }
    } catch (error) {
      console.error('Error parsing notification preferences:', error);
    }

    res.json({
      success: true,
      message: 'Notification preferences retrieved successfully',
      data: preferences
    });
  })
);

// PUT /api/users/notifications/preferences - Update user's notification preferences
router.put('/notifications/preferences',
  authenticate,
  asyncHandler(async (req, res) => {
    const { push, email, sms } = req.body;
    const userId = req.user.userId;

    const preferences = {
      push: Boolean(push),
      email: Boolean(email),
      sms: Boolean(sms)
    };

    await db.run(`
      UPDATE users SET notification_preferences = ?, updated_at = datetime('now') WHERE id = ?
    `, [JSON.stringify(preferences), userId]);

    res.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });
  })
);

// GET /api/users/emergency-contact - Get user's emergency contact
router.get('/emergency-contact',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const user = await db.get(`
      SELECT emergency_contact FROM users WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Emergency contact retrieved successfully',
      data: { emergency_contact: user.emergency_contact }
    });
  })
);

// PUT /api/users/emergency-contact - Update user's emergency contact
router.put('/emergency-contact',
  authenticate,
  asyncHandler(async (req, res) => {
    const { emergency_contact } = req.body;
    const userId = req.user.userId;

    if (!emergency_contact) {
      return res.status(400).json({
        success: false,
        message: 'Emergency contact is required'
      });
    }

    await db.run(`
      UPDATE users SET emergency_contact = ?, updated_at = datetime('now') WHERE id = ?
    `, [emergency_contact, userId]);

    res.json({
      success: true,
      message: 'Emergency contact updated successfully'
    });
  })
);

const bcrypt = require('bcrypt');

// GET /api/users - Get all users (paginated)
router.get('/',
  authenticate,
  authorize(['super_admin', 'management']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        u.id, u.name, u.email, u.profile_picture_url, u.role, u.is_active,
        u.phone_number, u.emergency_contact, u.created_at, u.updated_at,
        c.name as compound_name,
        COUNT(uu.unit_id) as unit_count
      FROM users u
      JOIN compounds c ON u.compound_id = c.id
      LEFT JOIN unit_users uu ON u.id = uu.user_id
    `;

    const params = [];
    const conditions = [];

    if (role) {
      conditions.push(`u.role = ?`);
      params.push(role);
    }

    if (search) {
      conditions.push(`(u.name LIKE ? OR u.email LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const users = await db.all(query, params);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count FROM users u
      ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
    `, conditions.length > 0 ? params.slice(0, -2) : []);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// POST /api/users - Create new user
router.post('/',
  authenticate,
  authorize(['super_admin', 'management']),
  asyncHandler(async (req, res) => {
    const { name, email, password, role, phone_number, emergency_contact, is_active = true } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required'
      });
    }

    // Check if email already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.get(`
      SELECT compound_id FROM users WHERE id = ?
    `, [req.user.userId]);

    const result = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, role, phone_number, emergency_contact, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [user.compound_id, name, email, hashedPassword, role, phone_number, emergency_contact, is_active]);

    const newUser = await db.get(`
      SELECT id, name, email, role, phone_number, emergency_contact, is_active, created_at
      FROM users WHERE id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  })
);

// GET /api/users/:id - Get user by ID
router.get('/:id',
  authenticate,
  authorize(['super_admin', 'management']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await db.get(`
      SELECT
        u.id, u.name, u.email, u.profile_picture_url, u.role, u.is_active,
        u.phone_number, u.emergency_contact, u.notification_preferences,
        u.created_at, u.updated_at,
        c.name as compound_name
      FROM users u
      JOIN compounds c ON u.compound_id = c.id
      WHERE u.id = ?
    `, [id]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's units if they are an owner
    let units = [];
    if (user.role === 'owner') {
      units = await db.all(`
        SELECT
          u.id, u.unit_number, u.unit_type, u.size_sqft, u.bedrooms, u.bathrooms,
          uu.relationship, uu.created_at as assigned_at
        FROM unit_users uu
        JOIN units u ON uu.unit_id = u.id
        WHERE uu.user_id = ?
      `, [id]);
    }

    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user,
        units
      }
    });
  })
);

// PUT /api/users/:id - Update user by ID
router.put('/:id',
  authenticate,
  authorize(['super_admin', 'management']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, role, phone_number, emergency_contact, is_active } = req.body;

    // Check if user exists
    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email) {
      const emailExists = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (phone_number !== undefined) {
      updates.push('phone_number = ?');
      params.push(phone_number);
    }
    if (emergency_contact !== undefined) {
      updates.push('emergency_contact = ?');
      params.push(emergency_contact);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(id);

    await db.run(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `, params);

    const updatedUser = await db.get(`
      SELECT id, name, email, role, phone_number, emergency_contact, is_active, updated_at
      FROM users WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  })
);

// DELETE /api/users/:id - Delete user by ID
router.delete('/:id',
  authenticate,
  authorize(['super_admin', 'management']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if user exists
    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete - just mark as inactive
    await db.run(`
      UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  })
);

// PUT /api/users/profile - Update current user profile
router.put('/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { name, email, phone_number, emergency_contact, profile_picture_url } = req.body;

    // Check if email is being changed and if it's already taken
    if (email) {
      const emailExists = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (phone_number !== undefined) {
      updates.push('phone_number = ?');
      params.push(phone_number);
    }
    if (emergency_contact !== undefined) {
      updates.push('emergency_contact = ?');
      params.push(emergency_contact);
    }
    if (profile_picture_url !== undefined) {
      updates.push('profile_picture_url = ?');
      params.push(profile_picture_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(userId);

    await db.run(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `, params);

    const updatedUser = await db.get(`
      SELECT id, name, email, profile_picture_url, phone_number, emergency_contact, updated_at
      FROM users WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  })
);

module.exports = router;