// ==================== ADMIN DRIVERS EXTRA ====================
export const addDriver = async (driverData: any) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, driver: { id: Math.floor(Math.random() * 10000), ...driverData } });
    }, 500);
  });
};

export const updateDriver = async (id: number, driverData: any) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, id, ...driverData });
    }, 500);
  });
};

export const deleteDriver = async (id: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, id });
    }, 500);
  });
};
// src/api/index.ts
import axios from "axios";

// Base URL of your backend
const API_BASE = "http://localhost:3001/api";

// Create an Axios instance
const api = axios.create({
  baseURL: API_BASE,
});

// Add token automatically to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== AUTH ====================

// src/api/index.ts
export const loginUser = async (email: string, password: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simple role simulation
      const role = email.includes("admin") ? "admin" : "client";
      resolve({ token: "mock-token", user: { email, role } });
    }, 500);
  });
};

// Signup user
export const signupUser = async (userData: any) => {
  // Simulate successful signup
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, user: userData });
    }, 500);
  });
};

// ==================== ORDERS ====================

// Get active orders
export const getOrders = async () => {
  const res = await api.get("/orders");
  return res.data;
};

// Submit a new order
export const submitOrder = async (orderData: any) => {
  const res = await api.post("/orders", orderData);
  return res.data;
};

// Get order history
export const getOrderHistory = async () => {
  const res = await api.get("/orders/history");
  return res.data;
};

// ==================== PROFILE ====================

// Get user profile
export const getProfile = async () => {
  const res = await api.get("/profile");
  return res.data;
};

// Update user profile
export const updateProfile = async (profileData: any) => {
  const res = await api.put("/profile", profileData);
  return res.data;
};

// ==================== ADMIN ====================

// Mock admin stats API
export const getAdminStats = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalClients: 12,
        totalOrders: 120,
        ordersInWarehouse: 30,
        outForDelivery: 50,
        completed: 40,
      });
    }, 500);
  });
};

// ==================== ADMIN CLIENTS ====================
export const getClients = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, company: "Acme Corp", contract: "2025-12-31", billing: "$1200" },
        { id: 2, company: "Beta Ltd", contract: "2026-06-30", billing: "$900" },
      ]);
    }, 500);
  });
};

export const updateClient = async (id: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, id });
    }, 500);
  });
};

// ==================== ADMIN ORDERS ====================
export const retryOrder = async (id: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, id });
    }, 500);
  });
};

// ==================== ADMIN DRIVERS ====================
export const getDrivers = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, name: "John Doe", route: "Colombo - Kandy" },
        { id: 2, name: "Jane Smith", route: "Colombo - Galle" },
      ]);
    }, 500);
  });
};

export const reassignRoute = async (driverId: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, driverId });
    }, 500);
  });
};

// ==================== ADMIN WAREHOUSE ====================
export const getWarehousePackages = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 101, client: "Acme Corp", status: "Received" },
        { id: 102, client: "Beta Ltd", status: "Stored" },
      ]);
    }, 500);
  });
};

export const updatePackageStatus = async (id: number, status: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, id, status });
    }, 500);
  });
};

// ==================== ADMIN LOGS ====================
export const getSystemLogs = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { timestamp: "2025-09-10 10:00", message: "System started" },
        { timestamp: "2025-09-10 10:05", message: "Order #101 processed" },
      ]);
    }, 500);
  });
};
