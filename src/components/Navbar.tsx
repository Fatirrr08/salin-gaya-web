import { Link, useLocation } from "react-router-dom";
import { Search, User, ShoppingBag, Menu, X, LogOut } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Fashion", href: "/category/fashion" },
  { label: "Accessories", href: "/category/accessories" },
  { label: "Shoes", href: "/category/shoes" },
  { label: "Semua", href: "/category/all" },
];

export default function Navbar() {
  const { totalItems } = useCart();
  const { currentUser, logout, role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="font-display text-2xl font-bold text-primary tracking-tight">
          Salin Gaya
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-secondary transition-colors hidden sm:block">
            <Search className="w-5 h-5 text-foreground" />
          </button>
          
          {currentUser ? (
            <div className="flex items-center gap-2">
              <Link to="/profile" className="p-2 rounded-full hover:bg-secondary transition-colors" title="Profil">
                <User className="w-5 h-5 text-primary" />
              </Link>
              {role === "Admin" && (
                <Link to="/admin/dashboard" className="text-xs font-bold bg-primary text-primary-foreground px-2 py-1 rounded hidden sm:block">
                  Admin
                </Link>
              )}
              {role === "Penjual" && (
                <Link to="/seller/dashboard" className="text-xs font-bold bg-secondary text-secondary-foreground px-2 py-1 rounded hidden sm:block">
                  Penjual
                </Link>
              )}
              <button onClick={() => logout()} className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Keluar">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="p-2 rounded-full hover:bg-secondary transition-colors" title="Masuk">
              <User className="w-5 h-5 text-foreground" />
            </Link>
          )}

          <Link to="/checkout" className="p-2 rounded-full hover:bg-secondary transition-colors relative" title="Keranjang">
            <ShoppingBag className="w-5 h-5 text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            className="md:hidden p-2 rounded-full hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-b border-border"
          >
            <div className="px-4 pb-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
