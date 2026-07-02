import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "@/backend/config/firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import { motion } from "framer-motion";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("oobCode");
    if (!code) {
      setError("Link tidak valid atau telah kedaluwarsa.");
      setIsVerifying(false);
      return;
    }

    setOobCode(code);
    
    verifyPasswordResetCode(auth, code)
      .then((emailRes) => {
        setEmail(emailRes);
        setIsVerifying(false);
      })
      .catch((err) => {
        console.error("Invalid code:", err);
        setError("Link reset password tidak valid atau telah kedaluwarsa. Silakan minta tautan baru.");
        setIsVerifying(false);
      });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      toast.success("Password berhasil diubah! Silakan login dengan password baru Anda.", {
        duration: 5000,
      });
      navigate("/login");
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal merubah password", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <Loader2 className="w-8 h-8 animate-spin text-[#A67B5B] mb-4" />
          <p className="text-muted-foreground font-medium">Memverifikasi tautan...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-border overflow-hidden"
        >
          <div className="bg-[#A67B5B] p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Ganti Password</h1>
            <p className="text-white/80 text-sm">
              Silakan masukkan password baru Anda.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {error ? (
              <div className="text-center">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-6">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => navigate("/forgot-password")}
                  className="w-full py-3 bg-[#A67B5B] text-white rounded-xl font-bold hover:bg-[#8e684d] transition-colors"
                >
                  Kembali ke Lupa Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="p-3 bg-secondary/50 rounded-lg border border-border text-center mb-6">
                  <p className="text-xs text-muted-foreground mb-1">Mengubah password untuk:</p>
                  <p className="text-sm font-bold text-foreground">{email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password Baru</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-[#A67B5B]/20 focus:border-[#A67B5B] outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Ulangi password baru"
                      className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-[#A67B5B]/20 focus:border-[#A67B5B] outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="w-full py-3.5 bg-[#A67B5B] text-white rounded-xl font-bold hover:bg-[#8e684d] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Password Baru"}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
}
