"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI — receives error and reset function */
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
  /** Label shown in the default fallback (e.g., "エディタ", "データベース") */
  label?: string;
  /** Called when an error is caught — use for logging (e.g., Sentry) */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * React Error Boundary — catches render errors in child components and
 * displays a recovery UI instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary label="エディタ">
 *     <Editor ... />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;

    if (error) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback({ error, reset: this.reset });
      }

      // Default fallback
      return (
        <DefaultErrorFallback
          error={error}
          label={this.props.label}
          onReset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

// --- Default fallback UI ---

function DefaultErrorFallback({
  error,
  label,
  onReset,
}: {
  error: Error;
  label?: string;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-6 py-10">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle size={20} className="text-red-500" />
      </div>

      <div className="text-center">
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
          {label ? `${label}でエラーが発生しました` : "エラーが発生しました"}
        </h3>
        <p className="mt-1 max-w-[400px] text-[12px] text-[var(--text-tertiary)]">
          {error.message || "予期しないエラーが発生しました。"}
        </p>
      </div>

      <button
        onClick={onReset}
        className="mt-1 flex items-center gap-1.5 rounded-md bg-[var(--accent-blue)] px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <RefreshCw size={12} />
        再試行
      </button>

      {process.env.NODE_ENV === "development" && (
        <details className="mt-2 w-full max-w-[500px]">
          <summary className="cursor-pointer text-[11px] text-[var(--text-tertiary)]">
            スタックトレース
          </summary>
          <pre className="mt-1 max-h-[200px] overflow-auto rounded bg-[var(--bg-primary)] p-2 text-[10px] text-[var(--text-secondary)]">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
