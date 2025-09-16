const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'swiftlogistics',
  password: 'MWSucks12',
  port: 5432,
});

async function createAdminUser() {
  try {
    const email = 'admin@swiftlogistics.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    let result;
    if (existingUser.rows.length > 0) {
      // Update existing user
      result = await pool.query(
        'UPDATE users SET password_hash = $1, first_name = $2, last_name = $3, role = $4, is_active = $5 WHERE email = $6 RETURNING id, email, first_name, last_name, role',
        [hashedPassword, 'Admin', 'User', 'admin', true, email]
      );
      console.log('Admin user updated:', result.rows[0]);
    } else {
      // Create new user
      result = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role',
        [email, hashedPassword, 'Admin', 'User', 'admin', true]
      );
      console.log('Admin user created:', result.rows[0]);
    }
    
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Email: admin@swiftlogistics.com');
    console.log('Password: admin123');
    console.log('========================\n');
    
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminUser();
