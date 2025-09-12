// components/Navbar.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-amber-900 text-white shadow-lg">
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
            <Link to="/" className="hover:text-amber-200 transition duration-300">Home</Link>
             </div>
          
          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex space-x-4">
            <Link to="/login" className="px-4 py-2 rounded hover:bg-amber-700 transition duration-300">Login</Link>
            <Link to="/signup" className="bg-amber-700 px-4 py-2 rounded hover:bg-amber-600 transition duration-300">Sign Up</Link>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4">
            <Link to="/" className="block py-2 hover:bg-amber-800 px-4 rounded">Home</Link>
           <div className="mt-4 pt-4 border-t border-amber-800">
              <Link to="/login" className="block py-2 hover:bg-amber-800 px-4 rounded">Login</Link>
              <Link to="/signup" className="block py-2 hover:bg-amber-800 px-4 rounded">Sign Up</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;