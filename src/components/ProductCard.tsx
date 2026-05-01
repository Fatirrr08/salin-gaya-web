import React, { useState, useEffect } from "react";
import { ShoppingCart, MessageCircle, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { formatPrice } from "@/lib/utils";

export interface RTDBProduct {
  id: string;
  sellerUid?: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  aiEligibilityScore: string;
  createdAt: any;
}



export default function ProductCard({ product, index = 0 }: { product: RTDBProduct; index?: number }) {
  const { addToCart } = useCart();
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [ratingData, setRatingData] = useState({ average: 0, count: 0 });

  useEffect(() => {
    const reviewsRef = dbRef(db, `reviews/${product.id}`);
    const unsubscribe = onValue(reviewsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const reviewsArray = Object.values(data) as { rating: number }[];
        const avg = reviewsArray.reduce((acc, rev) => acc + rev.rating, 0) / reviewsArray.length;
        setRatingData({ average: Number(avg.toFixed(1)), count: reviewsArray.length });
      } else {
        setRatingData({ average: 0, count: 0 });
      }
    });
    return () => unsubscribe();
  }, [product.id]);
  
  // Handle both array `images` (from RTDB) and `imageUrl` (from static data)
  let imageUrl = "https://fakeimg.pl/300x300?text=No+Image";
  if (product.images && product.images.length > 0) {
    imageUrl = product.images[0];
  } else if ((product as any).imageUrl) {
    imageUrl = (product as any).imageUrl;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ scale: 1.03 }}
      className="h-full"
    >
      <Link to={`/product/${product.id}`} className="group block h-full">
        <div className="bg-card rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border-none h-full flex flex-col">
          <div className="aspect-square rounded-xl overflow-hidden relative bg-muted/30 mb-4">
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              src={imageUrl}
              alt={product.name}
              onError={(e) => { e.currentTarget.src = "https://fakeimg.pl/300x300?text=No+Image"; }}
              className="w-full h-full object-cover"
            />
            {/* Grade Badge */}
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Grade A
            </div>
          </div>
          
          <div className="flex flex-col flex-1">
            <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
              {product.name}
            </h3>

            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-3.5 h-3.5 fill-primary text-primary" />
              <span className="text-xs font-bold text-foreground">{ratingData.average > 0 ? ratingData.average : "4.8"}</span>
              <span className="text-xs text-muted-foreground">({ratingData.count > 0 ? ratingData.count : "12"})</span>
            </div>
            
            <div className="flex items-center justify-between flex-1">
              <span className="font-bold text-primary text-base">{formatPrice(product.price)}</span>
            </div>
            
            <div className="mt-4 pt-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (!currentUser) {
                    toast.error("Akses Ditolak", { description: "Silakan login terlebih dahulu untuk mulai berbelanja." });
                    navigate("/login");
                    return;
                  }
                  
                  if (role === "Penjual") {
                    toast.error("Akses Ditolak", { description: "Akun Penjual tidak dapat melakukan pembelian." });
                    return;
                  }

                  addToCart(product);
                  toast.success("Masuk Keranjang", {
                    description: `${product.name} ditambahkan ke keranjang.`
                  });
                }}
                className="w-full py-2.5 bg-[#A67B5B] text-white text-sm font-medium rounded-lg hover:bg-[#8B6547] hover:shadow-[0_0_15px_rgba(166,123,91,0.5)] transition-all duration-300 flex items-center justify-center shadow-sm"
              >
                Tanya Sekarang
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
