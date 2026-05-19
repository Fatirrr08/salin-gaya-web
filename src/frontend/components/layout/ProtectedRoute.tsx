import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/frontend/contexts/AuthContext";

export default function ProtectedRoute({
  children,
  roleRequired,
}: {
  children: React.ReactNode;
  roleRequired?: string;
}) {
  const { currentUser, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0]">
        <div className="w-8 h-8 border-4 border-[#A67B5B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
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
