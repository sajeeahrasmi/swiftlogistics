const axios = require('axios');

async function checkClientRelationship() {
  try {
    // Let's use the existing API to understand the data
    
    // First, login to get a token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3010/api/auth/login', {
      email: 'testclient@example.com',
      password: 'testpassword123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful');
    
    // Get profile to see user data
    console.log('\n2. Getting user profile...');
    const profileResponse = await axios.get('http://localhost:3010/api/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('User profile:', JSON.stringify(profileResponse.data, null, 2));
    
    // Try to get client orders to see existing relationship
    console.log('\n3. Getting client orders to understand relationship...');
    const ordersResponse = await axios.get('http://localhost:3011/api/orders/client/5', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Client orders response:', JSON.stringify(ordersResponse.data, null, 2));
    
    // Try to access all orders to see what we get
    console.log('\n4. Getting all orders (as client)...');
    const allOrdersResponse = await axios.get('http://localhost:3011/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('All orders response:', JSON.stringify(allOrdersResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkClientRelationship();