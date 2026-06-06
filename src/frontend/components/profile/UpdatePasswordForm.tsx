import React, { useState } from "react";
import { updatePassword } from "firebase/auth";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/frontend/contexts/AuthContext";

export default function UpdatePasswordForm() {
  const { currentUser } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  if (!currentUser) return null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password terlalu pendek", {
        description: "Password harus terdiri dari minimal 6 karakter.",
      });
      return;
    }

    setIsUpdating(true);

    try {
      await updatePassword(currentUser, newPassword);
      toast.success("Berhasil!", {
        description: "Password akun Anda telah berhasil diubah.",
      });
      setNewPassword(""); // Reset input
    } catch (error: unknown) {
      toast.error("Gagal mengubah password", {
        description: (error as Error).message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border mt-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg">Pembaruan Password</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gunakan password yang kuat dengan kombinasi huruf dan angka.
          </p>
        </div>
      </div>

      <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
        <div className="space-y-2">
          <label
            htmlFor="newPassword"
            className="text-sm font-medium text-foreground flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            Password Baru
          </label>
          <div className="flex gap-3">
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter..."
              disabled={isUpdating}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={isUpdating || newPassword.length < 6}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 min-w-[140px]"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan
                </>
              ) : (
                "Ubah Password"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
