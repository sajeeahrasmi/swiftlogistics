import React, { useEffect, useState } from "react";
import { getOrders } from "../../api";
import Sidebar from "../../components/Sidebar";

// Mock data for orders with additional fields
const mockOrders = [
  {
    id: "ORD-001",
    client: "E-Shop Lanka",
    address: "123 Galle Road, Colombo",
    status: "In Warehouse",
    date: "2023-10-15",
    items: 5,
    value: "LKR 12,500",
    recipient: "John Silva",
    phone: "0771234567"
  },
  {
    id: "ORD-002",
    client: "Fashion Hub",
    address: "45 Union Place, Colombo 2",
    status: "Processing",
    date: "2023-10-16",
    items: 3,
    value: "LKR 8,200",
    recipient: "Maria Perera",
    phone: "0772345678"
  },
  {
    id: "ORD-003",
    client: "Tech Galaxy",
    address: "78 Hyde Park Corner, Colombo 2",
    status: "In Warehouse",
    date: "2023-10-16",
    items: 2,
    value: "LKR 25,800",
    recipient: "David Fernando",
    phone: "0773456789"
  },
  {
    id: "ORD-004",
    client: "Home & Living",
    address: "12 Ward Place, Colombo 7",
    status: "Delivered",
    date: "2023-10-14",
    items: 4,
    value: "LKR 15,300",
    recipient: "Sarah Jayawardena",
    phone: "0774567890"
  },
  {
    id: "ORD-005",
    client: "Book Haven",
    address: "33 Barnes Place, Colombo 7",
    status: "In Warehouse",
    date: "2023-10-15",
    items: 7,
    value: "LKR 9,500",
    recipient: "Robert Dias",
    phone: "0775678901"
  },
  {
    id: "ORD-006",
    client: "Gadget Zone",
    address: "56 Duplication Road, Colombo 3",
    status: "Processing",
    date: "2023-10-17",
    items: 1,
    value: "LKR 42,000",
    recipient: "Lisa Rathnayake",
    phone: "0776789012"
  },
  {
    id: "ORD-007",
    client: "Healthy Foods",
    address: "22 Horton Place, Colombo 7",
    status: "In Warehouse",
    date: "2023-10-17",
    items: 6,
    value: "LKR 7,800",
    recipient: "Michael De Silva",
    phone: "0777890123"
  },
  {
    id: "ORD-008",
    client: "Sports Gear",
    address: "90 Havelock Road, Colombo 5",
    status: "Delivered",
    date: "2023-10-13",
    items: 3,
    value: "LKR 18,900",
    recipient: "Emma Karunaratne",
    phone: "0778901234"
  },
  {
    id: "ORD-009",
    client: "Electro World",
    address: "34 Galle Face, Colombo 3",
    status: "Processing",
    date: "2023-10-18",
    items: 2,
    value: "LKR 35,400",
    recipient: "James Perera",
    phone: "0779012345"
  },
  {
    id: "ORD-010",
    client: "Furniture Palace",
    address: "78 Nawala Road, Colombo 5",
    status: "In Warehouse",
    date: "2023-10-18",
    items: 1,
    value: "LKR 28,700",
    recipient: "Nadia Fernando",
    phone: "0770123456"
  }
];

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call with mock data
    setLoading(true);
    setTimeout(() => {
      setOrders(mockOrders);
      setLoading(false);
    }, 1000);
  }, []);

  // Compute summary dynamically based on orders
  const summary = {
    totalOrders: orders.length,
    inWarehouse: orders.filter(o => o.status === "In Warehouse").length,
    processing: orders.filter(o => o.status === "Processing").length,
    delivered: orders.filter(o => o.status === "Delivered").length,
  };

  return (
    <div >
       <Sidebar role="client" />
      <div className="p-6 flex-1 ml-64">
        <h2 className="text-2xl font-bold text-amber-900 mb-6">Dashboard Overview</h2>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <>
            {/* Summary Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-amber-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Total Orders</h3>
                <p className="text-3xl font-bold text-amber-900 mt-2">{summary.totalOrders}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">In Warehouse</h3>
                <p className="text-3xl font-bold text-amber-900 mt-2">{summary.inWarehouse}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Processing</h3>
                <p className="text-3xl font-bold text-amber-900 mt-2">{summary.processing}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <h3 className="text-sm font-medium text-gray-600 uppercase">Delivered</h3>
                <p className="text-3xl font-bold text-amber-900 mt-2">{summary.delivered}</p>
              </div>
            </div>

            {/* Orders List */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-amber-900 mb-4">Recent Orders</h3>
              <div className="overflow-x-auto">
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
                            order.status === "Processing" ? "bg-blue-100 text-blue-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;