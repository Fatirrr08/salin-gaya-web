import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * useScrollToTop
 *
 * Hook yang secara otomatis meng-scroll window ke posisi paling atas
 * setiap kali pathname berubah. Dipasang di dalam AnimatedRoutes
 * sehingga berlaku global untuk seluruh halaman.
 *
 * Menggunakan "instant" bukan "smooth" agar tidak ada konflik visual
 * dengan animasi masuk PageTransition (yang sudah melakukan slide-up).
 */
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
}
