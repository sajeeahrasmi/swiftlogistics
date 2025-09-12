import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { getDrivers, addDriver, updateDriver, deleteDriver } from "../../api";

const Drivers: React.FC = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [viewingDriver, setViewingDriver] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    telephone: "",
    route: ""
  });

  const mockDrivers = [
    {
      id: 1,
      name: "John Silva",
      telephone: "0771234567",
      address: "123 Galle Road, Colombo",
      route: "Colombo - Kandy"
    },
    {
      id: 2,
      name: "Maria Perera",
      telephone: "0772345678",
      address: "45 Union Place, Colombo 2",
      route: "Colombo - Galle"
    },
    {
      id: 3,
      name: "David Fernando",
      telephone: "0773456789",
      address: "78 Hyde Park Corner, Colombo 2",
      route: "Colombo - Negombo"
    },
    {
      id: 4,
      name: "Sarah Jayawardena",
      telephone: "0774567890",
      address: "12 Ward Place, Colombo 7",
      route: "Colombo - Matara"
    },
    {
      id: 5,
      name: "Robert Dias",
      telephone: "0775678901",
      address: "33 Barnes Place, Colombo 7",
      route: "Colombo - Kurunegala"
    },
    {
      id: 6,
      name: "Lisa Rathnayake",
      telephone: "0776789012",
      address: "56 Duplication Road, Colombo 3",
      route: "Colombo - Anuradhapura"
    },
    {
      id: 7,
      name: "Michael De Silva",
      telephone: "0777890123",
      address: "22 Horton Place, Colombo 7",
      route: "Colombo - Jaffna"
    },
    {
      id: 8,
      name: "Emma Karunaratne",
      telephone: "0778901234",
      address: "90 Havelock Road, Colombo 5",
      route: "Colombo - Trincomalee"
    },
    {
      id: 9,
      name: "James Perera",
      telephone: "0779012345",
      address: "34 Galle Face, Colombo 3",
      route: "Colombo - Batticaloa"
    },
    {
      id: 10,
      name: "Nadia Fernando",
      telephone: "0770123456",
      address: "78 Nawala Road, Colombo 5",
      route: "Colombo - Polonnaruwa"
    }
  ];

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = () => {
    // Replace API call with mock data
    setDrivers(mockDrivers);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      updateDriver(editingDriver.id, formData)
        .then(() => {
          alert("Driver updated successfully");
          setIsModalOpen(false);
          setEditingDriver(null);
          setFormData({ name: "", telephone: "", route: "" });
          loadDrivers();
        })
        .catch(console.error);
    } else {
      addDriver(formData)
        .then(() => {
          alert("Driver added successfully");
          setIsModalOpen(false);
          setFormData({ name: "", telephone: "", route: "" });
          loadDrivers();
        })
        .catch(console.error);
    }
  };

  const handleEdit = (driver: any) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      telephone: driver.telephone,
      route: driver.route
    });
    setIsModalOpen(true);
  };

  const handleDelete = (driverId: number) => {
    if (window.confirm("Are you sure you want to delete this driver?")) {
      deleteDriver(driverId)
        .then(() => {
          alert("Driver deleted successfully");
          loadDrivers();
        })
        .catch(console.error);
    }
  };

  const handleView = (driver: any) => {
    setViewingDriver(driver);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
    setViewingDriver(null);
    setFormData({ name: "", telephone: "", route: "" });
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar role="admin" />
      <div className="p-8 flex-1 ml-64">
        <div >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Driver Management</h2>
              <p className="text-gray-600 mt-2">Manage your drivers and their routes</p>
            </div>
            <button 
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-lg shadow-md hover:from-amber-600 hover:to-amber-700 transition-all flex items-center"
              onClick={() => setIsModalOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Add Driver
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Current Route</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-amber-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold">
                            {d.name.charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{d.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{d.route}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        className="text-amber-600 hover:text-amber-800 flex items-center text-sm font-medium"
                        onClick={() => handleView(d)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        View Details
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors flex items-center"
                          onClick={() => handleEdit(d)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Edit
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors flex items-center"
                          onClick={() => handleDelete(d.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add/Edit Driver Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800">
                    {editingDriver ? "Edit Driver" : "Add Driver"}
                  </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                    <input
                      type="text"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                    <input
                      type="text"
                      name="route"
                      value={formData.route}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      {editingDriver ? "Update" : "Add"} Driver
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Driver Details Modal */}
          {viewingDriver && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800">Driver Details</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-14 w-14">
                      <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-xl">
                        {viewingDriver.name.charAt(0)}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-lg font-medium text-gray-900">{viewingDriver.name}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Telephone</div>
                    <div className="text-gray-900">{viewingDriver.telephone}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Address</div>
                    <div className="text-gray-900">{viewingDriver.address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Current Route</div>
                    <div className="text-gray-900">{viewingDriver.route}</div>
                  </div>
                </div>
                <div className="flex justify-end p-6 border-t border-gray-200">
                  <button
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    onClick={() => setViewingDriver(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drivers;