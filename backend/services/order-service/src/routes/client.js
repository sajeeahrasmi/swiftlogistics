const express = require('express');
const { createClient, getClients, getClient } = require('../controllers/clientController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Create client (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), createClient);

// Get all clients (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), getClients);

// Get specific client (admin only)
router.get('/:id', authenticateToken, authorizeRoles('admin'), getClient);

module.exports = router;