import { describe, it, expect } from "vitest";
import { validateEnv, serverEnvSchema, clientEnvSchema, getServerEnv, getClientEnv } from "@/lib/env";

describe("Environment Configuration & Validation", () => {
  const validEnv = {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://postgres:secret123@localhost:5432/schoolyard_test",
    CLERK_SECRET_KEY: "sk_test_mock_secret_key",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_mock_public_key",
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: "/",
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: "/",
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "demo",
  };

  it("should pass validation when all required variables are present and well-formed", () => {
    const result = validateEnv(validEnv, { isServer: true });
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it("should fail validation when DATABASE_URL is missing", () => {
    const invalidEnv = { ...validEnv, DATABASE_URL: undefined };
    const result = validateEnv(invalidEnv, { isServer: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.DATABASE_URL).toBeDefined();
  });

  it("should reject invalid non-PostgreSQL DATABASE_URL formats", () => {
    const invalidEnv = { ...validEnv, DATABASE_URL: "mysql://user:pass@localhost:3306/db" };
    const result = validateEnv(invalidEnv, { isServer: true });
    expect(result.valid).toBe(false);
    expect(result.errors?.DATABASE_URL?.[0]).toContain("PostgreSQL connection URI");
  });

  it("should fail validation when CLERK_SECRET_KEY is missing on server", () => {
    const invalidEnv = { ...validEnv, CLERK_SECRET_KEY: undefined };
    const result = validateEnv(invalidEnv, { isServer: true });
    expect(result.valid).toBe(false);
    expect(result.errors?.CLERK_SECRET_KEY).toBeDefined();
  });

  it("should NEVER leak actual secret values in validation error output", () => {
    const secretValue = "super_secret_password_do_not_leak_12345";
    const invalidEnv = {
      ...validEnv,
      DATABASE_URL: `invalid-scheme://${secretValue}@host/db`,
    };
    const result = validateEnv(invalidEnv, { isServer: true });
    expect(result.valid).toBe(false);

    // Verify secret is not in any error string
    const serializedErrors = JSON.stringify(result.errors);
    expect(serializedErrors).not.toContain(secretValue);
  });

  it("getServerEnv should return parsed server variables in test environment", () => {
    const env = getServerEnv();
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.CLERK_SECRET_KEY).toBeDefined();
  });

  it("getClientEnv should return client variables with defaults", () => {
    const env = getClientEnv();
    expect(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBeDefined();
    expect(env.NEXT_PUBLIC_CLERK_SIGN_IN_URL).toBe("/sign-in");
  });
});
