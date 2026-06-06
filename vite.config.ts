import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
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

  build: {
    // Strip all console.* calls in production builds
    minify: "esbuild",
    target: "esnext",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
            "firebase/database",
          ],
          // Charting / heavy UI
          "vendor-recharts": ["recharts"],
          // Date utilities
          "vendor-date": ["date-fns"],
        },
      },
    },
    // Suppress the chunk-size warning — we have manual chunks now
    chunkSizeWarningLimit: 600,
  },

  // Drop console.log/warn from production; keep console.error for runtime errors
  esbuild:
    mode === "production"
      ? {
          drop: ["debugger"],
          pure: ["console.log", "console.warn", "console.info", "console.debug"],
        }
      : {},
}));
