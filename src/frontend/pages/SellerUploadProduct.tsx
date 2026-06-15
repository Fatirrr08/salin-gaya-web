import React, { useState, useRef, useCallback } from "react";
import { db, storage } from "@/backend/config/firebase";
import { ref as dbRef, push, set, serverTimestamp, get } from "firebase/database";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  Loader2,
  ImagePlus,
  X,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Download,
} from "lucide-react";

import { Input } from "@/frontend/components/ui/input";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Label } from "@/frontend/components/ui/label";
import { toast } from "sonner";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AIResult {
  grade: "A" | "B" | "C" | "DITOLAK";
  scores: { label: string; value: number }[];
  summary: string;
  approved: boolean;
  suggestedName?: string;
  suggestedDescription?: string;
  style?: string;
}

// ─── Shimmer Skeleton ─────────────────────────────────────────────────────────
function ShimmerCard() {
  return (
    <div className="rounded-2xl border border-[#E8DDD0] bg-white p-6 space-y-4 overflow-hidden">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-[#E8DDD0] animate-pulse" />
        <div className="h-4 w-40 rounded bg-[#E8DDD0] animate-pulse" />
      </div>
      {[80, 60, 90, 70].map((w, i) => (
        <div key={i} className="space-y-1">
          <div
            className="h-3 rounded bg-[#E8DDD0] animate-pulse"
            style={{ width: `${w}%` }}
          />
          <div className="h-2.5 rounded-full bg-[#F3EDE4] animate-pulse w-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Certificate Generator ────────────────────────────────────────────────────
async function generateCertificate(
  productName: string,
  grade: string,
  imageUrl: string,
  scores: { label: string; value: number }[],
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#F9F6F0";
    ctx.fillRect(0, 0, 800, 500);

    // Left accent bar
    const grad = ctx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, "#A67B5B");
    grad.addColorStop(1, "#D4A373");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 8, 500);

    // Header
    ctx.fillStyle = "#5C3D2E";
    ctx.font = "bold 28px serif";
    ctx.fillText("Kartu Kelayakan Salin Gaya", 40, 55);
    ctx.fillStyle = "#A67B5B";
    ctx.font = "13px sans-serif";
    ctx.fillText("Dokumen kualitas resmi diverifikasi oleh AI", 40, 80);

    // Grade badge
    const gradeColor =
      grade === "A" ? "#2E7D32" : grade === "B" ? "#F57C00" : "#C62828";
    ctx.fillStyle = gradeColor;
    ctx.beginPath();
    ctx.roundRect(620, 30, 140, 70, 12);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px serif";
    ctx.textAlign = "center";
    ctx.fillText(`Grade ${grade}`, 690, 73);
    ctx.textAlign = "left";

    // Divider
    ctx.strokeStyle = "#E8DDD0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 100);
    ctx.lineTo(760, 100);
    ctx.stroke();

    // Product image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(40, 120, 180, 180, 12);
      ctx.clip();
      ctx.drawImage(img, 40, 120, 180, 180);
      ctx.restore();

      // Product name
      ctx.fillStyle = "#3D2B1F";
      ctx.font = "bold 20px serif";
      ctx.fillText(
        productName.length > 30 ? productName.slice(0, 30) + "…" : productName,
        240,
        150,
      );

      // Date
      ctx.fillStyle = "#9E7B5E";
      ctx.font = "13px sans-serif";
      ctx.fillText(
        `Tanggal Cek: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
        240,
        175,
      );

      // Scores
      scores.forEach((s, i) => {
        const y = 210 + i * 45;
        ctx.fillStyle = "#5C3D2E";
        ctx.font = "13px sans-serif";
        ctx.fillText(s.label, 240, y);
        ctx.fillStyle = "#E8DDD0";
        ctx.beginPath();
        ctx.roundRect(240, y + 8, 480, 14, 7);
        ctx.fill();
        ctx.fillStyle = gradeColor;
        ctx.beginPath();
        ctx.roundRect(240, y + 8, 480 * (s.value / 100), 14, 7);
        ctx.fill();
        ctx.fillStyle = "#5C3D2E";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(`${s.value}%`, 730, y + 20);
      });

      // Footer
      ctx.fillStyle = "#C8B9A8";
      ctx.font = "11px sans-serif";
      ctx.fillText(
        "© Salin Gaya AI Assessment System — Dokumen ini digenerate otomatis dan tidak dapat dipalsukan.",
        40,
        475,
      );

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      // draw without image
      ctx.fillStyle = "#E8DDD0";
      ctx.beginPath();
      ctx.roundRect(40, 120, 180, 180, 12);
      ctx.fill();
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = imageUrl;
  });
}

// ─── Gemini AI Assessor ───────────────────────────────────────────────────────
async function callGeminiVision(
  imagesData: { base64: string; mimeType: string }[],
): Promise<AIResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Kunci API Gemini (VITE_GEMINI_API_KEY) tidak ditemukan atau kosong!",
    );
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `Kamu adalah sistem AI Quality Control & Asisten Copywriter untuk platform thrifting premium "Salin Gaya".
Analisis foto-foto pakaian/barang fashion berikut dan berikan penilaian dalam format JSON murni.

ATURAN WAJIB (STRICT RULES) UNTUK PENOLAKAN:
1. HARUS FOTO ASLI: Jika gambar terdeteksi sebagai gambar dummy, ilustrasi, gambar kartun, 3D render, ATAU gambar hasil unduhan internet/katalog resmi merek (bukan jepretan kamera langsung dari penjual), BERIKAN grade "DITOLAK".
2. BUKAN FASHION: Jika gambar menunjukkan benda yang bukan pakaian/fashion (contoh: makanan, elektronik, pemandangan), BERIKAN grade "DITOLAK".
3. KONDISI HANCUR: Jika barang memiliki kerusakan fatal (robek parah, noda ekstrim menjijikkan), BERIKAN grade "DITOLAK".

{
  "grade": "A" | "B" | "C" | "DITOLAK",
  "scores": [
    {"label": "Kebersihan", "value": <0-100>},
    {"label": "Keutuhan Warna", "value": <0-100>},
    {"label": "Tekstur & Kondisi Kain", "value": <0-100>},
    {"label": "Kelayakan Asli (Bukan Palsu/Dummy)", "value": <0-100>}
  ],
  "summary": "<ringkasan singkat alasan penolakan atau penerimaan maksimal 100 karakter. Jika ditolak karena gambar dummy, tulis: 'Harap gunakan foto jepretan asli barang fisik yang Anda miliki.'>",
  "approved": <true jika grade A atau B, false jika C atau DITOLAK>,
  "suggestedName": "<Saran nama produk yang menarik untuk dijual, max 6 kata>",
  "suggestedDescription": "<Saran deskripsi produk ala copywriter yang menarik pembeli thrift, sebutkan warnanya, modelnya, dll>",
  "style": "<Gaya pakaian, misal: Vintage, Y2K, Streetwear, Casual, dll>"
}
Kriteria grade normal (jika lolos aturan wajib): A=semua skor ≥80, B=rata-rata ≥65, C=rata-rata ≥45.`;

  const inlineDataParts = imagesData.map((img) => ({
    inline_data: { mime_type: img.mimeType, data: img.base64 },
  }));

  const body = {
    generationConfig: {
      response_mime_type: "application/json",
    },
    contents: [
      {
        parts: [{ text: prompt }, ...inlineDataParts],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Gemini API error:", res.status, errorText);
    throw new Error(`Gemini API error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  return JSON.parse(text) as AIResult;
}

// ─── Utilitas Kompresi Gambar (Canvas) ────────────────────────────────────────
async function compressImageToBase64(
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.5,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal menginisialisasi canvas context"));
          return;
        }

        // Gambar ulang ke canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Kompres ke JPEG untuk mengurangi payload data secara signifikan
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        // const base64 = dataUrl.split(",")[1];
        // resolve({ base64, mimeType: "image/jpeg" });
        const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        resolve({ base64, mimeType: "image/jpeg" });
      };
      img.onerror = () =>
        reject(new Error("Gagal meload gambar untuk kompresi."));
    };
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SellerUploadProduct() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const dropRef = useRef<HTMLDivElement>(null);

  // Address validation check
  const [hasValidAddress, setHasValidAddress] = useState<boolean | null>(null);

  React.useEffect(() => {
    if (!currentUser) return;
    const fetchAddress = async () => {
      try {
        const snap = await get(dbRef(db, `users/${currentUser.uid}/address`));
        if (snap.exists() && snap.val().street && snap.val().city) {
          setHasValidAddress(true);
        } else {
          setHasValidAddress(false);
          toast.error("Alamat belum lengkap", {
            description: "Mohon lengkapi alamat lengkap dan titik lokasi peta Anda di Profil sebelum mulai berjualan."
          });
          navigate("/profile");
        }
      } catch (err) {
        console.error("Failed to check address", err);
      }
    };
    fetchAddress();
  }, [currentUser, navigate]);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("fashion");
  const [description, setDescription] = useState("");

  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Image helpers ──
  const addFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    setImages((prev) => [...prev, ...newFiles]);
    setPreviewUrls((prev) => [
      ...prev,
      ...newFiles.map((f) => URL.createObjectURL(f)),
    ]);
    setAiResult(null);
    setCertificateUrl(null);
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev?.filter((_, idx) => idx !== i));
    setPreviewUrls((prev) => prev?.filter((_, idx) => idx !== i));
    setAiResult(null);
    setCertificateUrl(null);
  };

  // ── Drag & Drop ──
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, []);

  // ── AI Assessment ──
  const handleAICheck = async () => {
    if (images.length === 0) {
      toast.error("Unggah minimal 1 foto terlebih dahulu.");
      return;
    }
    setIsAnalyzing(true);
    setAiResult(null);
    setCertificateUrl(null);

    try {
      // // Periksa ukuran semua gambar
      // for (const img of images) {
      //   if (img.size > 10 * 1024 * 1024) {
      //     toast.error(`Ukuran file ${img.name} maksimal 10 MB!`);
      //     setIsAnalyzing(false);
      //     return;
      //   }
      // }

      // Kompres semua gambar secara otomatis sebelum dikirim ke AI
      const compressedImages = await Promise.all(
        images.map(async (img) => {
          const { base64, mimeType } = await compressImageToBase64(
            img,
            500,
            500,
            0.4,
          );
          const cleanBase64 = base64.includes(",")
            ? base64.split(",")[1]
            : base64;
          return { base64: cleanBase64, mimeType };
        }),
      );

      const result = await callGeminiVision(compressedImages);
      setAiResult(result);

      // Asisten Auto-fill: Isi Judul & Deskripsi jika masih kosong
      let appliedName = name;
      if (result.suggestedName && !name) {
        setName(result.suggestedName);
        appliedName = result.suggestedName;
      }
      if (result.suggestedDescription && !description) {
        setDescription(
          result.suggestedDescription +
            (result.style ? `\n\nStyle: ${result.style}` : ""),
        );
      }

      if (result.approved) {
        const certUrl = await generateCertificate(
          appliedName || "Produk",
          result.grade,
          previewUrls[0],
          result.scores,
        );
        setCertificateUrl(certUrl);
        toast.success(`Grade ${result.grade} — Barang layak dijual!`, {
          description:
            result.suggestedName && !name
              ? "AI telah otomatis mengisi Judul & Deskripsi untuk Anda!"
              : "",
        });
      } else {
        toast.error(`Grade ${result.grade} — ${result.summary}`);
      }
    } catch (err: unknown) {
      let errorMsg = "Gagal menganalisis gambar.";
      if ((err as Error).message) {
        if (err.message.includes("VITE_GEMINI_API_KEY")) {
          errorMsg =
            "Kunci API tidak valid atau belum diatur (VITE_GEMINI_API_KEY kosong).";
        } else if (err.message.includes("Gemini API error")) {
          // Parse out part of the error message to display
          const match = err.message.match(/Gemini API error \d+: (.*)/);
          const detail = match ? match[1].substring(0, 100) : err.message;
          errorMsg = `Server AI menolak permintaan: ${detail}...`;
        } else if (err instanceof SyntaxError) {
          errorMsg = "Format JSON dari AI gagal diproses. Silakan coba lagi.";
        } else {
          errorMsg = (err as Error).message;
        }
      }

      toast.error(errorMsg, {
        description: "Harap periksa log console untuk detailnya.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Silakan login terlebih dahulu.");
      return;
    }
    if (!name || !price || !description || images.length === 0) {
      toast.error("Harap lengkapi semua data dan unggah minimal 1 gambar.");
      return;
    }
    if (!aiResult) {
      toast.error("Jalankan pengecekan AI sebelum mengunggah produk.");
      return;
    }
    if (!aiResult.approved) {
      toast.error(
        "Produk tidak lulus QC AI. Perbaiki kondisi barang terlebih dahulu.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls: string[] = [];
      for (const img of images) {
        const storageRef = ref(
          storage,
          `products/${currentUser.uid}/${Date.now()}_${img.name}`,
        );
        await uploadBytes(storageRef, img);
        imageUrls.push(await getDownloadURL(storageRef));
      }

      const newProductRef = push(dbRef(db, "products"));
      await set(newProductRef, {
        name,
        price: Number(price),
        category,
        description,
        weight: Number(weight) || 1000,
        length: Number(length) || 30,
        width: Number(width) || 20,
        height: Number(height) || 10,
        images: imageUrls,
        aiEligibilityScore: "LAYAK",
        aiGrade: aiResult.grade,
        aiScores: aiResult.scores,
        aiSummary: aiResult.summary,
        certificateUrl: certificateUrl ?? "",
        sellerUid: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      toast.success("Produk berhasil diunggah dan siap dijual!");
      navigate("/seller/dashboard");
    } catch (err) {
      toast.error("Gagal mengunggah produk. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const gradeColor =
    aiResult?.grade === "A"
      ? "text-green-600 bg-green-50 border-green-200"
      : aiResult?.grade === "B"
        ? "text-orange-600 bg-orange-50 border-orange-200"
        : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F6F0]">
      <Navbar />

      <main className="flex-1 container max-w-5xl mx-auto py-12 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-display font-bold text-[#3D2B1F]">
            Jual Barangmu
          </h1>
          <p className="text-[#9E7B5E] mt-2">
            Unggah foto, jalankan pengecekan AI, lalu daftarkan produk ke pasar
            Salin Gaya.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left Column: Form ── */}
          <motion.form
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="lg:col-span-3 space-y-6"
          >
            {/* Info Card */}
            <div className="bg-white rounded-2xl border border-[#E8DDD0] shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-[#3D2B1F] text-lg">
                Informasi Produk
              </h2>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[#5C3D2E] font-medium">
                  Nama Barang
                </Label>
                <Input
                  id="name"
                  placeholder="Contoh: Kemeja Flannel Vintage"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-[#E8DDD0] focus:border-[#A67B5B] focus:ring-[#A67B5B]/20 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-[#5C3D2E] font-medium">
                    Harga (Rp)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="150000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="border-[#E8DDD0] focus:border-[#A67B5B] rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="category"
                    className="text-[#5C3D2E] font-medium"
                  >
                    Kategori
                  </Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8DDD0] rounded-xl text-sm bg-white focus:outline-none focus:border-[#A67B5B]"
                  >
                    <option value="fashion">Fashion</option>
                    <option value="accessories">Accessories</option>
                    <option value="shoes">Shoes</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-[#5C3D2E] font-medium">
                  Deskripsi
                </Label>
                <Textarea
                  id="desc"
                  placeholder="Kondisi barang, ukuran, minus jika ada..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-[#E8DDD0] focus:border-[#A67B5B] rounded-xl resize-none"
                />
              </div>
            </div>

            {/* Pengiriman Card */}
            <div className="bg-white rounded-2xl border border-[#E8DDD0] shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-[#3D2B1F] text-lg">
                Informasi Pengiriman (Paket)
              </h2>

              <div className="space-y-1.5">
                <Label htmlFor="weight" className="text-[#5C3D2E] font-medium">
                  Berat Aktual (Gram)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="Contoh: 500"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="border-[#E8DDD0] focus:border-[#A67B5B] focus:ring-[#A67B5B]/20 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="length"
                    className="text-[#5C3D2E] font-medium"
                  >
                    Panjang (cm)
                  </Label>
                  <Input
                    id="length"
                    type="number"
                    placeholder="30"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="border-[#E8DDD0] focus:border-[#A67B5B] rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="width" className="text-[#5C3D2E] font-medium">
                    Lebar (cm)
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    placeholder="20"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="border-[#E8DDD0] focus:border-[#A67B5B] rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="height"
                    className="text-[#5C3D2E] font-medium"
                  >
                    Tinggi (cm)
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="10"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="border-[#E8DDD0] focus:border-[#A67B5B] rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Upload Card */}
            <div className="bg-white rounded-2xl border border-[#E8DDD0] shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-[#3D2B1F] text-lg">Foto Produk</h2>

              {/* Drag & Drop Zone */}
              <div
                ref={dropRef}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isDragging
                    ? "border-[#A67B5B] bg-[#A67B5B]/5"
                    : "border-[#D4B89A] bg-[#FAF7F4]"
                }`}
              >
                <UploadCloud className="w-8 h-8 text-[#A67B5B] mx-auto mb-2" />
                <p className="text-sm text-[#9E7B5E] font-medium">
                  Drag & drop foto ke sini
                </p>
                <p className="text-xs text-[#C8B9A8] mt-1">
                  atau klik untuk memilih file
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
              </div>

              {/* Previews */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {previewUrls?.map((url, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-xl overflow-hidden border border-[#E8DDD0] group"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-[#D4B89A] rounded-xl cursor-pointer hover:border-[#A67B5B] transition-colors">
                    <ImagePlus className="w-5 h-5 text-[#A67B5B]" />
                    <span className="text-xs text-[#9E7B5E] mt-1">Tambah</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) =>
                        e.target.files && addFiles(e.target.files)
                      }
                    />
                  </label>
                </div>
              )}

              {/* AI Check Button */}
              <button
                type="button"
                onClick={handleAICheck}
                disabled={isAnalyzing || images.length === 0}
                className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all ${
                  images.length === 0
                    ? "bg-[#F3EDE4] text-[#C8B9A8] cursor-not-allowed"
                    : "bg-gradient-to-r from-[#A67B5B] to-[#D4A373] text-white hover:shadow-lg hover:shadow-[#A67B5B]/30"
                }`}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isAnalyzing ? "AI sedang menganalisis..." : "Cek Kelayakan AI"}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !aiResult?.approved}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                aiResult?.approved
                  ? "bg-[#5C3D2E] text-white hover:bg-[#3D2B1F] shadow-md hover:shadow-xl"
                  : "bg-[#E8DDD0] text-[#C8B9A8] cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Mengunggah...
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" /> Daftarkan Produk
                </>
              )}
            </button>
          </motion.form>

          {/* ── Right Column: AI Result ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Shimmer while analyzing */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ShimmerCard />
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Result */}
            <AnimatePresence>
              {aiResult && !isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl border border-[#E8DDD0] shadow-sm p-6 space-y-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#9E7B5E] uppercase tracking-wider mb-1">
                        Hasil Penilaian AI
                      </p>
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-lg ${gradeColor}`}
                      >
                        {aiResult.approved ? (
                          <ShieldCheck className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                        Grade {aiResult.grade}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${aiResult.approved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {aiResult.approved ? "LULUS QC" : "DITOLAK"}
                    </span>
                  </div>

                  <p className="text-sm text-[#5C3D2E] bg-[#FAF7F4] rounded-xl p-3 leading-relaxed italic">
                    "{aiResult.summary}"
                  </p>

                  <div className="space-y-3">
                    {aiResult.scores?.map((s) => (
                      <div key={s.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-[#5C3D2E]">
                            {s.label}
                          </span>
                          <span className="text-xs font-bold text-[#A67B5B]">
                            {s.value}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#F3EDE4] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${s.value}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${s.value >= 80 ? "bg-green-500" : s.value >= 65 ? "bg-orange-400" : "bg-red-400"}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Certificate */}
            <AnimatePresence>
              {certificateUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl border border-[#E8DDD0] shadow-sm p-6 space-y-3"
                >
                  <p className="text-sm font-bold text-[#3D2B1F]">
                    Kartu Kelayakan Digital
                  </p>
                  <img
                    src={certificateUrl}
                    alt="Kartu Kelayakan"
                    className="w-full rounded-xl border border-[#E8DDD0]"
                  />
                  <a
                    href={certificateUrl}
                    download={`sertifikat-${name || "produk"}.png`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#F3EDE4] text-[#A67B5B] font-semibold text-sm rounded-xl hover:bg-[#E8DDD0] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Kartu
                  </a>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Placeholder */}
            {!isAnalyzing && !aiResult && (
              <div className="bg-white rounded-2xl border border-dashed border-[#E8DDD0] p-8 text-center">
                <Sparkles className="w-10 h-10 text-[#D4B89A] mx-auto mb-3" />
                <p className="text-sm font-medium text-[#9E7B5E]">
                  Hasil analisis AI akan muncul di sini
                </p>
                <p className="text-xs text-[#C8B9A8] mt-1">
                  Unggah foto lalu klik "Cek Kelayakan AI"
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
