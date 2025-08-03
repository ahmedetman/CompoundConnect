const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./connection');

const clearData = async () => {
  console.log('🗑️  Clearing existing data...');
  
  try {
    // Clear data in reverse order to handle foreign key constraints
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
      await db.run(`DELETE FROM ${table}`);
      console.log(`  ✓ Cleared table: ${table}`);
    }
    
    console.log('✅ Data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
};

const seedData = async (reset = false) => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database first
    await db.connect();
    
    if (reset) {
      await clearData();
    } else {
      // Check if data already exists
      const compoundCount = await db.get('SELECT COUNT(*) as count FROM compounds');
      if (compoundCount.count > 0) {
        console.log('⚠️  Database already contains data. Use --reset flag to clear and reseed.');
        return;
      }
    }
    
    // Create sample compound
    console.log('📍 Creating compound...');
    const compoundResult = await db.run(`
      INSERT INTO compounds (name, logo_url) 
      VALUES (?, ?)
    `, ['Seaside Compound', '/uploads/logos/seaside-logo.png']);
    
    const compoundId = compoundResult.id;
    console.log(`  ✓ Created compound: Seaside Compound (ID: ${compoundId})`);

    // Create sample season
    console.log('📅 Creating season...');
    const seasonResult = await db.run(`
      INSERT INTO seasons (compound_id, name, start_date, end_date, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `, [compoundId, '2024-2025', '2024-04-01', '2025-03-31', 1]);
    
    const seasonId = seasonResult.id;
    console.log(`  ✓ Created season: 2024-2025 (ID: ${seasonId})`);

    // Create sample services
    console.log('🏊 Creating services...');
    const services = [
      { name: 'Annual Maintenance', description: 'Annual compound maintenance fee', price: 1000.00 },
      { name: 'Pool Access', description: 'Swimming pool access fee', price: 500.00 },
      { name: 'Kids Area Access', description: 'Children playground access fee', price: 200.00 },
      { name: 'Beach Access', description: 'Private beach access fee', price: 300.00 },
      { name: 'Gym Access', description: 'Fitness center access fee', price: 400.00 }
    ];

    const serviceIds = [];
    for (const service of services) {
      const result = await db.run(`
        INSERT INTO services (compound_id, name, description, price) 
        VALUES (?, ?, ?, ?)
      `, [compoundId, service.name, service.description, service.price]);
      serviceIds.push(result.id);
      console.log(`  ✓ Created service: ${service.name}`);
    }

    // Create sample users
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Super Admin
    const superAdminResult = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, phone, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [compoundId, 'Super Admin', 'superadmin@compoundconnect.com', hashedPassword, '+971500000001', 'super_admin']);
    console.log('  ✓ Created Super Admin user');

    // Compound Manager
    const managerResult = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, phone, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [compoundId, 'Compound Manager', 'manager@seaside.com', hashedPassword, '+971500000002', 'management']);
    console.log('  ✓ Created Management user');

    // Unit Owners
    const owner1Result = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, phone, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [compoundId, 'Ahmed Mohamed', 'ahmed@example.com', hashedPassword, '+971500000003', 'owner']);

    const owner2Result = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, phone, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [compoundId, 'Sarah Johnson', 'sarah@example.com', hashedPassword, '+971500000004', 'owner']);

    const owner3Result = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, phone, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [compoundId, 'Mohamed Ali', 'mohamed@example.com', hashedPassword, '+971500000005', 'owner']);

    const tenantResult = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, phone, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [compoundId, 'John Tenant', 'john@example.com', hashedPassword, '+971500000008', 'owner']);

    const familyMemberResult = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, phone, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [compoundId, 'Aisha Family', 'aisha@example.com', hashedPassword, '+971500000009', 'owner']);
    console.log('  ✓ Created Owner users');

    // Security Personnel
    const securityResult = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, phone, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [compoundId, 'Security Guard', 'security@seaside.com', hashedPassword, '+971500000006', 'security']);

    // Pool Staff
    const poolStaffResult = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, phone, role) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [compoundId, 'Pool Staff', 'pool@seaside.com', hashedPassword, '+971500000007', 'pool_staff']);
    console.log('  ✓ Created Security and Pool Staff users');

    // Create sample units
    console.log('🏠 Creating units...');
    const units = [
      { number: 'A-101', owner: owner1Result.id },
      { number: 'A-102', owner: owner2Result.id },
      { number: 'B-201', owner: owner3Result.id },
      { number: 'B-202', owner: null }, // Unassigned unit
      { number: 'C-301', owner: null }  // Unassigned unit
    ];

    const unitIds = [];
    for (const unit of units) {
      const result = await db.run(`
        INSERT INTO units (compound_id, unit_number) 
        VALUES (?, ?)
      `, [compoundId, unit.number]);
      unitIds.push(result.id);
      
      // Assign owner if specified
      if (unit.owner) {
        await db.run(`
          INSERT INTO unit_users (unit_id, user_id, relationship) 
          VALUES (?, ?, ?)
        `, [result.id, unit.owner, 'owner']);
      }
      
      console.log(`  ✓ Created unit: ${unit.number}${unit.owner ? ' (assigned)' : ' (unassigned)'}`);
    }

    // Create sample payments for assigned units
    console.log('💳 Creating payments...');
    const assignedUnits = [
      { unitId: unitIds[0], ownerId: owner1Result.id },
      { unitId: unitIds[1], ownerId: owner2Result.id },
      { unitId: unitIds[2], ownerId: owner3Result.id }
    ];

    for (const unit of assignedUnits) {
      for (let i = 0; i < serviceIds.length; i++) {
        const serviceId = serviceIds[i];
        const service = services[i];
        
        // Randomly assign payment status
        const statuses = ['paid', 'due', 'overdue'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const paidDate = status === 'paid' ? new Date().toISOString() : null;
        
        await db.run(`
          INSERT INTO payments (unit_id, service_id, season_id, status, amount, paid_on_date, due_date) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [unit.unitId, serviceId, seasonId, status, service.price, paidDate, '2024-05-01']);
      }
    }
    console.log('  ✓ Created payment records for all units and services');

    // Create sample news
    console.log('📰 Creating news...');
    const newsItems = [
      {
        title: 'Welcome to the 2024-2025 Season!',
        content: 'We are excited to welcome all residents to the new season. Please ensure all fees are paid by the due date.',
        type: 'news',
        priority: 'normal'
      },
      {
        title: 'Pool Maintenance Schedule',
        content: 'The pool will be closed for maintenance every Tuesday from 6 AM to 10 AM.',
        type: 'maintenance',
        priority: 'high'
      },
      {
        title: 'Beach Safety Alert',
        content: 'Due to strong currents, swimming is not recommended today. Please exercise caution.',
        type: 'alert',
        priority: 'urgent'
      },
      {
        title: 'Summer Festival Event',
        content: 'Join us for our annual summer festival on July 15th at the compound beach area.',
        type: 'event',
        priority: 'normal'
      }
    ];

    for (const news of newsItems) {
      await db.run(`
        INSERT INTO news (compound_id, title, content, type, priority, created_by_user_id) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [compoundId, news.title, news.content, news.type, news.priority, managerResult.id]);
    }
    console.log(`  ✓ Created ${newsItems.length} news items`);

    // Create sample QR codes
    console.log('📱 Creating QR codes...');
    const qrCodes = [];
    
    // Create owner QR codes for each assigned unit
    for (const unit of assignedUnits) {
      // Gate access QR
      const gateQRData = `gate_${unit.unitId}_${Date.now()}`;
      const gateQRHash = crypto.createHash('sha256').update(gateQRData).digest('hex');
      
      await db.run(`
        INSERT INTO qr_codes (user_id, unit_id, compound_id, type, code_data, code_hash, valid_from, valid_to) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [unit.ownerId, unit.unitId, compoundId, 'owner_gate', gateQRData, gateQRHash, 
          '2024-04-01 00:00:00', '2025-03-31 23:59:59']);

      // Pool access QR
      const poolQRData = `pool_${unit.unitId}_${Date.now() + 1}`;
      const poolQRHash = crypto.createHash('sha256').update(poolQRData).digest('hex');
      
      await db.run(`
        INSERT INTO qr_codes (user_id, unit_id, compound_id, type, code_data, code_hash, valid_from, valid_to) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [unit.ownerId, unit.unitId, compoundId, 'owner_pool', poolQRData, poolQRHash, 
          '2024-04-01 00:00:00', '2025-03-31 23:59:59']);

      // Sample visitor QR codes
      const visitorQRData = `visitor_${unit.unitId}_${Date.now() + 2}`;
      const visitorQRHash = crypto.createHash('sha256').update(visitorQRData).digest('hex');
      
      await db.run(`
        INSERT INTO qr_codes (user_id, unit_id, compound_id, type, code_data, code_hash, visitor_name, num_persons, valid_from, valid_to) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [unit.ownerId, unit.unitId, compoundId, 'visitor', visitorQRData, visitorQRHash, 
          'John Visitor', 2, new Date().toISOString(), 
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()]);
    }
    console.log('  ✓ Created QR codes for all assigned units');

    // Create sample settings
    console.log('⚙️  Creating settings...');
    const settings = [
      { key: 'compound_name', value: 'Seaside Compound', type: 'string', description: 'Compound name' },
      { key: 'compound_timezone', value: 'UTC', type: 'string', description: 'Compound timezone' },
      { key: 'qr_code_expiry_hours', value: '24', type: 'number', description: 'Default QR code expiry in hours' },
      { key: 'visitor_qr_max_duration', value: '168', type: 'number', description: 'Maximum visitor QR duration in hours' },
      { key: 'enable_notifications', value: '1', type: 'boolean', description: 'Enable push notifications' },
      { key: 'enable_email_alerts', value: '1', type: 'boolean', description: 'Enable email alerts' },
      { key: 'max_visitors_per_qr', value: '5', type: 'number', description: 'Maximum visitors per QR code' }
    ];

    for (const setting of settings) {
      await db.run(`
        INSERT INTO settings (compound_id, setting_key, setting_value, setting_type, description) 
        VALUES (?, ?, ?, ?, ?)
      `, [compoundId, setting.key, setting.value, setting.type, setting.description]);
    }
    console.log(`  ✓ Created ${settings.length} default settings`);

    // Create sample feedback
    console.log('💬 Creating feedback...');
    const feedbackItems = [
      {
        userId: owner1Result.id,
        type: 'feature_request',
        category: 'app',
        title: 'Add dark mode support',
        description: 'It would be great to have a dark mode option in the mobile app.',
        priority: 'medium'
      },
      {
        userId: owner2Result.id,
        type: 'bug',
        category: 'qr_codes',
        title: 'QR code not scanning properly',
        description: 'Sometimes the QR code scanner fails to read the code on the first try.',
        priority: 'high'
      }
    ];

    for (const feedback of feedbackItems) {
      await db.run(`
        INSERT INTO feedback (user_id, compound_id, type, category, title, description, priority) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [feedback.userId, compoundId, feedback.type, feedback.category, 
          feedback.title, feedback.description, feedback.priority]);
    }
    console.log(`  ✓ Created ${feedbackItems.length} feedback items`);

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Sample Login Credentials:');
    console.log('  Super Admin: superadmin@compoundconnect.com / password123');
    console.log('  Manager: manager@seaside.com / password123');
    console.log('  Owner 1: ahmed@example.com / password123');
    console.log('  Owner 2: sarah@example.com / password123');
    console.log('  Security: security@seaside.com / password123');
    console.log('\n🏠 Sample Data Created:');
    console.log(`  - 1 Compound (Seaside Compound)`);
    console.log(`  - 1 Active Season (2024-2025)`);
    console.log(`  - ${services.length} Services`);
    console.log(`  - ${units.length} Units (3 assigned, 2 unassigned)`);
    console.log(`  - 6 Users (various roles)`);
    console.log(`  - Payment records for all services`);
    console.log(`  - ${newsItems.length} News items`);
    console.log(`  - QR codes for all assigned units`);
    console.log(`  - ${settings.length} Default settings`);
    console.log(`  - ${feedbackItems.length} Feedback items`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
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
    console.log('⚠️  Reset flag detected - this will clear all existing data!');
  }
  
  seedData(shouldReset)
    .then(() => {
      console.log('🎉 Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedData, clearData };