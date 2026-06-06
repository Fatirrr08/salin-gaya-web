import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/frontend/contexts/AuthContext";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import { dbFirestore, storage } from "@/backend/config/firebase";
import { collection, getDocs, orderBy, query, updateDoc, doc, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { Loader2, Plus, ShieldAlert, Eye, Package, Image as ImageIcon, MessageSquare, Wallet, DollarSign, Activity } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { OrderData, RTDBProduct } from "@/backend/types";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/frontend/components/ui/dialog";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select";

export default function AdminDashboard() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();

  // Guard effect
  useEffect(() => {
    if (currentUser) {
      // Check admin privileges (using role or specific email for local demo)
      const isAdmin = role === "Admin" || role === "admin" || currentUser.email === "admin@salingaya.com";
      if (!isAdmin) {
        toast.error("Akses Ditolak", { description: "Anda tidak memiliki izin admin." });
        navigate("/");
      }
    }
  }, [currentUser?.uid, role, navigate]);

  // States for Orders
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // States for Products
  const [products, setProducts] = useState<RTDBProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isUploadingProduct, setIsUploadingProduct] = useState(false);
  
  // States for Active Carts
  // Using Record to represent dynamic cart items.
  const [carts, setCarts] = useState<any[]>([]);
  const [loadingCarts, setLoadingCarts] = useState(true);

  // Product Form State
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const q = query(collection(dbFirestore, "orders"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const fetchedOrders: OrderData[] = [];
        snapshot.forEach(doc => {
          fetchedOrders.push({ id: doc.id, ...doc.data() } as OrderData);
        });
        setOrders(fetchedOrders);
      } catch (err: unknown) {
        if ((err as Error)?.message?.includes("index") || String(err).includes("failed-precondition")) {
            // Fallback if index missing
            try {
                const snapshot = await getDocs(collection(dbFirestore, "orders"));
                const fetchedOrders: OrderData[] = [];
                snapshot.forEach(doc => {
                  fetchedOrders.push({ id: doc.id, ...doc.data() } as OrderData);
                });
                fetchedOrders.sort((a, b) => {
                    const timeA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : (a.createdAt as number || 0);
                    const timeB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : (b.createdAt as number || 0);
                    return timeB - timeA;
                });
                setOrders(fetchedOrders);
            } catch(e) { console.error(e); }
        } else {
            console.error(err);
        }
      } finally {
        setLoadingOrders(false);
      }
    };

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const snapshot = await getDocs(collection(dbFirestore, "products"));
        const fetchedProducts: RTDBProduct[] = [];
        snapshot.forEach(doc => {
          fetchedProducts.push({ id: doc.id, ...doc.data() } as RTDBProduct);
        });
        setProducts(fetchedProducts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProducts(false);
      }
    };

    if (currentUser && (role === "Admin" || currentUser.email === "admin@salingaya.com")) {
      fetchOrders();
      fetchProducts();
    }
  }, [currentUser?.uid, currentUser?.email, role]);

  // Fetch Active Carts (Real-time)
  useEffect(() => {
    if (currentUser && (role === "Admin" || currentUser.email === "admin@salingaya.com")) {
      const unsubscribe = onSnapshot(collection(dbFirestore, "carts"), (snapshot) => {
        const fetchedCarts: any[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            fetchedCarts.push({ id: doc.id, ...data });
          }
        });
        
        // Sort by updatedAt descending
        fetchedCarts.sort((a, b) => {
          const timeA = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : (a.updatedAt || 0);
          const timeB = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : (b.updatedAt || 0);
          return timeB - timeA;
        });
        
        setCarts(fetchedCarts);
        setLoadingCarts(false);
      });
      return () => unsubscribe();
    }
  }, [currentUser?.uid, currentUser?.email, role]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(dbFirestore, "orders", orderId), { orderStatus: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as string } : o));
      toast.success("Status pesanan berhasil diperbarui");
    } catch (err: unknown) {
      toast.error("Gagal memperbarui status", { description: (err as Error).message });
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productPrice || !productCategory || !productDesc || !productImageFile) {
      toast.error("Harap isi semua kolom dan pilih gambar");
      return;
    }
    setIsUploadingProduct(true);
    try {
      const fileExt = productImageFile.name.split('.').pop();
      const fileName = `product_${Date.now()}.${fileExt}`;
      const imageRef = storageRef(storage, `product_images/${fileName}`);
      
      const uploadTask = await uploadBytesResumable(imageRef, productImageFile);
      const downloadUrl = await getDownloadURL(uploadTask.ref);
      
      const newProduct = {
        name: productName,
        price: Number(productPrice),
        category: productCategory,
        description: productDesc,
        image: downloadUrl,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(dbFirestore, "products"), newProduct);
      
      setProducts([{ id: docRef.id, ...newProduct, createdAt: new Date() }, ...products]);
      toast.success("Produk berhasil ditambahkan");
      
      setIsAddProductModalOpen(false);
      setProductName("");
      setProductPrice("");
      setProductCategory("");
      setProductDesc("");
      setProductImageFile(null);
    } catch (err: unknown) {
      toast.error("Gagal menambah produk", { description: (err as Error).message });
    } finally {
      setIsUploadingProduct(false);
    }
  };


  const openReceipt = (url: string) => {
    setSelectedReceipt(url);
    setIsReceiptModalOpen(true);
  };

  if (!currentUser || (role !== "Admin" && role !== "admin" && currentUser.email !== "admin@salingaya.com")) {
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

      <main className="flex-1 container max-w-7xl mx-auto py-6 px-4 sm:py-10">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Panel Admin</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Kelola operasional, keuangan, dan produk Salin Gaya.</p>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Pendapatan Platform</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {formatPrice(orders.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'completed').reduce((acc, curr) => acc + (curr.platformFee || 0), 0))}
              </h3>
              <p className="text-xs text-primary mt-1 flex items-center gap-1 font-medium">
                <Activity className="w-3 h-3" /> Akumulasi Biaya Layanan
              </p>
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Omzet Penjualan (Kotor)</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {formatPrice(orders.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'completed').reduce((acc, curr) => acc + (curr.totalAmount || 0), 0))}
              </h3>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Transaksi</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{orders.length}</h3>
              <p className="text-xs text-muted-foreground mt-1">Pesanan terdaftar di sistem</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          {/* TabsList scrollable on mobile */}
          <div className="overflow-x-auto pb-1 mb-6 sm:mb-8">
            <TabsList className="w-max min-w-full sm:min-w-0 bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="orders" className="text-xs sm:text-sm px-4 sm:px-6 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Semua Pesanan</TabsTrigger>
              <TabsTrigger value="validation" className="text-xs sm:text-sm px-4 sm:px-6 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Validasi Pembayaran</TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm px-4 sm:px-6 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Produk</TabsTrigger>
              <TabsTrigger value="carts" className="text-xs sm:text-sm px-4 sm:px-6 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Keranjang Aktif</TabsTrigger>
              <TabsTrigger value="chat" className="text-xs sm:text-sm px-4 sm:px-6 py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Live Chat</TabsTrigger>
            </TabsList>
          </div>
          
          {/* ORDERS TAB */}
          <TabsContent value="orders">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-border">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Daftar Pesanan</h2>
              </div>
              
              {loadingOrders ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center p-12">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Belum ada pesanan masuk.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Email Pembeli</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status Pembayaran</TableHead>
                        <TableHead>Bukti</TableHead>
                        <TableHead>Aksi (Status Pesanan)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.id}</TableCell>
                          <TableCell>{order.email || order.userId || "-"}</TableCell>
                          <TableCell className="font-medium">{formatPrice(order.totalAmount)}</TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                order.paymentStatus === 'payment_uploaded' ? 'bg-blue-100 text-blue-800' :
                                order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                              {order.paymentStatus || "pending"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {order.paymentStatus === "payment_uploaded" && order.receiptUrl ? (
                              <Button variant="outline" size="sm" onClick={() => openReceipt(order.receiptUrl)}>
                                <Eye className="w-4 h-4 mr-2" /> Lihat Struk
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={order.orderStatus || "pending"} 
                              onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Ubah Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Menunggu</SelectItem>
                                <SelectItem value="processing">Sedang Diproses</SelectItem>
                                <SelectItem value="shipped">Dikirim</SelectItem>
                                <SelectItem value="completed">Selesai</SelectItem>
                                <SelectItem value="cancelled">Dibatalkan</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* PAYMENT VALIDATION TAB */}
          <TabsContent value="validation">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-border">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Validasi & Rincian Pembayaran</h2>
                <p className="text-sm text-muted-foreground mt-1">Pantau pembagian dana (Hak Penjual, Hak Logistik, dan Pemasukan Admin).</p>
              </div>
              
              {loadingOrders ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center p-12">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Belum ada pesanan masuk.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30">
                        <TableHead>Order ID</TableHead>
                        <TableHead>Total Uang Masuk</TableHead>
                        <TableHead>Hak Penjual (Barang)</TableHead>
                        <TableHead>Hak Logistik (Ongkir)</TableHead>
                        <TableHead className="text-primary font-bold">Pemasukan Admin</TableHead>
                        <TableHead>Status Pembayaran</TableHead>
                        <TableHead>Aksi Validasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.id}</TableCell>
                          <TableCell className="font-bold text-foreground">{formatPrice(order.totalAmount)}</TableCell>
                          <TableCell className="text-muted-foreground">{formatPrice(order.subtotal || 0)}</TableCell>
                          <TableCell className="text-muted-foreground">{formatPrice(order.shippingCost || 0)}</TableCell>
                          <TableCell className="text-primary font-bold bg-primary/5">
                            {formatPrice(order.platformFee || 0)}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                order.paymentStatus === 'payment_uploaded' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 border border-green-200' :
                                'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            }`}>
                              {order.paymentStatus || "pending"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={order.paymentStatus || "unpaid"} 
                              onValueChange={async (val) => {
                                try {
                                  await updateDoc(doc(dbFirestore, "orders", order.id), { paymentStatus: val });
                                  setOrders(orders.map(o => o.id === order.id ? { ...o, paymentStatus: val } : o));
                                  toast.success("Status pembayaran berhasil diperbarui!");
                                } catch (e) {
                                  toast.error("Gagal memperbarui status");
                                }
                              }}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder="Status Dana" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                                <SelectItem value="payment_uploaded">Menunggu Validasi</SelectItem>
                                <SelectItem value="paid">Lunas / Valid</SelectItem>
                                <SelectItem value="refunded">Dikembalikan</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* PRODUCTS TAB */}
          <TabsContent value="products">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Daftar Produk</h2>
                <Button onClick={() => setIsAddProductModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Tambah Produk
                </Button>
              </div>
              
              {loadingProducts ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center p-12">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Belum ada produk terdaftar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Foto</TableHead>
                        <TableHead>Nama Produk</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Harga</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map(product => (
                        <TableRow key={product?.id}>
                          <TableCell>
                            <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary">
                              {product?.image ? (
                                <img src={product.image} alt={product?.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 m-auto text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{product?.name}</TableCell>
                          <TableCell>{product?.category}</TableCell>
                          <TableCell>{formatPrice(product?.price || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ACTIVE CARTS TAB */}
          <TabsContent value="carts">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-border">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Pemantauan Keranjang Aktif</h2>
                <p className="text-sm text-muted-foreground mt-1">Pantau pengguna yang sedang menahan barang di keranjang belanja mereka secara real-time.</p>
              </div>
              
              {loadingCarts ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : carts.length === 0 ? (
                <div className="text-center p-12">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Tidak ada keranjang aktif saat ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User / Email</TableHead>
                        <TableHead>Jumlah Barang (Jenis)</TableHead>
                        <TableHead>Total Kuantitas</TableHead>
                        <TableHead>Estimasi Nilai</TableHead>
                        <TableHead>Terakhir Diperbarui</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carts.map(cart => {
                        const totalQty = cart.items.reduce((sum: number, item: any) => sum + ((item.quantity as number) || 1), 0);
                        const estValue = cart.items.reduce((sum: number, item: any) => sum + (((item.price as number) || 0) * ((item.quantity as number) || 1)), 0);
                        return (
                          <TableRow key={cart.id}>
                            <TableCell className="font-medium">
                              {cart.email || cart.userId || cart.id}
                            </TableCell>
                            <TableCell>{cart.items.length} jenis</TableCell>
                            <TableCell>{totalQty} buah</TableCell>
                            <TableCell className="font-bold text-primary">{formatPrice(estValue)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {cart.updatedAt?.toDate ? cart.updatedAt.toDate().toLocaleString('id-ID') : "Baru saja"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* LIVE CHAT TAB */}
          <TabsContent value="chat">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col items-center justify-center h-[400px] text-center p-8">
              <div className="w-20 h-20 bg-[#A67B5B]/10 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-[#A67B5B]" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Inbox C2C Marketplace</h2>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Sistem chat kini menggunakan arsitektur P2P C2C. Semua percakapan terpusat di halaman Inbox.
              </p>
              <Button onClick={() => navigate('/inbox')} className="bg-[#A67B5B] hover:bg-[#8C674C] text-white px-8">
                Buka Inbox
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Receipt Image Modal */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Bukti Transfer</DialogTitle>
          </DialogHeader>
          <div className="p-2 flex justify-center">
            {selectedReceipt && (
              <img src={selectedReceipt} alt="Bukti Transfer" className="max-w-full max-h-[70vh] rounded-lg object-contain" />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsReceiptModalOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          {/* Add Product Modal */}
      <Dialog open={isAddProductModalOpen} onOpenChange={setIsAddProductModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Produk Baru</DialogTitle>
            <DialogDescription>Masukkan detail produk di bawah ini.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Produk</label>
              <Input 
                value={productName} 
                onChange={(e) => setProductName(e.target.value)} 
                placeholder="Contoh: Sepatu Nike Air Max" 
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Harga (Rp)</label>
                <Input 
                  type="number" 
                  value={productPrice} 
                  onChange={(e) => setProductPrice(e.target.value)} 
                  placeholder="Contoh: 1500000" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategori</label>
                <Input 
                  value={productCategory} 
                  onChange={(e) => setProductCategory(e.target.value)} 
                  placeholder="Contoh: Sepatu Pria" 
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi Lengkap</label>
              <Textarea 
                value={productDesc} 
                onChange={(e) => setProductDesc(e.target.value)} 
                placeholder="Deskripsikan fitur dan kondisi produk..." 
                rows={4}
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gambar Produk</label>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setProductImageFile(e.target.files ? e.target.files[0] : null)} 
                required 
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddProductModalOpen(false)} disabled={isUploadingProduct}>
                Batal
              </Button>
              <Button type="submit" disabled={isUploadingProduct}>
                {isUploadingProduct && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isUploadingProduct ? "Menyimpan..." : "Simpan Produk"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
