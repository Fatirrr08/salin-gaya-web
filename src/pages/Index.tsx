import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/data";
import { ShieldCheck, Truck, BadgeCheck, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Index() {
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
              <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground leading-tight">
                Koleksi Pilihan <br />
                <span className="text-[#D4A373]">Premium</span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-md">
                Temukan gayamu dengan barang secondhand berkualitas tinggi. Kurasi terbaik, harga terjangkau.
              </p>
              
              <div className="mt-8 flex items-center gap-4">
                <Link 
                  to="/category/all" 
                  className="px-6 py-3 bg-[#8B5A2B] hover:bg-[#6D4622] text-white font-medium rounded-md transition-colors shadow-sm hover:shadow-lg"
                >
                  Jelajahi Koleksi
                </Link>
                <Link 
                  to="/register" 
                  className="px-6 py-3 bg-transparent border border-muted-foreground/30 hover:bg-black/5 text-foreground font-medium rounded-md transition-colors"
                >
                  Daftar Gratis
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Koleksi Terbaru Section */}
        <section className="py-16 md:py-24 container mx-auto px-4 max-w-7xl">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground">Koleksi Terbaru</h2>
              <p className="text-muted-foreground mt-2">Baru masuk, kualitas terjamin</p>
            </div>
            <Link to="/category/all" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Lihat Semua -&gt;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {products.slice(0, 8).map((product, index) => (
              <ProductCard key={product.id} product={product as any} index={index} />
            ))}
          </div>
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
              Memfasilitasi Transaksi Barang Secondhand<br />
              (Thrifting) yang <span className="text-[#D4A373]">Aman dan Mudah</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm text-foreground hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-foreground mb-2">Transaksi Aman</h3>
                <p className="text-sm text-muted-foreground">Sistem escrow melindungi setiap transaksi</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm text-foreground hover:scale-110 transition-transform duration-300">
                  <Truck className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-foreground mb-2">Pengiriman Terpercaya</h3>
                <p className="text-sm text-muted-foreground">Terintegrasi dengan kurir terpercaya</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm text-foreground hover:scale-110 transition-transform duration-300">
                  <BadgeCheck className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-foreground mb-2">Garansi Kualitas</h3>
                <p className="text-sm text-muted-foreground">Jaminan keaslian & kondisi barang</p>
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
          <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">Apa Kata Mereka</h2>
          
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
                    <Star key={star} className="w-4 h-4 fill-[#D4A373] text-[#D4A373]" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-6 font-medium italic">
                  "Barangnya original dan kondisinya sangat bagus! Pengiriman juga cepat. Puas banget belanja di Salin Gaya."
                </p>
                <p className="text-sm font-bold text-foreground">— Rina Susanti</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
}
