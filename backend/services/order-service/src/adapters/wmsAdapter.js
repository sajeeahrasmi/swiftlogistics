// const net = require('net');
// const BaseAdapter = require('./BaseAdapter');
// const { logger } = require('../database/connection');

// class WMSAdapter extends BaseAdapter {
//   constructor() {
//     super('WMS');
//     this.host = process.env.WMS_HOST || 'localhost';
//     this.port = parseInt(process.env.WMS_PORT) || 3005;
//     this.timeout = parseInt(process.env.WMS_TIMEOUT) || 10000;
//     this.reconnectDelay = 5000;
//     this.socket = null;
//     this.messageQueue = [];
//     this.pendingRequests = new Map();
//     this.requestId = 1;
//     this.connectionRetries = 0;
//     this.maxConnectionRetries = 10;
//   }

//   async connect() {
//     return new Promise((resolve, reject) => {
//       try {
//         logger.info(`Connecting to WMS at ${this.host}:${this.port}`);

//         this.socket = net.createConnection({
//           host: this.host,
//           port: this.port
//         });

//         this.socket.setTimeout(this.timeout);

//         // Set up event handlers
//         this.socket.on('connect', () => {
//           this.isConnected = true;
//           this.connectionRetries = 0;
//           logger.info('WMS TCP connection established successfully');
//           this.processMessageQueue();
//           resolve(true);
//         });

//         this.socket.on('data', (data) => {
//           this.handleIncomingData(data);
//         });

//         this.socket.on('error', (error) => {
//           logger.error('WMS socket error:', error.message);
//           this.handleConnectionError(error);
//           reject(error);
//         });

//         this.socket.on('timeout', () => {
//           logger.error('WMS socket timeout');
//           this.handleConnectionError(new Error('Connection timeout'));
//           reject(new Error('Connection timeout'));
//         });

//         this.socket.on('close', (hadError) => {
//           logger.warn(`WMS connection closed ${hadError ? 'with error' : 'gracefully'}`);
//           this.isConnected = false;
//           this.scheduleReconnect();
//         });

//         // Set up heartbeat
//         this.setupHeartbeat();

//       } catch (error) {
//         logger.error('Failed to create WMS connection:', error);
//         reject(error);
//       }
//     });
//   }

//   async disconnect() {
//     if (this.socket) {
//       this.socket.destroy();
//       this.socket = null;
//     }
//     this.isConnected = false;
//     clearInterval(this.heartbeatInterval);
//     logger.info('WMS adapter disconnected');
//   }

//   setupHeartbeat() {
//     // Send heartbeat every 30 seconds to keep connection alive
//     this.heartbeatInterval = setInterval(() => {
//       if (this.isConnected) {
//         this.sendMessage({
//           type: 'heartbeat',
//           timestamp: Date.now()
//         }).catch(error => {
//           logger.warn('WMS heartbeat failed:', error.message);
//         });
//       }
//     }, 30000);
//   }

//   // Send message to WMS
//   async sendMessage(message) {
//     if (!this.isConnected) {
//       throw new Error('WMS connection not established');
//     }

//     return new Promise((resolve, reject) => {
//       try {
//         const messageId = this.requestId++;
//         const messageWithId = {
//           ...message,
//           messageId,
//           timestamp: Date.now()
//         };

//         const messageString = this.encodeMessage(messageWithId);
        
//         this.pendingRequests.set(messageId, {
//           resolve,
//           reject,
//           timestamp: Date.now(),
//           message: message
//         });

//         this.socket.write(messageString + '\n', (error) => {
//           if (error) {
//             this.pendingRequests.delete(messageId);
//             reject(error);
//           }
//         });

//         // Set timeout for response
//         setTimeout(() => {
//           if (this.pendingRequests.has(messageId)) {
//             this.pendingRequests.delete(messageId);
//             reject(new Error('WMS response timeout'));
//           }
//         }, this.timeout);

//       } catch (error) {
//         reject(error);
//       }
//     });
//   }

//   // Handle incoming data from WMS
//   handleIncomingData(data) {
//     try {
//       const messages = data.toString().split('\n').filter(msg => msg.trim());
      
//       for (const message of messages) {
//         try {
//           const parsedMessage = this.decodeMessage(message);
          
//           if (parsedMessage.messageId && this.pendingRequests.has(parsedMessage.messageId)) {
//             // This is a response to a pending request
//             const pendingRequest = this.pendingRequests.get(parsedMessage.messageId);
//             this.pendingRequests.delete(parsedMessage.messageId);

//             if (parsedMessage.status === 'success') {
//               pendingRequest.resolve(parsedMessage);
//             } else {
//               pendingRequest.reject(new Error(parsedMessage.error || 'WMS operation failed'));
//             }
//           } else if (parsedMessage.type === 'event') {
//             // This is an unsolicited event from WMS
//             this.handleWmsEvent(parsedMessage);
//           } else if (parsedMessage.type === 'heartbeat_ack') {
//             // Heartbeat acknowledgement
//             logger.debug('WMS heartbeat acknowledged');
//           }

//         } catch (parseError) {
//           logger.error('Failed to parse WMS message:', parseError, 'Raw message:', message);
//         }
//       }
//     } catch (error) {
//       logger.error('Error handling WMS incoming data:', error);
//     }
//   }

//   // Handle WMS events (package scanned, loaded, etc.)
//   handleWmsEvent(event) {
//     logger.info('Received WMS event:', event);
    
//     // Publish event to Kafka for other services
//     const { publishEvent } = require('../kafka/producer');
    
//     try {
//       let kafkaEventType;
//       let kafkaEventData = {};

//       switch (event.eventType) {
//         case 'package_received':
//           kafkaEventType = 'PACKAGE_RECEIVED';
//           kafkaEventData = {
//             orderId: event.orderId,
//             trackingNumber: event.trackingNumber,
//             timestamp: event.timestamp,
//             location: event.location
//           };
//           break;

//         case 'package_scanned':
//           kafkaEventType = 'PACKAGE_SCANNED';
//           kafkaEventData = {
//             orderId: event.orderId,
//             trackingNumber: event.trackingNumber,
//             scannerId: event.scannerId,
//             timestamp: event.timestamp
//           };
//           break;

//         case 'package_loaded':
//           kafkaEventType = 'PACKAGE_LOADED';
//           kafkaEventData = {
//             orderId: event.orderId,
//             trackingNumber: event.trackingNumber,
//             vehicleId: event.vehicleId,
//             driverId: event.driverId,
//             timestamp: event.timestamp
//           };
//           break;

//         case 'inventory_updated':
//           kafkaEventType = 'INVENTORY_UPDATED';
//           kafkaEventData = {
//             warehouseId: event.warehouseId,
//             itemCount: event.itemCount,
//             timestamp: event.timestamp
//           };
//           break;

//         default:
//           logger.warn('Unknown WMS event type:', event.eventType);
//           return;
//       }

//       publishEvent('wms-events', {
//         type: kafkaEventType,
//         ...kafkaEventData,
//         source: 'wms-adapter'
//       }).catch(kafkaError => {
//         logger.error('Failed to publish WMS event to Kafka:', kafkaError);
//       });

//     } catch (error) {
//       logger.error('Error processing WMS event:', error);
//     }
//   }

//   // Create warehouse intake request
//   async createIntakeRequest(intakeData) {
//     return this.executeWithCircuitBreaker(async () => {
//       try {
//         const message = {
//           type: 'create_intake',
//           orderId: intakeData.orderId,
//           clientId: intakeData.clientId,
//           clientName: intakeData.clientName,
//           items: intakeData.items,
//           scheduledPickupTime: intakeData.scheduledPickupTime,
//           priority: intakeData.priority,
//           requireAcknowledgement: true
//         };

//         const response = await this.sendMessage(message);

//         if (response.status === 'success') {
//           return {
//             success: true,
//             referenceId: response.referenceId,
//             trackingNumber: response.trackingNumber,
//             estimatedProcessingTime: response.estimatedProcessingTime,
//             warehouseLocation: response.warehouseLocation
//           };
//         }

//         throw new Error(response.error || 'Intake creation failed');

//       } catch (error) {
//         logger.error('WMS createIntakeRequest failed:', error.message);
//         throw new Error(`WMS intake creation failed: ${error.message}`);
//       }
//     });
//   }

//   // Get package status from WMS
//   async getPackageStatus(trackingNumber) {
//     return this.executeWithCircuitBreaker(async () => {
//       try {
//         const message = {
//           type: 'get_status',
//           trackingNumber: trackingNumber,
//           requireAcknowledgement: true
//         };

//         const response = await this.sendMessage(message);

//         if (response.status === 'success') {
//           return {
//             success: true,
//             trackingNumber: response.trackingNumber,
//             status: response.status,
//             location: response.location,
//             lastScanTime: response.lastScanTime,
//             estimatedNextScan: response.estimatedNextScan,
//             history: response.history || []
//           };
//         }

//         throw new Error(response.error || 'Status query failed');

//       } catch (error) {
//         logger.error('WMS getPackageStatus failed:', error.message);
//         throw new Error(`WMS status query failed: ${error.message}`);
//       }
//     });
//   }

//   // Update package information
//   async updatePackageInfo(updateData) {
//     return this.executeWithCircuitBreaker(async () => {
//       try {
//         const message = {
//           type: 'update_package',
//           trackingNumber: updateData.trackingNumber,
//           updates: updateData.updates,
//           requireAcknowledgement: true
//         };

//         const response = await this.sendMessage(message);

//         if (response.status === 'success') {
//           return {
//             success: true,
//             trackingNumber: response.trackingNumber,
//             updatedFields: response.updatedFields
//           };
//         }

//         throw new Error(response.error || 'Package update failed');

//       } catch (error) {
//         logger.error('WMS updatePackageInfo failed:', error.message);
//         throw new Error(`WMS package update failed: ${error.message}`);
//       }
//     });
//   }

//   // Get warehouse inventory
//   async getInventory(warehouseId = 'main') {
//     return this.executeWithCircuitBreaker(async () => {
//       try {
//         const message = {
//           type: 'get_inventory',
//           warehouseId: warehouseId,
//           requireAcknowledgement: true
//         };

//         const response = await this.sendMessage(message);

//         if (response.status === 'success') {
//           return {
//             success: true,
//             warehouseId: response.warehouseId,
//             totalItems: response.totalItems,
//             capacity: response.capacity,
//             categories: response.categories,
//             lastUpdated: response.lastUpdated
//           };
//         }

//         throw new Error(response.error || 'Inventory query failed');

//       } catch (error) {
//         logger.error('WMS getInventory failed:', error.message);
//         throw new Error(`WMS inventory query failed: ${error.message}`);
//       }
//     });
//   }

//   // Encode message to WMS protocol format
//   encodeMessage(message) {
//     // WMS uses a simple JSON-based protocol over TCP
//     return JSON.stringify(message);
//   }

//   // Decode message from WMS protocol format
//   decodeMessage(messageString) {
//     try {
//       return JSON.parse(messageString);
//     } catch (error) {
//       throw new Error(`Invalid WMS message format: ${error.message}`);
//     }
//   }

//   // Handle connection errors
//   handleConnectionError(error) {
//     this.isConnected = false;
//     this.scheduleReconnect();
    
//     // Reject all pending requests
//     for (const [messageId, request] of this.pendingRequests) {
//       request.reject(new Error(`WMS connection lost: ${error.message}`));
//       this.pendingRequests.delete(messageId);
//     }
//   }

//   // Schedule reconnection attempt
//   scheduleReconnect() {
//     if (this.connectionRetries < this.maxConnectionRetries) {
//       const delay = Math.pow(2, this.connectionRetries) * 1000;
//       this.connectionRetries++;
      
//       setTimeout(() => {
//         logger.info(`Attempting WMS reconnection (attempt ${this.connectionRetries})`);
//         this.connect().catch(error => {
//           logger.error(`WMS reconnection attempt ${this.connectionRetries} failed:`, error.message);
//         });
//       }, delay);
//     } else {
//       logger.error('Max WMS reconnection attempts reached');
//     }
//   }

//   // Process queued messages when connection is restored
//   processMessageQueue() {
//     while (this.messageQueue.length > 0 && this.isConnected) {
//       const queuedMessage = this.messageQueue.shift();
//       this.sendMessage(queuedMessage.message)
//         .then(queuedMessage.resolve)
//         .catch(queuedMessage.reject);
//     }
//   }

//   // Health check with connection status
//   async healthCheck() {
//     const baseHealth = await super.healthCheck();
    
//     return {
//       ...baseHealth,
//       details: {
//         host: this.host,
//         port: this.port,
//         connected: this.isConnected,
//         pendingRequests: this.pendingRequests.size,
//         queuedMessages: this.messageQueue.length,
//         connectionRetries: this.connectionRetries
//       }
//     };
//   }

//   // Get connection statistics
//   getConnectionStats() {
//     return {
//       isConnected: this.isConnected,
//       pendingRequests: this.pendingRequests.size,
//       queuedMessages: this.messageQueue.length,
//       connectionRetries: this.connectionRetries,
//       totalMessagesSent: this.requestId - 1
//     };
//   }

//   // Emergency manual reconnect
//   async manualReconnect() {
//     logger.info('Manual WMS reconnection initiated');
//     this.connectionRetries = 0;
//     await this.disconnect();
//     return this.connect();
//   }
// }

// // Create singleton instance
// const wmsAdapter = new WMSAdapter();

// // Initialize on module load
// wmsAdapter.initialize().catch(error => {
//   logger.error('WMS adapter auto-initialization failed:', error);
// });

// module.exports = wmsAdapter;

const BaseAdapter = require('./BaseAdapter');
const { logger } = require('../database/connection');

class WMSAdapter extends BaseAdapter {
  constructor() {
    super('WMS');
    this.isConnected = true;
  }

  async connect() {
    logger.info('WMS adapter connected (mock)');
    return true;
  }

  async createIntakeRequest(intakeData) {
    // Mock intake creation
    logger.info('Mock WMS intake creation', { orderId: intakeData.orderId });
    return {
      success: true,
      referenceId: `WMS-${Date.now()}`,
      trackingNumber: `TRK-${Date.now()}`,
      estimatedProcessingTime: '30 minutes'
    };
  }

  async healthCheck() {
    return {
      healthy: this.isConnected,
      adapter: 'WMS',
      details: { type: 'mock' }
    };
  }

  isConnected() {
    return this.isConnected;
  }
}

// Create singleton instance
const wmsAdapter = new WMSAdapter();

// Initialize on module load
wmsAdapter.initialize().catch(error => {
  logger.error('WMS adapter auto-initialization failed:', error);
});

// Export both the instance and the functions
module.exports = {
  wmsAdapter,
  isConnected: () => wmsAdapter.isConnected,
  healthCheck: () => wmsAdapter.healthCheck(),
  // createIntakeRequest: (intakeData) => wmsAdapter.createIntakeRequest(intakeData),
  createIntakeRequest: (intakeData) => wmsAdapter.createIntakeRequest(intakeData),
};