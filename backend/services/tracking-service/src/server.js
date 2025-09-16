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

// (Optional) Health check endpoint
app.get('/', (req, res) => {
	res.send('SwiftLogistics Tracking Service is running.');
});

app.listen(PORT, () => {
	console.log(`Tracking service running on port ${PORT}`);
});
