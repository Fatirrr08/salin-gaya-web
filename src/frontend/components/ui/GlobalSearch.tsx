import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { dbFirestore } from "@/backend/config/firebase";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/frontend/components/ui/command";
import {
  Search,
  Clock,
  TrendingUp,
  Tag,
  ArrowRight,
  PackageSearch,
  X,
  Loader2,
} from "lucide-react";
import Fuse from "fuse.js";

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Do NOT wrap CommandGroup/CommandItem inside <motion.div> or any
// deferred-render wrapper. The cmdk library tracks DOM children synchronously,
// and Framer Motion's deferred render breaks the internal list context,
// causing items to be invisible even if they are in the React tree.
// ─────────────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  price: number;
  imageUrl?: string;
  rating?: number;
}

const POPULAR_SEARCHES = [
  "Stone Island",
  "Gucci",
  "Vintage Hoodie",
  "Celana Cargo",
  "Sepatu Sneakers",
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();

  // ── Load recent searches on mount ─────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("salinGayaRecentSearches");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        } else {
          localStorage.removeItem("salinGayaRecentSearches");
          setRecentSearches([]);
        }
      }
    } catch {
      localStorage.removeItem("salinGayaRecentSearches");
      setRecentSearches([]);
    }
  }, []);

  // ── Keyboard shortcut: Cmd/Ctrl + K ───────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Fetch products once when dialog first opens ────────────────────────────
  useEffect(() => {
    if (!open || products.length > 0) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(dbFirestore, "products"));
        const fetched: Product[] = [];
        snap.forEach((doc) =>
          fetched.push({ id: doc.id, ...(doc.data() as Omit<Product, "id">) })
        );
        setProducts(fetched);
      } catch (e) {
        console.error("[GlobalSearch] fetch failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, products.length]);

  // ── Reset query when dialog closes ────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  // ── 300 ms debounce ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // ── Fuse.js (memoised — recreated only when products change) ──────────────
  const fuseProducts = useMemo(
    () =>
      new Fuse(products, {
        keys: ["name", "brand", "category"],
        threshold: 0.35,
        distance: 100,
        includeScore: true,
      }),
    [products]
  );

  const productResults = useMemo(() => {
    if (!debouncedQuery) return [];
    return fuseProducts.search(debouncedQuery).slice(0, 5).map((r) => r.item);
  }, [debouncedQuery, fuseProducts]);

  const categoryResults = useMemo(() => {
    if (!debouncedQuery) return [];
    const cats = Array.from(
      new Set(products.map((p) => p.category).filter(Boolean))
    );
    return new Fuse(cats, { threshold: 0.4 })
      .search(debouncedQuery)
      .slice(0, 3)
      .map((r) => r.item);
  }, [debouncedQuery, products]);

  const brandResults = useMemo(() => {
    if (!debouncedQuery) return [];
    const brands = Array.from(
      new Set(products.map((p) => p.brand).filter(Boolean))
    ) as string[];
    return new Fuse(brands, { threshold: 0.4 })
      .search(debouncedQuery)
      .slice(0, 3)
      .map((r) => r.item);
  }, [debouncedQuery, products]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (
      term: string,
      type: "product" | "category" | "brand" | "query" = "query",
      id?: string
    ) => {
      if (!term) return;
      const updated = [
        term,
        ...recentSearches.filter((t) => t !== term),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("salinGayaRecentSearches", JSON.stringify(updated));
      setOpen(false);
      if (type === "product" && id) navigate(`/product/${id}`);
      else if (type === "category")
        navigate(`/category/${encodeURIComponent(term.toLowerCase())}`);
      else if (type === "brand")
        navigate(
          `/search?q=${encodeURIComponent(term)}&brand=${encodeURIComponent(term)}`
        );
      else navigate(`/search?q=${encodeURIComponent(term)}`);
    },
    [navigate, recentSearches]
  );

  const removeRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((t) => t !== term);
    setRecentSearches(updated);
    localStorage.setItem("salinGayaRecentSearches", JSON.stringify(updated));
  };

  const isSearching = debouncedQuery.length > 0;
  const hasResults =
    productResults.length > 0 ||
    categoryResults.length > 0 ||
    brandResults.length > 0;

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ───── Trigger: search icon button ───── */}
      <button
        id="global-search-trigger"
        onClick={() => setOpen(true)}
        className="p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
        title="Cari produk (Ctrl+K)"
        aria-label="Buka pencarian"
      >
        <Search className="w-[20px] h-[20px] text-[#5C3A21]" />
      </button>

      {/* ───── Modal — rendered via Radix Portal to document.body ───── */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Cari produk, brand, atau kategori…"
          value={query}
          onValueChange={setQuery}
        />

        <CommandList>
          {/* ── Loading spinner (replaces entire list) ── */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-[#A67B5B]" />
              Memuat produk…
            </div>
          )}

          {/* ── Empty state when user typed but no results ── */}
          {!loading && isSearching && !hasResults && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <PackageSearch className="w-12 h-12 text-muted-foreground opacity-40 mb-4" />
              <p className="text-sm font-semibold text-[#5C3A21] mb-1">
                Produk tidak ditemukan
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Coba kata kunci lain, atau lihat semua produk kami.
              </p>
              <button
                onClick={() => handleSelect(debouncedQuery, "query")}
                className="flex items-center gap-2 bg-[#A67B5B] hover:bg-[#8C674C] text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
              >
                Lihat Semua Produk <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ── Default view: Pencarian Populer + Riwayat (no query) ── */}
          {!loading && !isSearching && (
            <>
              {recentSearches.length > 0 && (
                <CommandGroup heading="Riwayat Pencarian">
                  {recentSearches.map((term, i) => (
                    <CommandItem
                      key={`recent-${i}`}
                      value={`recent-${term}`}
                      onSelect={() => handleSelect(term, "query")}
                    >
                      <Clock className="mr-2 w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-[#5C3A21] text-sm">
                        {term}
                      </span>
                      <button
                        onClick={(e) => removeRecent(term, e)}
                        className="p-1 rounded-full hover:bg-stone-200 ml-2"
                        aria-label={`Hapus ${term}`}
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Pencarian Populer — always shown when no query */}
              <CommandGroup heading="Pencarian Populer">
                {POPULAR_SEARCHES.map((term) => (
                  <CommandItem
                    key={`popular-${term}`}
                    value={`popular-${term}`}
                    onSelect={() => handleSelect(term, "query")}
                  >
                    <TrendingUp className="mr-2 w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-[#5C3A21] text-sm">{term}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* ── Results: Products ── */}
          {!loading && isSearching && productResults.length > 0 && (
            <CommandGroup heading="Produk">
              {productResults.map((p) => (
                <CommandItem
                  key={p?.id}
                  value={`product-${p?.id}`}
                  onSelect={() =>
                    handleSelect(p?.name ?? "", "product", p?.id)
                  }
                >
                  <Search className="mr-2 w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[#5C3A21] font-medium text-sm truncate">
                      {p?.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {p?.category ?? ""}
                      {p?.brand ? ` · ${p.brand}` : ""}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Results: Categories ── */}
          {!loading && isSearching && categoryResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Kategori">
                {categoryResults.map((cat) => (
                  <CommandItem
                    key={`cat-${cat}`}
                    value={`cat-${cat}`}
                    onSelect={() => handleSelect(cat, "category")}
                  >
                    <Tag className="mr-2 w-4 h-4 text-[#A67B5B] shrink-0" />
                    <span className="text-[#5C3A21] text-sm">
                      Lihat semua di kategori <b>{cat}</b>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* ── Results: Brands ── */}
          {!loading && isSearching && brandResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Brand">
                {brandResults.map((brand) => (
                  <CommandItem
                    key={`brand-${brand}`}
                    value={`brand-${brand}`}
                    onSelect={() => handleSelect(brand, "brand")}
                  >
                    <Search className="mr-2 w-4 h-4 text-[#A67B5B] shrink-0" />
                    <span className="text-[#5C3A21] text-sm">
                      Cari produk dari <b>{brand}</b>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
