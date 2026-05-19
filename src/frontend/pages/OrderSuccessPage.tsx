import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";

export default function OrderSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card max-w-md w-full rounded-3xl shadow-xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">
            Pembayaran Berhasil!
          </h1>
          <p className="text-muted-foreground mb-8">
            Terima kasih telah berbelanja di Salin Gaya. Pesanan Anda telah kami
            terima dan akan segera diproses oleh penjual.
          </p>
          <div className="w-full space-y-3">
            <button
              onClick={() => navigate("/orders")}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl text-lg hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Lihat Status Pesanan
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 bg-transparent text-muted-foreground font-medium rounded-xl hover:bg-secondary transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
