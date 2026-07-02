# 📘 Spesifikasi Kebutuhan Perangkat Lunak (SKPL)
## Proyek: Salin Gaya (Premium Thrifting E-Commerce Platform)

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen Spesifikasi Kebutuhan Perangkat Lunak (SKPL) ini bertujuan untuk mendefinisikan kebutuhan fungsional dan non-fungsional dari platform e-commerce thrifting premium **Salin Gaya**. Dokumen ini ditujukan bagi pengembang sistem, penguji, serta pemangku kepentingan (*stakeholders*) lainnya guna menyamakan pemahaman mengenai kapabilitas sistem.

### 1.2 Lingkup Masalah
**Salin Gaya** adalah platform C2C e-commerce yang dirancang untuk mengatasi beberapa kendala utama dalam transaksi pakaian bekas (*thrifting*) premium secara daring di Indonesia, antara lain:
1.  **Kurangnya Quality Control:** Pembeli sering menerima barang yang kondisinya jauh berbeda dari foto.
2.  **Keamanan Akun:** Maraknya akun palsu (*scammer*) di platform sosial media tempat thrifting biasa dilakukan.
3.  **Kesulitan Transaksi:** Proses pembayaran manual transfer bank yang rawan penipuan dan verifikasi manual yang lambat.

Sistem ini menyelesaikan masalah di atas dengan menggunakan integrasi kecerdasan buatan (**Gemini 2.5 Flash**) untuk kurasi gambar dan grading otomatis, otentikasi ganda via **WhatsApp Gateway**, dan integrasi gerbang pembayaran otomatis (**Midtrans**).

---

## 2. Deskripsi Umum Sistem

### 2.1 Aktor / Peran Pengguna
Sistem membedakan hak akses dan kemampuan pengguna menjadi tiga kategori utama:
1.  **Buyer (Pembeli):** 
    *   Menjelajahi katalog produk fashion.
    *   Mencari produk dengan pencarian fuzzy.
    *   Mengelola keranjang belanja aktif.
    *   Melakukan checkout dan pembayaran (QRIS/Midtrans).
    *   Melakukan percakapan langsung (chat C2C) dengan Penjual.
    *   Memberikan ulasan pada pakaian yang dibeli.
2.  **Seller (Penjual):**
    *   Mengunggah produk pakaian bekas dengan verifikasi visual AI QC.
    *   Melihat dashboard grafik pendapatan dan riwayat penjualan.
    *   Mengubah status pengiriman pesanan dan menginput nomor resi.
    *   Membalas chat dari pembeli.
3.  **Admin:**
    *   Memantau statistik transaksi keseluruhan di dashboard admin.
    *   Melakukan validasi pembayaran bukti transfer QRIS manual.
    *   Mengelola daftar ulasan platform dan data pengguna.

### 2.2 Batasan Sistem
*   Sistem berjalan di web browser (kompatibel dengan Google Chrome, Safari, Firefox, Edge).
*   Proses Quality Control gambar bergantung pada ketersediaan koneksi internet dan API Key Gemini yang aktif.
*   Autentikasi OTP WhatsApp membutuhkan kuota pulsa/token pada pihak penyedia gateway Fonnte.

---

## 3. Kebutuhan Fungsional (Functional Requirements)

Sistem harus memenuhi daftar kebutuhan fungsional berikut:

| ID Kebutuhan | Nama Kebutuhan | Deskripsi Kebutuhan | Aktor |
| :--- | :--- | :--- | :--- |
| **SKPL-FR-01** | Pendaftaran Pengguna Baru | Sistem mendaftarkan akun baru menggunakan email, nama, kata sandi, dan nomor ponsel yang terhubung ke WhatsApp. | Buyer, Seller |
| **SKPL-FR-02** | Masuk Sistem (Login) | Sistem memverifikasi kredensial pengguna dan mengizinkan masuk dengan opsi email & sandi atau Google/Facebook Auth. | Buyer, Seller, Admin |
| **SKPL-FR-03** | Autentikasi OTP WhatsApp | Sistem mengirim kode OTP ke WhatsApp pengguna via Fonnte API saat mendaftar atau masuk untuk validasi keamanan. | Buyer, Seller |
| **SKPL-FR-04** | Keamanan Akun Ganda (2FA) | Sistem menyediakan opsi pengaktifan 2FA yang mewajibkan input kode WhatsApp OTP setiap kali login. | Buyer, Seller |
| **SKPL-FR-05** | Pencarian Fuzzy Produk | Sistem melakukan pencarian produk fashion dengan toleransi kesalahan ketik menggunakan Fuse.js. | Buyer |
| **SKPL-FR-06** | Filter Kategori & Style | Sistem menyaring produk berdasarkan ukuran, warna, kondisi, harga, dan gaya fashion (Vintage, Y2K, Streetwear, Casual). | Buyer |
| **SKPL-FR-07** | Analisis Gambar & QC AI | Sistem memindai gambar baju yang diunggah seller melalui Gemini API untuk mendeteksi keaslian foto, kebersihan kain, keutuhan warna, serta kelayakan lolos kurasi. | Seller |
| **SKPL-FR-08** | Deskripsi Otomatis Produk | Sistem menghasilkan saran judul produk dan deskripsi persuasif ala copywriter berdasarkan analisis visual gambar pakaian. | Seller |
| **SKPL-FR-09** | Manajemen Keranjang Belanja | Sistem menyimpan daftar produk terpilih di keranjang belanja aktif dan menyinkronkannya dengan database. | Buyer |
| **SKPL-FR-10** | Checkout & Integrasi Lokasi | Sistem menghitung total belanja dan mencatat alamat pengiriman pembeli (didukung titik koordinat Leaflet Map). | Buyer |
| **SKPL-FR-11** | Pembayaran Otomatis (Midtrans) | Sistem meminta Snap Token pembayaran, memproses transaksi e-wallet/bank transfer, dan menerima status terbayar secara otomatis. | Buyer |
| **SKPL-FR-12** | Pembayaran QRIS Manual | Sistem menampilkan QRIS statis, menerima unggahan gambar bukti transfer dari pembeli, dan mengubah status ke "Menunggu Validasi". | Buyer |
| **SKPL-FR-13** | Validasi Manual Admin | Sistem menampilkan bukti transfer QRIS dan mengizinkan admin untuk menyetujui atau menolak pesanan tersebut. | Admin |
| **SKPL-FR-14** | Pelacakan Pengiriman & Resi | Sistem menyediakan form input resi kurir bagi penjual dan menampilkan status pengiriman real-time bagi pembeli. | Seller, Buyer |
| **SKPL-FR-15** | Obrolan Real-time C2C | Sistem memfasilitasi pesan instan pembeli-penjual lengkap dengan status online (*presence*) dan indikator mengetik (*typing*). | Buyer, Seller |
| **SKPL-FR-16** | Dashboard Penjualan | Sistem menampilkan grafik omzet, jumlah produk terjual, dan status transaksi aktif bagi penjual. | Seller |
| **SKPL-FR-17** | Ulasan Produk & Platform | Sistem menerima penilaian bintang dan komentar ulasan produk pasca-transaksi selesai. | Buyer |

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 4.1 Keamanan (Security)
*   **Akses Database:** Seluruh operasi tulis dan baca ke Firestore, Realtime Database, dan Cloud Storage harus divalidasi oleh sistem Firebase Security Rules berdasarkan UID pengguna yang terautentikasi.
*   **Proteksi Web:** Server Firebase Hosting harus dikonfigurasi dengan Content Security Policy (CSP) untuk membatasi asal muasal data yang dikirim dan mencegah XSS.

### 4.2 Ketersediaan dan Performa (Availability & Performance)
*   **Sinkronisasi Real-time:** Status pengetikan dan status online di ruang chat harus diperbarui dengan latensi kurang dari 1 detik menggunakan protokol WebSocket di Realtime Database.
*   **Optimasi Gambar:** Sebelum gambar diunggah ke Gemini API atau Firebase Storage, sistem harus mengompresi gambar di sisi client untuk mengurangi waktu muat.
*   **Penanganan Galat Unduhan (Lazy Loading):** Sistem harus mengimplementasikan teknik *lazy loading* dengan mekanisme auto-retry untuk memuat halaman web tanpa menyebabkan kegagalan layar putih (*white screen*).

### 4.3 Keandalan (Reliability)
*   **Fallback Verifikasi:** Jika pengiriman OTP WhatsApp melalui gateway Fonnte mengalami kegagalan, sistem harus menyediakan opsi pengiriman OTP cadangan via email dengan EmailJS.
