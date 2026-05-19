import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/frontend/contexts/AuthContext";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import { db } from "@/backend/config/firebase";
import { ref as dbRef, onValue, update } from "firebase/database";
import { formatPrice, getValidImageUrl } from "@/lib/utils";
import {
  Users,
  ShoppingBag,
  Banknote,
  ShieldAlert,
  Activity,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Download
} from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  buyerUid: string;
  items: any[];
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  paymentProofUrl?: string;
  rejectionReason?: string;
  createdAt: number;
  [key: string]: any;
}

export default function AdminDashboard() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalOrders: 0,
    grossRevenue: 0,
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (role !== "Admin") {
      navigate("/");
      return;
    }

    const fetchData = () => {
      // Fetch Users
      onValue(dbRef(db, "users"), (snapshot) => {
        if (snapshot.exists()) {
          setMetrics((prev) => ({
            ...prev,
            totalUsers: Object.keys(snapshot.val()).length,
          }));
        }
      });

      // Fetch Orders
      onValue(dbRef(db, "orders"), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const ordersArray: Order[] = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));

          const revenue = ordersArray.reduce(
            (acc, order) => acc + (order.totalAmount || 0),
            0
          );

          setMetrics((prev) => ({
            ...prev,
            totalOrders: ordersArray.length,
            grossRevenue: revenue,
          }));

          ordersArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setOrders(ordersArray);
        } else {
          setMetrics((prev) => ({ ...prev, totalOrders: 0, grossRevenue: 0 }));
          setOrders([]);
        }
        setIsLoading(false);
      });
    };

    fetchData();
  }, [currentUser, role, navigate]);

  const filteredOrders = useMemo(() => {
    return orders?.filter((order) => {
      // Match status
      if (paymentStatusFilter !== "ALL" && order.paymentStatus !== paymentStatusFilter) {
        return false;
      }
      // Match search
      if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        if (!order.id.toLowerCase().includes(lowerQ) && !order.buyerUid.toLowerCase().includes(lowerQ)) {
          return false;
        }
      }
      return true;
    });
  }, [orders, paymentStatusFilter, searchQuery]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error("Tidak ada data untuk dicetak");
      return;
    }

    const headers = ["Order ID", "Tanggal", "Nama Pembeli", "Total Tagihan", "Status Pembayaran"];
    const rows = filteredOrders?.map(order => [
      order.id,
      new Date(order.createdAt).toLocaleDateString("id-ID"),
      order.buyerUid,
      order.totalAmount.toString(),
      order.paymentStatus || order.status || "UNKNOWN"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows?.map(row => row?.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "laporan-transaksi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleValidatePayment = async (status: "paid" | "failed") => {
    if (!selectedOrder) return;
    if (status === "failed" && !rejectionReason.trim()) {
      toast.error("Alasan Penolakan Wajib Diisi", { description: "Pembeli perlu tahu mengapa pembayarannya ditolak." });
      return;
    }

    setIsProcessing(true);
    try {
      const updates: any = {
        paymentStatus: status,
      };

      if (status === "paid") {
        updates.orderStatus = "processing";
      } else {
        updates.rejectionReason = rejectionReason;
      }

      await update(dbRef(db, `orders/${selectedOrder.id}`), updates);
      
      if (status === "paid") {
        toast.success("✅ Pembayaran Berhasil Divalidasi", { duration: 3000 });
      } else {
        toast.error("❌ Pembayaran Ditolak", { duration: 3000 });
      }
      setSelectedOrder(null);
      setRejectionReason("");
    } catch (err: any) {
      toast.error("Gagal memvalidasi pembayaran", { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "unpaid": return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-semibold">Belum Dibayar</span>;
      case "awaiting_validation": return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-semibold">Menunggu Validasi</span>;
      case "paid": return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-semibold">Lunas</span>;
      case "failed": return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs font-semibold">Ditolak</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs font-semibold">{status}</span>;
    }
  };

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
            <Activity className="w-8 h-8 text-primary" /> Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Sistem validasi pembayaran & pemantauan aktivitas.</p>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Pengguna</p>
              <h3 className="text-2xl font-bold text-foreground">{isLoading ? "..." : metrics.totalUsers}</h3>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-7 h-7 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Transaksi</p>
              <h3 className="text-2xl font-bold text-foreground">{isLoading ? "..." : metrics.totalOrders}</h3>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Banknote className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gross Revenue</p>
              <h3 className="text-2xl font-bold text-foreground">{isLoading ? "..." : formatPrice(metrics.grossRevenue)}</h3>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
