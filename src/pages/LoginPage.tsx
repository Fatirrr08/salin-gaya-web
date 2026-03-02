import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card rounded-2xl border border-border p-8"
        >
          <h1 className="font-display text-2xl font-bold text-foreground text-center">Masuk</h1>
          <p className="text-sm text-muted-foreground text-center mt-2">Selamat datang kembali di Salin Gaya</p>

          <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
              <input
                type="email"
                placeholder="nama@email.com"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none text-sm"
              />
            </div>
            <div className="text-right">
              <a href="#" className="text-xs text-primary hover:underline">Lupa password?</a>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Masuk
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">atau</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-4 space-y-2">
            <button className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors">
              Masuk dengan Google
            </button>
            <button className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors">
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
