import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/data";

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

  const filtered = useMemo(() => {
    let items = slug === "all" ? products : products.filter((p) => p.category === slug);
    if (conditionFilter !== "all") {
      items = items.filter((p) => p.condition === conditionFilter);
    }
    switch (sort) {
      case "cheapest":
        return [...items].sort((a, b) => a.price - b.price);
      case "expensive":
        return [...items].sort((a, b) => b.price - a.price);
      default:
        return items;
    }
  }, [slug, sort, conditionFilter]);

  const title = categoryLabels[slug || "all"] || "Produk";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{title}</span>
        </div>

        <h1 className="font-display text-3xl font-bold text-foreground mb-6">{title}</h1>

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
          {filtered.length > 0 ? (
            <motion.div 
              key={slug || "all"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.p 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-muted-foreground py-20"
            >
              Tidak ada produk ditemukan.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
