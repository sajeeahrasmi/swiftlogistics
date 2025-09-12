import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { getOrders, retryOrder } from "../../api"; // Your API calls

interface Order {
  id: number;
  trackingNumber: string;
  client: string;
  driver: string;
  status: string;
  lastUpdate: string;
  estimatedDelivery: string;
  items: number;
  currentLocation: string;
  routeProgress: number;
}

const mockOrders: Order[] = [
  {
    id: 1,
    trackingNumber: "ST-1001",
    client: "Acme Corp",
    driver: "John Silva",
    status: "Processing",
    lastUpdate: "2025-09-10 10:00",
    estimatedDelivery: "2025-09-12",
    items: 3,
    currentLocation: "Colombo",
    routeProgress: 20
  },
  {
    id: 2,
    trackingNumber: "ST-1002",
    client: "Beta Ltd",
    driver: "Maria Perera",
    status: "In Warehouse",
    lastUpdate: "2025-09-09 15:30",
    estimatedDelivery: "2025-09-13",
    items: 5,
    currentLocation: "Kandy",
    routeProgress: 40
  },
  {
    id: 3,
    trackingNumber: "ST-1003",
    client: "Gamma Inc",
    driver: "David Fernando",
    status: "Delivered",
    lastUpdate: "2025-09-08 18:00",
    estimatedDelivery: "2025-09-10",
    items: 2,
    currentLocation: "Galle",
    routeProgress: 100
  },
  {
    id: 4,
    trackingNumber: "ST-1004",
    client: "Delta Co",
    driver: "Sarah Jayawardena",
    status: "Processing",
    lastUpdate: "2025-09-10 09:00",
    estimatedDelivery: "2025-09-12",
    items: 4,
    currentLocation: "Matara",
    routeProgress: 60
  },
  {
    id: 5,
    trackingNumber: "ST-1005",
    client: "Epsilon LLC",
    driver: "Robert Dias",
    status: "In Warehouse",
    lastUpdate: "2025-09-09 14:00",
    estimatedDelivery: "2025-09-13",
    items: 1,
    currentLocation: "Kurunegala",
    routeProgress: 30
  },
  {
    id: 6,
    trackingNumber: "ST-1006",
    client: "Zeta Group",
    driver: "Lisa Rathnayake",
    status: "Delivered",
    lastUpdate: "2025-09-08 17:00",
    estimatedDelivery: "2025-09-10",
    items: 6,
    currentLocation: "Anuradhapura",
    routeProgress: 100
  },
  {
    id: 7,
    trackingNumber: "ST-1007",
    client: "Eta Solutions",
    driver: "Michael De Silva",
    status: "Processing",
    lastUpdate: "2025-09-10 08:00",
    estimatedDelivery: "2025-09-12",
    items: 2,
    currentLocation: "Jaffna",
    routeProgress: 50
  },
  {
    id: 8,
    trackingNumber: "ST-1008",
    client: "Theta Enterprises",
    driver: "Emma Karunaratne",
    status: "In Warehouse",
    lastUpdate: "2025-09-09 13:00",
    estimatedDelivery: "2025-09-13",
    items: 3,
    currentLocation: "Trincomalee",
    routeProgress: 35
  },
  {
    id: 9,
    trackingNumber: "ST-1009",
    client: "Iota Holdings",
    driver: "James Perera",
    status: "Delivered",
    lastUpdate: "2025-09-08 16:00",
    estimatedDelivery: "2025-09-10",
    items: 4,
    currentLocation: "Batticaloa",
    routeProgress: 100
  },
  {
    id: 10,
    trackingNumber: "ST-1010",
    client: "Kappa Partners",
    driver: "Nadia Fernando",
    status: "Processing",
    lastUpdate: "2025-09-10 07:00",
    estimatedDelivery: "2025-09-12",
    items: 5,
    currentLocation: "Polonnaruwa",
    routeProgress: 70
  }
];

const AdminTracking: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 6;

  useEffect(() => {
    // Use mock data instead of API
    setOrders(mockOrders);
  }, []);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800";
      case "Processing":
        return "bg-purple-100 text-purple-800";
      case "In Warehouse":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleRetry = (id: number) => {
    retryOrder(id)
      .then(() => alert("Retry triggered for order " + id))
      .catch(console.error);
  };

  return (
    <div className="flex">
      <Sidebar role="admin" />
      <div className="p-6 flex-1 ml-64">
        <h2 className="text-3xl font-bold text-amber-900 mb-2">All Orders Tracking</h2>

        {/* Search & Filter */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <input
            type="text"
            placeholder="Search by tracking number or client..."
            className="w-full md:w-1/2 pl-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <select
            className="w-full md:w-auto border rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Processing">Processing</option>
            <option value="In Warehouse">In Warehouse</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {currentOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900 truncate">{order.client}</h3>
                    <p className="text-sm text-gray-600">{order.trackingNumber}</p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="mb-2">
                  <p className="text-sm text-gray-600">Driver: <span className="text-amber-900">{order.driver || "Not assigned"}</span></p>
                </div>

                <div className="mb-2">
                  <p className="text-sm text-gray-600">Current Location: <span className="text-amber-900">{order.currentLocation}</span></p>
                </div>

                <div className="mb-2">
                  <p className="text-sm text-gray-600">Estimated Delivery: <span className="text-amber-900">{order.estimatedDelivery}</span></p>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{order.routeProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-amber-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${order.routeProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center">
                <span>{order.items} item{order.items !== 1 ? "s" : ""} • Last Update: {order.lastUpdate}</span>
                <button
                  className="bg-amber-800 text-white px-3 py-1 rounded"
                  onClick={() => handleRetry(order.id)}
                >
                  Retry
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing {indexOfFirstOrder + 1} to {indexOfLastOrder > filteredOrders.length ? filteredOrders.length : indexOfLastOrder} of {filteredOrders.length} results
              </p>
              <div className="flex space-x-2 mt-2 md:mt-0">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`px-3 py-1 rounded-md ${currentPage === number ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTracking;
