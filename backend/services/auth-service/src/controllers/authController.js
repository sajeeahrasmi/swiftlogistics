const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, transaction, logger } = require('../database/connection');
const { publishEvent } = require('../kafka/producer');
const Joi = require('joi');

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  role: Joi.string().valid('client', 'driver', 'dispatcher', 'admin').default('client')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Generate tokens
const generateTokens = (userId, email, role) => {
  const payload = { userId, email, role };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  
  return { accessToken, refreshToken };
};

// Helper function to determine password column name
const getPasswordColumn = async () => {
  try {
    // Check if password_hash column exists
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('password', 'password_hash')
    `);
    
    const columns = result.rows.map(row => row.column_name);
    
    if (columns.includes('password_hash')) {
      return 'password_hash';
    } else if (columns.includes('password')) {
      return 'password';
    } else {
      throw new Error('No password column found in users table');
    }
  } catch (error) {
    logger.error('Error checking password column:', error);
    // Default to password_hash
    return 'password_hash';
  }
};

// Register new user
const register = async (req, res) => {
  try {
    logger.info('Registration attempt started', { email: req.body.email });

    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      logger.warn('Registration validation error:', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { email, password, first_name, last_name, phone, role } = value;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      logger.warn('Registration attempt with existing email:', email);
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get the correct password column name
    const passwordColumn = await getPasswordColumn();

    // Create user in transaction
    const result = await transaction(async (client) => {
      // Insert user with dynamic password column
      const userQuery = `
        INSERT INTO users (email, ${passwordColumn}, first_name, last_name, phone, role, is_active, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
        RETURNING id, email, first_name, last_name, role, created_at
      `;
      
      const userResult = await client.query(userQuery, [
        email.toLowerCase(), 
        hashedPassword, 
        first_name, 
        last_name, 
        phone, 
        role,
        true
      ]);

      const user = userResult.rows[0];

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await client.query(
        'INSERT INTO user_sessions (user_id, token, refresh_token, expires_at, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [user.id, accessToken, refreshToken, expiresAt]
      );

      return { user, accessToken, refreshToken };
    });

    // Publish user registration event (non-blocking)
    try {
      await publishEvent('user-events', {
        type: 'USER_REGISTERED',
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        timestamp: new Date().toISOString()
      });
    } catch (eventError) {
      logger.error('Failed to publish user registration event:', eventError);
    }

    logger.info(`User registered successfully: ${email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: result.accessToken, // For frontend compatibility
      user: {
        id: result.user.id,
        email: result.user.email,
        first_name: result.user.first_name,
        last_name: result.user.last_name,
        role: result.user.role
      },
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          role: result.user.role
        },
        tokens: {
          access_token: result.accessToken,
          refresh_token: result.refreshToken
        }
      }
    });

  } catch (error) {
    logger.error('Registration error:', {
      message: error.message,
      stack: error.stack,
      email: req.body.email
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    logger.info('Login attempt started', { email: req.body.email });

    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      logger.warn('Login validation error:', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { email, password } = value;

    // Get the correct password column name
    const passwordColumn = await getPasswordColumn();

    // Find user with dynamic password column
    const userQuery = `
      SELECT id, email, ${passwordColumn} as password_hash, first_name, last_name, role, is_active 
      FROM users 
      WHERE email = $1
    `;
    
    const userResult = await query(userQuery, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      logger.warn('Login attempt with non-existent email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      logger.warn('Login attempt with deactivated account:', email);
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    // Store session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    try {
      await query(
        'INSERT INTO user_sessions (user_id, token, refresh_token, expires_at, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [user.id, accessToken, refreshToken, expiresAt]
      );
    } catch (sessionError) {
      logger.error('Failed to create user session:', sessionError);
      // Continue without failing the login
    }

    // Update last login - disabled until last_login column is added to database
    // try {
    //   await query(
    //     'UPDATE users SET last_login = NOW() WHERE id = $1',
    //     [user.id]
    //   );
    // } catch (updateError) {
    //   logger.error('Failed to update last login:', updateError);
    //   // Continue without failing the login
    // }

    // Publish login event (non-blocking)
    try {
      await publishEvent('user-events', {
        type: 'USER_LOGIN',
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });
    } catch (eventError) {
      logger.error('Failed to publish login event:', eventError);
    }

    logger.info(`User logged in successfully: ${email}`);

    // Response format matching frontend expectations
    res.json({
      success: true,
      message: 'Login successful',
      token: accessToken, // Frontend expects this format
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      },
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken
        }
      }
    });

  } catch (error) {
    logger.error('Login error:', {
      message: error.message,
      stack: error.stack,
      email: req.body.email
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    console.log('=== GET PROFILE DEBUG START ===');
    console.log('User from middleware:', req.user);
    console.log('Headers:', req.headers);
    
    if (!req.user || !req.user.userId) {
      console.log('ERROR: No user data from middleware');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userId = req.user.userId;
    console.log('Looking up user with ID:', userId);

    const userResult = await query(
      'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    console.log('Database query result:', userResult.rows);

    if (userResult.rows.length === 0) {
      console.log('ERROR: User not found in database');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];
    console.log('User found:', user);

    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          role: user.role,
          created_at: user.created_at
        }
      }
    };

    console.log('Sending response:', response);
    console.log('=== GET PROFILE DEBUG END ===');

    res.json(response);

  } catch (error) {
    console.error('=== GET PROFILE ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('User ID attempted:', req.user?.userId);
    console.error('=== GET PROFILE ERROR END ===');
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Validate input
    const updateSchema = Joi.object({
      first_name: Joi.string().min(2).max(50).optional(),
      last_name: Joi.string().min(2).max(50).optional(),
      phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional().allow('')
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (value.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(value.first_name);
    }
    if (value.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(value.last_name);
    }
    if (value.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(value.phone || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(userId);
    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW() 
      WHERE id = $${paramIndex} 
      RETURNING id, email, first_name, last_name, phone, role
    `;

    const result = await query(updateQuery, values);
    const updatedUser = result.rows[0];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Validate input
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { currentPassword, newPassword } = value;

    // Get the correct password column name
    const passwordColumn = await getPasswordColumn();

    // Get current password hash
    const userResult = await query(
      `SELECT ${passwordColumn} as password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      `UPDATE users SET ${passwordColumn} = $1, updated_at = NOW() WHERE id = $2`,
      [newPasswordHash, userId]
    );

    // Invalidate all sessions except current one
    const currentToken = req.headers.authorization?.split(' ')[1];
    await query(
      'DELETE FROM user_sessions WHERE user_id = $1 AND token != $2',
      [userId, currentToken]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refresh_token, JWT_SECRET);
    const userId = decoded.userId;

    // Check if refresh token exists and is valid
    const sessionResult = await query(
      'SELECT user_id FROM user_sessions WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW()',
      [userId, refresh_token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Get user details
    const userResult = await query(
      'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.email, user.role);

    // Update session with new tokens
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'UPDATE user_sessions SET token = $1, refresh_token = $2, expires_at = $3 WHERE user_id = $4 AND refresh_token = $5',
      [accessToken, newRefreshToken, expiresAt, userId, refresh_token]
    );

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        tokens: {
          access_token: accessToken,
          refresh_token: newRefreshToken
        }
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    logger.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const token = req.headers.authorization?.split(' ')[1];

    // Remove session
    await query('DELETE FROM user_sessions WHERE user_id = $1 AND token = $2', [userId, token]);

    // Publish logout event
    try {
      await publishEvent('user-events', {
        type: 'USER_LOGOUT',
        userId: userId,
        timestamp: new Date().toISOString()
      });
    } catch (eventError) {
      logger.error('Failed to publish logout event:', eventError);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Logout from all devices
const logoutAll = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Remove all sessions for user
    await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

    // Publish logout event
    try {
      await publishEvent('user-events', {
        type: 'USER_LOGOUT_ALL',
        userId: userId,
        timestamp: new Date().toISOString()
      });
    } catch (eventError) {
      logger.error('Failed to publish logout all event:', eventError);
    }

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify token (for middleware or external validation)
const verifyToken = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userResult = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or inactive user'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    logger.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
  logoutAll,
  verifyToken
};