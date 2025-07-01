
const crypto = require('crypto');
const database = require('../config/database');
const logger = require('../utils/logger');

class QRService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.secretKey = process.env.QR_ENCRYPTION_KEY || 'your-32-character-secret-key-here';
    }

    generateQRCode(userId, compoundId, qrType, additionalData = {}) {
        try {
            const timestamp = Date.now();
            const randomBytes = crypto.randomBytes(16).toString('hex');
            
            const qrData = {
                userId,
                compoundId,
                qrType,
                timestamp,
                random: randomBytes,
                ...additionalData
            };

            const qrString = JSON.stringify(qrData);
            const hash = crypto.createHash('sha256').update(qrString).digest('hex');
            
            return hash;

        } catch (error) {
            logger.error('Generate QR code error:', error);
            throw error;
        }
    }

    async createUserQRCodes(userId, compoundId) {
        try {
            const qrTypes = [
                {
                    type: 'gate_access',
                    title: 'Gate Access',
                    description: 'Main gate access QR code',
                    requiresPayment: false
                },
                {
                    type: 'pool_access',
                    title: 'Pool Access',
                    description: 'Swimming pool access QR code',
                    requiresPayment: true
                },
                {
                    type: 'gym_access',
                    title: 'Gym Access',
                    description: 'Gymnasium access QR code',
                    requiresPayment: true
                }
            ];

            const createdQRs = [];

            for (const qrType of qrTypes) {
                // Check if QR already exists
                const existingQR = await database.findOne('qr_codes', {
                    user_id: userId,
                    compound_id: compoundId,
                    qr_type: qrType.type
                });

                if (existingQR) {
                    logger.info(`QR code already exists for user ${userId}, type ${qrType.type}`);
                    createdQRs.push(existingQR);
                    continue;
                }

                const qrHash = this.generateQRCode(userId, compoundId, qrType.type);

                const qrCodeId = await database.insert('qr_codes', {
                    compound_id: compoundId,
                    user_id: userId,
                    code_hash: qrHash,
                    qr_type: qrType.type,
                    title: qrType.title,
                    description: qrType.description,
                    is_active: true,
                    requires_payment_check: qrType.requiresPayment
                });

                const createdQR = await database.findById('qr_codes', qrCodeId);
                createdQRs.push(createdQR);
                
                logger.info(`Created ${qrType.type} QR code for user ${userId}`);
            }

            return createdQRs;

        } catch (error) {
            logger.error('Create user QR codes error:', error);
            throw error;
        }
    }

    async createVisitorQRCode(userId, compoundId, visitorData) {
        try {
            const {
                visitor_name,
                visitor_phone,
                num_persons = 1,
                vehicle_plate,
                valid_from,
                valid_until,
                notes
            } = visitorData;

            const validFrom = valid_from ? new Date(valid_from) : new Date();
            const validUntil = valid_until ? new Date(valid_until) : new Date(Date.now() + 24 * 60 * 60 * 1000);

            const qrHash = this.generateQRCode(userId, compoundId, 'visitor_pass', {
                visitor_name,
                visitor_phone,
                num_persons,
                valid_from: validFrom.toISOString(),
                valid_until: validUntil.toISOString()
            });

            const qrCodeId = await database.insert('qr_codes', {
                compound_id: compoundId,
                user_id: userId,
                code_hash: qrHash,
                qr_type: 'visitor_pass',
                title: `Visitor Pass for ${visitor_name}`,
                description: notes || `Visitor pass for ${visitor_name} - ${num_persons} person(s)`,
                is_active: true,
                requires_payment_check: false,
                valid_from: validFrom,
                valid_until: validUntil,
                visitor_name,
                visitor_phone,
                num_persons,
                vehicle_plate: vehicle_plate || null,
                metadata: JSON.stringify({
                    created_by: userId,
                    created_at: new Date().toISOString()
                })
            });

            const createdQR = await database.findById('qr_codes', qrCodeId);
            
            logger.info(`Created visitor QR code for ${visitor_name} by user ${userId}`);
            
            return createdQR;

        } catch (error) {
            logger.error('Create visitor QR code error:', error);
            throw error;
        }
    }

    async validateQRCode(qrHash, compoundId) {
        try {
            // Find QR code by hash
            const qrCode = await database.findOne('qr_codes', {
                code_hash: qrHash,
                compound_id: compoundId
            });

            if (!qrCode) {
                return {
                    valid: false,
                    reason: 'QR code not found',
                    code: 'NOT_FOUND'
                };
            }

            // Check if active
            if (!qrCode.is_active) {
                return {
                    valid: false,
                    reason: 'QR code is inactive',
                    code: 'INACTIVE',
                    qrCode
                };
            }

            // Check date validity
            const now = new Date();
            const validFrom = new Date(qrCode.valid_from);
            const validUntil = qrCode.valid_until ? new Date(qrCode.valid_until) : null;

            if (now < validFrom) {
                return {
                    valid: false,
                    reason: 'QR code is not yet valid',
                    code: 'NOT_YET_VALID',
                    qrCode
                };
            }

            if (validUntil && now > validUntil) {
                return {
                    valid: false,
                    reason: 'QR code has expired',
                    code: 'EXPIRED',
                    qrCode
                };
            }

            // Check max uses
            if (qrCode.max_uses && qrCode.current_uses >= qrCode.max_uses) {
                return {
                    valid: false,
                    reason: 'QR code has reached maximum usage limit',
                    code: 'MAX_USES_EXCEEDED',
                    qrCode
                };
            }

            return {
                valid: true,
                reason: 'QR code is valid',
                code: 'VALID',
                qrCode
            };

        } catch (error) {
            logger.error('Validate QR code error:', error);
            return {
                valid: false,
                reason: 'QR code validation failed',
                code: 'VALIDATION_ERROR'
            };
        }
    }

    async incrementQRUsage(qrCodeId) {
        try {
            await database.query(
                'UPDATE qr_codes SET current_uses = current_uses + 1 WHERE id = ?',
                [qrCodeId]
            );

            return true;

        } catch (error) {
            logger.error('Increment QR usage error:', error);
            return false;
        }
    }

    async deactivateQRCode(qrCodeId, userId = null) {
        try {
            let conditions = { id: qrCodeId };
            
            // If userId provided, ensure ownership
            if (userId) {
                conditions.user_id = userId;
            }

            const affected = await database.update('qr_codes', 
                { is_active: false },
                conditions
            );

            return affected > 0;

        } catch (error) {
            logger.error('Deactivate QR code error:', error);
            return false;
        }
    }

    async getQRCodeStats(compoundId, dateFrom = null, dateTo = null) {
        try {
            let whereClause = 'WHERE qc.compound_id = ?';
            let queryParams = [compoundId];

            if (dateFrom) {
                whereClause += ' AND sl.scan_timestamp >= ?';
                queryParams.push(dateFrom);
            }

            if (dateTo) {
                whereClause += ' AND sl.scan_timestamp <= ?';
                queryParams.push(dateTo);
            }

            const stats = await database.query(`
                SELECT 
                    qc.qr_type,
                    COUNT(qc.id) as total_qr_codes,
                    COUNT(sl.id) as total_scans,
                    COUNT(CASE WHEN sl.scan_result = 'success' THEN 1 END) as successful_scans,
                    COUNT(CASE WHEN qc.is_active = true THEN 1 END) as active_qr_codes
                FROM qr_codes qc
                LEFT JOIN scan_logs sl ON qc.id = sl.qr_code_id
                ${whereClause}
                GROUP BY qc.qr_type
                ORDER BY qc.qr_type
            `, queryParams);

            return stats;

        } catch (error) {
            logger.error('Get QR code stats error:', error);
            return [];
        }
    }
}

module.exports = new QRService();
