import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { ref, onValue, query, orderByChild, equalTo } from "firebase/database";
import { Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sellerUid?: string;
  images?: string[];
}

interface Order {
  id: string;
  buyerUid: string;
  items: OrderItem[];
  shippingCost: number;
  subtotal: number;
  totalAmount: number;
  status: string;
  createdAt: number | any;
  courier: string;
  shippingAddress: any;
}

export default function OrderHistory() {
  const { currentUser, role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const ordersRef = ref(db, "orders");
    
    // Listen to all orders or query by buyer if buyer. 
    // Since Firebase RTDB queries are limited without proper indexes, we'll fetch and filter client-side for flexibility,
    // especially for Sellers who need to search deep within items.
    
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allOrders: Order[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));

        let filteredOrders: Order[] = [];

        if (role === "Pembeli") {
          filteredOrders = allOrders.filter(order => order.buyerUid === currentUser.uid);
        } else if (role === "Penjual") {
          // Penjual only sees orders that contain at least one item they sell
          filteredOrders = allOrders.map(order => {
            const myItems = (order.items || []).filter(item => item.sellerUid === currentUser.uid);
            return { ...order, items: myItems };
          }).filter(order => order.items.length > 0);
        }

        // Sort by newest first
        filteredOrders.sort((a, b) => {
          const timeA = a.createdAt || 0;
          const timeB = b.createdAt || 0;
          return timeB - timeA;
        });

        setOrders(filteredOrders);
      } else {
        setOrders([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, role]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UNPAID":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3"/> Belum Dibayar</span>;
      case "PAID":
      case "PROCESSING":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex items-center gap-1"><Package className="w-3 h-3"/> Sedang Diproses</span>;
      case "SHIPPED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 flex items-center gap-1"><Package className="w-3 h-3"/> Dikirim</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Selesai</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container max-w-4xl mx-auto py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {role === "Pembeli" ? "Pesanan Saya" : "Pesanan Masuk"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {role === "Pembeli" ? "Lacak dan kelola riwayat pembelian Anda." : "Daftar barang yang harus Anda kirim ke pelanggan."}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Belum ada pesanan</h3>
            <p className="text-muted-foreground">
              {role === "Pembeli" ? "Anda belum melakukan transaksi apapun. Yuk mulai belanja!" : "Belum ada pelanggan yang membeli barang Anda."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Order Header */}
                <div className="border-b border-border bg-secondary/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ID Pesanan: <span className="font-mono text-foreground">{order.id}</span></p>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">
                        {new Date(order.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                  {role === "Pembeli" && order.status === "UNPAID" && (
                    <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">
                      Bayar Sekarang
                    </button>
                  )}
                  {role === "Penjual" && order.status === "PAID" && (
                    <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">
                      Proses & Kirim
                    </button>
                  )}
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <div className="space-y-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                          <img src={item.images?.[0] || "https://via.placeholder.com/100"} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{item.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{item.quantity} barang x {formatPrice(item.price)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Footer */}
                <div className="border-t border-border bg-secondary/30 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Kurir: <span className="font-medium text-foreground">{order.courier}</span></p>
                    {role === "Penjual" && (
                      <p className="text-muted-foreground mt-1">Tujuan: <span className="font-medium text-foreground">{order.shippingAddress?.city || "-"}</span></p>
                    )}
                  </div>
                  
                  {role === "Pembeli" ? (
                     <div className="text-right w-full sm:w-auto">
                       <p className="text-xs text-muted-foreground mb-1">Total Belanja</p>
                       <p className="text-xl font-bold text-primary">{formatPrice(order.totalAmount)}</p>
                     </div>
                  ) : (
                    <div className="text-right w-full sm:w-auto">
                      <p className="text-xs text-muted-foreground mb-1">Total Pendapatan (Item ini)</p>
                      <p className="text-xl font-bold text-primary">
                        {formatPrice(order.items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
