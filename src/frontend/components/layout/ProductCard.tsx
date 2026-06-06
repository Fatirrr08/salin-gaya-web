import React, { useState, useEffect } from "react";
import { Star, Image as ImageIcon, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { useAuth } from "@/frontend/contexts/AuthContext";
import { useCart } from "@/frontend/contexts/CartContext";
import { toast } from "sonner";
import { db } from "@/backend/config/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { formatPrice, getValidImageUrl } from "@/lib/utils";
import { getChatRoomId, createOrOpenChatSession } from "@/backend/services/chatService";
import LazyImage from "@/frontend/components/ui/LazyImage";

export interface RTDBProduct {
  id: string;
  sellerUid?: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  aiEligibilityScore: string;
  createdAt: any | number | string | null;
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

  const handleChatSeller = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      toast.error("Silakan login terlebih dahulu");
      navigate("/login");
      return;
    }

    const sellerId = product?.sellerUid;
    if (!sellerId) {
      toast.error("Penjual tidak ditemukan");
      return;
    }
    if (currentUser.uid === sellerId) {
      toast.info("Ini adalah produk Anda sendiri.");
      return;
    }

    const roomId = getChatRoomId(currentUser.uid, sellerId);
    try {
      await createOrOpenChatSession(
        roomId,
        currentUser.uid,
        currentUser.displayName || "Pembeli",
        currentUser.photoURL || null,
        role || "Pembeli",
        sellerId,
        "Penjual",
        null,
        "Penjual"
      );
      navigate(`/inbox/${roomId}`);
    } catch {
      toast.error("Gagal memulai chat");
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{
        y: -4,
        scale: 1.02,
        translateZ: 0,
        boxShadow: "0px 10px 30px rgba(92, 58, 33, 0.12)",
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ willChange: "transform, opacity, box-shadow" }}
      className="h-full rounded-2xl bg-card border border-border shadow-sm flex flex-col"
    >
      <Link to={`/product/${product?.id}`} className="group block h-full p-2 sm:p-3 md:p-4">
        <div className="flex flex-col h-full">
          <div className="relative mb-3 rounded-xl overflow-hidden bg-stone-200">
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
            <div className="absolute top-2 left-2 bg-[#5C3A21] text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm z-20">
              Grade A
            </div>
          </div>

          <div className="flex flex-col flex-1">
            <h3 className="font-semibold text-[#5C3A21] text-xs sm:text-sm line-clamp-2 mb-1 group-hover:text-[#A67B5B] transition-colors">
              {product?.name || "Memuat..."}
            </h3>

            <div className="flex items-center gap-1 mb-1">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-[9px] sm:text-[10px] font-bold text-[#5C3A21]">
                {ratingData.average > 0 ? ratingData.average : "4.8"}
              </span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline">
                ({ratingData.count > 0 ? ratingData.count : "12"})
              </span>
            </div>

            <span className="font-bold text-green-700 text-xs sm:text-sm md:text-base leading-tight">
              {formatPrice(product?.price || 0)}
            </span>

            <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2">
              <button
                onClick={handleChatSeller}
                className="w-full h-10 sm:h-10 bg-[#A67B5B] text-white text-[10px] sm:text-xs font-medium rounded-lg hover:bg-[#8B6547] transition-all duration-300 flex items-center justify-center gap-1 shadow-sm"
              >
                <MessageCircle className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Chat Penjual</span>
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
