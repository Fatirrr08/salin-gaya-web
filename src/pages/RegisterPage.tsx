import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card rounded-2xl border border-border p-8"
        >
          <h1 className="font-display text-2xl font-bold text-foreground text-center">Daftar</h1>
          <p className="text-sm text-muted-foreground text-center mt-2">Buat akun Salin Gaya kamu</p>

          <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Nama Lengkap</label>
              <input
                type="text"
                placeholder="Nama lengkap"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
              <input
                type="email"
                placeholder="nama@email.com"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">No. HP</label>
              <input
                type="tel"
                placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
              <input
                type="password"
                placeholder="Minimal 8 karakter"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Daftar sebagai</label>
              <div className="flex gap-3">
                <label className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border cursor-pointer hover:bg-secondary transition-colors">
                  <input type="radio" name="role" value="buyer" defaultChecked className="accent-primary" />
                  <span className="text-sm text-foreground">Pembeli</span>
                </label>
                <label className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border cursor-pointer hover:bg-secondary transition-colors">
                  <input type="radio" name="role" value="seller" className="accent-primary" />
                  <span className="text-sm text-foreground">Penjual</span>
                </label>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Daftar Sekarang
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Masuk</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
