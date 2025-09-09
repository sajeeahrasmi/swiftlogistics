// const EventEmitter = require('events');
// const { logger } = require('./database/connection');

// class OrderEventBus extends EventEmitter {
//   constructor() {
//     super();
//     this.setMaxListeners(50); // Increase limit for potential many listeners
//     this.eventsPublished = 0;
//     this.eventsProcessed = 0;
//     this.connected = true; // EventBus is always "connected" since it's in-memory
//   }

//   // Publish event to the bus
//   publish(eventType, eventData) {
//     try {
//       this.eventsPublished++;
//       const event = {
//         id: `eventbus-${Date.now()}-${this.eventsPublished}`,
//         type: eventType,
//         timestamp: new Date().toISOString(),
//         data: eventData,
//         source: 'order-service-eventbus'
//       };

//       this.emit(eventType, event);
//       this.emit('*', event); // Wildcard listener for all events

//       logger.debug('Event published to event bus:', {
//         eventType,
//         eventId: event.id
//       });

//       return {
//         success: true,
//         eventId: event.id,
//         message: 'Event published to fallback event bus'
//       };

//     } catch (error) {
//       logger.error('Failed to publish event to event bus:', error);
//       return {
//         success: false,
//         error: error.message
//       };
//     }
//   }

//   // Subscribe to event types
//   subscribe(eventTypes, handler) {
//     if (typeof eventTypes === 'string') {
//       eventTypes = [eventTypes];
//     }

//     eventTypes.forEach(eventType => {
//       this.on(eventType, (event) => {
//         this.eventsProcessed++;
//         logger.debug('Event processed by event bus:', {
//           eventType,
//           eventId: event.id
//         });
//         handler(event);
//       });
//     });

//     logger.info(`Subscribed to event types: ${eventTypes.join(', ')}`);
//   }

//   // Subscribe to all events
//   subscribeAll(handler) {
//     this.on('*', (event) => {
//       this.eventsProcessed++;
//       handler(event);
//     });
//     logger.info('Subscribed to all events');
//   }

//   // Get event bus health status
//   isHealthy() {
//     return {
//       healthy: this.connected,
//       type: 'in-memory',
//       eventsPublished: this.eventsPublished,
//       eventsProcessed: this.eventsProcessed,
//       listenerCount: this.listenerCount('*') + Array.from(this.eventNames())
//         .filter(name => name !== '*')
//         .reduce((total, name) => total + this.listenerCount(name), 0)
//     };
//   }

//   // Get statistics
//   getStats() {
//     return {
//       eventsPublished: this.eventsPublished,
//       eventsProcessed: this.eventsProcessed,
//       eventTypes: this.eventNames().filter(name => name !== '*'),
//       totalListeners: this.listenerCount('*') + Array.from(this.eventNames())
//         .filter(name => name !== '*')
//         .reduce((total, name) => total + this.listenerCount(name), 0)
//     };
//   }

//   // Clear all listeners (for testing)
//   clearAllListeners() {
//     super.removeAllListeners();
//     logger.info('All event bus listeners cleared');
//   }

//   // Simulate connection issues for testing
//   simulateConnectionIssue(duration = 5000) {
//     this.connected = false;
//     logger.warn('Event bus connection issue simulated');
    
//     setTimeout(() => {
//       this.connected = true;
//       logger.info('Event bus connection restored');
//     }, duration);
//   }
// }

// // Create singleton instance
// const eventBus = new OrderEventBus();

// // Add error handling to event bus
// eventBus.on('error', (error) => {
//   logger.error('Event bus error:', error);
// });

// module.exports = eventBus;

const EventEmitter = require('events');
const { logger } = require('./database/connection');

class OrderEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this.eventsPublished = 0;
    this.eventsProcessed = 0;
    this.connected = true; // EventBus is always "connected" since it's in-memory
  }

  // Publish event to the bus
  publish(eventType, eventData) {
    try {
      this.eventsPublished++;
      const event = {
        id: `eventbus-${Date.now()}-${this.eventsPublished}`,
        type: eventType,
        timestamp: new Date().toISOString(),
        data: eventData,
        source: 'order-service-eventbus'
      };

      this.emit(eventType, event);
      this.emit('*', event); // Wildcard listener for all events

      logger.debug('Event published to event bus:', {
        eventType,
        eventId: event.id
      });

      return {
        success: true,
        eventId: event.id,
        message: 'Event published to fallback event bus'
      };

    } catch (error) {
      logger.error('Failed to publish event to event bus:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Subscribe to event types
  subscribe(eventTypes, handler) {
    if (typeof eventTypes === 'string') {
      eventTypes = [eventTypes];
    }

    eventTypes.forEach(eventType => {
      this.on(eventType, (event) => {
        this.eventsProcessed++;
        logger.debug('Event processed by event bus:', {
          eventType,
          eventId: event.id
        });
        handler(event);
      });
    });

    logger.info(`Subscribed to event types: ${eventTypes.join(', ')}`);
  }

  // Subscribe to all events
  subscribeAll(handler) {
    this.on('*', (event) => {
      this.eventsProcessed++;
      handler(event);
    });
    logger.info('Subscribed to all events');
  }

  // Get event bus health status
  isHealthy() {
    return {
      healthy: this.connected,
      type: 'in-memory',
      eventsPublished: this.eventsPublished,
      eventsProcessed: this.eventsProcessed,
      listenerCount: this.listenerCount('*') + Array.from(this.eventNames())
        .filter(name => name !== '*')
        .reduce((total, name) => total + this.listenerCount(name), 0)
    };
  }

  // Get statistics
  getStats() {
    return {
      eventsPublished: this.eventsPublished,
      eventsProcessed: this.eventsProcessed,
      eventTypes: this.eventNames().filter(name => name !== '*'),
      totalListeners: this.listenerCount('*') + Array.from(this.eventNames())
        .filter(name => name !== '*')
        .reduce((total, name) => total + this.listenerCount(name), 0)
    };
  }

  // Clear all listeners (for testing)
  clearAllListeners() {
    super.removeAllListeners();
    logger.info('All event bus listeners cleared');
  }

  // Simulate connection issues for testing
  simulateConnectionIssue(duration = 5000) {
    this.connected = false;
    logger.warn('Event bus connection issue simulated');
    
    setTimeout(() => {
      this.connected = true;
      logger.info('Event bus connection restored');
    }, duration);
  }
}

// Create singleton instance
const eventBus = new OrderEventBus();

// Add error handling to event bus
eventBus.on('error', (error) => {
  logger.error('Event bus error:', error);
});

module.exports = eventBus;