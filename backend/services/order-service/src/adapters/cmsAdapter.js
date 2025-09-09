// const axios = require('axios');
// const xml2js = require('xml2js');
// const BaseAdapter = require('./BaseAdapter');
// const { logger } = require('../database/connection');

// class CMSAdapter extends BaseAdapter {
//   constructor() {
//     super('CMS');
//     this.baseURL = process.env.CMS_BASE_URL || 'http://localhost:3003';
//     this.username = process.env.CMS_USERNAME || 'admin';
//     this.password = process.env.CMS_PASSWORD || 'password';
//     this.timeout = parseInt(process.env.CMS_TIMEOUT) || 10000;
//     this.clientCache = new Map();
//   }

//   async connect() {
//     try {
//       // Test connection to CMS SOAP service
//       const response = await axios.post(
//         `${this.baseURL}/wsdl`,
//         this.buildSoapRequest('ping', {}),
//         {
//           headers: {
//             'Content-Type': 'text/xml',
//             'SOAPAction': 'ping'
//           },
//           timeout: this.timeout
//         }
//       );

//       const result = await this.parseSoapResponse(response.data);
      
//       if (result && result.pingResponse) {
//         this.isConnected = true;
//         logger.info('CMS SOAP service connected successfully');
//         return true;
//       }
      
//       throw new Error('Invalid response from CMS service');
      
//     } catch (error) {
//       logger.error('CMS connection failed:', error.message);
//       throw error;
//     }
//   }

//   // Validate order with CMS (contract validation, billing, etc.)
//   async validateOrder(orderData) {
//     return this.executeWithCircuitBreaker(async () => {
//       try {
//         const soapRequest = this.buildSoapRequest('validateOrder', {
//           orderId: orderData.orderId,
//           clientId: orderData.clientId,
//           clientName: orderData.clientName,
//           orderValue: orderData.orderValue,
//           priority: orderData.priority,
//           pickupAddress: orderData.pickupAddress,
//           deliveryAddress: orderData.deliveryAddress
//         });

//         const response = await axios.post(
//           `${this.baseURL}/wsdl`,
//           soapRequest,
//           {
//             headers: {
//               'Content-Type': 'text/xml',
//               'SOAPAction': 'validateOrder'
//             },
//             timeout: this.timeout,
//             auth: {
//               username: this.username,
//               password: this.password
//             }
//           }
//         );

//         const result = await this.parseSoapResponse(response.data);
        
//         if (result && result.validateOrderResponse) {
//           const responseData = result.validateOrderResponse;
          
//           return {
//             success: true,
//             referenceId: responseData.referenceId[0],
//             contractId: responseData.contractId[0],
//             isValid: responseData.isValid[0] === 'true',
//             message: responseData.message[0],
//             creditLimit: parseFloat(responseData.creditLimit[0]),
//             currentBalance: parseFloat(responseData.currentBalance[0])
//           };
//         }
        
//         throw new Error('Invalid response format from CMS');
        
//       } catch (error) {
//         logger.error('CMS validateOrder failed:', error.message);
//         throw new Error(`CMS validation failed: ${error.message}`);
//       }
//     });
//   }

//   // Get client details from CMS
//   async getClientDetails(clientId) {
//     // Check cache first
//     if (this.clientCache.has(clientId)) {
//       const cached = this.clientCache.get(clientId);
//       if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
//         return cached.data;
//       }
//     }

//     return this.executeWithCircuitBreaker(async () => {
//       try {
//         const soapRequest = this.buildSoapRequest('getClientDetails', { clientId });

//         const response = await axios.post(
//           `${this.baseURL}/wsdl`,
//           soapRequest,
//           {
//             headers: {
//               'Content-Type': 'text/xml',
//               'SOAPAction': 'getClientDetails'
//             },
//             timeout: this.timeout,
//             auth: {
//               username: this.username,
//               password: this.password
//             }
//           }
//         );

//         const result = await this.parseSoapResponse(response.data);
        
//         if (result && result.getClientDetailsResponse) {
//           const responseData = result.getClientDetailsResponse;
//           const clientData = {
//             clientId: responseData.clientId[0],
//             companyName: responseData.companyName[0],
//             contactEmail: responseData.contactEmail[0],
//             contactPhone: responseData.contactPhone[0],
//             contractId: responseData.contractId[0],
//             creditLimit: parseFloat(responseData.creditLimit[0]),
//             currentBalance: parseFloat(responseData.currentBalance[0]),
//             paymentTerms: responseData.paymentTerms[0],
//             isActive: responseData.isActive[0] === 'true'
//           };

//           // Cache the result
//           this.clientCache.set(clientId, {
//             data: clientData,
//             timestamp: Date.now()
//           });

//           return clientData;
//         }
        
//         throw new Error('Invalid response format from CMS');
        
//       } catch (error) {
//         logger.error('CMS getClientDetails failed:', error.message);
//         throw new Error(`Failed to get client details: ${error.message}`);
//       }
//     });
//   }

//   // Create invoice in CMS
//   async createInvoice(orderData, amount) {
//     return this.executeWithCircuitBreaker(async () => {
//       try {
//         const soapRequest = this.buildSoapRequest('createInvoice', {
//           orderId: orderData.orderId,
//           clientId: orderData.clientId,
//           amount: amount,
//           description: `Delivery service for order ${orderData.orderId}`,
//           dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
//         });

//         const response = await axios.post(
//           `${this.baseURL}/wsdl`,
//           soapRequest,
//           {
//             headers: {
//               'Content-Type': 'text/xml',
//               'SOAPAction': 'createInvoice'
//             },
//             timeout: this.timeout,
//             auth: {
//               username: this.username,
//               password: this.password
//             }
//           }
//         );

//         const result = await this.parseSoapResponse(response.data);
        
//         if (result && result.createInvoiceResponse) {
//           const responseData = result.createInvoiceResponse;
          
//           return {
//             success: true,
//             invoiceId: responseData.invoiceId[0],
//             invoiceNumber: responseData.invoiceNumber[0],
//             amount: parseFloat(responseData.amount[0]),
//             dueDate: responseData.dueDate[0]
//           };
//         }
        
//         throw new Error('Invalid response format from CMS');
        
//       } catch (error) {
//         logger.error('CMS createInvoice failed:', error.message);
//         throw new Error(`Failed to create invoice: ${error.message}`);
//       }
//     });
//   }

//   // Build SOAP request envelope
//   buildSoapRequest(operation, parameters) {
//     const builder = new xml2js.Builder({
//       xmldec: { version: '1.0', encoding: 'UTF-8' },
//       renderOpts: { pretty: false }
//     });

//     const soapBody = {
//       [operation]: {
//         $: { xmlns: 'http://swiftlogistics.com/cms' },
//         ...this.convertParametersToXml(parameters)
//       }
//     };

//     const soapEnvelope = {
//       'soap:Envelope': {
//         $: {
//           'xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
//           'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
//           'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema'
//         },
//         'soap:Body': soapBody
//       }
//     };

//     return builder.buildObject(soapEnvelope);
//   }

//   // Convert JavaScript object to XML structure
//   convertParametersToXml(params) {
//     const xmlParams = {};
    
//     for (const [key, value] of Object.entries(params)) {
//       if (value !== null && value !== undefined) {
//         xmlParams[key] = [value.toString()];
//       }
//     }
    
//     return xmlParams;
//   }

//   // Parse SOAP response
//   async parseSoapResponse(xmlResponse) {
//     try {
//       const parser = new xml2js.Parser({
//         explicitArray: true,
//         ignoreAttrs: true,
//         tagNameProcessors: [xml2js.processors.stripPrefix]
//       });

//       return new Promise((resolve, reject) => {
//         parser.parseString(xmlResponse, (err, result) => {
//           if (err) {
//             reject(new Error(`Failed to parse SOAP response: ${err.message}`));
//           } else {
//             // Extract the actual response from SOAP envelope
//             const body = result.Envelope?.Body?.[0];
//             if (body) {
//               resolve(body);
//             } else {
//               reject(new Error('Invalid SOAP response structure'));
//             }
//           }
//         });
//       });
//     } catch (error) {
//       throw new Error(`SOAP response parsing failed: ${error.message}`);
//     }
//   }

//   // Health check with detailed status
//   async healthCheck() {
//     const baseHealth = await super.healthCheck();
    
//     try {
//       const startTime = Date.now();
//       const response = await axios.post(
//         `${this.baseURL}/wsdl`,
//         this.buildSoapRequest('ping', {}),
//         {
//           headers: {
//             'Content-Type': 'text/xml',
//             'SOAPAction': 'ping'
//           },
//           timeout: 5000
//         }
//       );
      
//       const responseTime = Date.now() - startTime;
//       const result = await this.parseSoapResponse(response.data);
      
//       return {
//         ...baseHealth,
//         responseTime,
//         details: {
//           endpoint: this.baseURL,
//           operation: 'ping',
//           status: result ? 'operational' : 'degraded'
//         }
//       };
//     } catch (error) {
//       return {
//         ...baseHealth,
//         healthy: false,
//         details: {
//           endpoint: this.baseURL,
//           error: error.message,
//           status: 'offline'
//         }
//       };
//     }
//   }

//   // Clear client cache
//   clearCache() {
//     this.clientCache.clear();
//     logger.info('CMS client cache cleared');
//   }

//   // Get cache statistics
//   getCacheStats() {
//     return {
//       size: this.clientCache.size,
//       entries: Array.from(this.clientCache.entries()).map(([key, value]) => ({
//         clientId: key,
//         age: Date.now() - value.timestamp
//       }))
//     };
//   }
// }

// // Create singleton instance
// const cmsAdapter = new CMSAdapter();

// // Initialize on module load
// cmsAdapter.initialize().catch(error => {
//   logger.error('CMS adapter auto-initialization failed:', error);
// });

// module.exports = cmsAdapter;


const BaseAdapter = require('./BaseAdapter');
const { logger } = require('../database/connection');

class CMSAdapter extends BaseAdapter {
  constructor() {
    super('CMS');
    this.isConnected = true; // Mock connection
  }

  async connect() {
    // Mock connection
    logger.info('CMS adapter connected (mock)');
    return true;
  }

  async validateOrder(orderData) {
    // Mock validation - always successful
    logger.info('Mock CMS order validation', { orderId: orderData.orderId });
    return {
      success: true,
      referenceId: `CMS-${Date.now()}`,
      contractId: `CONTRACT-${orderData.clientId}`,
      isValid: true,
      message: 'Validation successful'
    };
  }

  async healthCheck() {
    return {
      healthy: this.isConnected,
      adapter: 'CMS',
      details: { type: 'mock' }
    };
  }

  // Add this function
  isConnected() {
    return this.isConnected;
  }
}

// Create singleton instance
const cmsAdapter = new CMSAdapter();

// Initialize on module load
cmsAdapter.initialize().catch(error => {
  logger.error('CMS adapter auto-initialization failed:', error);
});

// Export both the instance and the functions
module.exports = {
  cmsAdapter,
  isConnected: () => cmsAdapter.isConnected,
  healthCheck: () => cmsAdapter.healthCheck(),
  validateOrder: (orderData) => cmsAdapter.validateOrder(orderData),
};