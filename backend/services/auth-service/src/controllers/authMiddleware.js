const jwt = require('jsonwebtoken');
const { query, logger } = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if session exists and is valid
    const sessionResult = await query(
      'SELECT us.user_id, u.email, u.role, u.is_active FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE us.token = $1 AND us.expires_at > NOW()',
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const session = sessionResult.rows[0];

    // Check if user is active
    if (!session.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add user info to request
    req.user = {
      userId: session.user_id,
      email: session.email,
      role: session.role
    };

    next();

  } catch (error) {
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

    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Role-based authorization
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();

    } catch (error) {
      logger.error('Authorization middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Permission-based authorization
const authorizePermissions = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user role permissions
      const roleResult = await query(
        'SELECT permissions FROM user_roles WHERE name = $1',
        [req.user.role]
      );

      if (roleResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Role not found'
        });
      }

      const userPermissions = roleResult.rows[0].permissions;

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();

    } catch (error) {
      logger.error('Permission authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Optional authentication (for endpoints that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No auth provided, continue without user info
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if session exists and is valid
      const sessionResult = await query(
        'SELECT us.user_id, u.email, u.role, u.is_active FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE us.token = $1 AND us.expires_at > NOW()',
        [token]
      );

      if (sessionResult.rows.length > 0 && sessionResult.rows[0].is_active) {
        const session = sessionResult.rows[0];
        req.user = {
          userId: session.user_id,
          email: session.email,
          role: session.role
        };
      }
    } catch (tokenError) {
      // Invalid token, but continue without auth
      logger.warn('Invalid token in optional auth:', tokenError.message);
    }

    next();

  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizePermissions,
  optionalAuth
};