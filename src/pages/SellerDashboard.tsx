import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db, storage } from "@/lib/firebase";
import { ref as dbRef, onValue, remove, update } from "firebase/database";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { toast } from "sonner";
import { RTDBProduct, formatPrice } from "@/components/ProductCard";
import { Pencil, Trash2, Plus, Store, X, Save } from "lucide-react";

export default function SellerDashboard() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<RTDBProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<RTDBProduct | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (role !== "Penjual") {
      toast.error("Akses Ditolak", { description: "Halaman ini hanya untuk Penjual." });
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

  const handleDelete = async (product: RTDBProduct) => {
    if (!window.confirm(`Yakin ingin menghapus ${product.name}?`)) return;

    try {
      // 1. Delete from RTDB
      await remove(dbRef(db, `products/${product.id}`));

      // 2. Delete images from Storage
      if (product.images && product.images.length > 0) {
        const deletePromises = product.images.map(async (imageUrl) => {
          try {
            // Ekstrak path dari URL Firebase Storage. Ini pendekatan sederhana,
            // untuk lebih robust bisa menyimpan path asli di database.
            const decodedUrl = decodeURIComponent(imageUrl);
            const pathStart = decodedUrl.indexOf('/o/') + 3;
            const pathEnd = decodedUrl.indexOf('?alt=media');
            if (pathStart > 2 && pathEnd > pathStart) {
              const filePath = decodedUrl.substring(pathStart, pathEnd);
              const fileRef = storageRef(storage, filePath);
              await deleteObject(fileRef);
            }
          } catch (e) {
            console.error("Gagal menghapus gambar di storage", e);
          }
        });
        await Promise.all(deletePromises);
      }

      toast.success("Produk dihapus");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Gagal menghapus produk");
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
      console.error("Update error:", error);
      toast.error("Gagal memperbarui produk");
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
            <p className="text-muted-foreground mt-1">Kelola produk yang Anda jual di Salin Gaya.</p>
          </div>
          <Link 
            to="/seller/upload"
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Unggah Produk Baru
          </Link>
        </div>

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
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      Memuat data produk...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <Store className="w-12 h-12 mb-3 opacity-20" />
                        <p>Anda belum mengunggah produk apa pun.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={product.images?.[0] || "https://via.placeholder.com/50"} 
                            alt={product.name} 
                            className="w-12 h-12 rounded object-cover border border-border"
                          />
                          <div>
                            <p className="font-medium text-foreground line-clamp-1">{product.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{product.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        {formatPrice(product.price)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          product.aiEligibilityScore === "LAYAK" 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {product.aiEligibilityScore === "LAYAK" ? "Terverifikasi" : "Ditolak"}
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

      </main>
      <Footer />

      {/* EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground">Edit Produk</h3>
              <button onClick={() => setEditingProduct(null)} className="p-1 hover:bg-secondary rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nama Barang</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Harga (Rp)</label>
                <input 
                  type="number" 
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Deskripsi</label>
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
                  Foto produk tidak dapat diedit untuk menjaga validitas Quality Control AI.
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
    </div>
  );
}
