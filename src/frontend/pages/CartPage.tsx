import React from 'react';
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import { useCart } from "@/frontend/hooks/useCart";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { items, total, updateQuantity, removeItem } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">
          Keranjang
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              Keranjang kamu masih kosong
            </p>
            <Link
              to="/category/all"
              className="inline-block mt-4 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items?.map((item, i) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-4 p-4 bg-card rounded-xl border border-border"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Grade {item.product.condition}
                    </p>
                    <p className="font-bold text-primary mt-1">
                      {formatPrice(item.product.price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="ml-auto p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-card rounded-xl border border-border p-6 h-fit sticky top-24">
              <h3 className="font-semibold text-foreground text-lg mb-4">
                Ringkasan
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
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
              <button className="mt-6 w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity">
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
