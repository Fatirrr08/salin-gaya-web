import React, { useState, useEffect } from "react";
import { ShoppingCart, MessageCircle, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { ref as dbRef, onValue } from "firebase/database";

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

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

export default function ProductCard({ product, index = 0 }: { product: RTDBProduct; index?: number }) {
  const { addToCart } = useCart();
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
  
  // Ambil gambar pertama jika ada, jika tidak gunakan placeholder
  const imageUrl = product.images && product.images.length > 0 
    ? product.images[0] 
    : "https://via.placeholder.com/400?text=No+Image";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link to={`/product/${product.id}`} className="group block h-full">
        <div className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-border h-full flex flex-col">
          <div className="aspect-square overflow-hidden relative bg-muted">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {product.aiEligibilityScore === "LAYAK" && (
              <span className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wide">
                Verified
              </span>
            )}
          </div>
          <div className="p-4 flex flex-col flex-1">
            <h3 className="font-medium text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>

            <div className="flex items-center gap-1 mt-1.5 mb-1">
              <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
              <span className="text-xs font-bold text-foreground">{ratingData.average > 0 ? ratingData.average : "Baru"}</span>
              <span className="text-xs text-muted-foreground">({ratingData.count})</span>
            </div>
            
            <div className="mt-2 flex items-center justify-between flex-1">
              <span className="font-bold text-primary text-base">{formatPrice(product.price)}</span>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                to={`/chat/${product.sellerUid || 'admin'}`}
                onClick={(e) => e.stopPropagation()}
                className="w-full py-2 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Chat
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addToCart(product);
                  toast.success("Masuk Keranjang", {
                    description: `${product.name} ditambahkan ke keranjang.`
                  });
                }}
                className="w-full py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Beli
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
