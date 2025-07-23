const db = require('./connection');

const createTables = async () => {
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

    // Users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compound_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        profile_picture_url TEXT,
        role TEXT NOT NULL CHECK (role IN ('super_admin', 'management', 'owner', 'security', 'pool_staff', 'facility_staff')),
        device_token TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE
      )
    `);

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

    // Unit Users junction table (Many-to-Many)
    await db.run(`
      CREATE TABLE IF NOT EXISTS unit_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        relationship TEXT DEFAULT 'owner' CHECK (relationship IN ('owner', 'spouse', 'child', 'tenant')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(unit_id, user_id)
      )
    `);

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

    // Create indexes for better performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_compound ON users(compound_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_qr_codes_hash ON qr_codes(code_hash)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes(is_active)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_scan_logs_qr_code ON scan_logs(qr_code_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_scan_logs_scanner ON scan_logs(scanner_user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_payments_unit ON payments(unit_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_payments_season ON payments(season_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_seasons_compound ON seasons(compound_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_units_compound ON units(compound_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_feedback_compound ON feedback(compound_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type)');

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const migrate = async () => {
  try {
    await db.connect();
    await createTables();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = { createTables, migrate };