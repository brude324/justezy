# Step 0B: Migration Dependency Analysis & Structural Coupling Map

## 1. Executive Summary & Objective

This document formalizes **Step 0B: Migration Dependency Analysis**. Its purpose is to map every technical coupling point, data relationship, and structural inversion in the existing codebase before any migration work begins.

The target system architecture establishes:
```
Current Clerk Authentication + Clerk Role Metadata
                      ↓
Clerk Authentication/Identity + Application DB Authorization
```

### Clarified Authority Division
- **Clerk Responsibilities**:
  - Authentication & Credential Verification
  - Session Token Issuance & Verification
  - Global Identity Lifecycle (`sub` identifier)
  - Multi-Factor Authentication (MFA)
  - Password Resets & Session Cookies
- **PostgreSQL Responsibilities**:
  - Application User Records (`User`)
  - Tenant Entities (`Tenant`)
  - Tenant Affiliation & Status (`TenantMembership`)
  - Domain / Profile Entities (e.g. `StudentProfile`, `StaffProfile`, `ParentProfile`)
  - Access Control (`Role`, `Permission`, `AccessScope`)
  - Feature Licensing (`ModuleEntitlement`)
  - Business Authorization Policies
  - Transactional Audit Logs & Core Business Data

*Note*: We are **NOT** replacing Clerk with custom authentication. We are replacing the need for third-party authorization with our own database-driven authorization system.

---

## 2. Detailed Migration Stream Analysis

### Stream 1: Authentication Migration (Current Clerk Authentication + Clerk Role Metadata → Clerk Authentication/Identity + Application DB Authorization)

#### 1. Current Implementation
- Clerk (`@clerk/nextjs` v5.4.1) handles credential login via `@clerk/elements` in [src/app/[[...sign-in]]/page.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%5B%5B...sign-in%5D%5D/page.tsx).
- When a user signs in, Clerk issues a session JWT containing custom claims populated via Clerk dashboard token templates (`sessionClaims.metadata.role`).
- User creation is performed synchronously inside Next.js Server Actions ([src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts)) using `clerkClient.users.createUser()` with hardcoded `publicMetadata: { role: "teacher" }` or `{ role: "student" }`.
- In the target architecture, Clerk is retained for authentication/identity, but stripped of all authorization metadata.

#### 2. Files Involved
- [src/app/layout.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/layout.tsx) (`ClerkProvider`)
- [src/middleware.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/middleware.ts) (`clerkMiddleware`, session claim inspection)
- [src/app/[[...sign-in]]/page.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%5B%5B...sign-in%5D%5D/page.tsx) (Clerk sign-in form & client redirect)
- [src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts) (Calls to `clerkClient.users.createUser`, `updateUser`, `deleteUser`)
- [src/components/Navbar.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/Navbar.tsx) (`UserButton`, `currentUser()`)
- [src/components/Menu.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/Menu.tsx) (`currentUser()`)

#### 3. Models Involved
- **Current**: Separate `Admin`, `Teacher`, `Student`, `Parent` models where IDs are stored as Clerk string IDs.
- **Proposed Conceptual Target**:
  - `User`: Core person/identity record (storing `id`, `clerkUserId`, `email`, `phone`, `name`).
  - `TenantMembership`: Association between `User` and `Tenant` (capturing role, scope, and status).
  - Domain/Profile entities: Conceptual `StudentProfile`, `StaffProfile` / `TeacherProfile`, `ParentProfile`.
  - *Note*: Exact physical Prisma models will be determined during Step 3 (Database Architecture Design), not finalized prematurely.

#### 4. Routes Involved
- `[[...sign-in]]`
- All authenticated dashboard routes (`/admin`, `/teacher`, `/student`, `/parent`, `/list/*`)

#### 5. Components Involved
- `Navbar.tsx` (`UserButton`)
- `LoginPage` (`SignIn.Root`, `SignIn.Step`)

#### 6. Dependencies
- `@clerk/nextjs`, `@clerk/elements`
- Node runtime HTTP client for Clerk Backend SDK

#### 7. Hidden Coupling
- **Two-Step Distributed Transaction**: Server Actions call Clerk API over HTTP, then write to PostgreSQL. If the DB write throws an error, the Clerk user is left permanently provisioned.
- **Client Route Push Coupling**: On login, `LoginPage` reads `user?.publicMetadata.role` to execute `router.push('/' + role)`. If metadata is missing or empty, the client is stranded on the login screen.

#### 8. User Provisioning Lifecycle Options (Architectural Decision for Step 1)
Rather than prescribing a simplistic sequence ("Create DB User → Create Clerk User" or vice-versa), the following lifecycle concerns must be designed in Step 1:
- Handling pending application identities before invitation acceptance.
- Assigning tenant membership and initial role prior to user credential setup.
- Clerk invitation dispatch vs. administrative account creation.
- Webhook synchronization from Clerk (`user.created`, `user.updated`, `user.deleted`).
- Idempotency keys to prevent duplicate user creation.
- Automated reconciliation jobs for failed provisioning sequences.

#### 9. Risks
- Identity desynchronization between Clerk and PostgreSQL if webhooks fail or fire out of order.
- Inability to log in during transition if Clerk session token template is modified before DB membership lookup is deployed.

#### 10. Data Migration Implications
- Existing users in Clerk must have corresponding `User` records created in PostgreSQL with their `clerkUserId` matching Clerk's `user_...` ID.

#### 11. Testing Requirements
- Webhook signature verification tests (Svix).
- End-to-end authentication flow: Sign-in -> Webhook ingest -> DB User sync -> Session verification.

---

### Stream 2: Authorization Migration (Current Roles/Checks → DB-Driven RBAC)

#### 1. Current Implementation
- Roles are static string constants (`"admin"`, `"teacher"`, `"student"`, `"parent"`).
- Route matching occurs in [src/middleware.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/middleware.ts) based on a hardcoded map in [src/lib/settings.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/settings.ts).
- Page-level authorization in list views conditionally renders UI columns: `...(role === "admin" ? [...] : [])`.
- Mutation authorization in [src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts) is **completely absent or commented out**.
- Target: Database-driven RBAC where permissions (e.g. `academic:class:write`, `student:profile:read`, `exam:marks:update`) are grouped into Roles, assigned to Tenant Memberships, and evaluated server-side.

#### 2. Files Involved
- [src/middleware.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/middleware.ts)
- [src/lib/settings.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/settings.ts) (`routeAccessMap`)
- [src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts) (All mutation handlers)
- [src/components/FormModal.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/FormModal.tsx)
- [src/components/FormContainer.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/FormContainer.tsx)
- All 18 `page.tsx` routes under `src/app/(dashboard)/`

#### 3. Models Involved
- **Current**: Fragmented `Admin`, `Teacher`, `Student`, `Parent`.
- **Proposed Conceptual Target**: `Role`, `Permission`, `RolePermission`, `AccessScope` (Platform vs Tenant).

#### 4. Routes Involved
- Every route in the application (`/admin`, `/teacher`, `/student`, `/parent`, `/list/*`).

#### 5. Components Involved
- `Menu.tsx` (filters navigation by role)
- `Navbar.tsx` (displays user role)
- `FormModal.tsx` & `FormContainer.tsx` (gates edit/delete/create buttons)

#### 6. Dependencies
- Database session context (resolving caller's active permissions for the active tenant).

#### 7. Hidden Coupling
- **Manual WHERE Clause Duplication**: Every list page (`exams/page.tsx`, `assignments/page.tsx`, `results/page.tsx`, `events/page.tsx`, `announcements/page.tsx`) duplicates an identical `switch(role)` block to construct queries. If RBAC changes, all 5+ pages must be updated simultaneously.

#### 8. Migration Sequence Dependencies
- Depends on **Stream 1 (Identity)** and **Stream 3 (Tenant & Membership)** being in place, because permissions must be evaluated *within the scope of a tenant membership*.

#### 9. Risks
- Performance penalty if permission sets are queried from PostgreSQL sequentially on every Server Component render without caching.
- Accidental authorization lockouts if default system roles are not seeded during initial migration.

#### 10. Data Migration Implications
- Default institutional roles (`SUPER_ADMIN`, `PRINCIPAL`, `TEACHER`, `STUDENT`, `PARENT`, `ACCOUNTANT`) must be seeded.
- Existing records must be mapped from string roles to foreign keys in `TenantMembership`.

#### 11. Testing Requirements
- Permission evaluation matrix unit tests.
- Negative authorization tests: Verifying that an unprivileged user invoking a Server Action receives an explicit `403 Forbidden` error.

---

### Stream 3: Multi-Tenancy Migration (Flat DB → Tenant + Membership + Isolated Data)

#### 1. Current Implementation
- Complete absence of multi-tenancy. A single flat database instance holds records for exactly one institution.
- Global unique constraints on `Subject.name`, `Class.name`, `Grade.level` enforce database-wide uniqueness.
- Target: Multi-tenancy where every business entity includes a `tenant_id` foreign key and composite uniqueness `@@unique([tenantId, ...])`.

#### 2. Files Involved
- [prisma/schema.prisma](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/prisma/schema.prisma)
- [prisma/seed.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/prisma/seed.ts)
- [src/lib/prisma.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/prisma.ts)
- [src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts) (Injecting `tenantId` on create)
- All 18 `page.tsx` routes under `src/app/(dashboard)/`

#### 3. Models Involved
- All 14 existing models in `schema.prisma`:
  `Admin`, `Student`, `Teacher`, `Parent`, `Grade`, `Class`, `Subject`, `Lesson`, `Exam`, `Assignment`, `Result`, `Attendance`, `Event`, `Announcement`.
- Proposed Conceptual Models:
  `Tenant`, `TenantMembership`, `AcademicYear`.

#### 4. Routes Involved
- All dashboard routes and list views.
- Dynamic routing: Evaluation of subdomain routing (`tenant.schoolyard.in`), path routing (`/:tenantSlug/...`), or other resolution mechanisms.

#### 5. Components Involved
- `DashboardLayout` ([src/app/(dashboard)/layout.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%28dashboard%29/layout.tsx))
- `Navbar.tsx` (Institution switcher / school badge)

#### 6. Dependencies & Tenant Context Security
- **Tenant Context Security Rules**:
  - The tenant must be resolved and verified server-side.
  - Tenant selection must be validated against the authenticated user's memberships in PostgreSQL.
  - Client-controlled tenant identifiers (such as raw request headers or query parameters) must **never** be trusted directly.
  - Headers may only be used as an internal transport mechanism after server-side verification.
  - The final tenant-resolution mechanism (subdomain, custom domain, path prefix, or another mechanism) is an architectural decision to be determined.
- **Tenant Isolation Evaluation**:
  - Evaluate application-level isolation (Prisma Client extensions/middleware), PostgreSQL Row-Level Security (RLS), or a combination during database architecture design. Trade-offs between application complexity and database-level enforcement must be evaluated before finalizing.

#### 7. Hidden Coupling
- **Foreign Key Cascades**: In `schema.prisma`, deleting a `Lesson` cascades to `Exam`, `Assignment`, `Attendance`. In a multi-tenant schema, a lack of soft deletes or missing `tenantId` checks on cascading operations risks cross-tenant data corruption.
- **Relational Integrity Assumptions**: `Student` references both `classId` and `gradeId` independently. If `classId` belongs to Tenant A and `gradeId` belongs to Tenant B, relational integrity is broken without composite foreign keys.

#### 8. Migration Sequence Dependencies
- Must be implemented **AFTER Foundation & Identity**, and **BEFORE Domain Models & Entitlements**.

#### 9. Risks
- Cross-tenant data leakage if a query omits tenant scoping.
- Performance degradation on large shared tables without composite indexes prefixed by `tenantId`.

#### 10. Data Migration Implications
- Data backfill: A default seed tenant (e.g. `tenant_default_01`) must be created.
- Existing rows across all 14 tables must be backfilled with `tenant_id = tenant_default_01`.
- Global unique constraints must be dropped and replaced with composite unique indexes.

#### 11. Testing Requirements
- Cross-tenant data isolation tests: Verify Tenant A cannot read or mutate Tenant B records under any circumstances.
- Tenant context resolution tests.

---

### Stream 4: Platform Administration Migration (Single Admin → SaaS Control Plane)

#### 1. Current Implementation
- The `/admin` dashboard ([src/app/(dashboard)/admin/page.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%28dashboard%29/admin/page.tsx)) represents a single-school administrator view.
- It displays hardcoded institution metrics (`UserCard` counting `prisma.admin`, `teacher`, `student`, `parent` across the whole DB) and mock charts (`FinanceChart.tsx`).
- There is **zero platform-level administration** (no ability to provision new schools, suspend tenants, manage subscription billing, or view global system health).

#### 2. Files Involved
- [src/app/(dashboard)/admin/page.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%28dashboard%29/admin/page.tsx)
- [src/components/UserCard.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/UserCard.tsx)
- [src/components/FinanceChart.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/FinanceChart.tsx)
- [src/components/Menu.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/Menu.tsx)

#### 3. Models Involved
- Proposed Conceptual Models: `Tenant`, `SubscriptionPlan`, `PlatformAdmin`, `TenantAuditLog`.

#### 4. Routes Involved
- `/admin` (Refactor into Tenant Admin dashboard)
- Proposed new route group: `/platform/*` (SaaS platform control plane)

#### 5. Components Involved
- `Menu.tsx` (must distinguish between Platform Admin navigation and Tenant Admin navigation)
- `UserCard.tsx` (must scope aggregations to active tenant)

#### 6. Dependencies
- Scope-aware authorization (`AccessScope: PLATFORM` vs `AccessScope: TENANT`).

#### 7. Hidden Coupling
- `UserCard.tsx` directly calls `prisma.admin.count()`, `prisma.teacher.count()`, etc., without any arguments. It assumes the database only has one school.

#### 8. Migration Sequence Dependencies
- Depends on **Stream 2 (RBAC Scopes)** and **Stream 3 (Tenant Models)**.

#### 9. Risks
- Privilege escalation: An institution admin accessing platform-level tenant management endpoints.

#### 10. Data Migration Implications
- Existing `Admin` records in `schema.prisma` must be classified as either Platform Super Admins or Tenant Institution Admins.

#### 11. Testing Requirements
- Strict authorization boundary tests preventing Tenant Admins from accessing Platform Control Plane APIs.

---

### Stream 5: Module Entitlements Migration (Static Links → Feature-Gated Access)

#### 1. Current Implementation
- Every screen, list view, and form is hardcoded as permanently active.
- [src/components/Menu.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/Menu.tsx) displays all 17 menu items to all tenants regardless of subscription tier.
- Target: Dynamic module entitlements where tenants subscribe to tiers (e.g. Starter, Growth, Enterprise) or toggle individual modules (e.g. Attendance, Fees, Timetable, Exams).

#### 2. Files Involved
- [src/components/Menu.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/Menu.tsx)
- [src/middleware.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/middleware.ts)
- [src/components/FormModal.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/FormModal.tsx)
- All `src/app/(dashboard)/list/*/page.tsx` routes

#### 3. Models Involved
- Proposed Conceptual Models: `ModuleEntitlement`, `SubscriptionPlan`, `ModuleFeatureFlag`.

#### 4. Routes Involved
- All list and dashboard routes (`/list/exams`, `/list/assignments`, `/list/attendance`, etc.).

#### 5. Components Involved
- `Menu.tsx` (dynamically hides disabled modules)
- Action buttons in list headers (e.g. `FormContainer table="exam" type="create"`)

#### 6. Dependencies
- Tenant Entitlement Service: Resolving active module licenses for the active tenant.

#### 7. Hidden Coupling
- Cross-module UI shortcuts: In [src/app/(dashboard)/list/teachers/[id]/page.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%28dashboard%29/list/teachers/%5Bid%5D/page.tsx), shortcuts link to `/list/classes`, `/list/students`, `/list/lessons`, `/list/exams`, `/list/assignments`. If the "Exams" module is disabled for a tenant, these shortcuts will lead to 403 Forbidden pages unless dynamically filtered.

#### 8. Migration Sequence Dependencies
- Depends on **Stream 3 (Tenant Foundation)**. Must be completed before deploying V1/V2/V3 rollout stages.

#### 9. Risks
- Tenant confusion if links are visible but throw authorization errors when clicked.
- Bypass of module gating via direct Server Action invocation if checks are only placed on UI menus.

#### 10. Data Migration Implications
- Existing tenant backfill must be granted all baseline V1 modules to prevent feature regression.

#### 11. Testing Requirements
- Entitlement gating tests: Verifying that disabling a module simultaneously blocks its UI routes, navigation links, and Server Actions.

---

### Stream 6: Auditability & Compliance Migration (Console Logs → Auditable Events)

#### 1. Current Implementation
- No audit logging exists.
- In [src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts), mutations execute silently or output raw error objects to `console.log(err)` in `catch` blocks.
- There is no record of who created, updated, or deleted a student, modified exam marks, or changed attendance.

#### 2. Files Involved
- [src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts)
- [src/lib/prisma.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/prisma.ts)
- Background worker for asynchronous consumers

#### 3. Models Involved
- Proposed Conceptual Model: `AuditLog` (`id`, `tenantId`, `actorId`, `action`, `entityType`, `entityId`, `oldState`, `newState`, `ipAddress`, `userAgent`, `timestamp`).

#### 4. Routes Involved
- All mutation endpoints and Server Actions.
- New administrative audit view: `/admin/audit-logs`.

#### 5. Components Involved
- Server Action action wrapper (`withAuditedAction`).

#### 6. Dependencies & Reliability Rules
- **Critical Audit Rule**: Critical business and security audit events must be persisted atomically with the corresponding database mutation in PostgreSQL when required for correctness. Critical audit history must never be placed solely on an asynchronous queue where failure would cause audit loss.
- Background queues are reserved for secondary event processing, notifications, exports, report generation, bulk imports, and non-critical downstream consumers.

#### 7. Hidden Coupling
- Current Server Actions lack caller IP address and User Agent because they are standard server functions rather than Route Handlers receiving `NextRequest`. Passing request telemetry requires extracting headers via `next/headers`.

#### 8. Migration Sequence Dependencies
- Depends on **Stream 1 (Identity)**, **Stream 2 (RBAC)**, and **Stream 3 (Tenant Context)** to capture `actorId` and `tenantId`.

#### 9. Risks
- Database storage bloat if detailed JSON diffs are written to PostgreSQL without a data retention / archival policy.
- Performance degradation if non-essential telemetry is logged synchronously.

#### 10. Data Migration Implications
- Clean slate: `AuditLog` starts empty; no historical audit data exists to migrate.

#### 11. Testing Requirements
- Mutation audit emitter tests: Verifying that executing a mutation reliably writes an atomic audit event with accurate diff payloads.

---

## 3. The Target SaaS Dependency Hierarchy

Every architectural layer in the target system strictly depends on the layer immediately preceding it:

```
1. FOUNDATION             (DB pooling, Prisma extension harness, AsyncLocalStorage context)
    ↓
2. IDENTITY               (Clerk Auth JWT/sub, PostgreSQL User model, webhook sync)
    ↓
3. TENANT                 (Tenant model, server-side resolution, isolation evaluation)
    ↓
4. MEMBERSHIP             (TenantMembership junction, User-Tenant binding, active context)
    ↓
5. RBAC                   (Role & Permission models, AccessScope: Platform vs Tenant, policy engine)
    ↓
6. TENANT-SCOPED DOMAIN   (Subject, Class, Grade, Teacher, Student, Lesson, composite keys)
    ↓
7. MODULE ENTITLEMENTS    (Subscription tiers, feature flags, tenant module gateways)
    ↓
8. APPLICATION SCREENS    (Dashboard layout, mobile PWA shell, list views, modal dialogs)
    ↓
9. WORKFLOWS              (Redis & BullMQ workers, notification dispatchers, bulk CSV imports)
    ↓
10. REPORTING & AUTOMATION (Report card generators, export jobs, downstream analytics)
```

The accompanying diagram [docs/architecture-audit/diagrams/migration-dependency.mmd](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/diagrams/migration-dependency.mmd) visualizes this hierarchy alongside current codebase inversions.

---

## 4. Current Codebase Conflicts & Structural Inversions

Comparing the existing codebase against the target dependency order reveals **5 critical structural inversions**:

### Violation 1: Direct Coupling to Clerk Roles (Circumvents Layers 2, 4, and 5)
- **The Conflict**: [src/middleware.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/middleware.ts), [src/components/Menu.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/Menu.tsx), and all list pages read `sessionClaims.metadata.role` directly from Clerk's JWT.
- **Why It Violates Hierarchy**: Authorization is being decided at the edge based on Identity Provider metadata, completely skipping Layer 2 (DB Identity), Layer 3 (Tenant Context), Layer 4 (Tenant Membership), and Layer 5 (DB RBAC).
- **Resolution Path**: Clerk must only provide `userId` (`sub`). The application must resolve the caller's active `TenantMembership` and query permissions from PostgreSQL.

### Violation 2: Screens Querying Unscoped Global Models (Bypasses Layers 3, 4, 5, and 6)
- **The Conflict**: Every `page.tsx` file executes raw Prisma queries (`prisma.teacher.findMany()`, `prisma.student.findMany()`) without any tenant filtering.
- **Why It Violates Hierarchy**: Layer 8 (Application Screens) is directly coupled to Layer 6 (Domain Models) without passing through Layer 3 (Tenant Resolution) or Layer 5 (RBAC policy evaluation).
- **Resolution Path**: Route data loaders must query through a Tenant-Scoped Service Layer or Prisma Client Extension that automatically injects `tenantId`.

### Violation 3: Inverted User Provisioning Lifecycle (Bypasses Layers 2, 3, 4, and 9)
- **The Conflict**: In `createTeacher` and `createStudent` in [src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts), the application calls `clerkClient.users.createUser()` *before* creating the database record, with zero transactional isolation.
- **Why It Violates Hierarchy**: Mutations trigger external third-party identity creation before validating domain rules, assigning tenant memberships, or establishing audit records.
- **Resolution Path**: Design an idempotent user onboarding lifecycle (pending identity, tenant membership, Clerk invitation/creation, webhook synchronization, retry/recovery) in Step 1.

### Violation 4: Global Database Constraints Blocking Multi-Tenancy (Blocks Layer 3)
- **The Conflict**: `Grade.level`, `Subject.name`, and `Class.name` are marked `@unique` globally across the entire database in [prisma/schema.prisma](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/prisma/schema.prisma).
- **Why It Violates Hierarchy**: Domain models (Layer 6) cannot support multiple tenants (Layer 3) because School B cannot create a class named "10A" if School A already has one.
- **Resolution Path**: Drop all global unique constraints on academic entities and replace them with composite constraints: `@@unique([tenantId, name])`.

### Violation 5: Static Hardcoded Module Gating (Bypasses Layer 7)
- **The Conflict**: [src/components/Menu.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/Menu.tsx) and [src/components/FormModal.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/FormModal.tsx) hardcode all modules as active.
- **Why It Violates Hierarchy**: Application screens (Layer 8) presume that every tenant has licensed every feature, completely ignoring Layer 7 (Module Entitlements).
- **Resolution Path**: Wrap navigation links, route handlers, and mutation actions in an entitlement guard that checks `tenant.hasModule(MODULE_KEY)`.

---

## 5. Summary & Prerequisite Sequencing for Future Phases

To prevent breaking existing functionality during the upcoming migration steps, changes must strictly follow the target dependency order:

1. **Step 1**: Establish **FOUNDATION** (Connection pooling, Prisma client extension harness, AsyncLocalStorage context).
2. **Step 2**: Implement **IDENTITY** (PostgreSQL `User` model, Clerk Webhook synchronization, decoupling Clerk roles).
3. **Step 3**: Introduce **TENANT & MEMBERSHIP** (`Tenant` model, `TenantMembership` junction, tenant context middleware).
4. **Step 4**: Build **DB-DRIVEN RBAC** (`Role`, `Permission`, `RolePermission`, policy evaluation engine).
5. **Step 5**: Migrate **TENANT-SCOPED DOMAIN MODELS** (Backfill `tenant_id`, replace global unique constraints with composite keys).
6. **Step 6**: Implement **MODULE ENTITLEMENTS** (Subscription tiers, tenant feature gating).
7. **Step 7**: Refactor **APPLICATION SCREENS & SERVER ACTIONS** (Integrate screens with tenant context and permission guards).
8. **Step 8**: Deploy **WORKFLOWS & AUDIT LOGGING** (BullMQ + Redis workers, async notification dispatchers, audit log emitters).
