import React, { useState, useEffect } from 'react';
import Sidebar from "../../components/Sidebar";

interface Order {
  id: number;
  trackingNumber: string;
  recipient: string;
  address: string;
  status: string;
  lastUpdate: string;
  estimatedDelivery: string;
  items: number;
  currentLocation: string;
  routeProgress: number;
}

const Tracking: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 6;

  // Load mock tracking data instead of API call
  useEffect(() => {
    const loadMockTrackingData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock tracking data - same orders as requested plus TRK-100000
        const mockTrackingOrders: Order[] = [
          {
            id: 1,
            trackingNumber: "TRK-100000",
            recipient: "Colombo Electronics Ltd",
            address: "456 Customer Avenue, Colombo 03",
            status: "Processing",
            lastUpdate: "2025-09-20 01:10 PM",
            estimatedDelivery: "2025-09-20",
            items: 3,
            currentLocation: "Colombo Main Warehouse",
            routeProgress: 20
          },
          {
            id: 2,
            trackingNumber: "TRK-728416",
            recipient: "Bob Williams",
            address: "45 Union Place, Colombo 02",
            status: "Processing",
            lastUpdate: "2025-09-18 11:15 AM",
            estimatedDelivery: "2025-09-19",
            items: 2,
            currentLocation: "Processing Center",
            routeProgress: 40
          },
          {
            id: 4,
            trackingNumber: "TRK-728418",
            recipient: "Diana Miller",
            address: "12 Ward Place, Colombo 07",
            status: "Delivered",
            lastUpdate: "2025-09-17 03:20 PM",
            estimatedDelivery: "Delivered",
            items: 1,
            currentLocation: "Colombo 07",
            routeProgress: 100
          },
          {
            id: 7,
            trackingNumber: "TRK-728421",
            recipient: "George Martin",
            address: "90 Havelock Road, Colombo 05",
            status: "Delivered",
            lastUpdate: "2025-09-16 11:45 AM",
            estimatedDelivery: "Delivered",
            items: 3,
            currentLocation: "Colombo 05",
            routeProgress: 100
          }
        ];
        
        setOrders(mockTrackingOrders);
        
      } catch (err: any) {
        console.error('Failed to load tracking data:', err);
        setError(err.message || 'Failed to load tracking data');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadMockTrackingData();
  }, []);

  // Refresh function with mock data
  const refreshOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Same mock data as initial load including TRK-100000
      const mockTrackingOrders: Order[] = [
        {
          id: 1,
          trackingNumber: "TRK-100000",
          recipient: "Colombo Electronics Ltd",
          address: "456 Customer Avenue, Colombo 03",
          status: "In Warehouse",
          lastUpdate: "2025-09-18 09:30 AM",
          estimatedDelivery: "2025-09-20",
          items: 3,
          currentLocation: "Colombo Main Warehouse",
          routeProgress: 20
        },
        {
          id: 2,
          trackingNumber: "TRK-728416",
          recipient: "Bob Williams",
          address: "45 Union Place, Colombo 02",
          status: "Processing",
          lastUpdate: "2025-09-18 11:15 AM",
          estimatedDelivery: "2025-09-19",
          items: 2,
          currentLocation: "Processing Center",
          routeProgress: 40
        },
        {
          id: 4,
          trackingNumber: "TRK-728418",
          recipient: "Diana Miller",
          address: "12 Ward Place, Colombo 07",
          status: "Delivered",
          lastUpdate: "2025-09-17 03:20 PM",
          estimatedDelivery: "Delivered",
          items: 1,
          currentLocation: "Colombo 07",
          routeProgress: 100
        },
        {
          id: 7,
          trackingNumber: "TRK-728421",
          recipient: "George Martin",
          address: "90 Havelock Road, Colombo 05",
          status: "Delivered",
          lastUpdate: "2025-09-16 11:45 AM",
          estimatedDelivery: "Delivered",
          items: 3,
          currentLocation: "Colombo 05",
          routeProgress: 100
        }
      ];
      
      setOrders(mockTrackingOrders);
      
    } catch (err: any) {
      console.error('Error refreshing orders:', err);
      setError(err.message || 'Failed to refresh tracking data. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.recipient.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get current orders for pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Processing': return 'bg-purple-100 text-purple-800';
      case 'In Warehouse': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Delivered': 
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        );
      case 'Processing': 
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        );
      case 'In Warehouse': 
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        );
      default: 
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
    }
  };

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="p-6 flex-1 ml-64">
      <Sidebar role="client" />
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-2" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Package Tracking</h2>
        <p className="mb-6" style={{color: '#667eea'}}>Monitor your deliveries in real-time</p>

        {/* Search and Filter Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="w-full md:w-1/2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by tracking number or recipient..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
            
            <div className="flex space-x-4 w-full md:w-auto">
              <select 
                className="flex-1 md:flex-none border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1); // Reset to first page when filtering
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Processing">Processing</option>
                <option value="In Warehouse">In Warehouse</option>
                <option value="Delivered">Delivered</option>
              </select>
              
              <button
                onClick={refreshOrders}
                className="px-4 py-2 text-white rounded-lg transition-colors transform hover:translate-x-1"
                style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'}}
                title="Refresh orders"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                </svg>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#667eea'}}></div>
            <h3 className="text-lg font-medium text-gray-900">Loading tracking data...</h3>
            <p className="text-sm text-gray-500">Please wait while we fetch your orders</p>
          </div>
        ) : (
          <>
            {/* Tracking Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {currentOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold truncate" style={{color: '#667eea'}}>{order.recipient}</h3>
                    <p className="text-sm text-gray-600">{order.trackingNumber}</p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Delivery Address</h4>
                  <p className="text-sm truncate" style={{color: '#667eea'}}>{order.address}</p>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Estimated Delivery</h4>
                  <p className="text-sm" style={{color: '#667eea'}}>{order.estimatedDelivery}</p>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Current Location</h4>
                  <p className="text-sm truncate" style={{color: '#667eea'}}>{order.currentLocation}</p>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{order.routeProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="h-2.5 rounded-full transition-all duration-300" 
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        width: `${order.routeProgress}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>{order.items} item{order.items !== 1 ? 's' : ''} • Updated: {order.lastUpdate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          /* Pagination */
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-4 md:mb-0">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstOrder + 1}</span> to{' '}
                  <span className="font-medium">
                    {indexOfLastOrder > filteredOrders.length ? filteredOrders.length : indexOfLastOrder}
                  </span> of{' '}
                  <span className="font-medium">{filteredOrders.length}</span> results
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md transition-all duration-300 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'text-white/80 hover:text-white hover:bg-white/15 transform hover:translate-x-1'
                  }`}
                  style={currentPage !== 1 ? {background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)'} : {}}
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`px-3 py-1 rounded-md transition-all duration-300 ${
                      currentPage === number
                        ? 'text-white'
                        : 'text-white/80 hover:text-white hover:bg-white/15 transform hover:translate-x-1'
                    }`}
                    style={currentPage === number 
                      ? {background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'} 
                      : {background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)'}
                    }
                  >
                    {number}
                  </button>
                ))}
                
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md transition-all duration-300 ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'text-white/80 hover:text-white hover:bg-white/15 transform hover:translate-x-1'
                    }`}
                    style={currentPage !== totalPages ? {background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)'} : {}}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};

export default Tracking;