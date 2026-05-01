import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { auth, googleProvider, facebookProvider, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, User } from "firebase/auth";
import { ref, get, child, set } from "firebase/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth(); // If they log in successfully, we might rely on the context, but we will redirect manually after checking RTDB here to be faster.

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
      
      // Check if user exists in RTDB
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));
      
      let userRole = "Pembeli"; // Default
      
      if (!snapshot.exists()) {
        // Create new user profile in RTDB
        await set(ref(db, `users/${user.uid}`), {
          name: user.displayName || "Pengguna",
          email: user.email,
          role: "Pembeli",
          createdAt: new Date().toISOString(),
        });
      } else {
        const userData = snapshot.val();
        userRole = userData.role || "Pembeli";
      }
      
      toast.success("Berhasil masuk!");
      redirectUser(userRole);
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal masuk", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Mohon isi email dan password");
      return;
    }
    
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check role
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));
      let userRole = "Pembeli";
      if (snapshot.exists()) {
        userRole = snapshot.val().role || "Pembeli";
      }
      
      toast.success("Berhasil masuk!");
      redirectUser(userRole);
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal masuk", { description: "Email atau password salah." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Masukkan email", { description: "Ketik email Anda di kolom email untuk mereset password." });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Email pemulihan dikirim!", { description: "Silakan cek kotak masuk email Anda." });
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal", { description: error.message });
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
          <h1 className="font-display text-2xl font-bold text-foreground text-center">Masuk</h1>
          <p className="text-sm text-muted-foreground text-center mt-2">Selamat datang kembali di Salin Gaya</p>

          <form className="mt-8 space-y-4" onSubmit={handleEmailLogin}>
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
              <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
              />
            </div>
            <div className="text-right">
              <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:underline bg-transparent border-none p-0 cursor-pointer">
                Lupa password?
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">atau</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-4 space-y-2">
            <button 
              onClick={() => handleSocialLogin(googleProvider)}
              disabled={isLoading}
              className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Masuk dengan Google
            </button>
            <button 
              onClick={() => handleSocialLogin(facebookProvider)}
              disabled={isLoading}
              className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Masuk dengan Facebook
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">Daftar</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
