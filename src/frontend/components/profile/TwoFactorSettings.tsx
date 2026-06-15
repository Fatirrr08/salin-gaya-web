import React, { useState, useEffect } from "react";
import { ref as dbRef, get, update, set } from "firebase/database";
import { db } from "@/backend/config/firebase";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldAlert, MessageSquare } from "lucide-react";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { logSecurityEvent } from "@/frontend/utils/security";

export default function TwoFactorSettings() {
  const { currentUser } = useAuth();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // OTP State for Enabling 2FA
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    
    const fetch2FAStatus = async () => {
      try {
        const snapshot = await get(dbRef(db, `users/${currentUser.uid}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setIs2FAEnabled(data.twoFactorEnabled === true);
          setPhone(data.phone || "");
        }
      } catch (error) {
        console.error("Failed to fetch 2FA status", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetch2FAStatus();
  }, [currentUser]);

  const generateSixDigitOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleToggle2FA = async () => {
    if (!currentUser) return;
    
    if (is2FAEnabled) {
      // Disabling is direct (or could require password, but let's keep it simple for now)
      setIsLoading(true);
      try {
        await update(dbRef(db, `users/${currentUser.uid}`), {
          twoFactorEnabled: false
        });
        await logSecurityEvent(currentUser.uid, "2FA_DISABLED", "Dinonaktifkan via Profile");
        setIs2FAEnabled(false);
        toast.success("Autentikasi 2 Langkah dinonaktifkan.");
      } catch (error) {
        toast.error("Gagal menonaktifkan 2FA");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Enabling requires OTP verification
      if (!phone) {
        toast.error("Anda harus menambahkan Nomor WhatsApp terlebih dahulu di menu ini sebelum mengaktifkan 2FA.");
        return;
      }
      
      const fonnteToken = import.meta.env.VITE_FONNTE_TOKEN;
      if (!fonnteToken) {
        toast.error("Konfigurasi Sistem Belum Lengkap", {
          description: "API Key Fonnte (VITE_FONNTE_TOKEN) belum diatur di environment server."
        });
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

        await set(dbRef(db, `otp_sessions/${phoneSessionId}`), {
          code: generatedOtp,
          expiresAt: expiresAt,
        });

        const messageTemplate = `*🔐 MENGAKTIFKAN 2FA SALIN GAYA 🔐*

Gunakan kode ini untuk mengaktifkan Autentikasi 2 Langkah pada akun Anda:

*${generatedOtp}*

Jika Anda tidak memintanya, abaikan pesan ini.`;

        const response = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: { Authorization: import.meta.env.VITE_FONNTE_TOKEN },
          body: new URLSearchParams({ target: formattedPhone, message: messageTemplate }),
        });

        const data = await response.json();
        if (data.status) {
          setSessionId(phoneSessionId);
          setShowOtpInput(true);
        } else {
          toast.error("Gagal mengirim OTP WhatsApp.");
        }
      } catch (error) {
        toast.error("Terjadi kesalahan jaringan.");
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleVerifyEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6 || !currentUser) return;
    
    setIsVerifying(true);
    try {
      const snapshot = await get(dbRef(db, `otp_sessions/${sessionId}`));
      if (!snapshot.exists()) {
        toast.error("Sesi OTP kedaluwarsa.");
        setIsVerifying(false);
        return;
      }
      
      const data = snapshot.val();
      if (data.code !== otpCode) {
        toast.error("Kode OTP salah.");
        setIsVerifying(false);
        return;
      }
      
      // Success
      await update(dbRef(db, `users/${currentUser.uid}`), {
        twoFactorEnabled: true
      });
      await logSecurityEvent(currentUser.uid, "2FA_ENABLED", "Diaktifkan via Profile");
      
      setIs2FAEnabled(true);
      setShowOtpInput(false);
      setOtpCode("");
      toast.success("Autentikasi 2 Langkah Berhasil Diaktifkan! Akun Anda kini lebih aman.");
    } catch (error) {
      toast.error("Gagal memverifikasi OTP.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) return <div className="h-10 animate-pulse bg-secondary rounded-lg w-full mt-4"></div>;

  return (
    <div className="space-y-4 pt-4 border-t border-border mt-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            Autentikasi 2 Langkah (2FA)
            {is2FAEnabled ? (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3" /> AKTIF
              </span>
            ) : (
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <ShieldAlert className="w-3 h-3" /> NONAKTIF
              </span>
            )}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
            Lindungi akun Anda dengan menambahkan lapisan keamanan ekstra. Jika diaktifkan, Anda akan memerlukan kode OTP WhatsApp setiap kali login.
          </p>
        </div>
      </div>

      {!showOtpInput ? (
        <button
          onClick={handleToggle2FA}
          disabled={isSending}
          className={`px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 ${
            is2FAEnabled 
              ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" 
              : "bg-primary text-primary-foreground"
          }`}
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {is2FAEnabled ? "Nonaktifkan 2FA" : "Aktifkan 2FA"}
        </button>
      ) : (
        <form onSubmit={handleVerifyEnable2FA} className="space-y-4 max-w-sm p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 text-primary font-medium mb-2">
            <MessageSquare className="w-5 h-5" />
            Verifikasi WhatsApp
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Masukkan 6 digit kode yang dikirim ke <b>{phone}</b> untuk mengaktifkan 2FA.
          </p>
          <input
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Kode OTP 6 Digit"
            disabled={isVerifying}
            className="w-full px-4 py-2.5 rounded-lg border border-border text-center tracking-widest font-mono text-lg"
            required
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowOtpInput(false)}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isVerifying || otpCode.length !== 6}
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verifikasi & Aktifkan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
