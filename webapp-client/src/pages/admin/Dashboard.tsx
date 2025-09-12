import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

// Mock API for overview stats
const getAdminStats = () =>
  Promise.resolve({
    totalClients: 42,
    totalOrders: 1284,
    ordersInWarehouse: 87,
    processing: 23,
    delivered: 1174,
    activeDrivers: 12,
    recentOrders: [
      { id: "ORD-001", client: "Nike", status: "processing", date: "2023-06-15" },
      { id: "ORD-002", client: "Adidas", status: "in warehouse", date: "2023-06-15" },
      { id: "ORD-003", client: "Apple", status: "delivered", date: "2023-06-14" },
      { id: "ORD-004", client: "Samsung", status: "processing", date: "2023-06-14" },
      { id: "ORD-005", client: "Amazon", status: "in warehouse", date: "2023-06-14" },
    ],
    warehouseOperations: [
      { id: "PKG-001", status: "received", location: "Receiving Dock", time: "09:15" },
      { id: "PKG-002", status: "stored", location: "Aisle 3, Shelf B", time: "10:30" },
      { id: "PKG-003", status: "loaded", location: "Loading Bay 2", time: "11:45" },
      { id: "PKG-004", status: "dispatched", location: "Out for delivery", time: "13:20" },
    ],
  });

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalOrders: 0,
    ordersInWarehouse: 0,
    processing: 0,
    delivered: 0,
    activeDrivers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [warehouseOperations, setWarehouseOperations] = useState<any[]>([]);

  useEffect(() => {
    getAdminStats().then((data) => {
      setStats({
        totalClients: data.totalClients,
        totalOrders: data.totalOrders,
        ordersInWarehouse: data.ordersInWarehouse,
        processing: data.processing,
        delivered: data.delivered,
        activeDrivers: data.activeDrivers,
      });
      setRecentOrders(data.recentOrders);
      setWarehouseOperations(data.warehouseOperations);
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar role="admin" />
      <div className="p-6 flex-1 ml-64">
        <h2 className="text-2xl font-bold mb-6">Admin Dashboard - Overview</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 uppercase">
                {key.replace(/([A-Z])/g, " $1")}
              </h3>
              <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th> */}
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      {/* <td className="px-4 py-2 whitespace-nowrap">{order.id}</td> */}
                      <td className="px-4 py-2 whitespace-nowrap">{order.client}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === "processing"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.status === "in warehouse"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{order.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warehouse Operations */}
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Warehouse Operations</h3>
            <div className="space-y-3">
              {warehouseOperations.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium">{op.id}</p>
                    <p className="text-sm text-gray-500">{op.location}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        op.status === "received"
                          ? "bg-purple-100 text-purple-800"
                          : op.status === "stored"
                          ? "bg-blue-100 text-blue-800"
                          : op.status === "loaded"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {op.status}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">{op.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
