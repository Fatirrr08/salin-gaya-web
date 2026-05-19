import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import ProductCard from "@/frontend/components/layout/ProductCard";
import ErrorBoundary from "@/frontend/components/ui/ErrorBoundary";
import { auth, db } from "@/backend/config/firebase";
import { ref, onValue } from "firebase/database";

const categoryLabels: Record<string, string> = {
  fashion: "Fashion",
  accessories: "Accessories",
  shoes: "Shoes",
  all: "Semua Produk",
};

type SortOption = "newest" | "cheapest" | "expensive";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [sort, setSort] = useState<SortOption>("newest");
  const [conditionFilter, setConditionFilter] = useState<string>("all");

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      console.error("FATAL ERROR DI HALAMAN CATEGORY:", error);
      setLoading(false);
    }

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    let items =
      slug === "all" ? products : products?.filter((p) => p?.category?.toLowerCase() === slug?.toLowerCase());
    
    if (conditionFilter !== "all") {
      items = items?.filter((p) => p?.condition === conditionFilter);
    }
    switch (sort) {
      case "cheapest":
        return [...items].sort((a, b) => (a?.price || 0) - (b?.price || 0));
      case "expensive":
        return [...items].sort((a, b) => (b?.price || 0) - (a?.price || 0));
      default:
        return items;
    }
  }, [slug, sort, conditionFilter, products]);

  const title = categoryLabels[slug || "all"] || "Produk";

  if (!auth || !db) {
    return (
      <div className="bg-[#F9F6F0] h-screen flex items-center justify-center text-[#5C3A21]">
        Inisialisasi Sistem...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ErrorBoundary>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{title}</span>
          </div>

          <h1 className="font-display text-3xl font-bold text-foreground mb-6">
            {title}
          </h1>

          <div className="flex flex-wrap gap-3 mb-8">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-ring outline-none"
            >
              <option value="newest">Terbaru</option>
              <option value="cheapest">Termurah</option>
              <option value="expensive">Termahal</option>
            </select>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-ring outline-none"
            >
              <option value="all">Semua Kondisi</option>
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-4 border-[#A67B5B] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filtered?.length > 0 ? (
              <motion.div
                key={slug || "all"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
              >
                {filtered?.map((product, i) => (
                  <ProductCard key={product?.id || i} product={product} index={i} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20 bg-white rounded-2xl shadow-sm border border-[#EBE5D9]"
              >
                <h3 className="text-xl font-bold text-[#5C3A21] mb-2">Produk belum tersedia</h3>
                <p className="text-[#5C3A21]/70">
                  Maaf, belum ada produk untuk kategori atau filter ini.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ErrorBoundary>
      <Footer />
    </div>
  );
}
