import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/frontend/components/layout/Navbar";
import {
  auth,
  googleProvider,
  facebookProvider,
  db,
} from "@/backend/config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  User,
} from "firebase/auth";
import {
  ref,
  get,
  child,
  set,
  query,
  orderByChild,
  equalTo,
  remove,
} from "firebase/database";
import { toast } from "sonner";
import EmailOTPModal, { generateAndSendEmailOTP } from "@/frontend/components/ui/EmailOTPModal";

import { translateAuthError, SYSTEM_MASTER_PASSWORD } from "@/lib/utils";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Pembeli");
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [uidToVerify, setUidToVerify] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<"phone" | "email">("phone");
  const navigate = useNavigate();

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const redirectUser = (userRole: string) => {
    if (userRole === "Penjual") {
      navigate("/seller/upload");
    } else {
      navigate("/");
    }
  };

  const handleSocialLogin = async (provider: any) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));

      if (!snapshot.exists()) {
        setPendingUser(user);
        setShowRoleModal(true);
        setIsLoading(false);
        return;
      } else {
        const userRole = snapshot.val().role || "Pembeli";
        toast.success("Berhasil mendaftar/masuk!");
        redirectUser(userRole);
      }
    } catch (error: any) {
      toast.error("Gagal menggunakan social login", {
        description: translateAuthError(error),
      });
      setIsLoading(false);
    }
  };

  const handleRoleSelection = async (selectedRole: string) => {
    if (!pendingUser) return;
    setIsLoading(true);
    setShowRoleModal(false);
    try {
      await set(ref(db, `users/${pendingUser.uid}`), {
        uid: pendingUser.uid,
        name: pendingUser.displayName || name || "Pengguna",
        email: pendingUser.email,
        role: selectedRole,
        isEmailVerified: true, // Auto-verified for Social Logins
        createdAt: new Date().toISOString(),
      });
      toast.success("Berhasil mendaftar!");
      redirectUser(selectedRole);
    } catch (error: any) {
      toast.error("Gagal menyimpan role", {
        description: translateAuthError(error),
      });
    } finally {
      setIsLoading(false);
      setPendingUser(null);
    }
  };

  const sendOTPViaProvider = async (
    phone: string,
    otpCode: string,
    namaPengguna: string,
  ) => {
    const actionText = "mendaftar akun";
    const messageTemplate = `*🔐 VERIFIKASI KEAMANAN SALIN GAYA 🔐*

Halo *${namaPengguna}*,
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
        const errorReason =
          data.reason || data.detail || "Gagal mengirim via API.";
        toast.error(`Gagal mengirim WA: ${errorReason}`);
        return false;
      }
    } catch (error: any) {
      toast.error("Gagal terhubung ke server WhatsApp", {
        description: error.message,
      });
      return false;
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !phone) {
      toast.error("Mohon lengkapi semua data registrasi");
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = phone.startsWith("0")
        ? `+62${phone.slice(1)}`
        : phone.startsWith("+")
          ? phone
          : `+62${phone}`;

      const usersRef = ref(db, "users");
      const phoneQuery = query(
        usersRef,
        orderByChild("phone"),
        equalTo(formattedPhone),
      );
      const snapshot = await get(phoneQuery);

      if (snapshot.exists()) {
        toast.error("Nomor sudah terdaftar", {
          description:
            "Nomor ini sudah digunakan. Silakan login atau gunakan nomor lain.",
          action: {
            label: "Login",
            onClick: () => navigate("/login"),
          },
        });
        setIsLoading(false);
        return;
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      const expiresAt = new Date().getTime() + 5 * 60 * 1000;
      await set(ref(db, `otp_sessions/${formattedPhone.replace(/\+/g, "")}`), {
        code: otpCode,
        expiresAt: expiresAt,
      });

      const isSent = await sendOTPViaProvider(formattedPhone, otpCode, name);
      if (!isSent) {
        setIsLoading(false);
        return;
      }

      setShowOtpInput(true);
      setCountdown(60);
    } catch (error: any) {
      toast.error("Gagal mengirim OTP", {
        description: translateAuthError(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsLoading(true);
    try {
      const formattedPhone = phone.startsWith("0")
        ? `+62${phone.slice(1)}`
        : phone.startsWith("+")
          ? phone
          : `+62${phone}`;
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

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      const finalRole = role === "Penjual" ? "Penjual" : "Pembeli";

      await set(ref(db, `users/${user.uid}`), {
        uid: user.uid,
        name: name,
        email: email,
        originalPassword: password,
        phone: formattedPhone,
        role: finalRole,
        isEmailVerified: true, // Auto-verified because they verified via Phone OTP
        createdAt: new Date().toISOString(),
      });

      toast.success("Registrasi berhasil!", {
        description: "Akun Anda telah diaktifkan via WhatsApp.",
      });
      redirectUser(role);
    } catch (error: any) {
      toast.error("Registrasi gagal", {
        description: translateAuthError(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !phone) {
      toast.error("Mohon lengkapi semua data registrasi");
      return;
    }

    if (verificationMethod === "phone") {
      handleSendOtp(e);
    } else {
      setIsLoading(true);
      try {
        const formattedPhone = phone.startsWith("0")
          ? `+62${phone.slice(1)}`
          : phone.startsWith("+")
            ? phone
            : `+62${phone}`;

        const usersRef = ref(db, "users");
        const phoneQuery = query(usersRef, orderByChild("phone"), equalTo(formattedPhone));
        const snapshot = await get(phoneQuery);

        if (snapshot.exists()) {
          toast.error("Nomor sudah terdaftar", {
            description: "Silakan login atau gunakan nomor lain.",
            action: { label: "Login", onClick: () => navigate("/login") },
          });
          setIsLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: name });
        const finalRole = role === "Penjual" ? "Penjual" : "Pembeli";

        await set(ref(db, `users/${user.uid}`), {
          uid: user.uid,
          name: name,
          email: email,
          originalPassword: password,
          phone: formattedPhone,
          role: finalRole,
          isEmailVerified: false,
          createdAt: new Date().toISOString(),
        });

        await generateAndSendEmailOTP(user.uid, email, name);
        setUidToVerify(user.uid);
        setShowEmailOTP(true);
        toast.success("Pendaftaran berhasil! Tautan verifikasi telah dikirim ke email Anda.");
      } catch (error: any) {
        toast.error("Pendaftaran gagal", { description: translateAuthError(error) });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const isPhoneValid = /^[0-9]{9,15}$/.test(phone);
  const isFormValid =
    name.trim().length > 0 && isEmailValid && isPasswordValid && isPhoneValid;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm"
        >
          <h1 className="font-display text-2xl font-bold text-foreground text-center">
            Daftar
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Buat akun Salin Gaya kamu
          </p>

          {!showOtpInput ? (
            <form className="mt-8 space-y-4" onSubmit={handleRegisterFlow}>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  placeholder="Nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Nomor Handphone (Wajib)
                </label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Daftar sebagai
                </label>
                <div className="flex gap-3">
                  <label
                    className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${role === "Pembeli" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="Pembeli"
                      checked={role === "Pembeli"}
                      onChange={() => setRole("Pembeli")}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">Pembeli</span>
                  </label>
                  <label
                    className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${role === "Penjual" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="Penjual"
                      checked={role === "Penjual"}
                      onChange={() => setRole("Penjual")}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">Penjual</span>
                  </label>
                </div>
              </div>

              <div className="mt-2 mb-4">
                <label className="text-sm font-medium text-foreground block mb-2">
                  Metode Verifikasi
                </label>
                <div className="flex gap-2 p-1 bg-secondary rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVerificationMethod("phone")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${verificationMethod === "phone" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    WhatsApp / SMS OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationMethod("email")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${verificationMethod === "email" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Kode OTP Email
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? "Memproses..." : verificationMethod === "phone" ? "Verifikasi Nomor" : "Daftar & Verifikasi Email"}
              </button>
            </form>
          ) : (
            <form
              className="mt-8 space-y-4"
              onSubmit={handleVerifyOtpAndRegister}
            >
              <div className="bg-secondary/50 p-4 rounded-lg border border-border flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    OTP dikirim ke
                  </p>
                  <p className="font-medium text-sm text-foreground truncate">
                    {phone}
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
                  Ubah Nomor
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
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                  maxLength={6}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-base font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary outline-none text-center tracking-widest transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? "Memverifikasi..." : "Verifikasi & Selesai"}
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
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Kirim Ulang OTP
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">Daftar Dengan</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={() => handleSocialLogin(googleProvider)}
              disabled={isLoading}
              className="flex-1 h-12 border border-border rounded-xl flex items-center justify-center bg-white hover:bg-secondary transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <img src="/images/oauth-google.png" alt="Google" className="w-[42px] h-[42px] object-contain mix-blend-multiply scale-110" />
            </button>
            <button
              onClick={() => handleSocialLogin(facebookProvider)}
              disabled={isLoading}
              className="flex-1 h-12 border border-border rounded-xl flex items-center justify-center bg-white hover:bg-secondary transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <svg className="w-[30px] h-[30px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.37258 0 0 5.37258 0 12C0 17.9895 4.38823 22.954 10.125 23.8542V15.4688H7.07812V12H10.125V9.35625C10.125 6.34875 11.9165 4.6875 14.6576 4.6875C15.9705 4.6875 17.3438 4.92188 17.3438 4.92188V7.875H15.8306C14.34 7.875 13.875 8.80003 13.875 9.74953V12H17.2031L16.6711 15.4688H13.875V23.8542C19.6118 22.954 24 17.9895 24 12C24 5.37258 18.6274 0 12 0Z" fill="#1877F2"/>
                <path d="M16.6711 15.4688L17.2031 12H13.875V9.74953C13.875 8.80003 14.34 7.875 15.8306 7.875H17.3438V4.92188C17.3438 4.92188 15.9705 4.6875 14.6576 4.6875C11.9165 4.6875 10.125 6.34875 10.125 9.35625V12H7.07812V15.4688H10.125V23.8542C10.7381 23.9497 11.3643 24 12 24C12.6357 24 13.2619 23.9497 13.875 23.8542V15.4688H16.6711Z" fill="#FFFFFF"/>
              </svg>
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Masuk
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Role Selection Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-sm rounded-2xl p-6 shadow-xl border border-border"
          >
            <h3 className="text-xl font-bold text-center mb-2">
              Pilih Role Akun
            </h3>
            <p className="text-sm text-center text-muted-foreground mb-6">
              Apakah Anda ingin mendaftar sebagai Pembeli atau Penjual?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelection("Pembeli")}
                className="w-full py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-primary/10 hover:text-primary transition-colors border border-border"
              >
                Saya Pembeli
              </button>
              <button
                onClick={() => handleRoleSelection("Penjual")}
                className="w-full py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-primary/10 hover:text-primary transition-colors border border-border"
              >
                Saya Penjual (Buka Toko)
              </button>
            </div>

            <button
              onClick={() => {
                setShowRoleModal(false);
                setPendingUser(null);
                auth.signOut();
              }}
              className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Batal
            </button>
          </motion.div>
        </div>
      )}

      {/* Email OTP Verification Modal */}
      <EmailOTPModal
        isOpen={showEmailOTP}
        uid={uidToVerify}
        email={email}
        name={name}
        onClose={() => {
          setShowEmailOTP(false);
          auth.signOut();
          navigate("/login");
        }}
        onSuccess={() => {
          setShowEmailOTP(false);
          toast.success("Registrasi dan Verifikasi Email Berhasil!");
          redirectUser(role);
        }}
      />
    </div>
  );
}
