/**
 * Base Application Error class for SchoolyardSMS.
 * Derived from docs/engineering/06-validation-and-error-handling.md
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  readonly isOperational: boolean = true;

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 400 Bad Request / Validation Failure
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = "VALIDATION_ERROR";
}

/**
 * 401 Unauthorized - Caller is not authenticated
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly errorCode: string = "UNAUTHORIZED";
}

/**
 * 403 Forbidden - Caller is authenticated but lacks required permission or scope
 */
export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly errorCode: string = "FORBIDDEN";
}

/**
 * 404 Not Found - Entity does not exist or tenant boundary prevents discovery
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode: string = "NOT_FOUND";
}

/**
 * 409 Conflict - Resource already exists or state collision
 */
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = "CONFLICT";
}

/**
 * 404 Tenant Not Found - Tenant does not exist or invalid slug/domain
 */
export class TenantNotFoundError extends NotFoundError {
  override readonly errorCode = "TENANT_NOT_FOUND";
}

/**
 * 403 Tenant Suspended - Institutional tenant account is suspended or inactive
 */
export class TenantSuspendedError extends ForbiddenError {
  override readonly errorCode = "TENANT_SUSPENDED";
}

/**
 * 403 Tenant Membership Missing - Authenticated user has no active membership in target tenant
 */
export class TenantMembershipMissingError extends ForbiddenError {
  override readonly errorCode = "TENANT_MEMBERSHIP_MISSING";
}

/**
 * 403 Cross-Tenant Access Denied - Attempt to access another tenant's records
 */
export class CrossTenantAccessError extends ForbiddenError {
  override readonly errorCode = "CROSS_TENANT_ACCESS_DENIED";
}

/**
 * 401 Tenant Context Missing - Operation requires established tenant context
 */
export class TenantContextMissingError extends UnauthorizedError {
  override readonly errorCode = "TENANT_CONTEXT_MISSING";
}

/**
 * 402 Module Disabled - Institution has not licensed/enabled the requested module
 */
export class ModuleDisabledError extends AppError {
  readonly statusCode = 402;
  readonly errorCode = "MODULE_DISABLED";
}

/**
 * 403 Scope Access Denied - Caller possesses permission but lacks required AccessScope
 */
export class ScopeAccessDeniedError extends ForbiddenError {
  override readonly errorCode = "SCOPE_ACCESS_DENIED";
}

/**
 * 500 Database Error - Wrapped database exceptions masked for safety
 */
export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = "DATABASE_ERROR";
  override readonly isOperational = false;
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = "INTERNAL_SERVER_ERROR";
  override readonly isOperational = false;
}

export interface SafeErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * Converts any caught error into a safe, client-facing JSON structure.
 * Guarantees that sensitive stack traces, DB connection strings, and internal details
 * are NEVER returned to client callers.
 */
export function toSafeErrorResponse(error: unknown): SafeErrorResponse {
  if (error instanceof AppError) {
    // Only pass details for operational client errors (e.g. 400 validation issues)
    const isClientSafe = error.statusCode < 500;
    return {
      success: false,
      error: {
        message: error.message,
        code: error.errorCode,
        statusCode: error.statusCode,
        details: isClientSafe ? error.details : undefined,
      },
    };
  }

  // Fallback for unexpected, unhandled exceptions
  return {
    success: false,
    error: {
      message: "An unexpected error occurred. Please try again later.",
      code: "INTERNAL_SERVER_ERROR",
      statusCode: 500,
    },
  };
}
