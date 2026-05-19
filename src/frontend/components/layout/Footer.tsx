import React from 'react';
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link
              to="/"
              className="font-display text-2xl font-bold text-[#A67B5B] tracking-tight mb-4 inline-block"
            >
              SalinGaya
            </Link>
            <p className="text-xs text-foreground leading-relaxed max-w-[250px] font-medium">
              Platform thrifting premium untuk fashion & lifestyle. Temukan
              barang secondhand berkualitas tinggi dengan harga terjangkau.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">About</h4>
            <ul className="space-y-3 text-xs text-foreground font-medium">
              <li>
                <Link to="/" className="hover:text-[#A67B5B] transition-colors">
                  About Salin Gaya
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-[#A67B5B] transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-[#A67B5B] transition-colors">
                  Careers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">Support</h4>
            <ul className="space-y-3 text-xs text-foreground font-medium">
              <li>
                <Link to="/" className="hover:text-[#A67B5B] transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-[#A67B5B] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-[#A67B5B] transition-colors">
                  Shipping Info
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3 text-xs text-foreground font-medium">
              <li>
                <Link to="/" className="hover:text-[#A67B5B] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-[#A67B5B] transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
