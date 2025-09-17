import axios from "axios";

// Base URLs for different services
const AUTH_SERVICE_URL = "http://localhost:3010/api";
const ORDER_SERVICE_URL = "http://localhost:3011/api";
const TRACKING_SERVICE_URL = "http://localhost:3003/api";

// Create separate Axios instances for different services
const authAPI = axios.create({
  baseURL: AUTH_SERVICE_URL,
  timeout: 10000,
});

const orderAPI = axios.create({
  baseURL: ORDER_SERVICE_URL,
  timeout: 10000,
});

const trackingAPI = axios.create({
  baseURL: TRACKING_SERVICE_URL,
  timeout: 10000,
});

// Add token automatically to all requests
const addAuthInterceptor = (apiInstance: any) => {
  apiInstance.interceptors.request.use((config: any) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Handle token expiration
  apiInstance.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );
};

// Apply interceptors
addAuthInterceptor(authAPI);
addAuthInterceptor(orderAPI);
addAuthInterceptor(trackingAPI);

// ==================== AUTH ====================
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010/api';

// Cache for profile data to reduce API calls
let profileCache: any = null;
let profileCacheTime: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache for development

// Rate limiting tracking
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests for safety

export const getProfile = async (skipCache: boolean = false) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('=== GET PROFILE DEBUG START ===');
    console.log('Token from localStorage:', token ? 'present' : 'missing');
    console.log('Token length:', token?.length);
    console.log('Token starts with:', token?.substring(0, 20) + '...');

    // Check cache first
    const now = Date.now();
    if (!skipCache && profileCache && (now - profileCacheTime) < CACHE_DURATION) {
      console.log('Returning cached profile data');
      return profileCache;
    }

    // Rate limiting check
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    console.log('Making request to:', `${API_BASE_URL}/auth/me`);
    console.log('Request headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token ? '[PRESENT]' : '[MISSING]'}`
    });

    lastRequestTime = Date.now();

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text first to handle both JSON and non-JSON responses
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      throw new Error(`Invalid response format: ${response.status}`);
    }

    console.log('Parsed response data:', data);
    console.log('=== GET PROFILE DEBUG END ===');

    if (!response.ok) {
      // Handle different HTTP status codes
      let errorMessage = data.message || data.error || 'Unknown error occurred';
      
      switch (response.status) {
        case 401:
          errorMessage = 'Authentication failed. Please login again.';
          localStorage.removeItem('token');
          profileCache = null; // Clear cache
          break;
        case 403:
          errorMessage = 'Access forbidden. Insufficient permissions.';
          break;
        case 404:
          errorMessage = 'User profile not found.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please wait before trying again.';
          // Don't clear cache for rate limiting
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Service temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = `HTTP error ${response.status}: ${errorMessage}`;
      }
      
      throw new Error(errorMessage);
    }

    // Cache successful response
    profileCache = data;
    profileCacheTime = now;

    return data;
  } catch (error: any) {
    console.error('Get profile API error:', error);
    
    // Handle network errors
    if (error instanceof TypeError || error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    // Re-throw the error with preserved message
    throw error;
  }
};

// Clear profile cache function
export const clearProfileCache = () => {
  profileCache = null;
  profileCacheTime = 0;
};

export const loginUser = async (email: string, password: string) => {
  try {
    console.log('Attempting login to:', `${API_BASE_URL}/auth/login`);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email.toLowerCase(), 
        password 
      }),
    });

    const responseText = await response.text();
    let data;
    
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      throw new Error(`Invalid response format: ${response.status}`);
    }

    console.log('Login response:', data);

    if (!response.ok) {
      const errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    // Store the token if login is successful
    if (data.success && data.token) {
      localStorage.setItem('token', data.token);
      console.log('Token stored successfully');
    } else if (data.data?.tokens?.access_token) {
      localStorage.setItem('token', data.data.tokens.access_token);
      console.log('Token stored from data.tokens.access_token');
    }

    // Clear any existing profile cache on login
    clearProfileCache();

    return data;
  } catch (error: any) {
    console.error('Login API error:', error);
    
    if (error instanceof TypeError || error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw error;
  }
};

export const signupUser = async (userData: any) => {
  try {
    console.log('Attempting signup to:', `${API_BASE_URL}/auth/register`);
    console.log('Signup data:', userData);
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const responseText = await response.text();
    let data;
    
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      throw new Error(`Invalid response format: ${response.status}`);
    }

    console.log('Signup response:', data);

    if (!response.ok) {
      const errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error: any) {
    console.error('Signup API error:', error);
    
    if (error instanceof TypeError || error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw error;
  }
};

export const updateProfile = async (profileData: any) => {
  try {
    // Map frontend field names to backend field names
    const mappedData: any = {};
    
    if (profileData.firstName !== undefined) {
      mappedData.first_name = profileData.firstName;
    }
    if (profileData.lastName !== undefined) {
      mappedData.last_name = profileData.lastName;
    }
    if (profileData.telephone !== undefined) {
      mappedData.phone = profileData.telephone;
    }
    
    // Note: address and password are not handled by the current backend profile update endpoint
    // password would need a separate change password endpoint
    // address field would need to be added to the database schema
    
    const response = await authAPI.put("/auth/profile", mappedData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update profile" };
  }
};

export const logoutUser = async () => {
  try {
    await authAPI.post("/auth/logout");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    clearProfileCache(); // Clear cache on logout
  } catch (error: any) {
    // Even if logout fails, clear local storage and cache
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    clearProfileCache();
  }
};

// ==================== ORDERS ====================
export const getOrders = async () => {
  try {
    const response = await orderAPI.get("/orders");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to get orders" };
  }
};

export const submitOrder = async (orderData: any) => {
  try {
    const response = await orderAPI.post("/orders", orderData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to create order" };
  }
};

export const getOrderHistory = async () => {
  try {
    const response = await orderAPI.get("/orders/history");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to get order history" };
  }
};

export const getClientOrders = async () => {
  try {
    const response = await orderAPI.get("/orders/client/me/orders");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to get client orders" };
  }
};

export const updateOrderStatus = async (orderId: number, status: string, notes?: string) => {
  try {
    const response = await orderAPI.patch(`/orders/${orderId}/status`, { 
      new_status: status,
      notes 
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update order status" };
  }
};

export const retryOrder = async (id: number) => {
  try {
    const response = await orderAPI.post(`/orders/${id}/retry`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to retry order" };
  }
};

// ==================== ADMIN ====================
export const getDashboardOverview = async () => {
  try {
    const response = await orderAPI.get("/admin/dashboard/overview");
    return response.data;
  } catch (error: any) {
    console.error('Dashboard overview API error:', error);
    throw error.response?.data || { message: "Failed to get dashboard overview" };
  }
};

export const getAdminStats = async () => {
  try {
    const response = await orderAPI.get("/admin/dashboard/stats");
    return response.data;
  } catch (error: any) {
    // Fallback to mock data if backend not available
    return {
      totalClients: 12,
      totalOrders: 120,
      ordersInWarehouse: 30,
      outForDelivery: 50,
      completed: 40,
    };
  }
};

// ==================== ADMIN CLIENTS ====================
export const getClients = async () => {
  try {
    const response = await orderAPI.get("/admin/clients");
    return response.data;
  } catch (error: any) {
    // Fallback to mock data
    return [
      { id: 1, company: "Acme Corp", contract: "2025-12-31", billing: "$1200" },
      { id: 2, company: "Beta Ltd", contract: "2026-06-30", billing: "$900" },
    ];
  }
};

export const updateClient = async (id: number, clientData: any) => {
  try {
    const response = await orderAPI.put(`/admin/clients/${id}`, clientData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update client" };
  }
};

export const deleteClient = async (id: number) => {
  try {
    const response = await orderAPI.delete(`/admin/clients/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to delete client" };
  }
};

// ==================== ADMIN DRIVERS ====================
export const getDrivers = async () => {
  try {
    const response = await orderAPI.get("/drivers");
    return response.data;
  } catch (error: any) {
    // Fallback to mock data
    return [
      { id: 1, name: "John Doe", route: "Colombo - Kandy" },
      { id: 2, name: "Jane Smith", route: "Colombo - Galle" },
    ];
  }
};

export const addDriver = async (driverData: any) => {
  try {
    const response = await orderAPI.post("/drivers/comprehensive", driverData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to create driver" };
  }
};

export const updateDriver = async (id: number, driverData: any) => {
  try {
    const response = await orderAPI.put(`/drivers/${id}`, driverData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update driver" };
  }
};

export const deleteDriver = async (id: number) => {
  try {
    const response = await orderAPI.delete(`/drivers/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to delete driver" };
  }
};

export const reassignRoute = async (driverId: number, routeData: any) => {
  try {
    const response = await orderAPI.put(`/drivers/${driverId}/route`, routeData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to reassign route" };
  }
};

export const assignOrderToDriver = async (orderId: number, driverId: number, assignmentData: any) => {
  try {
    const response = await orderAPI.post(`/drivers/${driverId}/assign-order`, {
      order_id: orderId,
      ...assignmentData
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to assign order" };
  }
};

// ==================== ADMIN WAREHOUSE ====================
export const getWarehousePackages = async () => {
  try {
    const response = await orderAPI.get("/admin/warehouse/packages");
    return response.data;
  } catch (error: any) {
    // Fallback to mock data
    return [
      { id: 101, client: "Acme Corp", status: "Received" },
      { id: 102, client: "Beta Ltd", status: "Stored" },
    ];
  }
};

export const updatePackageStatus = async (id: number, status: string) => {
  try {
    const response = await orderAPI.patch(`/admin/warehouse/packages/${id}`, { status });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update package status" };
  }
};

// ==================== ADMIN LOGS ====================
export const getSystemLogs = async () => {
  try {
    const response = await orderAPI.get("/admin/logs");
    return response.data;
  } catch (error: any) {
    // Fallback to mock data
    return [
      { timestamp: "2025-09-10 10:00", message: "System started" },
      { timestamp: "2025-09-10 10:05", message: "Order #101 processed" },
    ];
  }
};

// ==================== TRACKING ====================
export const trackOrder = async (trackingNumber: string) => {
  try {
    const response = await trackingAPI.get(`/tracking/${trackingNumber}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to track order" };
  }
};

export const getOrderTracking = async (orderId: number) => {
  try {
    const response = await orderAPI.get(`/orders/${orderId}/tracking`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to get order tracking" };
  }
};

// Get all tracking orders for the client
export const getTrackingOrders = async () => {
  try {
    const response = await trackingAPI.get("/orders");
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to get tracking orders" };
  }
};

// Get tracking orders for a specific client by client ID
export const getClientTrackingOrders = async (clientId: number) => {
  try {
    const response = await trackingAPI.get(`/client/${clientId}/orders`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to get client tracking orders" };
  }
};

// Track specific order by tracking number
export const getTrackingByNumber = async (trackingNumber: string) => {
  try {
    const response = await trackingAPI.get(`/orders/${trackingNumber}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to track order by number" };
  }
};

// Update order tracking information
export const updateOrderTracking = async (trackingNumber: string, updateData: any) => {
  try {
    const response = await trackingAPI.put(`/orders/${trackingNumber}`, updateData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to update order tracking" };
  }
};

// ==================== CLIENT BILLING ====================
export const getBillingInfo = async () => {
  try {
    console.log('🔍 getBillingInfo: Making request to /orders/client/me/billing');
    console.log('🔍 Token available:', localStorage.getItem('token') ? 'YES' : 'NO');
    console.log('🔍 Order API base URL:', orderAPI.defaults.baseURL);
    
    const response = await orderAPI.get("/orders/client/me/billing");
    console.log('✅ getBillingInfo: Success!', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ getBillingInfo: Error occurred', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    throw error.response?.data || { message: "Failed to get billing info" };
  }
};

export const getInvoices = async () => {
  try {
    console.log('🔍 getInvoices: Making request to /orders/client/me/invoices');
    console.log('🔍 Token available:', localStorage.getItem('token') ? 'YES' : 'NO');
    console.log('🔍 Order API base URL:', orderAPI.defaults.baseURL);
    
    const response = await orderAPI.get("/orders/client/me/invoices");
    console.log('✅ getInvoices: Success!', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ getInvoices: Error occurred', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    throw error.response?.data || { message: "Failed to get invoices" };
  }
};

// New client ID-based billing functions (no authentication required)
export const getBillingInfoByClientId = async (clientId: number) => {
  try {
    console.log('🔍 getBillingInfoByClientId: Making request for client ID:', clientId);
    
    // Create a new axios instance without auth interceptors for this request
    const publicOrderAPI = axios.create({
      baseURL: ORDER_SERVICE_URL,
      timeout: 10000,
    });
    
    const response = await publicOrderAPI.get(`/orders/client/${clientId}/billing`);
    console.log('✅ getBillingInfoByClientId: Success!', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ getBillingInfoByClientId: Error occurred', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    throw error.response?.data || { message: "Failed to get billing info by client ID" };
  }
};

export const getInvoicesByClientId = async (clientId: number) => {
  try {
    console.log('🔍 getInvoicesByClientId: Making request for client ID:', clientId);
    
    // Create a new axios instance without auth interceptors for this request
    const publicOrderAPI = axios.create({
      baseURL: ORDER_SERVICE_URL,
      timeout: 10000,
    });
    
    const response = await publicOrderAPI.get(`/orders/client/${clientId}/invoices`);
    console.log('✅ getInvoicesByClientId: Success!', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ getInvoicesByClientId: Error occurred', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    throw error.response?.data || { message: "Failed to get invoices by client ID" };
  }
};

export const downloadInvoice = async (invoiceId: number) => {
  try {
    const response = await orderAPI.get(`/orders/client/me/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to download invoice" };
  }
};

// ==================== UTILITY FUNCTIONS ====================
export const uploadFile = async (file: File, endpoint: string) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await orderAPI.post(`/upload/${endpoint}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: "Failed to upload file" };
  }
};

export const healthCheck = async () => {
  try {
    const authHealth = await authAPI.get("/health");
    const orderHealth = await orderAPI.get("/health");
    
    return {
      auth: authHealth.data,
      order: orderHealth.data,
    };
  } catch (error: any) {
    throw error.response?.data || { message: "Health check failed" };
  }
};

// Export API instances for direct use if needed
export { authAPI, orderAPI, trackingAPI };