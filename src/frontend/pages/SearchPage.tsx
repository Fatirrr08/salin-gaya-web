import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { dbFirestore } from "@/backend/config/firebase";
import Navbar from "@/frontend/components/layout/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import { PackageSearch, SlidersHorizontal, Star } from "lucide-react";
import ProductCard, { RTDBProduct } from "@/frontend/components/layout/ProductCard";

type SortOption = "relevance" | "price_asc" | "price_desc" | "rating_desc";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05 // Stagger effect
    }
  }
};

export default function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const queryParam = searchParams.get("q") || "";
  const brandParam = searchParams.get("brand") || "";

  const [products, setProducts] = useState<RTDBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [selectedBrand, setSelectedBrand] = useState<string>(brandParam);
  const [minRating, setMinRating] = useState<number>(0);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(dbFirestore, "products"));
        const fetched: RTDBProduct[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as RTDBProduct);
        });
        setProducts(fetched);
      } catch (error) {
        console.error("Error fetching products", error);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    setSelectedBrand(brandParam);
  }, [brandParam]);

  const fuseProducts = useMemo(() => {
    return new Fuse(products, {
      keys: ["name", "brand", "category"],
      threshold: 0.4,
      distance: 100,
      includeScore: true,
    });
  }, [products]);

  const uniqueBrands = useMemo(() => {
    const brs = Array.from(new Set(products.map((p: RTDBProduct) => (p as any)?.brand).filter(Boolean)));
    return brs.sort();
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let results: RTDBProduct[] = [];

    // 1. Fuzzy Search / Match
    if (queryParam) {
      const fuseResults = fuseProducts.search(queryParam);
      results = fuseResults.map(r => r.item);
    } else {
      results = [...products];
    }

    // 2. Filter by Brand
    if (selectedBrand) {
      results = results.filter((p: RTDBProduct) => (p as any)?.brand === selectedBrand);
    }

    // 3. Filter by Min Rating
    if (minRating > 0) {
      results = results.filter((p: RTDBProduct) => ((p as any)?.rating || 0) >= minRating);
    }

    // 4. Sort
    if (sortOption === "price_asc") {
      results.sort((a, b) => (a?.price || 0) - (b?.price || 0));
    } else if (sortOption === "price_desc") {
      results.sort((a, b) => (b?.price || 0) - (a?.price || 0));
    } else if (sortOption === "rating_desc") {
      results.sort((a: RTDBProduct, b: RTDBProduct) => ((b as Record<string, number>)?.rating || 0) - ((a as Record<string, number>)?.rating || 0));
    }

    return results;
  }, [products, fuseProducts, queryParam, selectedBrand, minRating, sortOption]);

  const updateSearchParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(location.search);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    navigate(`/search?${newParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filter */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-[#5C3A21] font-bold pb-3 border-b border-border">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filter Pencarian</span>
            </div>

            {/* Filter Sort */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-[#5C3A21] mb-3">Urutkan</h4>
              <div className="space-y-2">
                {[
                  { value: "relevance", label: "Paling Relevan" },
                  { value: "price_asc", label: "Harga: Terendah" },
                  { value: "price_desc", label: "Harga: Tertinggi" },
                  { value: "rating_desc", label: "Rating Terbaik" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer group">
                    <input 
                      type="radio" 
                      name="sort" 
                      value={opt.value} 
                      checked={sortOption === opt.value}
                      onChange={(e) => setSortOption(e.target.value as SortOption)}
                      className="accent-[#A67B5B]"
                    />
                    <span className="group-hover:text-[#5C3A21] transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter Brand */}
            {uniqueBrands.length > 0 && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-[#5C3A21] mb-3">Brand</h4>
                <select 
                  className="w-full text-sm p-2 rounded-lg border border-border bg-[#F9F6F0] text-[#5C3A21] focus:ring-1 focus:ring-[#A67B5B] outline-none"
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    updateSearchParam("brand", e.target.value);
                  }}
                >
                  <option value="">Semua Brand</option>
                  {uniqueBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Rating */}
            <div>
              <h4 className="text-sm font-semibold text-[#5C3A21] mb-3">Minimal Rating</h4>
              <div className="space-y-2">
                {[4, 3, 0].map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer group">
                    <input 
                      type="radio" 
                      name="rating" 
                      value={r} 
                      checked={minRating === r}
                      onChange={() => setMinRating(r)}
                      className="accent-[#A67B5B]"
                    />
                    {r === 0 ? (
                      <span className="group-hover:text-[#5C3A21] transition-colors">Semua Rating</span>
                    ) : (
                      <span className="flex items-center gap-1 group-hover:text-[#5C3A21] transition-colors">
                        {r} <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Ke Atas
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#5C3A21]">
              {queryParam ? `Hasil pencarian untuk "${queryParam}"` : "Semua Produk"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Menampilkan {filteredAndSortedProducts.length} produk
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
                  <div className="w-full aspect-square bg-stone-200"></div>
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                    <div className="h-4 bg-stone-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center p-12 bg-card rounded-2xl border border-border shadow-sm"
            >
              <div className="w-24 h-24 bg-[#F9F6F0] rounded-full flex items-center justify-center mb-6">
                <PackageSearch className="w-12 h-12 text-[#A67B5B]" />
              </div>
              <h2 className="text-xl font-bold text-[#5C3A21] mb-2">Produk Tidak Ditemukan</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Maaf, kami tidak dapat menemukan produk yang sesuai dengan filter atau kata kunci Anda. Coba kurangi filter atau gunakan kata kunci lain.
              </p>
              <button 
                onClick={() => {
                  navigate("/search");
                  setSortOption("relevance");
                  setMinRating(0);
                  setSelectedBrand("");
                }}
                className="bg-[#A67B5B] hover:bg-[#8C674C] text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
              >
                Reset Pencarian
              </button>
            </motion.div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              <AnimatePresence>
                {filteredAndSortedProducts.map((product) => (
                  <ProductCard key={product?.id} product={product} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
}
