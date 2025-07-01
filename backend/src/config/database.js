
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.pool = null;
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'compoundconnect',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
            charset: 'utf8mb4',
            timezone: 'Z'
        };
    }

    async connect() {
        try {
            this.pool = mysql.createPool(this.config);
            
            // Test the connection
            const connection = await this.pool.getConnection();
            logger.info('Database connected successfully');
            connection.release();
            
            return this.pool;
        } catch (error) {
            logger.error('Database connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            logger.info('Database disconnected');
        }
    }

    getPool() {
        if (!this.pool) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.pool;
    }

    async query(sql, params = []) {
        try {
            const [rows, fields] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            logger.error('Database query error:', error);
            logger.error('SQL:', sql);
            logger.error('Params:', params);
            throw error;
        }
    }

    async transaction(callback) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Helper methods for common queries
    async findById(table, id, fields = '*') {
        const sql = `SELECT ${fields} FROM ${table} WHERE id = ?`;
        const rows = await this.query(sql, [id]);
        return rows[0] || null;
    }

    async findOne(table, conditions, fields = '*') {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(conditions);
        const sql = `SELECT ${fields} FROM ${table} WHERE ${whereClause}`;
        const rows = await this.query(sql, values);
        return rows[0] || null;
    }

    async findMany(table, conditions = {}, fields = '*', orderBy = 'id ASC', limit = null) {
        let sql = `SELECT ${fields} FROM ${table}`;
        const values = [];

        if (Object.keys(conditions).length > 0) {
            const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
            sql += ` WHERE ${whereClause}`;
            values.push(...Object.values(conditions));
        }

        sql += ` ORDER BY ${orderBy}`;

        if (limit) {
            sql += ` LIMIT ${limit}`;
        }

        return await this.query(sql, values);
    }

    async insert(table, data) {
        const fields = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);
        
        const sql = `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`;
        const result = await this.query(sql, values);
        return result.insertId;
    }

    async update(table, data, conditions) {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        const values = [...Object.values(data), ...Object.values(conditions)];
        
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        const result = await this.query(sql, values);
        return result.affectedRows;
    }

    async delete(table, conditions) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(conditions);
        
        const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
        const result = await this.query(sql, values);
        return result.affectedRows;
    }
}

module.exports = new Database();
