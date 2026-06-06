import { db } from "@/backend/config/firebase";
import { ref, onValue, onDisconnect, set, serverTimestamp } from "firebase/database";
import { useEffect, useState } from "react";

export interface PresenceState {
  state: "online" | "offline";
  last_changed: number;
}

/**
 * Initializes presence tracking for the given user.
 * Call this once when the user logs in.
 */
export function initializePresence(uid: string) {
  const userStatusRef = ref(db, `/status/${uid}`);
  const connectedRef = ref(db, ".info/connected");

  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === false) {
      return;
    }
    
    // When I disconnect, update the last time I was seen online
    onDisconnect(userStatusRef).set({
      state: "offline",
      last_changed: serverTimestamp(),
    }).then(() => {
      // When I successfully connect, set my status to online
      set(userStatusRef, {
        state: "online",
        last_changed: serverTimestamp(),
      });
    });
  });
}

/**
 * React Hook to subscribe to a user's presence state.
 */
export function usePresence(uid?: string) {
  const [presence, setPresence] = useState<PresenceState | null>(null);

  useEffect(() => {
    if (!uid) return;
    
    const userStatusRef = ref(db, `/status/${uid}`);
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      if (snapshot.exists()) {
        setPresence(snapshot.val() as PresenceState);
      } else {
        setPresence({ state: "offline", last_changed: Date.now() });
      }
    });

    return () => unsubscribe(); // unsubscribe function from RTDB
  }, [uid]);

  return presence;
}

/**
 * Format the presence state for UI (e.g. "🟢 Online" or "Terakhir dilihat...")
 */
export function formatPresence(presence: PresenceState | null): string {
  if (!presence) return "Memuat status...";
  if (presence.state === "online") return "Online";
  
  const date = new Date(presence.last_changed);
  const now = new Date();
  
  // If today
  if (date.toDateString() === now.toDateString()) {
    return `Terakhir dilihat hari ini pukul ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  }
  
  // If yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Terakhir dilihat kemarin pukul ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  }
  
  return `Terakhir dilihat ${date.toLocaleDateString("id-ID")} ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
}
