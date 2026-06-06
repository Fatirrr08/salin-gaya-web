import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const SYSTEM_MASTER_PASSWORD = "SalinGaya_Secure_2026!";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const getValidImageUrl = (product: any | string | undefined | null): string => {
  if (!product) return "";
  
  // 1. If it's a string, return the string itself
  if (typeof product === 'string') {
    return product;
  }

  // 2. If it's an object with an image property
  if (product.image) {
    return product.image;
  }

  // 3. If it's an object with an images array
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }

  // 4. Default fallback if nothing works
  return "";
};

export const translateAuthError = (error: unknown): string => {
  const err = error as any;
  if (!err || !err.code) return (err?.message as string) || "Terjadi kesalahan sistem. Silakan coba lagi.";
  
  switch (err.code) {
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/user-not-found":
      return "Akun tidak ditemukan. Silakan daftar terlebih dahulu.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email/Nomor HP atau Password salah.";
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar.";
    case "auth/weak-password":
      return "Password terlalu lemah. Minimal 6 karakter.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Silakan coba lagi nanti.";
    case "auth/requires-recent-login":
      return "Sesi Anda sudah terlalu lama. Silakan login kembali.";
    default:
      return error.message || "Terjadi kesalahan pada server.";
  }
};
