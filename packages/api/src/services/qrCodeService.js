const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../database/connection');
const pushNotificationService = require('./pushNotificationService');

class QRCodeService {
  // Generate QR code data
  generateQRData() {
    return uuidv4();
  }

  // Hash QR code data for database storage
  hashQRData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Generate QR code image
  async generateQRImage(data) {
    try {
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      throw new Error('Failed to generate QR code image');
    }
  }

  // Create visitor QR code
  async createVisitorQR(userId, unitId, compoundId, visitorData) {
    const { visitor_name, num_persons, vehicle_plate, valid_from, valid_to } = visitorData;
    
    const qrData = this.generateQRData();
    const qrHash = this.hashQRData(qrData);

    const result = await db.run(`
      INSERT INTO qr_codes (
        user_id, unit_id, compound_id, type, code_data, code_hash,
        visitor_name, visitor_vehicle_plate, num_persons,
        valid_from, valid_to, is_single_use
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, unitId, compoundId, 'visitor', qrData, qrHash,
      visitor_name, vehicle_plate, num_persons,
      valid_from, valid_to, 1
    ]);

    const qrImage = await this.generateQRImage(qrData);

    return {
      id: result.id,
      qr_data: qrData,
      qr_image: qrImage,
      visitor_name,
      num_persons,
      vehicle_plate,
      valid_from,
      valid_to
    };
  }

  // Get user's personal QR codes (gate, pool, facility access)
  async getUserPersonalQRs(userId, compoundId) {
    // Get user's units and payment status
    const userUnits = await db.all(`
      SELECT 
        u.id as unit_id,
        u.unit_number,
        uu.relationship,
        s.name as service_name,
        s.id as service_id,
        p.status as payment_status,
        se.start_date as season_start,
        se.end_date as season_end
      FROM unit_users uu
      JOIN units u ON uu.unit_id = u.id
      JOIN services s ON s.compound_id = u.compound_id
      LEFT JOIN seasons se ON se.compound_id = u.compound_id AND se.is_active = 1
      LEFT JOIN payments p ON p.unit_id = u.id AND p.service_id = s.id AND p.season_id = se.id
      WHERE uu.user_id = ? AND u.compound_id = ?
    `, [userId, compoundId]);

    const qrCodes = [];

    // Group by unit and service
    const unitServices = {};
    userUnits.forEach(row => {
      const key = `${row.unit_id}_${row.service_id}`;
      if (!unitServices[key]) {
        unitServices[key] = row;
      }
    });

    // Generate QR codes for paid services
    for (const [key, service] of Object.entries(unitServices)) {
      if (service.payment_status === 'paid') {
        let qrType = 'owner_gate';
        let facilityType = null;

        // Determine QR type based on service
        if (service.service_name.toLowerCase().includes('pool')) {
          qrType = 'owner_pool';
          facilityType = 'pool';
        } else if (service.service_name.toLowerCase().includes('kids')) {
          qrType = 'owner_facility';
          facilityType = 'kids_area';
        } else if (service.service_name.toLowerCase().includes('beach')) {
          qrType = 'owner_facility';
          facilityType = 'beach';
        }

        // Check if QR already exists for this season
        let existingQR = await db.get(`
          SELECT * FROM qr_codes 
          WHERE user_id = ? AND unit_id = ? AND type = ? AND facility_type = ? 
          AND is_active = 1 AND valid_from <= datetime('now') AND valid_to >= datetime('now')
        `, [userId, service.unit_id, qrType, facilityType]);

        if (!existingQR) {
          // Create new QR code
          const qrData = this.generateQRData();
          const qrHash = this.hashQRData(qrData);

          const result = await db.run(`
            INSERT INTO qr_codes (
              user_id, unit_id, compound_id, type, code_data, code_hash,
              facility_type, valid_from, valid_to
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            userId, service.unit_id, compoundId, qrType, qrData, qrHash,
            facilityType, service.season_start, service.season_end
          ]);

          existingQR = {
            id: result.id,
            code_data: qrData,
            type: qrType,
            facility_type: facilityType,
            valid_from: service.season_start,
            valid_to: service.season_end
          };
        }

        const qrImage = await this.generateQRImage(existingQR.code_data);

        qrCodes.push({
          id: existingQR.id,
          type: qrType,
          service_name: service.service_name,
          facility_type: facilityType,
          unit_number: service.unit_number,
          qr_data: existingQR.code_data,
          qr_image: qrImage,
          valid_from: existingQR.valid_from,
          valid_to: existingQR.valid_to,
          is_active: true
        });
      }
    }

    return qrCodes;
  }

  // Validate QR code
  async validateQR(qrData, scannerUserId, locationTag = null) {
    const qrHash = this.hashQRData(qrData);

    // Find QR code
    const qrCode = await db.get(`
      SELECT 
        qr.*,
        u.name as owner_name,
        u.profile_picture_url,
        u.device_token as owner_device_token,
        unit.unit_number,
        c.name as compound_name,
        scanner.compound_id as scanner_compound_id
      FROM qr_codes qr
      JOIN users u ON qr.user_id = u.id
      LEFT JOIN units unit ON qr.unit_id = unit.id
      JOIN compounds c ON qr.compound_id = c.id
      JOIN users scanner ON scanner.id = ?
      WHERE qr.code_hash = ?
    `, [scannerUserId, qrHash]);

    if (!qrCode) {
      await this.logScan(null, scannerUserId, 'failure', 'QR code not found', locationTag);
      return {
        status: 'INVALID',
        reason: 'QR code not found',
        data: null
      };
    }

    // Check if scanner is from same compound
    if (qrCode.compound_id !== qrCode.scanner_compound_id) {
      await this.logScan(qrCode.id, scannerUserId, 'failure', 'Cross-compound access denied', locationTag);
      return {
        status: 'INVALID',
        reason: 'Access denied',
        data: null
      };
    }

    // Check if QR is active
    if (!qrCode.is_active) {
      await this.logScan(qrCode.id, scannerUserId, 'failure', 'QR code inactive', locationTag);
      return {
        status: 'INVALID',
        reason: 'QR code has been deactivated',
        data: null
      };
    }

    // Check validity period
    const now = new Date();
    const validFrom = new Date(qrCode.valid_from);
    const validTo = new Date(qrCode.valid_to);

    if (now < validFrom || now > validTo) {
      await this.logScan(qrCode.id, scannerUserId, 'failure', 'QR code expired', locationTag);
      return {
        status: 'INVALID',
        reason: 'QR code has expired',
        data: null
      };
    }

    // For owner QR codes, check payment status
    if (qrCode.type.startsWith('owner_')) {
      const paymentCheck = await this.checkOwnerPaymentStatus(qrCode.unit_id, qrCode.type, qrCode.facility_type);
      if (!paymentCheck.isPaid) {
        await this.logScan(qrCode.id, scannerUserId, 'failure', 'Payment required', locationTag);
        return {
          status: 'INVALID',
          reason: 'Payment required for access',
          data: null
        };
      }
    }

    // Mark single-use QR as inactive
    if (qrCode.is_single_use) {
      await db.run('UPDATE qr_codes SET is_active = 0 WHERE id = ?', [qrCode.id]);
    }

    // Log successful scan
    await this.logScan(qrCode.id, scannerUserId, 'success', null, locationTag);

    // Send push notification to QR owner
    await this.sendScanNotification(qrCode, locationTag);

    // Prepare response data
    let responseData = {
      owner_name: qrCode.owner_name,
      profile_picture_url: qrCode.profile_picture_url,
      unit_number: qrCode.unit_number,
      compound_name: qrCode.compound_name
    };

    if (qrCode.type === 'visitor') {
      responseData = {
        ...responseData,
        visitor_name: qrCode.visitor_name,
        vehicle_plate: qrCode.visitor_vehicle_plate,
        num_persons: qrCode.num_persons,
        access_type: 'Visitor'
      };
    } else if (qrCode.type.startsWith('owner_')) {
      responseData = {
        ...responseData,
        access_type: this.getAccessTypeLabel(qrCode.type, qrCode.facility_type),
        num_persons: qrCode.num_persons || 1
      };
    }

    return {
      status: 'VALID',
      reason: 'Access granted',
      data: responseData
    };
  }

  // Check owner payment status for specific service
  async checkOwnerPaymentStatus(unitId, qrType, facilityType) {
    let serviceName = 'Annual Maintenance'; // Default for gate access

    if (qrType === 'owner_pool') {
      serviceName = 'Pool Access';
    } else if (qrType === 'owner_facility') {
      if (facilityType === 'kids_area') {
        serviceName = 'Kids Area Access';
      } else if (facilityType === 'beach') {
        serviceName = 'Beach Access';
      }
    }

    const payment = await db.get(`
      SELECT p.status 
      FROM payments p
      JOIN services s ON p.service_id = s.id
      JOIN seasons se ON p.season_id = se.id
      WHERE p.unit_id = ? AND s.name = ? AND se.is_active = 1
    `, [unitId, serviceName]);

    return {
      isPaid: payment && payment.status === 'paid',
      serviceName
    };
  }

  // Get access type label
  getAccessTypeLabel(qrType, facilityType) {
    if (qrType === 'owner_gate') return 'Gate Access';
    if (qrType === 'owner_pool') return 'Pool Access';
    if (qrType === 'owner_facility') {
      if (facilityType === 'kids_area') return 'Kids Area Access';
      if (facilityType === 'beach') return 'Beach Access';
      return 'Facility Access';
    }
    return 'Access';
  }

  // Log scan activity
  async logScan(qrCodeId, scannerUserId, result, failureReason = null, locationTag = null) {
    // Get scanner's compound
    const scanner = await db.get('SELECT compound_id FROM users WHERE id = ?', [scannerUserId]);
    
    await db.run(`
      INSERT INTO scan_logs (qr_code_id, scanner_user_id, compound_id, result, failure_reason, location_tag)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [qrCodeId, scannerUserId, scanner.compound_id, result, failureReason, locationTag]);
  }

  // Send scan notification using push notification service
  async sendScanNotification(qrCode, locationTag) {
    if (!qrCode.owner_device_token) {
      console.log(`No device token for user ${qrCode.user_id}, skipping notification`);
      return;
    }

    const scanData = {
      type: qrCode.type,
      visitor_name: qrCode.visitor_name,
      access_type: this.getAccessTypeLabel(qrCode.type, qrCode.facility_type),
      location: locationTag
    };

    try {
      await pushNotificationService.sendQRScanNotification(qrCode.owner_device_token, scanData);
    } catch (error) {
      console.error('Failed to send scan notification:', error);
    }
  }

  // Invalidate QR code
  async invalidateQR(qrCodeId, userId) {
    // Check if user has permission to invalidate this QR
    const qrCode = await db.get(`
      SELECT qr.*, u.role, u.compound_id as user_compound_id
      FROM qr_codes qr
      JOIN users u ON u.id = ?
      WHERE qr.id = ?
    `, [userId, qrCodeId]);

    if (!qrCode) {
      throw new Error('QR code not found');
    }

    // Check permissions
    const canInvalidate = 
      qrCode.user_id === userId || // Owner can invalidate their own QRs
      qrCode.role === 'management' || // Management can invalidate any QR in their compound
      qrCode.role === 'super_admin'; // Super admin can invalidate any QR

    if (!canInvalidate || (qrCode.role !== 'super_admin' && qrCode.compound_id !== qrCode.user_compound_id)) {
      throw new Error('Permission denied');
    }

    await db.run('UPDATE qr_codes SET is_active = 0 WHERE id = ?', [qrCodeId]);

    return { success: true, message: 'QR code invalidated successfully' };
  }

  // Get user's visitor QR history
  async getUserVisitorQRs(userId, status = 'all') {
    let whereClause = 'WHERE qr.user_id = ? AND qr.type = "visitor"';
    const params = [userId];

    if (status === 'active') {
      whereClause += ' AND qr.is_active = 1 AND qr.valid_to > datetime("now")';
    } else if (status === 'expired') {
      whereClause += ' AND (qr.is_active = 0 OR qr.valid_to <= datetime("now"))';
    }

    const qrCodes = await db.all(`
      SELECT 
        qr.*,
        unit.unit_number,
        (SELECT COUNT(*) FROM scan_logs sl WHERE sl.qr_code_id = qr.id AND sl.result = 'success') as scan_count,
        (SELECT sl.scanned_at FROM scan_logs sl WHERE sl.qr_code_id = qr.id AND sl.result = 'success' ORDER BY sl.scanned_at DESC LIMIT 1) as last_scanned_at
      FROM qr_codes qr
      LEFT JOIN units unit ON qr.unit_id = unit.id
      ${whereClause}
      ORDER BY qr.created_at DESC
    `, params);

    return qrCodes.map(qr => ({
      id: qr.id,
      visitor_name: qr.visitor_name,
      vehicle_plate: qr.visitor_vehicle_plate,
      num_persons: qr.num_persons,
      unit_number: qr.unit_number,
      valid_from: qr.valid_from,
      valid_to: qr.valid_to,
      is_active: qr.is_active,
      scan_count: qr.scan_count,
      last_scanned_at: qr.last_scanned_at,
      created_at: qr.created_at
    }));
  }
}

module.exports = new QRCodeService();