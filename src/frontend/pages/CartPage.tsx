import React from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import { useCart } from "@/frontend/contexts/CartContext";
import { formatPrice, getValidImageUrl } from "@/lib/utils";

export default function CartPage() {
  const { items, subtotal: total, updateQuantity, removeFromCart: removeItem } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8">
          Keranjang
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-16 sm:py-24">
            <ShoppingBag className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-base sm:text-lg mb-6">
              Keranjang kamu masih kosong
            </p>
            <Link
              to="/category/all"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Mulai Belanja <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* ── Daftar Item ── */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {items?.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-xl border border-border"
                >
                  {/* Gambar produk */}
                  <img
                    src={getValidImageUrl(item as unknown as any)}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shrink-0"
                  />

                  {/* Info produk */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-medium text-foreground text-sm sm:text-base line-clamp-2 flex-1">
                        {item.name}
                      </h3>
                      {/* Tombol hapus — pojok kanan atas pada mobile */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Grade {(item as unknown as any).condition || "A"}
                    </p>

                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <p className="font-bold text-primary text-sm sm:text-base">
                        {formatPrice(item.price || 0)}
                      </p>

                      {/* Qty controls removed because thrifting items have quantity 1 */}
                      <span className="text-sm font-medium text-muted-foreground px-2">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Ringkasan Pesanan ── */}
            <div className="bg-card rounded-xl border border-border p-5 sm:p-6 h-fit lg:sticky lg:top-24">
              <h3 className="font-semibold text-foreground text-lg mb-4">
                Ringkasan Pesanan
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} item)
                  </span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Estimasi Ongkir</span>
                  <span>Rp 15.000</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground text-base">
                  <span>Total</span>
                  <span>{formatPrice(total + 15000)}</span>
                </div>
              </div>
              <button
                onClick={() => navigate("/checkout")}
                className="mt-5 sm:mt-6 w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Checkout <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/category/all"
                className="mt-3 block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Lanjut Belanja
              </Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
