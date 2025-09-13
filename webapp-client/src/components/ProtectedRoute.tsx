import React, { useEffect, useState, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getProfile } from "../api/index";

interface ProtectedRouteProps {
  role?: string;
  allowedRoles?: string[];
  children?: React.ReactNode;
}

interface User {
  id: number;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

interface AuthState {
  isAuthenticated: boolean | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  role, 
  allowedRoles, 
  children 
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: null,
    user: null,
    loading: true,
    error: null
  });

  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  // Use ref to prevent multiple simultaneous auth checks
  const authCheckInProgress = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Add a small delay to prevent immediate multiple requests on mount
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        checkAuth();
      }
    }, 100);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userEmail");
  };

  const checkAuth = async () => {
    // Prevent multiple simultaneous auth checks
    if (authCheckInProgress.current) {
      console.log("Auth check already in progress, skipping...");
      return;
    }

    authCheckInProgress.current = true;

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        console.log("No token found");
        if (mountedRef.current) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: null
          });
        }
        return;
      }

      console.log("Checking authentication...");
      const response = await getProfile();

      if (!mountedRef.current) return; // Component unmounted

      if (response.success && response.data?.user) {
        setAuthState({
          isAuthenticated: true,
          user: response.data.user,
          loading: false,
          error: null
        });
        console.log("Authentication successful:", response.data.user);
        setRetryCount(0); // Reset retry count on success
      } else {
        console.error("Authentication failed - invalid response:", response);
        clearAuthData();
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: "Invalid authentication response"
        });
      }
    } catch (error: any) {
      if (!mountedRef.current) return; // Component unmounted

      console.error("Auth check failed:", error);
      
      let errorMessage = "Authentication check failed";
      let shouldRetry = false;
      let retryDelay = 1000; // Default 1 second
      
      // Handle different error scenarios
      if (error.message) {
        if (error.message.includes('401') || error.message.includes('Unauthorized') || 
            error.message.includes('Authentication failed')) {
          errorMessage = "Session expired. Please login again.";
          clearAuthData();
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = "Access forbidden.";
          clearAuthData();
        } else if (error.message.includes('429') || error.message.includes('Too many requests')) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
          shouldRetry = retryCount < maxRetries;
          retryDelay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s delays for rate limiting
        } else if (error.message.includes('500') || error.message.includes('Server error')) {
          errorMessage = "Server error. Please try again later.";
          shouldRetry = retryCount < maxRetries;
          retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s delays
        } else if (error.message.includes('502') || error.message.includes('503') || 
                   error.message.includes('504') || error.message.includes('Service temporarily unavailable')) {
          errorMessage = "Service temporarily unavailable. Please try again later.";
          shouldRetry = retryCount < maxRetries;
          retryDelay = Math.pow(2, retryCount) * 1000;
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection.";
          shouldRetry = retryCount < maxRetries;
          retryDelay = Math.pow(2, retryCount) * 1000;
        }
      }
      
      if (shouldRetry) {
        console.log(`Retrying authentication check (${retryCount + 1}/${maxRetries}) in ${retryDelay}ms...`);
        setRetryCount(prev => prev + 1);
        
        // Set loading state to show retry is happening
        setAuthState(prev => ({
          ...prev,
          loading: true,
          error: `${errorMessage} (Retrying ${retryCount + 1}/${maxRetries}...)`
        }));
        
        // Retry with appropriate delay
        setTimeout(() => {
          if (mountedRef.current) {
            authCheckInProgress.current = false; // Reset flag before retry
            checkAuth();
          }
        }, retryDelay);
        
        return;
      }
      
      // If not retrying, clear auth data for certain errors
      if (!error.message?.includes('500') && !error.message?.includes('Network') && 
          !error.message?.includes('429')) {
        clearAuthData();
      }
      
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: errorMessage
      });
    } finally {
      authCheckInProgress.current = false;
    }
  };

  const isAuthorized = (): boolean => {
    if (!authState.user) return false;

    // If both role and allowedRoles are provided, use allowedRoles
    if (allowedRoles && allowedRoles.length > 0) {
      return allowedRoles.includes(authState.user.role);
    }

    // If only role is provided, check exact match
    if (role) {
      return authState.user.role === role;
    }

    // If no role restrictions, allow access
    return true;
  };

  // Loading state
  if (authState.loading) {
    return <LoadingComponent retryCount={retryCount} maxRetries={maxRetries} />;
  }

  // Error state with server errors - show retry option
  if (authState.error && !authState.isAuthenticated) {
    const isRetryableError = authState.error.includes('Server error') || 
                            authState.error.includes('Network error') ||
                            authState.error.includes('Service temporarily unavailable') ||
                            authState.error.includes('Too many requests');
    
    if (isRetryableError && retryCount < maxRetries) {
      return (
        <ErrorComponent 
          error={authState.error} 
          onRetry={() => {
            setAuthState(prev => ({ ...prev, loading: true }));
            authCheckInProgress.current = false; // Reset flag
            checkAuth();
          }}
          canRetry={true}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      );
    }
    
    return <Navigate to="/login" replace />;
  }

  // Not authenticated
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role authorization
  if (!isAuthorized()) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Render children if provided, otherwise render Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
};

// Enhanced Loading Component
const LoadingComponent: React.FC<{ retryCount?: number; maxRetries?: number }> = ({ 
  retryCount = 0, 
  maxRetries = 3 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-600 border-t-transparent absolute top-0 left-0"></div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-amber-900">Verifying Access</h3>
          <p className="text-sm text-amber-700 mt-1">
            Please wait while we check your permissions...
            {retryCount > 0 && ` (Attempt ${retryCount}/${maxRetries})`}
          </p>
        </div>
      </div>
    </div>
  );
};

// Error Component for server errors
const ErrorComponent: React.FC<{ 
  error: string; 
  onRetry?: () => void; 
  canRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
}> = ({ error, onRetry, canRetry = false, retryCount = 0, maxRetries = 3 }) => {
  const isRateLimit = error.includes('Too many requests');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <div className="text-red-500 text-4xl mb-4">
          {isRateLimit ? '⏳' : '⚠️'}
        </div>
        <h2 className="text-xl font-bold text-amber-900 mb-4">
          {isRateLimit ? 'Please Wait' : 'Connection Error'}
        </h2>
        <p className="text-amber-700 mb-6">{error}</p>
        {retryCount > 0 && (
          <p className="text-sm text-amber-600 mb-4">
            Retry attempt {retryCount} of {maxRetries}
          </p>
        )}
        <div className="space-y-3">
          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-2 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition duration-300"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => window.location.href = "/login"}
            className="w-full py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Component for unauthorized access
const UnauthorizedComponent: React.FC = () => {
  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    const role = localStorage.getItem("role");
    if (role === "admin") {
      window.location.href = "/admin/dashboard";
    } else {
      window.location.href = "/client/dashboard";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <div className="text-red-500 text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold text-amber-900 mb-4">Access Denied</h2>
        <p className="text-amber-700 mb-6">
          You don't have permission to access this page.
        </p>
        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full py-2 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition duration-300"
          >
            Go to Dashboard
          </button>
          <button
            onClick={handleGoBack}
            className="w-full py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Boundary Component for ProtectedRoute
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ProtectedRouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ProtectedRoute Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-amber-50">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-amber-900 mb-4">Something went wrong</h2>
            <p className="text-amber-700 mb-4">
              An error occurred while checking your authentication.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition duration-300"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced Protected Route with Error Boundary
export const ProtectedRouteWithErrorBoundary: React.FC<ProtectedRouteProps> = (props) => {
  return (
    <ProtectedRouteErrorBoundary>
      <React.Suspense fallback={<LoadingComponent />}>
        <ProtectedRoute {...props} />
      </React.Suspense>
    </ProtectedRouteErrorBoundary>
  );
};

// Hook for using auth state in components
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: null,
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: null
          });
          return;
        }

        const response = await getProfile();
        if (response.success && response.data?.user) {
          setAuthState({
            isAuthenticated: true,
            user: response.data.user,
            loading: false,
            error: null
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: "Invalid authentication"
          });
        }
      } catch (error: any) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: error.message || "Authentication failed"
        });
      }
    };

    checkAuthStatus();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userEmail");
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    });
  };

  return { ...authState, logout };
};

// Export the Unauthorized component for use in routes
export { UnauthorizedComponent };

export default ProtectedRoute;