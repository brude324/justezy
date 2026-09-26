# Step 4A — Development Foundation & Engineering Tooling

**Status**: IMPLEMENTED / VERIFIED  
**Stage**: Step 4A (Engineering Foundation)  
**Parent Strategy**: [01-engineering-principles.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/engineering/01-engineering-principles.md), [07-testing-strategy.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/engineering/07-testing-strategy.md), [09-ci-cd.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/engineering/09-ci-cd.md)

---

## 1. Overview & Objective

Step 4A establishes the engineering baseline required for the multi-tenant SaaS transformation. Prior to Step 4A, the repository contained **0 automated tests** (0% coverage), **no CI/CD workflows**, untyped environment variable handling, zero application-level error boundaries, and unscrubbed credential templates.

Step 4A delivers:
1. **Deterministic Environment Configuration**: Type-safe Zod schema validation ([src/lib/env.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/env.ts)) with sanitized error messages preventing secret leakage.
2. **Standardized Engineering Commands**: Canonical scripts for dev, build, lint, typecheck, test, e2e, and prisma schema validation.
3. **Automated Testing Suite**: Vitest for fast unit/integration testing ([vitest.config.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/vitest.config.ts)) and Playwright for E2E browser flows ([playwright.config.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/playwright.config.ts)).
4. **Domain Error Hierarchy**: Typed `AppError` subclasses ([src/lib/errors/AppError.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/errors/AppError.ts)) with information masking.
5. **Structured Logging**: Production JSON logging and development formatting with automatic redaction of sensitive tokens/passwords ([src/lib/logger.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/logger.ts)).
6. **Next.js App Router Error Boundaries**: Global, route-group, and 404 boundaries ([src/app/not-found.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/not-found.tsx), [src/app/error.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/error.tsx), [src/app/global-error.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/global-error.tsx), [src/app/(dashboard)/error.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%28dashboard%29/error.tsx)).
7. **Continuous Integration Pipeline**: GitHub Actions workflow ([.github/workflows/ci.yml](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/.github/workflows/ci.yml)) validating lint, typecheck, tests, Prisma schema, and production build.

---

## 2. Environment Variables Specification

The project uses [.env.example](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/.env.example) as the authoritative reference. Developers copy this to `.env.local`:

```bash
cp .env.example .env.local
```

### Variable Classification

| Variable | Scope | Purpose | Example / Format |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Server Secret | PostgreSQL connection string for Prisma ORM | `postgresql://user:pass@host:5432/db?schema=public` |
| `CLERK_SECRET_KEY` | Server Secret | Server-side Clerk API authentication | `sk_test_...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client / Browser | Clerk public frontend key | `pk_test_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Client / Browser | Sign-in route path | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Client / Browser | Sign-up route path | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Client / Browser | Post-auth redirection target | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Client / Browser | Post-signup redirection target | `/` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Client / Browser | Cloudinary widget cloud namespace | `justezy` |
| `NODE_ENV` | Runtime | Environment mode (`development`, `test`, `production`) | `development` |
| `CI` | CI / Build | Indicator for CI pipeline run | `true` |

### Security Invariants for Environment Handling
- **Never expose secrets via `NEXT_PUBLIC_`**: Variables prefixed with `NEXT_PUBLIC_` are bundled into browser JavaScript chunks. Only publishable keys and route paths may have this prefix.
- **Sanitized Validation**: `validateEnv()` in `src/lib/env.ts` parses variables against Zod schemas. If validation fails, error messages report the missing key name only, never echoing input values.
- **Git Ignore Safeguard**: `.gitignore` explicitly allows `!.env.example` while ignoring `.env*` to prevent accidental credential commits.

---

## 3. Engineering Commands Reference

| Command | Action | Pipeline / Gate Target |
| :--- | :--- | :--- |
| `npm run dev` | Starts Next.js development server on `localhost:3000` | Local Development |
| `npm run build` | Compiles Next.js production bundle | Release Gate & CI |
| `npm run start` | Serves production Next.js build | Production / E2E WebServer |
| `npm run lint` | Runs Next.js ESLint static checks | CI Gate |
| `npm run typecheck` | Executes strict TypeScript compilation (`tsc --noEmit`) | CI Gate |
| `npm run test` | Runs unit & integration test suites via Vitest | CI Gate |
| `npm run test:watch` | Starts Vitest in interactive TDD watch mode | Local Development |
| `npm run test:e2e` | Runs Playwright browser end-to-end smoke tests | E2E Validation |
| `npm run prisma:validate` | Validates baseline Prisma schema (`prisma/schema.prisma`) | Tooling Verification |
| `npm run prisma:validate:target` | Validates Step 3 target schema (`docs/database/prisma-schema-target.prisma`) | Architecture Gate & CI |
| `npm run prisma:generate` | Generates Prisma Client types | Post-Install / Build |

---

## 4. Testing Framework & Directory Conventions

### Vitest Unit & Integration Architecture
- **Config**: [vitest.config.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/vitest.config.ts)
- **Setup File**: [tests/setup.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/tests/setup.ts)
  - Loads `@testing-library/jest-dom/vitest`.
  - Sets safe non-production mock environment variables.
  - Automatically resets mocks between tests via `afterEach(vi.clearAllMocks)`.
- **Directory Layout**:
  - `tests/unit/` — Fast, isolated unit tests (validators, error classes, utility helpers, React components).
  - `tests/integration/` — Service integration and tenant-scoped data queries (reserved for subsequent Step 4 phases).
  - `tests/e2e/` — Playwright end-to-end browser tests.

### Playwright E2E Architecture
- **Config**: [playwright.config.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/playwright.config.ts)
- Automatically boots `npm run start` via internal `webServer` if not already running.
- In Windows local environments, utilizes installed browser channels (`msedge` / system Chrome) to prevent CDN timeout issues; in CI runs standard Chromium.

---

## 5. Error Handling & Information Leakage Prevention

Derived from [06-validation-and-error-handling.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/engineering/06-validation-and-error-handling.md):

### Typed Error Hierarchy ([src/lib/errors/AppError.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/errors/AppError.ts))
- `AppError`: Base abstract class with `statusCode`, `errorCode`, and `isOperational`.
- `ValidationError` (400, `VALIDATION_ERROR`): Invalid user input.
- `UnauthorizedError` (401, `UNAUTHORIZED`): Unauthenticated request.
- `ForbiddenError` (403, `FORBIDDEN`): Authenticated user lacking permission or scope.
- `NotFoundError` (404, `NOT_FOUND`): Entity missing or obscured for tenant privacy.
- `ConflictError` (409, `CONFLICT`): Duplicate resource or state collision.
- `DatabaseError` (500, `DATABASE_ERROR`): Wrapped DB error with masked details.

### Masking Rules
`toSafeErrorResponse(error)` ensures that:
- Operational client errors (status < 500) provide user-actionable error messages.
- Server-side errors (status 500) and unexpected exceptions never expose stack traces, database schema details, or raw queries to clients.

---

## 6. Structured Logging ([src/lib/logger.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/logger.ts))

- **Production Output**: Single-line JSON format with timestamp, level, message, and metadata context.
- **Development Output**: Colorized readable console format.
- **Secret Redaction**: Recursively strips sensitive fields:
  - `password`, `secret`, `token`, `authorization`, `cookie`, `credential`, `session`, `apikey`, `clerk_secret_key`, `database_url`.
  - Automatically replaces embedded Bearer tokens in raw error strings with `Bearer [REDACTED]`.

---

## 7. App Router Error Boundaries

1. **Root 404** ([src/app/not-found.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/not-found.tsx)): Custom branded not-found view with dashboard navigation return.
2. **Root Error Boundary** ([src/app/error.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/error.tsx)): Client error boundary with safe user message and reset trigger.
3. **Global Layout Boundary** ([src/app/global-error.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/global-error.tsx)): Catches root layout failures and provides complete HTML/body fallback.
4. **Dashboard Boundary** ([src/app/(dashboard)/error.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%28dashboard%29/error.tsx)): Isolates route failures so the navigation sidebar and navbar remain functional.
5. **Dashboard Loading Skeleton** ([src/app/(dashboard)/loading.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%28dashboard%29/loading.tsx)): Animated pulse skeleton for smooth route transitions.

---

## 8. Continuous Integration Pipeline ([.github/workflows/ci.yml](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/.github/workflows/ci.yml))

The automated CI workflow executes on pushes and pull requests to `main`:
1. Checkout repository (`actions/checkout@v4`).
2. Node.js setup with npm cache (`actions/setup-node@v4`, Node 20).
3. Clean dependency installation (`npm ci`).
4. Static code analysis (`npm run lint`).
5. Type checking (`npm run typecheck`).
6. Target schema validation (`npm run prisma:validate:target`).
7. Unit test execution (`npm run test`).
8. Next.js production build (`npm run build`).

All gates must pass before code can be merged into `main`.
