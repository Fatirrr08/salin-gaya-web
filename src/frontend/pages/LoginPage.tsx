import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/frontend/components/layout/Navbar";
import {
  auth,
  db,
  googleProvider,
  facebookProvider,
} from "@/backend/config/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
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
import { translateAuthError, SYSTEM_MASTER_PASSWORD } from "@/lib/utils";
import { 
  checkLoginAttempts, 
  recordFailedLogin, 
  clearLoginAttempts, 
  logSecurityEvent, 
  registerActiveSession 
} from "@/frontend/utils/security";
import EmailOTPModal, { generateAndSendEmailOTP } from "@/frontend/components/ui/EmailOTPModal";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [uidToVerify, setUidToVerify] = useState("");
  const [emailToVerify, setEmailToVerify] = useState("");
  const [nameToVerify, setNameToVerify] = useState("");
  const [roleToRedirect, setRoleToRedirect] = useState("");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const navigate = useNavigate();

  const redirectUser = (userRole: string) => {
    if (userRole === "Penjual") {
      navigate("/seller/upload");
    } else {
      navigate("/");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Mohon isi email dan kata sandi");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Cek Anti Brute-Force
      const rateLimit = await checkLoginAttempts(email);
      if (rateLimit.locked) {
        toast.error("Akun Terkunci Sementara", {
          description: `Terlalu banyak percobaan gagal. Silakan coba lagi dalam ${rateLimit.timeRemaining} menit.`,
          duration: 8000,
        });
        setIsLoading(false);
        return;
      }

      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // 2. Berhasil Login -> Clear Attempts, Log, Register Session
      await clearLoginAttempts(email);
      await registerActiveSession(user.uid);
      await logSecurityEvent(user.uid, "LOGIN_SUCCESS", "Login via Email & Password");

      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const userRole = userData.role || "Pembeli";
        toast.success("Berhasil masuk!");
        redirectUser(userRole);
      } else {
        toast.error("Data pengguna tidak ditemukan di database.");
      }
    } catch (error: unknown) {
      const attempts = await recordFailedLogin(email);
      
      // Jika percobaan >= 5, berikan notifikasi WA (jika nomor HP diketahui)
      if (attempts >= 5) {
         toast.error("AKUN TERKUNCI", {
           description: "Terlalu banyak percobaan gagal. Akun dikunci 15 menit.",
         });
      } else {
         toast.error("Gagal masuk", { 
           description: translateAuthError(error) + ` (Percobaan Gagal: ${attempts}/5)` 
         });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: import("firebase/auth").AuthProvider) => {
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
        const userData = snapshot.val();
        const userRole = userData.role || "Pembeli";
        
        // Log & Register Session
        await registerActiveSession(user.uid);
        await logSecurityEvent(user.uid, "LOGIN_SUCCESS", `Login via ${provider.providerId}`);
        
        toast.success("Berhasil masuk!");
        redirectUser(userRole);
      }
    } catch (error: unknown) {
      toast.error("Gagal masuk", { description: translateAuthError(error as Error) });
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
        name: pendingUser.displayName || "Pengguna",
        email: pendingUser.email || "",
        phone: pendingUser.phoneNumber || "",
        role: selectedRole,
        isEmailVerified: true, // Social logins are auto-verified
        createdAt: new Date().toISOString(),
      });
      toast.success("Berhasil masuk!");
      redirectUser(selectedRole);
    } catch (error: unknown) {
      toast.error("Gagal menyimpan role", {
        description: translateAuthError(error as Error),
      });
    } finally {
      setIsLoading(false);
      setPendingUser(null);
    }
  };

  // --- CUSTOM OTP ENGINE ---
  const sendOTPViaProvider = async (phone: string, otpCode: string) => {
    const actionText = "masuk ke akun";
    const message = `*🔐 VERIFIKASI KEAMANAN SALIN GAYA 🔐*

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
          message: message,
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !phonePassword) {
      toast.error("Masukkan nomor HP dan password yang valid");
      return;
    }
    setIsLoading(true);
    try {
      const formattedPhone = phone.startsWith("0")
        ? `+62${phone.slice(1)}`
        : phone.startsWith("+")
          ? phone
          : `+62${phone}`;
      const cleanPhone = formattedPhone.replace(/\+/g, "");

      // Tahap 1: Validasi Lokal via RTDB
      const usersRef = ref(db, "users");
      const phoneQuery = query(
        usersRef,
        orderByChild("phone"),
        equalTo(formattedPhone),
      );
      const userSnapshotQuery = await get(phoneQuery);

      if (!userSnapshotQuery.exists()) {
        toast.error("Nomor belum terdaftar", {
          description: "Silakan Registrasi terlebih dahulu!",
        });
        setIsLoading(false);
        return;
      }

      const userData = Object.values(userSnapshotQuery.val() as any)[0] as any;
      if (userData.originalPassword !== phonePassword) {
        toast.error("Nomor HP atau Password salah");
        setIsLoading(false);
        return;
      }

      // Validasi sukses, buat session dengan Firebase Auth menggunakan real email atau fallback ke ghost email
      const ghostEmail = `${cleanPhone}@salingaya.com`;
      try {
        await signInWithEmailAndPassword(
          auth,
          userData.email,
          phonePassword,
        );
      } catch (e1: unknown) {
        try {
          await signInWithEmailAndPassword(
            auth,
            ghostEmail,
            SYSTEM_MASTER_PASSWORD,
          );
        } catch (authError: unknown) {
          // Fallback untuk akun lama yang didaftarkan sebelum sistem Master Password
          if (
            (authError as any).code === "auth/wrong-password" ||
            (authError as any).code === "auth/invalid-credential"
          ) {
            const oldGhostPassword = `Salingaya+${cleanPhone}`;
            await signInWithEmailAndPassword(auth, ghostEmail, oldGhostPassword);
          } else {
            throw authError; // Lempar error lain ke catch utama
          }
        }
      }

      // Jika berhasil, JANGAN redirect. Lanjut Tahap 2: Pengiriman OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date().getTime() + 5 * 60 * 1000;

      await set(ref(db, `otp_sessions/${cleanPhone}`), {
        code: otpCode,
        expiresAt: expiresAt,
      });

      const isSent = await sendOTPViaProvider(formattedPhone, otpCode);
      if (!isSent) {
        setIsLoading(false);
        return;
      }

      setShowOtpInput(true);
      setCountdown(60);
    } catch (error: unknown) {
      toast.error("Gagal masuk", { description: translateAuthError(error as Error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
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

      // Tahap 3: Verifikasi OTP Lokal
      if (
        String(sessionData.code) !== String(otp) ||
        now > sessionData.expiresAt
      ) {
        toast.error("Kode OTP salah. Silakan periksa kembali WhatsApp Anda.");
        setIsLoading(false);
        return;
      }

      await remove(otpRef);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Sesi login hilang.");
      }

      const dbRef = ref(db);
      const userSnapshot = await get(child(dbRef, `users/${currentUser.uid}`));

      let userRole = "Pembeli";
      let userData: any = {};
      if (userSnapshot.exists()) {
        userData = userSnapshot.val();
        userRole = userData.role || "Pembeli";
      }

      if (userData.isEmailVerified === false && currentUser.email && !currentUser.email.endsWith("@salingaya.com")) {
        setUidToVerify(currentUser.uid);
        setEmailToVerify(userData.email);
        setNameToVerify(userData.name || "Pengguna");
        setRoleToRedirect(userRole);
        await generateAndSendEmailOTP(currentUser.uid, userData.email, userData.name || "Pengguna");
        setShowEmailOTP(true);
        setIsLoading(false);
        return;
      }

      toast.success("Verifikasi berhasil!");
      redirectUser(userRole);
    } catch (error: unknown) {
      toast.error("Terjadi kesalahan", {
        description: translateAuthError(error as Error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Mohon isi email dan password");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // Fetch user data first!
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));
      let userRole = "Pembeli";
      let userData: any = {};
      if (snapshot.exists()) {
        userData = snapshot.val();
        userRole = userData.role || "Pembeli";
      }

      if (!user.emailVerified && user.email && !user.email.endsWith("@salingaya.com")) {
        await auth.signOut();
        toast.error("Login gagal. Email Anda belum diverifikasi. Silakan cek inbox email Anda.");
        setIsLoading(false);
        return;
      }

      toast.success("Berhasil masuk!");
      redirectUser(userRole);
    } catch (error: unknown) {
      toast.error("Gagal masuk", { description: translateAuthError(error as Error) });
    } finally {
      setIsLoading(false);
    }
  };

  // Validasi lokal pre-submit
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const isPhoneValid = /^[0-9]{9,15}$/.test(phone);
  const isPhonePasswordValid = phonePassword.length >= 6;

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
            Masuk
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Selamat datang kembali di Salin Gaya
          </p>

          <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-xl mt-6">
            <button
              onClick={() => {
                setLoginMethod("email");
                setShowOtpInput(false);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginMethod === "email" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Email
            </button>
            <button
              onClick={() => setLoginMethod("phone")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${loginMethod === "phone" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Nomor HP
            </button>
          </div>

          {loginMethod === "email" ? (
            <form className="mt-4 space-y-4" onSubmit={handleEmailLogin}>
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
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                />
              </div>
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline bg-transparent border-none p-0 cursor-pointer inline-block"
                >
                  Lupa password?
                </Link>
              </div>
              <button
                type="submit"
                disabled={isLoading || !isEmailValid || !isPasswordValid}
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? "Memproses..." : "Masuk"}
              </button>
            </form>
          ) : (
            <form
              className="mt-4 space-y-4"
              onSubmit={showOtpInput ? handleVerifyOtp : handleSendOtp}
            >
              {!showOtpInput ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Nomor Handphone
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
                      placeholder="••••••••"
                      value={phonePassword}
                      onChange={(e) => setPhonePassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
                    />
                  </div>
                  <div className="text-right">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline bg-transparent border-none p-0 cursor-pointer inline-block"
                    >
                      Lupa password?
                    </Link>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
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
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      disabled={isLoading}
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none text-xl tracking-[0.5em] text-center font-bold font-mono transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isLoading ||
                  (showOtpInput
                    ? otp.length !== 6
                    : !isPhoneValid || !isPhonePasswordValid)
                }
                className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading
                  ? "Memproses..."
                  : showOtpInput
                    ? "Verifikasi OTP"
                    : "Masuk"}
              </button>

              {showOtpInput && (
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
              )}
            </form>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">Masuk Dengan</span>
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
            Belum punya akun?{" "}
            <Link
              to="/register"
              className="text-primary font-medium hover:underline"
            >
              Daftar
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
              Apakah Anda ingin melanjutkan sebagai Pembeli atau Penjual?
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
        email={emailToVerify}
        name={nameToVerify}
        onClose={() => {
          setShowEmailOTP(false);
          auth.signOut();
        }}
        onSuccess={() => {
          setShowEmailOTP(false);
          redirectUser(roleToRedirect);
        }}
      />
    </div>
  );
}
