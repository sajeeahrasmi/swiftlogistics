const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, getProfile, refreshToken, logout } = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../controllers/authMiddleware');

const router = express.Router();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit refresh token requests
  message: {
    success: false,
    message: 'Too many refresh token requests, please try again later'
  }
});

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh-token', refreshLimiter, refreshToken);

// Protected routes
router.get('/me', authenticateToken, getProfile);
router.post('/logout', authenticateToken, logout);

// Admin only routes
router.get('/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  // This would be implemented later for user management
  res.json({
    success: true,
    message: 'Admin user management endpoint - to be implemented'
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;