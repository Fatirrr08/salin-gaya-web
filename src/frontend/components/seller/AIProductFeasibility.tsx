import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  Scan,
  Tag,
  TrendingUp,
  CheckCircle,
  Sparkles,
  X,
  Image as ImageIcon,
} from "lucide-react";

export default function AIProductFeasibility() {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "completed">(
    "idle",
  );
  const [loadingText, setLoadingText] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setPreview(URL.createObjectURL(dropped));
    }
  };

  const startAnalysis = () => {
    setStatus("analyzing");
    setLoadingText("Menganalisis serat kain...");

    setTimeout(() => {
      setLoadingText("Mencocokkan merek dengan database tren...");
    }, 1000);

    setTimeout(() => {
      setLoadingText("Menghitung estimasi harga pasar...");
    }, 2000);

    setTimeout(() => {
      setStatus("completed");
    }, 3000);
  };

  const reset = () => {
    setPreview(null);
    setStatus("idle");
  };

  return (
    <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">
          AI Kelayakan Barang
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {!preview ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer relative"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-sm mb-4 border border-border">
                  <UploadCloud className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  Unggah Foto Barang
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Drag & drop foto atau klik untuk memilih file dari perangkat
                  Anda
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-xl p-4 bg-background">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-secondary mb-4 border border-border">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={reset}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={startAnalysis}
                  className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Scan className="w-5 h-5" />
                  Analisis dengan AI
                </button>
              </div>
            )}
          </motion.div>
        )}

        {status === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-primary">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-foreground mb-2">
              AI Sedang Bekerja
            </h3>
            <p className="text-sm text-muted-foreground animate-pulse">
              {loadingText}
            </p>
          </motion.div>
        )}

        {status === "completed" && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-900/10 border border-green-200 dark:border-green-900/50 rounded-xl p-6 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                  Skor Kelayakan Jual
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-green-600 dark:text-green-500">
                    85%
                  </span>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400 mb-1.5">
                    / Sangat Layak
                  </span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-500 border border-green-200 dark:border-green-800 shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-background border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2 text-foreground">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">Kondisi Fisik</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Warna memudar 10% di kerah, tidak ada robekan.
                </p>
              </div>

              <div className="bg-background border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2 text-foreground">
                  <Tag className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">
                    Merek &amp; Kategori
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Terdeteksi: Levi's Denim Vintage.
                </p>
              </div>

              <div className="bg-background border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2 text-foreground">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">Tren Pasar</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Permintaan Tinggi: Gaya Y2K sedang naik daun.
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="font-semibold text-sm">Rekomendasi Harga</h4>
                </div>
                <p className="text-lg font-bold text-foreground">
                  Rp 150.000 - Rp 220.000
                </p>
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full py-2.5 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Analisis Barang Lain
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
