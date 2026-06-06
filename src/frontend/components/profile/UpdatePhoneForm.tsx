import React, { useState, useEffect } from "react";
import { ref as dbRef, get, update, set } from "firebase/database";
import { db } from "@/backend/config/firebase";
import { toast } from "sonner";
import { Loader2, Phone, MessageSquare } from "lucide-react";
import { useAuth } from "@/frontend/contexts/AuthContext";

interface UpdatePhoneFormProps {
  currentPhone: string;
  userName: string;
}

export default function UpdatePhoneForm({
  currentPhone,
  userName,
}: UpdatePhoneFormProps) {
  const { currentUser } = useAuth();
  const [newPhone, setNewPhone] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // OTP State
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0 && showOtpInput) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown, showOtpInput]);

  if (!currentUser) return null;

  const generateSixDigitOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || newPhone === currentPhone) return;

    setIsSending(true);

    try {
      const formattedPhone = newPhone.startsWith("0")
        ? `+62${newPhone.slice(1)}`
        : newPhone.startsWith("+")
          ? newPhone
          : `+62${newPhone}`;

      const generatedOtp = generateSixDigitOTP();
      const expiresAt = new Date().getTime() + 5 * 60 * 1000;
      const phoneSessionId = formattedPhone.replace(/\+/g, "");

      await set(dbRef(db, `otp_sessions/${phoneSessionId}`), {
        code: generatedOtp,
        expiresAt: expiresAt,
      });

      const messageTemplate = `*🔐 VERIFIKASI PERUBAHAN NOMOR HP 🔐*

Halo *${userName || "Pengguna"}*,
Berikut adalah kode OTP rahasia Anda untuk mengubah nomor HP di Salin Gaya:

*${generatedOtp}*

⚠️ *PERHATIAN:*
Jangan pernah memberikan kode ini kepada siapa pun, *termasuk* pihak Salin Gaya. Demi keamanan, kode ini hanya berlaku selama 5 menit.

Jika Anda tidak merasa melakukan aktivitas ini, mohon abaikan pesan ini.

Terima kasih,
*Tim Salin Gaya* 🛍️`;

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
        toast.success("OTP berhasil dikirim ke WhatsApp!");
        setSessionId(phoneSessionId);
        setShowOtpInput(true);
        setCountdown(60);
      } else {
        const errorReason = data.reason || data.detail || "Gagal mengirim via API.";
        toast.error(`Gagal mengirim WA: ${errorReason}`);
      }
    } catch (error: unknown) {
      toast.error("Gagal terhubung ke server WhatsApp", {
        description: (error as Error).message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Format OTP tidak valid. Harus 6 digit angka.");
      return;
    }

    setIsVerifying(true);
    try {
      const snapshot = await get(dbRef(db, `otp_sessions/${sessionId}`));
      
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
        toast.error("Kode OTP salah.");
        setIsVerifying(false);
        return;
      }

      // Valid OTP, update phone number
      await update(dbRef(db, `users/${currentUser.uid}`), {
        phone: newPhone,
      });

      // Clear OTP session
      await set(dbRef(db, `otp_sessions/${sessionId}`), null);

      toast.success("Nomor HP berhasil diperbarui!");
      setNewPhone("");
      setOtpCode("");
      setShowOtpInput(false);
      window.location.reload(); // Refresh to reflect changes

    } catch (error: unknown) {
      console.error("SMS error:", error);
      toast.error(`Gagal mengirim kode verifikasi: ${(error as Error).message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const displayCurrentPhone = currentPhone || "Belum ditambahkan";

  return (
    <div className="space-y-4 pt-4 border-t border-border mt-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg">Pembaruan Nomor WhatsApp</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Nomor saat ini:{" "}
            <span className="font-medium text-foreground">{displayCurrentPhone}</span>
          </p>
        </div>
      </div>

      {!showOtpInput ? (
        <form onSubmit={handleSendOTP} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label
              htmlFor="newPhone"
              className="text-sm font-medium text-foreground flex items-center gap-2"
            >
              <Phone className="w-4 h-4 text-muted-foreground" />
              Nomor WhatsApp Baru
            </label>
            <div className="flex gap-3">
              <input
                id="newPhone"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                disabled={isSending}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                required
              />
              <button
                type="submit"
                disabled={isSending || !newPhone.trim() || newPhone === currentPhone}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 min-w-[140px]"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses
                  </>
                ) : (
                  "Kirim OTP"
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4 max-w-md p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 text-primary font-medium mb-2">
            <MessageSquare className="w-5 h-5" />
            Verifikasi Kode OTP
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Kami telah mengirimkan 6 digit kode OTP ke WhatsApp <b>{newPhone}</b>.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Masukkan 6 digit OTP"
              disabled={isVerifying}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary transition-all text-center tracking-widest font-mono text-lg"
              required
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowOtpInput(false)}
              disabled={isVerifying}
              className="px-4 py-2.5 rounded-lg font-medium border border-border hover:bg-secondary text-sm transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isVerifying || otpCode.length !== 6}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                "Verifikasi & Simpan"
              )}
            </button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Belum menerima kode?{" "}
            {countdown > 0 ? (
              <span>Tunggu {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleSendOTP}
                className="text-primary hover:underline font-medium"
              >
                Kirim Ulang
              </button>
            )}
          </p>
        </form>
      )}
    </div>
  );
}
