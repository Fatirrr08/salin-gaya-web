import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children, roleRequired }: { children: React.ReactNode, roleRequired?: string }) {
  const { currentUser, role } = useAuth();
  const location = useLocation();

  if (currentUser === undefined) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>; // Still loading auth state
  }

  if (!currentUser) {
    // Not logged in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roleRequired && role && role !== roleRequired) {
    // Logged in but wrong role
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
