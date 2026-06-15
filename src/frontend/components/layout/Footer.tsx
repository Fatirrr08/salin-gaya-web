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
              className="font-display text-xl sm:text-2xl font-bold text-[#A67B5B] tracking-tight mb-4 inline-block"
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
                <span className="text-muted-foreground">
                  About Salin Gaya
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">
                  Our Story
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">
                  Careers
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">Support</h4>
            <ul className="space-y-3 text-xs text-foreground font-medium">
              <li>
                <span className="text-muted-foreground">
                  FAQ
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">
                  Contact Us
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">
                  Shipping Info
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3 text-xs text-foreground font-medium">
              <li>
                <span className="text-muted-foreground">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
