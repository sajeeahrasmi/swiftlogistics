const express = require('express');
const rateLimit = require('express-rate-limit');
const { 
  createDriver, 
  createDriverComprehensive,
  getDrivers, 
  getDriver, 
  updateDriverStatus,
  assignOrderToDriver,
  getAvailableDrivers
} = require('../controllers/driverController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiting for driver endpoints
const driverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many driver requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// All routes require authentication
router.use(authenticateToken);

// Driver management routes (admin/dispatcher only)
router.post('/', driverLimiter, authorizeRoles('admin'), createDriver);
router.post('/comprehensive', driverLimiter, authorizeRoles('admin'), createDriverComprehensive);
router.get('/', driverLimiter, authorizeRoles('admin', 'dispatcher'), getDrivers);
router.get('/available', driverLimiter, authorizeRoles('admin', 'dispatcher'), getAvailableDrivers);
router.get('/:id', driverLimiter, authorizeRoles('admin', 'dispatcher', 'driver'), getDriver);

// Driver status updates (admin, dispatcher, or own driver)
router.patch('/:id/status', driverLimiter, authorizeRoles('admin', 'dispatcher', 'driver'), (req, res, next) => {
  // If user is a driver, they can only update their own status
  if (req.user.role === 'driver') {
    // TODO: Add check to ensure driver can only update their own record
    // For now, we'll allow it to proceed
  }
  next();
}, updateDriverStatus);

// Order assignment routes (admin/dispatcher only)
router.post('/:driverId/assign-order/:orderId', driverLimiter, authorizeRoles('admin', 'dispatcher'), (req, res) => {
  // Set orderId from URL parameter
  req.params.orderId = req.params.orderId;
  req.body.driver_id = req.params.driverId;
  return assignOrderToDriver(req, res);
});

// Health check endpoint
router.get('/health/drivers', (req, res) => {
  res.json({
    success: true,
    message: 'Driver routes are healthy',
    timestamp: new Date().toISOString(),
    service: 'order-service'
  });
});

module.exports = router;
