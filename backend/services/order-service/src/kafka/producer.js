const { Kafka } = require('kafkajs');
const { logger } = require('../database/connection');
const eventBus = require('../eventBus');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
  connectionTimeout: 3000,
  authenticationTimeout: 1000,
  reauthenticationThreshold: 10000,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000,
});

let isConnected = false;

// Connect to Kafka
const connectProducer = async () => {
  try {
    await producer.connect();
    isConnected = true;
    logger.info('Kafka producer connected successfully for order service');
  } catch (error) {
    logger.error('Failed to connect Kafka producer for order service:', error);
    isConnected = false;
  }
};

// Disconnect from Kafka
const disconnectProducer = async () => {
  try {
    await producer.disconnect();
    isConnected = false;
    logger.info('Kafka producer disconnected for order service');
  } catch (error) {
    logger.error('Error disconnecting Kafka producer for order service:', error);
  }
};

// Publish event to Kafka topic with fallback to event bus
const publishEvent = async (topic, message, key = null) => {
  try {
    if (!isConnected) {
      logger.warn('Kafka producer not connected, using event bus fallback');
      return eventBus.publish(topic, message);
    }

    const kafkaMessage = {
      topic,
      messages: [{
        key: key,
        value: JSON.stringify(message),
        timestamp: Date.now().toString(),
        headers: {
          'content-type': 'application/json',
          'service': 'order-service',
          'event-id': generateEventId()
        }
      }]
    };

    const result = await producer.send(kafkaMessage);
    
    logger.info('Order event published to Kafka successfully', {
      topic,
      partition: result[0].partition,
      offset: result[0].baseOffset,
      eventType: message.type
    });

    return result;

  } catch (error) {
    logger.error('Failed to publish order event to Kafka, using event bus:', {
      topic,
      error: error.message,
      eventType: message.type
    });
    
    // Fallback to event bus
    return eventBus.publish(topic, message);
  }
};

// Order-specific event publishing functions
const publishOrderEvent = async (eventType, orderId, additionalData = {}) => {
  const event = {
    type: eventType,
    orderId,
    timestamp: new Date().toISOString(),
    service: 'order-service',
    ...additionalData
  };

  return publishEvent('order-events', event, orderId.toString());
};

const publishOrderCreatedEvent = async (orderId, clientId, createdBy) => {
  return publishOrderEvent('ORDER_CREATED', orderId, {
    clientId,
    createdBy,
    status: 'pending'
  });
};

const publishOrderStatusEvent = async (orderId, oldStatus, newStatus, actor) => {
  return publishOrderEvent('ORDER_STATUS_UPDATED', orderId, {
    oldStatus,
    newStatus,
    actor,
    timestamp: new Date().toISOString()
  });
};

const publishOrderProcessingEvent = async (orderId, stage, status, details = {}) => {
  return publishOrderEvent('ORDER_PROCESSING_UPDATE', orderId, {
    stage,
    status,
    details,
    timestamp: new Date().toISOString()
  });
};

// Generate unique event ID
const generateEventId = () => {
  return `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Handle producer errors
producer.on('producer.connect', () => {
  logger.info('Kafka producer connected for order service');
});

producer.on('producer.disconnect', () => {
  logger.info('Kafka producer disconnected for order service');
  isConnected = false;
});

producer.on('producer.network.request_timeout', (payload) => {
  logger.warn('Kafka producer request timeout for order service:', payload);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down Kafka producer for order service...');
  await disconnectProducer();
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
  connectProducer,
  disconnectProducer,
  publishEvent,
  publishOrderEvent,
  publishOrderCreatedEvent,
  publishOrderStatusEvent,
  publishOrderProcessingEvent,
  producer,
  isConnected: () => isConnected
};