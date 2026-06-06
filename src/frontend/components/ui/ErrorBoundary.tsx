import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// ErrorBoundary — Global error catcher for the React component tree.
//
// Design decisions:
//   • Class component — only class components can implement componentDidCatch.
//   • Accepts an optional `resetKey` prop. When the key changes (e.g. on route
//     change), the boundary resets itself without a full browser reload. This
//     allows users to navigate away from a broken page and have the next page
//     render correctly.
//   • Two recovery actions: "Try Again" (soft reset) and "Go Home" (hard nav).
//   • In development, the raw error stack is shown for debugging.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  /** When this value changes, the error state is automatically cleared. */
  resetKey?: string | number;
  /** Optional custom fallback component to render instead of the default UI. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  /** Called when the previous props differ from the next props. */
  public static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // If resetKey changes and there's an existing error, auto-clear the error.
    // This lets navigating to a new page recover from an error on the old page.
    if (state.hasError) {
      return null; // Don't auto-reset based on props here; we handle it in componentDidUpdate
    }
    return null;
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log in development — production console is stripped by vite.config.ts
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }
    this.setState({ errorInfo });
  }

  /** If resetKey changes, clear the error so the new content can render. */
  public componentDidUpdate(prevProps: Props) {
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  private handleSoftReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    // Hard navigate home — guaranteed clean state
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      // Allow consumers to supply a custom fallback
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-[#EBE5D9] max-w-md w-full">
            {/* Icon */}
            <div className="w-16 h-16 bg-[#FFF5EE] rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-[#A67B5B]" />
            </div>

            {/* Message */}
            <h1 className="text-xl sm:text-2xl font-bold text-[#5C3A21] mb-2">
              Oops, Terjadi Kesalahan
            </h1>
            <p className="text-sm text-[#5C3A21]/65 leading-relaxed mb-6">
              Halaman ini mengalami kendala teknis. Kamu bisa mencoba memuat
              ulang, atau kembali ke beranda.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleSoftReset}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-[#A67B5B] text-[#5C3A21] font-medium rounded-xl hover:bg-[#A67B5B]/10 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Coba Lagi
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#A67B5B] hover:bg-[#8C674C] text-white font-medium rounded-xl transition-colors text-sm"
              >
                <Home className="w-4 h-4" />
                Ke Beranda
              </button>
            </div>

            {/* Dev-only error detail */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-[#A67B5B] cursor-pointer font-medium">
                  Detail Error (Development Only)
                </summary>
                <div className="mt-2 bg-red-50 border border-red-200 p-3 rounded-lg overflow-auto max-h-48">
                  <p className="text-xs text-red-700 font-mono whitespace-pre-wrap break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <p className="text-xs text-red-500 font-mono whitespace-pre-wrap break-all mt-2">
                      {this.state.errorInfo.componentStack}
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
