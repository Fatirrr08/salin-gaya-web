const fs = require('fs');
let code = fs.readFileSync('src/frontend/pages/Index.tsx', 'utf8');

// 1. Update imports
code = code.replace(
  'import { auth, db } from "@/backend/config/firebase";',
  'import { auth, db, dbFirestore } from "@/backend/config/firebase";\nimport { collection, getDocs, query, orderBy } from "firebase/firestore";'
);
code = code.replace(
  'import { ShieldCheck, Truck, BadgeCheck, Star } from "lucide-react";',
  'import { ShieldCheck, Truck, BadgeCheck, Star, Search, PackageX } from "lucide-react";\nimport { Input } from "@/frontend/components/ui/input";\nimport { Button } from "@/frontend/components/ui/button";'
);

// 2. Add states and change fetch logic
code = code.replace(
  /const \[products, setProducts\] = React\.useState<any\[\]>\(\[\]\);\n  const \[loading, setLoading\] = React\.useState\(true\);\n\n  React\.useEffect\(\(\) => \{[\s\S]*?return \(\) => \{[\s\S]*?\}\;\n  \}, \[\]\);/,
  `const [products, setProducts] = React.useState<any[]>([]);
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
      } catch (error: any) {
        if (error?.code === 'failed-precondition' || error?.message?.includes("index")) {
            try {
                const snapshot = await getDocs(collection(dbFirestore, "products"));
                const loadedProducts: any[] = [];
                snapshot.forEach(doc => {
                  loadedProducts.push({ id: doc.id, ...doc.data() });
                });
                loadedProducts.sort((a, b) => {
                    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
                    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
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
      const matchCategory = selectedCategory === "Semua" || (product.category && product.category.toLowerCase() === selectedCategory.toLowerCase());
      const matchSearch = !searchQuery || (product.name && product.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);`
);

// 3. Update Koleksi Terbaru UI with Filters and empty state
code = code.replace(
  /\{\/\* Koleksi Terbaru Section \*\/\}\n\s*<section className="py-16 md:py-24 container mx-auto px-4 max-w-7xl">[\s\S]*?<\/section>/,
  `{/* Koleksi Terbaru Section */}
        <section className="py-16 md:py-24 container mx-auto px-4 max-w-7xl">
          <div className="mb-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Katalog Produk
              </h2>
              <p className="text-muted-foreground mt-2">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product?.id || index}
                  product={product}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>`
);

fs.writeFileSync('src/frontend/pages/Index.tsx', code);
console.log('Patched Index.tsx');
