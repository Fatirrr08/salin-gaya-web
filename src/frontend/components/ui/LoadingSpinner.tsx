import React from "react";

// ─────────────────────────────────────────────────────────────
// LoadingSpinner — Elegant full-page loading fallback
// Used as the Suspense fallback throughout the app.
// ─────────────────────────────────────────────────────────────

interface LoadingSpinnerProps {
  /** Show only the spinner without full-page layout */
  inline?: boolean;
  /** Override size (Tailwind w-* / h-* class, default "w-10 h-10") */
  size?: string;
  /** Label shown below the spinner (screen-reader accessible) */
  label?: string;
}

export default function LoadingSpinner({
  inline = false,
  size = "w-10 h-10",
  label = "Memuat...",
}: LoadingSpinnerProps) {
  const spinner = (
    <span role="status" className="flex flex-col items-center gap-3">
      {/* Outer ring */}
      <span className="relative inline-flex">
        <span
          className={`${size} rounded-full border-4 border-[#EBE5D9] border-t-[#A67B5B] animate-spin`}
        />
        {/* Inner pulse dot */}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-[#A67B5B] animate-pulse" />
        </span>
      </span>
      <span className="text-sm font-medium text-[#A67B5B] tracking-wide">
        {label}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );

  if (inline) return spinner;

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center justify-center gap-4">
      {/* Brand wordmark — visible while heavy chunks load */}
      <p className="font-display text-2xl font-bold text-[#5C3A21] tracking-tight mb-4 select-none">
        SalinGaya
      </p>
      {spinner}
    </div>
  );
}

// ── Inline variant alias for convenience ──────────────────────
export function InlineSpinner({ size = "w-5 h-5" }: { size?: string }) {
  return <LoadingSpinner inline size={size} label="Memuat..." />;
}
