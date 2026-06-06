import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db, dbFirestore } from "@/backend/config/firebase";
import { ref, get, child } from "firebase/database";
import TwoFactorScreen from "@/frontend/components/auth/TwoFactorScreen";
import { initializePresence } from "@/frontend/services/presenceService";

type Role = "Pembeli" | "Penjual" | "Admin" | null;

interface AuthContextType {
  currentUser: User | null;
  role: Role;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userDataFor2FA, setUserDataFor2FA] = useState<{ phone: string; name: string } | null>(null);

  useEffect(() => {
    // 1. Matikan Loading Tak Berujung (Ultimatum)
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);


    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeoutId);
      if (user) {
        setCurrentUser(user);
        initializePresence(user.uid);
        // Fetch role from RTDB
        try {
          const dbRef = ref(db);
          const snapshot = await get(child(dbRef, `users/${user.uid}`));
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const currentRole = userData.role || "Pembeli";
            setRole(currentRole);
            
            if (currentRole === "Admin" || currentRole === "admin") {
              import("firebase/firestore").then(({ doc, setDoc }) => {
                setDoc(doc(dbFirestore, "chats", "admin_info"), {
                  uid: user.uid,
                  name: userData.name || "Admin",
                  email: userData.email || "",
                  participants: ["ALL"]
                }, { merge: true }).catch(e => console.warn("Could not update admin data in firestore", e));
              });
            }

            // Check 2FA
            const is2FAEnabled = userData.twoFactorEnabled === true;
            const isVerifiedInSession = sessionStorage.getItem(`2faVerified_${user.uid}`) === "true";
            
            if (is2FAEnabled && !isVerifiedInSession) {
              setUserDataFor2FA({ phone: userData.phone, name: userData.name });
              setRequires2FA(true);
            }
          } else {
            // Default if not found in RTDB for some reason
            setRole("Pembeli");
          }
        } catch (error) {
          setRole("Pembeli");
        }
      } else {
        setCurrentUser(null);
        setRole(null);
        setRequires2FA(false);
        setUserDataFor2FA(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    currentUser,
    role,
    loading,
    logout,
  };

  const handle2FAVerified = () => {
    if (currentUser) {
      sessionStorage.setItem(`2faVerified_${currentUser.uid}`, "true");
      setRequires2FA(false);
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="h-screen bg-[#F9F6F0] flex items-center justify-center text-[#5C3A21]">
          Memuat Salin Gaya...
        </div>
      ) : requires2FA && userDataFor2FA ? (
        <TwoFactorScreen 
          phone={userDataFor2FA.phone} 
          userName={userDataFor2FA.name} 
          onVerified={handle2FAVerified} 
        />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
