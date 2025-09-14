import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

// Mock data
const mockClients = [
  { id: 1, company: "Nike Sri Lanka", contactPerson: "Rajesh Fernando", email: "rajesh@nike.lk", phone: "+94 77 123 4567", contract: "Premium", billing: "Monthly", amount: 125000, status: "Active", joinDate: "2023-01-15" },
  { id: 2, company: "Adidas Lanka", contactPerson: "Samantha Perera", email: "samantha@adidas.lk", phone: "+94 76 234 5678", contract: "Standard", billing: "Quarterly", amount: 85000, status: "Active", joinDate: "2023-02-20" },
  { id: 3, company: "Apple Resellers", contactPerson: "Amanda Jayawardena", email: "amanda@apple.lk", phone: "+94 71 345 6789", contract: "Enterprise", billing: "Annual", amount: 450000, status: "Active", joinDate: "2022-11-05" },
  { id: 4, company: "Samsung Distributors", contactPerson: "Lakmal Silva", email: "lakmal@samsung.lk", phone: "+94 70 456 7890", contract: "Premium", billing: "Monthly", amount: 150000, status: "Pending", joinDate: "2023-04-10" },
  { id: 5, company: "Dialog Enterprise", contactPerson: "Niroshan Fernando", email: "niroshan@dialog.lk", phone: "+94 76 567 8901", contract: "Enterprise", billing: "Annual", amount: 600000, status: "Active", joinDate: "2022-08-22" }
];

// Mock API functions
const getClients = () => Promise.resolve(mockClients);
const updateClient = (id: number, data: any) => {
  const updatedClients = mockClients.map(c => c.id === id ? { ...c, ...data } : c);
  return Promise.resolve(updatedClients);
};
const deleteClient = (id: number) => {
  const updatedClients = mockClients.filter(c => c.id !== id);
  return Promise.resolve(updatedClients);
};
const addClient = (client: any) => {
  const newId = Math.max(...mockClients.map(c => c.id)) + 1;
  const newClient = { ...client, id: newId, joinDate: new Date().toISOString().split("T")[0] };
  return Promise.resolve([...mockClients, newClient]);
};

const Clients: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newClient, setNewClient] = useState({
    company: "",
    contactPerson: "",
    email: "",
    phone: "",
    contract: "Standard",
    billing: "Monthly",
    amount: 0,
    status: "Active"
  });

  useEffect(() => {
    getClients().then(setClients).catch(console.error);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!editingClient) return;
    updateClient(editingClient.id, editingClient)
      .then((updatedClients: any) => {
        setClients(updatedClients);
        setShowEditModal(false);
        setEditingClient(null);
        alert("Client updated successfully!");
      })
      .catch(console.error);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    deleteClient(id)
      .then((updatedClients: any) => {
        setClients(updatedClients);
        alert("Client deleted successfully!");
      })
      .catch(console.error);
  };

  const handleAdd = () => {
    if (!newClient.company || !newClient.contactPerson || !newClient.email) {
      alert("Please fill all required fields.");
      return;
    }
    addClient(newClient)
      .then((updatedClients: any) => {
        setClients(updatedClients);
        setShowAddModal(false);
        setNewClient({
          company: "",
          contactPerson: "",
          email: "",
          phone: "",
          contract: "Standard",
          billing: "Monthly",
          amount: 0,
          status: "Active"
        });
        alert("Client added successfully!");
      })
      .catch(console.error);
  };

  const filteredClients = clients.filter(client =>
    client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar role="admin" />
      <div className="flex-1 ml-64 p-6">
        <h2 className="text-2xl font-bold mb-6">Manage Clients</h2>

        {/* Search & Add */}
        <div className="flex justify-between mb-6">
          <input
            type="text"
            placeholder="Search clients..."
            className="pl-3 pr-4 py-2 border border-gray-300 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-md"
            onClick={() => setShowAddModal(true)}
          >
            Add New Client
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-amber-50">
              <tr>
                {["Company", "Contact", "Contract", "Billing", "Value (LKR)", "Status", "Actions"].map((title) => (
                  <th key={title} className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">{title}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{client.company}</div>
                    <div className="text-sm text-gray-500">Joined: {client.joinDate}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{client.contactPerson}</div>
                    <div className="text-sm text-gray-500">{client.email}</div>
                    <div className="text-sm text-gray-500">{client.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      client.contract === "Premium" ? "bg-purple-100 text-purple-800" :
                      client.contract === "Enterprise" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>{client.contract}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{client.billing}</td>
                  <td className="px-6 py-4 font-medium">{formatCurrency(client.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      client.status === "Active" ? "bg-green-100 text-green-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>{client.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button className="text-amber-600 hover:text-amber-900 mr-3" onClick={() => handleEdit(client)}>Edit</button>
                    <button className="text-red-600 hover:text-red-900" onClick={() => handleDelete(client.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-semibold mb-4">Add New Client</h3>
              <div className="space-y-3">
                {["company", "contactPerson", "email", "phone"].map((field) => (
                  <div key={field}>
                    <label htmlFor={`new-${field}`} className="block text-sm font-medium text-gray-700 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                    <input
                      id={`new-${field}`}
                      name={field}
                      type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                      autoComplete={field === "email" ? "email" : field === "phone" ? "tel" : field === "company" ? "organization" : "name"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={(newClient as any)[field]}
                      onChange={(e) => setNewClient({ ...newClient, [field]: e.target.value })}
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="new-contract-type" className="block text-sm font-medium text-gray-700">Contract Type</label>
                  <select 
                    id="new-contract-type"
                    name="contractType"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newClient.contract}
                    onChange={(e) => setNewClient({ ...newClient, contract: e.target.value })}
                  >
                    <option>Standard</option>
                    <option>Premium</option>
                    <option>Enterprise</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="new-billing-cycle" className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                  <select 
                    id="new-billing-cycle"
                    name="billingCycle"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newClient.billing}
                    onChange={(e) => setNewClient({ ...newClient, billing: e.target.value })}
                  >
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Annual</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="new-contract-value" className="block text-sm font-medium text-gray-700">Contract Value (LKR)</label>
                  <input
                    id="new-contract-value"
                    name="contractValue"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newClient.amount}
                    onChange={(e) => setNewClient({ ...newClient, amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label htmlFor="new-client-status" className="block text-sm font-medium text-gray-700">Status</label>
                  <select 
                    id="new-client-status"
                    name="clientStatus"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newClient.status}
                    onChange={(e) => setNewClient({ ...newClient, status: e.target.value })}
                  >
                    <option>Active</option>
                    <option>Pending</option>
                    <option>Suspended</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4 space-x-3">
                <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="px-4 py-2 bg-amber-700 text-white rounded-md hover:bg-amber-800" onClick={handleAdd}>Add Client</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal (similar to Add Modal) */}
        {showEditModal && editingClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-semibold mb-4">Edit Client</h3>
              <div className="space-y-3">
                {["company", "contactPerson", "email", "phone"].map((field) => (
                  <div key={field}>
                    <label htmlFor={`edit-${field}`} className="block text-sm font-medium text-gray-700 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                    <input
                      id={`edit-${field}`}
                      name={field}
                      type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                      autoComplete={field === "email" ? "email" : field === "phone" ? "tel" : field === "company" ? "organization" : "name"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={(editingClient as any)[field]}
                      onChange={(e) => setEditingClient({ ...editingClient, [field]: e.target.value })}
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="edit-contract-type" className="block text-sm font-medium text-gray-700">Contract Type</label>
                  <select 
                    id="edit-contract-type"
                    name="contractType"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={editingClient.contract}
                    onChange={(e) => setEditingClient({ ...editingClient, contract: e.target.value })}
                  >
                    <option>Standard</option>
                    <option>Premium</option>
                    <option>Enterprise</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-billing-cycle" className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                  <select 
                    id="edit-billing-cycle"
                    name="billingCycle"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={editingClient.billing}
                    onChange={(e) => setEditingClient({ ...editingClient, billing: e.target.value })}
                  >
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Annual</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-contract-value" className="block text-sm font-medium text-gray-700">Contract Value (LKR)</label>
                  <input
                    id="edit-contract-value"
                    name="contractValue"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={editingClient.amount}
                    onChange={(e) => setEditingClient({ ...editingClient, amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label htmlFor="edit-client-status" className="block text-sm font-medium text-gray-700">Status</label>
                  <select 
                    id="edit-client-status"
                    name="clientStatus"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={editingClient.status}
                    onChange={(e) => setEditingClient({ ...editingClient, status: e.target.value })}
                  >
                    <option>Active</option>
                    <option>Pending</option>
                    <option>Suspended</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4 space-x-3">
                <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="px-4 py-2 bg-amber-700 text-white rounded-md hover:bg-amber-800" onClick={handleUpdate}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Clients;
