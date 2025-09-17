// Tracking Service for SwiftLogistics Assignment
// Implements minimal real-time tracking and status update API

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors()); // Allow cross-origin requests for demo/testing
app.use(bodyParser.json());

// In-memory storage for demo: { [driverId]: { ...locationData } }
const driverLocations = {};

// Mock order tracking data for demo purposes
const orderTrackingData = {
  "TRK-728415": {
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
    client_id: 1
  },
  "TRK-728416": {
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
    client_id: 1
  },
  "TRK-728417": {
    id: 3,
    trackingNumber: "TRK-728417",
    recipient: "Charlie Brown",
    address: "78 Hyde Park Corner, Colombo 02",
    status: "Processing",
    lastUpdate: "2025-09-18 02:45 PM",
    estimatedDelivery: "2025-09-21",
    items: 5,
    currentLocation: "Colombo Processing",
    routeProgress: 60,
    client_id: 2
  },
  "TRK-728418": {
    id: 4,
    trackingNumber: "TRK-728418",
    recipient: "Diana Miller",
    address: "12 Ward Place, Colombo 07",
    status: "Delivered",
    lastUpdate: "2025-09-17 03:20 PM",
    estimatedDelivery: "Delivered",
    items: 1,
    currentLocation: "Colombo 07",
    routeProgress: 100,
    client_id: 1
  },
  "TRK-728419": {
    id: 5,
    trackingNumber: "TRK-728419",
    recipient: "Ethan Davis",
    address: "33 Barnes Place, Colombo 07",
    status: "In Warehouse",
    lastUpdate: "2025-09-18 10:00 AM",
    estimatedDelivery: "2025-09-22",
    items: 4,
    currentLocation: "Colombo Main Warehouse",
    routeProgress: 30,
    client_id: 3
  },
  "TRK-728420": {
    id: 6,
    trackingNumber: "TRK-728420",
    recipient: "Fiona Wilson",
    address: "56 Duplication Road, Colombo 03",
    status: "Processing",
    lastUpdate: "2025-09-18 01:30 PM",
    estimatedDelivery: "2025-09-20",
    items: 2,
    currentLocation: "Colombo Processing",
    routeProgress: 50,
    client_id: 2
  },
  "TRK-728421": {
    id: 7,
    trackingNumber: "TRK-728421",
    recipient: "George Martin",
    address: "90 Havelock Road, Colombo 05",
    status: "Delivered",
    lastUpdate: "2025-09-16 11:45 AM",
    estimatedDelivery: "Delivered",
    items: 3,
    currentLocation: "Colombo 05",
    routeProgress: 100,
    client_id: 1
  },
  "TRK-728422": {
    id: 8,
    trackingNumber: "TRK-728422",
    recipient: "Helen Taylor",
    address: "22 Horton Place, Colombo 07",
    status: "In Warehouse",
    lastUpdate: "2025-09-18 09:15 AM",
    estimatedDelivery: "2025-09-23",
    items: 1,
    currentLocation: "Colombo Main Warehouse",
    routeProgress: 25,
    client_id: 3
  },
  "TRK-728423": {
    id: 9,
    trackingNumber: "TRK-728423",
    recipient: "Ian Murphy",
    address: "34 Galle Face, Colombo 03",
    status: "Processing",
    lastUpdate: "2025-09-18 02:20 PM",
    estimatedDelivery: "2025-09-24",
    items: 4,
    currentLocation: "Colombo Processing",
    routeProgress: 70,
    client_id: 2
  }
};

/**
 * POST /location
 * Receives a location/status update from a driver
 * Body: { driverId, latitude, longitude, status, timestamp }
 */
app.post('/location', (req, res) => {
	const { driverId, latitude, longitude, status, timestamp } = req.body;
	if (!driverId || typeof latitude !== 'number' || typeof longitude !== 'number') {
		return res.status(400).json({ error: 'Missing required fields' });
	}
	driverLocations[driverId] = {
		driverId,
		latitude,
		longitude,
		status: status || 'en route',
		timestamp: timestamp || Date.now(),
	};
	res.json({ status: 'Location/status updated' });
});

/**
 * GET /location/:driverId
 * Returns the latest location/status for a driver
 */
app.get('/location/:driverId', (req, res) => {
	const { driverId } = req.params;
	const data = driverLocations[driverId];
	if (!data) {
		return res.status(404).json({ error: 'No location data for this driver' });
	}
	res.json(data);
});

/**
 * GET /locations
 * Returns all drivers' latest locations/statuses (for admin/client portal demo)
 */
app.get('/locations', (req, res) => {
	res.json(Object.values(driverLocations));
});

/**
 * GET /api/orders
 * Returns all order tracking data
 */
app.get('/api/orders', (req, res) => {
	const orders = Object.values(orderTrackingData);
	res.json({
		success: true,
		data: orders
	});
});

/**
 * GET /api/client/:clientId/orders
 * Returns tracking orders for a specific client
 */
app.get('/api/client/:clientId/orders', (req, res) => {
	const { clientId } = req.params;
	const clientIdNum = parseInt(clientId);
	
	if (isNaN(clientIdNum)) {
		return res.status(400).json({
			success: false,
			error: 'Invalid client ID'
		});
	}
	
	const allOrders = Object.values(orderTrackingData);
	const clientOrders = allOrders.filter(order => order.client_id === clientIdNum);
	
	res.json({
		success: true,
		data: clientOrders
	});
});

/**
 * GET /api/orders/:trackingNumber
 * Returns specific order tracking data by tracking number
 */
app.get('/api/orders/:trackingNumber', (req, res) => {
	const { trackingNumber } = req.params;
	const order = orderTrackingData[trackingNumber];
	
	if (!order) {
		return res.status(404).json({ 
			success: false,
			error: 'Order not found with this tracking number' 
		});
	}
	
	res.json({
		success: true,
		data: order
	});
});

/**
 * PUT /api/orders/:trackingNumber
 * Updates order tracking information
 */
app.put('/api/orders/:trackingNumber', (req, res) => {
	const { trackingNumber } = req.params;
	const updateData = req.body;
	
	if (!orderTrackingData[trackingNumber]) {
		return res.status(404).json({ 
			success: false,
			error: 'Order not found with this tracking number' 
		});
	}
	
	// Update the order data
	orderTrackingData[trackingNumber] = {
		...orderTrackingData[trackingNumber],
		...updateData,
		lastUpdate: new Date().toLocaleString()
	};
	
	res.json({
		success: true,
		data: orderTrackingData[trackingNumber]
	});
});

/**
 * GET /api/tracking/:trackingNumber
 * Alternative endpoint for tracking a specific order (for compatibility)
 */
app.get('/api/tracking/:trackingNumber', (req, res) => {
	const { trackingNumber } = req.params;
	const order = orderTrackingData[trackingNumber];
	
	if (!order) {
		return res.status(404).json({ 
			success: false,
			error: 'Order not found with this tracking number' 
		});
	}
	
	res.json({
		success: true,
		data: order
	});
});

// (Optional) Health check endpoint
app.get('/', (req, res) => {
	res.send('SwiftLogistics Tracking Service is running.');
});

app.listen(PORT, () => {
	console.log(`Tracking service running on port ${PORT}`);
});
