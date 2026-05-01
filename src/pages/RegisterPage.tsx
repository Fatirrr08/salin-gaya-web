import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { auth, googleProvider, facebookProvider, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { ref, get, child, set } from "firebase/database";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Pembeli");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
      
      let userRole = role; // Default from state or "Pembeli"
      
      if (!snapshot.exists()) {
        await set(ref(db, `users/${user.uid}`), {
          name: user.displayName || name || "Pengguna",
          email: user.email,
          role: userRole,
          createdAt: new Date().toISOString(),
        });
      } else {
        userRole = snapshot.val().role || "Pembeli";
      }
      
      toast.success("Berhasil mendaftar/masuk!");
      redirectUser(userRole);
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menggunakan social login", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Mohon lengkapi data registrasi");
      return;
    }
    
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile
      await updateProfile(user, { displayName: name });
      
      // Save to RTDB
      await set(ref(db, `users/${user.uid}`), {
        name: name,
        email: email,
        phone: phone,
        role: role,
        createdAt: new Date().toISOString(),
      });
      
      toast.success("Registrasi berhasil!");
      redirectUser(role);
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal mendaftar", { description: error.message });
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

          <form className="mt-8 space-y-4" onSubmit={handleEmailRegister}>
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
              <label className="text-sm font-medium text-foreground block mb-1.5">No. HP (Opsional)</label>
              <input
                type="tel"
                placeholder="08xxxxxxxxxx"
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
              {isLoading ? "Memproses..." : "Daftar Sekarang"}
            </button>
          </form>
          
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
    </div>
  );
}
