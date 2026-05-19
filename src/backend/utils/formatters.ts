// ============================================================
// Formatters — Utility functions for data formatting
// ============================================================

/**
 * Format a number as Indonesian Rupiah currency string.
 * Example: 100000 → "Rp 100.000"
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};
