const { Kafka } = require('kafkajs');
const { logger } = require('../database/connection');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'auth-service-consumer',
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
  groupId: 'auth-service-group',
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
    logger.info('Kafka consumer connected successfully');
  } catch (error) {
    logger.error('Failed to connect Kafka consumer:', error);
    isConnected = false;
  }
};

// Disconnect consumer
const disconnectConsumer = async () => {
  try {
    await consumer.disconnect();
    isConnected = false;
    logger.info('Kafka consumer disconnected');
  } catch (error) {
    logger.error('Error disconnecting Kafka consumer:', error);
  }
};

// Event handlers
const eventHandlers = {
  // Handle order events that might affect user permissions or notifications
  'ORDER_CREATED': async (event) => {
    try {
      logger.info('Processing ORDER_CREATED event', { orderId: event.orderId, userId: event.userId });
      
      // Here you could:
      // - Update user statistics
      // - Send notifications
      // - Log user activity
      
      // For now, just log the event
      logger.info('Order created event processed successfully');
    } catch (error) {
      logger.error('Error processing ORDER_CREATED event:', error);
      throw error;
    }
  },

  'ORDER_STATUS_UPDATED': async (event) => {
    try {
      logger.info('Processing ORDER_STATUS_UPDATED event', { 
        orderId: event.orderId, 
        status: event.status,
        userId: event.userId 
      });
      
      // Process order status updates that might need user notifications
      logger.info('Order status update event processed successfully');
    } catch (error) {
      logger.error('Error processing ORDER_STATUS_UPDATED event:', error);
      throw error;
    }
  },

  // Handle driver events
  'DRIVER_ASSIGNED': async (event) => {
    try {
      logger.info('Processing DRIVER_ASSIGNED event', { 
        orderId: event.orderId, 
        driverId: event.driverId 
      });
      
      // Could notify relevant users about driver assignment
      logger.info('Driver assigned event processed successfully');
    } catch (error) {
      logger.error('Error processing DRIVER_ASSIGNED event:', error);
      throw error;
    }
  },

  // Default handler for unknown events
  'DEFAULT': async (event) => {
    logger.info('Received unknown event type', { type: event.type });
  }
};

// Process incoming messages
const processMessage = async (topic, partition, message) => {
  try {
    const eventData = JSON.parse(message.value.toString());
    const eventType = eventData.type;
    
    logger.info('Processing message', {
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
    
    logger.info('Message processed successfully', {
      topic,
      partition,
      offset: message.offset,
      eventType
    });

  } catch (error) {
    logger.error('Error processing message:', {
      topic,
      partition,
      offset: message.offset,
      error: error.message
    });
    
    // In a production environment, you might want to:
    // - Send to dead letter queue
    // - Retry with exponential backoff
    // - Alert monitoring systems
    throw error;
  }
};

// Start consuming messages
const startConsumer = async (topics = ['order-events', 'driver-events', 'tracking-events']) => {
  try {
    if (!isConnected) {
      await connectConsumer();
    }

    // Subscribe to topics
    await consumer.subscribe({ 
      topics,
      fromBeginning: false 
    });

    // Start consuming
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await processMessage(topic, partition, message);
      },
    });

    logger.info('Kafka consumer started successfully', { topics });

  } catch (error) {
    logger.error('Failed to start Kafka consumer:', error);
    throw error;
  }
};

// Handle consumer events
consumer.on('consumer.connect', () => {
  logger.info('Kafka consumer connected');
});

consumer.on('consumer.disconnect', () => {
  logger.info('Kafka consumer disconnected');
  isConnected = false;
});

consumer.on('consumer.group_join', (event) => {
  logger.info('Consumer joined group:', event);
});

consumer.on('consumer.crash', (event) => {
  logger.error('Consumer crashed:', event);
});

consumer.on('consumer.rebalancing', () => {
  logger.info('Consumer rebalancing...');
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down Kafka consumer...');
  await disconnectConsumer();
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
  connectConsumer,
  disconnectConsumer,
  startConsumer,
  consumer,
  isConnected: () => isConnected
};