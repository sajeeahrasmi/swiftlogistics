import React, { useState } from 'react';
import Sidebar from "../../components/Sidebar";

interface Order {
  id: number;
  recipient: string;
  address: string;
  status: string;
  date: string;
  items: number;
  value: string;
}

const Orders: React.FC = () => {
  // Mock data for initial orders
  const initialOrders: Order[] = [
    {
      id: 1,
      recipient: "John Silva",
      address: "123 Galle Road, Colombo 03",
      status: "Delivered",
      date: "2023-10-15",
      items: 3,
      value: "LKR 12,500",
    },
    {
      id: 2,
      recipient: "Maria Perera",
      address: "45 Union Place, Colombo 02",
      status: "Processing",
      date: "2023-10-16",
      items: 2,
      value: "LKR 8,200",
    },
    {
      id: 3,
      recipient: "David Fernando",
      address: "78 Hyde Park Corner, Colombo 02",
      status: "In Warehouse",
      date: "2023-10-16",
      items: 5,
      value: "LKR 25,800",
    },
    {
      id: 4,
      recipient: "Sarah Jayawardena",
      address: "12 Ward Place, Colombo 07",
      status: "Processing",
      date: "2023-10-14",
      items: 1,
      value: "LKR 15,300",
    },
    {
      id: 5,
      recipient: "Robert Dias",
      address: "33 Barnes Place, Colombo 07",
      status: "In Warehouse",
      date: "2023-10-15",
      items: 4,
      value: "LKR 9,500",
    }
  ];

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [recipient, setRecipient] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState('');
  const [value, setValue] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  const submitOrder = () => {
    if (!recipient || !address || !items || !value) {
      alert('Please fill all fields');
      return;
    }

    const newOrder: Order = {
      id: orders.length + 1,
      recipient,
      address,
      status: 'Processing',
      date: new Date().toISOString().split('T')[0],
      items: parseInt(items),
      value: `LKR ${parseInt(value).toLocaleString()}`
    };
    
    setOrders([newOrder, ...orders]);
    setRecipient('');
    setAddress('');
    setItems('');
    setValue('');
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'In Warehouse': return 'bg-amber-100 text-amber-800';
      case 'Processing': return 'bg-purple-100 text-purple-800';
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
        <h2 className="text-3xl font-bold text-amber-900 mb-6">Order Management</h2>
        
       

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header with actions */}
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h3 className="text-lg font-semibold text-amber-900">Order History</h3>
              <p className="text-sm text-gray-600">Manage and track your delivery orders</p>
            </div>
            
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mt-4 md:mt-0">
              <select 
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Processing">Processing</option>
                <option value="In Warehouse">In Warehouse</option>
                <option value="Delivered">Delivered</option>
              </select>
              
              <button
                className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg flex items-center transition duration-300"
                onClick={() => setShowForm(!showForm)}
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
            <div className="p-6 bg-amber-50 border-b border-amber-200">
              <h3 className="text-lg font-semibold text-amber-900 mb-4">Create New Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                  <input
                    className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Enter recipient name"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                  <input
                    className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Enter delivery address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Items</label>
                  <input
                    type="number"
                    className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Enter number of items"
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Value (LKR)</label>
                  <input
                    type="number"
                    className="border border-gray-300 rounded-lg p-3 w-full focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Enter order value"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
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
                  className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg transition duration-300"
                  onClick={submitOrder}
                >
                  Submit Order
                </button>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="overflow-x-auto">
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
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-amber-50 transition duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.recipient}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">{order.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.items}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.value}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredOrders.length === 0 && (
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