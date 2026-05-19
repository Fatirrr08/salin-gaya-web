import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ref, get, update } from "firebase/database";
import { db } from "@/backend/config/firebase";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import emailjs from '@emailjs/browser';

interface EmailOTPModalProps {
  isOpen: boolean;
  uid: string;
  email: string;
  name: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Simulasi fungsi pengiriman email via EmailJS
export const sendOTPEmail = async (email: string, otpCode: string, name: string) => {
  console.log(
    `%c📧 MENGIRIM EMAIL KE: ${email}`,
    "color: blue; font-weight: bold; font-size: 14px;"
  );
  console.log(
    `%cSubjek: Kode Verifikasi Salin Gaya Anda: ${otpCode}\n\nHalo ${name},\n\nTerima kasih telah mendaftar di Salin Gaya.\nUntuk menyelesaikan proses registrasi dan memverifikasi akun Anda, silakan masukkan kode OTP 6 angka berikut pada halaman verifikasi:\n\n${otpCode}\n\n(Kode ini berlaku selama 10 menit).\n\nDemi keamanan, mohon JANGAN memberikan kode ini kepada siapa pun, termasuk pihak yang mengatasnamakan Salin Gaya.\n\nSalam hangat,\nTim Keamanan Salin Gaya`,
    "color: green; font-family: monospace;"
  );
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      console.warn("⚠️ Kredensial EmailJS belum lengkap di .env. Hanya menjalankan simulasi via console.");
      return true;
    }

    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: email,
        user_name: name || "Pengguna",
        otp_code: otpCode,
      },
      publicKey
    );
    console.log("✅ Email OTP berhasil dikirim ke alamat " + email);
    return true;
  } catch (error) {
    console.error("❌ Gagal mengirim email via EmailJS:", error);
    // Kita tetap return true agar tidak memblokir user jika EmailJS error (opsional)
    return false;
  }
};

export const generateAndSendEmailOTP = async (uid: string, email: string, name: string) => {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date().getTime() + 10 * 60 * 1000; // 10 menit

  await update(ref(db, `users/${uid}`), {
    emailOtpCode: otpCode,
    emailOtpExpires: expiresAt,
  });

  await sendOTPEmail(email, otpCode, name);
  return otpCode;
};

export default function EmailOTPModal({
  isOpen,
  uid,
  email,
  name,
  onClose,
  onSuccess,
}: EmailOTPModalProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown, isOpen]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredCode = otp.join("");
    if (enteredCode.length !== 6) {
      toast.error("Masukkan 6 digit kode OTP");
      return;
    }

    setIsLoading(true);
    try {
      const userRef = ref(db, `users/${uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        toast.error("Data pengguna tidak ditemukan.");
        setIsLoading(false);
        return;
      }

      const userData = snapshot.val();
      const now = new Date().getTime();

      if (
        String(userData.emailOtpCode) !== enteredCode ||
        now > (userData.emailOtpExpires || 0)
      ) {
        toast.error("Kode OTP salah atau sudah kedaluwarsa.");
        setIsLoading(false);
        return;
      }

      // Valid! Update isEmailVerified
      await update(userRef, {
        isEmailVerified: true,
        emailOtpCode: null,
        emailOtpExpires: null,
      });

      toast.success("Email berhasil diverifikasi!");
      onSuccess();
    } catch (error: any) {
      toast.error("Gagal memverifikasi", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await generateAndSendEmailOTP(uid, email, name);
      toast.success("Kode OTP baru telah dikirim ke email Anda!");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
    } catch (error: any) {
      toast.error("Gagal mengirim ulang OTP", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-md rounded-2xl p-8 shadow-xl border border-border relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-foreground">Verifikasi Email</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Kami telah mengirimkan 6 digit kode OTP ke email:
              <br />
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {otp?.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                disabled={isLoading}
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={isLoading || otp.join("").length !== 6}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verifikasi Email"}
          </button>

          <div className="mt-6 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Kirim ulang kode dalam <span className="font-bold text-foreground">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="text-sm text-primary font-medium hover:underline"
              >
                Kirim Ulang Kode
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
