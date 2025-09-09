const { logger } = require('../database/connection');

class BaseAdapter {
  constructor(adapterName) {
    this.adapterName = adapterName;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
  }

  async initialize() {
    try {
      await this.connect();
      this.isConnected = true;
      this.retryAttempts = 0;
      logger.info(`${this.adapterName} adapter initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize ${this.adapterName} adapter:`, error);
      this.scheduleRetry();
    }
  }

  async connect() {
    throw new Error('connect() method must be implemented by subclass');
  }

  async disconnect() {
    this.isConnected = false;
    logger.info(`${this.adapterName} adapter disconnected`);
  }

  scheduleRetry() {
    if (this.retryAttempts < this.maxRetries) {
      const delay = Math.pow(2, this.retryAttempts) * 1000; // Exponential backoff
      this.retryAttempts++;
      
      setTimeout(() => {
        logger.info(`Retrying ${this.adapterName} adapter connection (attempt ${this.retryAttempts})`);
        this.initialize();
      }, delay);
    } else {
      logger.error(`${this.adapterName} adapter failed after ${this.maxRetries} attempts`);
    }
  }

  async healthCheck() {
    return {
      healthy: this.isConnected,
      adapter: this.adapterName,
      retryAttempts: this.retryAttempts
    };
  }

  // Circuit breaker pattern implementation
  async executeWithCircuitBreaker(operation, ...args) {
    if (!this.isConnected) {
      throw new Error(`${this.adapterName} adapter is not connected`);
    }

    try {
      return await operation(...args);
    } catch (error) {
      logger.error(`${this.adapterName} operation failed:`, error);
      
      // Implement circuit breaker logic here
      // On repeated failures, trip the circuit breaker
      
      throw error;
    }
  }

  // Retry mechanism for individual operations
  async executeWithRetry(operation, maxRetries = 3, ...args) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation(...args);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = Math.pow(2, attempt) * 100;
        logger.warn(`Retrying ${this.adapterName} operation in ${delay}ms (attempt ${attempt})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

module.exports = BaseAdapter;