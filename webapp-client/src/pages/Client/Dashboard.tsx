import React, { useState, useEffect } from "react";
import { getClientOrders } from "../../api";
import Sidebar from "../../components/Sidebar";

const ClientDashboard: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusFilter: string = 'All'; // Show all orders (no filtering UI yet)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Primary approach: Fetch client orders directly (same as Orders.tsx)
        console.log('Fetching client orders for dashboard...');
        const response = await getClientOrders();
        console.log('Client orders API response:', response);
        
        // Extract orders data from response - check for different response structures
        let ordersData = [];
        if (response?.data?.orders) {
          ordersData = response.data.orders;
        } else if (response?.data && Array.isArray(response.data)) {
          ordersData = response.data;
        } else if (Array.isArray(response)) {
          ordersData = response;
        } else {
          console.warn('Unexpected orders response structure:', response);
          ordersData = [];
        }

        console.log('Extracted orders data:', ordersData);
        
        // Ensure ordersData is an array before mapping
        if (Array.isArray(ordersData)) {
          // Transform API response using the same logic as Orders.tsx
          const transformedOrders = ordersData.map((order: any) => {
            console.log('=== DASHBOARD ORDER TRANSFORMATION ===');
            console.log('Raw order from backend:', order);
            console.log('Available fields:', Object.keys(order));
            
            // Get stored data for this order (preserving user-entered values and status)
            const orderKey = `order_${order.id}`;
            const storedData = localStorage.getItem(orderKey);
            let storedValues = null;
            if (storedData) {
              try {
                storedValues = JSON.parse(storedData);
                console.log('Found stored values for order', order.id, ':', storedValues);
              } catch (e) {
                console.log('Failed to parse stored data for order', order.id);
              }
            }
            
            // Handle items count - just the raw quantity entered, no calculation
            let itemsCount = 1; // Default fallback
            
            console.log('Checking items count fields:');
            console.log('- order.items_count:', order.items_count);
            console.log('- order.total_items:', order.total_items);
            console.log('- order.items (type):', typeof order.items, order.items);
            
            // First check localStorage for the exact value entered
            if (storedValues && storedValues.items && storedValues.items > 0) {
              itemsCount = storedValues.items;
              console.log('Using exact entered items count from localStorage:', itemsCount);
            } else {
              // Fallback to backend fields, but don't calculate - just use direct values
              if (order.items_count && !isNaN(parseInt(order.items_count))) {
                itemsCount = parseInt(order.items_count);
                console.log('Using items_count from backend:', itemsCount);
              } else {
                console.log('Using default items count:', itemsCount);
              }
            }
            
            // Handle value - just the raw unit value entered, no calculation or multiplication
            let orderValue = 'LKR 0'; // Default fallback
            
            console.log('Checking value fields:');
            console.log('- order.unit_value:', order.unit_value);
            console.log('- order.value:', order.value);
            console.log('- order.total_value:', order.total_value);
            console.log('- order.total_amount:', order.total_amount);
            
            // First priority: Check localStorage for the exact value entered
            if (storedValues && storedValues.value && storedValues.value > 0) {
              orderValue = `LKR ${storedValues.value.toLocaleString()}`;
              console.log('Using exact entered value from localStorage:', orderValue);
            } else {
              // Fallback to backend fields - use direct value, no division or calculation
              if (order.value && !isNaN(parseFloat(order.value)) && parseFloat(order.value) > 0) {
                orderValue = `LKR ${parseFloat(order.value).toLocaleString()}`;
                console.log('Using direct order.value from backend:', orderValue);
              } else if (order.unit_value && !isNaN(parseFloat(order.unit_value)) && parseFloat(order.unit_value) > 0) {
                orderValue = `LKR ${parseFloat(order.unit_value).toLocaleString()}`;
                console.log('Using unit_value from backend:', orderValue);
              } else if (order.total_value && !isNaN(parseFloat(order.total_value)) && parseFloat(order.total_value) > 0) {
                orderValue = `LKR ${parseFloat(order.total_value).toLocaleString()}`;
                console.log('Using total_value from backend:', orderValue);
              } else {
                console.log('No valid value found, using default:', orderValue);
              }
            }
            
            // Handle status - prioritize locally stored status from submission
            let orderStatus = 'Processing'; // Default fallback
            
            console.log('Checking status fields:');
            console.log('- order.status:', order.status);
            console.log('- order.order_status:', order.order_status);
            
            // First priority: Check localStorage for the status set during submission
            if (storedValues && storedValues.status) {
              orderStatus = storedValues.status;
              console.log('Using status from localStorage (set during submission):', orderStatus);
            } else {
              // Fallback to backend status
              if (order.status) {
                orderStatus = order.status;
                console.log('Using order.status from backend:', orderStatus);
              } else if (order.order_status) {
                orderStatus = order.order_status;
                console.log('Using order_status from backend:', orderStatus);
              } else {
                console.log('No valid status found, using default:', orderStatus);
              }
            }
            
            const result = {
              id: order.id || order.order_id,
              client: order.client_name || order.company_name || 'Client',
              recipient: order.recipient_name || order.recipient || 'Unknown',
              address: order.delivery_address || order.address || 'No address',
              status: orderStatus, // Use the properly resolved status
              date: order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              items: itemsCount,
              value: orderValue,
              phone: order.phone || order.recipient_phone || 'N/A'
            };
            
            console.log('Final transformed dashboard order:', result);
            console.log('=== END DASHBOARD TRANSFORMATION ===');
            
            return result;
          });
          
          console.log('Transformed orders for dashboard with status preservation:', transformedOrders);
          
          // Log status distribution for debugging with normalization analysis
          const statusCounts = transformedOrders.reduce((acc: any, order: any) => {
            const rawStatus = order.status || 'Unknown';
            const displayStatus = rawStatus.toString().trim();
            acc[displayStatus] = (acc[displayStatus] || 0) + 1;
            return acc;
          }, {});
          console.log('Dashboard status distribution (raw):', statusCounts);
          
          // Also show normalized distribution for comparison
          const normalizedCounts = transformedOrders.reduce((acc: any, order: any) => {
            const rawStatus = order.status || 'Unknown';
            const normalizedStatus = rawStatus.toString().trim().toLowerCase().replace(/\s+/g, ' ');
            acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
            return acc;
          }, {});
          console.log('Dashboard status distribution (normalized):', normalizedCounts);
          
          setOrders(transformedOrders);
          
        } else {
          console.error('Orders data is not an array:', ordersData);
          setOrders([]);
        }
        
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        
        // Don't fallback to mock data - keep orders empty to show real state
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Compute summary dynamically based on actual order data with perfect status counting
  const summary = React.useMemo(() => {
    console.log('=== PERFECT STATUS COUNTING ===');
    console.log('Total orders to analyze:', orders.length);
    console.log('Computing summary from client orders:', orders);
    
    // Initialize counters
    const statusCounters = {
      totalOrders: 0,
      processing: 0,
      inWarehouse: 0,
      outForDelivery: 0,
      delivered: 0,
      cancelled: 0,
      unknown: 0
    };
    
    // Count each order by normalized status match
    orders.forEach((order: any, index: number) => {
      statusCounters.totalOrders++;
      
      const rawStatus = order.status || 'Unknown';
      // Normalize status to handle case variations and extra spaces
      const orderStatus = rawStatus.toString().trim();
      
      console.log(`Order ${index + 1} (ID: ${order.id}): Raw Status = "${rawStatus}" | Normalized = "${orderStatus}"`);
      
      // Normalized status matching for perfect counting (case-insensitive)
      const normalizedStatus = orderStatus.toLowerCase().replace(/\s+/g, ' ');
      
      switch (normalizedStatus) {
        case 'processing':
          statusCounters.processing++;
          console.log(`  → Counted as Processing`);
          break;
        case 'in warehouse':
          statusCounters.inWarehouse++;
          console.log(`  → Counted as In Warehouse`);
          break;
        case 'out for delivery':
          statusCounters.outForDelivery++;
          console.log(`  → Counted as Out for Delivery`);
          break;
        case 'delivered':
          statusCounters.delivered++;
          console.log(`  → Counted as Delivered`);
          break;
        case 'cancelled':
          statusCounters.cancelled++;
          console.log(`  → Counted as Cancelled`);
          break;
        default:
          console.warn(`Unknown status encountered: "${orderStatus}" (normalized: "${normalizedStatus}") for order ${order.id}`);
          statusCounters.unknown++;
          console.log(`  → Counted as Unknown`);
          break;
      }
    });
    
    console.log('=== FINAL STATUS COUNTS ===');
    console.log('Total Orders:', statusCounters.totalOrders);
    console.log('Processing:', statusCounters.processing);
    console.log('In Warehouse:', statusCounters.inWarehouse);
    console.log('Out for Delivery:', statusCounters.outForDelivery);
    console.log('Delivered:', statusCounters.delivered);
    console.log('Cancelled:', statusCounters.cancelled);
    console.log('Unknown Status:', statusCounters.unknown);
    
    // Verification: sum should equal total
    const calculatedTotal = statusCounters.processing + statusCounters.inWarehouse + 
                           statusCounters.outForDelivery + statusCounters.delivered + 
                           statusCounters.cancelled + statusCounters.unknown;
    
    console.log('=== COUNT VERIFICATION ===');
    console.log(`Total orders: ${statusCounters.totalOrders}`);
    console.log(`Sum of individual counts: ${calculatedTotal}`);
    console.log(`Processing: ${statusCounters.processing}`);
    console.log(`In Warehouse: ${statusCounters.inWarehouse}`);
    console.log(`Out for Delivery: ${statusCounters.outForDelivery}`);
    console.log(`Delivered: ${statusCounters.delivered}`);
    console.log(`Cancelled: ${statusCounters.cancelled}`);
    console.log(`Unknown: ${statusCounters.unknown}`);
    
    if (calculatedTotal !== statusCounters.totalOrders) {
      console.error('🚨 STATUS COUNT MISMATCH DETECTED!');
      console.error('Expected total:', statusCounters.totalOrders);
      console.error('Calculated total:', calculatedTotal);
      console.error('Difference:', Math.abs(statusCounters.totalOrders - calculatedTotal));
    } else {
      console.log('✅ Status counts verified - perfect match!');
    }
    
    // Create detailed status distribution for debugging (with normalization)
    const statusDistribution = orders.reduce((acc: any, order: any) => {
      const rawStatus = order.status || 'Unknown';
      const normalizedKey = rawStatus.toString().trim().toLowerCase().replace(/\s+/g, ' ');
      const displayKey = rawStatus.toString().trim(); // Keep original case for display
      
      acc[displayKey] = (acc[displayKey] || 0) + 1;
      // Also track normalized version for analysis
      acc[`_normalized_${normalizedKey}`] = (acc[`_normalized_${normalizedKey}`] || 0) + 1;
      return acc;
    }, {});
    console.log('Detailed status distribution (raw and normalized):', statusDistribution);
    
    console.log('=== END PERFECT STATUS COUNTING ===');
    
    return {
      totalOrders: statusCounters.totalOrders,
      processing: statusCounters.processing,
      inWarehouse: statusCounters.inWarehouse,
      outForDelivery: statusCounters.outForDelivery,
      delivered: statusCounters.delivered,
      cancelled: statusCounters.cancelled
    };
  }, [orders]);

  // Filter orders based on selected status
  const filteredOrders = React.useMemo(() => {
    if (statusFilter === 'All') {
      return orders;
    }
    const filtered = orders.filter(order => order.status === statusFilter);
    console.log(`Filtered orders for status "${statusFilter}":`, filtered);
    return filtered;
  }, [orders, statusFilter]);

  return (
    <div >
       <Sidebar role="client" />
      <div className="p-6 flex-1 ml-64">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Dashboard Overview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Real-time order data from backend services
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-white px-4 py-2 rounded-lg flex items-center transition duration-300 transform hover:translate-x-1"
            style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'}}
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Please check your connection and try refreshing the page.
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{borderTopColor: '#667eea', borderBottomColor: '#764ba2'}}></div>
          </div>
        ) : (
          <>
            {/* Summary Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4" style={{borderLeftColor: '#667eea'}}>
                <h3 className="text-sm font-medium text-gray-600 uppercase">Total Orders</h3>
                <p className="text-3xl font-bold mt-2" style={{color: '#667eea'}}>{summary.totalOrders}</p>
                <p className="text-xs text-gray-500 mt-1">All orders</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Processing</h3>
                <p className="text-3xl font-bold mt-2" style={{color: '#667eea'}}>{summary.processing}</p>
                <p className="text-xs text-gray-500 mt-1">Being processed</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">In Warehouse</h3>
                <p className="text-3xl font-bold mt-2" style={{color: '#667eea'}}>{summary.inWarehouse}</p>
                <p className="text-xs text-gray-500 mt-1">At warehouse</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Out for Delivery</h3>
                <p className="text-3xl font-bold mt-2" style={{color: '#667eea'}}>{summary.outForDelivery}</p>
                <p className="text-xs text-gray-500 mt-1">En route</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Delivered</h3>
                <p className="text-3xl font-bold mt-2" style={{color: '#667eea'}}>{summary.delivered}</p>
                <p className="text-xs text-gray-500 mt-1">Completed</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Cancelled</h3>
                <p className="text-3xl font-bold mt-2" style={{color: '#667eea'}}>{summary.cancelled}</p>
                <p className="text-xs text-gray-500 mt-1">Cancelled orders</p>
              </div>
            </div>

            {/* Status Verification Panel (for debugging) */}
            {orders.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Status Count Verification:</strong> Total of {summary.processing + summary.inWarehouse + summary.outForDelivery + summary.delivered + summary.cancelled} individual status counts = {summary.totalOrders} total orders
                      {(summary.processing + summary.inWarehouse + summary.outForDelivery + summary.delivered + summary.cancelled) === summary.totalOrders ? 
                        ' ✅ Perfect match!' : ' ⚠️ Count mismatch detected!'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Check browser console for detailed status breakdown and any unknown statuses.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Orders List */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4" style={{color: '#667eea'}}>
                Recent Orders (Detailed View)
                {statusFilter !== 'All' && (
                  <span className="text-sm text-gray-600 ml-2">
                    (Filtered by: {statusFilter})
                  </span>
                )}
              </h3>
              <div className="overflow-x-auto">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {statusFilter === 'All' ? 'No orders found' : `No ${statusFilter.toLowerCase()} orders found`}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {error ? 'Unable to load orders from server' : 
                       statusFilter === 'All' ? 'You haven\'t created any orders yet' : 
                       `No orders with status "${statusFilter}" at this time`}
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrders.slice(0, 8).map((order: any) => (
                        <tr key={order.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.recipient}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">{order.address}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.items}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.value}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              order.status === "Delivered" ? "bg-green-100 text-green-800" :
                              order.status === "Out for Delivery" ? "bg-blue-100 text-blue-800" :
                              order.status === "Processing" ? "bg-purple-100 text-purple-800" :
                              order.status === "In Warehouse" ? "bg-yellow-100 text-yellow-800" :
                              order.status === "Cancelled" ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;