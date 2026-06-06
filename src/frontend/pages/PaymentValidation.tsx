import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/frontend/contexts/AuthContext";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import { db, dbFirestore } from "@/backend/config/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { formatPrice, getValidImageUrl } from "@/lib/utils";
import {
  ShoppingBag,
  Banknote,
  ShieldAlert,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Download,
  Clock,
  CheckCircle,
  XOctagon
} from "lucide-react";
import { toast } from "sonner";
import { OrderData, OrderItem } from "@/backend/types";

export default function PaymentValidation() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();



  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("payment_uploaded");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
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
          // Do nothing or handle users data if needed
        }
      });

      // Fetch Orders from Firestore
      const q = query(collection(dbFirestore, "orders"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ordersArray: OrderData[] = [];
        snapshot.forEach(doc => {
          ordersArray.push({ id: doc.id, ...doc.data() } as OrderData);
        });

        const revenue = ordersArray.reduce(
          (acc, order) => acc + (order.totalAmount || 0),
          0
        );



        setOrders(ordersArray);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching orders:", error);
        setIsLoading(false);
      });

      return () => {
        unsubscribe();
      };
    };

    const cleanup = fetchData();
    return () => {
      if (cleanup) cleanup();
    };
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
    const rows = filteredOrders?.map(order => {
      let dateStr = "";
      const createdAt = order.createdAt as any;
      if (createdAt?.toDate) {
        dateStr = createdAt.toDate().toLocaleDateString("id-ID");
      } else if (order.createdAt) {
        dateStr = new Date(order.createdAt as string).toLocaleDateString("id-ID");
      }
      return [
        order.id,
        dateStr,
        order.userId || order.buyerUid || "-",
        order.totalAmount.toString(),
        order.paymentStatus || order.status || "UNKNOWN"
      ];
    });

    const csvContent = [
      headers.join(","),
      ...(rows?.map(row => row?.map(cell => `"${cell}"`).join(",")) || [])
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
      const updates: Record<string, string> = {
        paymentStatus: status,
      };

      if (status === "paid") {
        updates.orderStatus = "processing";
        // Kurangi stok barang
        selectedOrder.items.forEach(async (item: OrderItem) => {
          if (item.id) {
            try {
              const { getDoc } = await import("firebase/firestore");
              const docRef = doc(dbFirestore, "products", item.id);
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                const currentStock = snap.data().stock || 0;
                const newStock = Math.max(0, currentStock - (item.quantity || 1));
                await updateDoc(docRef, { stock: newStock });
              }
            } catch (err) {
              console.error("Failed to update stock", err);
            }
          }
        });
      } else {
        updates.rejectionReason = rejectionReason;
      }

      await updateDoc(doc(dbFirestore, "orders", selectedOrder.id), updates);
      
      if (status === "paid") {
        toast.success("✅ Pembayaran Berhasil Divalidasi", { duration: 3000 });
      } else {
        toast.error("❌ Pembayaran Ditolak", { duration: 3000 });
      }
      setSelectedOrder(null);
      setRejectionReason("");
    } catch (err: unknown) {
      toast.error("Gagal memvalidasi pembayaran", { description: (err as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "unpaid": return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-semibold">Belum Dibayar</span>;
      case "payment_uploaded": return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-semibold">Menunggu Validasi</span>;
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
            <Banknote className="w-8 h-8 text-primary" /> Validasi Pembayaran
          </h1>
          <p className="text-muted-foreground mt-1">Daftar transaksi yang perlu diverifikasi admin.</p>
        </div>

        {/* DASHBOARD OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Menunggu Validasi</p>
              <p className="text-2xl font-bold">{orders?.filter(o => o.paymentStatus === "payment_uploaded").length}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Berhasil (Paid)</p>
              <p className="text-2xl font-bold">{orders?.filter(o => o.paymentStatus === "paid").length}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <XOctagon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ditolak (Failed)</p>
              <p className="text-2xl font-bold">{orders?.filter(o => o.paymentStatus === "failed").length}</p>
            </div>
          </div>
        </div>

        {/* ORDERS TABLE */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">Daftar Transaksi</h2>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Cari ID Pesanan..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <select 
                value={paymentStatusFilter} 
                onChange={e => setPaymentStatusFilter(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="unpaid">Belum Dibayar</option>
                <option value="payment_uploaded">Menunggu Validasi</option>
                <option value="paid">Lunas</option>
                <option value="failed">Ditolak</option>
              </select>
              <button 
                onClick={handleExportCSV} 
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" /> Cetak Laporan (CSV)
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Order ID</th>
                  <th className="p-4 font-medium">Tanggal</th>
                  <th className="p-4 font-medium">Pembeli (UID)</th>
                  <th className="p-4 font-medium">Total Nominal</th>
                  <th className="p-4 font-medium">Status Pembayaran</th>
                  <th className="p-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Memuat data...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Tidak ada pesanan ditemukan.</td></tr>
                ) : (
                  filteredOrders?.map(order => (
                    <tr key={order.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                      <td className="p-4">
                        <span className="font-mono text-xs bg-secondary px-2 py-1 rounded text-foreground">{order.id.substring(1, 9).toUpperCase()}...</span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {(order.createdAt as any)?.toDate ? (order.createdAt as any).toDate().toLocaleDateString("id-ID") : (order.createdAt ? new Date(order.createdAt as string).toLocaleDateString("id-ID") : "-")}
                      </td>
                      <td className="p-4 text-sm font-medium">
                        <span className="truncate max-w-[150px] inline-block">{order.userId || order.buyerUid || "-"}</span>
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        {formatPrice(order.totalAmount)}
                      </td>
                      <td className="p-4">
                        {getPaymentBadge(order.paymentStatus || order.status)}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-medium text-xs rounded-lg transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3 h-3" /> Detail
                        </button>
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

      {/* VALIDATION MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/30">
              <h2 className="font-bold text-lg">Validasi Pembayaran</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-secondary rounded-full">
                <XCircle className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
              {/* Left Column: Order details */}
              <div className="flex-1 space-y-5">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Detail Pesanan</p>
                  <p className="text-sm font-mono mt-1">{selectedOrder.id}</p>
                </div>
                
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Barang Dibeli ({selectedOrder.items.length})</p>
                  {selectedOrder?.items?.map((item: OrderItem, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 bg-secondary/20 p-2 rounded-lg border border-border/50">
                      <img src={getValidImageUrl(item as any)} alt={item.name} className="w-10 h-10 rounded object-cover border border-border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity}x @ {formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-secondary/40 p-4 rounded-xl border border-border">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Metode Pembayaran</span>
                    <span className="text-sm font-bold uppercase">{selectedOrder.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold">Total Tagihan</span>
                    <span className="text-lg font-bold text-primary">{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Proof Image */}
              <div className="flex-1 space-y-4 border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-6">
                <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">Bukti Transfer</p>
                
                {selectedOrder.receiptUrl ? (
                  <div 
                    className="w-full aspect-[3/4] bg-secondary/50 rounded-xl border border-border overflow-hidden relative group cursor-pointer"
                    onClick={() => setZoomedImage(selectedOrder.receiptUrl!)}
                  >
                    <img 
                      src={selectedOrder.receiptUrl} 
                      alt="Bukti Transfer" 
                      className="w-full h-full object-contain bg-black/5" 
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium gap-2">
                      <Eye className="w-5 h-5" /> Perbesar Gambar
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-[3/4] bg-secondary/50 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center p-6">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Pembeli belum mengunggah bukti pembayaran.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-border bg-secondary/30">
              {selectedOrder.paymentStatus === "payment_uploaded" || selectedOrder.paymentStatus === "pending_verification" ? (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleValidatePayment("paid")}
                      disabled={isProcessing}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Terima Pembayaran
                    </button>
                    
                    <button 
                      onClick={() => setRejectionReason(prev => prev ? "" : " ")}
                      disabled={isProcessing}
                      className="flex-1 py-3 bg-red-100 text-red-700 hover:bg-red-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" /> Tolak
                    </button>
                  </div>
                  
                  {rejectionReason !== "" && (
                    <div className="animate-in slide-in-from-top-2 space-y-2">
                      <input 
                        type="text" 
                        placeholder="Alasan Penolakan (Misal: Gambar buram, Nominal kurang)" 
                        value={rejectionReason.trim()}
                        onChange={e => setRejectionReason(e.target.value)}
                        className="w-full px-4 py-3 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                      <button 
                        onClick={() => handleValidatePayment("failed")}
                        disabled={isProcessing}
                        className="w-full py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Konfirmasi Penolakan
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    Status saat ini: {getPaymentBadge(selectedOrder.paymentStatus || selectedOrder.status)}
                  </p>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="px-6 py-2 bg-secondary border border-border text-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX ZOOM MODAL */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute -top-12 right-0 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <XCircle className="w-8 h-8" />
            </button>
            <img src={zoomedImage} alt="Zoomed Proof" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
