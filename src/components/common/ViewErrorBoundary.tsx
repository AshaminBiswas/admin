import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  onResetView?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ViewErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ViewErrorBoundary] Uncaught view error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onResetView) {
      this.props.onResetView();
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "";
      const isChunkError =
        errorMsg.includes("dynamically imported module") ||
        errorMsg.includes("Failed to load module script") ||
        errorMsg.includes("Strict MIME type checking") ||
        errorMsg.includes("Loading chunk");

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl p-6 shadow-xl text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#FAFAFA]">
                {isChunkError ? "Console Update Detected" : "View Loading Error"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#A1A1AA] leading-relaxed">
                {isChunkError
                  ? "A newer version of the PRC Hardware Console was recently published. Reloading will apply the latest assets."
                  : "An unexpected error occurred while rendering this module. You can reload or return to dashboard."}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-xs shadow-lg shadow-[#8B5CF6]/25 transition active:scale-95"
              >
                <RefreshCw size={14} className="animate-spin-once" />
                <span>Reload Console</span>
              </button>

              {this.props.onResetView && (
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-[#3F3F46] text-slate-700 dark:text-[#FAFAFA] font-medium text-xs transition active:scale-95"
                >
                  <Home size={14} />
                  <span>Go to Dashboard</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
