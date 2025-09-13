require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import modules
const { testConnection, logger } = require('./database/connection');
const orderRoutes = require('./routes/order');
const clientRoutes = require('./routes/client');
const driverRoutes = require('./routes/driver');
const adminRoutes = require('./routes/admin');
const { connectProducer, isConnected: isKafkaConnected } = require('./kafka/producer');
const { startConsumer } = require('./kafka/consumer');
const { isHealthy: isEventBusHealthy } = require('./eventBus');
const eventBus = require('./eventBus');

// Import adapters
// const { isConnected: isCMSConnected, healthCheck: cmsHealthCheck } = require('./adapters/cmsAdapter');
// const { isConnected: isROSConnected, healthCheck: rosHealthCheck } = require('./adapters/rosAdapter');
// const { isConnected: isWMSConnected, healthCheck: wmsHealthCheck } = require('./adapters/wmsAdapter');

// Import adapters
const cmsAdapter = require('./adapters/cmsAdapter');
const rosAdapter = require('./adapters/rosAdapter');
const wmsAdapter = require('./adapters/wmsAdapter');

const app = express();
const PORT = process.env.ORDER_SERVICE_PORT || 3002;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Add your frontend URLs
  credentials: true
}));
app.use(express.json());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', globalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Order service request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      clientId: req.get('X-Client-ID')
    });
  });
  
  next();
});

// Health check endpoint
// app.get('/health', async (req, res) => {
//   try {
//     const dbHealthy = await testConnection();
//     const kafkaHealthy = isKafkaConnected();
//     const eventBusStatus = isEventBusHealthy();
    
//     // Check external system connections
//     // const cmsHealthy = await cmsHealthCheck();
//     // const rosHealthy = await rosHealthCheck();
//     // const wmsHealthy = await wmsHealthCheck();

//     // Check external system connections
//     const cmsHealthy = await cmsAdapter.healthCheck();
//     const rosHealthy = await rosAdapter.healthCheck();
//     const wmsHealthy = await wmsAdapter.healthCheck();

//     const health = {
//       status: 'healthy',
//       timestamp: new Date().toISOString(),
//       service: 'order-service',
//       version: process.env.npm_package_version || '1.0.0',
//       uptime: process.uptime(),
//       checks: {
//         database: dbHealthy ? 'healthy' : 'unhealthy',
//         kafka: kafkaHealthy ? 'healthy' : 'unhealthy',
//         eventBus: eventBusStatus.healthy ? 'healthy' : 'unhealthy',
//         // cms: cmsHealthy ? 'healthy' : 'unhealthy',
//         // ros: rosHealthy ? 'healthy' : 'unhealthy',
//         // wms: wmsHealthy ? 'healthy' : 'unhealthy'
//         cms: cmsHealthy.healthy ? 'healthy' : 'unhealthy',
//         ros: rosHealthy.healthy ? 'healthy' : 'unhealthy',
//         wms: wmsHealthy.healthy ? 'healthy' : 'unhealthy'
//       }
//     };
    
//     const isHealthy = dbHealthy && (kafkaHealthy || eventBusStatus.healthy) && 
//                      cmsHealthy && rosHealthy && wmsHealthy;
    
//     res.status(isHealthy ? 200 : 503).json(health);
    
//   } catch (error) {
//     logger.error('Order service health check error:', error);
//     res.status(503).json({
//       status: 'unhealthy',
//       timestamp: new Date().toISOString(),
//       service: 'order-service',
//       error: error.message
//     });
//   }
// });

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await testConnection();
    const kafkaHealthy = isKafkaConnected();
    const eventBusStatus = eventBus.isHealthy ? eventBus.isHealthy() : { healthy: false };
    
    // Check external system connections
    const cmsHealthy = await cmsAdapter.healthCheck().catch(() => ({ healthy: false }));
    const rosHealthy = await rosAdapter.healthCheck().catch(() => ({ healthy: false }));
    const wmsHealthy = await wmsAdapter.healthCheck().catch(() => ({ healthy: false }));

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'order-service',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        kafka: kafkaHealthy ? 'healthy' : 'unhealthy',
        eventBus: eventBusStatus.healthy ? 'healthy' : 'unhealthy',
        cms: cmsHealthy.healthy ? 'healthy' : 'unhealthy',
        ros: rosHealthy.healthy ? 'healthy' : 'unhealthy',
        wms: wmsHealthy.healthy ? 'healthy' : 'unhealthy'
      }
    };
    
    const isHealthy = dbHealthy && 
                     (kafkaHealthy || eventBusStatus.healthy) && 
                     cmsHealthy.healthy && 
                     rosHealthy.healthy && 
                     wmsHealthy.healthy;
    
    res.status(isHealthy ? 200 : 503).json(health);
    
  } catch (error) {
    logger.error('Order service health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'order-service',
      error: error.message
    });
  }
});

// API routes
app.use('/api/orders', orderRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Order service unhandled error:', error);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Initialize services
const initializeServices = async () => {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('Database connection failed. Exiting...');
      process.exit(1);
    }

    // Initialize external adapters
    logger.info('Initializing external system adapters...');
    await Promise.allSettled([
      // require('./adapters/cmsAdapter').initialize(),
      // require('./adapters/rosAdapter').initialize(),
      // require('./adapters/wmsAdapter').initialize()
      cmsAdapter.cmsAdapter.initialize(),
      rosAdapter.rosAdapter.initialize(),
      wmsAdapter.wmsAdapter.initialize()
    ]);

    // Initialize Kafka (optional - fallback to EventBus if fails)
    try {
      logger.info('Connecting to Kafka...');
      await connectProducer();
      
      logger.info('Starting Kafka consumer...');
      await startConsumer(['order-commands', 'order-events', 'tracking-events', 'driver-events']);
      
      logger.info('Kafka services initialized successfully');
    } catch (kafkaError) {
      logger.warn('Kafka initialization failed, using EventBus fallback:', kafkaError.message);
    }

    logger.info('Order service initialized successfully');

  } catch (error) {
    logger.error('Order service initialization failed:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeServices();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Order service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      // logger.info(`External systems: CMS=${isCMSConnected()}, ROS=${isROSConnected()}, WMS=${isWMSConnected()}`);
      // logger.info(`External systems: CMS=${cmsAdapter.cmsAdapter.isConnected}, ROS=${rosAdapter.rosAdapter.isConnected}, WMS=${wmsAdapter.wmsAdapter.isConnected}`);
      logger.info(`External systems: CMS=${cmsAdapter.cmsAdapter?.isConnected}, ROS=${rosAdapter.rosAdapter?.isConnected}, WMS=${wmsAdapter.wmsAdapter?.isConnected}`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down order service gracefully...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start order service:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Order service uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Order service unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;