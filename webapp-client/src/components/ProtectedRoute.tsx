import React from "react";
import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  role: "client" | "admin";
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ role }) => {
  const userRole = localStorage.getItem("role"); // Or from context/auth state

  if (userRole !== role) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
