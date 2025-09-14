const Joi = require('joi');
const { query, transaction, orderQueries, logger } = require('../database/connection');
const { publishEvent } = require('../kafka/producer');
const { processOrderWithExternalSystems } = require('../services/orderProcessingService');

// Validation schemas
const createOrderSchema = Joi.object({
  client_id: Joi.number().integer().positive().required(),
  pickup_address: Joi.string().min(5).max(500).required(),
  delivery_address: Joi.string().min(5).max(500).required(),
  recipient_name: Joi.string().min(2).max(100).required(),
  recipient_phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
  items: Joi.array().items(
    Joi.object({
      description: Joi.string().min(2).max(200).required(),
      quantity: Joi.number().integer().positive().required(),
      weight_kg: Joi.number().positive().max(100).required(),
      dimensions_cm: Joi.object({
        length: Joi.number().positive().max(200).required(),
        width: Joi.number().positive().max(200).required(),
        height: Joi.number().positive().max(200).required()
      }).optional(),
      value: Joi.number().positive().max(10000).optional(),
      special_instructions: Joi.string().max(500).optional()
    })
  ).min(1).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  scheduled_pickup_time: Joi.date().iso().min('now').optional(),
  special_instructions: Joi.string().max(1000).optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(
    'pending', 
    'processing', 
    'pickup_scheduled',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'failed',
    'cancelled',
    'returned'
  ).required(),
  notes: Joi.string().max(500).optional(),
  actor_type: Joi.string().valid('system', 'client', 'driver', 'dispatcher', 'admin').default('system')
});

// Create new order
const createOrder = async (req, res) => {
  try {
    // Validate input
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { client_id, items, ...orderData } = value;

    // Verify client exists and belongs to authenticated user if not admin
    if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
      // For now, allow clients to create orders for client_id that matches existing orders
      // This is consistent with how getClientOrders works
      // TODO: Implement proper client-user relationship validation
      
      // Check if client exists at all
      const clientExists = await query(
        'SELECT id FROM clients WHERE id = $1',
        [client_id]
      );
      
      if (clientExists.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Client not found'
        });
      }
      
      // For client role, ensure they can only create orders for client_ids they have access to
      // We check this by seeing if they have existing orders for this client_id
      if (req.user.role === 'client') {
        const existingOrders = await query(
          'SELECT id FROM orders WHERE client_id = $1 LIMIT 1',
          [client_id]
        );
        
        // If no existing orders for this client_id, check if the client_id matches user_id (legacy pattern)
        if (existingOrders.rows.length === 0 && client_id !== req.user.userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this client'
          });
        }
      }
    }

    // Create order in transaction
    const result = await transaction(async (client) => {
      // Insert order
      const orderResult = await client.query(
        `INSERT INTO orders 
         (client_id, pickup_address, delivery_address, recipient_name, recipient_phone, 
          priority, scheduled_pickup_time, special_instructions, status, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9) 
         RETURNING *`,
        [
          client_id, 
          orderData.pickup_address, 
          orderData.delivery_address,
          orderData.recipient_name,
          orderData.recipient_phone,
          orderData.priority,
          orderData.scheduled_pickup_time,
          orderData.special_instructions,
          req.user.userId
        ]
      );

      const order = orderResult.rows[0];

      // Insert order items
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items 
           (order_id, description, quantity, weight_kg, dimensions_cm, value, handling_instructions) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            order.id,
            item.description,
            item.quantity,
            item.weight_kg,
            item.dimensions_cm ? JSON.stringify(item.dimensions_cm) : null,
            item.value,
            item.special_instructions
          ]
        );
      }

      // Add initial status history
      await client.query(
        `INSERT INTO order_status_history 
         (order_id, status, actor_id, actor_type) 
         VALUES ($1, 'pending', $2, $3)`,
        [order.id, req.user.userId, req.user.role]
      );

      return order;
    });

    // Publish order created event
    try {
      await publishEvent('order-events', {
        type: 'ORDER_CREATED',
        orderId: result.id,
        clientId: result.client_id,
        status: result.status,
        timestamp: new Date().toISOString(),
        createdBy: req.user.userId
      });
    } catch (eventError) {
      logger.error('Failed to publish ORDER_CREATED event:', eventError);
    }

    // Process order with external systems (async - don't wait)
    processOrderWithExternalSystems(result.id).catch(error => {
      logger.error('Failed to process order with external systems:', error);
    });

    logger.info(`Order created successfully: ${result.id} by user: ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: {
          id: result.id,
          client_id: result.client_id,
          status: result.status,
          tracking_number: result.tracking_number,
          created_at: result.created_at
        }
      }
    });

  } catch (error) {
    logger.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

// Get order by ID
const getOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await orderQueries.getOrderWithDetails(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
      if (req.user.role !== 'client') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order'
        });
      }
      // Add driver permission check later when driver assignments are implemented
    }

    // if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
    //   if (req.user.role === 'client' && order.client_id !== req.user.userId) {
    //     return res.status(403).json({
    //       success: false,
    //       message: 'Access denied to this order'
    //     });
    //   }
    //   // Add driver permission check later when driver assignments are implemented
    // }

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order'
    });
  }
};

// Get orders with filtering and pagination
const getOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      client_id, 
      priority,
      start_date,
      end_date 
    } = req.query;

    let queryText = `
      SELECT o.*, c.company_name as client_company,
      COUNT(*) OVER() as total_count
      FROM orders o 
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE 1=1
    `;
    let queryParams = [];
    let paramCount = 0;

    // Apply filters based on user role
    if (req.user.role === 'client') {
      queryText += ` AND o.client_id = $${++paramCount}`;
      queryParams.push(req.user.userId);
    }

    if (status) {
      queryText += ` AND o.status = $${++paramCount}`;
      queryParams.push(status);
    }

    if (client_id && (req.user.role === 'admin' || req.user.role === 'dispatcher')) {
      queryText += ` AND o.client_id = $${++paramCount}`;
      queryParams.push(client_id);
    }

    if (priority) {
      queryText += ` AND o.priority = $${++paramCount}`;
      queryParams.push(priority);
    }

    if (start_date) {
      queryText += ` AND o.created_at >= $${++paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      queryText += ` AND o.created_at <= $${++paramCount}`;
      queryParams.push(end_date);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    queryText += `
      ORDER BY o.created_at DESC 
      LIMIT $${++paramCount} 
      OFFSET $${++paramCount}
    `;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
          totalPages: Math.ceil((result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0) / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
};

// Get orders by client
const getClientOrders = async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const { page = 1, limit = 50, status } = req.query;

    // Verify client exists and user has access
    // if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
    //   if (clientId != req.user.userId) {
    //     return res.status(403).json({
    //       success: false,
    //       message: 'Access denied to client orders'
    //     });
    //   }
    // }

    const result = await orderQueries.getOrdersByClient(clientId, parseInt(page), parseInt(limit), status);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get client orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve client orders'
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Validate input
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const { status, notes, actor_type } = value;

    // Verify order exists and user has access
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Check permissions based on role and order status
    if (!canUpdateStatus(req.user.role, order.status, status)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update order status'
      });
    }

    // Update status
    const result = await orderQueries.updateOrderStatus(
      orderId, 
      status, 
      notes, 
      req.user.userId, 
      actor_type || req.user.role
    );

    // Publish status update event
    try {
      await publishEvent('order-events', {
        type: 'ORDER_STATUS_UPDATED',
        orderId: orderId,
        oldStatus: order.status,
        newStatus: status,
        actor: {
          id: req.user.userId,
          type: req.user.role
        },
        timestamp: new Date().toISOString(),
        notes: notes
      });
    } catch (eventError) {
      logger.error('Failed to publish ORDER_STATUS_UPDATED event:', eventError);
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: result
    });

  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Verify order exists and user has access
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Check if order can be cancelled
    if (!['pending', 'processing', 'pickup_scheduled', 'failed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled in its current status'
      });
    }

    // Check permissions
    // if (req.user.role === 'client' && order.client_id !== req.user.userId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Access denied to cancel this order'
    //   });
    // }

    // Update status to cancelled
    const result = await orderQueries.updateOrderStatus(
      orderId, 
      'cancelled', 
      'Order cancelled by user', 
      req.user.userId, 
      req.user.role
    );

    // Publish cancellation event
    try {
      await publishEvent('order-events', {
        type: 'ORDER_CANCELLED',
        orderId: orderId,
        cancelledBy: req.user.userId,
        timestamp: new Date().toISOString(),
        reason: 'User requested cancellation'
      });
    } catch (eventError) {
      logger.error('Failed to publish ORDER_CANCELLED event:', eventError);
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: result
    });

  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
};

// Retry order processing (admin only)
const retryOrderProcessing = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Verify order exists
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Only retry if order is in failed state
    if (order.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Order is not in failed state'
      });
    }

    // Retry processing
    await processOrderWithExternalSystems(orderId);

    res.json({
      success: true,
      message: 'Order processing retry initiated'
    });

  } catch (error) {
    logger.error('Retry order processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry order processing'
    });
  }
};

// Helper function to check if user can update status
const canUpdateStatus = (userRole, currentStatus, newStatus) => {
  const allowedTransitions = {
    admin: ['*'], // Admin can do anything
    dispatcher: ['*'], // Dispatcher can do anything except some admin functions
    driver: ['picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed'],
    client: ['cancelled'] // Clients can only cancel orders
  };

  if (allowedTransitions[userRole]?.[0] === '*') {
    return true;
  }

  return allowedTransitions[userRole]?.includes(newStatus);
};

module.exports = {
  createOrder,
  getOrder,
  getOrders,
  getClientOrders,
  updateOrderStatus,
  cancelOrder,
  retryOrderProcessing
};