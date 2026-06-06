import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search, Compass } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// NotFound — Premium 404 page, fully responsive & branded
// Route: path="*" in App.tsx
// ─────────────────────────────────────────────────────────────

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col font-sans">
      {/* Minimal top bar */}
      <header className="px-4 sm:px-8 py-5 flex items-center justify-between border-b border-[#EBE5D9] bg-white/60 backdrop-blur-sm">
        <Link
          to="/"
          className="font-display text-xl font-bold text-[#5C3A21] tracking-tight"
        >
          SalinGaya
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm font-medium text-[#A67B5B] hover:text-[#5C3A21] transition-colors"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Kembali ke Beranda</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center py-16 sm:py-24">
        {/* Animated 404 number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mb-8"
        >
          {/* Decorative background circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-[#EBE5D9]/60 blur-3xl" />
          </div>

          {/* 404 text */}
          <div className="relative">
            <span
              className="block font-display font-black text-[#EBE5D9] leading-none select-none"
              style={{ fontSize: "clamp(7rem, 20vw, 14rem)" }}
              aria-hidden="true"
            >
              404
            </span>
            {/* Overlapping icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, -8, 8, -8, 0] }}
                transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.6 }}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-[#5C3A21] text-white rounded-2xl flex items-center justify-center shadow-xl"
              >
                <Compass className="w-8 h-8 sm:w-10 sm:h-10" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md"
        >
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#5C3A21] mb-3">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm sm:text-base text-[#5C3A21]/60 leading-relaxed mb-8">
            Sepertinya URL yang kamu masukkan tidak tersedia atau sudah dipindahkan.
            Yuk kembali ke beranda dan temukan koleksi terbaik kami!
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 border border-[#A67B5B] text-[#5C3A21] font-medium rounded-lg hover:bg-[#A67B5B]/10 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>

            <Link
              to="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5C3A21] text-white font-medium rounded-lg hover:bg-[#3D2010] transition-colors shadow-sm text-sm"
            >
              <Home className="w-4 h-4" />
              Ke Beranda
            </Link>

            <Link
              to="/category/all"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#A67B5B] text-white font-medium rounded-lg hover:bg-[#8C674C] transition-colors shadow-sm text-sm"
            >
              <Search className="w-4 h-4" />
              Jelajahi Produk
            </Link>
          </div>
        </motion.div>

        {/* Popular links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-12 sm:mt-16"
        >
          <p className="text-xs text-[#A67B5B] uppercase tracking-widest font-bold mb-4">
            Halaman Populer
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: "Fashion", href: "/category/fashion" },
              { label: "Aksesoris", href: "/category/accessories" },
              { label: "Sepatu", href: "/category/shoes" },
              { label: "Semua Produk", href: "/category/all" },
              { label: "Inbox", href: "/inbox" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                to={href}
                className="px-3 py-1.5 bg-white border border-[#EBE5D9] text-[#5C3A21] text-xs font-medium rounded-full hover:bg-[#F9F6F0] hover:border-[#A67B5B] transition-colors shadow-sm"
              >
                {label}
              </Link>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer note */}
      <footer className="py-4 text-center text-xs text-[#A67B5B]/60">
        © {new Date().getFullYear()} SalinGaya Marketplace
      </footer>
    </div>
  );
}
