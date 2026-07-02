import React from "react";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-border">
          <h1 className="text-3xl font-bold text-[#5C3A21] mb-6">Kebijakan Privasi</h1>
          <div className="prose prose-stone max-w-none">
            <p className="text-muted-foreground mb-6">Terakhir diperbarui: 16 Juni 2026</p>
            
            <p>Salin Gaya berkomitmen penuh untuk melindungi privasi dan data pribadi pengguna kami. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda.</p>

            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">1. Data yang Kami Kumpulkan</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Informasi Profil:</strong> Nama lengkap, alamat email, dan nomor telepon.</li>
              <li><strong>Informasi Transaksi:</strong> Riwayat belanja, alamat pengiriman, dan detail rekening bank untuk proses pengembalian dana (refund).</li>
              <li><strong>Aktivitas Komunikasi:</strong> Pesan yang dikirim melalui fitur Inbox platform untuk tujuan keamanan dan pengawasan dari penipuan.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">2. Penggunaan Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Memproses pesanan dan memfasilitasi pengiriman barang.</li>
              <li>Mengirimkan kode OTP WhatsApp dan Email untuk lapisan keamanan (2FA).</li>
              <li>Mencegah, mendeteksi, dan menindaklanjuti aktivitas mencurigakan atau penipuan.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">3. Berbagi Data dengan Pihak Ketiga</h2>
            <p>Kami <strong>tidak akan</strong> menjual data Anda kepada pihak ketiga. Namun, informasi pengiriman (nama, nomor telepon, dan alamat) akan dibagikan kepada kurir mitra kami murni untuk tujuan pengiriman pesanan Anda.</p>

            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">4. Hak Anda</h2>
            <p>Anda memiliki hak untuk meminta penghapusan akun serta seluruh data yang terkait dari sistem kami. Permintaan penghapusan dapat diajukan dengan menghubungi Admin melalui fitur Inbox.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
