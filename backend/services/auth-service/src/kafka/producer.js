const { Kafka } = require('kafkajs');
const { logger } = require('../database/connection');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'auth-service',
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
    logger.info('Kafka producer connected successfully');
  } catch (error) {
    logger.error('Failed to connect Kafka producer:', error);
    isConnected = false;
  }
};

// Disconnect from Kafka
const disconnectProducer = async () => {
  try {
    await producer.disconnect();
    isConnected = false;
    logger.info('Kafka producer disconnected');
  } catch (error) {
    logger.error('Error disconnecting Kafka producer:', error);
  }
};

// Publish event to Kafka topic
const publishEvent = async (topic, message, key = null) => {
  try {
    if (!isConnected) {
      logger.warn('Kafka producer not connected, attempting to reconnect...');
      await connectProducer();
    }

    const kafkaMessage = {
      topic,
      messages: [{
        key: key,
        value: JSON.stringify(message),
        timestamp: Date.now().toString(),
        headers: {
          'content-type': 'application/json',
          'service': 'auth-service',
          'event-id': generateEventId()
        }
      }]
    };

    const result = await producer.send(kafkaMessage);
    
    logger.info('Event published successfully', {
      topic,
      partition: result[0].partition,
      offset: result[0].baseOffset,
      eventType: message.type
    });

    return result;

  } catch (error) {
    logger.error('Failed to publish event to Kafka:', {
      topic,
      error: error.message,
      eventType: message.type
    });
    
    // If it's a connection error, try to reconnect
    if (error.type === 'KAFKA_CONNECTION_ERROR') {
      isConnected = false;
    }
    
    throw error;
  }
};

// Generate unique event ID
const generateEventId = () => {
  return `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Publish user events
const publishUserEvent = async (eventType, userId, additionalData = {}) => {
  const event = {
    type: eventType,
    userId,
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    ...additionalData
  };

  return publishEvent('user-events', event, userId.toString());
};

// Handle producer errors
producer.on('producer.connect', () => {
  logger.info('Kafka producer connected');
});

producer.on('producer.disconnect', () => {
  logger.info('Kafka producer disconnected');
  isConnected = false;
});

producer.on('producer.network.request_timeout', (payload) => {
  logger.warn('Kafka producer request timeout:', payload);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down Kafka producer...');
  await disconnectProducer();
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
  connectProducer,
  disconnectProducer,
  publishEvent,
  publishUserEvent,
  producer,
  isConnected: () => isConnected
};