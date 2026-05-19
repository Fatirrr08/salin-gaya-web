import React from 'react';
import { Link, useLocation } from "react-router-dom";
import {
  Search,
  User,
  ShoppingCart,
  Menu,
  X,
  LogOut,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { subscribeToAdminChats } from "@/backend/services/chatService";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { dbFirestore } from "@/backend/config/firebase";
import { useCart } from "@/frontend/contexts/CartContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlobalSearch from "@/frontend/components/ui/GlobalSearch";

export default function Navbar() {
  const { totalItems } = useCart();
  const { currentUser, logout, role, loading: authLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [hasUnreadAdmin, setHasUnreadAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (role === "Admin") {
      const unsubscribe = subscribeToAdminChats((chats) => {
        const unread = chats.some(
          (c) => c.hasUnread && c.lastSenderId !== "admin",
        );
        setHasUnreadAdmin(unread);
      });
      return () => unsubscribe();
    } else if (currentUser) {
      const q = query(
        collection(dbFirestore, "chat_rooms"),
        where("participants", "array-contains", currentUser.uid),
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let count = 0;
        snapshot.forEach((docSnap) => {
          const chat = docSnap.data();
          if (chat.hasUnread && chat.lastSenderId !== currentUser.uid) {
            count++;
          }
        });
        setUnreadCount(count);
      });
      return () => unsubscribe();
    }
  }, [role, currentUser]);

  const isActive = (href: string) => location.pathname === href;

  const SingleLink = ({ href, label }: { href: string; label: string }) => {
    const active = isActive(href);
    return (
      <div className="relative flex flex-col items-center py-1">
        <Link
          to={href}
          className={`text-[15px] font-medium font-sans transition-colors duration-300 ${
            active
              ? "text-[#A67B5B]"
              : "text-[#5C3A21] hover:text-[#A67B5B]"
          }`}
        >
          {label}
        </Link>
        {active && (
          <motion.span
            layoutId="active-underline"
            className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-[#A67B5B]"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#F9F6F0] border-b border-[#EBE5D9]">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        {/* Logo */}
        <Link
          to="/"
          className="font-display text-2xl font-bold text-[#5C3A21] tracking-tight"
        >
          SalinGaya
        </Link>

        {/* Desktop Links (Bersih, Sesuai Figma) */}
        <div className="hidden md:flex flex-1 justify-center items-center gap-10">
          <SingleLink href="/category/fashion" label="Fashion" />
          <SingleLink href="/category/accessories" label="Accessories" />
          <SingleLink href="/category/shoes" label="Shoes" />
          <SingleLink href="/category/all" label="Semua" />
          <SingleLink href="/chat/admin" label="Bantuan" />
        </div>

        {/* Icons */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Search — visible on all screen sizes */}
          <GlobalSearch />

          {authLoading ? (
            <div className="w-10 h-10 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-[#5C3A21] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : currentUser ? (
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Inbox / Chat Icon with Badge */}
              <Link
                to={role === "Admin" ? "/admin/chat" : "/inbox"}
                className="relative p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
                title="Pesan"
              >
                <MessageCircle className="w-[20px] h-[20px] text-[#5C3A21]" />
                <AnimatePresence>
                  {(unreadCount > 0 || hasUnreadAdmin) && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#F9F6F0] animate-pulse"
                    >
                      {unreadCount > 0 ? unreadCount : ""}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Akun Saya Dropdown (Semua menu kompleks pindah ke sini) */}
              <div className="relative group flex items-center h-20 cursor-pointer">
                <div className="p-2 rounded-full group-hover:bg-black/5 transition-colors duration-200">
                  <User className="w-[20px] h-[20px] text-[#5C3A21]" />
                </div>
                <div className="absolute top-16 right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[220px]">
                  <div className="bg-white rounded-xl shadow-lg border border-[#EBE5D9] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-[#EBE5D9] bg-[#F9F6F0]/50">
                      <p className="text-sm font-bold text-[#5C3A21] truncate">
                        {currentUser.displayName || "Pengguna"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {role}
                      </p>
                    </div>
                    
                    <Link to="/profile" className="px-4 py-2.5 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors">
                      Profil Saya
                    </Link>

                    {/* Pembeli Menu */}
                    {role === "Pembeli" && (
                      <Link to="/orders" className="px-4 py-2.5 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors">
                        Riwayat Pesanan
                      </Link>
                    )}

                    {/* Penjual Menu */}
                    {role === "Penjual" && (
                      <>
                        <div className="border-t border-[#EBE5D9] my-1"></div>
                        <p className="px-4 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Toko Saya</p>
                        <Link to="/seller/dashboard" className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors">Dashboard Penjual</Link>
                        <Link to="/seller/upload" className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors">Tambah Produk</Link>
                        <Link to="/orders" className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors">Pesanan Masuk</Link>
                      </>
                    )}

                    {/* Admin Menu */}
                    {role === "Admin" && (
                      <>
                        <div className="border-t border-[#EBE5D9] my-1"></div>
                        <p className="px-4 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Admin Control</p>
                        <Link to="/admin/dashboard" className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors">Dashboard Admin</Link>
                        <Link to="/admin/payments" className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors">Verifikasi Pembayaran</Link>
                        <Link to="/admin/chat" className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors flex items-center justify-between">
                          Pusat Pesan
                          {hasUnreadAdmin && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                        </Link>
                      </>
                    )}

                    <div className="border-t border-[#EBE5D9] mt-1"></div>
                    <button
                      onClick={() => logout()}
                      className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 text-left transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Keluar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
              title="Masuk"
            >
              <User className="w-[20px] h-[20px] text-[#5C3A21]" />
            </Link>
          )}

          {/* Cart Icon */}
          {role !== "Penjual" && role !== "Admin" && (
            <Link
              to="/checkout"
              className="relative p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
              title="Keranjang"
            >
              <ShoppingCart className="w-[20px] h-[20px] text-[#5C3A21]" />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0 right-0 w-4 h-4 bg-[#A67B5B] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#F9F6F0]"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-[20px] h-[20px] text-[#5C3A21]" />
            ) : (
              <Menu className="w-[20px] h-[20px] text-[#5C3A21]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-b border-[#EBE5D9] bg-[#F9F6F0]"
          >
            <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
              <Link to="/category/fashion" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-[#5C3A21]">Fashion</Link>
              <Link to="/category/accessories" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-[#5C3A21]">Accessories</Link>
              <Link to="/category/shoes" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-[#5C3A21]">Shoes</Link>
              <Link to="/category/all" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-[#5C3A21]">Semua</Link>
              <Link to="/chat/admin" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-[#5C3A21]">Bantuan</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
