
const firebaseService = require('../config/firebase');
const database = require('../config/database');
const logger = require('../utils/logger');

class NotificationService {
    constructor() {
        this.initialize();
    }

    initialize() {
        firebaseService.initialize();
    }

    async sendQRScanNotification(qrOwnerId, scannedByUser, qrCodeRecord, location) {
        try {
            // Get QR owner's FCM token
            const qrOwner = await database.findById('users', qrOwnerId, 'fcm_token, first_name, last_name');
            
            if (!qrOwner || !qrOwner.fcm_token) {
                logger.info(`No FCM token for user ${qrOwnerId}, skipping notification`);
                return false;
            }

            const title = 'QR Code Scanned';
            let body = '';

            switch (qrCodeRecord.qr_type) {
                case 'visitor_pass':
                    body = `Your visitor pass for ${qrCodeRecord.visitor_name} was scanned at ${location || 'unknown location'}`;
                    break;
                case 'gate_access':
                    body = `Your gate access QR was scanned at ${location || 'gate'} by ${scannedByUser.first_name} ${scannedByUser.last_name}`;
                    break;
                case 'pool_access':
                    body = `Your pool access QR was scanned at ${location || 'pool area'} by ${scannedByUser.first_name} ${scannedByUser.last_name}`;
                    break;
                case 'gym_access':
                    body = `Your gym access QR was scanned at ${location || 'gym'} by ${scannedByUser.first_name} ${scannedByUser.last_name}`;
                    break;
                default:
                    body = `Your QR code was scanned at ${location || 'unknown location'} by ${scannedByUser.first_name} ${scannedByUser.last_name}`;
            }

            const data = {
                type: 'qr_scan',
                qr_code_id: qrCodeRecord.id.toString(),
                qr_type: qrCodeRecord.qr_type,
                scanned_by: `${scannedByUser.first_name} ${scannedByUser.last_name}`,
                scan_location: location || '',
                scan_time: new Date().toISOString()
            };

            const success = await firebaseService.sendNotification(qrOwner.fcm_token, title, body, data);
            
            if (success) {
                logger.info(`QR scan notification sent to ${qrOwner.first_name} ${qrOwner.last_name}`);
            }

            return success;

        } catch (error) {
            logger.error('Send QR scan notification error:', error);
            return false;
        }
    }

    async sendPaymentReminderNotification(userId, seasonName, dueAmount) {
        try {
            const user = await database.findById('users', userId, 'fcm_token, first_name, last_name');
            
            if (!user || !user.fcm_token) {
                return false;
            }

            const title = 'Payment Reminder';
            const body = `Payment of $${dueAmount} for ${seasonName} is due. Please complete your payment to maintain facility access.`;

            const data = {
                type: 'payment_reminder',
                season_name: seasonName,
                due_amount: dueAmount.toString()
            };

            return await firebaseService.sendNotification(user.fcm_token, title, body, data);

        } catch (error) {
            logger.error('Send payment reminder notification error:', error);
            return false;
        }
    }

    async sendSeasonEndingNotification(compoundId, seasonName, daysLeft) {
        try {
            // Get all users in the compound with FCM tokens
            const users = await database.query(
                'SELECT fcm_token, first_name, last_name FROM users WHERE compound_id = ? AND fcm_token IS NOT NULL AND is_active = true',
                [compoundId]
            );

            if (users.length === 0) {
                return false;
            }

            const title = 'Season Ending Soon';
            const body = `${seasonName} will end in ${daysLeft} days. Please ensure all payments are up to date.`;

            const data = {
                type: 'season_ending',
                season_name: seasonName,
                days_left: daysLeft.toString()
            };

            const fcmTokens = users.map(user => user.fcm_token);
            return await firebaseService.sendMulticastNotification(fcmTokens, title, body, data);

        } catch (error) {
            logger.error('Send season ending notification error:', error);
            return false;
        }
    }

    async sendNewsAlertNotification(compoundId, alert) {
        try {
            let whereClause = 'WHERE compound_id = ? AND fcm_token IS NOT NULL AND is_active = true';
            let queryParams = [compoundId];

            // Filter by target audience
            if (alert.target_audience !== 'all') {
                if (alert.target_audience === 'owners') {
                    whereClause += ' AND role = "owner"';
                } else if (alert.target_audience === 'staff') {
                    whereClause += ' AND role IN ("security", "pool_staff", "management")';
                }
            }

            const users = await database.query(
                `SELECT fcm_token, first_name, last_name FROM users ${whereClause}`,
                queryParams
            );

            if (users.length === 0) {
                return false;
            }

            const title = alert.alert_type === 'urgent' ? `🚨 ${alert.title}` : alert.title;
            const body = alert.content.length > 100 ? alert.content.substring(0, 97) + '...' : alert.content;

            const data = {
                type: 'news_alert',
                alert_id: alert.id.toString(),
                alert_type: alert.alert_type,
                full_content: alert.content
            };

            const fcmTokens = users.map(user => user.fcm_token);
            return await firebaseService.sendMulticastNotification(fcmTokens, title, body, data);

        } catch (error) {
            logger.error('Send news alert notification error:', error);
            return false;
        }
    }

    async updateUserFCMToken(userId, fcmToken) {
        try {
            // Verify the token is valid
            const isValid = await firebaseService.verifyToken(fcmToken);
            
            if (!isValid) {
                logger.warn(`Invalid FCM token provided for user ${userId}`);
                return false;
            }

            await database.update('users', { fcm_token: fcmToken }, { id: userId });
            logger.info(`FCM token updated for user ${userId}`);
            return true;

        } catch (error) {
            logger.error('Update FCM token error:', error);
            return false;
        }
    }

    async removeInvalidTokens() {
        try {
            const users = await database.query(
                'SELECT id, fcm_token FROM users WHERE fcm_token IS NOT NULL'
            );

            let removedCount = 0;

            for (const user of users) {
                const isValid = await firebaseService.verifyToken(user.fcm_token);
                
                if (!isValid) {
                    await database.update('users', { fcm_token: null }, { id: user.id });
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                logger.info(`Removed ${removedCount} invalid FCM tokens`);
            }

            return removedCount;

        } catch (error) {
            logger.error('Remove invalid tokens error:', error);
            return 0;
        }
    }
}

module.exports = new NotificationService();
