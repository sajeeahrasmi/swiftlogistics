require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || process.env.PORT || 3010;

// Simple logger for development
const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, 
      typeof meta === 'object' ? JSON.stringify(meta, null, 2) : meta);
  },
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, 
      typeof meta === 'object' ? JSON.stringify(meta, null, 2) : meta);
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, 
      typeof meta === 'object' ? JSON.stringify(meta, null, 2) : meta);
  }
};

// Import modules with error handling
let testConnection, authRoutes;
let kafkaConnected = false;
let eventBusHealthy = false;

try {
  const dbModule = require('./database/connection');
  testConnection = dbModule.testConnection;
  logger.info('Database module loaded successfully');
} catch (error) {
  logger.error('Failed to load database module:', error.message);
  // Create mock function for development
  testConnection = async () => {
    logger.warn('Using mock database connection');
    return true;
  };
}

try {
  authRoutes = require('./routes/auth');
  logger.info('Auth routes loaded successfully');
} catch (error) {
  logger.error('Failed to load auth routes:', error.message);
  // Create basic route for development
  authRoutes = express.Router();
  authRoutes.get('/health', (req, res) => {
    res.json({ success: true, message: 'Auth routes not loaded' });
  });
}

try {
  const kafkaModule = require('./kafka/producer');
  if (kafkaModule.connectProducer && kafkaModule.isConnected) {
    kafkaConnected = true;
    logger.info('Kafka producer module loaded');
  }
} catch (error) {
  logger.warn('Kafka module not available:', error.message);
}

try {
  const eventBusModule = require('./eventBus');
  if (eventBusModule.isHealthy) {
    eventBusHealthy = true;
    logger.info('EventBus module loaded');
  }
} catch (error) {
  logger.warn('EventBus module not available:', error.message);
}

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:5173", "ws://localhost:3000"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - Enhanced for better frontend integration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',') 
      : [
          'http://localhost:3000', 
          'http://localhost:3001', 
          'http://localhost:5173', // Vite default port
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin:', origin);
      callback(null, true); // Allow for development - change to false for production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON payload'
      });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';

// Auth-specific rate limiting - More lenient in development
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || (isDevelopment ? 5 * 60 * 1000 : 15 * 60 * 1000), // 5 min dev, 15 min prod
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || (isDevelopment ? 50 : 10), // 50 dev, 10 prod
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    retryAfter: Math.ceil((parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || (isDevelopment ? 5 * 60 * 1000 : 15 * 60 * 1000)) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // In development, use a more lenient key generator
    if (isDevelopment) {
      return `dev-${req.ip}`;
    }
    // Rate limit by IP and email if provided
    const email = req.body?.email || '';
    return `${req.ip}-${email}`;
  },
  skip: (req) => {
    // Skip rate limiting for health checks and certain endpoints
    const skipPaths = ['/health', '/verify'];
    if (isDevelopment) {
      skipPaths.push('/me', '/check', '/profile');
    }
    return skipPaths.some(path => req.path === path || req.path.includes(path));
  }
});

// Global rate limiting - More lenient in development
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000), // 1 min dev, 15 min prod
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isDevelopment ? 1000 : 100), // 1000 dev, 100 prod
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip more endpoints in development
    const skipPaths = ['/health', '/ready', '/live'];
    if (isDevelopment) {
      skipPaths.push('/me', '/verify', '/check');
    }
    return skipPaths.some(path => req.path === path || req.path.includes(path));
  }
});

// Apply rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', globalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log request start
  logger.info('Request started', {
    id: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100) || 'Unknown'
  });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger[logLevel]('Request completed', {
      id: req.id,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
});

// Health check endpoint - Enhanced
app.get('/health', async (req, res) => {
  try {
    let dbHealthy = false;
    
    try {
      dbHealthy = await testConnection();
    } catch (dbError) {
      logger.error('Database health check failed:', dbError.message);
    }
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      checks: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          message: dbHealthy ? 'Connected' : 'Connection failed'
        },
        kafka: {
          status: kafkaConnected ? 'healthy' : 'unavailable',
          connected: kafkaConnected
        },
        eventBus: {
          status: eventBusHealthy ? 'healthy' : 'unavailable',
          healthy: eventBusHealthy
        }
      },
      environment: process.env.NODE_ENV || 'development'
    };
    
    // For development, consider healthy even if some services are down
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isHealthy = isDevelopment ? true : dbHealthy;
    
    health.status = isHealthy ? 'healthy' : 'unhealthy';
    
    res.status(isHealthy ? 200 : 503).json(health);
    
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      error: error.message,
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// Ready check endpoint (Kubernetes readiness probe)
app.get('/ready', async (req, res) => {
  try {
    let dbHealthy = false;
    
    try {
      dbHealthy = await testConnection();
    } catch (dbError) {
      logger.error('Database readiness check failed:', dbError.message);
    }
    
    if (dbHealthy || process.env.NODE_ENV === 'development') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: 'database connection failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness check endpoint (Kubernetes liveness probe)
app.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'Swift Logistics Auth Service',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        profile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/me',
        changePassword: 'POST /api/auth/change-password',
        refreshToken: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        logoutAll: 'POST /api/auth/logout-all',
        verify: 'GET /api/auth/verify'
      },
      health: {
        health: 'GET /health',
        ready: 'GET /ready',
        live: 'GET /live'
      }
    },
    documentation: 'https://docs.swiftlogistics.com/api/auth'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Swift Logistics Auth Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth/*'
    },
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);

// Catch-all for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    availableEndpoints: '/api'
  });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    suggestion: 'Check /api for available endpoints'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  // Log error with request context
  logger.error('Unhandled error:', {
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle specific error types
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload',
      requestId: req.id
    });
  }
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      requestId: req.id
    });
  }
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    requestId: req.id,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { 
      stack: error.stack,
      details: error 
    })
  });
});

// Initialize services
const initializeServices = async () => {
  try {
    logger.info('Initializing auth service...');
    
    // Test database connection
    logger.info('Testing database connection...');
    try {
      const dbConnected = await testConnection();
      if (dbConnected) {
        logger.info('Database connection successful');
      } else {
        logger.warn('Database connection failed - continuing in development mode');
      }
    } catch (dbError) {
      logger.warn('Database connection error:', dbError.message);
      if (process.env.NODE_ENV === 'production') {
        throw dbError;
      }
    }

    // Initialize Kafka (optional - fallback to EventBus if fails)
    try {
      if (kafkaConnected) {
        const { connectProducer } = require('./kafka/producer');
        logger.info('Connecting to Kafka...');
        await connectProducer();
        
        const { startConsumer } = require('./kafka/consumer');
        logger.info('Starting Kafka consumer...');
        await startConsumer([
          'user-events', 
          'order-events', 
          'driver-events', 
          'tracking-events'
        ]);
        
        logger.info('Kafka services initialized successfully');
      }
    } catch (kafkaError) {
      logger.warn('Kafka initialization failed, continuing without Kafka:', kafkaError.message);
    }

    logger.info('All services initialized successfully');

  } catch (error) {
    logger.error('Service initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('Continuing in development mode despite initialization errors');
    }
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeServices();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Auth service running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔍 Health check: http://localhost:${PORT}/health`);
      logger.info(`📚 API docs: http://localhost:${PORT}/api`);
      logger.info(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
      
      // Log important configuration
      logger.info('Configuration loaded:', {
        cors: process.env.CORS_ORIGIN || 'default localhost origins',
        rateLimit: {
          global: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
          auth: process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 10
        },
        jwt: {
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      });
    });

    // Configure server timeouts
    server.timeout = 30000; // 30 seconds
    server.keepAliveTimeout = 5000; // 5 seconds
    server.headersTimeout = 6000; // 6 seconds

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        logger.info('HTTP server closed');
        logger.info('Shutdown complete');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Give some time to log the error before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason: reason,
    promise: promise,
    stack: reason?.stack,
    timestamp: new Date().toISOString()
  });
  
  // Give some time to log the error before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Start the server
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;