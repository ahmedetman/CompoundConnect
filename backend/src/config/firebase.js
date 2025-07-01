
const admin = require('firebase-admin');
const logger = require('../utils/logger');

class FirebaseService {
    constructor() {
        this.admin = null;
        this.initialized = false;
    }

    initialize() {
        try {
            // Check if Firebase credentials are available
            if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
                logger.warn('Firebase credentials not configured. Push notifications will be disabled.');
                return false;
            }

            const serviceAccount = {
                type: "service_account",
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
            };

            if (!admin.apps.length) {
                this.admin = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    projectId: process.env.FIREBASE_PROJECT_ID
                });
            } else {
                this.admin = admin.app();
            }

            this.initialized = true;
            logger.info('Firebase Admin SDK initialized successfully');
            return true;

        } catch (error) {
            logger.error('Firebase initialization error:', error);
            this.initialized = false;
            return false;
        }
    }

    isInitialized() {
        return this.initialized;
    }

    getMessaging() {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        return this.admin.messaging();
    }

    async sendNotification(fcmToken, title, body, data = {}) {
        try {
            if (!this.initialized) {
                logger.warn('Firebase not initialized. Cannot send notification.');
                return false;
            }

            const message = {
                token: fcmToken,
                notification: {
                    title: title,
                    body: body
                },
                data: {
                    ...data,
                    timestamp: new Date().toISOString()
                },
                android: {
                    notification: {
                        sound: 'default',
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default'
                        }
                    }
                }
            };

            const response = await this.getMessaging().send(message);
            logger.info(`Notification sent successfully: ${response}`);
            return true;

        } catch (error) {
            logger.error('Send notification error:', error);
            
            // Handle invalid token
            if (error.code === 'messaging/invalid-registration-token' || 
                error.code === 'messaging/registration-token-not-registered') {
                logger.warn(`Invalid FCM token detected: ${fcmToken}`);
                // You might want to remove this token from the database
                return false;
            }
            
            return false;
        }
    }

    async sendMulticastNotification(fcmTokens, title, body, data = {}) {
        try {
            if (!this.initialized) {
                logger.warn('Firebase not initialized. Cannot send notifications.');
                return false;
            }

            if (!fcmTokens || fcmTokens.length === 0) {
                logger.warn('No FCM tokens provided for multicast notification');
                return false;
            }

            const message = {
                tokens: fcmTokens,
                notification: {
                    title: title,
                    body: body
                },
                data: {
                    ...data,
                    timestamp: new Date().toISOString()
                }
            };

            const response = await this.getMessaging().sendMulticast(message);
            logger.info(`Multicast notification sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);
            
            // Handle failed tokens
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        logger.warn(`Failed to send to token ${fcmTokens[idx]}: ${resp.error}`);
                    }
                });
            }

            return response;

        } catch (error) {
            logger.error('Send multicast notification error:', error);
            return false;
        }
    }

    async verifyToken(fcmToken) {
        try {
            if (!this.initialized) {
                return false;
            }

            // Try to send a test message to verify token validity
            const message = {
                token: fcmToken,
                data: {
                    test: 'true'
                },
                dryRun: true // This won't actually send the message
            };

            await this.getMessaging().send(message);
            return true;

        } catch (error) {
            logger.warn(`FCM token verification failed: ${error.code}`);
            return false;
        }
    }
}

module.exports = new FirebaseService();
