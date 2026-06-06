import React, { useState } from "react";
import { verifyBeforeUpdateEmail } from "firebase/auth";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/frontend/contexts/AuthContext";

interface UpdateEmailFormProps {
  currentEmail: string;
}

export default function UpdateEmailForm({
  currentEmail,
}: UpdateEmailFormProps) {
  const { currentUser } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (!currentUser) return null;

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === currentEmail) return;

    setIsUpdating(true);
    setSuccessMessage("");

    try {
      await verifyBeforeUpdateEmail(currentUser, newEmail);
      setSuccessMessage(
        "Tautan verifikasi telah dikirim ke email baru Anda. Silakan cek kotak masuk Anda.",
      );
      toast.success("Verifikasi email terkirim", {
        description: "Silakan cek kotak masuk pada email baru Anda.",
      });
      setNewEmail(""); // Reset input
    } catch (error: unknown) {
      const err = error as any;
      switch (err.code) {
        case "auth/requires-recent-login":
          toast.error("Sesi Berakhir", {
            description:
              "Sesi Anda sudah terlalu lama demi keamanan. Silakan logout dan login kembali sebelum mengubah alamat email.",
            duration: 6000,
          });
          break;
        case "auth/email-already-in-use":
          toast.error("Gagal", {
            description: "Alamat email ini sudah digunakan oleh akun lain.",
          });
          break;
        case "auth/invalid-email":
          toast.error("Gagal", {
            description: "Format alamat email tidak valid.",
          });
          break;
        default:
          toast.error("Terjadi Kesalahan", {
            description:
              (err as Error).message || "Gagal mengirimkan tautan verifikasi email.",
          });
          break;
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border mt-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg">Pembaruan Email</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Email saat ini:{" "}
            <span className="font-medium text-foreground">{currentEmail}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleUpdateEmail} className="space-y-4 max-w-md">
        <div className="space-y-2">
          <label
            htmlFor="newEmail"
            className="text-sm font-medium text-foreground flex items-center gap-2"
          >
            <Mail className="w-4 h-4 text-muted-foreground" />
            Alamat Email Baru
          </label>
          <div className="flex gap-3">
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Masukkan email baru..."
              disabled={isUpdating}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
            <button
              type="submit"
              disabled={
                isUpdating || !newEmail.trim() || newEmail === currentEmail
              }
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 min-w-[140px]"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses
                </>
              ) : (
                "Simpan Email"
              )}
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg p-4 flex items-start gap-3 mt-4">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-300">
              {successMessage}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
