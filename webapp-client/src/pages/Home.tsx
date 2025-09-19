// Home.tsx
import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-20" style={{background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'}}>
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Welcome to SwiftTrack</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{color: '#667eea'}}>
            Manage and track your deliveries with our advanced logistics platform designed for e-commerce businesses.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              to="/login" 
              className="text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:translate-x-1"
              style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'}}
            >
              Login
            </Link>
            <Link 
              to="/signup" 
              className="bg-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:translate-x-1"
              style={{color: '#667eea', borderColor: '#667eea', border: '2px solid'}}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Why Choose SwiftTrack?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg shadow-md text-center" style={{background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'}}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{color: '#667eea'}}>Secure Delivery</h3>
              <p style={{color: '#667eea'}}>Your packages are handled with the utmost care and security throughout the delivery process.</p>
            </div>
            
            <div className="p-6 rounded-lg shadow-md text-center" style={{background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'}}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{color: '#667eea'}}>Real-Time Tracking</h3>
              <p style={{color: '#667eea'}}>Monitor your deliveries in real-time with our advanced tracking system.</p>
            </div>
            
            <div className="p-6 rounded-lg shadow-md text-center" style={{background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'}}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{color: '#667eea'}}>Optimized Routes</h3>
              <p style={{color: '#667eea'}}>Our smart routing ensures your packages reach their destination faster and more efficiently.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16" style={{background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'}}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h2 className="text-3xl font-bold mb-4" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>About SwiftTrack</h2>
              <p className="mb-4" style={{color: '#667eea'}}>
                SwiftTrack (Pvt) Ltd is a rapidly growing logistics company in Sri Lanka, specializing in last-mile delivery for e-commerce businesses. We offer delivery services for a range of clients, from large online retailers to small-scale independent sellers.
              </p>
              <p style={{color: '#667eea'}}>
                Our new SwiftTrack platform integrates cutting-edge technology to provide seamless delivery management and real-time tracking for our valued clients.
              </p>
            </div>
            <div className="md:w-1/2 md:pl-12">
              <div className="p-8 rounded-lg shadow-md" style={{background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'}}>
                <h3 className="text-xl font-semibold mb-4" style={{color: '#667eea'}}>Our Mission</h3>
                <p style={{color: '#667eea'}}>
                  To revolutionize last-mile delivery in Sri Lanka through technology, reliability, and exceptional customer service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
