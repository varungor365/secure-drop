/**
 * Secure Logger Utility
 * 
 * Production-grade logging system that:
 * - Suppresses sensitive data exposure in browser console
 * - Implements structured error reporting
 * - Distinguishes between dev and production environments
 * - Provides audit trail for debugging without security leaks
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
}

class SecureLogger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private readonly maxLogs = 100;

  /**
   * Log information (development only)
   */
  public info(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context || '');
    }
    this.recordLog('info', message, context);
  }

  /**
   * Log warnings (development only)
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || '');
    }
    this.recordLog('warn', message, context);
  }

  /**
   * Log errors securely (never exposes raw error details in production)
   * Production: Generic error message + sanitized context
   * Development: Full error details for debugging
   */
  public error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const sanitizedError = this.sanitizeError(error);
    const entry: LogEntry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      context: context || sanitizedError,
      stack: this.isDevelopment && error instanceof Error ? error.stack : undefined,
    };

    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error instanceof Error ? error : sanitizedError);
    } else {
      // Production: log generic message only
      console.error(`[ERROR] ${message}`);
    }

    this.recordLog(entry.level, message, entry.context);
  }

  /**
   * Sanitize error objects to prevent information leakage
   */
  private sanitizeError(error: unknown): Record<string, unknown> {
    if (!error) return {};

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        // Stack trace only in development
        ...(this.isDevelopment && { stack: error.stack }),
      };
    }

    if (typeof error === 'object') {
      return {
        type: typeof error,
        // Avoid exposing raw object in production
        ...(this.isDevelopment && { data: error }),
      };
    }

    return { type: typeof error };
  }

  /**
   * Record log entry for internal audit trail
   */
  private recordLog(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    this.logs.push({
      level,
      timestamp: new Date().toISOString(),
      message,
      context,
    });

    // Keep only recent logs to prevent memory leaks
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Export logs for debugging (development only)
   */
  public exportLogs(): LogEntry[] {
    return this.isDevelopment ? [...this.logs] : [];
  }

  /**
   * Clear log history
   */
  public clearLogs(): void {
    this.logs = [];
  }
}

export const logger = new SecureLogger();
