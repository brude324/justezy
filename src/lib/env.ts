import { z } from "zod";

/**
 * Server-only environment variables schema.
 * These secrets must NEVER be exposed to the browser or prefixed with NEXT_PUBLIC_.
 */
export const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (val) => val.startsWith("postgresql://") || val.startsWith("postgres://"),
      "DATABASE_URL must be a valid PostgreSQL connection URI (postgresql://...)"
    ),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
});

/**
 * Browser-accessible public environment variables schema.
 * Prefixed with NEXT_PUBLIC_ by Next.js convention.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().default("demo"),
});

/**
 * Common runtime variables schema.
 */
export const commonEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CI: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
});

export const combinedEnvSchema = serverEnvSchema
  .merge(clientEnvSchema)
  .merge(commonEnvSchema);

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type Env = z.infer<typeof combinedEnvSchema>;

/**
 * Validates environment variables without revealing secret values in logs or errors.
 *
 * @param env - The environment dictionary to validate (defaults to process.env)
 * @param options - Validation options (e.g. isServer: boolean)
 */
export function validateEnv(
  env: Record<string, string | undefined> = process.env,
  options: { isServer?: boolean; skipInTest?: boolean } = {}
): { valid: boolean; errors?: Record<string, string[]> } {
  const isTest = env.NODE_ENV === "test";
  if (options.skipInTest && isTest) {
    return { valid: true };
  }

  const isServer = options.isServer ?? typeof window === "undefined";
  const targetSchema = isServer
    ? combinedEnvSchema
    : clientEnvSchema.merge(commonEnvSchema);

  const result = targetSchema.safeParse(env);

  if (result.success) {
    return { valid: true };
  }

  // Sanitize errors so no secret values are ever reflected in error details
  const formattedErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!formattedErrors[key]) {
      formattedErrors[key] = [];
    }
    // Only return the validation rule message, NEVER the input value
    formattedErrors[key].push(issue.message);
  }

  return {
    valid: false,
    errors: formattedErrors,
  };
}

/**
 * Safe accessor for server environment variables.
 * In development or production runtime, throws descriptive sanitized error if missing.
 */
export function getServerEnv(): ServerEnv {
  const validation = serverEnvSchema.safeParse(process.env);
  if (!validation.success) {
    const missingKeys = validation.error.issues.map((i) => i.path.join("."));
    throw new Error(
      `[Environment Error] Missing or invalid required server environment variables: ${missingKeys.join(
        ", "
      )}. Check your .env.local file against .env.example.`
    );
  }
  return validation.data;
}

/**
 * Safe accessor for client environment variables.
 */
export function getClientEnv(): ClientEnv {
  const validation = clientEnvSchema.safeParse(process.env);
  if (!validation.success) {
    const missingKeys = validation.error.issues.map((i) => i.path.join("."));
    throw new Error(
      `[Environment Error] Missing or invalid client environment variables: ${missingKeys.join(
        ", "
      )}. Check your .env.local file against .env.example.`
    );
  }
  return validation.data;
}
