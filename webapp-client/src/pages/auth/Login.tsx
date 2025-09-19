// Login.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../../api";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const data = await loginUser(email, password);
      console.log('Login successful, response:', data);
      
      // Extract token and user info from response
      let token: string = '';
      let user: any = null;
      
      if (data.token) {
        token = data.token;
      } else if (data.data?.tokens?.access_token) {
        token = data.data.tokens.access_token;
      }
      
      if (data.user) {
        user = data.user;
      } else if (data.data?.user) {
        user = data.data.user;
      }
      
      if (!token) {
        throw new Error('No token received from login response');
      }
      
      if (!user) {
        throw new Error('No user data received from login response');
      }
      
      // Store token and user info
      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("userEmail", user.email);
      
      console.log('Token and user data stored, redirecting...');
      
      // Redirect based on role
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/client/Orders");
      }
    } catch (err: any) {
      console.error("Login failed", err);
      alert(`Login failed: ${err.message || 'Please check your credentials and try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'}}>
      <Navbar />
      
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="text-3xl font-bold" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Login to Your Account</h2>
            <p className="mt-2" style={{color: '#667eea'}}>Access your SwiftTrack dashboard</p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1" style={{color: '#667eea'}}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" style={{borderColor: '#667eea', color: '#333'}}
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1" style={{color: '#667eea'}}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" style={{borderColor: '#667eea', color: '#333'}}
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500" style={{accentColor: '#667eea'}}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm" style={{color: '#667eea'}}>
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium transition-colors duration-300" style={{color: '#667eea'}} onMouseEnter={(e) => e.currentTarget.style.color = '#764ba2'} onMouseLeave={(e) => e.currentTarget.style.color = '#667eea'}>
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white transition duration-300 transform hover:translate-x-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'}}
              >
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </div>
            
            <div className="text-center">
              <p style={{color: '#667eea'}}>
                Don't have an account?{" "}
                <Link to="/signup" className="font-medium transition-colors duration-300" style={{color: '#667eea'}} onMouseEnter={(e) => e.currentTarget.style.color = '#764ba2'} onMouseLeave={(e) => e.currentTarget.style.color = '#667eea'}>
                  Sign up here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Login;