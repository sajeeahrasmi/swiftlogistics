const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('../database/connection');
const { 
  getOrdersOverview,
  getOrderQueue,
  bulkAssignOrders,
  getPerformanceAnalytics,
  emergencyReassignOrder
} = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs for admin operations
  message: {
    success: false,
    message: 'Too many admin requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const strictAdminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Stricter limit for bulk operations
  message: {
    success: false,
    message: 'Too many bulk operation requests, please try again later'
  }
});

// All routes require authentication and admin/dispatcher role
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'dispatcher'));

// Dashboard and overview routes
router.get('/dashboard/overview', adminLimiter, getOrdersOverview);
router.get('/orders/queue', adminLimiter, getOrderQueue);
router.get('/analytics/performance', adminLimiter, getPerformanceAnalytics);

// Order management routes
router.post('/orders/bulk-assign', strictAdminLimiter, bulkAssignOrders);
router.post('/orders/:orderId/emergency-reassign', adminLimiter, emergencyReassignOrder);

// Assignment management routes
router.get('/assignments', adminLimiter, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        oa.id,
        oa.order_id,
        oa.driver_id,
        oa.status,
        oa.assigned_at,
        oa.completed_at,
        CONCAT(u.first_name, ' ', u.last_name) as driver_name,
        CONCAT(uc.first_name, ' ', uc.last_name) as client_name,
        o.tracking_number
      FROM order_assignments oa
      LEFT JOIN drivers d ON oa.driver_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN orders o ON oa.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN users uc ON c.user_id = uc.id
      ORDER BY oa.assigned_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: {
        assignments: result.rows
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    });
  }
});

// Client management routes
router.get('/clients', adminLimiter, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        COUNT(o.id) as total_orders
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN orders o ON c.id = o.client_id
      GROUP BY c.id, u.first_name, u.last_name, u.email, u.phone
      ORDER BY total_orders DESC
    `);

    res.json({
      success: true,
      data: {
        clients: result.rows
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients'
    });
  }
});

// Additional admin-only routes
router.get('/reports/daily', adminLimiter, async (req, res) => {
  // This would generate daily reports
  res.json({
    success: true,
    message: 'Daily reports endpoint - to be implemented',
    data: {}
  });
});

router.get('/system/health', adminLimiter, async (req, res) => {
  // System health check for admin
  const { query } = require('../database/connection');
  
  try {
    // Check database connectivity
    await query('SELECT 1');
    
    // Get system metrics
    const orderCounts = await query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_orders
      FROM orders
    `);

    const driverCounts = await query(`
      SELECT 
        COUNT(*) as total_drivers,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_drivers,
        COUNT(CASE WHEN status = 'busy' THEN 1 END) as busy_drivers,
        COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline_drivers
      FROM drivers 
      WHERE is_active = true
    `);

    res.json({
      success: true,
      data: {
        database: 'healthy',
        orders: orderCounts.rows[0],
        drivers: driverCounts.rows[0],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'System health check failed',
      error: error.message
    });
  }
});

// Configuration management
router.get('/config/system', adminLimiter, async (req, res) => {
  // System configuration endpoint
  res.json({
    success: true,
    data: {
      max_drivers_per_order: 1,
      auto_assignment_enabled: false,
      emergency_contact: process.env.ADMIN_EMERGENCY_CONTACT || 'admin@swiftlogistics.com',
      system_maintenance_mode: false,
      supported_vehicle_types: ['motorcycle', 'van', 'truck', 'bicycle'],
      max_order_age_hours_before_alert: 2,
      max_delivery_time_hours: 24
    }
  });
});

// Emergency controls
router.post('/emergency/pause-system', strictAdminLimiter, async (req, res) => {
  // Emergency pause system endpoint
  res.json({
    success: true,
    message: 'Emergency pause system endpoint - to be implemented',
    data: {
      system_paused: false,
      timestamp: new Date().toISOString()
    }
  });
});

// Health check endpoint
router.get('/health/admin', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes are healthy',
    timestamp: new Date().toISOString(),
    service: 'order-service'
  });
});

module.exports = router;
