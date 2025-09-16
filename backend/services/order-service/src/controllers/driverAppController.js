// Get a single delivery assignment by assignmentId for the driver
exports.getDeliveryDetails = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    let driverId = req.query.driver_id || req.body.driver_id;
    if (!driverId && req.user && req.user.userId) {
      // Look up driver_id from user_id
      const driverResult = await query('SELECT id FROM drivers WHERE user_id = $1', [req.user.userId]);
      if (driverResult.rows.length) {
        driverId = driverResult.rows[0].id;
      }
    }
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'Driver ID not found for logged in user' });
    }
    const result = await query(
      `SELECT oa.id AS assignment_id, oa.status AS assignment_status, o.id AS order_id,
              o.pickup_address, o.delivery_address, o.recipient_name, o.recipient_phone
       FROM order_assignments oa
       JOIN orders o ON o.id = oa.order_id
       WHERE oa.id = $1 AND oa.driver_id = $2`,
      [assignmentId, driverId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Delivery assignment not found' });
    }
    res.json({ success: true, delivery: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
const { query } = require('../database/connection');

// Get all deliveries assigned to the driver
exports.getAssignedDeliveries = async (req, res) => {
  try {
    let driverId = req.query.driver_id || req.body.driver_id;
    if (!driverId && req.user && req.user.userId) {
      // Look up driver_id from user_id
      const driverResult = await query('SELECT id FROM drivers WHERE user_id = $1', [req.user.userId]);
      if (driverResult.rows.length) {
        driverId = driverResult.rows[0].id;
      }
    }
    if (!driverId) {
      console.log('[getAssignedDeliveries] No driverId found for user', req.user?.userId);
      return res.status(400).json({ success: false, message: 'Driver ID not found for logged in user' });
    }
    console.log('[getAssignedDeliveries] Using driverId:', driverId, 'for userId:', req.user?.userId);
    const result = await query(
      `SELECT oa.id AS assignment_id, oa.status AS assignment_status, o.id AS order_id,
              o.pickup_address, o.delivery_address, o.recipient_name, o.recipient_phone
       FROM order_assignments oa
       JOIN orders o ON o.id = oa.order_id
       WHERE oa.driver_id = $1 AND oa.status != 'completed'
       ORDER BY oa.id`,
      [driverId]
    );
    res.json({ success: true, deliveries: result.rows, debug_driverId: driverId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update delivery status
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status, driver_id } = req.body;
    const { assignmentId } = req.params;
    await query(
      `UPDATE order_assignments SET status = $1, updated_at = NOW() WHERE id = $2 AND driver_id = $3`,
      [status, assignmentId, driver_id]
    );
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Upload proof of delivery
exports.uploadProofOfDelivery = async (req, res) => {
  try {
    const { photoUrl, signature, driver_id } = req.body;
    const { assignmentId } = req.params;
    const orderResult = await query(
      'SELECT order_id FROM order_assignments WHERE id = $1 AND driver_id = $2',
      [assignmentId, driver_id]
    );
    if (!orderResult.rows.length) return res.status(404).json({ success: false, message: 'Assignment not found' });
    const orderId = orderResult.rows[0].order_id;
    await query(
      `INSERT INTO order_proof_of_delivery (order_id, delivery_photo_url, recipient_signature, delivered_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (order_id) DO UPDATE
         SET delivery_photo_url = EXCLUDED.delivery_photo_url,
             recipient_signature = EXCLUDED.recipient_signature,
             delivered_at = NOW()`,
      [orderId, photoUrl, signature]
    );
    await query(
      `UPDATE order_assignments SET status = 'completed', completed_at = NOW() WHERE id = $1 AND driver_id = $2`,
      [assignmentId, driver_id]
    );
    res.json({ success: true, message: 'Proof uploaded and delivery completed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get driver profile
exports.getProfile = async (req, res) => {
  try {
    const driverId = req.query.driver_id || req.body.driver_id || req.user.userId;
    const result = await query(
      `SELECT d.*, u.email, u.first_name, u.last_name
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [driverId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update driver status
exports.updateDriverStatus = async (req, res) => {
  try {
    const driverId = req.body.driver_id || req.query.driver_id || req.user.userId;
    const { status } = req.body;
    await query(
      `UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, driverId]
    );
    res.json({ success: true, message: 'Driver status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};