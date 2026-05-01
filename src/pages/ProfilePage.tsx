import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth, db, storage } from "@/lib/firebase";
import { updateProfile, deleteUser } from "firebase/auth";
import { ref as dbRef, update, get, child, remove } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { User, Camera, Trash2, Loader2, Save } from "lucide-react";

export default function ProfilePage() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [gender, setGender] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiText, setAiText] = useState("");
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
        const snapshot = await get(child(dbRef(db), `users/${currentUser.uid}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.name && !currentUser.displayName) setName(data.name);
          if (data.photoURL) setPhotoURL(data.photoURL);
          if (data.gender) setGender(data.gender);
          if (data.address) {
            setStreet(data.address.street || "");
            setCity(data.address.city || "");
            setProvince(data.address.province || "");
          }
        }
      } catch (e) {
        console.error("Failed to fetch user data:", e);
      }
    };
    
    fetchUserData();
  }, [currentUser, navigate]);

  const simulateAIGenderClassification = async (): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock logic: 50/50 chance Laki-laki / Perempuan
        const result = Math.random() > 0.5 ? "Laki-laki" : "Perempuan";
        resolve(result);
      }, 2000);
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUpdating(true);
    setAiText("AI sedang menganalisis foto...");

    try {
      // 1. Simulasi AI Gender
      const detectedGender = await simulateAIGenderClassification();
      setGender(detectedGender);
      setAiText(`Terdeteksi: ${detectedGender}. Sedang mengunggah...`);

      // 2. Upload to Storage
      const avatarRef = storageRef(storage, `avatars/${currentUser.uid}`);
      const snapshot = await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 3. Update Auth Profile
      await updateProfile(currentUser, { photoURL: downloadURL });

      // 4. Update RTDB
      await update(dbRef(db, `users/${currentUser.uid}`), {
        photoURL: downloadURL,
        gender: detectedGender,
      });

      setPhotoURL(downloadURL);
      toast.success("Foto profil diperbarui", { description: `AI mengklasifikasikan gender: ${detectedGender}` });
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal mengunggah foto", { description: error.message });
    } finally {
      setIsUpdating(false);
      setAiText("");
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !name.trim()) return;
    
    setIsUpdating(true);
    try {
      // Update Auth Profile
      await updateProfile(currentUser, { displayName: name });
      
      // Update RTDB
      await update(dbRef(db, `users/${currentUser.uid}`), {
        name: name,
        address: {
          street: street,
          city: city,
          province: province
        }
      });
      
      toast.success("Profil berhasil disimpan!");
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan", { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    const confirmDelete = window.confirm(
      "Apakah Anda yakin ingin MENGHAPUS AKUN ini secara permanen? Semua data Anda akan hilang dan tindakan ini tidak dapat dibatalkan."
    );
    
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      // 1. Hapus data dari RTDB
      await remove(dbRef(db, `users/${currentUser.uid}`));
      
      // 2. Hapus akun Auth
      await deleteUser(currentUser);
      
      toast.success("Akun telah dihapus.");
      navigate("/");
    } catch (error: any) {
      console.error(error);
      // Firebase requires recent login for sensitive operations like deleteUser.
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Gagal menghapus", { description: "Tindakan ini sensitif. Silakan keluar dan masuk kembali sebelum mencoba menghapus akun." });
      } else {
        toast.error("Gagal menghapus akun", { description: error.message });
      }
      setIsDeleting(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">Profil Akun</h1>

        <div className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-10 mb-8">
          
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-8 mb-10 pb-10 border-b border-border">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-4 border-background shadow-md">
                {photoURL ? (
                  <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
              <label 
                className={`absolute bottom-0 right-0 bg-primary text-primary-foreground p-2.5 rounded-full shadow-lg cursor-pointer hover:scale-105 transition-transform ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Camera className="w-5 h-5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange}
                  disabled={isUpdating}
                />
              </label>
            </div>
            
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground">{name || "Pengguna"}</h2>
              <p className="text-muted-foreground">{currentUser.email}</p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                <span className="bg-secondary text-secondary-foreground text-xs font-semibold px-2.5 py-1 rounded-md border border-border">
                  Role: {role}
                </span>
                {gender && (
                  <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                    AI Gender: {gender}
                  </span>
                )}
              </div>
              
              {isUpdating && aiText && (
                <div className="mt-4 flex items-center justify-center sm:justify-start text-sm text-primary animate-pulse">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {aiText}
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            <h3 className="font-bold text-lg">Informasi Dasar</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nama Lengkap</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email (Tidak dapat diubah)</label>
              <input 
                type="email" 
                value={currentUser.email || ""}
                disabled
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-secondary text-muted-foreground cursor-not-allowed"
              />
            </div>

            <h3 className="font-bold text-lg pt-4 border-t border-border mt-4">Alamat Lengkap</h3>
            <p className="text-xs text-muted-foreground -mt-4 mb-2">
              {role === "Penjual" ? "Alamat ini akan digunakan sebagai alamat Toko Anda (titik asal pengiriman)." : "Alamat ini akan digunakan sebagai alamat default tujuan pengiriman Anda."}
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Provinsi</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Jawa Barat"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Kota / Kabupaten</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Bandung"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Alamat Detail (Jalan, RT/RW, Patokan)</label>
                <textarea 
                  rows={3}
                  placeholder="Contoh: Jl. Merdeka No. 123, RT 01/RW 02..."
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                onClick={handleSaveProfile}
                disabled={isUpdating || !name.trim()}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Perubahan
              </button>
            </div>
          </div>
          
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-6 sm:p-8">
          <h3 className="font-bold text-lg text-red-600 dark:text-red-500 flex items-center gap-2 mb-2">
            <Trash2 className="w-5 h-5" /> Danger Zone
          </h3>
          <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-6 max-w-2xl">
            Tindakan ini akan menghapus akun Anda secara permanen. Semua data pesanan, produk, dan pesan chat tidak akan bisa dikembalikan.
          </p>
          <button 
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Hapus Akun Permanen
          </button>
        </div>

      </main>
      
      <Footer />
    </div>
  );
}
