import React from 'react';
import { Link, useLocation } from "react-router-dom";
import {
  User,
  ShoppingCart,
  Menu,
  X,
  LogOut,
  MessageCircle,
  ChevronRight,
  Store,
  ShieldCheck,
  ClipboardList,
  LayoutDashboard,
  PackagePlus,
  BadgeCheck,
} from "lucide-react";
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(dbFirestore, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((docSnap) => {
        const chat = docSnap.data();
        const unread = chat.unreadCount?.[currentUser.uid] ?? 0;
        if (unread > 0) count++;
      });
      setUnreadCount(count);
      setHasUnreadAdmin(count > 0 && (role === "Admin" || role === "admin"));
    });
    return () => unsub();
  }, [currentUser?.uid, role]);

  const isActive = (href: string) => location.pathname === href;

  // ─── Desktop single link with underline indicator ───────────────────────────
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

  // ─── Mobile menu link row ────────────────────────────────────────────────────
  const MobileLink = ({
    href,
    label,
    icon,
    badge,
    onClick,
  }: {
    href: string;
    label: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
    onClick?: () => void;
  }) => {
    const active = isActive(href);
    return (
      <Link
        to={href}
        onClick={onClick ?? (() => setMobileOpen(false))}
        className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors duration-200 ${
          active
            ? "bg-[#A67B5B]/10 text-[#A67B5B]"
            : "text-[#5C3A21] hover:bg-black/5"
        }`}
      >
        <span className="flex items-center gap-3 text-[15px] font-medium">
          {icon && (
            <span className="w-5 h-5 flex-shrink-0 opacity-70">{icon}</span>
          )}
          {label}
        </span>
        <span className="flex items-center gap-2">
          {badge}
          <ChevronRight className="w-4 h-4 opacity-30" />
        </span>
      </Link>
    );
  };

  // ─── Section label ───────────────────────────────────────────────────────────
  const MobileSectionLabel = ({ label }: { label: string }) => (
    <p className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#A67B5B]/70">
      {label}
    </p>
  );

  return (
    <nav className="sticky top-0 z-50 bg-[#F9F6F0] border-b border-[#EBE5D9]">
      <div className="container mx-auto flex items-center justify-between h-16 md:h-20 px-4">

        {/* ── Logo ── */}
        <Link
          to="/"
          className="font-display text-2xl font-bold text-[#5C3A21] tracking-tight flex-shrink-0"
        >
          SalinGaya
        </Link>

        {/* ── Desktop Nav Links ── */}
        <div className="hidden md:flex flex-1 justify-center items-center gap-10">
          <SingleLink href="/category/fashion" label="Fashion" />
          <SingleLink href="/category/accessories" label="Accessories" />
          <SingleLink href="/category/shoes" label="Shoes" />
          <SingleLink href="/category/all" label="Semua" />
          <SingleLink href="/inbox" label="Pesan" />
        </div>

        {/* ── Icons ── */}
        <div className="flex items-center gap-1">
          {/* Search — all screen sizes */}
          <GlobalSearch />

          {authLoading ? (
            <div className="w-9 h-9 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-[#5C3A21] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : currentUser ? (
            <div className="flex items-center gap-1">
              {/* Inbox icon — mobile only (desktop has "Pesan" link) */}
              <Link
                to="/inbox"
                className="relative p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
                title="Pesan"
              >
                <MessageCircle className="w-5 h-5 text-[#5C3A21]" />
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

              {/* Desktop User Dropdown */}
              <div className="hidden md:flex relative group items-center h-20 cursor-pointer">
                <div className="p-2 rounded-full group-hover:bg-black/5 transition-colors duration-200">
                  <User className="w-5 h-5 text-[#5C3A21]" />
                </div>
                <div className="absolute top-16 right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[220px]">
                  <div className="bg-white rounded-xl shadow-lg border border-[#EBE5D9] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-[#EBE5D9] bg-[#F9F6F0]/50">
                      <p className="text-sm font-bold text-[#5C3A21] truncate">
                        {currentUser.displayName || "Pengguna"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{role}</p>
                    </div>

                    <Link
                      to="/profile"
                      className="px-4 py-2.5 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors"
                    >
                      Profil Saya
                    </Link>

                    {role === "Pembeli" && (
                      <Link
                        to="/orders"
                        className="px-4 py-2.5 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors"
                      >
                        Riwayat Pesanan
                      </Link>
                    )}

                    {role === "Penjual" && (
                      <>
                        <div className="border-t border-[#EBE5D9] my-1" />
                        <p className="px-4 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Toko Saya
                        </p>
                        <Link
                          to="/seller/dashboard"
                          className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors"
                        >
                          Dashboard Penjual
                        </Link>
                        <Link
                          to="/seller/upload"
                          className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors"
                        >
                          Tambah Produk
                        </Link>
                        <Link
                          to="/orders"
                          className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors"
                        >
                          Pesanan Masuk
                        </Link>
                      </>
                    )}

                    {(role === "Admin" || role === "admin") && (
                      <>
                        <div className="border-t border-[#EBE5D9] my-1" />
                        <p className="px-4 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Admin Control
                        </p>
                        <Link
                          to="/admin/dashboard"
                          className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors"
                        >
                          Dashboard Admin
                        </Link>
                        <Link
                          to="/admin/payments"
                          className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors"
                        >
                          Verifikasi Pembayaran
                        </Link>
                        <Link
                          to="/inbox"
                          className="px-4 py-2 text-sm font-medium text-[#5C3A21] hover:bg-[#F9F6F0] transition-colors flex items-center justify-between"
                        >
                          Inbox Pesan
                          {hasUnreadAdmin && (
                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                          )}
                        </Link>
                      </>
                    )}

                    <div className="border-t border-[#EBE5D9] mt-1" />
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
              <User className="w-5 h-5 text-[#5C3A21]" />
            </Link>
          )}

          {/* Cart Icon — hidden for Penjual & Admin */}
          {role !== "Penjual" && role !== "Admin" && (
            <Link
              to="/checkout"
              className="relative p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
              title="Keranjang"
            >
              <ShoppingCart className="w-5 h-5 text-[#5C3A21]" />
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

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="w-5 h-5 text-[#5C3A21]" />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="w-5 h-5 text-[#5C3A21]" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          Mobile Slide-down Panel
      ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 top-16 bg-black/20 z-40"
              onClick={() => setMobileOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="mobile-panel"
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="md:hidden fixed left-0 right-0 top-16 z-50 bg-[#F9F6F0] border-b border-[#EBE5D9] shadow-xl overflow-y-auto"
              style={{ maxHeight: "calc(100dvh - 4rem)" }}
            >
              <div className="px-3 py-3 flex flex-col gap-1 pb-8">

                {/* ── Belanja Section ── */}
                <MobileSectionLabel label="Belanja" />
                <MobileLink href="/category/fashion" label="Fashion" />
                <MobileLink href="/category/accessories" label="Accessories" />
                <MobileLink href="/category/shoes" label="Shoes" />
                <MobileLink href="/category/all" label="Semua Produk" />
                <MobileLink
                  href="/inbox"
                  label="Pesan"
                  icon={<MessageCircle className="w-full h-full" />}
                  badge={
                    unreadCount > 0 ? (
                      <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    ) : undefined
                  }
                />

                {/* ── Divider ── */}
                <div className="h-px bg-[#EBE5D9] mx-4 my-2" />

                {currentUser ? (
                  <>
                    {/* User info */}
                    <div className="px-4 py-2 mb-1">
                      <p className="text-sm font-bold text-[#5C3A21]">
                        {currentUser.displayName || "Pengguna"}
                      </p>
                      <p className="text-xs text-[#A67B5B]">{role}</p>
                    </div>

                    {/* ── Akun Section ── */}
                    <MobileSectionLabel label="Akun" />
                    <MobileLink
                      href="/profile"
                      label="Profil Saya"
                      icon={<User className="w-full h-full" />}
                    />

                    {role === "Pembeli" && (
                      <MobileLink
                        href="/orders"
                        label="Riwayat Pesanan"
                        icon={<ClipboardList className="w-full h-full" />}
                      />
                    )}

                    {/* ── Toko Saya (Penjual) ── */}
                    {role === "Penjual" && (
                      <>
                        <div className="h-px bg-[#EBE5D9] mx-4 my-2" />
                        <MobileSectionLabel label="Toko Saya" />
                        <MobileLink
                          href="/seller/dashboard"
                          label="Dashboard Penjual"
                          icon={<LayoutDashboard className="w-full h-full" />}
                        />
                        <MobileLink
                          href="/seller/upload"
                          label="Tambah Produk"
                          icon={<PackagePlus className="w-full h-full" />}
                        />
                        <MobileLink
                          href="/orders"
                          label="Pesanan Masuk"
                          icon={<Store className="w-full h-full" />}
                        />
                      </>
                    )}

                    {/* ── Admin ── */}
                    {(role === "Admin" || role === "admin") && (
                      <>
                        <div className="h-px bg-[#EBE5D9] mx-4 my-2" />
                        <MobileSectionLabel label="Admin" />
                        <MobileLink
                          href="/admin/dashboard"
                          label="Dashboard Admin"
                          icon={<ShieldCheck className="w-full h-full" />}
                        />
                        <MobileLink
                          href="/admin/payments"
                          label="Verifikasi Pembayaran"
                          icon={<BadgeCheck className="w-full h-full" />}
                        />
                      </>
                    )}

                    {/* Logout */}
                    <div className="h-px bg-[#EBE5D9] mx-4 my-2" />
                    <button
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors duration-200 text-[15px] font-medium w-full text-left"
                    >
                      <LogOut className="w-5 h-5 opacity-70 flex-shrink-0" />
                      Keluar
                    </button>
                  </>
                ) : (
                  <>
                    <MobileSectionLabel label="Akun" />
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#5C3A21] hover:bg-black/5 transition-colors duration-200 text-[15px] font-medium"
                    >
                      <User className="w-5 h-5 opacity-70 flex-shrink-0" />
                      Masuk / Daftar
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
