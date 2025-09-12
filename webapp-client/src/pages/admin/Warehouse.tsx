import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";

const Warehouse = () => {
  // Extended mock data with more details and timestamps
  const initialPackages = [
    { 
      id: 1, 
      trackingId: "TRK-001-001", 
      orderId: "ORD-001", 
      client: "Tech Solutions Inc.", 
      status: "Received", 
      priority: "High", 
      receivedAt: "2023-10-15T08:30:00",
      location: "Receiving Dock A",
      weight: 15.2,
      dimensions: "30x20x15 cm",
      contents: "Electronics",
      notes: "Fragile - Handle with care",
      estimatedProcessTime: 2, // hours
      assignedTo: "John Doe"
    },
    { 
      id: 2, 
      trackingId: "TRK-001-002", 
      orderId: "ORD-002", 
      client: "Global Imports LLC", 
      status: "Received", 
      priority: "Medium", 
      receivedAt: "2023-10-15T09:15:00",
      location: "Receiving Dock B",
      weight: 8.7,
      dimensions: "40x30x25 cm",
      contents: "Office Supplies",
      notes: "",
      estimatedProcessTime: 4,
      assignedTo: "Jane Smith"
    },
    { 
      id: 3, 
      trackingId: "TRK-001-003", 
      orderId: "ORD-003", 
      client: "Electronics Plus", 
      status: "Loaded", 
      priority: "High", 
      receivedAt: "2023-10-14T10:45:00",
      loadedAt: "2023-10-15T14:20:00",
      location: "Vehicle TRUCK-102",
      weight: 22.5,
      dimensions: "60x40x35 cm",
      contents: "Computer Equipment",
      notes: "Requires signature on delivery",
      estimatedProcessTime: 3,
      assignedTo: "Mike Johnson"
    },
    { 
      id: 4, 
      trackingId: "TRK-001-004", 
      orderId: "ORD-004", 
      client: "Fashion Retail Co.", 
      status: "Dispatched", 
      priority: "Low", 
      receivedAt: "2023-10-14T11:30:00",
      loadedAt: "2023-10-14T15:45:00",
      dispatchedAt: "2023-10-14T16:30:00",
      location: "In Transit",
      weight: 5.8,
      dimensions: "25x20x10 cm",
      contents: "Clothing",
      notes: "",
      estimatedProcessTime: 6,
      assignedTo: "Sarah Wilson"
    },
    { 
      id: 5, 
      trackingId: "TRK-001-005", 
      orderId: "ORD-005", 
      client: "Home Appliances Corp", 
      status: "Processing", 
      priority: "Medium", 
      receivedAt: "2023-10-14T13:20:00",
      location: "Sorting Area 2",
      weight: 32.1,
      dimensions: "80x60x50 cm",
      contents: "Small Appliance",
      notes: "Check for damage",
      estimatedProcessTime: 5,
      assignedTo: "Robert Brown"
    },
    { 
      id: 6, 
      trackingId: "TRK-001-006", 
      orderId: "ORD-006", 
      client: "Sports Equipment Ltd", 
      status: "Loaded", 
      priority: "High", 
      receivedAt: "2023-10-13T09:00:00",
      loadedAt: "2023-10-15T10:15:00",
      location: "Vehicle VAN-205",
      weight: 18.9,
      dimensions: "120x40x30 cm",
      contents: "Sports Gear",
      notes: "Weather-sensitive",
      estimatedProcessTime: 2,
      assignedTo: "John Doe"
    },
    { 
      id: 7, 
      trackingId: "TRK-001-007", 
      orderId: "ORD-007", 
      client: "Medical Supplies Intl", 
      status: "Processing", 
      priority: "High", 
      receivedAt: "2023-10-13T14:35:00",
      location: "Quality Check Zone",
      weight: 12.3,
      dimensions: "45x35x25 cm",
      contents: "Medical Equipment",
      notes: "Temperature controlled",
      estimatedProcessTime: 3,
      assignedTo: "Jane Smith"
    },
    { 
      id: 8, 
      trackingId: "TRK-001-008", 
      orderId: "ORD-008", 
      client: "Office Essentials", 
      status: "Dispatched", 
      priority: "Low", 
      receivedAt: "2023-10-12T10:10:00",
      loadedAt: "2023-10-12T14:30:00",
      dispatchedAt: "2023-10-12T15:15:00",
      location: "In Transit",
      weight: 7.5,
      dimensions: "35x25x15 cm",
      contents: "Stationery",
      notes: "",
      estimatedProcessTime: 4,
      assignedTo: "Mike Johnson"
    },
    { 
      id: 9, 
      trackingId: "TRK-001-009", 
      orderId: "ORD-009", 
      client: "Tech Solutions Inc.", 
      status: "Loaded", 
      priority: "Medium", 
      receivedAt: "2023-10-12T11:45:00",
      loadedAt: "2023-10-15T11:30:00",
      location: "Vehicle TRUCK-101",
      weight: 25.8,
      dimensions: "70x50x40 cm",
      contents: "Networking Equipment",
      notes: "High value",
      estimatedProcessTime: 4,
      assignedTo: "Sarah Wilson"
    },
    { 
      id: 10, 
      trackingId: "TRK-001-010", 
      orderId: "ORD-010", 
      client: "Global Imports LLC", 
      status: "Received", 
      priority: "High", 
      receivedAt: "2023-10-11T08:20:00",
      location: "Receiving Dock C",
      weight: 19.7,
      dimensions: "50x40x30 cm",
      contents: "Home Goods",
      notes: "Stack no more than 2 high",
      estimatedProcessTime: 3,
      assignedTo: "Robert Brown"
    }
  ];

  const [packages, setPackages] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState<any[]>([]);

  // Simulate API call with useEffect
  useEffect(() => {
    // Simulate API loading delay
    const timer = setTimeout(() => {
      setPackages(initialPackages);
    }, 500);
    
    // Simulate real-time updates
    const updateInterval = setInterval(() => {
      simulateRealTimeUpdate();
    }, 10000); // Every 10 seconds
    
    return () => {
      clearTimeout(timer);
      clearInterval(updateInterval);
    };
  }, []);

  // Simulate real-time updates from TCP/IP connection
  const simulateRealTimeUpdate = () => {
    if (packages.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * packages.length);
    const randomPackage = packages[randomIndex];
    const statuses = ["Received", "Processing", "Loaded", "Dispatched"];
    const currentStatusIndex = statuses.indexOf(randomPackage.status);
    
    if (currentStatusIndex < statuses.length - 1) {
      const newStatus = statuses[currentStatusIndex + 1];
      const updatedPackages = packages.map((p, idx) => 
        idx === randomIndex ? { 
          ...p, 
          status: newStatus,
          ...(newStatus === "Loaded" && { loadedAt: new Date().toISOString() }),
          ...(newStatus === "Dispatched" && { dispatchedAt: new Date().toISOString() })
        } : p
      );
      
      setPackages(updatedPackages);
      
      // Add to real-time updates log
      const update = {
        id: Date.now(),
        message: `Package ${randomPackage.trackingId} status updated to ${newStatus}`,
        timestamp: new Date().toISOString(),
        type: "status_update"
      };
      
      setRealTimeUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep only last 10 updates
    }
  };

  // Filter packages based on status, search term, and date
  const filteredPackages = packages.filter((p) => {
    const matchesFilter = filter === "All" || p.status === filter;
    const matchesSearch = p.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const packageDate = new Date(p.receivedAt).toISOString().split('T')[0];
    const matchesDate = !dateFilter || packageDate === dateFilter;
    return matchesFilter && matchesSearch && matchesDate;
  });

  // Get unique dates for filter
  const uniqueDates = Array.from(new Set(packages.map(p => new Date(p.receivedAt).toISOString().split('T')[0]))).sort().reverse();

  // Handle status update
  const handleStatusChange = (id: number, status: string) => {
    const updatedPackages = packages.map((p) => 
      p.id === id ? { 
        ...p, 
        status,
        ...(status === "Loaded" && !p.loadedAt && { loadedAt: new Date().toISOString() }),
        ...(status === "Dispatched" && !p.dispatchedAt && { dispatchedAt: new Date().toISOString() })
      } : p
    );
    setPackages(updatedPackages);
    setStatusMenuOpen(null);
    
    // Add to real-time updates log
    const updatedPackage = updatedPackages.find(p => p.id === id);
    const update = {
      id: Date.now(),
      message: `Package ${updatedPackage.trackingId} status manually updated to ${status}`,
      timestamp: new Date().toISOString(),
      type: "manual_update"
    };
    
    setRealTimeUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep only last 10 updates
    
    // In a real app, you would call your API here
    console.log(`Package ${id} status updated to ${status}`);
  };

  // Toggle status menu
  const toggleStatusMenu = (id: number) => {
    setStatusMenuOpen(statusMenuOpen === id ? null : id);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format date and time for display
  const formatDateTime = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Show package details
  const showPackageDetails = (p: any) => {
    setSelectedPackage(p);
    setIsDetailModalOpen(true);
  };

  // Calculate time in current status
  const getTimeInStatus = (p: any) => {
    const now = new Date();
    let statusTime;
    
    switch(p.status) {
      case "Received":
        statusTime = new Date(p.receivedAt);
        break;
      case "Processing":
        statusTime = new Date(p.receivedAt); // Assuming processing starts after receiving
        break;
      case "Loaded":
        statusTime = new Date(p.loadedAt);
        break;
      case "Dispatched":
        statusTime = new Date(p.dispatchedAt);
        break;
      default:
        statusTime = new Date(p.receivedAt);
    }
    
    const diffMs = now.getTime() - statusTime.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    return `${diffHrs} hours`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        <Sidebar role="admin" />

        <div className="p-6 flex-1 ml-64">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Warehouse Monitoring System</h2>
          
          {/* Real-time updates panel */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-blue-800">Real-time Updates</h3>
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            </div>
            <div className="h-20 overflow-y-auto">
              {realTimeUpdates.length > 0 ? (
                <ul className="text-sm">
                  {realTimeUpdates.map(update => (
                    <li key={update.id} className="mb-1">
                      <span className="text-gray-500">{formatDateTime(update.timestamp)}:</span> 
                      <span className="ml-1">{update.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">Waiting for updates... (simulated every 10 seconds)</p>
              )}
            </div>
          </div>
          
          {/* Filters and Search */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setFilter("All")}
                className={`px-4 py-2 rounded-full text-sm font-medium ${filter === "All" ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                All Packages
              </button>
              <button 
                onClick={() => setFilter("Received")}
                className={`px-4 py-2 rounded-full text-sm font-medium ${filter === "Received" ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                Received
              </button>
              <button 
                onClick={() => setFilter("Processing")}
                className={`px-4 py-2 rounded-full text-sm font-medium ${filter === "Processing" ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                Processing
              </button>
              <button 
                onClick={() => setFilter("Loaded")}
                className={`px-4 py-2 rounded-full text-sm font-medium ${filter === "Loaded" ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                Loaded
              </button>
              <button 
                onClick={() => setFilter("Dispatched")}
                className={`px-4 py-2 rounded-full text-sm font-medium ${filter === "Dispatched" ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                Dispatched
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-48 appearance-none"
                >
                  <option value="">All Dates</option>
                  {uniqueDates.map(date => (
                    <option key={date} value={date}>{formatDate(date)}</option>
                  ))}
                </select>
                <svg 
                  className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search clients, tracking or orders..."
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg 
                  className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-600">Total Packages</h3>
              <p className="text-3xl font-bold">{packages.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-600">Received</h3>
              <p className="text-3xl font-bold text-yellow-600">{packages.filter(p => p.status === "Received").length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-600">Processing</h3>
              <p className="text-3xl font-bold text-purple-600">{packages.filter(p => p.status === "Processing").length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-600">Loaded</h3>
              <p className="text-3xl font-bold text-orange-600">{packages.filter(p => p.status === "Loaded").length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-600">Dispatched</h3>
              <p className="text-3xl font-bold text-green-600">{packages.filter(p => p.status === "Dispatched").length}</p>
            </div>
          </div>

          {/* Packages Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking ID</th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time in Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPackages.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    {/* <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-blue-600 cursor-pointer" onClick={() => showPackageDetails(p)}>
                      {p.trackingId}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm mr-3">
                          {p.client.charAt(0)}
                        </div>
                        <div>
                          <div>{p.client}</div>
                          <div className="text-xs text-gray-500">{p.orderId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(p.receivedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${p.priority === 'High' ? 'bg-red-100 text-red-800' : 
                          p.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {p.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${p.status === 'Received' ? 'bg-yellow-100 text-yellow-800' : 
                          p.status === 'Processing' ? 'bg-purple-100 text-purple-800' : 
                          p.status === 'Loaded' ? 'bg-orange-100 text-orange-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getTimeInStatus(p)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap relative">
                      <button 
                        onClick={() => toggleStatusMenu(p.id)}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      
                      {statusMenuOpen === p.id && (
                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            <button
                              onClick={() => handleStatusChange(p.id, "Received")}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left flex items-center"
                              role="menuitem"
                            >
                              <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                              Mark as Received
                            </button>
                            <button
                              onClick={() => handleStatusChange(p.id, "Processing")}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left flex items-center"
                              role="menuitem"
                            >
                              <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                              Mark as Processing
                            </button>
                            <button
                              onClick={() => handleStatusChange(p.id, "Loaded")}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left flex items-center"
                              role="menuitem"
                            >
                              <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
                              Mark as Loaded
                            </button>
                            <button
                              onClick={() => handleStatusChange(p.id, "Dispatched")}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left flex items-center"
                              role="menuitem"
                            >
                              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                              Mark as Dispatched
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPackages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2">No packages found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Package Detail Modal */}
      {isDetailModalOpen && selectedPackage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
            <div className="flex items-start justify-between p-5 border-b rounded-t">
              <h3 className="text-xl font-semibold text-gray-900">
                Package Details: {selectedPackage.trackingId}
              </h3>
              <button
                type="button"
                className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                onClick={() => setIsDetailModalOpen(false)}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-500">Order Information</h4>
                  <p className="mt-1">Order ID: {selectedPackage.orderId}</p>
                  <p className="mt-1">Client: {selectedPackage.client}</p>
                  <p className="mt-1">Priority: 
                    <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${selectedPackage.priority === 'High' ? 'bg-red-100 text-red-800' : 
                        selectedPackage.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {selectedPackage.priority}
                    </span>
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-500">Status Information</h4>
                  <p className="mt-1">Current Status: 
                    <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${selectedPackage.status === 'Received' ? 'bg-yellow-100 text-yellow-800' : 
                        selectedPackage.status === 'Processing' ? 'bg-purple-100 text-purple-800' : 
                        selectedPackage.status === 'Loaded' ? 'bg-orange-100 text-orange-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {selectedPackage.status}
                    </span>
                  </p>
                  <p className="mt-1">Received: {formatDateTime(selectedPackage.receivedAt)}</p>
                  {selectedPackage.loadedAt && <p className="mt-1">Loaded: {formatDateTime(selectedPackage.loadedAt)}</p>}
                  {selectedPackage.dispatchedAt && <p className="mt-1">Dispatched: {formatDateTime(selectedPackage.dispatchedAt)}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-500">Package Details</h4>
                  <p className="mt-1">Weight: {selectedPackage.weight} kg</p>
                  <p className="mt-1">Dimensions: {selectedPackage.dimensions}</p>
                  <p className="mt-1">Contents: {selectedPackage.contents}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-500">Location & Assignment</h4>
                  <p className="mt-1">Current Location: {selectedPackage.location}</p>
                  <p className="mt-1">Assigned To: {selectedPackage.assignedTo}</p>
                  <p className="mt-1">Estimated Process Time: {selectedPackage.estimatedProcessTime} hours</p>
                </div>
              </div>
              
              {selectedPackage.notes && (
                <div>
                  <h4 className="font-medium text-gray-500">Special Notes</h4>
                  <p className="mt-1 p-3 bg-yellow-50 rounded-md">{selectedPackage.notes}</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
              <button
                type="button"
                className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouse;