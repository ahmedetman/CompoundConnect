
require('dotenv').config();
const app = require('./app');
const database = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Connect to database
        await database.connect();
        logger.info('Database connection established');

        // Start server
        const server = app.listen(PORT, () => {
            logger.info(`CompoundConnect Backend API running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(async () => {
                await database.disconnect();
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT received, shutting down gracefully');
            server.close(async () => {
                await database.disconnect();
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
