import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import ProductCard from "@/frontend/components/layout/ProductCard";
import { auth, db, dbFirestore } from "@/backend/config/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { ShieldCheck, Truck, BadgeCheck, Star, Search, PackageX } from "lucide-react";
import { Input } from "@/frontend/components/ui/input";
import { Button } from "@/frontend/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/frontend/contexts/AuthContext";

const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export default function Index() {
  const { currentUser, role, loading: authLoading } = useAuth();
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  React.useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = query(collection(dbFirestore, "products"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const loadedProducts: any[] = [];
        snapshot.forEach(doc => {
          loadedProducts.push({ id: doc.id, ...doc.data() });
        });
        setProducts(loadedProducts);
      } catch (error: unknown) {
        if ((error as any)?.code === 'failed-precondition' || (error as Error)?.message?.includes("index")) {
            try {
                const snapshot = await getDocs(collection(dbFirestore, "products"));
                const loadedProducts: any[] = [];
                snapshot.forEach(doc => {
                  loadedProducts.push({ id: doc.id, ...doc.data() });
                });
                loadedProducts.sort((a, b) => {
                    const timeA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : (a.createdAt as number || 0);
                    const timeB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : (b.createdAt as number || 0);
                    return timeB - timeA;
                });
                setProducts(loadedProducts);
            } catch(e) { console.error(e); }
        } else {
            console.error("Error fetching products:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = React.useMemo(() => {
    return products.filter((product) => {
      const matchCategory = selectedCategory === "Semua" || (product?.category && (product.category as string).toLowerCase() === selectedCategory.toLowerCase());
      const matchSearch = !searchQuery || (product?.name && (product.name as string).toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

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
        <section className="relative w-full h-[420px] sm:h-[500px] md:h-[620px] overflow-hidden bg-[#F9F6F0]">
          {/* Background Image */}
          <motion.div
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-center"
            style={{ backgroundImage: "url('/images/GambarBesar 1.png')" }}
          />
          {/* Gradient Overlay yang diperbaiki agar tidak "bocor" */}
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#F9F6F0] via-[#F9F6F0]/90 via-50% to-transparent md:w-[80%]" />

          {/* Content */}
          <div className="container mx-auto px-4 h-full relative z-20 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-xl"
            >
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold text-[#5C3A21] leading-tight">
                Koleksi Pilihan <br />
                <span className="text-[#A67B5B]">Premium</span>
              </h1>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-[#5C3A21]/70 max-w-sm sm:max-w-md">
                Temukan gayamu dengan barang secondhand berkualitas tinggi.
                Kurasi terbaik, harga terjangkau.
              </p>

              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/category/all"
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-[#A67B5B] hover:bg-[#8C674C] text-white font-medium rounded-md transition-colors shadow-sm hover:shadow-lg text-sm sm:text-base"
                >
                  Jelajahi Koleksi
                </Link>
                {!authLoading && (
                  currentUser ? (
                    <Link
                      to={role === "Admin" ? "/admin/dashboard" : role === "Penjual" ? "/seller/dashboard" : "/profile"}
                      className="px-5 sm:px-6 py-2.5 sm:py-3 bg-transparent border border-[#A67B5B] hover:bg-[#A67B5B]/10 text-[#5C3A21] font-medium rounded-md transition-colors text-sm sm:text-base"
                    >
                      {role === "Admin" ? "Dashboard Admin" : role === "Penjual" ? "Dashboard Penjual" : "Profil Saya"}
                    </Link>
                  ) : (
                    <Link
                      to="/register"
                      className="px-5 sm:px-6 py-2.5 sm:py-3 bg-transparent border border-[#A67B5B] hover:bg-[#A67B5B]/10 text-[#5C3A21] font-medium rounded-md transition-colors text-sm sm:text-base"
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
        <section className="py-10 md:py-24 container mx-auto px-4 max-w-7xl">
          <div className="mb-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground">
                Katalog Produk
              </h2>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                Pakaian secondhand berkualitas tinggi pilihan kami.
              </p>
            </div>
            
            {/* SEARCH BAR */}
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full bg-white border-border focus-visible:ring-[#A67B5B]"
              />
            </div>
          </div>
          
          {/* CATEGORY FILTER */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {["Semua", "Baju", "Celana", "Sepatu", "Aksesoris"].map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat ? "bg-[#A67B5B] hover:bg-[#8C674C] text-white border-transparent" : "bg-white text-foreground hover:bg-[#F9F6F0] border-[#EBE5D9]"}
              >
                {cat}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-[#A67B5B] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm w-full">
              <PackageX className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Yah, barang yang kamu cari belum ada nih.</h3>
              <p className="text-muted-foreground">
                Coba gunakan kata kunci lain atau pilih kategori yang berbeda.
              </p>
              <Button onClick={() => {setSearchQuery(""); setSelectedCategory("Semua");}} className="mt-6 bg-[#A67B5B] hover:bg-[#8C674C]">
                Tampilkan Semua Produk
              </Button>
            </div>
          ) : (
            <motion.div 
              variants={gridVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6"
            >
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product?.id || index}
                  product={product}
                  index={index}
                />
              ))}
            </motion.div>
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
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground text-center mb-8 sm:mb-12">
            Apa Kata Mereka
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
