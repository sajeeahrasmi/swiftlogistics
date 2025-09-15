const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const driverAppController = require('../controllers/driverAppController');

const router = express.Router();

// All endpoints require driver authentication
router.use(authenticateToken);

// Get all deliveries assigned to the driver
router.get('/deliveries', driverAppController.getAssignedDeliveries);

// Get a single delivery assignment by assignmentId for the driver
router.get('/deliveries/:assignmentId', driverAppController.getDeliveryDetails);

// Update delivery status (accept, in-progress, completed)
router.post('/deliveries/:assignmentId/status', driverAppController.updateDeliveryStatus);

// Upload proof of delivery (photo, signature)
router.post('/deliveries/:assignmentId/proof', driverAppController.uploadProofOfDelivery);

// Get driver profile
router.get('/profile', driverAppController.getProfile);

// Update driver status (e.g., available, busy, offline)
router.patch('/status', driverAppController.updateDriverStatus);

module.exports = router;
