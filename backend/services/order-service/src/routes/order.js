const express = require('express');
const { query, logger } = require('../database/connection');
const db = require('../database/connection');
const { assignOrderToDriver } = require('../controllers/driverController');

const rateLimit = require('express-rate-limit');
const { 
  createOrder, 
  getOrder, 
  getOrders, 
  updateOrderStatus,
  getClientOrders,
  cancelOrder,
  retryOrderProcessing
} = require('../controllers/orderController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiting for order endpoints
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many order requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const strictOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Stricter limit for order creation
  message: {
    success: false,
    message: 'Too many order creation attempts, please try again later'
  }
});

// Public routes (with authentication)
router.use(authenticateToken); // All routes require authentication

// Order creation endpoint
router.post('/', strictOrderLimiter, authorizeRoles('client', 'admin'), createOrder);//working

// Order retrieval endpoints
router.get('/', orderLimiter, authorizeRoles('client', 'admin', 'dispatcher'), getOrders);//working
router.get('/:id', orderLimiter, authorizeRoles('client', 'admin', 'dispatcher', 'driver'), getOrder);//working

// Client-specific orders
router.get('/client/:clientId', orderLimiter, authorizeRoles('admin', 'dispatcher'), getClientOrders);//working
// router.get('/client/me/orders', orderLimiter, authorizeRoles('client'), (req, res) => {
//   // This will be handled by getClientOrders with the authenticated user's ID
//   req.params.clientId = req.user.userId;
//   return getClientOrders(req, res);
// });

// Order status management
router.get('/client/me/orders', orderLimiter, authorizeRoles('client'), async (req, res) => {
  try {
    // First get the client ID for this user
    const clientResult = await query(
      'SELECT id FROM clients WHERE user_id = $1',
      [req.user.userId]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No client found for this user'
      });
    }
    
    req.params.clientId = clientResult.rows[0].id;  // ← CORRECT: This is client ID
    return getClientOrders(req, res);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get client orders'
    });
  }
});//working

router.patch('/:id/status', orderLimiter, authorizeRoles('admin', 'dispatcher', 'driver'), updateOrderStatus);//working

// Order cancellation
router.post('/:id/cancel', orderLimiter, authorizeRoles('client', 'admin', 'dispatcher'), cancelOrder);

// Admin only endpoints
router.post('/:id/retry', orderLimiter, authorizeRoles('admin'), retryOrderProcessing);
router.post('/:id/assign-driver', orderLimiter, authorizeRoles('admin', 'dispatcher'), assignOrderToDriver);
router.get('/admin/queue', orderLimiter, authorizeRoles('admin'), async (req, res) => {
  // This would be implemented later for admin order queue management
  res.json({
    success: true,
    message: 'Admin order queue endpoint - to be implemented',
    data: {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }
  });
});

// Client billing endpoints
router.get('/client/me/billing', authenticateToken, authorizeRoles('client'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get client record
    const clientResult = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client record not found'
      });
    }
    
    const clientId = clientResult.rows[0].id;
    
    // Calculate billing information
    const billingQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as total_balance,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_invoices,
        SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_amount
      FROM orders 
      WHERE client_id = $1
    `;
    
    const billingResult = await db.query(billingQuery, [clientId]);
    const billing = billingResult.rows[0];
    
    res.json({
      success: true,
      data: {
        total_balance: parseFloat(billing.total_balance) || 0,
        pending_invoices: parseInt(billing.pending_invoices) || 0,
        pending_amount: parseFloat(billing.pending_amount) || 0,
        paid_amount: parseFloat(billing.paid_amount) || 0,
        total_orders: parseInt(billing.total_orders) || 0
      }
    });
    
  } catch (error) {
    logger.error('Failed to get billing info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get billing information'
    });
  }
});

router.get('/client/me/invoices', authenticateToken, authorizeRoles('client'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get client record
    const clientResult = await db.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client record not found'
      });
    }
    
    const clientId = clientResult.rows[0].id;
    
    // Get invoices (orders with billing information)
    const invoicesQuery = `
      SELECT 
        o.id,
        o.order_id,
        o.recipient_name,
        o.delivery_address,
        o.total_amount,
        o.payment_status,
        o.payment_method,
        o.payment_date,
        o.created_at as invoice_date,
        o.items_count,
        o.transaction_id
      FROM orders o
      WHERE o.client_id = $1
      ORDER BY o.created_at DESC
    `;
    
    const invoicesResult = await db.query(invoicesQuery, [clientId]);
    
    res.json({
      success: true,
      data: invoicesResult.rows.map(invoice => ({
        id: invoice.id,
        order_id: invoice.order_id,
        recipient_name: invoice.recipient_name,
        delivery_address: invoice.delivery_address,
        total_amount: parseFloat(invoice.total_amount),
        payment_status: invoice.payment_status || 'pending',
        payment_method: invoice.payment_method,
        payment_date: invoice.payment_date,
        invoice_date: invoice.invoice_date,
        items_count: invoice.items_count || 1,
        transaction_id: invoice.transaction_id
      }))
    });
    
  } catch (error) {
    logger.error('Failed to get invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoices'
    });
  }
});

// Health check endpoint for orders
router.get('/health/orders', (req, res) => {
  res.json({
    success: true,
    message: 'Order routes are healthy',
    timestamp: new Date().toISOString(),
    service: 'order-service'
  });
});

module.exports = router;