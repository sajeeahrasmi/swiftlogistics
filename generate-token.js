// Generate JWT token for admin user
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_super_secret_jwt_key_here_change_in_production'; // Same as in .env

const payload = {
  userId: 2, // The admin user ID we just created
  email: 'admin@swiftlogistics.com',
  role: 'admin'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('Admin JWT Token:');
console.log(token);
console.log('\nUse this token in the Authorization header as: Bearer ' + token);
