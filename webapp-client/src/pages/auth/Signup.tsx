// Signup.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupUser } from "../../api";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const Signup: React.FC = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();

  if (form.password !== form.confirmPassword) {
    alert("Passwords don't match");
    return;
  }

  setIsLoading(true);

  try {
    // Split full name into first and last
    const nameParts = form.name.trim().split(" ");
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(" ") || " "; // if no last name, send a space

    await signupUser({
      email: form.email,
      password: form.password,
      first_name,
      last_name,
      role: "client",  // your backend expects this
    });

    alert("Signup successful! Please login.");
    navigate("/login");
  } catch (err) {
    console.error("Signup failed", err);
    alert("Signup failed. Please try again.");
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
            <h2 className="text-3xl font-bold" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Create Your Account</h2>
            <p className="mt-2" style={{color: '#667eea'}}>Join SwiftTrack to manage your deliveries</p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSignup}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1" style={{color: '#667eea'}}>
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" style={{borderColor: '#667eea', color: '#333'}}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1" style={{color: '#667eea'}}>
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
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
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" style={{borderColor: '#667eea', color: '#333'}}
                  placeholder="Create a password"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1" style={{color: '#667eea'}}>
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" style={{borderColor: '#667eea', color: '#333'}}
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500" style={{accentColor: '#667eea'}}
                required
              />
              <label htmlFor="terms" className="ml-2 block text-sm" style={{color: '#667eea'}}>
                I agree to the <a href="#" className="transition-colors duration-300" style={{color: '#667eea'}} onMouseEnter={(e) => e.currentTarget.style.color = '#764ba2'} onMouseLeave={(e) => e.currentTarget.style.color = '#667eea'}>Terms and Conditions</a>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white transition duration-300 transform hover:translate-x-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'}}
              >
                {isLoading ? (
                  <span>Creating account...</span>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </div>
            
            <div className="text-center">
              <p style={{color: '#667eea'}}>
                Already have an account?{" "}
                <Link to="/login" className="font-medium transition-colors duration-300" style={{color: '#667eea'}} onMouseEnter={(e) => e.currentTarget.style.color = '#764ba2'} onMouseLeave={(e) => e.currentTarget.style.color = '#667eea'}>
                  Sign in here
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

export default Signup;