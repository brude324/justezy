import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

// Populate safe test environment variables
Object.assign(process.env, {
  NODE_ENV: "test",
});
process.env.DATABASE_URL = "postgresql://test_user:test_password@localhost:5432/test_db?schema=public";
process.env.CLERK_SECRET_KEY = "sk_test_mock_secret_key_for_automated_testing";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_mock_publishable_key_for_testing";
process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = "/sign-in";
process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = "/sign-up";
process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = "/";
process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = "/";
process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo";

afterEach(() => {
  vi.clearAllMocks();
});
