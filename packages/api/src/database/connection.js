const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const dbPath = process.env.DATABASE_PATH || './data/compound_connect.db';
      const dbDir = path.dirname(dbPath);
      
      // Ensure data directory exists
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          // Enable foreign keys
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Helper method to run queries with promises
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Helper method to get single row
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Helper method to get all rows
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Helper method to execute multiple statements in a transaction
  async transaction(queries) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        const results = [];
        let hasError = false;

        queries.forEach((query, index) => {
          if (hasError) return;

          this.db.run(query.sql, query.params || [], function(err) {
            if (err) {
              hasError = true;
              this.db.run('ROLLBACK');
              reject(err);
            } else {
              results.push({ id: this.lastID, changes: this.changes });
              
              if (index === queries.length - 1) {
                this.db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    reject(commitErr);
                  } else {
                    resolve(results);
                  }
                });
              }
            }
          });
        });
      });
    });
  }
}

module.exports = new Database();