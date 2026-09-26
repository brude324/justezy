import { logger, sanitizeLogData } from "@/lib/logger";

export interface ErrorReportContext {
  userId?: string;
  tenantId?: string;
  requestId?: string;
  route?: string;
  digest?: string;
  [key: string]: unknown;
}

export type ErrorListener = (error: Error, context: ErrorReportContext, incidentId: string) => void;

class ErrorReporter {
  private listeners: ErrorListener[] = [];

  /**
   * Registers a third-party error monitoring provider listener (e.g. Sentry, Datadog, CloudWatch).
   */
  registerListener(listener: ErrorListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Captures an exception, logs it safely via structured logger, and broadcasts to registered listeners.
   * Returns a sanitized incident reference ID that can be safely displayed to users for support tracking.
   */
  captureException(error: unknown, context: ErrorReportContext = {}): string {
    const incidentId = context.digest || `inc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const errObj = error instanceof Error ? error : new Error(String(error));

    const sanitizedContext = sanitizeLogData({
      ...context,
      incidentId,
    }) as ErrorReportContext;

    logger.error(`[ErrorReporter] ${errObj.name}: ${errObj.message}`, {
      ...sanitizedContext,
      errorName: errObj.name,
      errorMessage: errObj.message,
    });

    // Notify registered observability integrations
    for (const listener of this.listeners) {
      try {
        listener(errObj, sanitizedContext, incidentId);
      } catch (listenerErr) {
        // Prevent monitoring listener crashes from bubbling
        logger.warn("Error monitoring listener failed", {
          listenerError: listenerErr instanceof Error ? listenerErr.message : "Unknown",
        });
      }
    }

    return incidentId;
  }
}

export const errorReporter = new ErrorReporter();
