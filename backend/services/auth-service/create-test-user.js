const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'swiftlogistics',
  password: '123456789',
  port: 5432,
});

async function createTestUser() {
  try {
    const email = 'testclient@example.com';
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    let userId;
    if (existingUser.rows.length > 0) {
      // Update existing user
      const result = await pool.query(
        'UPDATE users SET password_hash = $1, first_name = $2, last_name = $3, role = $4, is_active = $5 WHERE email = $6 RETURNING id, email, first_name, last_name, role',
        [hashedPassword, 'Test', 'Client', 'client', true, email]
      );
      console.log('Test user updated:', result.rows[0]);
      userId = result.rows[0].id;
    } else {
      // Create new user
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role',
        [email, hashedPassword, 'Test', 'Client', 'client', true]
      );
      console.log('Test user created:', result.rows[0]);
      userId = result.rows[0].id;
    }
    
    // Create client record for this user
    const existingClient = await pool.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
    
    if (existingClient.rows.length === 0) {
      const clientResult = await pool.query(
        `INSERT INTO clients (
          company_name, contact_email, contact_phone, contact_person,
          address_line1, city, postal_code, country, industry, user_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          'Test Company Ltd',
          'testclient@example.com',
          '+94123456789',
          'Test Client',
          '123 Test Street',
          'Colombo',
          '00100',
          'Sri Lanka',
          'Testing',
          userId,
          userId
        ]
      );
      console.log('Client record created with ID:', clientResult.rows[0].id);
    } else {
      console.log('Client record already exists with ID:', existingClient.rows[0].id);
    }
    
    // Create some sample orders
    const clientRecord = await pool.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
    const clientId = clientRecord.rows[0].id;
    
    // Check if sample orders exist
    const existingOrders = await pool.query('SELECT COUNT(*) FROM orders WHERE client_id = $1', [clientId]);
    
    if (parseInt(existingOrders.rows[0].count) === 0) {
      // Create sample orders
      const order1 = await pool.query(
        `INSERT INTO orders (
          client_id, tracking_number, status, priority,
          pickup_address, delivery_address, recipient_name, recipient_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          clientId,
          'TRK-TEST-001',
          'processing',
          'medium',
          '123 Test Pickup Street',
          '456 Test Delivery Avenue',
          'John Doe',
          '+94987654321'
        ]
      );
      
      const order2 = await pool.query(
        `INSERT INTO orders (
          client_id, tracking_number, status, priority,
          pickup_address, delivery_address, recipient_name, recipient_phone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          clientId,
          'TRK-TEST-002',
          'delivered',
          'high',
          '789 Another Pickup St',
          '321 Final Destination Rd',
          'Jane Smith',
          '+94555666777'
        ]
      );
      
      // Add order items
      await pool.query(
        `INSERT INTO order_items (order_id, description, quantity, weight_kg, value)
         VALUES ($1, $2, $3, $4, $5)`,
        [order1.rows[0].id, 'Test Package 1', 2, 1.5, 5000.00]
      );
      
      await pool.query(
        `INSERT INTO order_items (order_id, description, quantity, weight_kg, value)
         VALUES ($1, $2, $3, $4, $5)`,
        [order2.rows[0].id, 'Test Package 2', 1, 3.0, 12000.00]
      );
      
      console.log('Sample orders created');
    } else {
      console.log('Sample orders already exist');
    }
    
    console.log('\n=== TEST CLIENT LOGIN CREDENTIALS ===');
    console.log('Email: testclient@example.com');
    console.log('Password: test123');
    console.log('====================================\n');
    
  } catch (error) {
    console.error('Error creating test user:', error.message);
  } finally {
    await pool.end();
  }
}

createTestUser();