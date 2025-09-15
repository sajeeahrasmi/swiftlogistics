const axios = require('axios');

// Test token (replace with valid token from your browser)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjYsImVtYWlsIjoidGVzdGNsaWVudEBleGFtcGxlLmNvbSIsInJvbGUiOiJjbGllbnQiLCJpYXQiOjE3NTc5Mzk2MDYsImV4cCI6MTc1ODAyNjAwNn0.Y6C4cKGXzEtj9cotx1QSLlbCGQ1RHyt9QUn8ji_5PJo';

// Create API instance similar to frontend
const orderAPI = axios.create({
  baseURL: 'http://localhost:3011/api',
  timeout: 10000,
});

// Add auth interceptor
orderAPI.interceptors.request.use((config) => {
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function testBillingAPIs() {
  console.log('🧪 Testing Billing APIs...\n');

  try {
    console.log('1️⃣ Testing getBillingInfo...');
    const billingResponse = await orderAPI.get('/orders/client/me/billing');
    console.log('✅ Billing API Success:', billingResponse.data);
  } catch (error) {
    console.error('❌ Billing API Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }

  try {
    console.log('\n2️⃣ Testing getInvoices...');
    const invoicesResponse = await orderAPI.get('/orders/client/me/invoices');
    console.log('✅ Invoices API Success:');
    console.log('Number of invoices:', invoicesResponse.data.data.length);
    console.log('First invoice:', invoicesResponse.data.data[0]);
  } catch (error) {
    console.error('❌ Invoices API Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }

  try {
    console.log('\n3️⃣ Testing authentication check...');
    const authResponse = await axios.get('http://localhost:3010/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Auth check success:', authResponse.data);
  } catch (error) {
    console.error('❌ Auth check error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testBillingAPIs().catch(console.error);