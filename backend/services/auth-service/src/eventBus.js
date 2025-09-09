const EventEmitter = require('events');
const { logger } = require('./database/connection');

// In-memory event bus as fallback when Kafka is not available
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.maxListeners = 100;
    this.eventHistory = [];
    this.maxHistorySize = 1000;
    
    logger.info('EventBus initialized as fallback event system');
  }

  // Publish an event
  publish(topic, event, key = null) {
    try {
      const eventData = {
        topic,
        key,
        event: {
          ...event,
          timestamp: event.timestamp || new Date().toISOString(),
          eventId: this.generateEventId()
        },
        publishedAt: new Date().toISOString()
      };

      // Add to history
      this.addToHistory(eventData);

      // Emit the event
      this.emit(topic, eventData.event);
      this.emit('*', eventData); // Wildcard listener

      logger.info('Event published via EventBus', {
        topic,
        eventType: event.type,
        eventId: eventData.event.eventId
      });

      return Promise.resolve(eventData);

    } catch (error) {
      logger.error('Error publishing event via EventBus:', error);
      return Promise.reject(error);
    }
  }

  // Subscribe to events
  subscribe(topic, handler) {
    try {
      this.on(topic, handler);
      logger.info(`Subscribed to topic: ${topic}`);
      
      return () => {
        this.off(topic, handler);
        logger.info(`Unsubscribed from topic: ${topic}`);
      };
    } catch (error) {
      logger.error(`Error subscribing to topic ${topic}:`, error);
      throw error;
    }
  }

  // Subscribe to all events
  subscribeToAll(handler) {
    try {
      this.on('*', handler);
      logger.info('Subscribed to all events');
      
      return () => {
        this.off('*', handler);
        logger.info('Unsubscribed from all events');
      };
    } catch (error) {
      logger.error('Error subscribing to all events:', error);
      throw error;
    }
  }

  // Add event to history
  addToHistory(eventData) {
    this.eventHistory.push(eventData);
    
    // Keep history size under control
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  // Get event history
  getEventHistory(topic = null, limit = 100) {
    let history = this.eventHistory;
    
    if (topic) {
      history = history.filter(event => event.topic === topic);
    }
    
    return history.slice(-limit);
  }

  // Generate unique event ID
  generateEventId() {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get statistics
  getStats() {
    return {
      totalEvents: this.eventHistory.length,
      activeListeners: this.eventNames().length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // Clear history
  clearHistory() {
    this.eventHistory = [];
    logger.info('Event history cleared');
  }
}

// Create singleton instance
const eventBus = new EventBus();

// User event helpers
const publishUserEvent = async (eventType, userId, additionalData = {}) => {
  const event = {
    type: eventType,
    userId,
    service: 'auth-service',
    ...additionalData
  };

  return eventBus.publish('user-events', event, userId.toString());
};

// Generic event publisher
const publishEvent = async (topic, event, key = null) => {
  return eventBus.publish(topic, event, key);
};

// Setup default event handlers for auth service
const setupDefaultHandlers = () => {
  // Log all events for debugging
  eventBus.subscribeToAll((eventData) => {
    logger.debug('Event received via EventBus', {
      topic: eventData.topic,
      eventType: eventData.event.type,
      eventId: eventData.event.eventId
    });
  });

  // Handle user events
  eventBus.subscribe('user-events', (event) => {
    logger.info('User event processed', {
      type: event.type,
      userId: event.userId
    });
  });

  // Handle order events
  eventBus.subscribe('order-events', (event) => {
    logger.info('Order event received in auth service', {
      type: event.type,
      orderId: event.orderId
    });
  });

  logger.info('Default EventBus handlers set up');
};

// Initialize default handlers
setupDefaultHandlers();

// Health check
const isHealthy = () => {
  try {
    const stats = eventBus.getStats();
    return {
      healthy: true,
      stats,
      type: 'in-memory'
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      type: 'in-memory'
    };
  }
};

module.exports = {
  eventBus,
  publishEvent,
  publishUserEvent,
  subscribe: eventBus.subscribe.bind(eventBus),
  subscribeToAll: eventBus.subscribeToAll.bind(eventBus),
  getEventHistory: eventBus.getEventHistory.bind(eventBus),
  getStats: eventBus.getStats.bind(eventBus),
  clearHistory: eventBus.clearHistory.bind(eventBus),
  isHealthy
};