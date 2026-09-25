# AI Development Operating Contract: SchoolyardSMS Transformation

## 1. Project Context & Mission

**Project**: SchoolyardSMS transformation into a production-grade multi-tenant education SaaS platform for schools, colleges, and educational institutions in India.

The existing repository is a prototype/single-institution dashboard application being progressively transformed into the target SaaS architecture. AI agents working on this codebase must recognize that legacy implementations, shortcuts, and tutorial code are temporary artifacts scheduled for disciplined migration, not patterns to emulate.

---

## 2. Source of Truth Hierarchy

AI agents must treat the following documentation suites as authoritative:

1. **`docs/architecture-audit/`** — Current-state factual baseline (Step 0 audit).
2. **`docs/product/`** — Product requirements, personas, journeys, and scope.
3. **`docs/architecture/`** — Architecture, multi-tenancy, RBAC, service layer, and system design.
4. **`docs/engineering/`** — Engineering conventions, coding standards, and quality requirements.
5. **`docs/security/`** — Security model, STRIDE threat mitigations, and compliance controls.
6. **`docs/roadmap/`** — Phased release plans, V1/V2/V3 boundaries, and dependency matrices.

### Conflict Resolution Rules:
- **Current Code + Step 0 Audit** describe the **CURRENT STATE** (verified facts).
- **Architecture & Product Documents** describe the **TARGET STATE** (desired specifications).
- **ADRs (`docs/architecture/14-architecture-decisions.md` & `docs/architecture-audit/20-architecture-decision-register.md`)** describe explicit architectural decisions.
- **Never silently invent missing requirements**: If an implementation detail is ambiguous or unaddressed, consult the ADRs or pause to solicit human architectural guidance.

---

## 3. Non-Negotiable Security Invariants

- **Never trust client authorization**: UI element visibility is a convenience layer, never a security boundary.
- **Never trust client tenant identifiers**: Headers like `x-tenant-id` or body params like `tenantId` are untrusted client input.
- **Never execute unscoped tenant queries**: Every database query touching domain data MUST explicitly filter by verified `tenantId`.
- **Never expose another tenant's records**: Any cross-tenant data access attempt must be rejected immediately.
- **Never use Clerk metadata as authoritative RBAC**: Clerk `publicMetadata` must never be used for institutional authorization.
- **Never bypass server-side permissions**: Every Server Action and API route must verify caller permissions.
- **Never commit secrets**: Credentials, API keys, database URLs, and signing secrets must never enter Git history.
- **Never log credentials or sensitive personal data**: Passwords, tokens, and PII must never appear in application logs.
- **Never implement insecure shortcuts for demos**: Prototypes that bypass auth, CSRF, or tenant checks are prohibited.
- **Never weaken security to make tests pass**: Tests must validate security invariants under real constraints.

---

## 4. Authentication Architecture

- **Clerk** is the exclusive authentication and identity provider. Clerk handles credential verification, session token issuance, MFA, social logins, and password resets.
- **The Application PostgreSQL Database** is authoritative for:
  - Application `User` records.
  - Institutional `Tenant` entities.
  - `TenantMembership` bindings.
  - Dynamic `Role` definitions.
  - Atomic `Permission` catalogs.
  - Horizontal `AccessScope` boundaries.
  - Institutional `ModuleEntitlement` feature licenses.
  - All academic, operational, and audit business data.
- **Rule**: Do not create a second password-authentication system unless an explicit ADR approves it.

---

## 5. Multi-Tenancy & Tenant Boundary Rules

- Every tenant-facing data operation MUST operate within a verified tenant context.
- Tenant context MUST be established and verified server-side from request hostnames, subdomains, or verified paths.
- **Strictly Prohibited**: Never accept or trust `x-tenant-id`, `tenantId`, `schoolId`, or `organizationId` directly from client-controlled headers or unverified request bodies.
- A user may belong to multiple institutions with different roles. Tenant membership MUST be validated for the specific institution being accessed.

---

## 6. Authorization & Policy Enforcement

Every protected operation MUST evaluate:
1. **Authenticated Identity**: Is the caller authenticated via a valid Clerk session?
2. **Tenant Membership**: Does the caller have an active `TenantMembership` in this specific institution?
3. **Access Scope**: Is the caller operating within their permitted boundary (`INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN`)?
4. **Permission**: Does the caller's assigned role possess the required atomic permission string (e.g. `attendance.mark`, `exam.publish`)?
5. **Module Entitlement**: Does the institution's active subscription tier enable the requested module key (e.g. `finance_module`)?
6. **Business & Record Constraints**: Does the record belong to the target class, section, or academic year?

**Rule**: Hiding a button, menu item, or route in the UI is NOT authorization. Server Actions and APIs must enforce the full security stack.

---

## 7. Database Standards (Prisma & PostgreSQL)

- Use **Prisma ORM** for all application data access.
- **Do NOT**:
  - Bypass tenant scoping in any query.
  - Perform unsafe destructive migrations without automated backups and rollback plans.
  - Remove database constraints without understanding multi-tenant composite implications.
  - Introduce N+1 query patterns inside loops (always use relational `include` or joins).
  - Store unencrypted sensitive personal data (e.g. Aadhaar numbers, medical history) in database fields.

---

## 8. Strict Implementation Dependency Order

All development and migration work must proceed down the strict architectural dependency hierarchy:

```
1. Foundation (DB Pooling, Prisma Extensions, AsyncLocalStorage Context, Base Utilities)
   ↓
2. Identity (Clerk Auth, PostgreSQL User Model, Identity Sync Webhook)
   ↓
3. Tenant (Tenant Model, Server-Side Tenant Resolver, Institutional Settings)
   ↓
4. Membership (TenantMembership Junction, User-Tenant Binding, Active Status)
   ↓
5. RBAC (Roles, Permissions, RolePermission, AccessScope Engine)
   ↓
6. Tenant-Scoped Domain (Classes, Subjects, Students, Staff, Lessons, Attendance, Exams)
   ↓
7. Module Entitlements (Subscription Plans, Feature Gates, Tenant Module Licenses)
   ↓
8. Application Screens (RSC Views, Mobile PWA, Guarded Action Modals)
   ↓
9. Workflows (BullMQ Workers, Redis Queues, Notification Dispatchers)
   ↓
10. Reporting & Automation (Atomic Audit Logs, Report Cards, Analytics, Exports)
```

**Rule**: Do not jump ahead. Never attempt to build UI screens or background workflows before the underlying Tenant, Membership, and RBAC layers are established.

---

## 9. Automated Testing Standards

All new or refactored functionality MUST include automated test coverage:

- **Unit Tests**: Pure domain logic, Zod validators, permission evaluators, date helpers.
- **Integration Tests**: Prisma service operations, tenant query scoping, atomic audit logging, transaction rollbacks.
- **E2E Tests**: Playwright browser flows covering multi-tenant login, role dashboards, attendance marking, marks entry.
- **Security Tests**: Mandatory negative tests asserting rejection of:
  - Unauthorized requests (`401 Unauthorized`).
  - Cross-tenant injection attempts (`403 Forbidden` / `404 Not Found`).
  - Privilege escalation attempts.
  - Entitlement bypass attempts.
- **Regression Invariant**: Every migration phase must preserve validated baseline functionality without regressions.

---

## 10. CI/CD & Verification Gates

Never declare a task complete without running and verifying:
1. `npm run lint` — Must exit with 0 errors and 0 warnings.
2. `npx tsc --noEmit` — Must exit with 0 type errors.
3. Test suite (`vitest run`, `playwright test`) — All tests must pass.
4. `npm run build` — Production build must compile cleanly without runtime errors.
5. Migration validation — Schema changes must apply cleanly via `prisma migrate deploy`.

**Rule**: Never bypass CI checks, disable linter rules, or weaken tests to make a build pass.

---

## 11. Database Migration Rules

- **Never use `prisma migrate dev` in staging, production, or container builds**.
- Production migrations MUST execute as a release-phase gate using `npx prisma migrate deploy`.
- Never execute destructive schema migrations (dropping columns, splitting tables) without:
  1. Automated pre-migration snapshot/backup.
  2. The Expand-and-Contract migration pattern.
  3. A tested rollback script.
  4. Data verification scripts.

---

## 12. AI Agent Behavioral Protocol

### Phase 1: Before Coding
1. **Read Relevant Documentation**: Review the corresponding files under `docs/` before making assumptions.
2. **Inspect Existing Implementation**: Read the actual code and identify existing technical debt.
3. **Identify Impacted Modules**: Map out downstream dependencies using the module dependency matrix.
4. **Identify Security Implications**: Determine required permissions, tenant boundaries, and audit logging needs.
5. **Identify Migration Implications**: Assess whether schema changes require composite unique constraint updates.
6. **Identify Required Tests**: Plan unit, integration, and security test cases.

### Phase 2: During Coding
1. **Make the Smallest Coherent Change**: Keep diffs focused, atomic, and readable.
2. **Preserve Existing Behavior**: Do not break unrelated screens or existing component styling tokens (`lamaSky`, `lamaPurple`, etc.).
3. **Do Not Rewrite Unrelated Modules**: Confine edits strictly to the task scope.
4. **Do Not Introduce Unnecessary Dependencies**: Avoid adding npm packages when standard Node.js/React APIs suffice.
5. **Keep Architecture Consistent with ADRs**: Strictly follow established architecture decision records.
6. **Update Documentation**: When an architecture decision or schema evolves, update documentation immediately.

### Phase 3: After Coding
1. **Run Relevant Tests**: Verify that unit and integration tests execute successfully.
2. **Run Lint**: Confirm clean ESLint execution.
3. **Run Type-Check**: Confirm clean TypeScript compilation.
4. **Run Build**: Verify that `npm run build` succeeds.
5. **Report Failures Honestly**: Never suppress errors, swallow exceptions, or mask failing tests.

---

## 13. Critical Baseline Repository Warnings

The Step 0 audit uncovered severe pre-existing technical debt in the baseline repository:
- **Zero Server-Side Authorization**: Mutation endpoints in `actions.ts` execute without verifying caller roles.
- **Zero Multi-Tenancy**: All 14 existing Prisma models operate globally without `tenantId`.
- **Insecure Clerk Coupling**: Application relies on unverified `publicMetadata.role` inside session tokens.
- **Dangerous Delete Mapping**: `FormModal.tsx` routes deletions of 7 unrelated entity types directly to `deleteSubject`.
- **Leaked Sensitive Credentials**: The `.env` file appears to contain sensitive live credentials requiring rotation.
- **Zero Automated Tests**: The codebase has 0 test files (0% test coverage).
- **Defective Dockerfile**: The container build incorrectly executes `prisma migrate dev` during image compilation.
- **Direct RSC Coupling**: Server components query global Prisma tables directly without a tenant-scoped service layer.
- **Zero PWA Infrastructure**: No service worker, manifest, or offline capability exists.
- **Zero Background Processing**: No Redis or BullMQ exists; external API calls run synchronously.

**Rule**: These are known baseline defects. Never interpret existing code patterns as acceptable production behavior.

---

## 14. Prohibited AI Agent Actions

An AI agent working on this repository MUST NOT:
- Silently redesign core architecture without an ADR.
- Silently alter V1, V2, or V3 product scope boundaries.
- Silently introduce new external providers (e.g. replacing Clerk, Supabase, or Redis).
- Silently modify the database multi-tenant isolation strategy.
- Silently rely on Clerk Organizations or Clerk RBAC for business authorization.
- Silently trust client-supplied tenant headers (`x-tenant-id`).
- Remove, skip, or comment out failing tests to make CI pass.
- Suppress or swallow unhandled errors with empty catch blocks.
- Delete or drop database columns without an approved multi-phase migration strategy.
- Modify unrelated files or refactor working code purely for aesthetic cleanups.

---

## 15. Definition of Task Completion

A development task is considered complete ONLY when:
1. Implementation satisfies all functional requirements and user journeys.
2. Security boundaries (authentication, tenant isolation, DB RBAC) are verified.
3. Tenant boundaries are strictly enforced across all database queries.
4. Granular permissions and access scopes are evaluated server-side.
5. Unit and integration tests cover the new logic and pass 100%.
6. TypeScript static verification (`npx tsc --noEmit`) passes with 0 errors.
7. ESLint (`npm run lint`) passes with 0 errors and 0 warnings.
8. Production build (`npm run build`) compiles cleanly without runtime exceptions.
9. Documentation under `docs/` reflects the final system behavior.
10. No known critical regressions have been introduced into the repository.
