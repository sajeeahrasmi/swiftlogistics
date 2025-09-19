// components/Navbar.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="text-white shadow-lg" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '2px 0 10px rgba(0,0,0,0.1)'}}>
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">SwiftTrack</Link>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            <Link to="/" className="text-white/80 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1">Home</Link>
             </div>
          
          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex space-x-4">
            <Link to="/login" className="text-white/80 hover:text-white hover:bg-white/15 px-4 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1">Login</Link>
            <Link to="/signup" className="text-white/80 hover:text-white hover:bg-white/15 px-4 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1">Sign Up</Link>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4">
            <Link to="/" className="block py-2 text-white/80 hover:text-white hover:bg-white/15 px-4 rounded-lg transition-all duration-300 transform hover:translate-x-1">Home</Link>
           <div className="mt-4 pt-4 border-t border-white/20">
              <Link to="/login" className="block py-2 text-white/80 hover:text-white hover:bg-white/15 px-4 rounded-lg transition-all duration-300 transform hover:translate-x-1">Login</Link>
              <Link to="/signup" className="block py-2 text-white/80 hover:text-white hover:bg-white/15 px-4 rounded-lg transition-all duration-300 transform hover:translate-x-1">Sign Up</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;