const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const driverController = require('../controllers/driverController');

// Get all deliveries assigned to the driver
router.get('/deliveries', authMiddleware, driverController.getDeliveries);

module.exports = router;
