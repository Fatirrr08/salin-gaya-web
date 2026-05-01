import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { formatPrice } from "@/lib/utils";
import { Users, ShoppingBag, Banknote, ShieldAlert, Activity } from "lucide-react";

export default function AdminDashboard() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalOrders: 0,
    grossRevenue: 0,
  });
  
  const [latestOrders, setLatestOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // PROTEKSI RUTE ADMIN
    if (!currentUser) {
      navigate("/login");
      return;
    }
    
    // Asumsi: Kita bisa manual set role "Admin" dari Firebase RTDB untuk testing
    // Atau bypass di sisi dev jika diperlukan
    if (role !== "Admin") {
      navigate("/");
      return;
    }

    const fetchData = () => {
      // Fetch Users Count
      onValue(dbRef(db, "users"), (snapshot) => {
        if (snapshot.exists()) {
          setMetrics(prev => ({ ...prev, totalUsers: Object.keys(snapshot.val()).length }));
        }
      });

      // Fetch Orders
      onValue(dbRef(db, "orders"), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const ordersArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));

          // Calculate gross revenue (sum of all totalAmount)
          const revenue = ordersArray.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
          
          setMetrics(prev => ({ 
            ...prev, 
            totalOrders: ordersArray.length,
            grossRevenue: revenue
          }));

          // Get 5 latest orders
          ordersArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setLatestOrders(ordersArray.slice(0, 5));
        } else {
          setMetrics(prev => ({ ...prev, totalOrders: 0, grossRevenue: 0 }));
          setLatestOrders([]);
        }
        setIsLoading(false);
      });
    };

    fetchData();

  }, [currentUser, role, navigate]);

  if (!currentUser || role !== "Admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground mt-2">Hanya Administrator yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container max-w-6xl mx-auto py-10 px-4">
        
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Ringkasan aktivitas platform Salin Gaya.</p>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Pengguna</p>
              <h3 className="text-2xl font-bold text-foreground">
                {isLoading ? "..." : metrics.totalUsers}
              </h3>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-7 h-7 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Transaksi</p>
              <h3 className="text-2xl font-bold text-foreground">
                {isLoading ? "..." : metrics.totalOrders}
              </h3>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Banknote className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gross Revenue</p>
              <h3 className="text-2xl font-bold text-foreground">
                {isLoading ? "..." : formatPrice(metrics.grossRevenue)}
              </h3>
            </div>
          </div>
        </div>

        {/* LATEST TRANSACTIONS */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">5 Transaksi Terbaru</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Order ID</th>
                  <th className="p-4 font-medium">Items</th>
                  <th className="p-4 font-medium">Total Nominal</th>
                  <th className="p-4 font-medium">Metode</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Memuat data...</td>
                  </tr>
                ) : latestOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Belum ada transaksi.</td>
                  </tr>
                ) : (
                  latestOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="p-4">
                        <span className="font-mono text-xs bg-secondary px-2 py-1 rounded text-foreground">
                          {order.id.substring(1, 9).toUpperCase()}...
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-foreground">{order.items?.length || 0} Produk</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                          {order.items?.map((i: any) => i.name).join(", ")}
                        </p>
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        {formatPrice(order.totalAmount)}
                      </td>
                      <td className="p-4">
                        <span className="text-xs uppercase font-medium border border-border px-2 py-1 rounded bg-background">
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          order.status === "UNPAID" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          order.status === "PAID" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          "bg-secondary text-secondary-foreground"
                        }`}>
                          {order.status || "UNKNOWN"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
