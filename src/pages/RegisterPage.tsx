import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { auth, googleProvider, facebookProvider, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile, sendEmailVerification, User } from "firebase/auth";
import { ref, get, child, set, query, orderByChild, equalTo, remove } from "firebase/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Pembeli");
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const redirectUser = (userRole: string) => {
    if (userRole === "Penjual") {
      navigate("/seller/upload");
    } else {
      navigate("/");
    }
  };

  const handleSocialLogin = async (provider: any) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));
      
      if (!snapshot.exists()) {
        // Show role selection modal instead of immediately saving
        setPendingUser(user);
        setShowRoleModal(true);
        setIsLoading(false);
        return;
      } else {
        const userRole = snapshot.val().role || "Pembeli";
        toast.success("Berhasil mendaftar/masuk!");
        redirectUser(userRole);
      }
    } catch (error: any) {
      console.error("[REGISTER] Social Login Error:", error);
      toast.error("Gagal menggunakan social login", { description: error.message });
      setIsLoading(false);
    }
  };

  const handleRoleSelection = async (selectedRole: string) => {
    if (!pendingUser) return;
    setIsLoading(true);
    setShowRoleModal(false);
    try {
      await set(ref(db, `users/${pendingUser.uid}`), {
        uid: pendingUser.uid,
        name: pendingUser.displayName || name || "Pengguna",
        email: pendingUser.email,
        role: selectedRole,
        createdAt: new Date().toISOString(),
      });
      toast.success("Berhasil mendaftar!");
      redirectUser(selectedRole);
    } catch (error: any) {
      console.error("[REGISTER] Role Selection Error:", error);
      toast.error("Gagal menyimpan role", { description: error.message });
    } finally {
      setIsLoading(false);
      setPendingUser(null);
    }
  };

  // --- CUSTOM OTP ENGINE ---
  const sendOTPViaProvider = async (phone: string, otpCode: string) => {
    const message = `Kode OTP Salin Gaya Anda adalah: ${otpCode}. Jangan berikan kode ini kepada siapa pun.`;
    
    try {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': import.meta.env.VITE_FONNTE_TOKEN,
        },
        body: new URLSearchParams({
          target: phone,
          message: message,
        })
      });
      
      const data = await response.json();
      if (data.status) {
        toast.success("OTP berhasil dikirim ke WhatsApp!");
        return true;
      } else {
        const errorReason = data.reason || data.detail || "Gagal mengirim via API.";
        toast.error(`Gagal mengirim WA: ${errorReason}`);
        return false;
      }
    } catch (error: any) {
      toast.error("Gagal terhubung ke server WhatsApp", { description: error.message });
      return false;
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !phone) {
      toast.error("Mohon lengkapi semua data registrasi");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = phone.startsWith('0') ? `+62${phone.slice(1)}` : (phone.startsWith('+') ? phone : `+62${phone}`);
      
      // PRE-OTP VERIFICATION: Check if phone ALREADY exists
      const usersRef = ref(db, 'users');
      const phoneQuery = query(usersRef, orderByChild('phone'), equalTo(formattedPhone));
      const snapshot = await get(phoneQuery);
      
      if (snapshot.exists()) {
        toast.error("Nomor sudah terdaftar", { 
          description: "Nomor ini sudah digunakan. Silakan login atau gunakan nomor lain.",
          action: {
            label: "Login",
            onClick: () => navigate("/login")
          }
        });
        setIsLoading(false);
        return;
      }
      
      // 1. Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 2. Save to RTDB (Expires in 5 minutes)
      const expiresAt = new Date().getTime() + 5 * 60 * 1000;
      await set(ref(db, `otp_sessions/${formattedPhone.replace(/\+/g, '')}`), {
        code: otpCode,
        expiresAt: expiresAt
      });

      // 3. Send via Provider
      const isSent = await sendOTPViaProvider(formattedPhone, otpCode);
      if (!isSent) {
        setIsLoading(false);
        return; // Hentikan jika API Fonnte gagal
      }

      setShowOtpInput(true);
      setCountdown(60);
    } catch (error: any) {
      console.error("[REGISTER] Send OTP Error:", error);
      toast.error("Gagal mengirim OTP", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    setIsLoading(true);
    try {
      const formattedPhone = phone.startsWith('0') ? `+62${phone.slice(1)}` : (phone.startsWith('+') ? phone : `+62${phone}`);
      const cleanPhone = formattedPhone.replace(/\+/g, '');
      
      // 1. Read from RTDB
      const otpRef = ref(db, `otp_sessions/${cleanPhone}`);
      const snapshot = await get(otpRef);
      
      if (!snapshot.exists()) {
        toast.error("Kode OTP tidak valid", { description: "Silakan minta kode baru." });
        setIsLoading(false);
        return;
      }

      const sessionData = snapshot.val();
      const now = new Date().getTime();

      // 2. Validate Code & Expiration
      if (sessionData.code !== otp || now > sessionData.expiresAt) {
        toast.error("Kode OTP salah atau kedaluwarsa.");
        setIsLoading(false);
        return;
      }

      // 3. Clear OTP Session (Security: One-Time Use)
      await remove(otpRef);

      // 4. Serverless Trick: Register with Ghost Credentials
      const ghostEmail = `${cleanPhone}@salingaya.com`;
      const ghostPassword = `Salingaya+${cleanPhone}`;
      
      const userCredential = await createUserWithEmailAndPassword(auth, ghostEmail, ghostPassword);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });
      
      // 5. Simpan Profil ke RTDB (Menyimpan kredensial asli untuk backup)
      await set(ref(db, `users/${user.uid}`), {
        uid: user.uid,
        name: name,
        email: email, // Menyimpan email asli ke database
        originalPassword: password, // Menyimpan referensi password asli (jika dibutuhkan untuk sinkronisasi lain)
        phone: formattedPhone,
        role: role,
        createdAt: new Date().toISOString(),
      });
      
      // Optional: Kita tidak bisa sendEmailVerification ke email ghost, 
      // jadi ini bisa di-skip atau diubah jika pakai email asli di sistem lain.
      
      toast.success("Registrasi berhasil!", { description: "Akun Anda telah diaktifkan." });
      redirectUser(role);
    } catch (error: any) {
      console.error("[REGISTER] Verification/Registration Error:", error);
      toast.error("Registrasi gagal", { description: error.message || "Terjadi kesalahan sistem." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm"
        >
          <h1 className="font-display text-2xl font-bold text-foreground text-center">Daftar</h1>
          <p className="text-sm text-muted-foreground text-center mt-2">Buat akun Salin Gaya kamu</p>


          {!showOtpInput ? (
            <form className="mt-8 space-y-4" onSubmit={handleSendOtp}>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Nomor Handphone (Wajib)</label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Daftar sebagai</label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${role === 'Pembeli' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}>
                    <input type="radio" name="role" value="Pembeli" checked={role === "Pembeli"} onChange={() => setRole("Pembeli")} className="accent-primary" />
                    <span className="text-sm text-foreground">Pembeli</span>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${role === 'Penjual' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}>
                    <input type="radio" name="role" value="Penjual" checked={role === "Penjual"} onChange={() => setRole("Penjual")} className="accent-primary" />
                    <span className="text-sm text-foreground">Penjual</span>
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? "Memproses..." : "Verifikasi Nomor"}
              </button>
            </form>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={handleVerifyOtpAndRegister}>
              <div className="bg-secondary/50 p-4 rounded-lg border border-border flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">OTP dikirim ke</p>
                  <p className="font-medium text-sm text-foreground truncate">{phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpInput(false);
                    setOtp("");
                    setCountdown(0);
                  }}
                  disabled={isLoading}
                  className="text-xs text-primary hover:underline font-medium shrink-0 ml-2"
                >
                  Ubah Nomor
                </button>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Kode OTP (6 Digit)</label>
                <input
                  type="text"
                  placeholder="Masukkan 6 angka OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading}
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-xl tracking-[0.5em] text-center font-bold font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? "Memverifikasi..." : "Verifikasi & Selesai"}
              </button>
              
              <div className="text-center pt-2">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Kirim ulang OTP dalam <span className="font-bold text-foreground">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Kirim Ulang OTP
                  </button>
                )}
              </div>
            </form>
          )}
          
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">atau daftar dengan</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-4 space-y-2">
            <button 
              onClick={() => handleSocialLogin(googleProvider)}
              disabled={isLoading}
              className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Google
            </button>
            <button 
              onClick={() => handleSocialLogin(facebookProvider)}
              disabled={isLoading}
              className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Facebook
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Masuk</Link>
          </p>
        </motion.div>
      </div>

      {/* Role Selection Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-sm rounded-2xl p-6 shadow-xl border border-border"
          >
            <h3 className="text-xl font-bold text-center mb-2">Pilih Role Akun</h3>
            <p className="text-sm text-center text-muted-foreground mb-6">Apakah Anda ingin mendaftar sebagai Pembeli atau Penjual?</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => handleRoleSelection("Pembeli")}
                className="w-full py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-primary/10 hover:text-primary transition-colors border border-border"
              >
                Saya Pembeli
              </button>
              <button 
                onClick={() => handleRoleSelection("Penjual")}
                className="w-full py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-primary/10 hover:text-primary transition-colors border border-border"
              >
                Saya Penjual (Buka Toko)
              </button>
            </div>
            
            <button 
              onClick={() => {
                setShowRoleModal(false);
                setPendingUser(null);
                auth.signOut();
              }}
              className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Batal
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
