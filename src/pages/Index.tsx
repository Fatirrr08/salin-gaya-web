import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard, { RTDBProduct } from "@/components/ProductCard";
import { Search, Loader2, PackageX } from "lucide-react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

export default function Index() {
  const [products, setProducts] = useState<RTDBProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data dari Firebase RTDB
  useEffect(() => {
    const productsRef = ref(db, "products");
    
    // onValue untuk listener real-time, atau bisa pakai get() untuk one-time fetch
    const unsubscribe = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Convert object to array
        const loadedProducts: RTDBProduct[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));

        // Validasi: Hanya produk yang memiliki gambar dan ter-verifikasi
        const validProducts = loadedProducts.filter(
          (p) => p.images && p.images.length > 0 && p.aiEligibilityScore === "LAYAK"
        );

        setProducts(validProducts);
      } else {
        setProducts([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setIsLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // Filter dinamis berdasarkan nama
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Katalog Utama</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">Temukan produk preloved terbaik yang telah diverifikasi AI.</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl leading-5 bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all sm:text-sm"
              placeholder="Cari nama produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          // Loading State: Skeleton Grid
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-card rounded-xl overflow-hidden border border-border h-[350px] animate-pulse flex flex-col">
                <div className="h-48 bg-muted w-full"></div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="mt-auto h-10 bg-muted rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          // Product Grid
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-xl border border-border border-dashed">
            <PackageX className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-foreground">Tidak ada produk ditemukan</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
              {searchQuery 
                ? `Kami tidak dapat menemukan produk yang cocok dengan pencarian "${searchQuery}". Coba kata kunci lain.` 
                : "Belum ada produk yang dijual saat ini."}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
