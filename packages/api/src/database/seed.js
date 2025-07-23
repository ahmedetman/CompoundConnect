const bcrypt = require('bcrypt');
const db = require('./connection');

const seedData = async () => {
  try {
    // Create a sample compound
    const compoundResult = await db.run(`
      INSERT INTO compounds (name, logo_url) 
      VALUES (?, ?)
    `, ['Seaside Compound', '/uploads/logos/seaside-logo.png']);
    
    const compoundId = compoundResult.id;

    // Create a sample season
    const seasonResult = await db.run(`
      INSERT INTO seasons (compound_id, name, start_date, end_date, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `, [compoundId, '2024-2025', '2024-04-01', '2025-03-31', 1]);
    
    const seasonId = seasonResult.id;

    // Create sample services
    const services = [
      { name: 'Annual Maintenance', description: 'Annual compound maintenance fee', price: 1000.00 },
      { name: 'Pool Access', description: 'Swimming pool access fee', price: 500.00 },
      { name: 'Kids Area Access', description: 'Children playground access fee', price: 200.00 },
      { name: 'Beach Access', description: 'Private beach access fee', price: 300.00 }
    ];

    const serviceIds = [];
    for (const service of services) {
      const result = await db.run(`
        INSERT INTO services (compound_id, name, description, price) 
        VALUES (?, ?, ?, ?)
      `, [compoundId, service.name, service.description, service.price]);
      serviceIds.push(result.id);
    }

    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Super Admin
    const superAdminResult = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `, [compoundId, 'Super Admin', 'superadmin@compoundconnect.com', hashedPassword, 'super_admin']);

    // Compound Manager
    const managerResult = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `, [compoundId, 'John Manager', 'manager@seaside.com', hashedPassword, 'management']);

    // Sample Unit Owners
    const owner1Result = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `, [compoundId, 'Ahmed Al-Rashid', 'ahmed@example.com', hashedPassword, 'owner']);

    const owner2Result = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `, [compoundId, 'Sarah Johnson', 'sarah@example.com', hashedPassword, 'owner']);

    // Security Personnel
    const securityResult = await db.run(`
      INSERT INTO users (compound_id, name, email, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `, [compoundId, 'Security Guard', 'security@seaside.com', hashedPassword, 'security']);

    // Create sample units
    const unit1Result = await db.run(`
      INSERT INTO units (compound_id, unit_number) 
      VALUES (?, ?)
    `, [compoundId, 'A-101']);

    const unit2Result = await db.run(`
      INSERT INTO units (compound_id, unit_number) 
      VALUES (?, ?)
    `, [compoundId, 'B-205']);

    const unit3Result = await db.run(`
      INSERT INTO units (compound_id, unit_number) 
      VALUES (?, ?)
    `, [compoundId, 'C-301']);

    // Assign owners to units
    await db.run(`
      INSERT INTO unit_users (unit_id, user_id, relationship) 
      VALUES (?, ?, ?)
    `, [unit1Result.id, owner1Result.id, 'owner']);

    await db.run(`
      INSERT INTO unit_users (unit_id, user_id, relationship) 
      VALUES (?, ?, ?)
    `, [unit2Result.id, owner2Result.id, 'owner']);

    // Create sample payments (some paid, some due)
    const units = [unit1Result.id, unit2Result.id, unit3Result.id];
    
    for (let i = 0; i < units.length; i++) {
      for (let j = 0; j < serviceIds.length; j++) {
        const isPaid = Math.random() > 0.3; // 70% chance of being paid
        const status = isPaid ? 'paid' : 'due';
        const paidDate = isPaid ? new Date().toISOString() : null;
        
        await db.run(`
          INSERT INTO payments (unit_id, service_id, season_id, status, amount, paid_on_date, due_date) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          units[i], 
          serviceIds[j], 
          seasonId, 
          status, 
          services[j].price,
          paidDate,
          '2024-05-01'
        ]);
      }
    }

    // Create sample news
    await db.run(`
      INSERT INTO news (compound_id, title, content, type, priority, created_by_user_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      compoundId,
      'Welcome to the New Season!',
      'We are excited to welcome everyone back for the 2024-2025 season. Please ensure all fees are paid to access facilities.',
      'news',
      'normal',
      managerResult.id
    ]);

    await db.run(`
      INSERT INTO news (compound_id, title, content, type, priority, created_by_user_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      compoundId,
      'Pool Maintenance Notice',
      'The main pool will be closed for maintenance on March 15th from 8 AM to 2 PM.',
      'maintenance',
      'high',
      managerResult.id
    ]);

    console.log('Sample data seeded successfully');
    console.log('Login credentials:');
    console.log('Super Admin: superadmin@compoundconnect.com / password123');
    console.log('Manager: manager@seaside.com / password123');
    console.log('Owner 1: ahmed@example.com / password123');
    console.log('Owner 2: sarah@example.com / password123');
    console.log('Security: security@seaside.com / password123');

  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
};

const seed = async () => {
  try {
    await db.connect();
    await seedData();
    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seed();
}

module.exports = { seedData, seed };