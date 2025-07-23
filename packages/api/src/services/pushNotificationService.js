const admin = require('firebase-admin');

class PushNotificationService {
  constructor() {
    this.initialized = false;
  }

  // Initialize Firebase Admin SDK
  initialize() {
    if (this.initialized) return;

    try {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
      };

      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        console.warn('Firebase configuration incomplete. Push notifications will be disabled.');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });

      this.initialized = true;
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  // Send notification to a single device
  async sendToDevice(token, notification, data = {}) {
    if (!this.initialized) {
      console.log('Push notifications disabled - would send:', { token, notification, data });
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('Push notification sent successfully:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification to multiple devices
  async sendToMultipleDevices(tokens, notification, data = {}) {
    if (!this.initialized) {
      console.log('Push notifications disabled - would send to multiple devices:', { tokens, notification, data });
      return { success: false, error: 'Firebase not initialized' };
    }

    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'No tokens provided' };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          ...data,
          timestamp: new Date().toISOString()
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        },
        tokens: tokens.filter(token => token && token.trim() !== '')
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`Push notifications sent: ${response.successCount}/${tokens.length} successful`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
          }
        });
      }

      return { 
        success: true, 
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      console.error('Failed to send push notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Send QR scan notification to owner
  async sendQRScanNotification(userToken, scanData) {
    const notification = {
      title: 'QR Code Scanned',
      body: scanData.type === 'visitor' 
        ? `Your visitor ${scanData.visitor_name} has entered the compound`
        : `Your ${scanData.access_type} QR code was used`
    };

    const data = {
      type: 'qr_scan',
      qr_type: scanData.type,
      location: scanData.location || 'compound',
      timestamp: new Date().toISOString()
    };

    return await this.sendToDevice(userToken, notification, data);
  }

  // Send season expiry notification to management
  async sendSeasonExpiryNotification(tokens, seasonData, daysUntilExpiry) {
    const notification = {
      title: 'Season Expiring Soon',
      body: `Season "${seasonData.name}" expires in ${daysUntilExpiry} days. Please configure the new season.`
    };

    const data = {
      type: 'season_expiry',
      season_id: seasonData.id.toString(),
      days_until_expiry: daysUntilExpiry.toString(),
      compound_id: seasonData.compound_id.toString()
    };

    return await this.sendToMultipleDevices(tokens, notification, data);
  }

  // Send news/alert notification to residents
  async sendNewsNotification(tokens, newsData) {
    const notification = {
      title: newsData.type === 'alert' ? '🚨 Alert' : '📢 News',
      body: newsData.title
    };

    const data = {
      type: 'news',
      news_id: newsData.id.toString(),
      news_type: newsData.type,
      priority: newsData.priority,
      compound_id: newsData.compound_id.toString()
    };

    return await this.sendToMultipleDevices(tokens, notification, data);
  }

  // Send payment reminder notification
  async sendPaymentReminderNotification(userToken, paymentData) {
    const notification = {
      title: 'Payment Reminder',
      body: `Your ${paymentData.service_name} payment is ${paymentData.status === 'overdue' ? 'overdue' : 'due soon'}`
    };

    const data = {
      type: 'payment_reminder',
      payment_id: paymentData.id.toString(),
      service_name: paymentData.service_name,
      status: paymentData.status,
      unit_number: paymentData.unit_number
    };

    return await this.sendToDevice(userToken, notification, data);
  }

  // Validate and clean device tokens
  async validateTokens(tokens) {
    if (!this.initialized || !tokens || tokens.length === 0) {
      return { validTokens: [], invalidTokens: [] };
    }

    const validTokens = [];
    const invalidTokens = [];

    // Send a dry-run message to validate tokens
    for (const token of tokens) {
      try {
        await admin.messaging().send({
          token,
          notification: { title: 'Test', body: 'Test' }
        }, true); // dry-run mode
        
        validTokens.push(token);
      } catch (error) {
        console.log(`Invalid token detected: ${token}`);
        invalidTokens.push(token);
      }
    }

    return { validTokens, invalidTokens };
  }
}

// Initialize the service
const pushNotificationService = new PushNotificationService();
pushNotificationService.initialize();

module.exports = pushNotificationService;