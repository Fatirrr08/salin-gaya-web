import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Loader2, LogOut } from "lucide-react";
import { ref, get, set } from "firebase/database";
import { db } from "@/backend/config/firebase";
import { toast } from "sonner";
import { useAuth } from "@/frontend/contexts/AuthContext";

interface TwoFactorScreenProps {
  phone: string;
  userName: string;
  onVerified: () => void;
}

export default function TwoFactorScreen({
  phone,
  userName,
  onVerified,
}: TwoFactorScreenProps) {
  const { logout } = useAuth();
  const [otpCode, setOtpCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [countdown, setCountdown] = useState(0);

  const generateSixDigitOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOTP = async () => {
    if (!phone) {
      toast.error("Nomor HP tidak ditemukan. Harap hubungi Admin.");
      return;
    }

    setIsSending(true);
    try {
      const formattedPhone = phone.startsWith("0")
        ? `+62${phone.slice(1)}`
        : phone.startsWith("+")
          ? phone
          : `+62${phone}`;

      const generatedOtp = generateSixDigitOTP();
      const expiresAt = new Date().getTime() + 5 * 60 * 1000;
      const phoneSessionId = formattedPhone.replace(/\+/g, "");

      await set(ref(db, `otp_sessions/${phoneSessionId}`), {
        code: generatedOtp,
        expiresAt: expiresAt,
      });

      const messageTemplate = `*🔐 SALIN GAYA - LOGIN KEAMANAN GANDA 🔐*

Halo *${userName || "Pengguna"}*,
Seseorang baru saja berhasil login ke akun Anda. Karena Anda mengaktifkan Autentikasi 2 Langkah (2FA), masukkan kode OTP berikut untuk melanjutkan:

*${generatedOtp}*

⚠️ *PERHATIAN:*
Kode ini hanya berlaku 5 menit. Jangan berikan kode ini kepada siapa pun! Jika ini bukan Anda, SEGERA ganti kata sandi akun Anda.

Terima kasih,
*Tim Salin Gaya* 🛡️`;

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: import.meta.env.VITE_FONNTE_TOKEN,
        },
        body: new URLSearchParams({
          target: formattedPhone,
          message: messageTemplate,
        }),
      });

      const data = await response.json();
      if (data.status) {
        toast.success("Kode Keamanan 2FA telah dikirim ke WhatsApp Anda.");
        setSessionId(phoneSessionId);
        setCountdown(60);
      } else {
        toast.error("Gagal mengirim WA. Silakan coba lagi.");
      }
    } catch (error: unknown) {
      toast.error("Gagal Mengirim OTP", {
        description: translateAuthError(error),
      });
    } finally {
      setIsSending(false);
    }
  };

  // Auto-send OTP on mount
  useEffect(() => {
    sendOTP();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error("Format OTP tidak valid. Harus 6 digit angka.");
      return;
    }

    setIsVerifying(true);
    try {
      const snapshot = await get(ref(db, `otp_sessions/${sessionId}`));
      
      if (!snapshot.exists()) {
        toast.error("Sesi OTP tidak ditemukan atau sudah kedaluwarsa.");
        setIsVerifying(false);
        return;
      }

      const data = snapshot.val();
      if (new Date().getTime() > data.expiresAt) {
        toast.error("Kode OTP sudah kedaluwarsa. Silakan minta ulang.");
        setIsVerifying(false);
        return;
      }

      if (data.code !== otpCode) {
        toast.error("Kode Keamanan salah. Akses ditolak.");
        setIsVerifying(false);
        return;
      }

      // Success
      await set(ref(db, `otp_sessions/${sessionId}`), null);
      toast.success("Autentikasi 2 Langkah berhasil!");
      onVerified();
      
    } catch (error: unknown) {
      toast.error("Verifikasi Gagal", {
        description: translateAuthError(error),
      });
      setIsVerifying(false);
      setOtpCode("");
    }
  };

  // Masked Phone helper for display
  const maskedPhone = phone && phone.length > 5
    ? `${phone.substring(0, 4)}${"*".repeat(phone.length - 6)}${phone.substring(phone.length - 2)}`
    : phone;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F9F6F0] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card w-full max-w-md p-8 rounded-2xl shadow-xl border border-border"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 border border-primary/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Keamanan 2 Langkah (2FA)</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Akun Anda dilindungi Autentikasi 2 Langkah. Kami telah mengirimkan kode keamanan ke WhatsApp <b>{maskedPhone}</b>.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Masukkan 6 Digit OTP"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-4 rounded-xl border-2 border-border focus:border-primary focus:ring-0 outline-none transition-colors"
              disabled={isVerifying || isSending}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || isSending || otpCode.length !== 6}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isVerifying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Verifikasi Akses"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border flex flex-col gap-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Belum menerima pesan?</span>
            {countdown > 0 ? (
              <span className="font-medium text-foreground">Tunggu {countdown}s</span>
            ) : (
              <button
                onClick={sendOTP}
                disabled={isSending}
                className="text-primary font-bold hover:underline flex items-center gap-1"
              >
                {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Kirim Ulang
              </button>
            )}
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900"
          >
            <LogOut className="w-4 h-4" />
            Batalkan & Keluar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
