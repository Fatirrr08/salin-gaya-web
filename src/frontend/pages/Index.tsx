import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import ProductCard from "@/frontend/components/layout/ProductCard";
import ErrorBoundary from "@/frontend/components/ui/ErrorBoundary";
import { auth, db } from "@/backend/config/firebase";
import { ref, onValue } from "firebase/database";
import { ShieldCheck, Truck, BadgeCheck, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/frontend/contexts/AuthContext";

export default function Index() {
  const { currentUser, role, loading: authLoading } = useAuth();
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let unsubscribe: any;
    
    // Fallback if Firebase hangs (e.g. offline/network issue)
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 10000);

    try {
      const productsRef = ref(db, "products");
      unsubscribe = onValue(
        productsRef,
        (snapshot) => {
          clearTimeout(timeoutId);
          if (snapshot.exists()) {
            const data = snapshot.val();
            const loadedProducts = Object.keys(data).map((key) => ({
              id: key,
              ...data[key],
            }));
            setProducts(loadedProducts);
          } else {
            setProducts([]);
          }
          setLoading(false);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error("Firebase read error:", error);
          setProducts([]);
          setLoading(false);
        }
      );
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("FATAL ERROR DI HALAMAN INDEX:", error);
      setLoading(false);
    }

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (!auth || !db) {
    return (
      <div className="bg-[#F9F6F0] h-screen flex items-center justify-center text-[#5C3A21]">
        Inisialisasi Sistem...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full">
        {/* Hero Section */}
        <section className="relative w-full h-[550px] md:h-[650px] overflow-hidden bg-[#F9F6F0]">
          {/* Background Image */}
          <motion.div
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-center md:bg-right"
            style={{
              backgroundImage: "url('/images/foto besar.png')",
            }}
          />
          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#F9F6F0] via-[#F9F6F0]/80 to-transparent" />

          {/* Content */}
          <div className="container mx-auto px-4 h-full relative z-20 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <h1 className="text-4xl md:text-6xl font-display font-bold text-[#5C3A21] leading-tight">
                Koleksi Pilihan <br />
                <span className="text-[#A67B5B]">Premium</span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-[#5C3A21]/70 max-w-md">
                Temukan gayamu dengan barang secondhand berkualitas tinggi.
                Kurasi terbaik, harga terjangkau.
              </p>

              <div className="mt-8 flex items-center gap-4 h-12">
                <Link
                  to="/category/all"
                  className="px-6 py-3 bg-[#A67B5B] hover:bg-[#8C674C] text-white font-medium rounded-md transition-colors shadow-sm hover:shadow-lg"
                >
                  Jelajahi Koleksi
                </Link>
                {!authLoading && (
                  currentUser ? (
                    <Link
                      to={role === "Admin" ? "/admin/dashboard" : role === "Penjual" ? "/seller/dashboard" : "/profile"}
                      className="px-6 py-3 bg-transparent border border-[#A67B5B] hover:bg-[#A67B5B]/10 text-[#5C3A21] font-medium rounded-md transition-colors"
                    >
                      {role === "Admin" ? "Dashboard Admin" : role === "Penjual" ? "Dashboard Penjual" : "Profil Saya"}
                    </Link>
                  ) : (
                    <Link
                      to="/register"
                      className="px-6 py-3 bg-transparent border border-[#A67B5B] hover:bg-[#A67B5B]/10 text-[#5C3A21] font-medium rounded-md transition-colors"
                    >
                      Daftar Gratis
                    </Link>
                  )
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Koleksi Terbaru Section */}
        <section className="py-16 md:py-24 container mx-auto px-4 max-w-7xl">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Koleksi Terbaru
              </h2>
              <p className="text-muted-foreground mt-2">
                Pakaian secondhand berkualitas tinggi yang baru saja ditambahkan.
              </p>
            </div>
            <Link
              to="/category/all"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors hidden md:block"
            >
              Lihat Semua →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-[#A67B5B] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products?.slice(0, 8).map((product, index) => (
                <ProductCard
                  key={product?.id || index}
                  product={product}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>

        {/* Fasilitas Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 bg-[#F3EFE9]"
        >
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-12">
              Memfasilitasi Transaksi Barang Secondhand
              <br />
              (Thrifting) yang{" "}
              <span className="text-[#D4A373]">Aman dan Mudah</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm text-foreground hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  Transaksi Aman
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sistem escrow melindungi setiap transaksi
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm text-foreground hover:scale-110 transition-transform duration-300">
                  <Truck className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  Pengiriman Terpercaya
                </h3>
                <p className="text-sm text-muted-foreground">
                  Terintegrasi dengan kurir terpercaya
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm text-foreground hover:scale-110 transition-transform duration-300">
                  <BadgeCheck className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-foreground mb-2">
                  Garansi Kualitas
                </h3>
                <p className="text-sm text-muted-foreground">
                  Jaminan keaslian & kondisi barang
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Apa Kata Mereka Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="py-16 md:py-24 container mx-auto px-4 max-w-6xl"
        >
          <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">
            Apa Kata Mereka
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="bg-[#F3EFE9] p-6 rounded-2xl shadow-sm border border-[#EBE5D9] hover:shadow-md transition-shadow"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4 fill-[#D4A373] text-[#D4A373]"
                    />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-6 font-medium italic">
                  "Barangnya original dan kondisinya sangat bagus! Pengiriman
                  juga cepat. Puas banget belanja di Salin Gaya."
                </p>
                <p className="text-sm font-bold text-foreground">
                  — Rina Susanti
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
}
