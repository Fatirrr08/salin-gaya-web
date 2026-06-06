import React from 'react';
import type { ReactNode } from "react";

/**
 * PageTransition.tsx
 *
 * Wrapper animasi antar halaman menggunakan PURE CSS.
 * 100% kebal dari deadlock React Router + Suspense.
 */

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-page-enter">
      {children}
    </div>
  );
}

