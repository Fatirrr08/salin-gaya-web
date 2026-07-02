import React from "react";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-border">
          <h1 className="text-3xl font-bold text-[#5C3A21] mb-6">Syarat dan Ketentuan Layanan</h1>
          <div className="prose prose-stone max-w-none">
            <p className="text-muted-foreground mb-6">Terakhir diperbarui: 16 Juni 2026</p>
            
            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">1. Pendahuluan</h2>
            <p>Selamat datang di Salin Gaya. Dengan mengakses dan menggunakan platform kami, Anda menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Harap baca dengan saksama sebelum menggunakan layanan kami.</p>

            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">2. Akun Pengguna</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Anda bertanggung jawab menjaga kerahasiaan kata sandi dan kode OTP (Autentikasi 2 Langkah).</li>
              <li>Salin Gaya tidak pernah meminta kata sandi atau kode OTP Anda.</li>
              <li>Satu pengguna hanya diperbolehkan memiliki satu akun aktif untuk menghindari penyalahgunaan sistem.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">3. Aturan Berjualan (Bagi Penjual)</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Dilarang menjual barang ilegal, obat-obatan terlarang, barang tiruan/KW, senjata, atau barang yang melanggar hak cipta pihak lain.</li>
              <li>Penjual wajib mengirimkan barang sesuai dengan tenggat waktu yang ditentukan. Pesanan akan dibatalkan otomatis jika batas waktu pengiriman terlewati.</li>
              <li>Salin Gaya berhak memblokir akun penjual yang terindikasi melakukan penipuan.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">4. Transaksi & Pembayaran</h2>
            <p>Semua pembayaran wajib dilakukan melalui metode pembayaran resmi yang disediakan oleh Salin Gaya. Kami tidak bertanggung jawab atas kerugian yang timbul akibat transaksi di luar platform.</p>

            <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">5. Penyelesaian Sengketa</h2>
            <p>Apabila terjadi kendala pesanan (barang rusak, tidak sesuai deskripsi, atau tidak sampai), pengguna wajib melaporkannya maksimal 2x24 jam sejak status barang dinyatakan diterima. Sertakan video unboxing tanpa jeda sebagai bukti.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
