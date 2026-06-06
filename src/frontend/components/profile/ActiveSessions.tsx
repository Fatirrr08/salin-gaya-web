import React, { useState, useEffect } from "react";
import { ref as dbRef, get } from "firebase/database";
import { db } from "@/backend/config/firebase";
import { toast } from "sonner";
import { MonitorSmartphone, XCircle, LogOut } from "lucide-react";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { revokeSession, logSecurityEvent } from "@/frontend/utils/security";

export default function ActiveSessions() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<{ id: string; userAgent: string; lastActive: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const currentSessionId = localStorage.getItem("current_session_id");

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchSessions = async () => {
      try {
        const snapshot = await get(dbRef(db, `user_sessions/${currentUser.uid}`));
        if (snapshot.exists()) {
          const raw = snapshot.val();
          const parsed = Object.keys(raw).map((key) => ({
            id: key,
            userAgent: raw[key].userAgent || "Perangkat Tidak Dikenal",
            lastActive: raw[key].lastActive || 0,
          }));
          // Sort by newest
          parsed.sort((a, b) => b.lastActive - a.lastActive);
          setSessions(parsed);
        } else {
          setSessions([]);
        }
      } catch (error) {
        console.error("Failed to fetch sessions", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSessions();
  }, [currentUser]);

  const handleRevoke = async (sessionId: string) => {
    if (!currentUser) return;
    
    setIsRevoking(true);
    try {
      await revokeSession(currentUser.uid, sessionId);
      await logSecurityEvent(currentUser.uid, "SESSION_REVOKED", "Sesi perangkat dihapus secara paksa");
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success("Sesi berhasil diakhiri.");
    } catch (error) {
      toast.error("Gagal mengakhiri sesi.");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!currentUser || !currentSessionId) return;
    
    if (!window.confirm("Yakin ingin mengeluarkan semua perangkat lain dari akun Anda?")) return;
    
    setIsRevoking(true);
    try {
      const others = sessions.filter(s => s.id !== currentSessionId);
      for (const session of others) {
        await revokeSession(currentUser.uid, session.id);
      }
      await logSecurityEvent(currentUser.uid, "ALL_SESSIONS_REVOKED", "Semua perangkat lain dikeluarkan");
      setSessions(prev => prev.filter(s => s.id === currentSessionId));
      toast.success("Semua perangkat lain telah dikeluarkan dari akun Anda.");
    } catch (error) {
      toast.error("Gagal mengakhiri semua sesi.");
    } finally {
      setIsRevoking(false);
    }
  };

  const parseUserAgent = (ua: string) => {
    let browser = "Browser";
    let os = "OS";
    
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edge")) browser = "Edge";

    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "MacOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";

    return `${browser} pada ${os}`;
  };

  if (isLoading) return <div className="h-24 animate-pulse bg-secondary rounded-lg w-full mt-4"></div>;

  const otherSessionsCount = sessions.filter(s => s.id !== currentSessionId).length;

  return (
    <div className="space-y-4 pt-4 border-t border-border mt-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg">Perangkat Aktif</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
            Daftar perangkat yang sedang masuk ke akun Anda. Jika Anda melihat perangkat yang tidak dikenali, segera keluarkan perangkat tersebut.
          </p>
        </div>
        {otherSessionsCount > 0 && (
          <button
            onClick={handleRevokeAllOthers}
            disabled={isRevoking}
            className="hidden sm:flex text-sm text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg items-center gap-1 font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluarkan Semua
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.map(session => {
          const isCurrent = session.id === currentSessionId;
          const label = parseUserAgent(session.userAgent);
          
          return (
            <div key={session.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary text-muted-foreground flex items-center justify-center">
                  <MonitorSmartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground flex items-center gap-2">
                    {label}
                    {isCurrent && (
                      <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-bold">
                        PERANGKAT INI
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Terakhir aktif: {new Date(session.lastActive).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
              
              {!isCurrent && (
                <button
                  onClick={() => handleRevoke(session.id)}
                  disabled={isRevoking}
                  className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Keluarkan Perangkat"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          );
        })}
        {sessions.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-4">Tidak ada sesi aktif yang tercatat.</p>
        )}
      </div>
    </div>
  );
}
