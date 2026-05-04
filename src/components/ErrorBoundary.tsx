import React, { ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Error Boundary Component
 * 
 * Catches React component errors and prevents app crashes.
 * Displays user-friendly error UI while logging technical details securely.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: 'An unexpected error occurred. Please refresh the page.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('React component error caught', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            className="flex min-h-screen items-center justify-center"
            style={{ background: "rgb(12,16,28)" }}
          >
            <div
              className="flex flex-col gap-5 p-8 rounded-2xl"
              style={{
                maxWidth: 420,
                width: "100%",
                background: "rgba(16,22,40,0.9)",
                border: "1px solid rgba(248,113,113,0.25)",
                boxShadow: "0 0 40px rgba(248,113,113,0.08), 0 24px 48px rgba(0,0,0,0.4)",
              }}
            >
              <h2
                className="font-bold"
                style={{ color: "rgb(248,113,113)", fontSize: 20 }}
              >
                Oops! Something went wrong
              </h2>
              <p style={{ color: "rgb(130,150,175)", fontSize: 14, lineHeight: 1.6 }}>
                {this.state.errorMessage}
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "rgb(248,113,113)",
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
