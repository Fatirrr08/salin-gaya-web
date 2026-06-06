import { ref, get, set, push, serverTimestamp, remove } from "firebase/database";
import { db } from "@/backend/config/firebase";

// Helper to encode email for RTDB paths
export const encodeEmail = (email: string) => {
  return email.replace(/\./g, ",");
};

// --- RATE LIMITING (ANTI BRUTE-FORCE) ---
export const checkLoginAttempts = async (email: string): Promise<{ locked: boolean; timeRemaining?: number }> => {
  try {
    const encodedEmail = encodeEmail(email);
    const snapshot = await get(ref(db, `login_attempts/${encodedEmail}`));
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.attempts >= 5) {
        const lockUntil = data.lastAttempt + 15 * 60 * 1000; // 15 minutes lockout
        const now = new Date().getTime();
        
        if (now < lockUntil) {
          return { locked: true, timeRemaining: Math.ceil((lockUntil - now) / 60000) };
        } else {
          // Lock expired, reset
          await set(ref(db, `login_attempts/${encodedEmail}`), null);
        }
      }
    }
  } catch (error) {
    console.warn("RTDB login_attempts check failed (likely permission denied):", error);
  }
  return { locked: false };
};

export const recordFailedLogin = async (email: string) => {
  try {
    const encodedEmail = encodeEmail(email);
    const attemptRef = ref(db, `login_attempts/${encodedEmail}`);
    const snapshot = await get(attemptRef);
    
    const now = new Date().getTime();
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      await set(attemptRef, {
        attempts: data.attempts + 1,
        lastAttempt: now
      });
      return data.attempts + 1;
    } else {
      await set(attemptRef, {
        attempts: 1,
        lastAttempt: now
      });
      return 1;
    }
  } catch (error) {
    console.warn("RTDB recordFailedLogin failed:", error);
    return 1;
  }
};

export const clearLoginAttempts = async (email: string) => {
  try {
    const encodedEmail = encodeEmail(email);
    await set(ref(db, `login_attempts/${encodedEmail}`), null);
  } catch (error) {
    console.warn("RTDB clearLoginAttempts failed:", error);
  }
};

// --- AUDIT TRAIL ---
export type SecurityAction = "LOGIN_SUCCESS" | "LOGIN_FAILED" | "PASSWORD_CHANGED" | "EMAIL_CHANGED" | "PHONE_CHANGED" | "2FA_ENABLED" | "2FA_DISABLED";

export const logSecurityEvent = async (uid: string, action: SecurityAction, details: string) => {
  if (!uid) return;
  const userAgent = navigator.userAgent;
  try {
    const logRef = push(ref(db, `security_logs/${uid}`));
    
    await set(logRef, {
      action,
      details,
      userAgent,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.warn("RTDB logSecurityEvent failed:", error);
  }
};

// --- ACTIVE SESSIONS ---
export const registerActiveSession = async (uid: string) => {
  if (!uid) return null;
  try {
    const sessionId = push(ref(db, `user_sessions/${uid}`)).key;
    if (!sessionId) return null;
    
    const userAgent = navigator.userAgent;
    
    await set(ref(db, `user_sessions/${uid}/${sessionId}`), {
      userAgent,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });
    
    // Store session id in local storage to identify current session
    localStorage.setItem("current_session_id", sessionId);
    return sessionId;
  } catch (error) {
    console.warn("RTDB registerActiveSession failed:", error);
    return null;
  }
};

export const revokeSession = async (uid: string, sessionId: string) => {
  if (!uid || !sessionId) return;
  try {
    await remove(ref(db, `user_sessions/${uid}/${sessionId}`));
  } catch (error) {
    console.warn("RTDB revokeSession failed:", error);
  }
};
