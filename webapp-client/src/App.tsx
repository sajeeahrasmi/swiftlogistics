import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Client Pages
import ClientDashboard from "./pages/Client/Dashboard";
import ClientOrders from "./pages/Client/Orders";
import ClientTracking from "./pages/Client/Tracking";
import ClientBilling from "./pages/Client/Billing";
import ClientProfile from "./pages/Client/Profile";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminClients from "./pages/admin/Clients";
import AdminWarehouse from "./pages/admin/Warehouse";
import AdminDrivers from "./pages/admin/Drivers";
import AdminClientOrders from "./pages/admin/ClientOrders";


// Auth
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

// ProtectedRoute component (checks role)
import ProtectedRoute from "./components/ProtectedRoute";

// Home Page
import Home from "./pages/Home";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Client Routes */}
        <Route element={<ProtectedRoute role="client" />}>
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/orders" element={<ClientOrders />} />
          <Route path="/client/tracking" element={<ClientTracking />} />
          <Route path="/client/billing" element={<ClientBilling />} />
          <Route path="/client/profile" element={<ClientProfile />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/admin/warehouse" element={<AdminWarehouse />} />
          <Route path="/admin/drivers" element={<AdminDrivers />} />
          <Route path="/admin/clientorders" element={<AdminClientOrders />} />
        
        </Route>

        {/* Home Route */}
        <Route path="/" element={<Home />} />

        {/* Redirect any unknown route to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;
