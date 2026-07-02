# 📘 Deskripsi Uji Perangkat Lunak (DUPL)
## Proyek: Salin Gaya (Premium Thrifting E-Commerce Platform)

---

## 1. Rencana Pengujian

### 1.1 Metodologi Pengujian
Dokumen Deskripsi Uji Perangkat Lunak (DUPL) ini menetapkan prosedur pengujian untuk sistem **Salin Gaya** dengan fokus utama pada pengujian fungsional (*Black Box Testing*) dan pengujian integrasi layanan pihak ketiga (*Integration Testing*).

### 1.2 Alat dan Lingkungan Pengujian
*   **Pengujian Otomatis (Unit & Komponen):** Menggunakan **Vitest** dan **React Testing Library** dengan konfigurasi browser virtual (*jsdom*).
*   **Pengujian Integrasi & Manual:** Dilakukan di lingkungan web lokal (`http://localhost:8080`) dengan bantuan emulator Firebase (Auth, Firestore, Realtime Database) dan server middleware pembayaran Midtrans lokal di port `5000`.

---

## 2. Kasus Uji (Test Cases)

### 2.1 Modul Registrasi & Autentikasi OTP WhatsApp (Fonnte API)
*   **Kode Kasus Uji:** `TC-AUTH-01`
*   **Tujuan:** Memastikan pengguna baru dapat terdaftar dengan aman setelah memverifikasi nomor HP menggunakan WhatsApp OTP.

| Langkah Uji | Input Uji | Hasil yang Diharapkan | Status Kelolosan |
| :--- | :--- | :--- | :--- |
| 1. Buka halaman `/register`, isi formulir pendaftaran secara lengkap, klik "Daftar". | Nama: "Budi", Email: "budi@test.com", Password: "Password123", No. WA: "081234567890". | Modal input kode OTP WhatsApp muncul. Sistem mengirim kode OTP ke WhatsApp pengguna via Fonnte API. | [ ] Lolos / [ ] Gagal |
| 2. Masukkan kode OTP yang salah pada modal input, klik "Verifikasi". | Kode OTP: "999999" (Kode yang salah). | Sistem menampilkan pesan kesalahan "Kode OTP tidak valid, silakan coba lagi". Modal OTP tidak tertutup. | [ ] Lolos / [ ] Gagal |
| 3. Masukkan kode OTP yang benar pada modal input, klik "Verifikasi". | Kode OTP: "123456" (Sesuai dengan yang dikirim). | Sistem menutup modal, membuat user baru di Firebase Auth, menulis data ke Firestore `/users/`, dan mengalihkan ke homepage. | [ ] Lolos / [ ] Gagal |
| 4. Simulasikan jika token Fonnte kosong/mati di backend, klik "Daftar". | Pengisian data pendaftaran lengkap (No. WA aktif). | Sistem mendeteksi kegagalan kirim WhatsApp, lalu memicu fallback otomatis dengan mengirimkan OTP ke email via EmailJS API. | [ ] Lolos / [ ] Gagal |

---

### 2.2 Modul Pengunggahan Produk & AI Quality Control (Gemini API)
*   **Kode Kasus Uji:** `TC-AI-02`
*   **Tujuan:** Memverifikasi fungsionalitas sistem kecerdasan buatan dalam memfilter foto pakaian berkualitas dan menolak gambar yang tidak sah.

| Langkah Uji | Input Uji | Hasil yang Diharapkan | Status Kelolosan |
| :--- | :--- | :--- | :--- |
| 1. Masuk sebagai Seller, buka halaman `/seller/upload`. Unggah gambar logo/kartun hasil download internet. | File: `logo_adidas.png` (Gambar katalog/bukan foto baju asli). | Gemini AI membalas dengan status `approved: false` dan grade `DITOLAK`. Sistem menampilkan toast penolakan: "Harap gunakan foto asli jepretan kamera fisik". | [ ] Lolos / [ ] Gagal |
| 2. Unggah gambar makanan atau pemandangan. | File: `nasi_goreng.jpg` (Bukan pakaian). | Gemini AI mendeteksi kategori bukan pakaian, mengembalikan `approved: false`. Sistem memblokir proses upload dan menampilkan pesan error. | [ ] Lolos / [ ] Gagal |
| 3. Unggah foto pakaian fisik asli yang difoto langsung di atas gantungan baju/lantai dengan kondisi layak. | File: `jaket_jeans_vintage.jpg` (Foto fisik asli). | Gemini AI mengembalikan `approved: true`, memberikan grade (misal: `A` atau `B`), gaya (`Streetwear`), serta mengisi kolom judul & deskripsi secara otomatis. | [ ] Lolos / [ ] Gagal |
| 4. Isi harga barang, lalu klik tombol "Publish". | Harga: "150000", Stok: "1". | Sistem menyimpan file gambar ke Firebase Storage, mengambil tautan URL-nya, lalu menulis data produk baru ke Realtime Database node `/products`. | [ ] Lolos / [ ] Gagal |

---

### 2.3 Modul Transaksi & Pembayaran Otomatis (Midtrans API)
*   **Kode Kasus Uji:** `TC-PAY-03`
*   **Tujuan:** Menguji keberhasilan integrasi API gerbang pembayaran Midtrans Snap.

| Langkah Uji | Input Uji | Hasil yang Diharapkan | Status Kelolosan |
| :--- | :--- | :--- | :--- |
| 1. Tambahkan produk ke keranjang, klik "Checkout". Isi alamat pengiriman pada peta, lalu klik "Bayar". | Produk ID: `prod_abc`, Alamat Koordinat: `-6.200000, 106.816666`, Metode: "Midtrans". | Frontend mengirim request ke Express server `/api/charge`. Express server berhasil memanggil Midtrans Snap API dan menampilkan pop-up Snap. | [ ] Lolos / [ ] Gagal |
| 2. Di dalam pop-up Midtrans Snap, pilih bank transfer dan selesaikan transaksi (simulasi sandbox). | Bank: "BCA Transfer", Status: "Pembayaran Sukses" (di simulator). | Pop-up tertutup otomatis. Halaman web berganti ke `/order-success`. Status pembayaran pesanan di Firestore terupdate dari `pending` menjadi `settled`. | [ ] Lolos / [ ] Gagal |

---

### 2.4 Modul Validasi Pembayaran Manual QRIS (Admin Portal)
*   **Kode Kasus Uji:** `TC-ADMIN-04`
*   **Tujuan:** Memastikan proses unggah bukti transfer QRIS dan persetujuan/penolakan oleh Admin berjalan secara konsisten.

| Langkah Uji | Input Uji | Hasil yang Diharapkan | Status Kelolosan |
| :--- | :--- | :--- | :--- |
| 1. Di halaman checkout, pilih metode "QRIS". Unggah file gambar tangkapan layar bukti transfer, klik "Bayar". | File Bukti: `bukti_transfer_qris.jpg`. | Bukti terunggah ke Firebase Storage. Sistem membuat dokumen order di Firestore `/orders/` dengan status pembayaran `pending`. | [ ] Lolos / [ ] Gagal |
| 2. Masuk sebagai Admin, buka dashboard `/admin/payments`. Cari transaksi yang baru dibuat. | Klik tombol "Lihat Bukti" pada daftar pembayaran masuk. | Sistem memunculkan dialog gambar bukti transfer yang diunggah oleh pembeli secara jelas. | [ ] Lolos / [ ] Gagal |
| 3. Admin mengklik tombol "Setujui Pembayaran". | Aksi: Klik "Approve". | Dokumen order di Firestore `/orders/{orderId}` terupdate dengan `paymentStatus: 'approved'`. Status pemesanan di riwayat pembeli berubah menjadi "Diproses". | [ ] Lolos / [ ] Gagal |
| 4. Admin mengklik tombol "Tolak Pembayaran" karena bukti transfer tidak valid. | Aksi: Klik "Reject". | Dokumen order terupdate menjadi `paymentStatus: 'rejected'`. Notifikasi penolakan dikirim ke akun pembeli. | [ ] Lolos / [ ] Gagal |

---

### 2.5 Modul Obrolan Real-time (Chat C2C)
*   **Kode Kasus Uji:** `TC-CHAT-05`
*   **Tujuan:** Memastikan pengiriman pesan chat real-time dan indikator pendukung berjalan tanpa gangguan.

| Langkah Uji | Input Uji | Hasil yang Diharapkan | Status Kelolosan |
| :--- | :--- | :--- | :--- |
| 1. Buka dua tab browser berbeda. Tab A login sebagai Buyer, Tab B login sebagai Seller. Buka ruang obrolan chat yang sama. | Akses halaman `/inbox`. | Kedua pengguna terhubung ke ruang chat yang sama. Status online di node `/status/{userId}` terupdate menjadi `online`. | [ ] Lolos / [ ] Gagal |
| 2. Di Tab A, mulailah mengetik pesan pada kolom input chat. | Mengetik karakter di keyboard. | Di Tab B, muncul teks indikator "... sedang mengetik" secara real-time (latensi < 1 detik). | [ ] Lolos / [ ] Gagal |
| 3. Di Tab A, klik tombol "Kirim Pesan". | Pesan: "Halo, apakah baju ini ready?". | Pesan tersimpan di Firestore `/chats/{chatId}/messages/`. Pesan muncul seketika di layar Tab B. Indikator mengetik di Tab B langsung hilang. | [ ] Lolos / [ ] Gagal |
| 4. Di Tab A, tutup browser atau berpindah halaman. | Aksi: Pindah ke halaman profil. | Di Tab B, status online pembeli berubah menjadi offline (presensi berubah setelah beberapa saat). | [ ] Lolos / [ ] Gagal |
