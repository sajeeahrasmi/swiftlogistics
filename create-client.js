const axios = require('axios');

async function createClientForUser() {
  try {
    // First, login as admin to create a client
    console.log('1. Trying to login as admin...');
    
    // Let's try with different credentials
    const users = [
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'admin@swiftlogistics.com', password: 'admin123' },
      { email: 'testclient@example.com', password: 'testpassword123' }
    ];
    
    let adminToken = null;
    
    for (const user of users) {
      try {
        const loginResponse = await axios.post('http://localhost:3010/api/auth/login', user);
        adminToken = loginResponse.data.token;
        console.log(`Logged in successfully with ${user.email}`);
        
        // Get profile to check role
        const profileResponse = await axios.get('http://localhost:3010/api/profile', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('User role:', profileResponse.data.data.user.role);
        console.log('User ID:', profileResponse.data.data.user.id);
        
        break;
      } catch (error) {
        console.log(`Failed to login with ${user.email}`);
      }
    }
    
    if (!adminToken) {
      console.error('Could not login with any credentials');
      return;
    }
    
    // Try to check existing orders to understand the data structure
    console.log('\n2. Getting existing orders...');
    const ordersResponse = await axios.get('http://localhost:3011/api/orders/client/5', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    console.log('Orders found:', ordersResponse.data.data.total);
    if (ordersResponse.data.data.orders.length > 0) {
      console.log('First order client_id:', ordersResponse.data.data.orders[0].client_id);
    }
    
    // Now let's try to create an order with the correct client_id
    console.log('\n3. Testing order creation with corrected client_id...');
    
    const orderData = {
      client_id: 5, // Use the existing client_id from the orders
      pickup_address: "123 Test Pickup Street",
      delivery_address: "456 Test Delivery Avenue", 
      recipient_name: "John Doe",
      recipient_phone: "+94987654321",
      items: [
        {
          description: "Test Item",
          quantity: 2,
          weight_kg: 1.5,
          value: 5000,
          special_instructions: "Handle with care"
        }
      ],
      priority: "medium",
      special_instructions: "Test order created via API"
    };
    
    try {
      const createResponse = await axios.post('http://localhost:3011/api/orders', orderData, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log('Order creation successful:', createResponse.data);
    } catch (orderError) {
      console.error('Order creation failed:', orderError.response?.data || orderError.message);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

createClientForUser();