import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/frontend/contexts/AuthContext";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import { db, storage, dbFirestore } from "@/backend/config/firebase";
import { ref as dbRef, onValue, remove, update } from "firebase/database";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { toast } from "sonner";
import { RTDBProduct } from "@/frontend/components/layout/ProductCard";
import { OrderData } from "@/backend/types";
import { formatPrice, getValidImageUrl } from "@/lib/utils";
import { Pencil, Trash2, Plus, Store, X, Save, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs";

export default function SellerDashboard() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<RTDBProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<RTDBProduct | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Orders State
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [resiModalOpen, setResiModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (role !== "Penjual") {
      toast.error("Akses Ditolak", {
        description: "Halaman ini hanya untuk Penjual.",
      });
      navigate("/");
      return;
    }

    const productsRef = dbRef(db, "products");
    const unsubscribe = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loadedProducts: RTDBProduct[] = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
          }))
          .filter((product) => product.sellerUid === currentUser.uid);

        // Sort by newest
        loadedProducts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setProducts(loadedProducts);
      } else {
        setProducts([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, role, navigate]);

  useEffect(() => {
    if (!currentUser || role !== "Penjual") return;
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const q = query(
          collection(dbFirestore, "orders"),
          where("sellerUids", "array-contains", currentUser.uid)
        );
        const snap = await getDocs(q);
        const fetchedOrders: OrderData[] = [];
        snap.forEach(doc => {
          fetchedOrders.push({ id: doc.id, ...doc.data() } as OrderData);
        });
        
        fetchedOrders.sort((a, b) => {
          const timeA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : (a.createdAt as number || 0);
          const timeB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : (b.createdAt as number || 0);
          return timeB - timeA;
        });
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching incoming orders", error);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [currentUser, role]);

  const handleDelete = async (product: RTDBProduct) => {
    // 1. Validasi Awal: Pastikan objek user login aktif sudah siap
    if (!currentUser) {
      toast.error("Sesi Anda telah berakhir. Silakan login kembali.");
      return;
    }

    // 2. Validasi Kepemilikan: Pastikan UID penjual di produk COCOK dengan UID akun yang login
    if (!product.sellerUid || product.sellerUid !== currentUser.uid) {
      toast.error(
        "Akses Ditolak: Anda tidak diizinkan menghapus produk toko lain!",
      );
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus ${product.name}?`)) return;

    try {
      // Langkah 1: Hapus data dari Realtime Database (RTDB) terlebih dahulu
      await remove(dbRef(db, `products/${product.id}`));

      // Langkah 2: Hapus seluruh aset gambar produk dari Firebase Storage
      if (product.images && product.images.length > 0) {
        const deletePromises = product.images.map(async (imageUrl) => {
          try {
            const decodedUrl = decodeURIComponent(imageUrl);
            const pathStart = decodedUrl.indexOf("/o/") + 3;
            const pathEnd = decodedUrl.indexOf("?alt=media");
            if (pathStart > 2 && pathEnd > pathStart) {
              const filePath = decodedUrl.substring(pathStart, pathEnd);
              const fileRef = storageRef(storage, filePath);
              await deleteObject(fileRef);
            }
          } catch (e) {
            console.error("Gagal menghapus file gambar di Storage:", e);
          }
        });
        await Promise.all(deletePromises);
      }

      toast.success("Produk berhasil dihapus");

      // Langkah 3: Perbarui state lokal agar produk langsung hilang dari daftar tanpa reload browser
      setProducts((prevProducts) =>
        prevProducts.filter((p) => p.id !== product.id),
      );
    } catch (error) {
      console.error("Firebase Delete Error:", error);
      toast.error("Gagal menghapus produk dari server");
    }
  };

  const openEditModal = (product: RTDBProduct) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditDescription(product.description);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    try {
      const productRef = dbRef(db, `products/${editingProduct.id}`);
      await update(productRef, {
        name: editName,
        price: Number(editPrice),
        description: editDescription,
      });

      toast.success("Produk berhasil diperbarui");
      setEditingProduct(null);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memperbarui produk");
    }
  };

  const handleOpenResiModal = (order: OrderData) => {
    setSelectedOrder(order);
    const existingTracking = order.trackingNumbers && order.trackingNumbers[currentUser!.uid];
    setTrackingNumberInput(existingTracking || "");
    setResiModalOpen(true);
  };

  const handleSaveResi = async () => {
    if (!selectedOrder || !currentUser) return;
    try {
      const orderRef = doc(dbFirestore, "orders", selectedOrder.id!);
      const currentTrackingNumbers = selectedOrder.trackingNumbers || {};
      const updatedTrackingNumbers = {
        ...currentTrackingNumbers,
        [currentUser.uid]: trackingNumberInput
      };
      
      await updateDoc(orderRef, {
        trackingNumbers: updatedTrackingNumbers,
        // Jika penjual ini telah menginput resi, admin bisa melihatnya dan statusnya bisa dibiarkan atau diupdate.
        // Di sini kita biarkan statusnya apa adanya (Admin yang mengatur).
      });
      
      setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, trackingNumbers: updatedTrackingNumbers } : o));
      toast.success("Nomor Resi berhasil disimpan!");
      setResiModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan nomor resi.");
    }
  };

  if (!currentUser || role !== "Penjual") return null;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-6xl mx-auto py-10 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Store className="w-8 h-8 text-primary" />
              Dashboard Penjual
            </h1>
            <p className="text-muted-foreground mt-1">
              Kelola produk yang Anda jual di Salin Gaya.
            </p>
          </div>
          <Link
            to="/seller/upload"
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Unggah Produk Baru
          </Link>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <div className="overflow-x-auto pb-2 mb-4">
            <TabsList className="w-max min-w-full sm:min-w-0 bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="products" className="text-xs sm:text-sm px-4 sm:px-6 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Produk Saya</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs sm:text-sm px-4 sm:px-6 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all flex items-center gap-2">
                Pesanan Masuk
                {orders.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{orders.length}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Produk</th>
                  <th className="p-4 font-medium">Harga</th>
                  <th className="p-4 font-medium">Status AI</th>
                  <th className="p-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Memuat data produk...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center">
                        <Store className="w-12 h-12 mb-3 opacity-20" />
                        <p>Anda belum mengunggah produk apa pun.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products?.map((product) => (
                    <tr
                      key={product?.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getValidImageUrl(product)}
                            alt={product?.name}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 rounded object-cover border border-border"
                          />
                          <div>
                            <p className="font-medium text-foreground line-clamp-1">
                              {product?.name}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                              {product?.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        {formatPrice(product?.price || 0)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            product?.aiEligibilityScore === "LAYAK"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {product?.aiEligibilityScore === "LAYAK"
                            ? "Terverifikasi"
                            : "Ditolak"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Edit Produk"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="orders">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border text-sm text-muted-foreground">
                      <th className="p-4 font-medium">Order ID & Pembeli</th>
                      <th className="p-4 font-medium">Barang yang Harus Dikirim</th>
                      <th className="p-4 font-medium">Status / Resi</th>
                      <th className="p-4 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingOrders ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">Memuat pesanan...</td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          <div className="flex flex-col items-center">
                            <Package className="w-12 h-12 mb-3 opacity-20" />
                            <p>Belum ada pesanan yang masuk.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => {
                        // Filter items that belong to this seller
                        const sellerItems = (order.items || []).filter(item => item.sellerUid === currentUser.uid);
                        const trackingNumber = order.trackingNumbers && order.trackingNumbers[currentUser.uid];
                        
                        return (
                        <tr key={order.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="p-4">
                            <p className="font-mono text-xs text-muted-foreground mb-1">ID: {order.id}</p>
                            <p className="font-medium text-foreground">{(order.shippingAddress as any)?.street || "Alamat tidak tersedia"}</p>
                            <p className="text-xs text-muted-foreground">{order.shippingCity}, {order.shippingProvince}</p>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-2">
                              {sellerItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded bg-secondary shrink-0 overflow-hidden">
                                    {(item as any).image || ((item as any).images && ((item as any).images as string[])[0]) ? (
                                      <img src={((item as any).image as string) || (((item as any).images as string[])[0])} alt={item.name} className="w-full h-full object-cover" />
                                    ) : null}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.quantity} x {formatPrice(item.price)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            {trackingNumber ? (
                              <div>
                                <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">Resi Tersimpan</span>
                                <p className="text-xs font-mono mt-1">{trackingNumber}</p>
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">Belum Input Resi</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleOpenResiModal(order)}
                              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded hover:opacity-90 transition-opacity"
                            >
                              {trackingNumber ? "Edit Resi" : "Input Resi"}
                            </button>
                          </td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        </TabsContent>
        </Tabs>
      </main>
      <Footer />

      {/* EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground">Edit Produk</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 hover:bg-secondary rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Nama Barang
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Harga (Rp)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Deskripsi
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none"
                />
              </div>
              <div className="bg-secondary/50 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                  Foto produk tidak dapat diedit untuk menjaga validitas Quality
                  Control AI.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-border bg-secondary/20 flex justify-end gap-2">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INPUT RESI MODAL */}
      {resiModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground">Input Nomor Resi</h3>
              <button
                onClick={() => setResiModalOpen(false)}
                className="p-1 hover:bg-secondary rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Masukkan nomor resi pengiriman untuk pesanan <span className="font-mono text-foreground">{selectedOrder?.id}</span>.
              </p>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Nomor Resi
                </label>
                <input
                  type="text"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  placeholder="Contoh: JNT123456789"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border bg-secondary/20 flex justify-end gap-2">
              <button
                onClick={() => setResiModalOpen(false)}
                className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveResi}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> Simpan Resi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
