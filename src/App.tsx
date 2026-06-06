import React, { Suspense, lazy } from "react";
import { Toaster } from "@/frontend/components/ui/toaster";
import { AuthProvider } from "@/frontend/contexts/AuthContext";
import { CartProvider } from "@/frontend/contexts/CartContext";
import { Toaster as Sonner } from "@/frontend/components/ui/sonner";
import { TooltipProvider } from "@/frontend/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import ErrorBoundary from "@/frontend/components/ui/ErrorBoundary";
import PageTransition from "@/frontend/components/layout/PageTransition";
import { useScrollToTop } from "@/frontend/hooks/useScrollToTop";
import ProtectedRoute from "@/frontend/components/layout/ProtectedRoute";
import PublicRoute from "@/frontend/components/layout/PublicRoute";
import LoadingSpinner from "@/frontend/components/ui/LoadingSpinner";

// ── Lazy with Retry ──────────────────────────────────────────────────────────
// Resolves ChunkLoadError (White Screen of Death) by attempting a hard reload
// ONCE if a chunk fails to fetch due to new deployments or network drops.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithRetry(componentImport: () => Promise<any>) {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.localStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error: unknown) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        const err = error as Error;
        const isChunkLoadError = 
          err?.message?.toLowerCase().includes('failed to fetch dynamically imported module') || 
          err?.message?.toLowerCase().includes('chunk') ||
          err?.name === 'ChunkLoadError';
        
        if (isChunkLoadError) {
          window.localStorage.setItem('page-has-been-force-refreshed', 'true');
          window.location.reload();
          // Return pending promise to prevent React from rendering ErrorBoundary during reload
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return new Promise<{ default: React.ComponentType<any> }>(() => {});
        }
      }
      throw error;
    }
  });
}

// ── Lazy-loaded pages ────────────────────────────────────────────────────────
// "Light" pages — appear quickly, minimal JS
const Index            = lazyWithRetry(() => import("@/frontend/pages/Index"));
const CategoryPage     = lazyWithRetry(() => import("@/frontend/pages/CategoryPage"));
const SearchPage       = lazyWithRetry(() => import("@/frontend/pages/SearchPage"));
const ProductDetail    = lazyWithRetry(() => import("@/frontend/pages/ProductDetail"));
const NotFound         = lazyWithRetry(() => import("@/frontend/pages/NotFound"));

// Auth pages
const LoginPage          = lazyWithRetry(() => import("@/frontend/pages/LoginPage"));
const RegisterPage       = lazyWithRetry(() => import("@/frontend/pages/RegisterPage"));
const ForgotPasswordPage = lazyWithRetry(() => import("@/frontend/pages/ForgotPasswordPage"));

// User pages
const ProfilePage      = lazyWithRetry(() => import("@/frontend/pages/ProfilePage"));
const OrderHistoryPage = lazyWithRetry(() => import("@/frontend/pages/OrderHistoryPage"));
const OrderSuccessPage = lazyWithRetry(() => import("@/frontend/pages/OrderSuccessPage"));
const CartPage         = lazyWithRetry(() => import("@/frontend/pages/CartPage"));

// "Heavy" pages — loaded on demand
const Checkout          = lazyWithRetry(() => import(/* webpackChunkName: "checkout" */        "@/frontend/pages/Checkout"));
const QRISPaymentPage   = lazyWithRetry(() => import(/* webpackChunkName: "qris" */            "@/frontend/pages/QRISPaymentPage"));
const PaymentValidation = lazyWithRetry(() => import(/* webpackChunkName: "payment-admin" */   "@/frontend/pages/PaymentValidation"));
const AdminDashboard    = lazyWithRetry(() => import(/* webpackChunkName: "admin-dashboard" */ "@/frontend/pages/AdminDashboard"));
const Inbox             = lazyWithRetry(() => import(/* webpackChunkName: "inbox" */           "@/frontend/pages/Inbox"));

// Seller pages
const SellerUploadProduct = lazyWithRetry(() => import(/* webpackChunkName: "seller-upload" */ "@/frontend/pages/SellerUploadProduct"));
const SellerDashboard     = lazyWithRetry(() => import(/* webpackChunkName: "seller-dash" */   "@/frontend/pages/SellerDashboard"));

// ── React Query Client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedRoutes
//
// CRITICAL FIX — ErrorBoundary must be STABLE (not re-keyed on route change).
// Previously: <ErrorBoundary key={location.pathname}> caused the Suspense
// boundary to be unmounted/remounted mid-chunk-load → white screen.
//
// Fix:
//   • ErrorBoundary sits OUTSIDE AnimatePresence (stable, never re-keyed).
//   • AnimatePresence + Routes handle animation, keyed by location.key
//     (React Router unique key per navigation, not just pathname).
//   • Each lazy page is wrapped in its own per-route Suspense so the
//     global LoadingSpinner is shown during chunk download, then
//     PageTransition animates the fully-loaded content in.
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedRoutes() {
  const location = useLocation();
  useScrollToTop();

  return (
    // ONE stable ErrorBoundary that never resets on navigation
    <ErrorBoundary>
      <PageTransition key={location.pathname}>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes location={location}>
          {/* ── Public ── */}
          <Route path="/" element={<Index />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />

          {/* ── Auth ── */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

          {/* ── Buyer (Protected) ── */}
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/payment/qris" element={<ProtectedRoute><QRISPaymentPage /></ProtectedRoute>} />
          <Route path="/order-success" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* ── Seller (Protected) ── */}
          <Route path="/seller/upload" element={<ProtectedRoute><SellerUploadProduct /></ProtectedRoute>} />
          <Route path="/seller/dashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />

          {/* ── Admin (Protected) ── */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute><PaymentValidation /></ProtectedRoute>} />

          {/* ── Inbox C2C ── */}
          <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
          <Route path="/inbox/:roomId" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />

          {/* ── Fallback ── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </PageTransition>
    </ErrorBoundary>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────
import { auth, db } from "@/backend/config/firebase";

const App = () => {
  if (!auth || !db) {
    return (
      <div className="bg-[#F9F6F0] h-screen flex items-center justify-center text-[#5C3A21]">
        <LoadingSpinner label="Inisialisasi Sistem..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner richColors closeButton position="top-right" />
          <AuthProvider>
            <CartProvider>
              <BrowserRouter>
                <div className="w-full overflow-x-hidden">
                  <AnimatedRoutes />
                </div>
              </BrowserRouter>
            </CartProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
