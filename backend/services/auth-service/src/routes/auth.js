const express = require('express');
const rateLimit = require('express-rate-limit');
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  changePassword, 
  refreshToken, 
  logout, 
  logoutAll, 
  verifyToken 
} = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../controllers/authMiddleware');

const router = express.Router();

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests in counting
  skipSuccessfulRequests: true
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit refresh token requests
  message: {
    success: false,
    message: 'Too many refresh token requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 500 : 50, // Much higher limit for development
  message: {
    success: false,
    message: 'Too many profile requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting entirely in development for profile endpoints
    return process.env.NODE_ENV === 'development';
  }
});

const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Very restrictive for password changes
  message: {
    success: false,
    message: 'Too many password change attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refreshLimiter, refreshToken);
router.post('/refresh-token', refreshLimiter, refreshToken); // Alternative endpoint name for compatibility

// Health check endpoint (no rate limiting)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Protected routes - Profile operations
router.get('/me', authenticateToken, profileLimiter, getProfile);
router.put('/me', authenticateToken, profileLimiter, updateProfile);
router.get('/profile', authenticateToken, profileLimiter, getProfile); // Alternative endpoint
router.put('/profile', authenticateToken, profileLimiter, updateProfile); // Alternative endpoint

// Protected routes - Authentication operations
router.post('/change-password', authenticateToken, passwordLimiter, changePassword);
router.post('/logout', authenticateToken, logout);
router.post('/logout-all', authenticateToken, logoutAll);
router.get('/verify', authenticateToken, verifyToken);
router.post('/verify', authenticateToken, verifyToken); // Support both GET and POST

// Admin only routes
router.get('/users', authenticateToken, authorizeRoles('admin'), profileLimiter, async (req, res) => {
  try {
    // This would be implemented later for user management
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Admin user management endpoint - to be implemented',
      data: {
        total_users: 0,
        active_users: 0,
        pending_users: 0
      }
    });
  } catch (error) {
    console.error('Admin users endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin route to get user statistics
router.get('/stats', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { query } = require('../database/connection');
    
    // Get user statistics
    const totalUsersResult = await query('SELECT COUNT(*) as total FROM users');
    const activeUsersResult = await query('SELECT COUNT(*) as active FROM users WHERE is_active = true');
    const usersByRoleResult = await query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      WHERE is_active = true 
      GROUP BY role
    `);
    
    // Get recent registrations (last 30 days)
    const recentRegistrationsResult = await query(`
      SELECT COUNT(*) as recent 
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    res.json({
      success: true,
      data: {
        total_users: parseInt(totalUsersResult.rows[0].total),
        active_users: parseInt(activeUsersResult.rows[0].active),
        recent_registrations: parseInt(recentRegistrationsResult.rows[0].recent),
        users_by_role: usersByRoleResult.rows.reduce((acc, row) => {
          acc[row.role] = parseInt(row.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Admin stats endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin route to manage user status
router.patch('/users/:userId/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;
    const { query } = require('../database/connection');

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be a boolean value'
      });
    }

    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, is_active',
      [is_active, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Admin user status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Route to check if user is authenticated (lightweight version of /me)
router.get('/check', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'User is authenticated',
    data: {
      user: {
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role
      }
    }
  });
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('Auth route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user?.email || 'anonymous'
  });

  // Rate limit errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      message: error.message || 'Too many requests'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Database errors
  if (error.code && error.code.startsWith('23')) { // PostgreSQL constraint violations
    return res.status(400).json({
      success: false,
      message: 'Database constraint violation'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler for auth routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Auth endpoint not found',
    available_endpoints: {
      public: [
        'POST /register',
        'POST /login',
        'POST /refresh',
        'GET /health'
      ],
      authenticated: [
        'GET /me',
        'PUT /me', 
        'POST /change-password',
        'POST /logout',
        'POST /logout-all',
        'GET /verify',
        'GET /check'
      ],
      admin: [
        'GET /users',
        'GET /stats',
        'PATCH /users/:userId/status'
      ]
    }
  });
});

module.exports = router;