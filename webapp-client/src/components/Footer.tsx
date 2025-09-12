// components/Footer.tsx
import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-amber-900 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">SwiftTrack</h3>
            <p className="text-amber-200">
              Advanced logistics solutions for e-commerce businesses in Sri Lanka.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-amber-200 hover:text-white transition duration-300">Home</a></li>
              <li><a href="#" className="text-amber-200 hover:text-white transition duration-300">About Us</a></li>
              <li><a href="#" className="text-amber-200 hover:text-white transition duration-300">Services</a></li>
              <li><a href="#" className="text-amber-200 hover:text-white transition duration-300">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-amber-200 hover:text-white transition duration-300">Last-Mile Delivery</a></li>
              <li><a href="#" className="text-amber-200 hover:text-white transition duration-300">Real-Time Tracking</a></li>
              <li><a href="#" className="text-amber-200 hover:text-white transition duration-300">Warehouse Management</a></li>
              <li><a href="#" className="text-amber-200 hover:text-white transition duration-300">Route Optimization</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <address className="not-italic text-amber-200">
              <p>123 Logistics Street</p>
              <p>Colombo, Sri Lanka</p>
              <p className="mt-2">Phone: +94 11 234 5678</p>
              <p>Email: info@swiftlogistics.lk</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-amber-800 mt-8 pt-8 text-center text-amber-200">
          <p>&copy; {new Date().getFullYear()} Swift Logistics (Pvt) Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;