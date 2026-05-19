import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F9F6F0] flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-[#EBE5D9] max-w-md w-full">
            <div className="w-16 h-16 bg-[#F9F6F0] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-[#A67B5B]" />
            </div>
            <h1 className="text-2xl font-bold text-[#5C3A21] mb-2">Ups, Terjadi Kesalahan</h1>
            <p className="text-[#5C3A21]/70 mb-6">
              Maaf, sistem mengalami kendala teknis saat memuat halaman ini.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#A67B5B] hover:bg-[#8C674C] text-white font-medium rounded-xl transition-colors"
            >
              Muat Ulang Halaman
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mt-6 text-left bg-red-50 p-4 rounded-lg overflow-auto">
                <p className="text-xs text-red-600 font-mono whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
