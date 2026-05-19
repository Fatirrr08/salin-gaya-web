import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/frontend/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
