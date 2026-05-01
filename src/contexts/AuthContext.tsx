import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { ref, get, child } from "firebase/database";

type Role = "Pembeli" | "Penjual" | null;

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Fetch role from RTDB
        try {
          const dbRef = ref(db);
          const snapshot = await get(child(dbRef, `users/${user.uid}`));
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setRole(userData.role || "Pembeli");
          } else {
            // Default if not found in RTDB for some reason
            setRole("Pembeli");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole("Pembeli");
        }
      } else {
        setCurrentUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
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

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
