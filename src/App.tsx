import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/frontend/components/ui/toaster";
import { AuthProvider } from "@/frontend/contexts/AuthContext";
import { CartProvider } from "@/frontend/contexts/CartContext";
import { Toaster as Sonner } from "@/frontend/components/ui/sonner";
import { TooltipProvider } from "@/frontend/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import ErrorBoundary from "@/frontend/components/ui/ErrorBoundary";
import PageTransition from "@/frontend/components/layout/PageTransition";
import { useScrollToTop } from "@/frontend/hooks/useScrollToTop";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import ProtectedRoute from "@/frontend/components/layout/ProtectedRoute";
import PublicRoute from "@/frontend/components/layout/PublicRoute";

// Lazy loading all pages for Route-based Code Splitting (Zero Impact Initial Load)
const Index = lazy(() => import("@/frontend/pages/Index"));
const CategoryPage = lazy(() => import("@/frontend/pages/CategoryPage"));
const ProductDetail = lazy(() => import("@/frontend/pages/ProductDetail"));
const CartPage = lazy(() => import("@/frontend/pages/CartPage"));
const LoginPage = lazy(() => import("@/frontend/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/frontend/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/frontend/pages/ForgotPasswordPage"));
const ProfilePage = lazy(() => import("@/frontend/pages/ProfilePage"));
const SellerUploadProduct = lazy(() => import("@/frontend/pages/SellerUploadProduct"));
const SellerDashboard = lazy(() => import("@/frontend/pages/SellerDashboard"));
const AdminDashboard = lazy(() => import("@/frontend/pages/AdminDashboard"));
const PaymentValidation = lazy(() => import("@/frontend/pages/PaymentValidation"));
const ChatPage = lazy(() => import("@/frontend/pages/ChatPage"));
const Checkout = lazy(() => import("@/frontend/pages/Checkout"));
const QRISPaymentPage = lazy(() => import("@/frontend/pages/QRISPaymentPage"));
const OrderSuccessPage = lazy(() => import("@/frontend/pages/OrderSuccessPage"));
const OrderHistory = lazy(() => import("@/frontend/pages/OrderHistory"));
const NotFound = lazy(() => import("@/frontend/pages/NotFound"));
const SearchPage = lazy(() => import("@/frontend/pages/SearchPage"));

const queryClient = new QueryClient();

// Skeleton loader untuk fallback Suspense
const PageSkeleton = () => (
  <div className="min-h-screen bg-background flex flex-col items-center p-8">
    <div className="w-full max-w-7xl animate-pulse space-y-6">
      <Skeleton className="h-16 w-full rounded-2xl bg-stone-200" />
      <Skeleton className="h-[400px] w-full rounded-2xl bg-stone-200" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-2xl bg-stone-200" />
        ))}
      </div>
    </div>
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();

  useScrollToTop();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes location={location}>
            {/* ── Public Routes ─────────────────────────────────────────── */}
            <Route path="/" element={<PageTransition><Index /></PageTransition>} />
            <Route path="/category/:slug" element={<PageTransition><CategoryPage /></PageTransition>} />
            <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />
            <Route path="/product/:id" element={<PageTransition><ProductDetail /></PageTransition>} />
            <Route path="/login" element={
              <PublicRoute><PageTransition><LoginPage /></PageTransition></PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute><PageTransition><RegisterPage /></PageTransition></PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute><PageTransition><ForgotPasswordPage /></PageTransition></PublicRoute>
            } />

            {/* ── Protected Routes ──────────────────────────────────────── */}
            <Route path="/cart" element={
              <ProtectedRoute><PageTransition><CartPage /></PageTransition></ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute><PageTransition><Checkout /></PageTransition></ProtectedRoute>
            } />
            <Route path="/payment/qris" element={
              <ProtectedRoute><PageTransition><QRISPaymentPage /></PageTransition></ProtectedRoute>
            } />
            <Route path="/order-success" element={
              <ProtectedRoute><PageTransition><OrderSuccessPage /></PageTransition></ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute><PageTransition><OrderHistory /></PageTransition></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><PageTransition><ProfilePage /></PageTransition></ProtectedRoute>
            } />
            <Route path="/seller/upload" element={
              <ProtectedRoute><PageTransition><SellerUploadProduct /></PageTransition></ProtectedRoute>
            } />
            <Route path="/seller/dashboard" element={
              <ProtectedRoute><PageTransition><SellerDashboard /></PageTransition></ProtectedRoute>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute><PageTransition><AdminDashboard /></PageTransition></ProtectedRoute>
            } />
            <Route path="/admin/payments" element={
              <ProtectedRoute><PageTransition><PaymentValidation /></PageTransition></ProtectedRoute>
            } />
            <Route path="/admin/chat" element={
              <ProtectedRoute><PageTransition><ChatPage /></PageTransition></ProtectedRoute>
            } />
            <Route path="/chat/:targetUid" element={
              <ProtectedRoute><PageTransition><ChatPage /></PageTransition></ProtectedRoute>
            } />
            <Route path="/inbox" element={
              <ProtectedRoute><PageTransition><ChatPage /></PageTransition></ProtectedRoute>
            } />

            {/* ── 404 ────────────────────────────────────────────────────── */}
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AnimatePresence>
  );
}

// ── App root ───────────────────────────────────────────────────────────────────
import { auth, db } from "@/backend/config/firebase";

const App = () => {
  if (!auth || !db) {
    return (
      <div className="bg-[#F9F6F0] h-screen flex items-center justify-center text-[#5C3A21]">
        Inisialisasi Sistem...
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <CartProvider>
              <BrowserRouter>
                <AnimatedRoutes />
              </BrowserRouter>
            </CartProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
