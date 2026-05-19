import React, { useState, useEffect } from "react";
import { Star, Image as ImageIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { useAuth } from "@/frontend/contexts/AuthContext";
import { toast } from "sonner";
import { db } from "@/backend/config/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { formatPrice, getValidImageUrl } from "@/lib/utils";
import { sendMessage, getChatRoomId } from "@/backend/services/chatService";
import LazyImage from "@/frontend/components/ui/LazyImage";

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

// Staggered list animation variant
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

export default function ProductCard({
  product,
  index = 0,
}: {
  product: RTDBProduct;
  index?: number;
}) {
  const { addToCart } = useCart();
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [ratingData, setRatingData] = useState({ average: 0, count: 0 });

  useEffect(() => {
    if (!product?.id) return;
    const reviewsRef = dbRef(db, `reviews/${product.id}`);
    const unsubscribe = onValue(reviewsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const reviewsArray = Object.values(data) as { rating: number }[];
        const avg =
          reviewsArray.reduce((acc, rev) => acc + rev.rating, 0) /
          reviewsArray.length;
        setRatingData({
          average: Number(avg.toFixed(1)),
          count: reviewsArray.length,
        });
      } else {
        setRatingData({ average: 0, count: 0 });
      }
    });
    return () => unsubscribe();
  }, [product?.id]);

  const imageUrl = getValidImageUrl(product);
  
  return (
    <motion.div
      variants={itemVariants}
      // Haptic Hover Effects
      whileHover={{ 
        y: -4, 
        scale: 1.02, 
        translateZ: 0, // hardware acceleration
        boxShadow: "0px 10px 30px rgba(92, 58, 33, 0.12)"
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ willChange: "transform, opacity, box-shadow" }}
      className="h-full rounded-2xl bg-card border border-border shadow-sm flex flex-col"
    >
      <Link to={`/product/${product?.id}`} className="group block h-full p-4">
        <div className="flex flex-col h-full">
          <div className="relative mb-4 rounded-xl overflow-hidden bg-stone-200">
            {imageUrl ? (
              <LazyImage 
                src={imageUrl} 
                alt={product?.name || "Product"} 
                aspectRatio="aspect-square" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            ) : (
              <div className="w-full aspect-square bg-stone-200 flex items-center justify-center">
                <ImageIcon className="text-stone-400 w-8 h-8" />
              </div>
            )}
            {/* Grade Badge */}
            <div className="absolute top-2 left-2 bg-[#5C3A21] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm z-20">
              Grade A
            </div>
          </div>

          <div className="flex flex-col flex-1">
            <h3 className="font-semibold text-[#5C3A21] text-sm line-clamp-2 mb-1 group-hover:text-[#A67B5B] transition-colors">
              {product?.name || "Memuat..."}
            </h3>

            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold text-[#5C3A21]">
                {ratingData.average > 0 ? ratingData.average : "4.8"}
              </span>
              <span className="text-xs text-muted-foreground">
                ({ratingData.count > 0 ? ratingData.count : "12"})
              </span>
            </div>

            <div className="flex items-center justify-between flex-1">
              <span className="font-bold text-green-700 text-base">
                {formatPrice(product?.price || 0)}
              </span>
            </div>

            <div className="mt-4 pt-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (!currentUser) {
                    toast.error("Akses Ditolak", {
                      description:
                        "Silakan login terlebih dahulu untuk mulai berbelanja.",
                    });
                    navigate("/login");
                    return;
                  }

                  if (role === "Penjual") {
                    toast.error("Akses Ditolak", {
                      description:
                        "Akun Penjual tidak dapat melakukan chat/pembelian.",
                    });
                    return;
                  }

                  const sellerId = product?.sellerUid || "unknown_seller";

                  const roomId = getChatRoomId(
                    currentUser.uid,
                    sellerId
                  );
                  sendMessage(
                    roomId,
                    currentUser.uid,
                    currentUser.displayName || "Pembeli",
                    `Halo, apakah ${product?.name} masih tersedia?`,
                    sellerId
                  ).catch(err => console.error("Auto message err:", err));
                  
                  navigate(`/chat/${sellerId}`);
                }}
                className="w-full py-2.5 bg-[#A67B5B] text-white text-sm font-medium rounded-lg hover:bg-[#8B6547] transition-all duration-300 flex items-center justify-center shadow-sm"
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
