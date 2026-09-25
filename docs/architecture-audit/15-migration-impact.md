# Section O: Migration Impact Assessment

## 1. Migration Vector Analysis (Current State vs. Proposed Target Architecture)

This section analyzes the impact on the existing codebase across the 9 primary architectural migration vectors.

| Vector # | Migration Vector | Scope of Changes | Affected Files & Components | Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Authentication & Authorization Decoupling** | Current Clerk Authentication + Clerk Role Metadata → Clerk Authentication/Identity + Application DB Authorization. Clerk handles credentials/MFA/session; PostgreSQL handles application authorization. | `layout.tsx`, `middleware.ts`, `actions.ts`, `Menu.tsx`, `Navbar.tsx`, `[[...sign-in]]/page.tsx` | **HIGH** |
| **2** | **Custom DB-Based Dynamic RBAC** | Introduce conceptual `Role`, `Permission`, and membership association. Enforce permissions server-side on all actions and RSC routes. | `schema.prisma`, `actions.ts`, `middleware.ts`, all `page.tsx` list files, `FormModal.tsx` | **VERY HIGH** |
| **3** | **Multi-Tenancy Foundation** | Introduce conceptual `Tenant` entity. Add `tenant_id` foreign keys to all business models. | `schema.prisma`, `seed.ts`, all RSC queries, all Server Actions, data access layer | **VERY HIGH** |
| **4** | **Tenant Isolation Enforcement** | Evaluate application-level isolation, PostgreSQL RLS, or a combination during database architecture design. | `src/lib/prisma.ts`, AsyncLocalStorage context provider, all queries & mutations | **HIGH** |
| **5** | **Platform / SaaS Admin vs Tenant Admin** | Separate SaaS administration (managing schools, subscriptions, global config) from School administration. | New route group `(platform-admin)`, new RBAC scope `PLATFORM` vs `TENANT` | **HIGH** |
| **6** | **Feature & Module Entitlements** | Add subscription tier & module flags (e.g. Attendance, Fees, Transport, Exams) to enable/disable features per tenant. | `Tenant` model, layout navigation, route guards, UI menu filters | **MEDIUM** |
| **7** | **Transactional & Operational Audit Logging** | Critical security/business events persisted atomically with database mutations; asynchronous queue used for non-critical downstream consumers. | `schema.prisma`, Server Actions, background queue dispatcher | **MEDIUM** |
| **8** | **Workflow & Automation Engine** | Integrate BullMQ + Redis for asynchronous job processing, notifications, and scheduled workflows. | Worker process, queue definitions, notification adapters, Docker configuration | **HIGH** |
| **9** | **V1 / V2 / V3 Phased Rollout** | Package features into structured release increments without breaking existing core academic functions. | Release management, database migrations, feature flags | **MEDIUM** |

---

## 2. Detailed Technical Impact by Component

### 2.1 Impact on Database Schema ([prisma/schema.prisma](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/prisma/schema.prisma))
- **Proposed Identity & Profile Separation (Target Architecture Concept)**:
  - Do NOT merge all domain data into one flat table. The preferred conceptual model separates concerns:
    - `User`: Identity and person record (name, contact, external auth linkage).
    - `TenantMembership`: Relationship between `User` and `Tenant` (capturing role, access scope, and membership status).
    - Domain/Profile entities: `StudentProfile`, `StaffProfile` / `TeacherProfile`, `Parent/GuardianProfile`, and future profiles as required.
  - *Note*: The exact physical Prisma schema design is an architectural decision reserved for Step 3 (Database Architecture Design), not finalized prematurely.
- **Tenant ID Addition**:
  - Add `tenantId String` with foreign key and index to `Class`, `Subject`, `Lesson`, `Exam`, `Assignment`, `Result`, `Attendance`, `Event`, `Announcement`.
- **Constraint Refactoring**:
  - Convert global unique constraints (`Subject.name`, `Class.name`, `Grade.level`) to composite unique constraints: `@@unique([tenantId, name])`, `@@unique([tenantId, level])`.

### 2.2 Impact on Server Actions ([src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts))
- **Authorization Wrapper**:
  - Replace raw exported functions with an authenticated action middleware pattern:
    `createAuthorizedAction(permission, async (ctx, input) => { ... })`.
  - Context (`ctx`) must supply verified `tenantId`, `userId`, and caller permissions resolved from PostgreSQL.
- **Decoupled User Lifecycle Management**:
  - Remove direct synchronous calls to `clerkClient.users.createUser` with hardcoded roles inside `createTeacher` / `createStudent`.
  - Address the user provisioning lifecycle problem (pending identity, tenant membership assignment, Clerk invitation/creation, webhook synchronization, idempotency, and failure recovery) as a dedicated Step 1 architectural decision.

### 2.3 Impact on Routing & Middleware ([src/middleware.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/middleware.ts))
- **Tenant Context Security**:
  - The tenant must be resolved and verified server-side.
  - Tenant selection must be validated against the authenticated user's active memberships in PostgreSQL.
  - Client-controlled tenant identifiers (such as headers or query parameters) must **never** be trusted directly. Headers may only be utilized as an internal transport mechanism after server-side cryptographic/session verification.
  - The final tenant-resolution mechanism (subdomain, custom domain, path prefix, or another mechanism) is a future architectural decision to be determined.
- Route authorization checks will move from the static Edge `routeAccessMap` to server-side policy guards backed by database permissions.
