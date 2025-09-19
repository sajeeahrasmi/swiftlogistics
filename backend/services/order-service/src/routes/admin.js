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

// Get individual client details
router.get('/clients/:id', adminLimiter, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID'
      });
    }

    const result = await query(`
      SELECT 
        c.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        COUNT(o.id) as total_orders,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN o.status = 'in_transit' THEN 1 END) as in_transit_orders,
        MAX(o.created_at) as last_order_date
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN orders o ON c.id = o.client_id
      WHERE c.id = $1
      GROUP BY c.id, u.first_name, u.last_name, u.email, u.phone
    `, [clientId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: {
        client: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching client details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client details'
    });
  }
});

// Get individual assignment details
router.get('/assignments/:id', adminLimiter, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);
    
    if (isNaN(assignmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignment ID'
      });
    }

    const result = await query(`
      SELECT 
        oa.id,
        oa.order_id,
        oa.driver_id,
        oa.status,
        oa.assigned_at,
        oa.completed_at,
        oa.accepted_at,
        oa.started_at,
        oa.assignment_notes,
        oa.driver_notes,
        oa.admin_notes,
        oa.estimated_pickup_time,
        oa.estimated_delivery_time,
        oa.actual_pickup_time,
        oa.actual_delivery_time,
        -- Driver information
        CONCAT(ud.first_name, ' ', ud.last_name) as driver_name,
        ud.email as driver_email,
        ud.phone as driver_phone,
        d.driver_license,
        d.vehicle_type,
        d.vehicle_plate,
        d.vehicle_model,
        d.vehicle_capacity_kg,
        d.status as driver_status,
        -- Client information
        CONCAT(uc.first_name, ' ', uc.last_name) as client_name,
        uc.email as client_email,
        uc.phone as client_phone,
        c.company_name,
        -- Order information
        o.tracking_number,
        o.status as order_status,
        o.priority,
        o.pickup_address,
        o.delivery_address,
        o.recipient_name,
        o.recipient_phone,
        o.special_instructions,
        o.created_at as order_created_at,
        o.estimated_delivery_time as order_estimated_delivery
      FROM order_assignments oa
      LEFT JOIN drivers d ON oa.driver_id = d.id
      LEFT JOIN users ud ON d.user_id = ud.id
      LEFT JOIN orders o ON oa.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN users uc ON c.user_id = uc.id
      WHERE oa.id = $1
    `, [assignmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      data: {
        assignment: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment details'
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

// Admin tracking endpoint - Get all tracking data
router.get('/tracking/orders', adminLimiter, async (req, res) => {
  try {
    console.log('Admin tracking endpoint called');
    
    // Get tracking data from the tracking service
    const axios = require('axios');
    const trackingServiceUrl = process.env.TRACKING_SERVICE_URL || 'http://localhost:3003';
    
    try {
      const trackingResponse = await axios.get(`${trackingServiceUrl}/api/orders`);
      console.log('Tracking service response:', trackingResponse.data);
      
      if (trackingResponse.data && trackingResponse.data.success && trackingResponse.data.data) {
        // Enhance tracking data with client and driver information from the database
        const trackingOrders = trackingResponse.data.data;
        
        for (let order of trackingOrders) {
          // Try to get client information
          if (order.client_id) {
            try {
              const clientQuery = 'SELECT company_name FROM clients WHERE id = $1';
              const clientResult = await query(clientQuery, [order.client_id]);
              if (clientResult.rows.length > 0) {
                order.clientName = clientResult.rows[0].company_name;
              }
            } catch (err) {
              console.warn(`Could not fetch client info for order ${order.trackingNumber}:`, err.message);
              order.clientName = 'Unknown Client';
            }
          }
          
          // Try to get driver information from orders table
          try {
            const driverQuery = `
              SELECT d.first_name, d.last_name 
              FROM orders o 
              JOIN drivers d ON o.assigned_driver_id = d.id 
              WHERE o.tracking_number = $1
            `;
            const driverResult = await query(driverQuery, [order.trackingNumber]);
            if (driverResult.rows.length > 0) {
              const driver = driverResult.rows[0];
              order.driverName = `${driver.first_name} ${driver.last_name}`;
            } else {
              order.driverName = 'Unassigned';
            }
          } catch (err) {
            console.warn(`Could not fetch driver info for order ${order.trackingNumber}:`, err.message);
            order.driverName = 'Unknown Driver';
          }
        }
        
        res.json({
          success: true,
          data: trackingOrders,
          count: trackingOrders.length
        });
      } else {
        res.json({
          success: true,
          data: [],
          count: 0,
          message: 'No tracking data available'
        });
      }
    } catch (trackingError) {
      console.error('Error calling tracking service:', trackingError.message);
      
      // Fallback to mock data if tracking service is down
      const mockTrackingData = [
        {
          id: 1,
          trackingNumber: "TRK-728415",
          recipient: "Alice Johnson",
          address: "123 Galle Road, Colombo 03",
          status: "In Warehouse",
          lastUpdate: "2025-09-18 09:30 AM",
          estimatedDelivery: "2025-09-20",
          items: 3,
          currentLocation: "Colombo Main Warehouse",
          routeProgress: 20,
          client_id: 1,
          clientName: "Acme Corp",
          driverName: "John Silva"
        },
        {
          id: 2,
          trackingNumber: "TRK-728416",
          recipient: "Bob Williams",
          address: "45 Union Place, Colombo 02",
          status: "Processing",
          lastUpdate: "2025-09-18 11:15 AM",
          estimatedDelivery: "2025-09-19",
          items: 2,
          currentLocation: "Processing Center",
          routeProgress: 40,
          client_id: 1,
          clientName: "Beta Ltd",
          driverName: "Maria Perera"
        }
      ];
      
      res.json({
        success: true,
        data: mockTrackingData,
        count: mockTrackingData.length,
        message: 'Using fallback data - tracking service unavailable'
      });
    }
  } catch (error) {
    console.error('Admin tracking endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tracking data',
      error: error.message
    });
  }
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
