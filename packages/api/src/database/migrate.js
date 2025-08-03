const db = require('./connection');

const resetDatabase = async () => {
  console.log('🗑️  Resetting database...');
  
  try {
    // Drop all tables in reverse order to handle foreign key constraints
    const tables = [
      'qr_stats',
      'dashboard_stats', 
      'reports',
      'settings',
      'feedback',
      'refresh_tokens',
      'news',
      'personnel_invites',
      'scan_logs',
      'qr_codes',
      'payments',
      'services',
      'unit_users',
      'units',
      'users',
      'seasons',
      'compounds'
    ];

    for (const table of tables) {
      await db.run(`DROP TABLE IF EXISTS ${table}`);
      console.log(`  ✓ Dropped table: ${table}`);
    }
    
    console.log('✅ Database reset completed');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
};

const createTables = async () => {
  console.log('🏗️  Creating database tables...');
  
  try {
    // Compounds table
    await db.run(`
      CREATE TABLE IF NOT EXISTS compounds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        logo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ Created compounds table');

    // Seasons table
    await db.run(`
      CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ Created seasons table');

    // Users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        profile_picture_url TEXT,
        phone TEXT,
        role TEXT NOT NULL CHECK (role IN ('super_admin', 'management', 'owner', 'security', 'pool_staff', 'facility_staff')),
        device_token TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ Created users table');

    // Units table
    await db.run(`
      CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        unit_number TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
        UNIQUE(compound_id, unit_number)
      )
    `);
    console.log('  ✓ Created units table');

    // Unit Users junction table (Many-to-Many)
    await db.run(`
      CREATE TABLE IF NOT EXISTS unit_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        relationship TEXT DEFAULT 'owner' CHECK (relationship IN ('owner', 'tenant', 'family_member')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(unit_id, user_id)
      )
    `);
    console.log('  ✓ Created unit_users table');

    // Services table
    await db.run(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2),
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ Created services table');

    // Payments table
    await db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('paid', 'due', 'overdue')),
        amount DECIMAL(10,2),
        paid_on_date DATETIME,
        due_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
        UNIQUE(unit_id, service_id, season_id)
      )
    `);
    console.log('  ✓ Created payments table');

    // QR Codes table
    await db.run(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        unit_id INTEGER,
        compound_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('visitor', 'owner_gate', 'owner_pool', 'owner_facility')),
        code_data TEXT UNIQUE NOT NULL,
        code_hash TEXT UNIQUE NOT NULL,
        visitor_name TEXT,
        visitor_vehicle_plate TEXT,
        num_persons INTEGER DEFAULT 1,
        facility_type TEXT,
        valid_from DATETIME NOT NULL,
        valid_to DATETIME NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        is_single_use BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ Created qr_codes table');

    // Scan Logs table
    await db.run(`
      CREATE TABLE IF NOT EXISTS scan_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qr_code_id INTEGER NOT NULL,
        scanner_user_id INTEGER NOT NULL,
        compound_id INTEGER NOT NULL,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        location_tag TEXT,
        result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
        failure_reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE,
        FOREIGN KEY (scanner_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ Created scan_logs table');

    // Personnel Invite Codes table
    await db.run(`
      CREATE TABLE IF NOT EXISTS personnel_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        invite_code TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('security', 'pool_staff', 'facility_staff')),
        created_by_user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        is_used BOOLEAN DEFAULT 0,
        used_by_user_id INTEGER,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('  ✓ Created personnel_invites table');

    // News and Alerts table
    await db.run(`
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'news' CHECK (type IN ('news', 'alert', 'maintenance', 'event')),
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        is_published BOOLEAN DEFAULT 1,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        created_by_user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ Created news table');

    // Refresh Tokens table
    await db.run(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        is_revoked BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ Created refresh_tokens table');

    // Feedback table
    await db.run(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        compound_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('bug', 'feature_request', 'improvement', 'general')),
        category TEXT CHECK (category IN ('app', 'qr_codes', 'payments', 'notifications', 'security', 'ui_ux', 'performance', 'other')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'duplicate')),
        admin_response TEXT,
        admin_user_id INTEGER,
        responded_at DATETIME,
        device_info TEXT,
        app_version TEXT,
        attachments TEXT, -- JSON array of file paths
        is_anonymous BOOLEAN DEFAULT 0,
        language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('  ✓ Created feedback table');

    // Settings table for compound-wide settings
    await db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        setting_type TEXT DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
        description TEXT,
        is_public BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
        UNIQUE(compound_id, setting_key)
      )
    `);
    console.log('  ✓ Created settings table');

    // Reports table for storing generated reports
    await db.run(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        report_type TEXT NOT NULL CHECK (report_type IN ('payments', 'qr_usage', 'user_activity', 'feedback', 'security', 'financial')),
        report_name TEXT NOT NULL,
        report_data TEXT NOT NULL, -- JSON data
        generated_by INTEGER NOT NULL,
        file_path TEXT,
        file_size INTEGER,
        is_scheduled BOOLEAN DEFAULT 0,
        scheduled_frequency TEXT CHECK (scheduled_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
        FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ Created reports table');

    // Dashboard stats cache table
    await db.run(`
      CREATE TABLE IF NOT EXISTS dashboard_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        stat_type TEXT NOT NULL,
        stat_value TEXT NOT NULL, -- JSON data
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
        UNIQUE(compound_id, stat_type)
      )
    `);
    console.log('  ✓ Created dashboard_stats table');

    // QR code stats table
    await db.run(`
      CREATE TABLE IF NOT EXISTS qr_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        date DATE NOT NULL,
        total_codes INTEGER DEFAULT 0,
        active_codes INTEGER DEFAULT 0,
        expired_codes INTEGER DEFAULT 0,
        total_scans INTEGER DEFAULT 0,
        successful_scans INTEGER DEFAULT 0,
        failed_scans INTEGER DEFAULT 0,
        unique_users INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
        UNIQUE(compound_id, date)
      )
    `);
    console.log('  ✓ Created qr_stats table');

    // Create indexes for better performance
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_compound ON users(compound_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_units_compound ON units(compound_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_units_number ON units(unit_number)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_unit_users_unit ON unit_users(unit_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_unit_users_user ON unit_users(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_unit_users_relationship ON unit_users(relationship)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_qr_codes_compound ON qr_codes(compound_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_qr_codes_user ON qr_codes(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes(is_active, valid_to)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_scan_logs_qr_code ON scan_logs(qr_code_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_scan_logs_date ON scan_logs(scanned_at)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_payments_unit ON payments(unit_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_payments_season ON payments(season_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_news_compound ON news(compound_id, is_published)`);
    console.log('  ✓ Created database indexes');

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

const migrate = async (reset = false) => {
  try {
    console.log('🚀 Starting database migration...');
    
    // Connect to database first
    await db.connect();
    
    if (reset) {
      await resetDatabase();
    }
    
    await createTables();
    
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.close();
  }
};

// Check if this script is being run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset') || args.includes('-r');
  
  if (shouldReset) {
    console.log('⚠️  Reset flag detected - this will delete all existing data!');
  }
  
  migrate(shouldReset)
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate, resetDatabase, createTables };