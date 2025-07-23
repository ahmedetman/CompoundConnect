const express = require('express');
const db = require('../database/connection');
const authService = require('../services/authService');
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
    const { page, limit, sort_by = 'unit_number', sort_order } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

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
      ORDER BY ${sort_by} ${sort_order}
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

module.exports = router;