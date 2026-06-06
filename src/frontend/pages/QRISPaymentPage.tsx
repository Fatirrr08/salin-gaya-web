import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { db } from "@/backend/config/firebase";
import { ref as dbRef, push, set, serverTimestamp } from "firebase/database";
import { toast } from "sonner";
import { useCart } from "@/frontend/contexts/CartContext";

export default function QRISPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const orderData = location.state?.orderData;
  const grandTotal = location.state?.grandTotal;

  useEffect(() => {
    if (!orderData) {
      toast.error("Data pesanan tidak ditemukan.");
      navigate("/checkout");
      return;
    }
  }, [orderData, navigate]);

  const handlePreConfirm = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!orderData) return;

    setIsProcessing(true);
    try {
      const ordersRef = dbRef(db, "orders");
      const newOrderRef = push(ordersRef);

      const finalOrderData = {
        ...orderData,

        createdAt: serverTimestamp(),
      };

      await set(newOrderRef, finalOrderData);
      clearCart();

      setShowConfirmModal(false);
      setIsSuccess(true);

      // Delay redirect for animation
      setTimeout(() => {
        navigate("/order-success");
      }, 1500);
    } catch (error: unknown) {
      toast.error("Gagal memproses pesanan", { description: (error as Error).message });
      setIsProcessing(false);
    }
  };

  if (!orderData) return null;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="bg-primary p-6 text-center text-primary-foreground">
          <h1 className="text-2xl font-bold font-display tracking-tight">
            Salin Gaya Pay
          </h1>
          <p className="text-sm opacity-80 mt-1">Selesaikan pembayaran Anda</p>
        </div>

        <div className="p-8 flex flex-col items-center">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-1">Total Tagihan</p>
            <p className="text-4xl font-bold text-primary">
              {formatPrice(grandTotal)}
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs text-muted-foreground mt-2 bg-secondary/50 px-3 py-1.5 rounded-full inline-block"
            >
              Mohon masukkan nominal transfer tepat hingga 3 digit terakhir
              untuk mempercepat verifikasi otomatis.
            </motion.p>
          </div>

          <div className="w-full max-w-xs mx-auto mb-8 bg-white rounded-2xl shadow-xl border border-border/50 overflow-hidden flex flex-col items-center p-6 relative">
            {/* Dekorasi Pojok */}
            <div className="absolute top-0 left-0 w-16 h-16 bg-[#5C3A21]/5 rounded-br-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 bg-[#5C3A21]/5 rounded-tl-[100px] pointer-events-none"></div>

            {/* Logo QRIS */}
            <div className="w-full flex justify-center mb-4 z-10">
              <img
                src="/images/QRIS LOGO.png"
                alt="QRIS Logo"
                className="h-10 object-contain drop-shadow-sm"
              />
            </div>
            
            {/* QR Code Container */}
            <div className="w-full aspect-square bg-white border-2 border-dashed border-stone-200 rounded-xl flex items-center justify-center p-2 mb-4 z-10 relative group">
              <img
                src="/images/Qris.jpeg"
                alt="QRIS Code Salin Gaya"
                className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
              />
              {/* Efek scanline pada QR */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[#A67B5B]/40 blur-[2px] animate-[scan_2s_ease-in-out_infinite] z-20 rounded-full"></div>
            </div>

            <p className="text-xs font-bold text-center text-[#5C3A21] z-10">
              Dicetak untuk Salin Gaya
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full bg-secondary/30 p-4 rounded-xl border border-border/50 mb-4"
          >
            <h4 className="font-bold text-sm mb-2 text-foreground">
              Cara Pembayaran:
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1.5 ml-4 list-decimal">
              <li>Buka aplikasi bank/e-wallet Anda.</li>
              <li>Scan kode QR di atas.</li>
              <li>
                Masukkan nominal{" "}
                <strong className="text-primary">
                  {formatPrice(grandTotal)}
                </strong>
                .
              </li>
              <li>Konfirmasi pembayaran.</li>
            </ol>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-orange-600 font-medium text-center mb-6 bg-orange-50 px-3 py-2 rounded-lg border border-orange-100"
          >
            Kode QR ini berlaku selama 15 menit. Mohon selesaikan pembayaran
            sebelum waktu habis.
          </motion.p>

          <div className="w-full space-y-3">
            <button
              onClick={handlePreConfirm}
              disabled={isProcessing}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              Saya Sudah Bayar
            </button>
            <button
              onClick={() => navigate(-1)}
              disabled={isProcessing}
              className="w-full py-3 bg-transparent text-muted-foreground font-medium rounded-xl hover:bg-secondary transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-3 text-foreground">
              Konfirmasi Pembayaran
            </h3>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Apakah Anda yakin sudah mentransfer nominal{" "}
              <strong className="text-primary">
                {formatPrice(grandTotal)}
              </strong>{" "}
              ke QRIS Fatir Gibran? Tindakan ini akan mencatat transaksi Anda ke
              dalam sistem.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleConfirmPayment}
                disabled={isProcessing}
                className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? "Menyimpan Data..." : "Ya, Sudah Bayar"}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessing}
                className="w-full py-3.5 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/80 transition-colors"
              >
                Cek Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-2xl font-bold font-display">Berhasil!</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
