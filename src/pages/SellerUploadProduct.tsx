import React, { useState } from "react";
import { db, storage } from "@/lib/firebase";
import { ref as dbRef, push, set, serverTimestamp } from "firebase/database";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { UploadCloud, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

export default function SellerUploadProduct() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  
  // Image state
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  // Loading & AI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysisText, setAiAnalysisText] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...newFiles]);
      
      const newPreviewUrls = newFiles.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
    setPreviewUrls((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const simulateAIAssessment = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Simulasi proses AI (3 detik)
      setTimeout(() => {
        // Mocking: Jika harga di atas 10.000.000, anggap gambar tidak valid (contoh kasus reject)
        // Atau kita gunakan random logic 80% success
        const isApproved = Math.random() > 0.2;
        resolve(isApproved);
      }, 3000);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !price || !description || images.length === 0) {
      toast.error("Harap lengkapi semua data dan unggah minimal 1 gambar.");
      return;
    }

    if (!currentUser) {
      toast.error("Sesi Anda telah berakhir, silakan login kembali.");
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    setAiAnalysisText("AI sedang menganalisis gambar produk Anda...");

    try {
      // 1. Simulasi panggilan API ke Backend yang mem-trigger AI Quality Control
      const isApproved = await simulateAIAssessment();

      if (!isApproved) {
        // AI Rejection Flow
        toast.error("Produk Ditolak oleh AI", {
          description: "Gambar produk terdeteksi BURAM atau TIDAK LAYAK. Silakan unggah foto yang lebih jelas.",
          duration: 5000,
        });
        setIsSubmitting(false);
        return;
      }

      setAiAnalysisText("Gambar valid! Sedang mengunggah ke sistem...");
      
      // 2. Upload images to Firebase Storage
      const uploadPromises = images.map(async (file) => {
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
      });

      const uploadedImageUrls = await Promise.all(uploadPromises);

      setAiAnalysisText("Menyimpan data produk...");

      // 3. Save document to RTDB
      const productsRef = dbRef(db, "products");
      const newProductRef = push(productsRef);
      await set(newProductRef, {
        sellerUid: currentUser.uid,
        name,
        price: Number(price),
        description,
        images: uploadedImageUrls,
        aiEligibilityScore: "LAYAK",
        createdAt: serverTimestamp(),
      });

      // 4. Success Flow
      toast.success("Produk Berhasil Diunggah", {
        description: "Produk Anda telah lolos Quality Control dan siap dijual.",
      });
      
      // Redirect ke halaman depan (atau dashboard penjual)
      navigate("/");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Gagal mengunggah produk.", {
        description: error.message || "Terjadi kesalahan saat menghubungi server.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      
      <main className="flex-1 container max-w-3xl mx-auto py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Unggah Produk Baru</h1>
          <p className="text-muted-foreground mt-2">
            Isi detail barang Anda. Semua gambar akan melewati proses Quality Control otomatis oleh AI.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Informasi Produk</CardTitle>
              <CardDescription>Masukkan nama, harga, dan deskripsi barang jualan Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="name">Nama Barang</Label>
                <Input 
                  id="name" 
                  placeholder="Contoh: Kemeja Flanel Vintage Pria" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Harga (Rp)</Label>
                <Input 
                  id="price" 
                  type="number"
                  placeholder="Contoh: 150000" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea 
                  id="description" 
                  placeholder="Jelaskan kondisi barang, minus (jika ada), dan ukurannya secara detail..." 
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Upload Gambar */}
              <div className="space-y-4">
                <Label>Foto Produk (All of Image)</Label>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-border group">
                      <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Upload Button Box */}
                  <label 
                    className={`aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                      isSubmitting ? "opacity-50 cursor-not-allowed border-border bg-muted" : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <ImagePlus className="w-6 h-6 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground font-medium">Tambah Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={handleImageChange}
                      disabled={isSubmitting}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Format yang didukung: JPG, PNG, JPEG. Foto yang diunggah akan otomatis dianalisis kualitasnya.
                </p>
              </div>

            </CardContent>
            
            <CardFooter className="flex flex-col items-stretch pt-6 border-t border-border">
              {isSubmitting && (
                <div className="flex items-center justify-center p-4 mb-4 bg-primary/10 rounded-md text-primary w-full animate-pulse">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span className="font-medium text-sm">{aiAnalysisText}</span>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <UploadCloud className="w-5 h-5 mr-2" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5 mr-2" />
                    Unggah & Cek Kualitas
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </main>

      <Footer />
    </div>
  );
}
