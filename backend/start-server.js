
const cronJobs = require('./src/services/cronJobs');
const { initializeDatabase, seedDatabase } = require('./database/init');
const logger = require('./src/utils/logger');

async function startServer() {
    try {
        logger.info('Starting CompoundConnect Backend Server...');

        // Initialize database if needed
        if (process.env.NODE_ENV !== 'production' || process.env.INIT_DB === 'true') {
            logger.info('Initializing database...');
            await initializeDatabase();
            
            if (process.env.ENABLE_SAMPLE_DATA === 'true') {
                logger.info('Seeding database with sample data...');
                await seedDatabase();
            }
        }

        // Start cron jobs
        if (process.env.ENABLE_CRON_JOBS !== 'false') {
            cronJobs.start();
        }

        // Start the main server
        require('./server');

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
