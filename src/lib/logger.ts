export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  action?: string;
  path?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "session",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "clerk_secret_key",
  "database_url",
  "credential",
  "privatekey",
]);

/**
 * Recursively deep-redacts sensitive keys from log objects.
 */
export function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Basic check for bearer token strings in raw string values
    if (/bearer\s+[a-zA-Z0-9._-]+/i.test(data)) {
      return data.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [REDACTED]");
    }
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: process.env.NODE_ENV === "production" ? undefined : data.stack,
    };
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || Array.from(SENSITIVE_KEYS).some((s) => lowerKey.includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeLogData(value);
    }
  }

  return sanitized;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private getMinLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
    if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
      return envLevel;
    }
    return process.env.NODE_ENV === "production" ? "info" : "debug";
  }

  private shouldLog(level: LogLevel): boolean {
    const minLevel = this.getMinLevel();
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? (sanitizeLogData(context) as Record<string, unknown>) : undefined;

    if (process.env.NODE_ENV === "production") {
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        ...sanitizedContext,
      };
      const jsonOutput = JSON.stringify(logEntry);
      if (level === "error") {
        console.error(jsonOutput);
      } else if (level === "warn") {
        console.warn(jsonOutput);
      } else {
        console.log(jsonOutput);
      }
    } else {
      // Formatted development output
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      const contextStr = sanitizedContext && Object.keys(sanitizedContext).length > 0
        ? ` ${JSON.stringify(sanitizedContext)}`
        : "";

      if (level === "error") {
        console.error(`${prefix} ${message}${contextStr}`);
      } else if (level === "warn") {
        console.warn(`${prefix} ${message}${contextStr}`);
      } else if (level === "debug") {
        console.debug(`${prefix} ${message}${contextStr}`);
      } else {
        console.log(`${prefix} ${message}${contextStr}`);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }
}

export const logger = new Logger();
