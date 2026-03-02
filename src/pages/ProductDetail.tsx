import { useParams, Link } from "react-router-dom";
import { Star, ShoppingBag, MessageCircle, Shield, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { products, formatPrice } from "@/lib/data";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);
  const { addItem } = useCart();

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Produk tidak ditemukan.</p>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">Kembali ke Home</Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product);
    toast.success("Ditambahkan ke keranjang!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-square rounded-xl overflow-hidden bg-card border border-border"
          >
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="inline-block bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full mb-3">
              Grade {product.condition}
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-accent text-accent" : "text-border"}`} />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground">{product.rating}</span>
              <span className="text-sm text-muted-foreground">({product.reviews} reviews)</span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
              )}
            </div>

            <p className="mt-6 text-foreground leading-relaxed">{product.description}</p>

            <div className="mt-4 text-sm text-muted-foreground">
              Penjual: <span className="font-medium text-foreground">{product.seller}</span>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" /> Tambah ke Keranjang
              </button>
              <button className="px-5 py-3 border border-border text-foreground font-medium rounded-lg hover:bg-secondary transition-colors flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> Chat
              </button>
            </div>

            <div className="mt-6 p-4 bg-card rounded-lg border border-border flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Transaksi Aman</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pembayaran dilindungi oleh sistem escrow. Dana diteruskan ke penjual setelah barang diterima.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
