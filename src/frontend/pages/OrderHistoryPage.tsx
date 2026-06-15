import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/frontend/contexts/AuthContext";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import { dbFirestore, storage } from "@/backend/config/firebase";
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { Loader2, Package, UploadCloud, Clock, CheckCircle2, AlertCircle, FileImage, Truck, Search } from "lucide-react";
import { formatPrice } from "@/lib/utils";

import { Card, CardContent } from "@/frontend/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/frontend/components/ui/dialog";
import { Button } from "@/frontend/components/ui/button";

import { OrderData } from "@/backend/types";

export default function OrderHistoryPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refund State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundDescription, setRefundDescription] = useState("");
  const [refundVideoFile, setRefundVideoFile] = useState<File | null>(null);
  const [refundImages, setRefundImages] = useState<File[]>([]);
  const [refundTermsAccepted, setRefundTermsAccepted] = useState(false);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const refundFileInputRef = useRef<HTMLInputElement>(null);
  const refundVideoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      try {
        const q = query(
          collection(dbFirestore, "orders"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const fetchedOrders: OrderData[] = [];
        querySnapshot.forEach((doc) => {
          fetchedOrders.push({ id: doc.id, ...doc.data() } as OrderData);
        });
        setOrders(fetchedOrders);
      } catch (error: unknown) {
        if ((error as Error)?.message?.includes("index") || String(error).includes("failed-precondition")) {
          // Fallback if composite index is missing in Firestore
          try {
            const fallbackQ = query(collection(dbFirestore, "orders"), where("userId", "==", currentUser.uid));
            const snap = await getDocs(fallbackQ);
            const fetchedOrders: OrderData[] = [];
            snap.forEach((doc) => {
              fetchedOrders.push({ id: doc.id, ...doc.data() } as OrderData);
            });
            fetchedOrders.sort((a, b) => {
              const timeA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : (a.createdAt || 0);
              const timeB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : (b.createdAt || 0);
              return timeB - timeA;
            });
            setOrders(fetchedOrders);
          } catch(e) {
            console.error(e);
          }
        } else {
            console.error("Error fetching orders: ", error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "image/jpeg" || file.type === "image/png") {
        setUploadFile(file);
      } else {
        toast.error("Format file tidak didukung. Harap gunakan JPG atau PNG.");
      }
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile || !selectedOrder) return;
    
    setIsUploading(true);
    try {
      const fileExtension = uploadFile.name.split('.').pop();
      const fileName = `receipt_${Date.now()}.${fileExtension}`;
      const fileRef = storageRef(storage, `payment_receipts/${selectedOrder.id}/${fileName}`);
      
      const uploadTask = await uploadBytesResumable(fileRef, uploadFile);
      const downloadUrl = await getDownloadURL(uploadTask.ref);
      
      const orderRef = doc(dbFirestore, "orders", selectedOrder.id);
      await updateDoc(orderRef, {
        paymentStatus: "payment_uploaded",
        receiptUrl: downloadUrl
      });
      
      setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, paymentStatus: "payment_uploaded", receiptUrl: downloadUrl } : o));
      
      toast.success("Bukti transfer berhasil diunggah");
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setSelectedOrder(null);
    } catch (error: unknown) {
      toast.error("Gagal mengunggah bukti transfer", { description: (error as Error).message });
    } finally {
      setIsUploading(false);
    }
  };

  const openUploadModal = (order: OrderData) => {
    setSelectedOrder(order);
    setUploadFile(null);
    setIsUploadModalOpen(true);
  };

  const handleRefundImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (refundImages.length + files.length > 3) {
        toast.error("Maksimal 3 foto yang diizinkan.");
        return;
      }
      setRefundImages(prev => [...prev, ...files]);
    }
  };

  const removeRefundImage = (index: number) => {
    setRefundImages(prev => prev.filter((_, i) => i !== index));
  };

  const openRefundModal = (order: OrderData) => {
    setSelectedOrder(order);
    setRefundReason("");
    setRefundDescription("");
    setRefundVideoFile(null);
    setRefundImages([]);
    setRefundTermsAccepted(false);
    setIsRefundModalOpen(true);
  };

  const handleRefundSubmit = async () => {
    if (!selectedOrder) return;
    if (!refundReason) return toast.error("Pilih alasan pengembalian dana.");
    if (refundDescription.length < 50) return toast.error("Deskripsi harus minimal 50 karakter.");
    if (!refundVideoFile) return toast.error("Video unboxing wajib diunggah.");
    if (refundImages.length === 0) return toast.error("Unggah minimal 1 foto bukti.");
    if (!refundTermsAccepted) return toast.error("Anda harus menyetujui syarat & ketentuan.");

    // Limit video size to 50MB (50 * 1024 * 1024 bytes)
    if (refundVideoFile && refundVideoFile.size > 50 * 1024 * 1024) {
      return toast.error("Ukuran video terlalu besar. Maksimal 50 MB.");
    }

    setIsSubmittingRefund(true);
    try {
      // Upload Video
      const videoExt = refundVideoFile.name.split('.').pop();
      const videoName = `refund_vid_${selectedOrder.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${videoExt}`;
      const videoRef = storageRef(storage, `refunds/${selectedOrder.id}/${videoName}`);
      const uploadVideoTask = await uploadBytesResumable(videoRef, refundVideoFile);
      const uploadedVideoUrl = await getDownloadURL(uploadVideoTask.ref);
      const imageUrls: string[] = [];
      for (const file of refundImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `refund_${selectedOrder.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const fileRef = storageRef(storage, `refunds/${selectedOrder.id}/${fileName}`);
        const uploadTask = await uploadBytesResumable(fileRef, file);
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        imageUrls.push(downloadUrl);
      }

      const orderRef = doc(dbFirestore, "orders", selectedOrder.id);
      const refundData = {
        reason: refundReason,
        description: refundDescription,
        evidenceImages: imageUrls,
        videoUrl: uploadedVideoUrl,
        requestedAt: new Date().toISOString(),
        adminDecision: "pending",
      };

      await updateDoc(orderRef, {
        orderStatus: "refund_requested",
        refundData: refundData,
      });

      setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, orderStatus: "refund_requested", refundData: refundData as any } : o));

      toast.success("Pengajuan pengembalian dana berhasil dikirim.");
      setIsRefundModalOpen(false);
    } catch (error: any) {
      toast.error("Gagal mengirim pengajuan", { description: error.message });
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return "-";
    const date = (timestamp as any).toDate ? (timestamp as any).toDate() : new Date(timestamp as string);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_verification":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1.5 w-fit"><Clock className="w-3.5 h-3.5" /> Menunggu Pembayaran</span>;
      case "payment_uploaded":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex items-center gap-1.5 w-fit"><UploadCloud className="w-3.5 h-3.5" /> Menunggu Validasi</span>;
      case "paid":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1.5 w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> Lunas</span>;
      case "refund_requested":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 flex items-center gap-1.5 w-fit"><AlertCircle className="w-3.5 h-3.5" /> Pengajuan Refund</span>;
      case "return_shipped":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex items-center gap-1.5 w-fit"><Truck className="w-3.5 h-3.5" /> Retur Dikirim</span>;
      case "refund_completed":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1.5 w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> Refund Selesai</span>;
      case "refund_rejected":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1.5 w-fit"><AlertCircle className="w-3.5 h-3.5" /> Refund Ditolak</span>;
      case "failed":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1.5 w-fit"><AlertCircle className="w-3.5 h-3.5" /> Dibatalkan</span>;
      default: 
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 flex items-center gap-1.5 w-fit">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-4xl mx-auto py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">
            Pesanan Saya
          </h1>
          <p className="text-muted-foreground mt-2">
            Lacak riwayat transaksi dan kelola pembayaran Anda.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center shadow-sm">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              Belum ada pesanan
            </h3>
            <p className="text-muted-foreground mb-6">
              Anda belum melakukan transaksi belanja apapun.
            </p>
            <Button onClick={() => navigate("/")}>Mulai Belanja</Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="border-b border-border bg-secondary/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-sm text-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                      {getStatusBadge(order.orderStatus || order.paymentStatus || "pending")}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ID Pesanan:{" "}
                      <span className="font-mono text-foreground font-medium">
                        {order.id}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {order.paymentStatus === "pending_verification" && (
                      <Button
                        onClick={() => openUploadModal(order)}
                        className="gap-2"
                      >
                        <UploadCloud className="w-4 h-4" />
                        Upload Bukti Transfer
                      </Button>
                    )}
                    {(order.orderStatus === "shipped" || order.orderStatus === "delivered" || order.orderStatus === "processing" || order.orderStatus === "paid") && !order.refundData && (
                      <Button onClick={() => openRefundModal(order)} variant="destructive" className="gap-2">
                        <AlertCircle className="w-4 h-4" /> Ajukan Pengembalian
                      </Button>
                    )}
                    {order.orderStatus === "refund_requested" && (
                      <Button disabled variant="outline" className="gap-2 text-orange-600 border-orange-200 bg-orange-50/50">
                        <Clock className="w-4 h-4" /> Refund Diproses Admin
                      </Button>
                    )}
                  </div>
                </div>

                <CardContent className="p-6">
                  {order.items &&
                    order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4 mb-4 last:mb-0">
                        <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                          {item.image || (item.images && item.images[0]) ? (
                            <img
                              src={item.image || item.images[0]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-secondary">
                              <Package className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground text-sm sm:text-base line-clamp-2">
                            {item.name}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.quantity} barang x {formatPrice(item.price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground text-sm sm:text-base">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}

                  {order.trackingNumbers &&
                    Object.keys(order.trackingNumbers).length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                        <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-2">
                          <Truck className="w-4 h-4" /> Informasi Pengiriman
                        </h5>
                        <div className="space-y-2">
                          {Object.entries(order.trackingNumbers).map(
                            ([sellerUid, resi]) => {
                              const sellerItems = (order.items || []).filter(
                                (item: any) => item.sellerUid === sellerUid,
                              );
                              const itemNames = sellerItems
                                .map((item: any) => item.name)
                                .join(", ");
                              return (
                                <div
                                  key={sellerUid}
                                  className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-sm bg-white dark:bg-black p-2 rounded border border-border"
                                >
                                  <div className="flex-1">
                                    <span className="text-muted-foreground text-xs block mb-0.5">
                                      Barang:
                                    </span>
                                    <span
                                      className="font-medium text-foreground line-clamp-1"
                                      title={itemNames}
                                    >
                                      {itemNames || "Produk"}
                                    </span>
                                  </div>
                                  <div className="sm:text-right shrink-0">
                                    <span className="text-muted-foreground text-xs block mb-0.5">
                                      Nomor Resi:
                                    </span>
                                    <span className="font-mono font-bold text-primary">
                                      {resi as string}
                                    </span>
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}

                  <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                    <p className="text-sm text-muted-foreground font-medium">
                      Total Belanja
                    </p>
                    <p className="text-xl font-bold text-primary">
                      {formatPrice(order.totalAmount)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Upload Bukti Transfer Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Bukti Transfer</DialogTitle>
            <DialogDescription>
              Silakan unggah foto/screenshot bukti transfer untuk pesanan{" "}
              <span className="font-mono font-medium text-foreground">
                {selectedOrder?.id}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center w-full">
              <div
                onClick={() => document.getElementById("file-upload-input")?.click()}
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-border border-dashed rounded-xl cursor-pointer bg-secondary/30 hover:bg-secondary transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploadFile ? (
                    <>
                      <FileImage className="w-10 h-10 text-primary mb-3" />
                      <p className="mb-2 text-sm text-foreground font-medium line-clamp-1 px-4 text-center">
                        {uploadFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Klik untuk mengubah file
                      </p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="mb-2 text-sm text-foreground text-center px-4">
                        <span className="font-semibold">Klik untuk unggah</span>{" "}
                        atau seret file
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Hanya menerima JPG atau PNG (Maks 5MB)
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUploadModalOpen(false)}
              disabled={isUploading}
            >
              Batal
            </Button>
            <Button
              onClick={handleUploadSubmit}
              disabled={!uploadFile || isUploading}
              className="min-w-[120px]"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isUploading ? "Mengunggah..." : "Unggah Bukti"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Pengajuan Pengembalian Barang/Dana</DialogTitle>
            <DialogDescription>
              Mohon isi formulir ini dengan sejujur-jujurnya. Bukti yang tidak lengkap atau terindikasi penipuan akan langsung ditolak oleh Arbitrase Admin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Alasan Pengembalian <span className="text-red-500">*</span></label>
              <select 
                value={refundReason} 
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 text-sm bg-background"
              >
                <option value="">Pilih alasan yang valid...</option>
                <option value="Barang Rusak/Cacat Fatal">Barang Rusak/Cacat Fatal (Diluar deskripsi produk)</option>
                <option value="Barang Tidak Sesuai Deskripsi">Barang Tidak Sesuai Deskripsi (Warna/Ukuran/Model)</option>
                <option value="Barang Palsu/Tiruan">Barang Palsu/Tiruan (Tidak lolos QC)</option>
                <option value="Salah Kirim Barang">Salah Kirim Barang (Tertukar)</option>
              </select>
              <p className="text-xs text-red-500 italic">"Berubah pikiran" atau "Tidak muat karena salah ukuran sendiri" tidak diterima.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Deskripsi Kronologi & Kendala <span className="text-red-500">*</span></label>
              <textarea 
                rows={4}
                value={refundDescription}
                onChange={(e) => setRefundDescription(e.target.value)}
                placeholder="Jelaskan secara detail apa yang salah dengan barang yang diterima... (Min. 50 karakter)"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 text-sm bg-background"
              />
              <p className="text-xs text-muted-foreground">{refundDescription.length}/50 karakter minimum</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Video Unboxing <span className="text-red-500">*</span></label>
              <label 
                className="w-full flex items-center justify-between px-3 py-3 border rounded-lg cursor-pointer hover:bg-secondary transition-colors"
              >
                <span className={`text-sm ${refundVideoFile ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {refundVideoFile ? refundVideoFile.name : "Pilih file video..."}
                </span>
                <UploadCloud className="w-5 h-5 text-muted-foreground" />
                <input 
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setRefundVideoFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground">Unggah video bukti unboxing. Video harus tanpa cut/edit mulai dari paket tertutup.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Foto Bukti (Maks. 3) <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {refundImages.map((file, idx) => (
                  <div key={idx} className="relative w-20 h-20 border border-border rounded-lg overflow-hidden group">
                    <img src={URL.createObjectURL(file)} alt={`Bukti ${idx}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeRefundImage(idx)}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                {refundImages.length < 3 && (
                  <label 
                    className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-semibold">Upload</span>
                    <input 
                      type="file" 
                      onChange={handleRefundImagesChange} 
                      accept="image/png, image/jpeg, image/jpg" 
                      multiple 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-3 bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
              <p className="text-sm font-bold text-red-800 dark:text-red-300">Syarat & Ketentuan Pengajuan:</p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={refundTermsAccepted}
                  onChange={(e) => setRefundTermsAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-xs text-red-900 dark:text-red-200 leading-snug">
                  Saya menyatakan dengan sadar bahwa video unboxing yang saya berikan adalah asli, belum diedit/dipotong, dan murni kesalahan dari Penjual. Apabila Admin menyetujui klaim saya, saya bersedia dan wajib mengirim balik retur barang dalam kurun 3x24 jam sebelum uang saya dikembalikan.
                </span>
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRefundModalOpen(false)} disabled={isSubmittingRefund}>Batal</Button>
            <Button variant="destructive" onClick={handleRefundSubmit} disabled={isSubmittingRefund}>
              {isSubmittingRefund ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isSubmittingRefund ? "Memproses..." : "Kirim Pengajuan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
