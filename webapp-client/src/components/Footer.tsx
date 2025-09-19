// components/Footer.tsx
import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="text-white py-12" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '2px 0 10px rgba(0,0,0,0.1)'}}>
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">SwiftTrack</h3>
            <p className="text-white/80">
              Advanced logistics solutions for e-commerce businesses in Sri Lanka.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/80 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 block">Home</a></li>
              <li><a href="#" className="text-white/80 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 block">About Us</a></li>
              <li><a href="#" className="text-white/80 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 block">Services</a></li>
              <li><a href="#" className="text-white/80 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 block">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/80 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 block">Last-Mile Delivery</a></li>
              <li><a href="#" className="text-white/80 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 block">Real-Time Tracking</a></li>
              <li><a href="#" className="text-white/80 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 block">Warehouse Management</a></li>
              <li><a href="#" className="text-white/80 hover:text-white hover:bg-white/15 px-3 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-1 block">Route Optimization</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <address className="not-italic text-white/80">
              <p>123 Logistics Street</p>
              <p>Colombo, Sri Lanka</p>
              <p className="mt-2">Phone: +94 11 234 5678</p>
              <p>Email: info@swiftlogistics.lk</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/80">
          <p>&copy; {new Date().getFullYear()} Swift Logistics (Pvt) Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;