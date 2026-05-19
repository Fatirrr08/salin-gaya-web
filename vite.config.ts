import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
// base: nama repositori GitHub Pages Anda (contoh: /salin-gaya-web/)
// Saat mode production (GitHub Actions), base = /salin-gaya-web/
// Saat development lokal (npm run dev), base = /
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
