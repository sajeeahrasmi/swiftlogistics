import React from "react";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  role: "client" | "admin";
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, activeTab, setActiveTab }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear any authentication tokens or user data from storage
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    
    // Redirect to home page
    navigate("/");
  };

  const clientLinks = [
    // { id: "dashboard", path: "/client/dashboard", label: "Dashboard" },
    { id: "orders", path: "/client/orders", label: "Orders" },
    { id: "tracking", path: "/client/tracking", label: "Tracking" },
    { id: "billing", path: "/client/billing", label: "Billing" },
    { id: "support", path: "/client/profile", label: "Profile" },
  ];

  const adminLinks = [
    // { id: "overview", path: "/admin/dashboard", label: "Dashboard" },
    { id: "clients", path: "/admin/clients", label: "Clients" },
    { id: "warehouse", path: "/admin/warehouse", label: "Warehouse" },
    { id: "drivers", path: "/admin/drivers", label: "Drivers" },
    { id: "orders", path: "/admin/clientorders", label: "Orders" },

  ];

  const links = role === "client" ? clientLinks : adminLinks;

  return (
    <div className="fixed top-0 left-0 w-64 h-screen bg-amber-900 text-white flex flex-col justify-between z-50">
      {/* Top section */}
      <div>
        <div className="p-6">
          <h1 className="text-xl font-bold">SwiftTrack</h1>
          <p className="text-amber-200 text-sm">
            {role === "client" ? "Client Portal" : "Admin Portal"}
          </p>
        </div>
        <nav className="mt-6">
          <ul className="space-y-2 px-4">
            {links.map((item) => (
              <li key={item.id}>
                <a
                  href={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg hover:bg-amber-800 ${
                    activeTab === item.id ? "bg-amber-800" : ""
                  }`}
                  onClick={(e) => {
                    if (setActiveTab) {
                      e.preventDefault();
                      setActiveTab(item.id);
                      navigate(item.path);
                    }
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Logout button */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full bg-amber-700 hover:bg-amber-800 px-4 py-3 rounded-lg text-white font-semibold"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;