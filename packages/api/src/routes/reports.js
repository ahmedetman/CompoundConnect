const express = require('express');
const db = require('../database/connection');
const { 
  authenticate, 
  authorize 
} = require('../middleware/auth');
const { 
  validatePagination,
  validateDateRange 
} = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/reports/dashboard - Get dashboard statistics
router.get('/dashboard',
  authenticate,
  authorize(['management', 'super_admin']),
  asyncHandler(async (req, res) => {
    const compoundId = req.user.compoundId;

    // Get total units and payment statistics
    const unitStats = await db.get(`
      SELECT 
        COUNT(DISTINCT u.id) as total_units,
        COUNT(DISTINCT CASE WHEN payment_summary.all_paid = 1 THEN u.id END) as fully_paid_units,
        COUNT(DISTINCT CASE WHEN payment_summary.any_paid = 1 AND payment_summary.all_paid = 0 THEN u.id END) as partially_paid_units,
        COUNT(DISTINCT CASE WHEN payment_summary.any_paid = 0 THEN u.id END) as unpaid_units
      FROM units u
      LEFT JOIN (
        SELECT 
          p.unit_id,
          CASE WHEN COUNT(*) = SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) THEN 1 ELSE 0 END as all_paid,
          CASE WHEN SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END as any_paid
        FROM payments p
        JOIN seasons s ON p.season_id = s.id
        WHERE s.is_active = 1
        GROUP BY p.unit_id
      ) payment_summary ON u.id = payment_summary.unit_id
      WHERE u.compound_id = ?
    `, [compoundId]);

    // Get active visitors today
    const activeVisitors = await db.get(`
      SELECT COUNT(*) as count
      FROM qr_codes qr
      WHERE qr.compound_id = ? 
        AND qr.type = 'visitor' 
        AND qr.is_active = 1
        AND date(qr.valid_from) <= date('now')
        AND date(qr.valid_to) >= date('now')
    `, [compoundId]);

    // Get recent scan activity (last 24 hours)
    const recentScans = await db.get(`
      SELECT COUNT(*) as count
      FROM scan_logs sl
      JOIN qr_codes qr ON sl.qr_code_id = qr.id
      WHERE qr.compound_id = ? 
        AND sl.scanned_at >= datetime('now', '-1 day')
        AND sl.result = 'success'
    `, [compoundId]);

    // Get expiring personnel accounts (next 30 days)
    const expiringPersonnel = await db.get(`
      SELECT COUNT(*) as count
      FROM personnel_invites pi
      WHERE pi.compound_id = ? 
        AND pi.expires_at <= datetime('now', '+30 days')
        AND pi.is_used = 0
    `, [compoundId]);

    // Get current season info
    const currentSeason = await db.get(`
      SELECT * FROM seasons 
      WHERE compound_id = ? AND is_active = 1
    `, [compoundId]);

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        units: unitStats,
        active_visitors_today: activeVisitors.count,
        recent_scans_24h: recentScans.count,
        expiring_personnel: expiringPersonnel.count,
        current_season: currentSeason
      }
    });
  })
);

// GET /api/reports/payments-due - Get payments due report
router.get('/payments-due',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    const paymentsDue = await db.all(`
      SELECT 
        u.unit_number,
        GROUP_CONCAT(users.name, ', ') as owners,
        s.name as service_name,
        p.amount,
        p.due_date,
        p.status,
        CASE 
          WHEN p.due_date < date('now') THEN 'overdue'
          WHEN p.due_date <= date('now', '+7 days') THEN 'due_soon'
          ELSE 'due'
        END as urgency
      FROM payments p
      JOIN units u ON p.unit_id = u.id
      JOIN services s ON p.service_id = s.id
      JOIN seasons se ON p.season_id = se.id
      LEFT JOIN unit_users uu ON u.id = uu.unit_id
      LEFT JOIN users ON uu.user_id = users.id
      WHERE u.compound_id = ? 
        AND se.is_active = 1 
        AND p.status IN ('due', 'overdue')
      GROUP BY u.id, s.id, p.id
      ORDER BY 
        CASE p.status 
          WHEN 'overdue' THEN 1 
          WHEN 'due' THEN 2 
          ELSE 3 
        END,
        p.due_date ASC
      LIMIT ? OFFSET ?
    `, [compoundId, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count
      FROM payments p
      JOIN units u ON p.unit_id = u.id
      JOIN seasons se ON p.season_id = se.id
      WHERE u.compound_id = ? 
        AND se.is_active = 1 
        AND p.status IN ('due', 'overdue')
    `, [compoundId]);

    // Get summary statistics
    const summary = await db.get(`
      SELECT 
        COUNT(*) as total_due,
        SUM(CASE WHEN p.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
        SUM(CASE WHEN p.due_date <= date('now', '+7 days') THEN 1 ELSE 0 END) as due_soon_count,
        SUM(p.amount) as total_amount_due
      FROM payments p
      JOIN units u ON p.unit_id = u.id
      JOIN seasons se ON p.season_id = se.id
      WHERE u.compound_id = ? 
        AND se.is_active = 1 
        AND p.status IN ('due', 'overdue')
    `, [compoundId]);

    res.json({
      success: true,
      message: 'Payments due report retrieved successfully',
      data: {
        payments: paymentsDue,
        summary,
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

// GET /api/reports/visitor-log - Get visitor traffic report
router.get('/visitor-log',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  validateDateRange,
  asyncHandler(async (req, res) => {
    const { page, limit, start_date, end_date } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    let dateFilter = '';
    let params = [compoundId];

    if (start_date && end_date) {
      dateFilter = 'AND date(qr.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (start_date) {
      dateFilter = 'AND date(qr.created_at) >= ?';
      params.push(start_date);
    } else if (end_date) {
      dateFilter = 'AND date(qr.created_at) <= ?';
      params.push(end_date);
    }

    const visitorLog = await db.all(`
      SELECT 
        qr.id,
        qr.visitor_name,
        qr.visitor_vehicle_plate,
        qr.num_persons,
        qr.valid_from,
        qr.valid_to,
        qr.created_at,
        qr.is_active,
        u.unit_number,
        owner.name as unit_owner,
        COALESCE(scan_count.count, 0) as scan_count,
        scan_count.last_scanned_at
      FROM qr_codes qr
      JOIN units u ON qr.unit_id = u.id
      JOIN users owner ON qr.user_id = owner.id
      LEFT JOIN (
        SELECT 
          qr_code_id,
          COUNT(*) as count,
          MAX(scanned_at) as last_scanned_at
        FROM scan_logs 
        WHERE result = 'success'
        GROUP BY qr_code_id
      ) scan_count ON qr.id = scan_count.qr_code_id
      WHERE qr.compound_id = ? 
        AND qr.type = 'visitor'
        ${dateFilter}
      ORDER BY qr.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCountParams = [...params];
    const totalCount = await db.get(`
      SELECT COUNT(*) as count
      FROM qr_codes qr
      WHERE qr.compound_id = ? 
        AND qr.type = 'visitor'
        ${dateFilter}
    `, totalCountParams);

    // Get summary statistics
    const summaryParams = [...params];
    const summary = await db.get(`
      SELECT 
        COUNT(*) as total_visitors,
        COUNT(CASE WHEN qr.is_active = 1 THEN 1 END) as active_visitors,
        SUM(qr.num_persons) as total_persons,
        COUNT(DISTINCT qr.unit_id) as units_with_visitors
      FROM qr_codes qr
      WHERE qr.compound_id = ? 
        AND qr.type = 'visitor'
        ${dateFilter}
    `, summaryParams);

    res.json({
      success: true,
      message: 'Visitor log report retrieved successfully',
      data: {
        visitors: visitorLog,
        summary,
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

// GET /api/reports/scan-activity - Get scan activity report
router.get('/scan-activity',
  authenticate,
  authorize(['management', 'super_admin']),
  validatePagination,
  validateDateRange,
  asyncHandler(async (req, res) => {
    const { page, limit, start_date, end_date } = req.query;
    const compoundId = req.user.compoundId;
    const offset = (page - 1) * limit;

    let dateFilter = '';
    let params = [compoundId];

    if (start_date && end_date) {
      dateFilter = 'AND date(sl.scanned_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (start_date) {
      dateFilter = 'AND date(sl.scanned_at) >= ?';
      params.push(start_date);
    } else if (end_date) {
      dateFilter = 'AND date(sl.scanned_at) <= ?';
      params.push(end_date);
    }

    const scanActivity = await db.all(`
      SELECT 
        sl.id,
        sl.scanned_at,
        sl.location_tag,
        sl.result,
        sl.failure_reason,
        qr.type as qr_type,
        qr.visitor_name,
        qr.facility_type,
        u.unit_number,
        owner.name as qr_owner,
        scanner.name as scanner_name,
        scanner.role as scanner_role
      FROM scan_logs sl
      JOIN qr_codes qr ON sl.qr_code_id = qr.id
      LEFT JOIN units u ON qr.unit_id = u.id
      LEFT JOIN users owner ON qr.user_id = owner.id
      LEFT JOIN users scanner ON sl.scanner_user_id = scanner.id
      WHERE sl.compound_id = ?
        ${dateFilter}
      ORDER BY sl.scanned_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCountParams = [...params];
    const totalCount = await db.get(`
      SELECT COUNT(*) as count
      FROM scan_logs sl
      WHERE sl.compound_id = ?
        ${dateFilter}
    `, totalCountParams);

    // Get summary statistics
    const summaryParams = [...params];
    const summary = await db.get(`
      SELECT 
        COUNT(*) as total_scans,
        COUNT(CASE WHEN sl.result = 'success' THEN 1 END) as successful_scans,
        COUNT(CASE WHEN sl.result = 'failure' THEN 1 END) as failed_scans,
        COUNT(DISTINCT sl.scanner_user_id) as active_scanners,
        COUNT(DISTINCT date(sl.scanned_at)) as active_days
      FROM scan_logs sl
      WHERE sl.compound_id = ?
        ${dateFilter}
    `, summaryParams);

    res.json({
      success: true,
      message: 'Scan activity report retrieved successfully',
      data: {
        scans: scanActivity,
        summary,
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

module.exports = router;