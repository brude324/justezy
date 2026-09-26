import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  InternalServerError,
  toSafeErrorResponse,
} from "@/lib/errors";

describe("Application Error Hierarchy & Masking", () => {
  it("ValidationError should have status 400 and VALIDATION_ERROR code", () => {
    const error = new ValidationError("Invalid input", { field: "email" });
    expect(error.statusCode).toBe(400);
    expect(error.errorCode).toBe("VALIDATION_ERROR");
    expect(error.isOperational).toBe(true);
    expect(error.message).toBe("Invalid input");
    expect(error.details).toEqual({ field: "email" });
  });

  it("UnauthorizedError should have status 401 and UNAUTHORIZED code", () => {
    const error = new UnauthorizedError("Session expired");
    expect(error.statusCode).toBe(401);
    expect(error.errorCode).toBe("UNAUTHORIZED");
    expect(error.isOperational).toBe(true);
  });

  it("ForbiddenError should have status 403 and FORBIDDEN code", () => {
    const error = new ForbiddenError("Insufficient permissions");
    expect(error.statusCode).toBe(403);
    expect(error.errorCode).toBe("FORBIDDEN");
  });

  it("NotFoundError should have status 404 and NOT_FOUND code", () => {
    const error = new NotFoundError("Student record not found");
    expect(error.statusCode).toBe(404);
    expect(error.errorCode).toBe("NOT_FOUND");
  });

  it("ConflictError should have status 409 and CONFLICT code", () => {
    const error = new ConflictError("Class code already exists");
    expect(error.statusCode).toBe(409);
    expect(error.errorCode).toBe("CONFLICT");
  });

  it("DatabaseError should have status 500 and non-operational flag", () => {
    const error = new DatabaseError("Database connection failed");
    expect(error.statusCode).toBe(500);
    expect(error.errorCode).toBe("DATABASE_ERROR");
    expect(error.isOperational).toBe(false);
  });

  describe("toSafeErrorResponse", () => {
    it("should pass through operational client error details", () => {
      const error = new ValidationError("Invalid class size", { max: 50 });
      const response = toSafeErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error.statusCode).toBe(400);
      expect(response.error.code).toBe("VALIDATION_ERROR");
      expect(response.error.message).toBe("Invalid class size");
      expect(response.error.details).toEqual({ max: 50 });
    });

    it("should mask details on 500 server errors to prevent information leakage", () => {
      const error = new DatabaseError("Prisma unique constraint failure", {
        rawSql: "SELECT * FROM secrets",
      });
      const response = toSafeErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error.statusCode).toBe(500);
      expect(response.error.details).toBeUndefined();
    });

    it("should safely convert raw/unknown runtime exceptions without leaking stacks", () => {
      const rawError = new Error("TypeError: Cannot read property of undefined at line 42 /var/app/secrets.ts");
      const response = toSafeErrorResponse(rawError);

      expect(response.success).toBe(false);
      expect(response.error.statusCode).toBe(500);
      expect(response.error.code).toBe("INTERNAL_SERVER_ERROR");
      expect(response.error.message).toBe("An unexpected error occurred. Please try again later.");
      expect("stack" in response).toBe(false);
    });
  });
});
