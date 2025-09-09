const { testConnection, query, logger } = require('../src/database/connection');
const fs = require('fs');
const path = require('path');

async function testOrderDatabase() {
  try {
    logger.info('Testing order service database connection...');
    
    // Test basic connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection test failed');
    }
    
    logger.info('Database connection test passed');
    
    // Test if tables exist
    const tablesCheck = await query(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') as has_orders,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') as has_order_items,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_status_history') as has_status_history
    `);
    
    const { has_orders, has_order_items, has_status_history } = tablesCheck.rows[0];
    
    if (!has_orders || !has_order_items || !has_status_history) {
      logger.warn('Order tables not found. Please run migrations from backend/database/orders.sql');
      return false;
    }
    
    logger.info('All order tables exist');
    
    // Test basic queries
    const orderCount = await query('SELECT COUNT(*) FROM orders');
    const itemCount = await query('SELECT COUNT(*) FROM order_items');
    
    logger.info(`Found ${orderCount.rows[0].count} orders and ${itemCount.rows[0].count} order items`);
    
    // Test insert operation
    const testOrder = await query(`
      INSERT INTO orders (client_id, pickup_address, delivery_address, recipient_name, recipient_phone, status)
      VALUES (1, 'Test Pickup', 'Test Delivery', 'Test Recipient', 'Test Phone', 'pending')
      RETURNING id
    `);
    
    logger.info(`Test order inserted with ID: ${testOrder.rows[0].id}`);
    
    // Clean up test data
    await query('DELETE FROM orders WHERE recipient_name = $1', ['Test Recipient']);
    
    logger.info('Order service database test completed successfully');
    return true;
    
  } catch (error) {
    logger.error('Order service database test failed:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testOrderDatabase()
    .then(success => {
      if (success) {
        console.log('✅ Order database test passed');
        process.exit(0);
      } else {
        console.error('❌ Order database test failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Order database test error:', error);
      process.exit(1);
    });
}

module.exports = testOrderDatabase;