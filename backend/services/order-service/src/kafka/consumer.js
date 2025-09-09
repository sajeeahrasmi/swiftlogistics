const { Kafka } = require('kafkajs');
const { logger } = require('../database/connection');
const eventBus = require('../eventBus');
const { processOrderWithExternalSystems } = require('../services/orderProcessingService');
const { updateOrderStatus } = require('../database/connection').orderQueries;

// Kafka configuration
const kafka = new Kafka({
  clientId: 'order-service-consumer',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
  connectionTimeout: 3000,
  authenticationTimeout: 1000,
  reauthenticationThreshold: 10000,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const consumer = kafka.consumer({ 
  groupId: 'order-service-group',
  sessionTimeout: 30000,
  rebalanceTimeout: 60000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576,
  minBytes: 1,
  maxBytes: 10485760,
  maxWaitTimeInMs: 5000,
});

let isConnected = false;

// Connect consumer
const connectConsumer = async () => {
  try {
    await consumer.connect();
    isConnected = true;
    logger.info('Kafka consumer connected successfully for order service');
  } catch (error) {
    logger.error('Failed to connect Kafka consumer for order service:', error);
    isConnected = false;
  }
};

// Disconnect consumer
const disconnectConsumer = async () => {
  try {
    await consumer.disconnect();
    isConnected = false;
    logger.info('Kafka consumer disconnected for order service');
  } catch (error) {
    logger.error('Error disconnecting Kafka consumer for order service:', error);
  }
};

// Event handlers for different event types
const eventHandlers = {
  // Handle order commands from other services
  'PROCESS_ORDER': async (event) => {
    try {
      logger.info('Processing ORDER_PROCESS command', { orderId: event.orderId });
      
      await processOrderWithExternalSystems(event.orderId);
      
      logger.info('Order processing completed successfully', { orderId: event.orderId });
    } catch (error) {
      logger.error('Error processing ORDER_PROCESS command:', error);
      throw error;
    }
  },

  // Handle driver events that affect orders
  'DRIVER_ASSIGNED': async (event) => {
    try {
      logger.info('Processing DRIVER_ASSIGNED event', { 
        orderId: event.orderId, 
        driverId: event.driverId 
      });
      
      // Update order with driver assignment
      await updateOrderStatus(
        event.orderId, 
        'out_for_delivery', 
        `Driver assigned: ${event.driverId}`,
        event.driverId,
        'driver'
      );
      
      logger.info('Driver assignment processed successfully', { orderId: event.orderId });
    } catch (error) {
      logger.error('Error processing DRIVER_ASSIGNED event:', error);
      throw error;
    }
  },

  'DRIVER_LOCATION_UPDATED': async (event) => {
    try {
      logger.debug('Processing DRIVER_LOCATION_UPDATED event', { 
        orderId: event.orderId, 
        driverId: event.driverId 
      });
      
      // Could update order with estimated delivery time based on location
      // This would be implemented with more sophisticated logic
      
    } catch (error) {
      logger.error('Error processing DRIVER_LOCATION_UPDATED event:', error);
    }
  },

  // Handle tracking events
  'PACKAGE_SCANNED': async (event) => {
    try {
      logger.info('Processing PACKAGE_SCANNED event', { 
        orderId: event.orderId, 
        trackingNumber: event.trackingNumber 
      });
      
      // Update order status based on scan location
      let newStatus = 'in_transit';
      let notes = `Package scanned at ${event.location || 'unknown location'}`;
      
      if (event.scannerId && event.scannerId.includes('delivery')) {
        newStatus = 'out_for_delivery';
        notes = 'Package with delivery driver for final delivery';
      }
      
      await updateOrderStatus(event.orderId, newStatus, notes);
      
      logger.info('Package scan event processed successfully', { orderId: event.orderId });
    } catch (error) {
      logger.error('Error processing PACKAGE_SCANNED event:', error);
      throw error;
    }
  },

  'PACKAGE_DELIVERED': async (event) => {
    try {
      logger.info('Processing PACKAGE_DELIVERED event', { 
        orderId: event.orderId, 
        trackingNumber: event.trackingNumber 
      });
      
      await updateOrderStatus(
        event.orderId, 
        'delivered', 
        'Package successfully delivered to recipient',
        event.driverId,
        'driver'
      );
      
      logger.info('Package delivery processed successfully', { orderId: event.orderId });
    } catch (error) {
      logger.error('Error processing PACKAGE_DELIVERED event:', error);
      throw error;
    }
  },

  // Handle client events
  'CLIENT_ORDER_CANCELLED': async (event) => {
    try {
      logger.info('Processing CLIENT_ORDER_CANCELLED event', { 
        orderId: event.orderId, 
        clientId: event.clientId 
      });
      
      await updateOrderStatus(
        event.orderId, 
        'cancelled', 
        'Order cancelled by client',
        event.clientId,
        'client'
      );
      
      logger.info('Order cancellation processed successfully', { orderId: event.orderId });
    } catch (error) {
      logger.error('Error processing CLIENT_ORDER_CANCELLED event:', error);
      throw error;
    }
  },

  // Handle system events
  'SYSTEM_MAINTENANCE_START': async (event) => {
    try {
      logger.info('Processing SYSTEM_MAINTENANCE_START event');
      
      // Pause order processing during maintenance
      // This would be implemented with a circuit breaker pattern
      
    } catch (error) {
      logger.error('Error processing SYSTEM_MAINTENANCE_START event:', error);
    }
  },

  'SYSTEM_MAINTENANCE_END': async (event) => {
    try {
      logger.info('Processing SYSTEM_MAINTENANCE_END event');
      
      // Resume order processing after maintenance
      
    } catch (error) {
      logger.error('Error processing SYSTEM_MAINTENANCE_END event:', error);
    }
  },

  // Default handler for unknown events
  'DEFAULT': async (event) => {
    logger.info('Received unknown event type', { 
      type: event.type,
      source: event.source 
    });
  }
};

// Process incoming messages from Kafka
const processMessage = async (topic, partition, message) => {
  try {
    const eventData = JSON.parse(message.value.toString());
    const eventType = eventData.type;
    
    logger.info('Processing Kafka message', {
      topic,
      partition,
      offset: message.offset,
      eventType,
      timestamp: eventData.timestamp
    });

    // Get appropriate handler
    const handler = eventHandlers[eventType] || eventHandlers['DEFAULT'];
    
    // Process the event
    await handler(eventData);
    
    logger.info('Kafka message processed successfully', {
      topic,
      partition,
      offset: message.offset,
      eventType
    });

  } catch (error) {
    logger.error('Error processing Kafka message:', {
      topic,
      partition,
      offset: message.offset,
      error: error.message,
      eventData: JSON.parse(message.value.toString())
    });
    
    // In production, you might want to send to dead letter queue
    // or implement retry logic with exponential backoff
    
    throw error;
  }
};

// Start consuming messages from Kafka
const startConsumer = async (topics = ['order-commands', 'driver-events', 'tracking-events', 'client-events', 'system-events']) => {
  try {
    if (!isConnected) {
      await connectConsumer();
    }

    // Subscribe to topics
    await consumer.subscribe({ 
      topics,
      fromBeginning: false 
    });

    // Start consuming with error handling
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          await processMessage(topic, partition, message);
        } catch (error) {
          logger.error('Failed to process Kafka message, attempting to reconnect:', error);
          
          // Try to reconnect and resubscribe
          try {
            await disconnectConsumer();
            await connectConsumer();
            await consumer.subscribe({ topics, fromBeginning: false });
          } catch (reconnectError) {
            logger.error('Failed to reconnect Kafka consumer:', reconnectError);
          }
        }
      },
    });

    logger.info('Kafka consumer started successfully for order service', { topics });

  } catch (error) {
    logger.error('Failed to start Kafka consumer for order service:', error);
    
    // Fallback to event bus for critical events
    setupEventBusFallback();
    throw error;
  }
};

// Setup event bus fallback for when Kafka is unavailable
const setupEventBusFallback = () => {
  logger.warn('Setting up event bus fallback for order service');
  
  // Subscribe to critical events on the event bus
  eventBus.subscribe([
    'ORDER_PROCESS',
    'DRIVER_ASSIGNED', 
    'PACKAGE_SCANNED',
    'PACKAGE_DELIVERED',
    'CLIENT_ORDER_CANCELLED'
  ], async (event) => {
    try {
      const handler = eventHandlers[event.type] || eventHandlers['DEFAULT'];
      await handler(event.data);
      
      logger.info('Event bus message processed successfully', {
        eventType: event.type,
        eventId: event.id
      });
    } catch (error) {
      logger.error('Error processing event bus message:', {
        eventType: event.type,
        error: error.message
      });
    }
  });
};

// Handle consumer events
consumer.on('consumer.connect', () => {
  logger.info('Kafka consumer connected for order service');
});

consumer.on('consumer.disconnect', () => {
  logger.info('Kafka consumer disconnected for order service');
  isConnected = false;
  
  // Enable event bus fallback when Kafka disconnects
  setupEventBusFallback();
});

consumer.on('consumer.crash', (event) => {
  logger.error('Kafka consumer crashed for order service:', event);
  isConnected = false;
});

consumer.on('consumer.rebalancing', () => {
  logger.info('Kafka consumer rebalancing for order service');
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down Kafka consumer for order service...');
  await disconnectConsumer();
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Auto-start consumer when module loads if configured
if (process.env.KAFKA_AUTO_START !== 'false') {
  startConsumer().catch(error => {
    logger.error('Failed to auto-start Kafka consumer:', error);
  });
}

module.exports = {
  connectConsumer,
  disconnectConsumer,
  startConsumer,
  consumer,
  isConnected: () => isConnected,
  eventHandlers // Export for testing
};