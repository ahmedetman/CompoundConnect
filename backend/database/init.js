
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../src/utils/logger');

require('dotenv').config();

async function initializeDatabase() {
    let connection;
    
    try {
        // Create connection without specifying database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            charset: 'utf8mb4'
        });

        logger.info('Connected to MySQL server');

        // Create database if it doesn't exist
        const dbName = process.env.DB_NAME || 'compoundconnect';
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        logger.info(`Database '${dbName}' created/verified`);

        // Use the database
        await connection.query(`USE \`${dbName}\``);

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSQL = await fs.readFile(schemaPath, 'utf8');
        
        // Split SQL statements and execute them
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
            }
        }

        logger.info('Database schema initialized successfully');

        return true;

    } catch (error) {
        logger.error('Database initialization error:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function seedDatabase() {
    const database = require('../src/config/database');
    
    try {
        await database.connect();
        logger.info('Connected to database for seeding');

        // Check if data already exists
        const existingCompounds = await database.query('SELECT COUNT(*) as count FROM compounds');
        if (existingCompounds[0].count > 0) {
            logger.info('Database already contains data, skipping seeding');
            return;
        }

        // Run seeding script
        const seedPath = path.join(__dirname, 'seeds.sql');
        const seedSQL = await fs.readFile(seedPath, 'utf8');
        
        const statements = seedSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                await database.query(statement);
            }
        }

        logger.info('Database seeded successfully');

    } catch (error) {
        logger.error('Database seeding error:', error);
        throw error;
    }
}

module.exports = {
    initializeDatabase,
    seedDatabase
};

// Run if called directly
if (require.main === module) {
    (async () => {
        try {
            await initializeDatabase();
            await seedDatabase();
            logger.info('Database initialization and seeding completed');
            process.exit(0);
        } catch (error) {
            logger.error('Database setup failed:', error);
            process.exit(1);
        }
    })();
}
