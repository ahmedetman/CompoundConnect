const express = require('express');
const db = require('../database/connection');
const authService = require('../services/authService');
const Joi = require('joi');
const { 
  authenticate, 
  authorize, 
  checkCompoundAccess 
} = require('../middleware/auth');
const {
  validateCreateUnit,
  validateAssignUserToUnit,
  validateUpdatePayment,
  validateCreatePersonnelInvite,
  validateCreateSeason,
  validateUpdateSeason,
  validateCreateNews,
  validateUpdateNews,
  validateCreateUser,
  validateUpdateUser,
  validatePagination,
  validateId
} = require('../middleware/validation');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Units Management Routes

// GET /api/management/units - Get all units with payment status
router.get('/units',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const allowedSortColumns = ['unit_number', 'created_at', 'owner_count', 'payment_status'];
    const allowedSortOrders = ['ASC', 'DESC'];

    const sortBy = allowedSortColumns.includes(req.query.sort_by) ? req.query.sort_by : 'unit_number';
    const sortOrder = allowedSortOrders.includes(req.query.sort_order?.toUpperCase()) ? req.query.sort_order.toUpperCase() : 'ASC';

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    if (isNaN(limit) || limit <= 0 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit parameter'
      });
    }

    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offset parameter'
      });
    }

    const units = await db.all(`
    SELECT
    u.id,
    u.unit_number,
    u.created_at,
    GROUP_CONCAT(users.name, ', ') as owners,
    COUNT(DISTINCT uu.user_id) as owner_count,
    SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) as paid_services,
    COUNT(DISTINCT p.id) as total_services,
    CASE
    WHEN COUNT(DISTINCT p.id) = 0 THEN 'no_services'
    WHEN SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) = COUNT(DISTINCT p.id) THEN 'fully_paid'
    WHEN SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) > 0 THEN 'partially_paid'
    ELSE 'unpaid'
    END as payment_status
    FROM units u
    LEFT JOIN unit_users uu ON u.id = uu.unit_id
    LEFT JOIN users ON uu.user_id = users.id
    LEFT JOIN payments p ON u.id = p.unit_id
    LEFT JOIN seasons s ON p.season_id = s.id AND s.is_active = 1
    WHERE u.compound_id = ?
    GROUP BY u.id, u.unit_number, u.created_at
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
    `, [compoundId, limit, offset]);

    const totalCount = await db.get(`
    SELECT COUNT(*) as count FROM units WHERE compound_id = ?
    `, [compoundId]);

    res.json({
      success: true,
      message: 'Units retrieved successfully',
      data: {
        units,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// POST /api/management/units - Create new unit
router.post('/units',
  authenticate,
  authorize(['management', 'super_admin']),
  validateCreateUnit,
  asyncHandler(async (req, res) => {
    const { unit_number } = req.body;
    const compoundId = req.user.compoundId;

    const result = await db.run(`
      INSERT INTO units (compound_id, unit_number) 
      VALUES (?, ?)
    `, [compoundId, unit_number]);

    const unit = await db.get(`
      SELECT * FROM units WHERE id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unit
    });
  })
);

// GET /api/management/units/:id - Get unit details
router.get('/units/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const unitId = req.params.id;
    const compoundId = req.user.compoundId;

    const unit = await db.get(`
      SELECT u.*, 
        GROUP_CONCAT(users.name, ', ') as owners
      FROM units u
      LEFT JOIN unit_users uu ON u.id = uu.unit_id
      LEFT JOIN users ON uu.user_id = users.id
      WHERE u.id = ? AND u.compound_id = ?
      GROUP BY u.id
    `, [unitId, compoundId]);

    if (!unit) {
      throw new NotFoundError('Unit not found');
    }

    // Get payment details
    const payments = await db.all(`
      SELECT 
        p.*,
        s.name as service_name,
        se.name as season_name
      FROM payments p
      JOIN services s ON p.service_id = s.id
      JOIN seasons se ON p.season_id = se.id
      WHERE p.unit_id = ?
      ORDER BY se.is_active DESC, s.name
    `, [unitId]);

    // Get unit users
    const unitUsers = await db.all(`
      SELECT 
        uu.*,
        u.name,
        u.email,
        u.profile_picture_url
      FROM unit_users uu
      JOIN users u ON uu.user_id = u.id
      WHERE uu.unit_id = ?
    `, [unitId]);

    res.json({
      success: true,
      message: 'Unit details retrieved successfully',
      data: {
        unit,
        payments,
        users: unitUsers
      }
    });
  })
);

// POST /api/management/units/:id/assign-user - Assign user to unit
router.post('/units/:id/assign-user',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  validateAssignUserToUnit,
  asyncHandler(async (req, res) => {
    const unitId = req.params.id;
    const { user_id, relationship } = req.body;
    const compoundId = req.user.compoundId;

    // Verify unit exists and belongs to compound
    const unit = await db.get(`
      SELECT id FROM units WHERE id = ? AND compound_id = ?
    `, [unitId, compoundId]);

    if (!unit) {
      throw new NotFoundError('Unit not found');
    }

    // Verify user exists and belongs to compound
    const user = await db.get(`
      SELECT id FROM users WHERE id = ? AND compound_id = ?
    `, [user_id, compoundId]);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await db.run(`
      INSERT INTO unit_users (unit_id, user_id, relationship)
      VALUES (?, ?, ?)
    `, [unitId, user_id, relationship]);

    res.status(201).json({
      success: true,
      message: 'User assigned to unit successfully'
    });
  })
);

// DELETE /api/management/units/:id/assign-user - Remove user from unit
router.delete('/units/:id/assign-user',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const unitId = req.params.id;
    const { user_id } = req.body; // Get user_id from request body
    const compoundId = req.user.compoundId;

    console.log('DELETE /units/:id/assign-user called with:');
    console.log('  unitId:', unitId);
    console.log('  user_id from body:', user_id);
    console.log('  compoundId:', compoundId);

    // Verify unit exists and belongs to compound
    console.log('Checking if unit exists and belongs to compound');
    const unit = await db.get(`
      SELECT id FROM units WHERE id = ? AND compound_id = ?
    `, [unitId, compoundId]);
    console.log('Unit check result:', unit);

    if (!unit) {
      console.log('Unit not found');
      throw new NotFoundError('Unit not found');
    }

    // Verify user exists and belongs to compound
    const user = await db.get(`
      SELECT id FROM users WHERE id = ? AND compound_id = ?
    `, [user_id, compoundId]);
    console.log('User check result:', user);

    if (!user) {
      console.log('User not found');
      throw new NotFoundError('User not found');
    }

    // Check if the user is actually assigned to this unit
    console.log('Checking assignment for unitId:', unitId, 'userId:', user_id);
    const assignment = await db.get(`
      SELECT id FROM unit_users WHERE unit_id = ? AND user_id = ?
    `, [unitId, user_id]);
    console.log('Assignment result:', assignment);

    if (!assignment) {
      console.log('User not assigned to unit - returning error');
      return res.status(404).json({
        success: false,
        message: 'User is not assigned to this unit'
      });
    }

    // Remove the user from the unit
    console.log('Removing user from unit');
    const result = await db.run(`
      DELETE FROM unit_users WHERE unit_id = ? AND user_id = ?
    `, [unitId, user_id]);
    console.log('Delete result:', result);

    res.json({
      success: true,
      message: 'User removed from unit successfully'
    });

    // Remove the user from the unit
    await db.run(`
      DELETE FROM unit_users WHERE unit_id = ? AND user_id = ?
    `, [unitId, user_id]);

    res.json({
      success: true,
      message: 'User removed from unit successfully'
    });
  })
);

// POST /api/management/units/:id/payments - Update payment status
router.post('/units/:id/payments',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  validateUpdatePayment,
  asyncHandler(async (req, res) => {
    const unitId = req.params.id;
    const { service_id, season_id, status, amount, paid_on_date } = req.body;
    const compoundId = req.user.compoundId;

    // Verify unit belongs to compound
    const unit = await db.get(`
      SELECT id FROM units WHERE id = ? AND compound_id = ?
    `, [unitId, compoundId]);

    if (!unit) {
      throw new NotFoundError('Unit not found');
    }

    await db.run(`
      INSERT OR REPLACE INTO payments (unit_id, service_id, season_id, status, amount, paid_on_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [unitId, service_id, season_id, status, amount, paid_on_date]);

    res.json({
      success: true,
      message: 'Payment status updated successfully'
    });
  })
);

// Personnel Management Routes

// GET /api/management/personnel - Get all personnel
router.get('/personnel',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    const personnel = await db.all(`
      SELECT 
        id, name, email, role, is_active, created_at,
        (SELECT COUNT(*) FROM scan_logs sl WHERE sl.scanner_user_id = users.id) as total_scans
      FROM users 
      WHERE compound_id = ? AND role IN ('security', 'pool_staff', 'facility_staff')
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [compoundId, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count FROM users 
      WHERE compound_id = ? AND role IN ('security', 'pool_staff', 'facility_staff')
    `, [compoundId]);

    res.json({
      success: true,
      message: 'Personnel retrieved successfully',
      data: {
        personnel,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// POST /api/management/personnel/invite - Generate personnel invite
router.post('/personnel/invite',
  authenticate,
  authorize(['management', 'super_admin']),
  validateCreatePersonnelInvite,
  asyncHandler(async (req, res) => {
    const { role, expires_in_hours } = req.body;
    const compoundId = req.user.compoundId;
    const createdByUserId = req.user.userId;

    const invite = await authService.generatePersonnelInvite(
      compoundId, 
      role, 
      createdByUserId, 
      expires_in_hours
    );

    res.status(201).json({
      success: true,
      message: 'Personnel invite generated successfully',
      data: invite
    });
  })
);

// PUT /api/management/personnel/:id/revoke - Revoke personnel access
router.put('/personnel/:id/revoke',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const personnelId = req.params.id;
    const compoundId = req.user.compoundId;

    const personnel = await db.get(`
      SELECT id FROM users 
      WHERE id = ? AND compound_id = ? AND role IN ('security', 'pool_staff', 'facility_staff')
    `, [personnelId, compoundId]);

    if (!personnel) {
      throw new NotFoundError('Personnel not found');
    }

    await db.run(`
      UPDATE users SET is_active = 0 WHERE id = ?
    `, [personnelId]);

    res.json({
      success: true,
      message: 'Personnel access revoked successfully'
    });
  })
);

// Seasons Management Routes

// GET /api/management/seasons - Get all seasons
router.get('/seasons',
  authenticate,
  authorize(['management', 'super_admin']),
  asyncHandler(async (req, res) => {
    const compoundId = req.user.compoundId;

    const seasons = await db.all(`
      SELECT * FROM seasons 
      WHERE compound_id = ? 
      ORDER BY is_active DESC, start_date DESC
    `, [compoundId]);

    res.json({
      success: true,
      message: 'Seasons retrieved successfully',
      data: seasons
    });
  })
);

// POST /api/management/seasons - Create new season
router.post('/seasons',
  authenticate,
  authorize(['management', 'super_admin']),
  validateCreateSeason,
  asyncHandler(async (req, res) => {
    const { name, start_date, end_date } = req.body;
    const compoundId = req.user.compoundId;

    const result = await db.run(`
      INSERT INTO seasons (compound_id, name, start_date, end_date) 
      VALUES (?, ?, ?, ?)
    `, [compoundId, name, start_date, end_date]);

    const season = await db.get(`
      SELECT * FROM seasons WHERE id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'Season created successfully',
      data: season
    });
  })
);

// PUT /api/management/seasons/:id - Update season
router.put('/seasons/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  validateUpdateSeason,
  asyncHandler(async (req, res) => {
    const seasonId = req.params.id;
    const compoundId = req.user.compoundId;
    const updates = req.body;

    const season = await db.get(`
      SELECT id FROM seasons WHERE id = ? AND compound_id = ?
    `, [seasonId, compoundId]);

    if (!season) {
      throw new NotFoundError('Season not found');
    }

    // If setting as active, deactivate other seasons
    if (updates.is_active) {
      await db.run(`
        UPDATE seasons SET is_active = 0 WHERE compound_id = ? AND id != ?
      `, [compoundId, seasonId]);
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), seasonId];

    await db.run(`
      UPDATE seasons SET ${setClause} WHERE id = ?
    `, values);

    const updatedSeason = await db.get(`
      SELECT * FROM seasons WHERE id = ?
    `, [seasonId]);

    res.json({
      success: true,
      message: 'Season updated successfully',
      data: updatedSeason
    });
  })
);

// News Management Routes

// GET /api/management/news - Get all news
router.get('/news',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    const news = await db.all(`
      SELECT 
        n.*,
        u.name as created_by_name
      FROM news n
      JOIN users u ON n.created_by_user_id = u.id
      WHERE n.compound_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [compoundId, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count FROM news WHERE compound_id = ?
    `, [compoundId]);

    res.json({
      success: true,
      message: 'News retrieved successfully',
      data: {
        news,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// POST /api/management/news - Create news
router.post('/news',
  authenticate,
  authorize(['management', 'super_admin']),
  validateCreateNews,
  asyncHandler(async (req, res) => {
    const { title, content, type, priority, expires_at } = req.body;
    const compoundId = req.user.compoundId;
    const createdByUserId = req.user.userId;

    const result = await db.run(`
      INSERT INTO news (compound_id, title, content, type, priority, expires_at, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [compoundId, title, content, type, priority, expires_at, createdByUserId]);

    const newsItem = await db.get(`
      SELECT n.*, u.name as created_by_name
      FROM news n
      JOIN users u ON n.created_by_user_id = u.id
      WHERE n.id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'News created successfully',
      data: newsItem
    });
  })
);

// PUT /api/management/news/:id - Update news
router.put('/news/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  validateUpdateNews,
  asyncHandler(async (req, res) => {
    const newsId = req.params.id;
    const compoundId = req.user.compoundId;
    const updates = req.body;

    const newsItem = await db.get(`
      SELECT id FROM news WHERE id = ? AND compound_id = ?
    `, [newsId, compoundId]);

    if (!newsItem) {
      throw new NotFoundError('News item not found');
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), newsId];

    await db.run(`
      UPDATE news SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, values);

    const updatedNews = await db.get(`
      SELECT n.*, u.name as created_by_name
      FROM news n
      JOIN users u ON n.created_by_user_id = u.id
      WHERE n.id = ?
    `, [newsId]);

    res.json({
      success: true,
      message: 'News updated successfully',
      data: updatedNews
    });
  })
);

// DELETE /api/management/news/:id - Delete news
router.delete('/news/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const newsId = req.params.id;
    const compoundId = req.user.compoundId;

    const newsItem = await db.get(`
      SELECT id FROM news WHERE id = ? AND compound_id = ?
    `, [newsId, compoundId]);

    if (!newsItem) {
      throw new NotFoundError('News item not found');
    }

    await db.run(`DELETE FROM news WHERE id = ?`, [newsId]);

    res.json({
      success: true,
      message: 'News deleted successfully'
    });
  })
);


// Dashboard and Reports Management

// GET /api/reports/dashboard - Get dashboard statistics
router.get('/dashboard',
  authenticate,
  authorize(['management', 'super_admin']),
  asyncHandler(async (req, res) => {
    const compoundId = req.user.compoundId;

    // Get basic statistics
    const totalUnits = await db.get(`
      SELECT COUNT(*) as count FROM units WHERE compound_id = ?
    `, [compoundId]);

    const occupiedUnits = await db.get(`
      SELECT COUNT(DISTINCT unit_id) as count
      FROM unit_users uu
      JOIN units u ON uu.unit_id = u.id
      WHERE u.compound_id = ?
    `, [compoundId]);

    const totalUsers = await db.get(`
      SELECT COUNT(*) as count FROM users WHERE compound_id = ? AND is_active = 1
    `, [compoundId]);

    const totalPayments = await db.get(`
      SELECT COUNT(*) as count FROM payments p
      JOIN units u ON p.unit_id = u.id
      WHERE u.compound_id = ?
    `, [compoundId]);

    const pendingPayments = await db.get(`
      SELECT COUNT(*) as count FROM payments p
      JOIN units u ON p.unit_id = u.id
      WHERE u.compound_id = ? AND p.status = 'pending'
    `, [compoundId]);

    const totalRevenue = await db.get(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments p
      JOIN units u ON p.unit_id = u.id
      WHERE u.compound_id = ? AND p.status = 'paid'
    `, [compoundId]);

    const qrCodesGenerated = await db.get(`
      SELECT COUNT(*) as count FROM qr_codes qc
      JOIN users u ON qc.user_id = u.id
      WHERE u.compound_id = ?
    `, [compoundId]);

    const qrCodesUsed = await db.get(`
      SELECT COUNT(*) as count FROM qr_codes qc
      JOIN users u ON qc.user_id = u.id
      WHERE u.compound_id = ? AND qc.is_used = 1
    `, [compoundId]);

    const recentNews = await db.all(`
      SELECT COUNT(*) as count FROM news
      WHERE compound_id = ? AND is_published = 1
      AND published_at >= datetime('now', '-7 days')
    `, [compoundId]);

    const recentFeedback = await db.all(`
      SELECT COUNT(*) as count FROM feedback
      WHERE compound_id = ?
      AND created_at >= datetime('now', '-7 days')
    `, [compoundId]);

    // Get monthly analytics
    const monthlyAnalytics = await db.all(`
      SELECT metric_name, metric_value, metric_date
      FROM dashboard_analytics
      WHERE compound_id = ? AND metric_date >= date('now', '-30 days')
      ORDER BY metric_date DESC
    `, [compoundId]);

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        overview: {
          totalUnits: totalUnits.count,
          occupiedUnits: occupiedUnits.count,
          vacantUnits: totalUnits.count - occupiedUnits.count,
          occupancyRate: totalUnits.count > 0 ? Math.round((occupiedUnits.count / totalUnits.count) * 100) : 0,
          totalUsers: totalUsers.count,
          totalPayments: totalPayments.count,
          pendingPayments: pendingPayments.count,
          totalRevenue: totalRevenue.total,
          qrCodesGenerated: qrCodesGenerated.count,
          qrCodesUsed: qrCodesUsed.count,
          recentNews: recentNews[0]?.count || 0,
          recentFeedback: recentFeedback[0]?.count || 0
        },
        monthlyAnalytics: monthlyAnalytics
      }
    });
  })
);

// GET /api/management/reports - Get management reports
router.get('/reports',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, report_type, start_date, end_date } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        r.id, r.report_type, r.title, r.description, r.data, r.created_at,
        u.name as generated_by_name
      FROM management_reports r
      JOIN users u ON r.generated_by_user_id = u.id
      WHERE r.compound_id = ?
    `;

    const params = [compoundId];

    if (report_type) {
      query += ` AND r.report_type = ?`;
      params.push(report_type);
    }

    if (start_date) {
      query += ` AND date(r.created_at) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND date(r.created_at) <= ?`;
      params.push(end_date);
    }

    query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const reports = await db.all(query, params);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count FROM management_reports
      WHERE compound_id = ? ${report_type ? 'AND report_type = ?' : ''}
    `, [compoundId, ...(report_type ? [report_type] : [])]);

    res.json({
      success: true,
      message: 'Reports retrieved successfully',
      data: {
        reports,
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

// POST /api/management/reports - Create new report
router.post('/reports',
  authenticate,
  authorize(['management', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { report_type, title, description, data } = req.body;
    const compoundId = req.user.compoundId;
    const userId = req.user.userId;

    if (!report_type || !title) {
      return res.status(400).json({
        success: false,
        message: 'Report type and title are required'
      });
    }

    const result = await db.run(`
      INSERT INTO management_reports (compound_id, report_type, title, description, data, generated_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [compoundId, report_type, title, description, JSON.stringify(data), userId]);

    const newReport = await db.get(`
      SELECT
        r.id, r.report_type, r.title, r.description, r.data, r.created_at,
        u.name as generated_by_name
      FROM management_reports r
      JOIN users u ON r.generated_by_user_id = u.id
      WHERE r.id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: newReport
    });
  })
);

// GET /api/management/reports/:id - Get specific report
router.get('/reports/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const compoundId = req.user.compoundId;

    const report = await db.get(`
      SELECT
        r.id, r.report_type, r.title, r.description, r.data, r.created_at,
        u.name as generated_by_name
      FROM management_reports r
      JOIN users u ON r.generated_by_user_id = u.id
      WHERE r.id = ? AND r.compound_id = ?
    `, [id, compoundId]);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report retrieved successfully',
      data: report
    });
  })
);



// Visitor Management Endpoints

// GET /api/management/visitors - Get visitor logs
router.get('/visitors',
  authenticate,
  authorize(['management', 'super_admin', 'security']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, start_date, end_date, unit_id } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        vl.id, vl.visitor_name, vl.visitor_phone, vl.purpose,
        vl.check_in_time, vl.check_out_time, vl.notes,
        u.unit_number,
        host.name as host_name,
        guard.name as security_guard_name
      FROM visitor_logs vl
      LEFT JOIN units u ON vl.unit_id = u.id
      LEFT JOIN users host ON vl.host_user_id = host.id
      LEFT JOIN users guard ON vl.security_guard_id = guard.id
      WHERE vl.compound_id = ?
    `;

    const params = [compoundId];

    if (start_date) {
      query += ` AND date(vl.check_in_time) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND date(vl.check_in_time) <= ?`;
      params.push(end_date);
    }

    if (unit_id) {
      query += ` AND vl.unit_id = ?`;
      params.push(unit_id);
    }

    query += ` ORDER BY vl.check_in_time DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const visitors = await db.all(query, params);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count FROM visitor_logs
      WHERE compound_id = ? ${start_date ? 'AND date(check_in_time) >= ?' : ''} ${end_date ? 'AND date(check_in_time) <= ?' : ''} ${unit_id ? 'AND unit_id = ?' : ''}
    `, [compoundId, ...(start_date ? [start_date] : []), ...(end_date ? [end_date] : []), ...(unit_id ? [unit_id] : [])]);

    res.json({
      success: true,
      message: 'Visitor logs retrieved successfully',
      data: {
        visitors,
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

// POST /api/management/visitors - Register new visitor
router.post('/visitors',
  authenticate,
  authorize(['management', 'super_admin', 'security']),
  asyncHandler(async (req, res) => {
    const { visitor_name, visitor_phone, purpose, unit_id, host_user_id, notes } = req.body;
    const compoundId = req.user.compoundId;
    const securityGuardId = req.user.userId;

    if (!visitor_name || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Visitor name and purpose are required'
      });
    }

    const result = await db.run(`
      INSERT INTO visitor_logs (compound_id, visitor_name, visitor_phone, purpose, unit_id, host_user_id, security_guard_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [compoundId, visitor_name, visitor_phone, purpose, unit_id, host_user_id, securityGuardId, notes]);

    const newVisitor = await db.get(`
      SELECT
        vl.id, vl.visitor_name, vl.visitor_phone, vl.purpose,
        vl.check_in_time, vl.check_out_time, vl.notes,
        u.unit_number,
        host.name as host_name,
        guard.name as security_guard_name
      FROM visitor_logs vl
      LEFT JOIN units u ON vl.unit_id = u.id
      LEFT JOIN users host ON vl.host_user_id = host.id
      LEFT JOIN users guard ON vl.security_guard_id = guard.id
      WHERE vl.id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'Visitor registered successfully',
      data: newVisitor
    });
  })
);

// PUT /api/management/visitors/:id/checkout - Check out visitor
router.put('/visitors/:id/checkout',
  authenticate,
  authorize(['management', 'super_admin', 'security']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const compoundId = req.user.compoundId;

    const visitor = await db.get(`
      SELECT id FROM visitor_logs
      WHERE id = ? AND compound_id = ? AND check_out_time IS NULL
    `, [id, compoundId]);

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Active visitor not found'
      });
    }

    await db.run(`
      UPDATE visitor_logs
      SET check_out_time = datetime('now')
      WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Visitor checked out successfully'
    });
  })
);

// Services Management Routes

// GET /api/management/services - Get all services
router.get('/services',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    const services = await db.all(`
      SELECT * FROM services
      WHERE compound_id = ?
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `, [compoundId, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count FROM services
      WHERE compound_id = ?
    `, [compoundId]);

    res.json({
      success: true,
      message: 'Services retrieved successfully',
      data: {
        services,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// POST /api/management/services - Create new service
router.post('/services',
  authenticate,
  authorize(['management', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { name, description, price } = req.body;
    const compoundId = req.user.compoundId;

    const result = await db.run(`
      INSERT INTO services (compound_id, name, description, price)
      VALUES (?, ?, ?, ?)
    `, [compoundId, name, description, price]);

    const service = await db.get(`
      SELECT * FROM services WHERE id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service
    });
  })
);

// PUT /api/management/services/:id - Update service
router.put('/services/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const serviceId = req.params.id;
    const { name, description, price, is_active } = req.body;
    const compoundId = req.user.compoundId;

    const service = await db.get(`
      SELECT id FROM services
      WHERE id = ? AND compound_id = ?
    `, [serviceId, compoundId]);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    await db.run(`
      UPDATE services
      SET name = ?, description = ?, price = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, description, price, is_active, serviceId]);

    const updatedService = await db.get(`
      SELECT * FROM services WHERE id = ?
    `, [serviceId]);

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService
    });
  })
);

// DELETE /api/management/services/:id - Delete service
router.delete('/services/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const serviceId = req.params.id;
    const compoundId = req.user.compoundId;

    const service = await db.get(`
      SELECT id FROM services
      WHERE id = ? AND compound_id = ?
    `, [serviceId, compoundId]);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    await db.run(`DELETE FROM services WHERE id = ?`, [serviceId]);

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  })
);

// News Management Routes

// GET /api/management/news - Get all news
router.get('/news',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit, type } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE compound_id = ?';
    let params = [compoundId];

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    const news = await db.all(`
      SELECT n.*, u.name as created_by_name
      FROM news n
      JOIN users u ON n.created_by_user_id = u.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count FROM news
      ${whereClause}
    `, params);

    res.json({
      success: true,
      message: 'News retrieved successfully',
      data: {
        news,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

// POST /api/management/news - Create news
router.post('/news',
  authenticate,
  authorize(['management', 'super_admin']),
  validateCreateNews,
  asyncHandler(async (req, res) => {
    const { title, content, type, priority, expires_at } = req.body;
    const compoundId = req.user.compoundId;
    const createdByUserId = req.user.userId;

    const result = await db.run(`
      INSERT INTO news (compound_id, title, content, type, priority, expires_at, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [compoundId, title, content, type, priority, expires_at, createdByUserId]);

    const newsItem = await db.get(`
      SELECT n.*, u.name as created_by_name
      FROM news n
      JOIN users u ON n.created_by_user_id = u.id
      WHERE n.id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'News created successfully',
      data: newsItem
    });
  })
);

// PUT /api/management/news/:id - Update news
router.put('/news/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  validateUpdateNews,
  asyncHandler(async (req, res) => {
    const newsId = req.params.id;
    const { title, content, type, priority, is_published, expires_at } = req.body;
    const compoundId = req.user.compoundId;

    const newsItem = await db.get(`
      SELECT id FROM news
      WHERE id = ? AND compound_id = ?
    `, [newsId, compoundId]);

    if (!newsItem) {
      throw new NotFoundError('News item not found');
    }

    await db.run(`
      UPDATE news
      SET title = ?, content = ?, type = ?, priority = ?, is_published = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, content, type, priority, is_published, expires_at, newsId]);

    const updatedNews = await db.get(`
      SELECT n.*, u.name as created_by_name
      FROM news n
      JOIN users u ON n.created_by_user_id = u.id
      WHERE n.id = ?
    `, [newsId]);

    res.json({
      success: true,
      message: 'News updated successfully',
      data: updatedNews
    });
  })
);

// DELETE /api/management/news/:id - Delete news
router.delete('/news/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const newsId = req.params.id;
    const compoundId = req.user.compoundId;

    const newsItem = await db.get(`
      SELECT id FROM news
      WHERE id = ? AND compound_id = ?
    `, [newsId, compoundId]);

    if (!newsItem) {
      throw new NotFoundError('News item not found');
    }

    await db.run(`DELETE FROM news WHERE id = ?`, [newsId]);

    res.json({
      success: true,
      message: 'News deleted successfully'
    });
  })
);

// Settings Management Routes

// GET /api/management/settings - Get compound settings
router.get('/settings',
  authenticate,
  authorize(['management', 'super_admin']),
  asyncHandler(async (req, res) => {
    const compoundId = req.user.compoundId;

    const settings = await db.all(`
      SELECT * FROM settings
      WHERE compound_id = ?
      ORDER BY setting_key ASC
    `, [compoundId]);

    // Convert to key-value object for easier frontend consumption
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.setting_value;

      // Parse JSON values
      if (setting.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.warn(`Failed to parse JSON setting ${setting.setting_key}:`, e);
        }
      } else if (setting.setting_type === 'boolean') {
        value = value === 'true' || value === '1';
      } else if (setting.setting_type === 'number') {
        value = parseFloat(value);
      }

      settingsObj[setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description,
        is_public: setting.is_public
      };
    });

    res.json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settingsObj
    });
  })
);

// PUT /api/management/settings - Update settings
router.put('/settings',
  authenticate,
  authorize(['management', 'super_admin']),
  asyncHandler(async (req, res) => {
    const compoundId = req.user.compoundId;
    const settings = req.body;

    // Update each setting
    for (const [key, settingData] of Object.entries(settings)) {
      let value = settingData.value;
      const type = settingData.type || 'string';
      const description = settingData.description || '';
      const isPublic = settingData.is_public || false;

      // Convert value to string for storage
      if (type === 'json') {
        value = JSON.stringify(value);
      } else if (type === 'boolean') {
        value = value ? '1' : '0';
      } else {
        value = String(value);
      }

      await db.run(`
        INSERT OR REPLACE INTO settings (compound_id, setting_key, setting_value, setting_type, description, is_public, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [compoundId, key, value, type, description, isPublic]);
    }

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  })
);

// Users Management Routes

// GET /api/management/users - Get all users
router.get('/users',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const allowedSortColumns = ['name', 'email', 'role', 'created_at', 'is_active'];
    const allowedSortOrders = ['ASC', 'DESC'];

    const sortBy = allowedSortColumns.includes(req.query.sort_by) ? req.query.sort_by : 'name';
    const sortOrder = allowedSortOrders.includes(req.query.sort_order?.toUpperCase()) ? req.query.sort_order.toUpperCase() : 'ASC';

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    if (isNaN(limit) || limit <= 0 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit parameter'
      });
    }

    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offset parameter'
      });
    }

    let whereClause = 'WHERE u.compound_id = ?';
    let params = [compoundId];

    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND u.role = ?';
      params.push(role);
    }

    const users = await db.all(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.profile_picture_url,
        u.role,
        u.device_token,
        u.is_active,
        u.created_at,
        u.updated_at,
        GROUP_CONCAT(units.unit_number, ', ') as units,
        COUNT(DISTINCT uu.unit_id) as unit_count
      FROM users u
      LEFT JOIN unit_users uu ON u.id = uu.user_id
      LEFT JOIN units ON uu.unit_id = units.id
      ${whereClause}
      GROUP BY u.id, u.name, u.email, u.profile_picture_url, u.role, u.device_token, u.is_active, u.created_at, u.updated_at
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    let countWhereClause = 'WHERE compound_id = ?';
    let countParams = [compoundId];

    if (search) {
      countWhereClause += ' AND (name LIKE ? OR email LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      countWhereClause += ' AND role = ?';
      countParams.push(role);
    }

    const totalCount = await db.get(`
      SELECT COUNT(*) as count FROM users ${countWhereClause}
    `, countParams);

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });
  })
);

  // POST /api/management/users - Create new user
  router.post('/users',
    authenticate,
    authorize(['management', 'super_admin']),
    validateCreateUser,
    asyncHandler(async (req, res) => {
      const { name, email, password, role, profile_picture_url } = req.body;
      const compoundId = req.user.compoundId;

      // Validate required fields
      if (!name || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, password, and role are required'
        });
      }

      // Validate role
      const validRoles = ['super_admin', 'management', 'owner', 'security', 'pool_staff', 'facility_staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }

      // Check if email already exists
      const existingUser = await db.get(`
        SELECT id FROM users WHERE email = ?
      `, [email]);

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db.run(`
        INSERT INTO users (compound_id, name, email, password_hash, profile_picture_url, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [compoundId, name, email, hashedPassword, profile_picture_url, role]);

    const user = await db.get(`
      SELECT id, compound_id, name, email, profile_picture_url, role, device_token, is_active, created_at, updated_at
      FROM users WHERE id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  })
);

// GET /api/management/users/:id - Get user details
router.get('/users/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const compoundId = req.user.compoundId;

    const user = await db.get(`
      SELECT
        u.id, u.compound_id, u.name, u.email, u.profile_picture_url, u.role,
        u.device_token, u.is_active, u.created_at, u.updated_at,
        c.name as compound_name
      FROM users u
      JOIN compounds c ON u.compound_id = c.id
      WHERE u.id = ? AND u.compound_id = ?
    `, [userId, compoundId]);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get user's units if they are an owner
    let units = [];
    if (user.role === 'owner') {
      units = await db.all(`
        SELECT
          u.id, u.unit_number, uu.relationship, uu.created_at as assigned_at
        FROM unit_users uu
        JOIN units u ON uu.unit_id = u.id
        WHERE uu.user_id = ?
      `, [userId]);
    }

    res.json({
      success: true,
      message: 'User details retrieved successfully',
      data: {
        user,
        units
      }
    });
  })
);

// PUT /api/management/users/:id - Update user
router.put('/users/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const compoundId = req.user.compoundId;
    const updates = req.body;

    // Check if user exists
    const user = await db.get(`
      SELECT id FROM users WHERE id = ? AND compound_id = ?
    `, [userId, compoundId]);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate role if provided
    if (updates.role) {
      const validRoles = ['super_admin', 'management', 'owner', 'security', 'pool_staff', 'facility_staff'];
      if (!validRoles.includes(updates.role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }
    }

    // Check if email is being changed and if it already exists
    if (updates.email) {
      const existingUser = await db.get(`
        SELECT id FROM users WHERE email = ? AND id != ?
      `, [updates.email, userId]);

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
    }

    // Hash password if provided
    if (updates.password) {
      const bcrypt = require('bcrypt');
      updates.password_hash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.compound_id;
    delete updates.created_at;

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), userId];

    await db.run(`
      UPDATE users SET ${setClause} WHERE id = ?
    `, values);

    const updatedUser = await db.get(`
      SELECT id, compound_id, name, email, profile_picture_url, role, device_token, is_active, created_at, updated_at
      FROM users WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  })
);

// DELETE /api/management/users/:id - Delete user
router.delete('/users/:id',
  authenticate,
  authorize(['management', 'super_admin']),
  validateId(),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const compoundId = req.user.compoundId;

    // Check if user exists
    const user = await db.get(`
      SELECT id, role FROM users WHERE id = ? AND compound_id = ?
    `, [userId, compoundId]);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Prevent deletion of the last super_admin
    if (user.role === 'super_admin') {
      const adminCount = await db.get(`
        SELECT COUNT(*) as count FROM users WHERE role = 'super_admin' AND compound_id = ?
      `, [compoundId]);

      if (adminCount.count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last super admin user'
        });
      }
    }

    // Delete user (this will cascade to related records due to foreign key constraints)
    await db.run(`
      DELETE FROM users WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  })
);

module.exports = router;