const { Pool } = require('pg');
const winston = require('winston');
const path = require('path');

// Logger setup - order service specific
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'order-service-db' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/database-error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/database-combined.log') 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Database configuration - order service specific
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'swiftlogistics',
  password: process.env.DB_PASSWORD || '#@123Middle',
  port: process.env.DB_PORT || 5432,
  max: 20, // Larger pool for order processing
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Longer timeout for order operations
  statement_timeout: 10000, // Statement timeout for long-running queries
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
});

// Test connection with order database validation
const testConnection = async () => {
  try {
    const client = await pool.connect();
    
    // Verify we can access order-related tables
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('orders', 'order_items', 'order_status_history')
      ) as tables_exist;
    `);
    
    client.release();
    
    if (result.rows[0].tables_exist) {
      logger.info('Order database connection test successful - tables exist');
      return true;
    } else {
      logger.error('Order database tables not found. Please run migrations from backend/database/orders.sql');
      return false;
    }
  } catch (err) {
    logger.error('Order database connection test failed:', err);
    return false;
  }
};

// Generic query function with order-specific logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slower queries for optimization
    if (duration > 1000) {
      logger.warn('Slow query detected', { 
        text, 
        duration: `${duration}ms`, 
        rows: result.rowCount 
      });
    } else {
      logger.debug('Executed query', { 
        text, 
        duration: `${duration}ms`, 
        rows: result.rowCount 
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Order database query error', { 
      text, 
      error: error.message,
      parameters: params 
    });
    throw error;
  }
};

// Transaction wrapper with retry logic for order processing
//i committed this due to an error
// const transaction = async (callback, retries = 3) => {
//   const client = await pool.connect();
  
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       await client.query('BEGIN');
//       const result = await callback(client);
//       await client.query('COMMIT');
//       return result;
//     } catch (error) {
//       await client.query('ROLLBACK');
      
//       if (attempt === retries) {
//         logger.error('Transaction failed after all retries', {
//           attempt,
//           error: error.message
//         });
//         throw error;
//       }
      
//       // Wait before retrying (exponential backoff)
//       const delay = Math.pow(2, attempt) * 100;
//       logger.warn(`Transaction failed, retrying in ${delay}ms`, {
//         attempt,
//         error: error.message
//       });
      
//       await new Promise(resolve => setTimeout(resolve, delay));
//     }
//   } finally {
//     client.release();
//   }
// };

//this is what i added
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Order-specific helper queries
const orderQueries = {
  // Get order with items and status history
  getOrderWithDetails: async (orderId) => {
    const orderResult = await query(
      `SELECT o.*, c.company_name as client_company 
       FROM orders o 
       LEFT JOIN clients c ON o.client_id = c.id 
       WHERE o.id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      return null;
    }
    
    const itemsResult = await query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
      [orderId]
    );
    
    const statusResult = await query(
      'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at DESC',
      [orderId]
    );
    
    return {
      ...orderResult.rows[0],
      items: itemsResult.rows,
      status_history: statusResult.rows
    };
  },
  
  // Update order status with history tracking
  updateOrderStatus: async (orderId, newStatus, notes = null, actorId = null, actorType = 'system') => {
    return await transaction(async (client) => {
      // Update main order status
      await client.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, orderId]
      );
      
      // Add to status history
      await client.query(
        `INSERT INTO order_status_history 
         (order_id, status, notes, actor_id, actor_type) 
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, newStatus, notes, actorId, actorType]
      );
      
      return { orderId, newStatus };
    });
  },
  
  // Get orders by client with pagination
  getOrdersByClient: async (clientId, page = 1, limit = 50, status = null) => {
    const offset = (page - 1) * limit;
    let queryText = `
      SELECT o.*, COUNT(*) OVER() as total_count
      FROM orders o 
      WHERE o.client_id = $1
    `;
    let queryParams = [clientId];
    
    if (status) {
      queryText += ' AND o.status = $2';
      queryParams.push(status);
    }
    
    queryText += `
      ORDER BY o.created_at DESC 
      LIMIT $${queryParams.length + 1} 
      OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(limit, offset);
    
    const result = await query(queryText, queryParams);
    return {
      orders: result.rows,
      total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
      page,
      limit,
      totalPages: Math.ceil((result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0) / limit)
    };
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    logger.info('Order database pool closed');
  } catch (error) {
    logger.error('Error closing order database pool:', error);
  }
};

// Handle application termination
process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool,
  logger,
  orderQueries // Export the order-specific helper functions
};