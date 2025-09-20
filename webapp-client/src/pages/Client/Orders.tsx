import React, { useState, useEffect } from 'react';
import Sidebar from "../../components/Sidebar";
import { getClientOrders, submitOrder as submitOrderAPI, getProfile } from '../../api';

interface Order {
  id: number;
  recipient: string;
  address: string;
  status: string;
  items: number;
  value: string;
}

const Orders: React.FC = () => {
  // State for orders and form
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [recipient, setRecipient] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState('');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('Processing'); // Default status
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  // Load mock orders data
  useEffect(() => {
    const loadMockOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock orders data - the specific orders you requested
        const mockOrders: Order[] = [
          {
            id: 2,
            recipient: "Bob Williams",
            address: "45 Union Place, Colombo 02",
            status: "Processing",
            items: 2,
            value: "LKR 2,000"
          },
          {
            id: 4,
            recipient: "Diana Miller",
            address: "12 Ward Place, Colombo 07",
            status: "Delivered",
            items: 1,
            value: "LKR 1,000"
          },
          {
            id: 7,
            recipient: "George Martin",
            address: "90 Havelock Road, Colombo 05",
            status: "Delivered",
            items: 3,
            value: "LKR 3,000"
          }
        ];
        
        setOrders(mockOrders);
        
      } catch (err: any) {
        console.error('Failed to load orders:', err);
        setError(err.message || 'Failed to load orders');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadMockOrders();
  }, []);

  const submitOrder = async () => {
    if (!recipient || !address || !phone || !items || !value) {
      alert('Please fill all required fields');
      return;
    }

    // Validate phone format (should match backend pattern: /^\+?[\d\s\-\(\)]+$/)
    const phonePattern = /^\+?[\d\s\-\(\)]+$/;
    if (!phonePattern.test(phone.trim())) {
      alert('Please enter a valid phone number (e.g., +94123456789 or 0123456789)');
      return;
    }

    // Validate numeric fields
    const itemCount = parseInt(items);
    const orderValue = parseFloat(value);
    
    if (isNaN(itemCount) || itemCount <= 0) {
      alert('Please enter a valid number of items (greater than 0)');
      return;
    }
    
    if (isNaN(orderValue) || orderValue <= 0) {
      alert('Please enter a valid order value (greater than 0)');
      return;
    }

    if (orderValue > 10000) {
      alert('Order value cannot exceed LKR 10,000 per item');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Get fresh profile to ensure we have the correct user data
      const profileResponse = await getProfile(true); // Skip cache to get fresh data
      console.log('Profile response:', profileResponse);
      
      // Extract user data from different possible response structures
      let userData = null;
      if (profileResponse?.data?.user) {
        userData = profileResponse.data.user;
      } else if (profileResponse?.data) {
        userData = profileResponse.data;
      } else if (profileResponse?.user) {
        userData = profileResponse.user;
      } else {
        userData = profileResponse;
      }
      
      if (!userData?.id) {
        throw new Error('User profile not loaded. Please refresh and try again.');
      }

      console.log('User data:', userData);

      // Try to get existing orders to extract the client_id
      let clientId = userData.id; // Default fallback
      
      try {
        const clientOrdersResponse = await getClientOrders();
        console.log('Client orders response:', clientOrdersResponse);
        
        // Extract client_id from existing orders
        if (clientOrdersResponse?.data?.orders && clientOrdersResponse.data.orders.length > 0) {
          clientId = clientOrdersResponse.data.orders[0].client_id;
          console.log('Found client_id from existing orders:', clientId);
        }
      } catch (ordersError) {
        console.log('Could not fetch existing orders, using user_id as fallback:', ordersError);
        // Use user_id as fallback - backend will handle the validation
      }
      
      // Create order data that matches backend validation schema
      const orderData = {
        client_id: clientId,
        pickup_address: address.trim(),
        delivery_address: address.trim(),
        recipient_name: recipient.trim(),
        recipient_phone: phone.trim(),
        items: [
          {
            description: `Order for ${recipient.trim()}`,
            quantity: itemCount,
            weight_kg: 1.0, // Default weight - required by backend
            value: orderValue,
            special_instructions: `Order with ${itemCount} items`
          }
        ],
        priority: 'medium',
        special_instructions: `Order for ${recipient.trim()} with ${itemCount} items`
      };

      console.log('Submitting order data:', orderData);

      console.log('=== ORDER SUBMISSION DEBUG ===');
      console.log('Form input values:');
      console.log('- recipient:', recipient);
      console.log('- items (quantity):', items);
      console.log('- value (unit price):', value);
      console.log('- status (selected):', status);
      
      const response = await submitOrderAPI(orderData);
      console.log('Order submission response:', response);
      
      // Add the new order to the list - handle different response structures
      const newOrderId = response?.data?.order?.id || response?.data?.id || response?.id || Date.now();
      
      // Extract the actual status from the backend response, but use our selected status
      const newOrderStatus = status; // Use the status selected in the form
      
      // Store the entered values and status locally for this order
      const orderKey = `order_${newOrderId}`;
      localStorage.setItem(orderKey, JSON.stringify({
        items: parseInt(items) || 1,
        value: parseFloat(value) || 0,
        status: newOrderStatus // Store the selected status
      }));
      
      const newOrder: Order = {
        id: newOrderId,
        recipient,
        address,
        status: newOrderStatus, // Use the selected status
        items: parseInt(items) || 1, // Always use the value you entered
        value: `LKR ${parseFloat(value).toLocaleString()}` // Always use the value you entered locally
      };
      
      console.log('New order created locally with entered values:', newOrder);
      console.log('=== END SUBMISSION DEBUG ===');
      
      // Add the new order to the front of the list
      setOrders([newOrder, ...orders]);
      
      // Reset form
      setRecipient('');
      setAddress('');
      setPhone('');
      setItems('');
      setValue('');
      setStatus('Processing'); // Reset status to default
      setShowForm(false);
      
      alert('Order submitted successfully!');
      
      // Add the new order to the front of the list
      setOrders([newOrder, ...orders]);
      
    } catch (err: any) {
      console.error('Failed to submit order:', err);
      
      // Extract detailed error message from different response structures
      let errorMessage = 'Failed to submit order';
      
      if (err.response?.data?.details) {
        // Backend validation error with details
        errorMessage = err.response.data.details;
      } else if (err.response?.data?.message) {
        // Backend error with message
        errorMessage = err.response.data.message;
      } else if (err.message) {
        // General error message
        errorMessage = err.message;
      }
      
      console.error('Order submission error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      setError(errorMessage);
      alert(`Failed to submit order: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'In Warehouse': return 'bg-blue-100 text-blue-800';
      case 'Out for Delivery': return 'bg-blue-100 text-blue-800';
      case 'Processing': return 'bg-purple-100 text-purple-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = filterStatus === 'All' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
       <Sidebar role="client" />
      <div className="p-6 flex-1 ml-64">
        <h2 className="text-3xl font-bold mb-6" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Order Management</h2>
        
       

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header with actions */}
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h3 className="text-lg font-semibold" style={{color: '#667eea'}}>Order History</h3>
              <p className="text-sm text-gray-600">Manage and track your delivery orders</p>
              {error && (
                <p className="text-sm text-red-600 mt-1">
                  ⚠ {error}
                </p>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mt-4 md:mt-0">
              <select 
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Processing">Processing</option>
                <option value="In Warehouse">In Warehouse</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              
              <button
                className="text-white px-4 py-2 rounded-lg flex items-center transition duration-300 disabled:opacity-50 transform hover:translate-x-1"
                style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'}}
                onClick={() => setShowForm(!showForm)}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                New Order
              </button>
            </div>
          </div>

          {/* New Order Form */}
          {showForm && (
            <div className="p-6 border-b" style={{background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)', borderColor: 'rgba(102, 126, 234, 0.3)'}}>
              <h3 className="text-lg font-semibold mb-4" style={{color: '#667eea'}}>Create New Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="recipient-name" className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                  <input
                    id="recipient-name"
                    name="recipientName"
                    type="text"
                    autoComplete="name"
                    className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter recipient name"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="recipient-phone" className="block text-sm font-medium text-gray-700 mb-1">Recipient Phone</label>
                  <input
                    id="recipient-phone"
                    name="recipientPhone"
                    type="tel"
                    autoComplete="tel"
                    className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number (e.g., +94123456789 or 0123456789)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    pattern="^\+?[\d\s\-\(\)]+$"
                    title="Please enter a valid phone number with digits, spaces, dashes, or parentheses only"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="delivery-address" className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                  <input
                    id="delivery-address"
                    name="deliveryAddress"
                    type="text"
                    autoComplete="street-address"
                    className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter delivery address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="number-of-items" className="block text-sm font-medium text-gray-700 mb-1">Number of Items (Quantity)</label>
                  <input
                    id="number-of-items"
                    name="numberOfItems"
                    type="number"
                    min="1"
                    className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity (e.g., 5)"
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="order-value" className="block text-sm font-medium text-gray-700 mb-1">Unit Value (LKR per item) - Max: 10,000</label>
                  <input
                    id="order-value"
                    name="orderValue"
                    type="number"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter value per item (e.g., 500)"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="order-status" className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                  <select
                    id="order-status"
                    name="orderStatus"
                    className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Processing">Processing</option>
                    <option value="In Warehouse">In Warehouse</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="text-white px-4 py-2 rounded-lg transition duration-300 disabled:opacity-50 flex items-center transform hover:translate-x-1"
                  style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'}}
                  onClick={submitOrder}
                  disabled={submitting}
                >
                  {submitting && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {submitting ? 'Submitting...' : 'Submit Order'}
                </button>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12" style={{background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'}}>
                <div className="flex flex-col items-center space-y-4 p-8 rounded-lg" style={{background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', boxShadow: '2px 0 10px rgba(0,0,0,0.1)'}}>
                  <div className="relative">
                    <svg className="animate-spin h-12 w-12" style={{color: '#667eea'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <div className="absolute inset-0 animate-ping">
                      <svg className="h-12 w-12 opacity-30" style={{color: '#764ba2'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                      </svg>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <span className="text-lg font-semibold" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Loading orders...</span>
                    <p className="text-sm" style={{color: 'rgba(102, 126, 234, 0.8)'}}>Please wait while we fetch your data</p>
                    <div className="flex space-x-1 justify-center">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{background: '#667eea', animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{background: '#7c7ce8', animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{background: '#764ba2', animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. of Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="transition duration-150 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.recipient}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">{order.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.items}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {!loading && filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                <p className="mt-1 text-sm text-gray-500">Try changing your filters or create a new order</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;