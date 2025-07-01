
const cron = require('node-cron');
const database = require('../config/database');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class CronJobService {
    constructor() {
        this.jobs = [];
    }

    start() {
        this.scheduleSeasonEndingReminders();
        this.scheduleExpiredQRCleanup();
        this.schedulePaymentReminders();
        this.scheduleInvalidTokenCleanup();
        this.scheduleInactivePersonnelCleanup();
        
        logger.info('Cron jobs started successfully');
    }

    stop() {
        this.jobs.forEach(job => {
            if (job.destroy) {
                job.destroy();
            }
        });
        this.jobs = [];
        logger.info('Cron jobs stopped');
    }

    scheduleSeasonEndingReminders() {
        // Check for season endings daily at 9 AM
        const job = cron.schedule('0 9 * * *', async () => {
            try {
                logger.info('Running season ending reminder check');
                
                const activeSeasons = await database.query(`
                    SELECT 
                        s.*,
                        c.name as compound_name,
                        DATEDIFF(s.end_date, CURDATE()) as days_left
                    FROM seasons s
                    JOIN compounds c ON s.compound_id = c.id
                    WHERE s.is_active = true 
                        AND DATEDIFF(s.end_date, CURDATE()) IN (30, 14, 7, 3, 1)
                `);

                for (const season of activeSeasons) {
                    await notificationService.sendSeasonEndingNotification(
                        season.compound_id,
                        season.name,
                        season.days_left
                    );
                    
                    logger.info(`Season ending notification sent for ${season.name} (${season.days_left} days left)`);
                }

                // Auto-deactivate expired seasons
                const expiredSeasons = await database.query(`
                    SELECT id, name, compound_id 
                    FROM seasons 
                    WHERE is_active = true AND end_date < CURDATE()
                `);

                for (const season of expiredSeasons) {
                    await database.update('seasons', { is_active: false }, { id: season.id });
                    logger.info(`Auto-deactivated expired season: ${season.name}`);
                }

            } catch (error) {
                logger.error('Season ending reminder cron error:', error);
            }
        }, {
            scheduled: false
        });

        job.start();
        this.jobs.push(job);
    }

    scheduleExpiredQRCleanup() {
        // Clean up expired QR codes daily at 2 AM
        const job = cron.schedule('0 2 * * *', async () => {
            try {
                logger.info('Running expired QR cleanup');

                // Deactivate expired visitor passes
                const result = await database.query(`
                    UPDATE qr_codes 
                    SET is_active = false 
                    WHERE qr_type = 'visitor_pass' 
                        AND is_active = true 
                        AND valid_until < NOW()
                `);

                if (result.affectedRows > 0) {
                    logger.info(`Deactivated ${result.affectedRows} expired visitor passes`);
                }

                // Clean up old scan logs (older than 6 months)
                const cleanupResult = await database.query(`
                    DELETE FROM scan_logs 
                    WHERE scan_timestamp < DATE_SUB(NOW(), INTERVAL 6 MONTH)
                `);

                if (cleanupResult.affectedRows > 0) {
                    logger.info(`Cleaned up ${cleanupResult.affectedRows} old scan logs`);
                }

            } catch (error) {
                logger.error('Expired QR cleanup cron error:', error);
            }
        }, {
            scheduled: false
        });

        job.start();
        this.jobs.push(job);
    }

    schedulePaymentReminders() {
        // Send payment reminders weekly on Mondays at 10 AM
        const job = cron.schedule('0 10 * * 1', async () => {
            try {
                logger.info('Running payment reminder check');

                const overduePayments = await database.query(`
                    SELECT 
                        p.*,
                        u.unit_number,
                        s.name as season_name,
                        users.id as user_id,
                        users.first_name,
                        users.last_name,
                        users.fcm_token
                    FROM payments p
                    JOIN units u ON p.unit_id = u.id
                    JOIN seasons s ON p.season_id = s.id
                    JOIN unit_users uu ON u.id = uu.unit_id AND uu.is_primary = true
                    JOIN users ON uu.user_id = users.id
                    WHERE p.payment_status IN ('pending', 'overdue')
                        AND p.due_date < CURDATE()
                        AND s.is_active = true
                        AND users.fcm_token IS NOT NULL
                `);

                for (const payment of overduePayments) {
                    // Update status to overdue if past due date
                    if (payment.payment_status === 'pending') {
                        await database.update('payments', 
                            { payment_status: 'overdue' }, 
                            { id: payment.id }
                        );
                    }

                    // Send reminder notification
                    await notificationService.sendPaymentReminderNotification(
                        payment.user_id,
                        payment.season_name,
                        payment.amount_due
                    );
                    
                    logger.info(`Payment reminder sent to ${payment.first_name} ${payment.last_name} for unit ${payment.unit_number}`);
                }

            } catch (error) {
                logger.error('Payment reminder cron error:', error);
            }
        }, {
            scheduled: false
        });

        job.start();
        this.jobs.push(job);
    }

    scheduleInvalidTokenCleanup() {
        // Clean up invalid FCM tokens weekly on Sundays at 3 AM
        const job = cron.schedule('0 3 * * 0', async () => {
            try {
                logger.info('Running invalid FCM token cleanup');
                
                const removedCount = await notificationService.removeInvalidTokens();
                
                if (removedCount > 0) {
                    logger.info(`Cleaned up ${removedCount} invalid FCM tokens`);
                }

            } catch (error) {
                logger.error('Invalid token cleanup cron error:', error);
            }
        }, {
            scheduled: false
        });

        job.start();
        this.jobs.push(job);
    }

    scheduleInactivePersonnelCleanup() {
        // Clean up expired personnel accounts monthly on the 1st at 4 AM
        const job = cron.schedule('0 4 1 * *', async () => {
            try {
                logger.info('Running inactive personnel cleanup');

                // Remove expired invite codes
                const expiredInvites = await database.query(`
                    UPDATE users 
                    SET invite_code = NULL, invite_expires_at = NULL 
                    WHERE invite_expires_at < NOW() AND invite_code IS NOT NULL
                `);

                if (expiredInvites.affectedRows > 0) {
                    logger.info(`Cleaned up ${expiredInvites.affectedRows} expired invite codes`);
                }

                // Deactivate personnel who haven't logged in for 90 days
                const inactivePersonnel = await database.query(`
                    UPDATE users 
                    SET is_active = false 
                    WHERE role IN ('security', 'pool_staff') 
                        AND is_active = true
                        AND (last_login_at IS NULL OR last_login_at < DATE_SUB(NOW(), INTERVAL 90 DAY))
                        AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
                `);

                if (inactivePersonnel.affectedRows > 0) {
                    logger.info(`Deactivated ${inactivePersonnel.affectedRows} inactive personnel accounts`);
                }

            } catch (error) {
                logger.error('Inactive personnel cleanup cron error:', error);
            }
        }, {
            scheduled: false
        });

        job.start();
        this.jobs.push(job);
    }

    // Manual trigger methods for testing
    async triggerSeasonCheck() {
        try {
            logger.info('Manually triggering season ending check');
            // Implementation similar to scheduleSeasonEndingReminders callback
        } catch (error) {
            logger.error('Manual season check error:', error);
        }
    }

    async triggerQRCleanup() {
        try {
            logger.info('Manually triggering QR cleanup');
            // Implementation similar to scheduleExpiredQRCleanup callback
        } catch (error) {
            logger.error('Manual QR cleanup error:', error);
        }
    }
}

module.exports = new CronJobService();
