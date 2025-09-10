const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { query, transaction, logger } = require('../database/connection');
const { publishEvent } = require('../kafka/producer');

// Validation schemas
const createDriverSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
  driver_license: Joi.string().min(3).max(50).required(),
  license_expiry: Joi.date().min('now').required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
  emergency_contact_name: Joi.string().min(2).max(100).optional(),
  emergency_contact_phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  vehicle_type: Joi.string().valid('motorcycle', 'van', 'truck', 'bicycle').default('van'),
  vehicle_plate: Joi.string().min(3).max(20).required(),
  vehicle_model: Joi.string().max(100).optional(),
  vehicle_capacity_kg: Joi.number().positive().max(10000).default(100),
  shift_start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  shift_end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  working_days: Joi.array().items(
    Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ).default(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
});

const updateDriverStatusSchema = Joi.object({
  status: Joi.string().valid('available', 'busy', 'offline', 'on_break', 'suspended').required(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional()
});

const assignOrderSchema = Joi.object({
  driver_id: Joi.number().integer().positive().required(),
  estimated_pickup_time: Joi.date().iso().min('now').optional(),
  estimated_delivery_time: Joi.date().iso().min('now').optional(),
  assignment_notes: Joi.string().max(1000).optional()
});

// Comprehensive driver creation schema (for admin)
const createDriverComprehensiveSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
  password: Joi.string().min(6).required(),
  license_number: Joi.string().min(3).max(50).required(),
  license_expiry_date: Joi.date().min('now').required(),
  vehicle_type: Joi.string().valid('motorcycle', 'van', 'truck', 'bicycle').required(),
  vehicle_plate: Joi.string().min(3).max(20).required(),
  vehicle_capacity_kg: Joi.number().positive().max(10000).required(),
  emergency_contact: Joi.string().max(100).optional()
});

// Create new driver
const createDriver = async (req, res) => {
  try {
    // Validate input
    const { error, value } = createDriverSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const {
      user_id, driver_license, license_expiry, phone, emergency_contact_name,
      emergency_contact_phone, vehicle_type, vehicle_plate, vehicle_model,
      vehicle_capacity_kg, shift_start, shift_end, working_days
    } = value;

    // Check if user exists and has driver role
    const userResult = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (userResult.rows[0].role !== 'driver') {
      return res.status(400).json({
        success: false,
        message: 'User must have driver role'
      });
    }

    // Check if driver already exists
    const existingDriver = await query(
      'SELECT id FROM drivers WHERE user_id = $1 OR driver_license = $2',
      [user_id, driver_license]
    );

    if (existingDriver.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Driver already exists with this user ID or license'
      });
    }

    // Create driver
    const result = await query(
      `INSERT INTO drivers 
       (user_id, driver_license, license_expiry, phone, emergency_contact_name, 
        emergency_contact_phone, vehicle_type, vehicle_plate, vehicle_model, 
        vehicle_capacity_kg, shift_start, shift_end, working_days) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
       RETURNING *`,
      [
        user_id, driver_license, license_expiry, phone, emergency_contact_name,
        emergency_contact_phone, vehicle_type, vehicle_plate, vehicle_model,
        vehicle_capacity_kg, shift_start, shift_end, JSON.stringify(working_days)
      ]
    );

    // Publish driver created event
    try {
      await publishEvent('driver-events', {
        type: 'DRIVER_CREATED',
        driverId: result.rows[0].id,
        userId: user_id,
        timestamp: new Date().toISOString()
      });
    } catch (eventError) {
      logger.error('Failed to publish DRIVER_CREATED event:', eventError);
    }

    res.status(201).json({
      success: true,
      message: 'Driver created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Create driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create driver'
    });
  }
};

// Create driver with user account (comprehensive - for admin)
const createDriverComprehensive = async (req, res) => {
  try {
    // Validate input
    const { error, value } = createDriverComprehensiveSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const {
      first_name, last_name, email, phone, password,
      license_number, license_expiry_date, vehicle_type,
      vehicle_plate, vehicle_capacity_kg, emergency_contact
    } = value;

    // Use transaction to ensure data consistency
    const result = await transaction(async (client) => {
      // Check if email already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Email already exists');
      }

      // Check if license number already exists
      const existingLicense = await client.query(
        'SELECT id FROM drivers WHERE driver_license = $1',
        [license_number]
      );

      if (existingLicense.rows.length > 0) {
        throw new Error('License number already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user account
      const userResult = await client.query(
        `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_active) 
         VALUES ($1, $2, $3, $4, $5, 'driver', true) 
         RETURNING id`,
        [first_name, last_name, email, phone, hashedPassword]
      );

      const userId = userResult.rows[0].id;

      // Create driver profile
      const driverResult = await client.query(
        `INSERT INTO drivers 
         (user_id, driver_license, license_expiry, phone, emergency_contact_name, 
          vehicle_type, vehicle_plate, vehicle_capacity_kg, status, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available', true) 
         RETURNING *`,
        [
          userId, license_number, license_expiry_date, phone, emergency_contact,
          vehicle_type, vehicle_plate, vehicle_capacity_kg
        ]
      );

      return {
        driver: driverResult.rows[0],
        userId,
        userInfo: { first_name, last_name, email }
      };
    });

    const { driver, userId, userInfo } = result;

    // Publish driver created event
    try {
      await publishEvent('driver-events', {
        type: 'DRIVER_CREATED',
        driverId: driver.id,
        userId: userId,
        timestamp: new Date().toISOString()
      });
    } catch (eventError) {
      logger.error('Failed to publish DRIVER_CREATED event:', eventError);
    }

    // Return response with user and driver info
    res.status(201).json({
      success: true,
      message: 'Driver created successfully',
      data: {
        ...driver,
        ...userInfo
      }
    });

  } catch (error) {
    if (error.message === 'Email already exists' || error.message === 'License number already exists') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    logger.error('Create driver comprehensive error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create driver',
      error: error.message
    });
  }
};

// Get all drivers with filtering
const getDrivers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      vehicle_type,
      available_only = false 
    } = req.query;

    let queryText = `
      SELECT d.*, u.first_name, u.last_name, u.email,
      COUNT(*) OVER() as total_count
      FROM drivers d 
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.is_active = true
    `;
    let queryParams = [];
    let paramCount = 0;

    if (status) {
      queryText += ` AND d.status = $${++paramCount}`;
      queryParams.push(status);
    }

    if (vehicle_type) {
      queryText += ` AND d.vehicle_type = $${++paramCount}`;
      queryParams.push(vehicle_type);
    }

    if (available_only === 'true') {
      queryText += ` AND d.status = 'available'`;
    }

    // Add pagination
    const offset = (page - 1) * limit;
    queryText += `
      ORDER BY d.created_at DESC 
      LIMIT $${++paramCount} 
      OFFSET $${++paramCount}
    `;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        drivers: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: Math.ceil((result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0) / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve drivers'
    });
  }
};

// Get driver by ID
const getDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT d.*, u.first_name, u.last_name, u.email 
       FROM drivers d 
       LEFT JOIN users u ON d.user_id = u.id 
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Get recent assignments
    const assignmentsResult = await query(
      `SELECT oa.*, o.tracking_number, o.status as order_status 
       FROM order_assignments oa 
       LEFT JOIN orders o ON oa.order_id = o.id 
       WHERE oa.driver_id = $1 
       ORDER BY oa.assigned_at DESC 
       LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      data: {
        driver: result.rows[0],
        recent_assignments: assignmentsResult.rows
      }
    });

  } catch (error) {
    logger.error('Get driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve driver'
    });
  }
};

// Update driver status and location
const updateDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate input
    const { error, value } = updateDriverStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { status, latitude, longitude } = value;

    // Check if driver exists
    const driverResult = await query('SELECT * FROM drivers WHERE id = $1', [id]);
    if (driverResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Update driver status and location
    let updateQuery = 'UPDATE drivers SET status = $1, updated_at = NOW()';
    let updateParams = [status];

    if (latitude && longitude) {
      updateQuery += ', current_latitude = $2, current_longitude = $3, last_location_update = NOW()';
      updateParams.push(latitude, longitude);
      
      // Log location to history
      await query(
        'INSERT INTO driver_location_history (driver_id, latitude, longitude) VALUES ($1, $2, $3)',
        [id, latitude, longitude]
      );
    }

    updateQuery += ' WHERE id = $' + (updateParams.length + 1) + ' RETURNING *';
    updateParams.push(id);

    const result = await query(updateQuery, updateParams);

    // Publish status update event
    try {
      await publishEvent('driver-events', {
        type: 'DRIVER_STATUS_UPDATED',
        driverId: id,
        oldStatus: driverResult.rows[0].status,
        newStatus: status,
        location: latitude && longitude ? { latitude, longitude } : null,
        timestamp: new Date().toISOString()
      });
    } catch (eventError) {
      logger.error('Failed to publish DRIVER_STATUS_UPDATED event:', eventError);
    }

    res.json({
      success: true,
      message: 'Driver status updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Update driver status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver status'
    });
  }
};

// Assign order to driver
const assignOrderToDriver = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Validate input
    const { error, value } = assignOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { driver_id, estimated_pickup_time, estimated_delivery_time, assignment_notes } = value;

    // Check if order exists and is in a state that can be assigned
    const orderResult = await query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];
    const assignableStatuses = ['pending', 'processing', 'pickup_scheduled'];
    
    if (!assignableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be assigned in status: ${order.status}`
      });
    }

    // Check if order is already assigned
    const existingAssignment = await query(
      'SELECT id FROM order_assignments WHERE order_id = $1',
      [orderId]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Order is already assigned to a driver'
      });
    }

    // Check if driver exists and is available
    const driverResult = await query(
      'SELECT * FROM drivers WHERE id = $1 AND is_active = true',
      [driver_id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found or inactive'
      });
    }

    const driver = driverResult.rows[0];
    
    if (driver.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `Driver is not available (current status: ${driver.status})`
      });
    }

    // Create assignment and update order status in transaction
    const result = await transaction(async (client) => {
      // Create assignment
      const assignmentResult = await client.query(
        `INSERT INTO order_assignments 
         (order_id, driver_id, assigned_by, estimated_pickup_time, estimated_delivery_time, assignment_notes) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [orderId, driver_id, req.user.userId, estimated_pickup_time, estimated_delivery_time, assignment_notes]
      );

      // Update order status
      await client.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        ['pickup_scheduled', orderId]
      );

      // Update driver status to busy
      await client.query(
        'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
        ['busy', driver_id]
      );

      // Add to order status history
      await client.query(
        `INSERT INTO order_status_history 
         (order_id, status, notes, actor_id, actor_type) 
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, 'pickup_scheduled', `Assigned to driver ${driver_id}`, req.user.userId, req.user.role]
      );

      return assignmentResult.rows[0];
    });

    // Publish assignment event
    try {
      await publishEvent('order-events', {
        type: 'ORDER_ASSIGNED_TO_DRIVER',
        orderId: orderId,
        driverId: driver_id,
        assignedBy: req.user.userId,
        estimatedPickupTime: estimated_pickup_time,
        estimatedDeliveryTime: estimated_delivery_time,
        timestamp: new Date().toISOString()
      });
    } catch (eventError) {
      logger.error('Failed to publish ORDER_ASSIGNED_TO_DRIVER event:', eventError);
    }

    res.status(201).json({
      success: true,
      message: 'Order assigned to driver successfully',
      data: result
    });

  } catch (error) {
    logger.error('Assign order to driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign order to driver'
    });
  }
};

// Get available drivers for order assignment
const getAvailableDrivers = async (req, res) => {
  try {
    const { 
      vehicle_type,
      min_capacity,
      max_distance_km = 50 
    } = req.query;

    let queryText = `
      SELECT d.*, u.first_name, u.last_name, u.email,
      COUNT(oa.id) as active_orders
      FROM drivers d 
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN order_assignments oa ON d.id = oa.driver_id 
        AND oa.status IN ('pending', 'accepted') 
        AND oa.completed_at IS NULL
      WHERE d.is_active = true 
        AND d.status = 'available'
    `;
    let queryParams = [];
    let paramCount = 0;

    if (vehicle_type) {
      queryText += ` AND d.vehicle_type = $${++paramCount}`;
      queryParams.push(vehicle_type);
    }

    if (min_capacity) {
      queryText += ` AND d.vehicle_capacity_kg >= $${++paramCount}`;
      queryParams.push(min_capacity);
    }

    // TODO: Add distance calculation based on current location when needed
    // For now, we'll just return all available drivers

    queryText += `
      GROUP BY d.id, u.first_name, u.last_name, u.email
      ORDER BY active_orders ASC, d.rating DESC, d.total_deliveries DESC
      LIMIT 20
    `;

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        available_drivers: result.rows
      }
    });

  } catch (error) {
    logger.error('Get available drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available drivers'
    });
  }
};

module.exports = {
  createDriver,
  createDriverComprehensive,
  getDrivers,
  getDriver,
  updateDriverStatus,
  assignOrderToDriver,
  getAvailableDrivers
};
