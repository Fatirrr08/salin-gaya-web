import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/frontend/components/layout/Navbar";
import { auth, db } from "@/backend/config/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  ref,
  get,
  query,
  orderByChild,
  equalTo,
  set,
  remove,
  update,
} from "firebase/database";
import { toast } from "sonner";
import { translateAuthError } from "@/lib/utils";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // OTP States
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  // New Password States
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);

  // Email Success State
  const [showEmailSuccess, setShowEmailSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const isEmail = input.includes("@");
  const isPhone = /^[0-9]+$/.test(input);

  const sendOTPViaProvider = async (phone: string, otpCode: string) => {
    const actionText = "mereset password";
    const messageTemplate = `*🔐 VERIFIKASI KEAMANAN SALIN GAYA 🔐*

Halo,
Berikut adalah kode OTP rahasia Anda untuk ${actionText} Salin Gaya:

*${otpCode}*

⚠️ *PERHATIAN:*
Jangan pernah memberikan kode ini kepada siapa pun, *termasuk* pihak Salin Gaya. Demi keamanan, kode ini hanya berlaku selama 5 menit.

Jika Anda tidak merasa melakukan aktivitas ini, mohon abaikan pesan ini.

Terima kasih,
*Tim Salin Gaya* 🛍️`;

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: import.meta.env.VITE_FONNTE_TOKEN,
        },
        body: new URLSearchParams({
          target: String(phone),
          message: messageTemplate,
        }),
      });

      const data = await response.json();
      if (data.status) {
        toast.success("OTP berhasil dikirim ke WhatsApp!");
        return true;
      } else {
        const errorReason = data.reason || data.detail || "Gagal mengirim via API.";
        toast.error(`Gagal mengirim WA: ${errorReason}`);
        return false;
      }
    } catch (error: unknown) {
      toast.error("Gagal terhubung ke server WhatsApp", {
        description: (error as Error).message,
      });
      return false;
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;

    setIsLoading(true);

    try {
      if (isEmail) {
        // Alur Email
        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
        if (!isEmailValid) {
          toast.error("Format email tidak valid");
          setIsLoading(false);
          return;
        }

        await sendPasswordResetEmail(auth, input);
        setShowEmailSuccess(true);
      } else if (isPhone) {
        // Alur Nomor HP
        const formattedPhone = input.startsWith("0")
          ? `+62${input.slice(1)}`
          : input.startsWith("+")
            ? input
            : `+62${input}`;

        const usersRef = ref(db, "users");
        const phoneQuery = query(
          usersRef,
          orderByChild("phone"),
          equalTo(formattedPhone),
        );
        const snapshot = await get(phoneQuery);

        if (!snapshot.exists()) {
          toast.error("Nomor tidak ditemukan", {
            description: "Nomor HP ini belum terdaftar.",
          });
          setIsLoading(false);
          return;
        }

        const userData = Object.values(snapshot.val() as any)[0] as any;
        setMatchedUserId(userData.uid as string);

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date().getTime() + 5 * 60 * 1000;

        await set(
          ref(db, `otp_sessions/${formattedPhone.replace(/\+/g, "")}`),
          {
            code: otpCode,
            expiresAt: expiresAt,
          },
        );

        const isSent = await sendOTPViaProvider(formattedPhone, otpCode);
        if (isSent) {
          setShowOtpInput(true);
          setCountdown(60);
        }
      } else {
        toast.error("Format tidak dikenali", {
          description: "Masukkan Email atau Nomor HP yang valid.",
        });
      }
    } catch (error: unknown) {
      if ((error as any).code === "auth/user-not-found") {
        toast.error("Gagal", {
          description: "Email tidak terdaftar di sistem kami.",
        });
      } else {
        toast.error("Terjadi Kesalahan", {
          description: translateAuthError(error),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsLoading(true);
    try {
      const formattedPhone = input.startsWith("0")
        ? `+62${input.slice(1)}`
        : input.startsWith("+")
          ? input
          : `+62${input}`;
      const cleanPhone = formattedPhone.replace(/\+/g, "");

      const otpRef = ref(db, `otp_sessions/${cleanPhone}`);
      const snapshot = await get(otpRef);

      if (!snapshot.exists()) {
        toast.error("Kode OTP tidak valid", {
          description: "Silakan minta kode baru.",
        });
        setIsLoading(false);
        return;
      }

      const sessionData = snapshot.val();
      const now = new Date().getTime();

      if (sessionData.code !== otp || now > sessionData.expiresAt) {
        toast.error("Kode OTP salah atau kedaluwarsa.");
        setIsLoading(false);
        return;
      }

      await remove(otpRef);

      setShowOtpInput(false);
      setShowNewPasswordForm(true);
      toast.success("OTP Valid!", {
        description: "Silakan masukkan password baru Anda.",
      });
    } catch (error: unknown) {
      toast.error("Terjadi kesalahan", {
        description: translateAuthError(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return;

    setIsLoading(true);
    try {
      if (!matchedUserId) {
        throw new Error("Sesi tidak valid, silakan ulangi proses.");
      }

      // Workaround MVP: Hanya update sandi di RTDB karena Firebase Auth via klien membutuhkan auth instance login
      await update(ref(db, `users/${matchedUserId}`), {
        originalPassword: newPassword,
      });

      toast.success("Berhasil!", {
        description:
          "Password berhasil diperbarui. Mengarahkan ke halaman login...",
      });
      setTimeout(() => navigate("/login"), 2000);
    } catch (error: unknown) {
      toast.error("Gagal", { description: translateAuthError(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm"
        >
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Login
            </Link>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground text-center">
            Lupa Password
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-2 mb-8">
            {showNewPasswordForm
              ? "Masukkan password baru Anda"
              : "Masukkan Email atau Nomor HP Anda untuk mereset password."}
          </p>

          <AnimatePresence mode="wait">
            {showEmailSuccess ? (
              <motion.div
                key="email-success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="bg-green-50 text-green-700 p-6 rounded-xl border border-green-200 mb-6">
                  <h3 className="font-bold text-lg mb-2">Email Terkirim!</h3>
                  <p className="text-sm">
                    Tautan untuk mengatur ulang password telah dikirim ke email
                    Anda. Silakan cek Kotak Masuk atau folder Spam. Setelah
                    password diubah melalui tautan tersebut, silakan kembali ke
                    halaman Login.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-block w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Kembali ke Login
                </Link>
              </motion.div>
            ) : !showNewPasswordForm ? (
              <motion.div
                key="request-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {!showOtpInput ? (
                  <form onSubmit={handleResetRequest} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">
                        Email / Nomor Handphone
                      </label>
                      <input
                        type="text"
                        placeholder="nama@email.com atau 08123..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      {isLoading ? "Memproses..." : "Kirim Link/OTP"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="bg-secondary/50 p-4 rounded-lg border border-border flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          OTP dikirim ke
                        </p>
                        <p className="font-medium text-sm text-foreground truncate">
                          {input}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowOtpInput(false);
                          setOtp("");
                          setCountdown(0);
                        }}
                        disabled={isLoading}
                        className="text-xs text-primary hover:underline font-medium shrink-0 ml-2"
                      >
                        Ubah
                      </button>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">
                        Kode OTP (6 Digit)
                      </label>
                      <input
                        type="text"
                        placeholder="Masukkan 6 angka OTP"
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, ""))
                        }
                        disabled={isLoading}
                        maxLength={6}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none text-xl tracking-[0.5em] text-center font-bold font-mono transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || otp.length !== 6}
                      className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      {isLoading ? "Memverifikasi..." : "Verifikasi OTP"}
                    </button>

                    <div className="text-center pt-2">
                      {countdown > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Kirim ulang OTP dalam{" "}
                          <span className="font-bold text-foreground">
                            {countdown}s
                          </span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResetRequest}
                          disabled={isLoading}
                          className="text-sm text-primary font-medium hover:underline"
                        >
                          Kirim Ulang OTP
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </motion.div>
            ) : (
              <motion.form
                key="new-password-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleUpdatePassword}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-1.5">
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                    Password Baru
                  </label>
                  <input
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                    minLength={6}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || newPassword.length < 6}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {isLoading ? "Menyimpan..." : "Simpan Password Baru"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
