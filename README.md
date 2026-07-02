# 👕 Salin Gaya - Premium Thrifting E-Commerce Platform

[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.x-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.5_Flash-8E75C8?style=flat-square&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

**Salin Gaya** adalah platform e-commerce premium berbasis thrifting (jual-beli pakaian bekas layak pakai) yang dirancang khusus untuk pasar Indonesia. Platform ini menggabungkan kecanggihan teknologi **Gemini AI** untuk kurasi kualitas produk secara otomatis, sistem keamanan autentikasi ganda berbasis **WhatsApp OTP**, serta integrasi pembayaran modern menggunakan **Midtrans & QRIS**.

---

## 🚀 Fitur Utama

### 🤖 1. Gemini AI Quality Control & Auto-Copywriter
Setiap pakaian yang diunggah oleh Penjual akan melalui sistem **Quality Control otomatis** menggunakan model **Gemini 2.5 Flash**:
*   **Deteksi Keaslian Gambar:** Otomatis menolak produk jika gambar yang diunggah berupa *3D render*, ilustrasi, gambar dummy, atau hasil unduhan katalog resmi internet (mewajibkan foto jepretan fisik asli).
*   **Deteksi Kategori Fashion:** Memastikan gambar yang diunggah adalah item fashion (menolak gambar makanan, elektronik, pemandangan, dsb).
*   **Penilaian Kualitas (Grading System):** Memberikan nilai kelayakan (Grade A, B, atau C) berdasarkan parameter kebersihan, keutuhan warna, kondisi kain/tekstur, dan keaslian barang.
*   **Auto-Copywriter:** Secara otomatis menghasilkan saran judul produk yang menarik dan deskripsi estetis ala copywriter handal berdasarkan visual foto pakaian.
*   **Deteksi Gaya Fashion:** Mengklasifikasikan gaya pakaian secara otomatis (contoh: *Vintage*, *Streetwear*, *Y2K*, *Casual*, dsb).

### 💬 2. WhatsApp Gateway Authentication (Fonnte API)
Meningkatkan keamanan transaksi dan akun pengguna dengan mengintegrasikan WhatsApp Gateway:
*   **OTP Verification:** Pengiriman kode sekali pakai (OTP) saat mendaftar akun atau masuk.
*   **2FA (Two-Factor Authentication):** Proteksi akun tingkat tinggi yang dikirim langsung ke nomor WhatsApp aktif pengguna.
*   **Verifikasi Perubahan Data:** Penggantian nomor HP atau data sensitif memerlukan otorisasi WhatsApp OTP.

### 💳 3. Sistem Pembayaran Fleksibel (Dual-Method)
*   **Midtrans Payment Gateway (Automated):** Integrasi Snap Token API (melalui Express middleware server) untuk pembayaran otomatis via Bank Transfer, GoPay, Kartu Kredit, atau e-Wallet lainnya.
*   **QRIS Manual (Validation System):** Pembayaran melalui kode QRIS statis di mana pembeli mengunggah bukti transfer, dan admin memvalidasinya secara manual melalui halaman validasi khusus.

### 👥 4. Tiga Multi-Role Pengguna
*   **Buyer Portal:** Fitur keranjang belanja aktif, pelacakan pesanan, riwayat pembelian, filter kategori, pencarian produk, serta fitur chat C2C langsung dengan penjual.
*   **Seller Portal:** Dashboard penjualan komprehensif, pelacakan penghasilan, manajemen daftar produk, dan integrasi pengunggahan produk dengan bantuan Gemini AI QC.
*   **Admin Portal:** Dashboard pengawasan platform, verifikasi pembayaran manual QRIS, manajemen database, dan pemantauan aktivitas chat.

### 🗺️ 5. Fitur Penunjang Tambahan
*   **Real-time Chat (C2C):** Dilengkapi dengan indikator pengetikan (*typing indicator*) dan status online pengguna (*presence status*).
*   **Map Integration:** Integrasi peta interaktif berbasis **Leaflet** untuk penentuan titik lokasi penjual/pembeli.
*   **Email OTP Alternatif:** Integrasi **EmailJS** sebagai metode verifikasi cadangan jika pengiriman WhatsApp sedang terkendala.

---

## 🛠️ Tech Stack & Library

*   **Framework Utama:** React 18, Vite, TypeScript
*   **Styling & UI:** Tailwind CSS, shadcn-ui, Radix UI Icons, Lucide React, Framer Motion (untuk animasi transisi halaman premium)
*   **Database & Backend:** Firebase (Hybrid)
    *   **Cloud Firestore:** Data relasional (Orders, Carts, Chats & Messages, Platform Reviews)
    *   **Realtime Database:** Data real-time berkecepatan tinggi (Products, User statuses/Online, Typing indicators, Reviews)
    *   **Firebase Authentication:** Manajemen registrasi dan login
    *   **Cloud Storage:** Media penyimpanan foto produk dan profil
*   **Manajemen Status/API:** TanStack Query (React Query v5) & React Router DOM v6
*   **Integrasi Pihak Ketiga:**
    *   `@google/generative-ai` (Gemini API)
    *   `midtrans-client` (Midtrans SDK)
    *   Fonnte API (WhatsApp Gateway)
    *   EmailJS (Alternative Email OTP)
    *   Leaflet & React-Leaflet (Interactive Map)
*   **Testing:** Vitest & React Testing Library

---

## 📂 Struktur Direktori Proyek

```bash
├── .github/                # Konfigurasi CI/CD GitHub Actions
│   └── workflows/
│       └── deploy.yml      # Workflow build & deploy otomatis ke GitHub Pages
├── midtrans-server/        # Backend server (Express.js) untuk integrasi Midtrans
│   ├── server.js           # Server entry point
│   ├── package.json
│   └── .env
├── src/                    # Source code frontend utama
│   ├── backend/            # Konfigurasi backend & service Firebase
│   │   ├── config/         # Inisialisasi Firebase & SDK pihak ketiga
│   │   └── services/
│   └── frontend/           # Aplikasi React client-side
│       ├── components/     # UI Components reusable (shadcn-ui & layouts)
│       ├── contexts/       # AuthContext, CartContext, dll
│       ├── hooks/          # Custom hooks (e.g. useScrollToTop)
│       ├── pages/          # 23 Halaman aplikasi (Buyer, Seller, Admin, Auth)
│       ├── services/       # API calling & client side database interactions
│       └── utils/          # Helper functions & formatters
├── database.rules.json     # Firebase Realtime Database Security Rules
├── firestore.rules         # Cloud Firestore Security Rules
├── storage.rules           # Cloud Firebase Storage Security Rules
├── package.json            # Node dependencies & scripts
├── tailwind.config.ts      # Konfigurasi Tailwind CSS
└── vite.config.ts          # Konfigurasi bundler Vite
```

---

## 🔑 Konfigurasi Environment Variables (`.env`)

Untuk menjalankan proyek ini secara penuh, buatlah file `.env` di **root directory** (untuk frontend) dan di folder **midtrans-server** (untuk backend pembayaran).

### 🖥️ 1. Frontend `.env` (Simpan di root directory)
```env
# API Key untuk Gemini AI Vision Assessor
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# API Key untuk WhatsApp Gateway (Fonnte)
VITE_FONNTE_TOKEN=your_fonnte_api_token_here

# API Credentials untuk EmailJS (Email OTP)
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key

# Client Key Midtrans Sandbox / Production
VITE_MIDTRANS_CLIENT_KEY=your_midtrans_client_key
```
*Catatan: Konfigurasi Firebase Anda telah tersentralisasi pada [firebase.ts](file:///Users/fatirgibran/Kuliah/salin-gaya-e-commerce/src/backend/config/firebase.ts). Proyek ini menggunakan arsitektur multi-project: Hosting pada project `salin-gaya` dan Backend pada project `impal-ce890`.*

### ⚙️ 2. Backend `.env` (Simpan di `/midtrans-server/.env`)
```env
PORT=5000
MIDTRANS_SERVER_KEY=your_midtrans_server_key_here
MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here
```

---

## 💻 Panduan Instalasi Lokal

Pastikan Anda telah memasang **Node.js (versi 20 atau di atasnya)**. Anda dapat menggunakan `npm` atau `bun` sebagai package manager.

### Langkah 1: Clone Repository
```sh
git clone https://github.com/Fatirrr08/salin-gaya-web.git
cd salin-gaya-e-commerce
```

### Langkah 2: Instalasi Dependencies
**Untuk Frontend (Root):**
```sh
# Menggunakan npm
npm install

# Atau menggunakan bun
bun install
```

**Untuk Midtrans Backend Server:**
```sh
cd midtrans-server
npm install
cd ..
```

### Langkah 3: Menjalankan Aplikasi secara Lokal
Jalankan frontend dan server backend pembayaran secara bersamaan di terminal terpisah.

**Terminal 1: Menjalankan Frontend React**
```sh
# Menggunakan npm
npm run dev

# Atau menggunakan bun
bun run dev
```
*Aplikasi frontend Anda akan berjalan di alamat `http://localhost:8080` (atau port yang tertera pada terminal).*

**Terminal 2: Menjalankan Server Midtrans**
```sh
cd midtrans-server
node server.js
```
*Server Express Anda akan berjalan di port `5000` (`http://localhost:5000`).*

---

## 🧪 Menjalankan Unit Testing

Proyek ini telah dilengkapi dengan suite pengujian berbasis **Vitest** dan **React Testing Library**.

Untuk menjalankan semua tes:
```sh
# Sekali jalankan
npm run test

# Jalankan dalam mode watch (interaktif)
npm run test:watch
```

---

## 🚀 Panduan Deployment

### 1. Deploy Frontend ke GitHub Pages (CI/CD Otomatis)
Proyek ini dikonfigurasi dengan GitHub Actions (`.github/workflows/deploy.yml`). 
Setiap kali Anda melakukan push atau merge ke branch `main`, workflow akan otomatis berjalan untuk:
1. Menginstal dependensi.
2. Membaca Secrets (Pastikan Anda telah menambahkan `VITE_FONNTE_TOKEN` dan `VITE_GEMINI_API_KEY` pada **Settings > Secrets and Variables > Actions** di repositori GitHub Anda).
3. Melakukan build production.
4. Mendepoy ke **GitHub Pages**.

### 2. Deploy Firebase Rules ke Firebase Backend (`impal-ce890`)
Jika Anda memodifikasi aturan keamanan (`firestore.rules`, `database.rules.json`, atau `storage.rules`), jalankan perintah berikut untuk memperbarui server Firebase:
```sh
npm run deploy:backend
```

### 3. Deploy Frontend secara Manual ke Firebase Hosting (`salin-gaya`)
Jika Anda ingin merilis frontend langsung menggunakan Firebase Hosting:
```sh
npm run deploy:hosting
```
