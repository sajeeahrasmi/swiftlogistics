const { query, transaction, logger } = require('../database/connection');
const { publishEvent } = require('../kafka/producer');
const cmsAdapter = require('../adapters/cmsAdapter');
const rosAdapter = require('../adapters/rosAdapter');
const wmsAdapter = require('../adapters/wmsAdapter');

// Maximum retry attempts for external system integration
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

// Main order processing function
const processOrderWithExternalSystems = async (orderId, attempt = 1) => {
  try {
    logger.info(`Processing order ${orderId} with external systems (attempt ${attempt})`);

    // Get order details
    const order = await getOrderDetails(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Update order status to processing
    await updateOrderStatus(orderId, 'processing', 'Starting external system integration');

    // Step 1: Integrate with CMS (Client Management System)
    await integrateWithCMS(order);

    // Step 2: Integrate with WMS (Warehouse Management System)
    await integrateWithWMS(order);

    // Step 3: Integrate with ROS (Route Optimization System)
    await integrateWithROS(order);

    // If all integrations successful, mark as processed
    await updateOrderStatus(orderId, 'pickup_scheduled', 'All external systems integrated successfully');

    logger.info(`Order ${orderId} processed successfully with all external systems`);

    // Publish success event
    await publishEvent('order-events', {
      type: 'ORDER_PROCESSING_COMPLETED',
      orderId: orderId,
      timestamp: new Date().toISOString(),
      status: 'pickup_scheduled'
    });

  } catch (error) {
    logger.error(`Failed to process order ${orderId} with external systems:`, error);

    // Handle retry logic
    if (attempt < MAX_RETRY_ATTEMPTS) {
      logger.info(`Retrying order ${orderId} processing in ${RETRY_DELAY_MS}ms (attempt ${attempt + 1})`);
      
      // Update status to indicate retry
      await updateOrderStatus(orderId, 'processing', `Retrying external system integration (attempt ${attempt + 1})`);
      
      // Schedule retry
      setTimeout(() => processOrderWithExternalSystems(orderId, attempt + 1), RETRY_DELAY_MS);
      return;
    }

    // Max retries reached, mark as failed
    await handleProcessingFailure(orderId, error);
  }
};

// Get order details with items
const getOrderDetails = async (orderId) => {
  const orderResult = await query(
    `SELECT o.*, c.company_name, c.contact_email, c.contact_phone 
     FROM orders o 
     LEFT JOIN clients c ON o.client_id = c.id 
     WHERE o.id = $1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  const itemsResult = await query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [orderId]
  );

  return {
    ...orderResult.rows[0],
    items: itemsResult.rows
  };
};

// Update order status with history
const updateOrderStatus = async (orderId, status, notes = null) => {
  return await transaction(async (client) => {
    await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, orderId]
    );

    await client.query(
      `INSERT INTO order_status_history 
       (order_id, status, notes, actor_type) 
       VALUES ($1, $2, $3, 'system')`,
      [orderId, status, notes]
    );
  });
};

// Integrate with CMS (Client Management System)
// const integrateWithCMS = async (order) => {
//   try {
//     logger.info(`Integrating order ${order.id} with CMS`);

//     // Validate client contract and billing information
//     // const cmsResponse = await cmsAdapter.validateOrder({
//     const cmsResponse = await cmsAdapter.cmsAdapter.validateOrder({
//     orderId: order.id,
//       clientId: order.client_id,
//       clientName: order.company_name,
//       orderValue: calculateOrderValue(order.items),
//       priority: order.priority,
//       pickupAddress: order.pickup_address,
//       deliveryAddress: order.delivery_address
//     });

//     if (!cmsResponse.success) {
//       throw new Error(`CMS validation failed: ${cmsResponse.message}`);
//     }

//     // Update order with CMS reference
//     await query(
//       'UPDATE orders SET cms_reference = $1, contract_id = $2 WHERE id = $3',
//       [cmsResponse.referenceId, cmsResponse.contractId, order.id]
//     );

//     logger.info(`Order ${order.id} successfully integrated with CMS`);
//     return cmsResponse;

//   } catch (error) {
//     logger.error(`CMS integration failed for order ${order.id}:`, error);
//     throw new Error(`CMS integration failed: ${error.message}`);
//   }
// };
// Integrate with CMS (Client Management System)
const integrateWithCMS = async (order) => {
  try {
    logger.info(`Integrating order ${order.id} with CMS`);

    // Validate client contract and billing information
    const cmsResponse = await cmsAdapter.cmsAdapter.validateOrder({
      orderId: order.id,
      clientId: order.client_id,
      clientName: order.company_name,
      orderValue: calculateOrderValue(order.items),
      priority: order.priority,
      pickupAddress: order.pickup_address,
      deliveryAddress: order.delivery_address
    });

    if (!cmsResponse.success) {
      throw new Error(`CMS validation failed: ${cmsResponse.message}`);
    }

    // Update order with CMS reference
    await query(
      'UPDATE orders SET cms_reference = $1, contract_id = $2 WHERE id = $3',
      [cmsResponse.referenceId, cmsResponse.contractId, order.id]
    );

    logger.info(`Order ${order.id} successfully integrated with CMS`);
    return cmsResponse;

  } catch (error) {
    logger.error(`CMS integration failed for order ${order.id}:`, error);
    throw new Error(`CMS integration failed: ${error.message}`);
  }
};

// Integrate with WMS (Warehouse Management System)
const integrateWithWMS = async (order) => {
  try {
    logger.info(`Integrating order ${order.id} with WMS`);

    // Create warehouse intake request
    // const wmsResponse = await wmsAdapter.createIntakeRequest({
    const wmsResponse = await wmsAdapter.wmsAdapter.createIntakeRequest({
    orderId: order.id,
      clientId: order.client_id,
      clientName: order.company_name,
      items: order.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        weightKg: item.weight_kg,
        dimensions: item.dimensions_cm,
        value: item.value,
        specialInstructions: item.special_instructions
      })),
      scheduledPickupTime: order.scheduled_pickup_time,
      priority: order.priority
    });

    if (!wmsResponse.success) {
      throw new Error(`WMS intake creation failed: ${wmsResponse.message}`);
    }

    // Update order with WMS reference and tracking number
    await query(
      'UPDATE orders SET wms_reference = $1, tracking_number = $2 WHERE id = $3',
      [wmsResponse.referenceId, wmsResponse.trackingNumber, order.id]
    );

    logger.info(`Order ${order.id} successfully integrated with WMS`);
    return wmsResponse;

  } catch (error) {
    logger.error(`WMS integration failed for order ${order.id}:`, error);
    throw new Error(`WMS integration failed: ${error.message}`);
  }
};

// Integrate with ROS (Route Optimization System)
const integrateWithROS = async (order) => {
  try {
    logger.info(`Integrating order ${order.id} with ROS`);

    // Check if we have enough information for route optimization
    if (!order.tracking_number) {
      throw new Error('Tracking number not available from WMS');
    }

    // Create route optimization request
    // const rosResponse = await rosAdapter.optimizeRoute({
    const rosResponse = await rosAdapter.rosAdapter.optimizeRoute({
      orderId: order.id,
      trackingNumber: order.tracking_number,
      pickupAddress: order.pickup_address,
      deliveryAddress: order.delivery_address,
      recipientName: order.recipient_name,
      recipientPhone: order.recipient_phone,
      priority: order.priority,
      estimatedDeliveryWindow: calculateDeliveryWindow(order.priority)
    });

    if (!rosResponse.success) {
      throw new Error(`Route optimization failed: ${rosResponse.message}`);
    }

    // Update order with ROS reference and estimated delivery time
    await query(
      'UPDATE orders SET ros_reference = $1, estimated_delivery_time = $2 WHERE id = $3',
      [rosResponse.referenceId, rosResponse.estimatedDeliveryTime, order.id]
    );

    logger.info(`Order ${order.id} successfully integrated with ROS`);
    return rosResponse;

  } catch (error) {
    logger.error(`ROS integration failed for order ${order.id}:`, error);
    throw new Error(`ROS integration failed: ${error.message}`);
  }
};

// Handle processing failure
const handleProcessingFailure = async (orderId, error) => {
  try {
    // Update order status to failed
    await updateOrderStatus(
      orderId, 
      'failed', 
      `Order processing failed after maximum retries: ${error.message}`
    );

    // Publish failure event
    await publishEvent('order-events', {
      type: 'ORDER_PROCESSING_FAILED',
      orderId: orderId,
      timestamp: new Date().toISOString(),
      error: error.message,
      status: 'failed'
    });

    // TODO: Send notification to admin/dispatcher
    logger.error(`Order ${orderId} processing failed permanently:`, error);

  } catch (updateError) {
    logger.error(`Failed to update order ${orderId} status to failed:`, updateError);
  }
};

// Calculate order value from items
const calculateOrderValue = (items) => {
  return items.reduce((total, item) => total + (item.value || 0) * item.quantity, 0);
};

// Calculate delivery window based on priority
const calculateDeliveryWindow = (priority) => {
  const now = new Date();
  const deliveryWindows = {
    urgent: 2, // 2 hours
    high: 6,   // 6 hours
    medium: 24, // 24 hours
    low: 48     // 48 hours
  };

  const hours = deliveryWindows[priority] || 24;
  const deliveryTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
  
  return {
    start: now.toISOString(),
    end: deliveryTime.toISOString()
  };
};

// Process bulk orders (for high-volume events like Black Friday)
const processBulkOrders = async (orderIds) => {
  logger.info(`Processing ${orderIds.length} orders in bulk`);
  
  const results = {
    successful: [],
    failed: [],
    processing: []
  };

  // Process orders in parallel with limited concurrency
  const concurrencyLimit = 10;
  const batches = [];
  
  for (let i = 0; i < orderIds.length; i += concurrencyLimit) {
    batches.push(orderIds.slice(i, i + concurrencyLimit));
  }

  for (const batch of batches) {
    const batchPromises = batch.map(orderId => 
      processOrderWithExternalSystems(orderId).catch(error => ({
        orderId,
        error: error.message
      }))
    );

    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.successful.push(result.value);
      } else {
        results.failed.push(result.reason);
      }
    });

    // Small delay between batches to avoid overwhelming external systems
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  logger.info(`Bulk processing completed: ${results.successful.length} successful, ${results.failed.length} failed`);
  return results;
};

// Manual retry for failed orders
const retryFailedOrder = async (orderId) => {
  try {
    // Reset retry count and status
    await updateOrderStatus(orderId, 'pending', 'Manual retry initiated by admin');
    
    // Start processing
    await processOrderWithExternalSystems(orderId);
    
    return {
      success: true,
      message: `Order ${orderId} retry initiated successfully`
    };
  } catch (error) {
    logger.error(`Manual retry failed for order ${orderId}:`, error);
    return {
      success: false,
      message: `Retry failed: ${error.message}`
    };
  }
};

// Get order processing status
const getOrderProcessingStatus = async (orderId) => {
  const statusResult = await query(
    `SELECT status, notes, created_at 
     FROM order_status_history 
     WHERE order_id = $1 
     ORDER BY created_at DESC 
     LIMIT 10`,
    [orderId]
  );

  const externalRefsResult = await query(
    'SELECT cms_reference, wms_reference, ros_reference FROM orders WHERE id = $1',
    [orderId]
  );

  return {
    statusHistory: statusResult.rows,
    externalReferences: externalRefsResult.rows[0] || {}
  };
};

module.exports = {
  processOrderWithExternalSystems,
  processBulkOrders,
  retryFailedOrder,
  getOrderProcessingStatus,
  integrateWithCMS,
  integrateWithWMS,
  integrateWithROS
};