import React, { useState } from 'react';
import Sidebar from "../../components/Sidebar";

interface Invoice {
  recipient: string;
  address: string;
  date: string;
  items: number;
  amount: string;
  status: string;
  paymentMethod?: string;
  paymentDate?: string;
  transactionId?: string;
}

const Billing: React.FC = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const invoices: Invoice[] = [
    { 
      recipient: "John Silva", 
      address: "123 Galle Road, Colombo 03",
      date: "2023-10-15", 
      items: 3, 
      amount: "LKR 12,500", 
      status: 'Paid',
      paymentMethod: "Credit Card",
      paymentDate: "2023-10-14",
      transactionId: "TXN-789456123"
    },
    { 
      recipient: "Maria Perera", 
      address: "45 Union Place, Colombo 02",
      date: "2023-10-16", 
      items: 2, 
      amount: "LKR 8,200", 
      status: 'Pending' 
    },
    { 
      recipient: "David Fernando", 
      address: "78 Hyde Park Corner, Colombo 02",
      date: "2023-10-17", 
      items: 5, 
      amount: "LKR 25,800", 
      status: 'Paid',
      paymentMethod: "Cash on Delivery",
      paymentDate: "2023-10-17",
      transactionId: "COD-963852741"
    },
    { 
      recipient: "Robert Dias", 
      address: "33 Barnes Place, Colombo 07",
      date: "2023-10-19", 
      items: 4, 
      amount: "LKR 9,500", 
      status: 'Pending' 
    }
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedInvoice(null);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
       <Sidebar role="client" />
      <div className="p-6 flex-1 ml-64">
        <h2 className="text-3xl font-bold text-amber-900 mb-2">Billing</h2>

        {/* Billing Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Total Balance</h3>
            <p className="text-3xl font-bold text-amber-700">LKR 23,700</p>
            <p className="text-sm text-gray-600 mt-1">Updated just now</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">Pending Invoices</h3>
            <p className="text-3xl font-bold text-amber-700">2</p>
            <p className="text-sm text-gray-600 mt-1">LKR 17,700 total</p>
          </div>
        </div>

        {activeTab === 'invoices' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h3 className="text-lg font-semibold text-amber-900">Invoices</h3>
                  <p className="text-sm text-gray-600">Your recent billing statements</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice, index) => (
                    <tr key={index} className="hover:bg-amber-50 transition duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.recipient}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{invoice.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.items}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          className="text-amber-700 hover:text-amber-900"
                          onClick={() => handleViewClick(invoice)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{invoices.length}</span> of{' '}
                  <span className="font-medium">{invoices.length}</span> results
                </p>
                <div className="mt-4 md:mt-0">
                  <nav className="flex space-x-2">
                    <button className="px-3 py-1 rounded-md bg-amber-100 text-amber-700 font-medium">1</button>
                    <button className="px-3 py-1 rounded-md text-gray-600 hover:bg-gray-100">2</button>
                    <button className="px-3 py-1 rounded-md text-gray-600 hover:bg-gray-100">Next →</button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Details Modal */}
        {isModalOpen && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-amber-900">Payment Details</h3>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Recipient</h4>
                  <p className="text-lg text-amber-900">{selectedInvoice.recipient}</p>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Invoice Amount</h4>
                  <p className="text-lg text-amber-900">{selectedInvoice.amount}</p>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-1">Status</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                
                {selectedInvoice.status === 'Paid' && (
                  <>
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Payment Method</h4>
                      <p className="text-lg text-amber-900">{selectedInvoice.paymentMethod}</p>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Payment Date</h4>
                      <p className="text-lg text-amber-900">{selectedInvoice.paymentDate}</p>
                    </div>
                    
                    {selectedInvoice.transactionId && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-1">Transaction ID</h4>
                        <p className="text-lg text-amber-900">{selectedInvoice.transactionId}</p>
                      </div>
                    )}
                  </>
                )}
                
                {selectedInvoice.status === 'Pending' && (
                  <div className="bg-amber-50 p-4 rounded-lg mt-4">
                    <p className="text-amber-800 text-sm">This invoice is pending payment. Please settle your account to avoid service interruptions.</p>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <button 
                    onClick={closeModal}
                    className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition duration-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;