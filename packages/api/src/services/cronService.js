const cron = require('node-cron');
const db = require('../database/connection');
const authService = require('./authService');

class CronService {
  constructor() {
    this.jobs = [];
  }

  start() {
    console.log('Starting cron jobs...');

    // Clean expired refresh tokens daily at 2 AM
    const cleanTokensJob = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('Running expired token cleanup...');
        await authService.cleanExpiredTokens();
        console.log('Expired token cleanup completed');
      } catch (error) {
        console.error('Error cleaning expired tokens:', error);
      }
    }, {
      scheduled: false
    });

    // Check for expiring seasons daily at 9 AM
    const checkSeasonsJob = cron.schedule('0 9 * * *', async () => {
      try {
        console.log('Checking for expiring seasons...');
        await this.checkExpiringSeason();
        console.log('Season expiration check completed');
      } catch (error) {
        console.error('Error checking expiring seasons:', error);
      }
    }, {
      scheduled: false
    });

    // Invalidate expired QR codes every hour
    const invalidateQRJob = cron.schedule('0 * * * *', async () => {
      try {
        console.log('Invalidating expired QR codes...');
        await this.invalidateExpiredQRCodes();
        console.log('QR code invalidation completed');
      } catch (error) {
        console.error('Error invalidating expired QR codes:', error);
      }
    }, {
      scheduled: false
    });

    // Update overdue payments daily at 1 AM
    const updateOverdueJob = cron.schedule('0 1 * * *', async () => {
      try {
        console.log('Updating overdue payments...');
        await this.updateOverduePayments();
        console.log('Overdue payments update completed');
      } catch (error) {
        console.error('Error updating overdue payments:', error);
      }
    }, {
      scheduled: false
    });

    // Start all jobs
    cleanTokensJob.start();
    checkSeasonsJob.start();
    invalidateQRJob.start();
    updateOverdueJob.start();

    this.jobs = [cleanTokensJob, checkSeasonsJob, invalidateQRJob, updateOverdueJob];
    console.log(`Started ${this.jobs.length} cron jobs`);
  }

  stop() {
    console.log('Stopping cron jobs...');
    this.jobs.forEach(job => {
      job.stop();
    });
    this.jobs = [];
    console.log('All cron jobs stopped');
  }

  // Check for seasons expiring within notification period
  async checkExpiringSeason() {
    const notificationDays = parseInt(process.env.SEASON_END_NOTIFICATION_DAYS) || 7;
    
    const expiringSeason = await db.all(`
      SELECT 
        s.*,
        c.name as compound_name,
        GROUP_CONCAT(u.device_token) as management_tokens
      FROM seasons s
      JOIN compounds c ON s.compound_id = c.id
      LEFT JOIN users u ON u.compound_id = s.compound_id AND u.role = 'management' AND u.device_token IS NOT NULL
      WHERE s.is_active = 1 
        AND date(s.end_date) <= date('now', '+${notificationDays} days')
        AND date(s.end_date) > date('now')
      GROUP BY s.id
    `);

    for (const season of expiringSeason) {
      const daysUntilExpiry = Math.ceil((new Date(season.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      
      console.log(`Season "${season.name}" in compound "${season.compound_name}" expires in ${daysUntilExpiry} days`);
      
      // Send push notifications to management
      if (season.management_tokens) {
        const tokens = season.management_tokens.split(',').filter(token => token);
        await this.sendSeasonExpiryNotification(tokens, season, daysUntilExpiry);
      }
    }
  }

  // Send season expiry notification (placeholder for push notification service)
  async sendSeasonExpiryNotification(tokens, season, daysUntilExpiry) {
    // This would integrate with Firebase Cloud Messaging
    console.log(`Sending season expiry notification to ${tokens.length} management users`);
    console.log(`Message: Season "${season.name}" expires in ${daysUntilExpiry} days. Please configure the new season.`);
    
    // TODO: Implement actual push notification sending
    // const message = {
    //   notification: {
    //     title: 'Season Expiring Soon',
    //     body: `Season "${season.name}" expires in ${daysUntilExpiry} days. Please configure the new season.`
    //   },
    //   data: {
    //     type: 'season_expiry',
    //     season_id: season.id.toString(),
    //     days_until_expiry: daysUntilExpiry.toString()
    //   }
    // };
    
    // for (const token of tokens) {
    //   try {
    //     await admin.messaging().send({ ...message, token });
    //   } catch (error) {
    //     console.error(`Failed to send notification to token ${token}:`, error);
    //   }
    // }
  }

  // Invalidate expired QR codes
  async invalidateExpiredQRCodes() {
    const result = await db.run(`
      UPDATE qr_codes 
      SET is_active = 0 
      WHERE is_active = 1 
        AND datetime(valid_to) < datetime('now')
    `);

    if (result.changes > 0) {
      console.log(`Invalidated ${result.changes} expired QR codes`);
    }
  }

  // Update overdue payments
  async updateOverduePayments() {
    const result = await db.run(`
      UPDATE payments 
      SET status = 'overdue' 
      WHERE status = 'due' 
        AND date(due_date) < date('now')
    `);

    if (result.changes > 0) {
      console.log(`Updated ${result.changes} payments to overdue status`);
    }
  }

  // Invalidate owner QR codes when season ends
  async invalidateSeasonQRCodes() {
    const endedSeasons = await db.all(`
      SELECT id, compound_id, name 
      FROM seasons 
      WHERE is_active = 1 
        AND date(end_date) < date('now')
    `);

    for (const season of endedSeasons) {
      // Invalidate owner QR codes for ended season
      const result = await db.run(`
        UPDATE qr_codes 
        SET is_active = 0 
        WHERE compound_id = ? 
          AND type LIKE 'owner_%' 
          AND is_active = 1
      `, [season.compound_id]);

      // Deactivate the season
      await db.run(`
        UPDATE seasons 
        SET is_active = 0 
        WHERE id = ?
      `, [season.id]);

      console.log(`Season "${season.name}" ended. Invalidated ${result.changes} owner QR codes.`);
    }
  }

  // Manual trigger methods for testing
  async runTokenCleanup() {
    await authService.cleanExpiredTokens();
  }

  async runSeasonCheck() {
    await this.checkExpiringSeason();
  }

  async runQRInvalidation() {
    await this.invalidateExpiredQRCodes();
  }

  async runOverdueUpdate() {
    await this.updateOverduePayments();
  }
}

module.exports = new CronService();