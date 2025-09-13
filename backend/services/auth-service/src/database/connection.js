const { Pool } = require('pg');
const winston = require('winston');
require('dotenv').config();

// Enhanced logger setup with better formatting
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
      if (Object.keys(meta).length) {
        log += ` ${JSON.stringify(meta)}`;
      }
      if (stack) {
        log += `\n${stack}`;
      }
      return log;
    })
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/app.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Database configuration with validation
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'swiftlogistics',
  password: process.env.DB_PASSWORD || '123456789',
  port: parseInt(process.env.DB_PORT) || 5432,
  
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  min: parseInt(process.env.DB_POOL_MIN) || 0,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
  
  // SSL configuration
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // Application name for monitoring
  application_name: process.env.APP_NAME || 'swift-auth-service'
};

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    logger.warn('Missing database environment variables:', missing);
    logger.info('Using default values for missing variables');
  }
  
  logger.info('Database configuration:', {
    host: dbConfig.host,
    database: dbConfig.database,
    user: dbConfig.user,
    port: dbConfig.port,
    ssl: !!dbConfig.ssl,
    poolMax: dbConfig.max,
    poolMin: dbConfig.min
  });
};

// Validate configuration on startup
validateConfig();

// Create connection pool
const pool = new Pool(dbConfig);

// Connection pool event handlers
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client:', {
    error: err.message,
    stack: err.stack,
    client: client ? 'connected' : 'disconnected'
  });
});

pool.on('connect', (client) => {
  logger.debug('New client connected to PostgreSQL', {
    processID: client.processID,
    secretKey: client.secretKey ? 'present' : 'missing'
  });
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool', {
    processID: client.processID,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('remove', (client) => {
  logger.debug('Client removed from pool', {
    processID: client.processID,
    totalCount: pool.totalCount
  });
});

// Enhanced connection test function
const testConnection = async () => {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as server_time, version() as server_version');
      const duration = Date.now() - start;
      
      logger.info('Database connection test successful:', {
        duration: `${duration}ms`,
        serverTime: result.rows[0].server_time,
        serverVersion: result.rows[0].server_version.split(' ')[0]
      });
      
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    const duration = Date.now() - start;
    logger.error('Database connection test failed:', {
      duration: `${duration}ms`,
      error: err.message,
      code: err.code,
      host: dbConfig.host,
      database: dbConfig.database,
      port: dbConfig.port
    });
    return false;
  }
};

// Enhanced query function with retry logic
const query = async (text, params, retries = 3) => {
  const start = Date.now();
  const queryId = Math.random().toString(36).substr(2, 9);
  
  logger.debug('Executing query:', {
    queryId,
    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    paramCount: params ? params.length : 0
  });
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Query completed successfully:', {
        queryId,
        duration: `${duration}ms`,
        rows: result.rowCount,
        attempt: attempt > 1 ? attempt : undefined
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      if (attempt === retries) {
        logger.error('Query failed after all retries:', {
          queryId,
          duration: `${duration}ms`,
          attempts: retries,
          error: error.message,
          code: error.code,
          detail: error.detail,
          hint: error.hint,
          query: text.substring(0, 200)
        });
        throw error;
      } else {
        logger.warn('Query failed, retrying:', {
          queryId,
          attempt,
          error: error.message,
          code: error.code
        });
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }
};

// Enhanced transaction wrapper
const transaction = async (callback, retries = 3) => {
  const transactionId = Math.random().toString(36).substr(2, 9);
  const start = Date.now();
  
  logger.debug('Starting transaction:', { transactionId });
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      logger.debug('Transaction BEGIN:', { transactionId, attempt });
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      const duration = Date.now() - start;
      
      logger.debug('Transaction COMMIT successful:', {
        transactionId,
        duration: `${duration}ms`,
        attempt: attempt > 1 ? attempt : undefined
      });
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.warn('Transaction ROLLBACK:', {
        transactionId,
        attempt,
        error: error.message
      });
      
      if (attempt === retries) {
        const duration = Date.now() - start;
        logger.error('Transaction failed after all retries:', {
          transactionId,
          duration: `${duration}ms`,
          attempts: retries,
          error: error.message,
          code: error.code
        });
        throw error;
      } else {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    } finally {
      client.release();
    }
  }
};

// Health check function for monitoring
const getPoolStatus = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    config: {
      max: dbConfig.max,
      min: dbConfig.min,
      idleTimeoutMillis: dbConfig.idleTimeoutMillis,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis
    }
  };
};

// Database initialization and migration check
const initializeDatabase = async () => {
  try {
    logger.info('Initializing database...');
    
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to establish database connection');
    }
    
    // Check if basic tables exist
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_sessions')
    `;
    
    const result = await query(tableCheckQuery);
    const existingTables = result.rows.map(row => row.table_name);
    
    logger.info('Existing tables found:', existingTables);
    
    if (existingTables.length === 0) {
      logger.warn('No tables found. You may need to run database migrations.');
    }
    
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    return false;
  }
};

// Graceful shutdown with connection draining
const closePool = async () => {
  try {
    logger.info('Closing database connection pool...');
    
    // Wait for active connections to finish (with timeout)
    const timeout = setTimeout(() => {
      logger.warn('Force closing database pool due to timeout');
    }, 5000);
    
    await pool.end();
    clearTimeout(timeout);
    
    logger.info('Database pool closed gracefully');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
};

// Handle application termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connections...');
  await closePool();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connections...');
  await closePool();
});

// Periodic health check (optional)
const startHealthCheck = (intervalMs = 30000) => {
  setInterval(async () => {
    try {
      const status = getPoolStatus();
      if (status.waitingCount > 5) {
        logger.warn('High number of waiting connections:', status);
      }
      
      // Test connection every 5 minutes
      if (Date.now() % (5 * 60 * 1000) < intervalMs) {
        await testConnection();
      }
    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }, intervalMs);
};

// Start health check in non-test environments
if (process.env.NODE_ENV !== 'test') {
  startHealthCheck();
}

// Export enhanced interface
module.exports = {
  // Core database functions
  pool,
  query,
  transaction,
  
  // Connection management
  testConnection,
  initializeDatabase,
  closePool,
  
  // Monitoring and health
  getPoolStatus,
  logger,
  
  // Configuration
  dbConfig: {
    ...dbConfig,
    password: '***' // Hide password in exports
  }
};