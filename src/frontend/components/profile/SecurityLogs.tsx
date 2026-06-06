import React, { useState, useEffect } from "react";
import { ref as dbRef, get, query, limitToLast } from "firebase/database";
import { db } from "@/backend/config/firebase";
import { Shield, FileWarning, KeyRound, Mail, MonitorSmartphone, Smartphone } from "lucide-react";
import { useAuth } from "@/frontend/contexts/AuthContext";

type SecurityEvent = {
  id: string;
  action: string;
  details: string;
  userAgent: string;
  timestamp: number;
};

export default function SecurityLogs() {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchLogs = async () => {
      try {
        // Limit to last 20 logs
        const logsQuery = query(dbRef(db, `security_logs/${currentUser.uid}`), limitToLast(20));
        const snapshot = await get(logsQuery);
        
        if (snapshot.exists()) {
          const raw = snapshot.val();
          const parsed: SecurityEvent[] = Object.keys(raw).map((key) => ({
            id: key,
            action: raw[key].action,
            details: raw[key].details,
            userAgent: raw[key].userAgent,
            timestamp: raw[key].timestamp || 0,
          }));
          // Sort newest first
          parsed.sort((a, b) => b.timestamp - a.timestamp);
          setLogs(parsed);
        }
      } catch (error) {
        console.error("Failed to fetch security logs", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLogs();
  }, [currentUser]);

  const getActionConfig = (action: string) => {
    switch (action) {
      case "LOGIN_SUCCESS": return { icon: MonitorSmartphone, color: "text-blue-600 bg-blue-100", label: "Login Berhasil" };
      case "LOGIN_FAILED": return { icon: FileWarning, color: "text-red-600 bg-red-100", label: "Login Gagal" };
      case "PASSWORD_CHANGED": return { icon: KeyRound, color: "text-purple-600 bg-purple-100", label: "Ubah Sandi" };
      case "EMAIL_CHANGED": return { icon: Mail, color: "text-orange-600 bg-orange-100", label: "Ubah Email" };
      case "PHONE_CHANGED": return { icon: Smartphone, color: "text-teal-600 bg-teal-100", label: "Ubah Nomor" };
      case "2FA_ENABLED": return { icon: Shield, color: "text-green-600 bg-green-100", label: "2FA Aktif" };
      case "2FA_DISABLED": return { icon: Shield, color: "text-yellow-600 bg-yellow-100", label: "2FA Nonaktif" };
      case "SESSION_REVOKED": return { icon: FileWarning, color: "text-gray-600 bg-gray-100", label: "Sesi Dicabut" };
      case "ALL_SESSIONS_REVOKED": return { icon: FileWarning, color: "text-red-600 bg-red-100", label: "Semua Sesi Dicabut" };
      default: return { icon: Shield, color: "text-gray-600 bg-gray-100", label: "Aktivitas" };
    }
  };

  if (isLoading) return <div className="h-24 animate-pulse bg-secondary rounded-lg w-full mt-4"></div>;

  return (
    <div className="space-y-4 pt-4 border-t border-border mt-4">
      <div>
        <h3 className="font-bold text-lg">Riwayat Keamanan</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          Log aktivitas terbaru terkait keamanan akun Anda.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {logs.length > 0 ? (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const config = getActionConfig(log.action);
              const Icon = config.icon;
              return (
                <div key={log.id} className="p-4 flex gap-4 hover:bg-secondary/50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{config.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 truncate font-mono">
                      {log.userAgent}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0 text-right">
                    {new Date(log.timestamp).toLocaleString('id-ID', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Belum ada riwayat aktivitas keamanan.
          </div>
        )}
      </div>
    </div>
  );
}
