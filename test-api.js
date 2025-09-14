const axios = require('axios');

// Test authentication and order retrieval
async function testApiFlow() {
  try {
    console.log('Testing API flow for order details...\n');

    // Step 1: Register a test client user first
    console.log('1. Attempting to register test user...');
    try {
      const registerResponse = await axios.post('http://localhost:3010/api/auth/register', {
        email: 'testclient@example.com',
        password: 'test123',
        first_name: 'Test',
        last_name: 'Client',
        role: 'client',
        phone: '+94123456789'
      });
      console.log('Registration successful:', registerResponse.data);
    } catch (regError) {
      console.log('Registration failed (user might already exist):', regError.response?.data?.message);
    }

    // Step 2: Login to get token
    console.log('2. Attempting login...');
    const loginResponse = await axios.post('http://localhost:3010/api/auth/login', {
      email: 'testclient@example.com',
      password: 'test123'
    });

    console.log('Login successful!');
    const token = loginResponse.data.token || loginResponse.data.data?.tokens?.access_token;
    
    if (!token) {
      throw new Error('No token received from login');
    }

    console.log('Token obtained:', token.substring(0, 20) + '...\n');

    // Step 3: Get user profile
    console.log('3. Getting user profile...');
    const profileResponse = await axios.get('http://localhost:3010/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Profile data:', JSON.stringify(profileResponse.data, null, 2));
    const userId = profileResponse.data.data?.user?.id || profileResponse.data.user?.id || profileResponse.data.id;
    console.log('User ID:', userId, '\n');

    // Step 4: Get client orders
    console.log('4. Getting client orders...');
    const ordersResponse = await axios.get('http://localhost:3011/api/orders/client/me/orders', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Orders response:', JSON.stringify(ordersResponse.data, null, 2));

    // Step 5: Test order creation
    console.log('\n5. Testing order creation...');
    
    // Extract client_id from existing orders
    let clientId = null;
    if (ordersResponse.data.orders && ordersResponse.data.orders.length > 0) {
      clientId = ordersResponse.data.orders[0].client_id;
      console.log('Using client_id for new order:', clientId);
    } else {
      clientId = userId; // Fallback to user_id
      console.log('No existing orders, using user_id as fallback:', clientId);
    }

    const newOrderData = {
      client_id: clientId,
      pickup_address: '123 Test Pickup Location',
      delivery_address: '456 Test Delivery Location',
      recipient_name: 'Test Recipient',
      recipient_phone: '+94123456789',
      items: [
        {
          description: 'Test Item from API',
          quantity: 1,
          weight_kg: 2.0,
          value: 5000.00
        }
      ],
      priority: 'medium',
      special_instructions: 'Test order created via API'
    };

    try {
      const createOrderResponse = await axios.post('http://localhost:3011/api/orders', newOrderData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Order creation successful:', JSON.stringify(createOrderResponse.data, null, 2));
    } catch (orderError) {
      console.error('Order creation failed:', orderError.response?.data || orderError.message);
    }

    // Step 5.5: Check clients table to understand the relationship
    console.log('\n5.5. Checking clients table...');
    try {
      const clientsResponse = await axios.get('http://localhost:3011/api/clients', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Clients data:', JSON.stringify(clientsResponse.data, null, 2));
    } catch (clientsError) {
      console.error('Failed to get clients from order service:', clientsError.response?.data || clientsError.message);
    }

    // Step 6: Try to get all orders (if admin)
    console.log('\n6. Getting all orders...');
    const allOrdersResponse = await axios.get('http://localhost:3011/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('All orders response:', JSON.stringify(allOrdersResponse.data, null, 2));

  } catch (error) {
    console.error('Error testing API:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testApiFlow();