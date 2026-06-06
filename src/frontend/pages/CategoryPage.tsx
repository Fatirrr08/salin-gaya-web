import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import ProductCard from "@/frontend/components/layout/ProductCard";
import { db } from "@/backend/config/firebase";
import { ref, onValue } from "firebase/database";
import { PackageX, SlidersHorizontal } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CategoryPage — Displays products filtered by a URL slug category.
// Robust data handling: all array operations use optional chaining + nullish
// coalescing so the page never crashes on empty/undefined Firestore responses.
// ─────────────────────────────────────────────────────────────────────────────

const categoryLabels: Record<string, string> = {
  fashion: "Fashion",
  accessories: "Accessories",
  shoes: "Sepatu",
  all: "Semua Produk",
};

type SortOption = "newest" | "cheapest" | "expensive";

const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

// ── Skeleton card for loading state ─────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-7 bg-muted rounded mt-2" />
      </div>
    </div>
  );
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  const [sort, setSort] = useState<SortOption>("newest");
  const [conditionFilter, setConditionFilter] = useState<string>("all");

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setFetchError(null);

    // Safety net: if Firebase hangs for >10s, unblock the UI
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 10_000);

    let unsubscribe: (() => void) | undefined;

    try {
      if (!db) throw new Error("Firebase database not initialized");

      const productsRef = ref(db, "products");
      unsubscribe = onValue(
        productsRef,
        (snapshot) => {
          clearTimeout(timeoutId);
          if (snapshot.exists()) {
            const data = snapshot.val() ?? {};
            const loadedProducts = Object.keys(data).map((key) => ({
              id: key,
              ...(data[key] ?? {}),
            }));
            setProducts(loadedProducts);
          } else {
            setProducts([]);
          }
          setLoading(false);
        },
        (error) => {
          clearTimeout(timeoutId);
          setFetchError("Gagal memuat data. Periksa koneksi internet Anda.");
          setProducts([]);
          setLoading(false);
        }
      );
    } catch (err: unknown) {
      console.error(err);
      setFetchError((err as Error)?.message ?? "Terjadi kesalahan tidak terduga.");
      setLoading(false);
    }

    return () => {
      clearTimeout(timeoutId);
      unsubscribe?.();
    };
  }, []); // Only run once on mount — `slug` filter is done client-side

  // ── Filtering & sorting (all with optional chaining) ─────────────────────
  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return [];

    let items =
      slug === "all"
        ? products
        : products.filter(
            (p) => p?.category?.toLowerCase() === slug?.toLowerCase()
          );

    if (conditionFilter !== "all") {
      items = items.filter((p) => p?.condition === conditionFilter);
    }

    switch (sort) {
      case "cheapest":
        return [...items].sort((a, b) => (a?.price ?? 0) - (b?.price ?? 0));
      case "expensive":
        return [...items].sort((a, b) => (b?.price ?? 0) - (a?.price ?? 0));
      default:
        // "newest" — sort by createdAt descending
        return [...items].sort((a, b) => {
          const tA = a?.createdAt?.seconds ?? a?.createdAt ?? 0;
          const tB = b?.createdAt?.seconds ?? b?.createdAt ?? 0;
          return tB - tA;
        });
    }
  }, [slug, sort, conditionFilter, products]);

  const title = categoryLabels[slug ?? "all"] ?? "Produk";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 sm:mb-6">
          <Link to="/" className="hover:text-primary transition-colors">
            Beranda
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{title}</span>
        </div>

        {/* Page heading */}
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-5 sm:mb-6">
          {title}
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8 items-center">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-ring outline-none"
            aria-label="Urutkan produk"
          >
            <option value="newest">Terbaru</option>
            <option value="cheapest">Termurah</option>
            <option value="expensive">Termahal</option>
          </select>
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-ring outline-none"
            aria-label="Filter kondisi produk"
          >
            <option value="all">Semua Kondisi</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
          </select>
        </div>

        {/* Content area */}
        <AnimatePresence mode="wait">

          {/* ── Loading skeleton ── */}
          {loading && (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </motion.div>
          )}

          {/* ── Fetch error state ── */}
          {!loading && fetchError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-16 bg-white rounded-2xl shadow-sm border border-[#EBE5D9]"
            >
              <PackageX className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[#5C3A21] mb-2">Gagal Memuat Produk</h3>
              <p className="text-sm text-[#5C3A21]/60 mb-4">{fetchError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 bg-[#A67B5B] text-white text-sm font-medium rounded-lg hover:bg-[#8C674C] transition-colors"
              >
                Coba Lagi
              </button>
            </motion.div>
          )}

          {/* ── Product grid ── */}
          {!loading && !fetchError && filtered.length > 0 && (
            <motion.div
              key={`grid-${slug ?? "all"}-${sort}-${conditionFilter}`}
              variants={gridVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6"
            >
              {filtered.map((product, i) => (
                <ProductCard
                  key={product?.id ?? i}
                  product={product}
                  index={i}
                />
              ))}
            </motion.div>
          )}

          {/* ── Empty state ── */}
          {!loading && !fetchError && filtered.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16 sm:py-20 bg-white rounded-2xl shadow-sm border border-[#EBE5D9]"
            >
              <PackageX className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-bold text-[#5C3A21] mb-2">
                Produk belum tersedia
              </h3>
              <p className="text-sm text-[#5C3A21]/60">
                Belum ada produk untuk kategori atau filter ini.
              </p>
              <Link
                to="/category/all"
                className="inline-block mt-5 px-5 py-2 bg-[#A67B5B] text-white text-sm font-medium rounded-lg hover:bg-[#8C674C] transition-colors"
              >
                Lihat Semua Produk
              </Link>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
