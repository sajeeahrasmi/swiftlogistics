import React, { useEffect, useState } from "react";
import { getClientOrders, getDashboardOverview } from "../../api";
import Sidebar from "../../components/Sidebar";

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'admin' | 'client'>('admin');

  // Transform admin dashboard data to orders format for display
  const transformAdminDataToOrders = (adminData: any) => {
    console.log('Transforming admin data:', adminData);
    
    // If there are orders needing attention, use those for the recent orders display
    if (adminData.orders_needing_attention && adminData.orders_needing_attention.length > 0) {
      return adminData.orders_needing_attention.map((order: any) => ({
        id: order.id || order.tracking_number,
        client: order.client_company || 'Unknown Client',
        address: order.delivery_address || order.pickup_address || 'No address',
        status: order.status || 'pending',
        date: order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        items: 1, // Default for admin view
        value: 'N/A', // Not available in admin overview
        recipient: 'System Order',
        phone: 'N/A'
      }));
    }
    
    // If no specific orders, create mock entries based on status counts
    const mockOrders: any[] = [];
    const statusCounts = adminData.status_counts || [];
    
    statusCounts.forEach((statusCount: any, index: number) => {
      if (statusCount.count > 0) {
        mockOrders.push({
          id: `ADMIN-${index + 1}`,
          client: 'System Overview',
          address: 'Various Locations',
          status: statusCount.status || 'processing',
          date: new Date().toISOString().split('T')[0],
          items: statusCount.count,
          value: `${statusCount.count} orders`,
          recipient: `${statusCount.count} orders`,
          phone: 'N/A'
        });
      }
    });
    
    return mockOrders.slice(0, 5); // Limit to 5 for display
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First try to get admin dashboard overview data
        try {
          console.log('Attempting to fetch admin dashboard overview...');
          const dashboardResponse = await getDashboardOverview();
          console.log('Admin dashboard response:', dashboardResponse);
          
          if (dashboardResponse.success && dashboardResponse.data) {
            setDashboardData(dashboardResponse.data);
            setDataSource('admin');
            
            // Transform admin data to match our dashboard format
            const transformedOrders = transformAdminDataToOrders(dashboardResponse.data);
            setOrders(transformedOrders);
            
            console.log('Successfully loaded admin dashboard data');
            return;
          }
        } catch (adminError) {
          console.warn('Admin dashboard endpoint failed, falling back to client orders:', adminError);
        }
        
        // Fallback: Fetch client orders for dashboard
        console.log('Fetching client orders as fallback...');
        const response = await getClientOrders();
        console.log('Client orders API response:', response);
        setDataSource('client');
        
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
          // Transform API response to match dashboard format
          const transformedOrders = ordersData.map((order: any) => ({
            id: order.id || order.order_id || `ORD-${Date.now()}`,
            client: order.client_name || order.company_name || 'Client',
            address: order.delivery_address || order.address || 'No address',
            status: order.status || order.order_status || 'Processing',
            date: order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            items: order.items_count || order.items || 1,
            value: order.total_value ? `LKR ${parseFloat(order.total_value).toLocaleString()}` : 'LKR 0',
            recipient: order.recipient_name || order.recipient || 'Unknown',
            phone: order.phone || order.recipient_phone || 'N/A'
          }));
          
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

  // Compute summary dynamically based on data source
  const summary = React.useMemo(() => {
    if (dataSource === 'admin' && dashboardData) {
      // Use admin dashboard data for more accurate metrics
      const statusCounts = dashboardData.status_counts || [];
      const todayMetrics = dashboardData.today_metrics || {};
      
      // Create summary from admin status counts
      const summaryFromAdmin: any = {
        totalOrders: todayMetrics.total_orders || 0,
        delivered: todayMetrics.delivered_orders || 0,
        cancelled: todayMetrics.cancelled_orders || 0,
        failed: todayMetrics.failed_orders || 0,
        processing: 0,
        inWarehouse: 0,
        outForDelivery: 0,
      };
      
      // Map status counts to our summary
      statusCounts.forEach((statusCount: any) => {
        const status = statusCount.status;
        const count = parseInt(statusCount.count) || 0;
        
        switch (status) {
          case 'pending':
          case 'processing':
            summaryFromAdmin.processing += count;
            break;
          case 'pickup_scheduled':
          case 'picked_up':
          case 'in_transit':
            summaryFromAdmin.inWarehouse += count;
            break;
          case 'out_for_delivery':
            summaryFromAdmin.outForDelivery += count;
            break;
          case 'delivered':
            summaryFromAdmin.delivered += count;
            break;
          case 'cancelled':
            summaryFromAdmin.cancelled += count;
            break;
          case 'failed':
            summaryFromAdmin.failed += count;
            break;
        }
      });
      
      return summaryFromAdmin;
    } else {
      // Fallback to client orders data
      return {
        totalOrders: orders.length,
        inWarehouse: orders.filter(o => o.status === "In Warehouse").length,
        processing: orders.filter(o => o.status === "Processing").length,
        delivered: orders.filter(o => o.status === "Delivered").length,
        outForDelivery: orders.filter(o => o.status === "Out for Delivery").length,
        cancelled: orders.filter(o => o.status === "Cancelled").length,
      };
    }
  }, [dataSource, dashboardData, orders]);

  return (
    <div >
       <Sidebar role="client" />
      <div className="p-6 flex-1 ml-64">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-amber-900">Dashboard Overview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Data source: {dataSource === 'admin' ? 'Admin Dashboard' : 'Client Orders'} 
              {dataSource === 'admin' && dashboardData && dashboardData.today_metrics && (
                <span className="ml-2 text-amber-600">
                  (Today's metrics)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg flex items-center transition duration-300"
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <>
            {/* Summary Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-amber-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Total Orders</h3>
                <p className="text-3xl font-bold text-amber-900 mt-2">{summary.totalOrders}</p>
                {dataSource === 'admin' && (
                  <p className="text-xs text-gray-500 mt-1">Today</p>
                )}
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Processing</h3>
                <p className="text-3xl font-bold text-amber-900 mt-2">{summary.processing}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">In Warehouse</h3>
                <p className="text-3xl font-bold text-amber-900 mt-2">{summary.inWarehouse}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Out for Delivery</h3>
                <p className="text-3xl font-bold text-amber-900 mt-2">{summary.outForDelivery}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Delivered</h3>
                <p className="text-3xl font-bold text-amber-900 mt-2">{summary.delivered}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">
                  {dataSource === 'admin' ? 'Failed' : 'Cancelled'}
                </h3>
                <p className="text-3xl font-bold text-amber-900 mt-2">
                  {dataSource === 'admin' ? (summary.failed || 0) : summary.cancelled}
                </p>
              </div>
            </div>

            {/* Orders List */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-amber-900 mb-4">
                {dataSource === 'admin' ? 'Recent System Activity' : 'Recent Orders'}
              </h3>
              <div className="overflow-x-auto">
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {error ? 'Unable to load orders from server' : 'You haven\'t created any orders yet'}
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="hover:bg-amber-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.client}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.recipient}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.value}</td>
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

export default Dashboard;