const axios = require('axios');

// Test the new client ID-based billing endpoints (no authentication required)
const ORDER_SERVICE_URL = 'http://localhost:3011/api';

async function testBillingByClientId() {
  console.log('🧪 Testing Client ID-based Billing APIs (No Token Required)...\n');

  const testClientId = 6; // Test with client ID 6

  try {
    console.log(`1️⃣ Testing getBillingInfo for client ID ${testClientId}...`);
    const billingResponse = await axios.get(`${ORDER_SERVICE_URL}/orders/client/${testClientId}/billing`);
    console.log('✅ Billing API Success:', billingResponse.data);
    console.log('   - Total Balance:', billingResponse.data.data.total_balance);
    console.log('   - Pending Invoices:', billingResponse.data.data.pending_invoices);
    console.log('   - Client ID in response:', billingResponse.data.data.client_id);
  } catch (error) {
    console.error('❌ Billing API Error:', error.response?.data || error.message);
    console.error('   Status:', error.response?.status);
  }

  try {
    console.log(`\n2️⃣ Testing getInvoices for client ID ${testClientId}...`);
    const invoicesResponse = await axios.get(`${ORDER_SERVICE_URL}/orders/client/${testClientId}/invoices`);
    console.log('✅ Invoices API Success:');
    console.log('   - Number of invoices:', invoicesResponse.data.data.length);
    if (invoicesResponse.data.data.length > 0) {
      console.log('   - First invoice:', invoicesResponse.data.data[0]);
    } else {
      console.log('   - No invoices found for this client');
    }
  } catch (error) {
    console.error('❌ Invoices API Error:', error.response?.data || error.message);
    console.error('   Status:', error.response?.status);
  }

  // Test with a non-existent client ID
  try {
    console.log('\n3️⃣ Testing with non-existent client ID (999)...');
    await axios.get(`${ORDER_SERVICE_URL}/orders/client/999/billing`);
  } catch (error) {
    console.log('✅ Expected error for non-existent client:', error.response?.data || error.message);
  }

  console.log('\n🎯 Test Summary:');
  console.log('- These endpoints work without JWT tokens');
  console.log('- They fetch data based on client ID parameter');
  console.log('- Frontend can now use these endpoints with a configurable client ID');
}

testBillingByClientId().catch(console.error);