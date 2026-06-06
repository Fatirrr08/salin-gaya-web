import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/frontend/contexts/AuthContext";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import { db, storage } from "@/backend/config/firebase";
import { updateProfile, deleteUser } from "firebase/auth";
import { ref as dbRef, update, get, child, remove } from "firebase/database";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { syncUserProfileToChats } from "@/backend/services/chatService";
import { toast } from "sonner";
import {
  User,
  Camera,
  Trash2,
  Loader2,
  Save,
  MapPin,
  Shield,
  Map,
} from "lucide-react";
import UpdateEmailForm from "@/frontend/components/profile/UpdateEmailForm";
import UpdatePhoneForm from "@/frontend/components/profile/UpdatePhoneForm";
import UpdatePasswordForm from "@/frontend/components/profile/UpdatePasswordForm";
import TwoFactorSettings from "@/frontend/components/profile/TwoFactorSettings";
import ActiveSessions from "@/frontend/components/profile/ActiveSessions";
import SecurityLogs from "@/frontend/components/profile/SecurityLogs";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";

export default function ProfilePage() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"biodata" | "alamat" | "keamanan">(
    "biodata",
  );

  const [name, setName] = useState("");
  const [dbEmail, setDbEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    setName(currentUser.displayName || "");

    // Ambil data tambahan dari RTDB
    const fetchUserData = async () => {
      try {
        const snapshot = await get(
          child(dbRef(db), `users/${currentUser.uid}`),
        );
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.name && !currentUser.displayName) setName(data.name);
          if (data.email) setDbEmail(data.email);
          if (data.phone) setPhone(data.phone);
          if (data.photoURL) setPhotoURL(data.photoURL);
          if (data.address) {
            setStreet(data.address.street || "");
            setCity(data.address.city || "");
            setProvince(data.address.province || "");
          }
        } else {
          setDbEmail(currentUser.email || "");
        }
      } catch (error) {
        console.error(error);
        setDbEmail(currentUser.email || "");
      }
    };

    fetchUserData();
  }, [currentUser, navigate]);

  useEffect(() => {
    return () => {
      if (previewImage) URL.revokeObjectURL(previewImage);
    };
  }, [previewImage]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !["image/jpeg", "image/png"].includes(file.type) &&
      !file.name.match(/\.(jpg|jpeg|png)$/i)
    ) {
      toast.error("Format file tidak didukung", {
        description: "Harap unggah file JPG atau PNG.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran gambar terlalu besar", {
        description: "Maksimal 10 MB.",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);
    setSelectedFile(file);
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !name.trim()) return;

    setIsUpdating(true);
    try {
      let currentPhotoURL = photoURL;

      if (selectedFile) {
        const avatarRef = storageRef(
          storage,
          `users/profile_pictures/${currentUser.uid}`,
        );
        const snapshot = await uploadBytes(avatarRef, selectedFile);
        currentPhotoURL = await getDownloadURL(snapshot.ref);
        setPhotoURL(currentPhotoURL);
      }

      await updateProfile(currentUser, {
        displayName: name,
        ...(selectedFile && { photoURL: currentPhotoURL }),
      });

      await update(dbRef(db, `users/${currentUser.uid}`), {
        name: name,
        ...(selectedFile && { photoURL: currentPhotoURL }),
        address: {
          street: street,
          city: city,
          province: province,
        },
      });

      // Sync the new profile photo and name to all active P2P chats
      await syncUserProfileToChats(currentUser.uid, name, currentPhotoURL || currentUser.photoURL);

      setSelectedFile(null);
      setPreviewImage(null);
      toast.success("Profil berhasil disimpan!");
    } catch (error: unknown) {
      toast.error("Gagal menyimpan", { description: (error as Error).message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    const confirmDelete = window.confirm(
      "Apakah Anda yakin ingin MENGHAPUS AKUN ini secara permanen? Semua data Anda akan hilang dan tindakan ini tidak dapat dibatalkan.",
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await remove(dbRef(db, `users/${currentUser.uid}`));
      await deleteUser(currentUser);

      toast.success("Akun telah dihapus.");
      navigate("/");
    } catch (error: unknown) {
      if ((error as any).code === "auth/requires-recent-login") {
        toast.error("Gagal menghapus", {
          description:
            "Tindakan ini sensitif. Silakan keluar dan masuk kembali sebelum mencoba menghapus akun.",
        });
      } else {
        toast.error("Gagal menghapus akun", { description: (error as Error).message });
      }
      setIsDeleting(false);
    }
  };

  if (!currentUser) return null;

  // Masked Phone helper
  const formatMaskedPhone = (phoneStr: string) => {
    if (!phoneStr || phoneStr.length < 5) return phoneStr;
    const firstTwo = phoneStr.substring(0, 4);
    const lastTwo = phoneStr.substring(phoneStr.length - 2);
    const masked = "*".repeat(phoneStr.length - 6);
    return `${firstTwo}${masked}${lastTwo}`;
  };

  const displayEmail = dbEmail || currentUser.email || "";
  const displayPhone = formatMaskedPhone(phone) || "Belum ditambahkan";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-5xl mx-auto py-10 px-4">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Menu */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-card border border-border rounded-xl shadow-sm p-4 sticky top-24">
              <div className="mb-6 px-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden border border-border aspect-square">
                  {previewImage || photoURL ? (
                    <img
                      src={previewImage || photoURL}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-full h-full p-2 text-muted-foreground" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-sm truncate">
                    {name || "Pengguna"}
                  </p>
                  <p
                    className="text-xs text-muted-foreground truncate"
                    title={displayEmail}
                  >
                    {displayEmail}
                  </p>
                </div>
              </div>

              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("biodata")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "biodata" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <User className="w-4 h-4" />
                  Biodata Diri
                </button>
                <button
                  onClick={() => setActiveTab("alamat")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "alamat" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <MapPin className="w-4 h-4" />
                  Alamat Pengiriman
                </button>
                <button
                  onClick={() => setActiveTab("keamanan")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "keamanan" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <Shield className="w-4 h-4" />
                  Keamanan Akun
                </button>
              </nav>

              {role !== "Admin" && role !== "admin" && (
                <div className="mt-6 pt-6 border-t border-border">
                  <button
                    onClick={() => navigate("/inbox")}
                    className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-4 py-3 rounded-xl text-sm font-bold transition-all"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Chat dengan Admin
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeTab === "biodata" && (
                <motion.div
                  key="biodata"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8"
                >
                  <h2 className="text-xl font-bold text-foreground mb-6">
                    Biodata Diri
                  </h2>

                  <div className="flex flex-col sm:flex-row items-start gap-8 mb-8 pb-8 border-b border-border">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-4 border-background shadow-md aspect-square">
                        {previewImage || photoURL ? (
                          <img
                            src={previewImage || photoURL}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-16 h-16 text-muted-foreground" />
                        )}
                      </div>
                      <label
                        className={`absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full shadow-lg cursor-pointer hover:scale-105 transition-transform ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <Camera className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                          disabled={isUpdating}
                        />
                      </label>
                    </div>

                    <div className="flex-1 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Besar file: maksimum 10 Megabytes. Ekstensi file yang
                        diperbolehkan: .JPG .JPEG .PNG
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-secondary text-secondary-foreground text-xs font-semibold px-2.5 py-1 rounded-md border border-border">
                          Role: {role}
                        </span>
                      </div>
                      {isUpdating && (
                        <div className="flex items-center text-sm text-primary animate-pulse">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Mengunggah foto...
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6 max-w-lg">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center justify-between">
                        <span>Email</span>
                        <button
                          onClick={() => setActiveTab("keamanan")}
                          className="text-primary hover:underline text-xs"
                        >
                          Ubah Email
                        </button>
                      </label>
                      <input
                        type="email"
                        value={displayEmail}
                        disabled
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-secondary text-muted-foreground cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center justify-between">
                        <span>Nomor HP</span>
                        <button
                          onClick={() => setActiveTab("keamanan")}
                          className="text-primary hover:underline text-xs"
                        >
                          Ubah Nomor HP
                        </button>
                      </label>
                      <input
                        type="text"
                        value={displayPhone}
                        disabled
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-secondary text-muted-foreground cursor-not-allowed tracking-wider font-mono"
                      />
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isUpdating || !name.trim()}
                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Simpan Biodata
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "alamat" && (
                <motion.div
                  key="alamat"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Map className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">
                      Alamat Pengiriman
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    {role === "Penjual"
                      ? "Alamat ini akan digunakan sebagai alamat Toko Anda (titik asal pengiriman)."
                      : "Alamat ini akan digunakan sebagai alamat default tujuan pengiriman Anda."}
                  </p>

                  <div className="space-y-5 max-w-lg">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Provinsi
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Jawa Barat"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Kota / Kabupaten
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Bandung"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Alamat Detail (Jalan, RT/RW, Patokan)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Contoh: Jl. Merdeka No. 123, RT 01/RW 02..."
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    <div className="pt-4 border-t border-border mt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isUpdating}
                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Simpan Alamat
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "keamanan" && (
                <motion.div
                  key="keamanan"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Shield className="w-6 h-6 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">
                        Keamanan Akun
                      </h2>
                    </div>

                    <UpdateEmailForm currentEmail={displayEmail} />
                    <UpdatePhoneForm currentPhone={phone} userName={name} />
                    <UpdatePasswordForm />
                    <TwoFactorSettings />
                    <ActiveSessions />
                    <SecurityLogs />
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-6 sm:p-8">
                    <h3 className="font-bold text-lg text-red-600 dark:text-red-500 flex items-center gap-2 mb-2">
                      <Trash2 className="w-5 h-5" /> Hapus Akun
                    </h3>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-6 max-w-2xl">
                      Tindakan ini akan menghapus akun Anda secara permanen.
                      Semua data pesanan, produk, dan riwayat tidak akan bisa
                      dikembalikan.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      Hapus Akun Permanen
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
