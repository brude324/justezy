# Step 0C: Architecture Decision Register (ADR)

## Executive Summary

This Architecture Decision Register (ADR) defines the technical parameters, structural trade-offs, and design baselines for the upcoming SaaS transformation of SchoolyardSMS into an enterprise-grade multi-tenant educational platform for Indian institutions.

Each decision is evaluated against:
1. The established project directives (Clerk for Identity only; PostgreSQL for DB RBAC, Multi-tenancy, and Entitlements).
2. Physical evidence discovered during the Step 0 codebase audit.
3. Scalability, isolation, and compliance requirements.

---

## Decision Index

| ADR ID | Decision Title | Scope | Required Before Step 1? |
| :---: | :--- | :--- | :---: |
| **ADR-001** | Clerk Authentication vs. Self-Hosted Authentication | Identity & Authentication | **YES** |
| **ADR-002** | Clerk Organizations vs. Application-Level Tenant Model | Multi-Tenancy Authority | **YES** |
| **ADR-003** | Database-Driven Dynamic RBAC Design | Authorization Architecture | **YES** |
| **ADR-004** | Tenant Isolation Strategy | Multi-Tenancy Data Layer | **YES** |
| **ADR-005** | User Identity & Profile Modeling | Identity & Profile Separation | **YES** |
| **ADR-006** | Role Hierarchy & Inheritance Model | Access Control Structure | **YES** |
| **ADR-007** | Fine-Grained Permission Model | Action-Level Authorization | **YES** |
| **ADR-008** | Access Scopes (Platform Control Plane vs. Tenant Scope) | Administrative Boundaries | **YES** |
| **ADR-009** | Module & Feature Entitlement Architecture | Subscription Licensing | **YES** |
| **ADR-010** | Prisma Transaction Strategy & Concurrency Control | Data Consistency | **YES** |
| **ADR-011** | API Architecture (REST, RPC, or Direct Data Layer) | Network Contract | **YES** |
| **ADR-012** | Next.js Server Actions vs. Route Handlers | Server Mutation Pattern | **YES** |
| **ADR-013** | Background Queue Architecture | Asynchronous Processing | **YES** |
| **ADR-014** | Redis Dependency & Connection Architecture | State & Cache Storage | **YES** |
| **ADR-015** | Object & File Storage Pipeline | Media & Document Storage | **NO** |
| **ADR-016** | Email Delivery Architecture | Outbound Communications | **NO** |
| **ADR-017** | Multi-Channel Notification Architecture | Alerting & Dispatch | **NO** |
| **ADR-018** | Transactional & Operational Audit Logging Engine | Security & Compliance | **YES** |
| **ADR-019** | PWA & Client-Side Cache Strategy | Offline & Mobile Readiness | **NO** |
| **ADR-020** | Testing Pyramid & Test Infrastructure | Quality Assurance | **YES** |
| **ADR-021** | Automated CI/CD Pipeline Gates | Build & Deployment | **YES** |
| **ADR-022** | Database Migration & Rollback Strategy | Data Lifecycle | **YES** |
| **ADR-023** | Seed & Demo Data Strategy | Developer Experience | **YES** |
| **ADR-024** | Staging vs. Production Environment Topology | Deployment Infrastructure | **YES** |
| **ADR-025** | Centralized Logging & Observability | System Operations | **NO** |
| **ADR-026** | Error Tracking & Exception Reporting | Application Monitoring | **NO** |
| **ADR-027** | Data Retention & Soft Deletion Policy | Compliance & Data Safety | **YES** |
| **ADR-028** | Multi-Tenant Database Performance & Scaling Strategy | Scalability Baseline | **YES** |

---

## Detailed Architecture Decision Records

### ADR-001: Clerk Authentication vs. Self-Hosted Authentication
- **Current State**: `@clerk/nextjs` (5.4.1) handles sign-in with custom `@clerk/elements` form, storing role in `publicMetadata`.
- **Problem**: Project requires enterprise identity without building custom credential storage, hashing, passkeys, MFA, or session cookie lifecycle from scratch, while strictly prohibiting Clerk from owning business authorization.
- **Options**:
  - *Option A*: Retain Clerk as dedicated Identity Provider (IdP) for authentication only (`sub`, credentials, session token, MFA). Strip authorization metadata.
  - *Option B*: Replace Clerk entirely with custom self-hosted NextAuth / Auth.js or Lucia Auth in PostgreSQL.
- **Important Trade-offs**:
  - *Option A*: Eliminates compliance burden for passwords/MFA; provides enterprise SSO; costs scale with MAU; requires webhook synchronization.
  - *Option B*: Zero per-user SaaS license fees; complete ownership; massive development overhead for security, session revocation, token rotation, and phone OTP integration.
- **Dependencies**: ADR-005 (Identity Mapping), ADR-002 (Tenant Model).
- **Migration Impact**: Clean separation. Server Actions stop pushing `publicMetadata.role`. Middleware verifies JWT only.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-002: Clerk Organizations vs. Application-Level Tenant Model
- **Current State**: Flat single-tenant schema. Zero organization or tenant concepts in Clerk or DB.
- **Problem**: Need to support thousands of schools, branches, and multi-school trusts in India. We must choose whether Clerk Organizations or PostgreSQL models dictate tenancy.
- **Options**:
  - *Option A*: Use Clerk Organizations feature to store tenants and memberships.
  - *Option B*: Build an Application-Level Tenant Model in PostgreSQL (`Tenant` and `TenantMembership`), using Clerk strictly for global user credentials.
- **Important Trade-offs**:
  - *Option A*: High external vendor lock-in; Clerk pricing tiers charge steeply for B2B Organizations; rigid role models within Clerk; difficult to implement Indian educational hierarchies (trusts -> schools -> campuses -> sections).
  - *Option B*: Full schema flexibility; unlimited tenants and branches at zero extra auth cost; total control over tenant lifecycle, data export, and custom subdomains.
- **Dependencies**: ADR-001 (Clerk Identity), ADR-004 (Tenant Isolation).
- **Migration Impact**: Prevents coupling tenant lifecycle to Clerk API. All tenant metadata resides in PostgreSQL.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-003: Database-Driven Dynamic RBAC Design
- **Current State**: Static string roles (`"admin"`, `"teacher"`, `"student"`, `"parent"`) hardcoded in `settings.ts` and Clerk metadata. Zero database RBAC tables.
- **Problem**: Indian educational institutions require dynamic roles (e.g. Principal, Vice Principal, Head of Department, Class Teacher, Fee Collector, Examination In-Charge) with granular, customizable permissions per tenant.
- **Options**:
  - *Option A*: Hardcoded enum roles with code-level permission switches.
  - *Option B*: Relational DB-driven RBAC (`Role`, `Permission`, `RolePermission`, `TenantMembership`).
  - *Option C*: External authorization engine (e.g., Cerbos, Ory Keto, Casbin).
- **Important Trade-offs**:
  - *Option A*: Inflexible; cannot support custom roles required by different schools.
  - *Option B*: Fully dynamic; auditable in SQL; supports custom institutional roles; requires efficient in-memory caching to avoid database query overhead per request.
  - *Option C*: High operational overhead; requires running and maintaining external microservice daemons.
- **Dependencies**: ADR-002 (Tenant Model), ADR-007 (Permission Model), ADR-014 (Redis Caching).
- **Migration Impact**: Requires new Prisma RBAC schema, permission evaluation service, and updating all page guards.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-004: Tenant Isolation Strategy
- **Current State**: Single shared schema with no tenant discriminator; cross-tenant queries are currently impossible to prevent.
- **Problem**: Ensuring absolute data isolation between competing educational institutions on a shared infrastructure.
- **Options**:
  - *Option A*: Database-per-tenant (Separate PostgreSQL database per school).
  - *Option B*: Schema-per-tenant (Single DB, separate PostgreSQL schema per school).
  - *Option C*: Shared-database, shared-schema with tenant discriminator (`tenant_id`).
- **Evaluation Requirement**:
  - Evaluate application-level isolation (Prisma Client extensions/middleware), PostgreSQL Row-Level Security (RLS), or a combination during database architecture design.
  - Do not declare PostgreSQL RLS mandatory or select one prematurely before Step 3.
- **Important Trade-offs**:
  - *Option A*: Maximum isolation; high infrastructure cost; complex connection pooling; cumbersome migrations across hundreds of databases.
  - *Option B*: Moderate isolation; migration maintenance becomes complex at scale.
  - *Option C*: Most cost-effective, standard SaaS pattern; fast onboarding; requires rigorous query scoping in data access layer to prevent data leaks.
- **Dependencies**: ADR-002 (Tenant Model), ADR-010 (Prisma Strategy).
- **Migration Impact**: Requires adding `tenantId` to all business models and configuring Prisma Client extensions.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-005: User Identity & Profile Modeling
- **Current State**: `Teacher`, `Student`, `Admin`, and `Parent` models use Clerk `user_...` string as their primary key (`id String @id`).
- **Problem**: Binds database primary keys permanently to Clerk. If a user has multiple roles (e.g. a teacher who is also a parent of a student), the schema breaks due to primary key collisions across separate tables.
- **Preferred Conceptual Model**:
  - `User`: Identity/person record (storing `id`, `clerkUserId`, `email`, `phone`, `name`).
  - `TenantMembership`: Relationship between `User` and `Tenant` (capturing role, scope, and membership status).
  - Domain/Profile entities: Conceptual `StudentProfile`, `StaffProfile` / `TeacherProfile`, `ParentProfile`, and other future profiles as required.
  - *Note*: Exact physical Prisma models will be determined during Step 3 (Database Architecture Design), not finalized prematurely.
- **User Provisioning Lifecycle Options (To Be Decided in Step 1)**:
  - Address the user provisioning lifecycle problem (pending identity, tenant membership assignment, Clerk invitation vs creation, webhook synchronization, idempotency, and failure recovery) as an architecture decision in Step 1.
- **Dependencies**: ADR-001 (Clerk Identity), ADR-003 (RBAC).
- **Migration Impact**: Existing foreign keys (`studentId`, `teacherId`) will migrate to reference internal user or profile identifiers.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-006: Role Hierarchy & Inheritance Model
- **Current State**: Four disjoint roles with no inheritance.
- **Problem**: Administrative overhead if every permission must be individually assigned without structured hierarchies or presets.
- **Options**:
  - *Option A*: Flat roles (Every role is independent; permissions are explicitly attached).
  - *Option B*: Hierarchical role inheritance (e.g., `SuperAdmin` inherits `Admin`, which inherits `Staff`).
  - *Option C*: System Base Roles + Custom Tenant Extensions (Predefined immutable system roles with permissions, plus tenant-created custom roles).
- **Important Trade-offs**:
  - *Option B*: High query complexity; computing recursive role trees in SQL adds latency.
  - *Option C*: Ideal balance; provides rock-solid out-of-the-box roles (Principal, Teacher, Student) while empowering schools to define custom staff roles.
- **Dependencies**: ADR-003 (DB-driven RBAC).
- **Migration Impact**: Defines default seed migration records for base roles.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-007: Fine-Grained Permission Model
- **Current State**: Coarse page-level role arrays (`allowedRoles: ["admin", "teacher"]`).
- **Problem**: Need granular control (e.g., Teacher A can submit marks for Class 10A, but cannot publish final report cards).
- **Options**:
  - *Option A*: Coarse resource actions (e.g. `read:students`, `write:students`).
  - *Option B*: Granular domain permissions formatted as `<domain>:<subdomain>:<action>` (e.g. `academic:exam:publish`, `student:attendance:record`, `finance:fee:collect`).
- **Important Trade-offs**:
  - *Option A*: Simpler to manage; fails to support enterprise institutional segregation of duties.
  - *Option B*: Scalable to V1/V2/V3 modules; aligns with future compliance and workflow approval requirements.
- **Dependencies**: ADR-003 (RBAC), ADR-008 (Scopes).
- **Migration Impact**: Replaces all inline `role === "admin"` conditionals with `hasPermission('academic:subject:create')`.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-008: Access Scopes (Platform Control Plane vs. Tenant Scope)
- **Current State**: Single `/admin` route mixing institutional stats with global metrics.
- **Problem**: SaaS operators need global management (tenants, subscriptions, billing), while school principals need institution-only management.
- **Options**:
  - *Option A*: Single RBAC scope with an `is_platform_admin` boolean flag on users.
  - *Option B*: Strict Dual-Plane Scope Architecture:
    - `AccessScope: PLATFORM` (Platform Admin, Support Engineer, Billing Manager) operating on `/platform/*`.
    - `AccessScope: TENANT` (Principal, Teacher, Student, Parent) operating within tenant context (`/:tenant/*`).
- **Important Trade-offs**:
  - *Option A*: High risk of privilege escalation; accidental omission of tenant filter exposes all institutions.
  - *Option B*: Absolute boundary separation; dedicated middleware and routing pipelines for SaaS operations.
- **Dependencies**: ADR-002 (Tenant Model), ADR-003 (RBAC).
- **Migration Impact**: Refactors `/admin` into `/tenant/dashboard` and reserves `/platform` for SaaS super-admins.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-009: Module & Feature Entitlement Architecture
- **Current State**: Hardcoded static access; all modules visible to all users.
- **Problem**: SaaS monetization requires subscription tiers (e.g., Basic = Attendance + Timetable; Pro = Exams + Results; Enterprise = Fees + Custom Workflows + Advanced Analytics).
- **Options**:
  - *Option A*: Hardcoded code-level checks per school ID.
  - *Option B*: Database-driven feature gating (`ModuleEntitlement` or `SubscriptionPlan` specifying enabled module keys).
- **Important Trade-offs**:
  - *Option A*: Not scalable; requires code deployments to change school subscriptions.
  - *Option B*: Dynamic license updates; seamlessly integrates with self-serve billing and V1/V2/V3 phased rollouts.
- **Dependencies**: ADR-002 (Tenant Model), ADR-004 (Tenant Isolation).
- **Migration Impact**: Menu rendering, route matching, and server action guards check module enablement before evaluating user permissions.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-010: Prisma Transaction Strategy & Concurrency Control
- **Current State**: Uncoordinated individual queries or raw `prisma.$transaction([query1, query2])`.
- **Problem**: Multi-row operations (e.g., enrolling students, generating timetable slots, updating class capacity) risk race conditions and inconsistent states under concurrent operations.
- **Options**:
  - *Option A*: Sequential un-transactional queries.
  - *Option B*: Interactive transactions (`prisma.$transaction(async (tx) => { ... })`) with explicit timeout settings and optimistic concurrency control (`version` column).
- **Important Trade-offs**:
  - *Option A*: Data corruption on network or database interruption.
  - *Option B*: Guarantees ACID atomicity; requires keeping interactive transaction blocks short to prevent connection pool exhaustion.
- **Dependencies**: ADR-004 (Tenant Isolation), ADR-028 (Scaling).
- **Migration Impact**: Wraps all multi-entity mutations in `actions.ts` into interactive transactions.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-011: API Architecture (REST, RPC, or Direct Data Layer)
- **Current State**: Zero API route handlers. 100% of data reads are RSC direct queries, and 100% of mutations are Server Actions.
- **Problem**: Mobile PWA background sync, external webhooks (Clerk, WhatsApp), and potential mobile clients require standardized HTTP endpoints.
- **Options**:
  - *Option A*: Maintain Server Actions only for everything.
  - *Option B*: Hybrid Architecture: Next.js Server Actions for web form mutations + Type-safe Route Handlers (`src/app/api/...`) for webhooks, file downloads, and PWA background sync.
  - *Option C*: Full tRPC or GraphQL layer.
- **Important Trade-offs**:
  - *Option A*: Incompatible with external webhooks and headless mobile clients.
  - *Option B*: Maximizes Next.js 14 ergonomic strengths for web UI while providing clean HTTP endpoints for integrations.
  - *Option C*: Excessive overhead for existing application scale.
- **Dependencies**: ADR-001 (Clerk Webhooks), ADR-012 (Server Actions vs Route Handlers).
- **Migration Impact**: Introduces `src/app/api/webhooks/*` and service-layer extraction.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-012: Next.js Server Actions vs. Route Handlers
- **Current State**: Raw exported server actions in a single file ([src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts)) called via React `useFormState`.
- **Problem**: Existing Server Actions lack middleware, authentication guards, and validation wrappers.
- **Options**:
  - *Option A*: Continue writing raw Server Actions with manual error handling.
  - *Option B*: Standardize on an Action Wrapper Pattern (`createAuthorizedAction`) providing schema parsing (Zod), verified tenant context injection, permission verification, and audit logging.
- **Important Trade-offs**:
  - *Option A*: Severe security risk (as audited in Step 0); code duplication across every action.
  - *Option B*: Enforces strict authorization and tenant isolation centrally before handler logic executes.
- **Dependencies**: ADR-003 (RBAC), ADR-004 (Tenant Isolation), ADR-018 (Audit Logging).
- **Migration Impact**: Refactors `src/lib/actions.ts` into domain-specific action modules wrapped in security middleware.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-013: Background Queue Architecture
- **Current State**: Completely absent. Third-party HTTP requests run synchronously.
- **Problem**: Notifications, bulk CSV student imports, and PDF report cards may exceed serverless/edge request timeouts.
- **Options**:
  - *Option A*: In-process Node.js background timers (`setInterval`, unawaited Promises).
  - *Option B*: Dedicated BullMQ + Redis job worker running in a standalone process.
  - *Option C*: Cloud-specific queue services (AWS SQS, Google Cloud Tasks).
- **Important Trade-offs**:
  - *Option A*: Jobs lost on server restart; exhausts Next.js memory; impossible to scale.
  - *Option B*: High performance; reliable retries; dead-letter queues; cloud-agnostic; runnable locally via Docker Compose.
  - *Option C*: Vendor lock-in; complex local developer emulation.
- **Dependencies**: ADR-014 (Redis Dependency).
- **Migration Impact**: Introduces background worker entrypoint, Redis configuration, and async job dispatchers.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-014: Redis Dependency & Connection Architecture
- **Current State**: No Redis client or instance in codebase.
- **Problem**: Required for BullMQ job queues, RBAC permission caching, rate-limiting, and ephemeral session cache.
- **Options**:
  - *Option A*: Self-hosted Redis via Docker / managed Redis instance (AWS ElastiCache / Redis Cloud).
  - *Option B*: HTTP-based Redis (Upstash).
- **Important Trade-offs**:
  - *Option A*: Native TCP protocol required for BullMQ; ultra-low latency; predictable cost.
  - *Option B*: Serverless-friendly; incompatible with BullMQ's continuous pub/sub blocking commands.
- **Dependencies**: ADR-013 (Queue Architecture), ADR-003 (RBAC Caching).
- **Migration Impact**: Adds `ioredis` / `bullmq` to dependencies; updates `docker-compose.yml` to include a Redis service.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-015: Object & File Storage Pipeline
- **Current State**: Unsigned client upload widget via `next-cloudinary` into a single shared cloud folder (`uploadPreset="school"`).
- **Problem**: Security hazard; zero multi-tenant folder isolation; unsuited for private documents (exam papers, report cards, fee receipts).
- **Options**:
  - *Option A*: Retain Cloudinary with signed backend upload presets.
  - *Option B*: Multi-tenant S3-compatible Object Storage (AWS S3, Cloudflare R2, MinIO) with pre-signed upload URLs and strict tenant prefixes (`tenants/{tenantId}/{category}/{fileId}`).
- **Important Trade-offs**:
  - *Option A*: High bandwidth/storage cost; media-focused, poor document permission control.
  - *Option B*: Industry-standard for SaaS; private bucket access via time-limited pre-signed URLs; low cost; full tenant isolation.
- **Dependencies**: ADR-004 (Tenant Isolation).
- **Migration Impact**: Replaces `CldUploadWidget` with a custom upload component backed by a pre-signed URL generator.
- **Decision Required Before Step 1?**: **NO** (Can be implemented during storage module rollout).

---

### ADR-016: Email Delivery Architecture
- **Current State**: Completely absent.
- **Problem**: Password resets, staff invitations, report cards, and administrative alerts require transactional email.
- **Options**:
  - *Option A*: Direct SMTP connection inside Server Actions.
  - *Option B*: API-based Transactional Email Service (Resend, AWS SES, SendGrid) dispatched via BullMQ.
- **Important Trade-offs**:
  - *Option A*: Slow; blocks request thread; high risk of IP blacklisting.
  - *Option B*: High deliverability; asynchronous queueing; webhook tracking for bounces and deliveries.
- **Dependencies**: ADR-013 (Queue Architecture).
- **Migration Impact**: Adds email worker consumer and templating engine (React Email).
- **Decision Required Before Step 1?**: **NO** (Required in Phase 2 communications).

---

### ADR-017: Multi-Channel Notification Architecture
- **Current State**: Static announcements in database; zero messaging capabilities.
- **Problem**: Indian schools rely primarily on WhatsApp and SMS for parent notifications, with web push as secondary.
- **Options**:
  - *Option A*: Point-to-point provider calls directly in UI handlers.
  - *Option B*: Unified Notification Dispatcher pattern with provider adapters (WhatsApp Business API / Gupshup, SMS / Twilio, Web Push, In-App).
- **Important Trade-offs**:
  - *Option A*: Fragile; impossible to maintain when changing telecom/messaging vendors.
  - *Option B*: Centralized routing, template management, retry logic, and fallback delivery (e.g. if WhatsApp fails, fallback to SMS).
- **Dependencies**: ADR-013 (Queue Architecture), ADR-019 (PWA Web Push).
- **Migration Impact**: Decouples announcements from UI; routes alerts through background queues.
- **Decision Required Before Step 1?**: **NO** (Phase 2 / V2 Module).

---

### ADR-018: Transactional & Operational Audit Logging Engine
- **Current State**: Zero audit logs. Errors printed to `console.log`.
- **Problem**: Educational data compliance and institutional accountability require non-repudiable logs of who edited grades, modified attendance, or changed fee records.
- **Options**:
  - *Option A*: Synchronous database inserts for all logs.
  - *Option B*: Dual-Mode Logging Strategy:
    - *Critical Business & Security Events*: Persisted atomically in PostgreSQL within the primary database transaction when required for correctness (guaranteeing critical history cannot disappear if a queue fails).
    - *Non-Critical Operational Telemetry*: Dispatched asynchronously via BullMQ for downstream analytics, notifications, and export generation.
- **Important Trade-offs**:
  - *Option A*: Adds latency to every mutation; increases database connection contention.
  - *Option B*: Guarantees data integrity for security-critical actions while keeping operational event overhead minimal.
- **Dependencies**: ADR-003 (RBAC), ADR-004 (Tenant Isolation), ADR-013 (Queues).
- **Migration Impact**: Introduces `AuditLog` table and audit middleware wrapper for Server Actions.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-019: PWA & Client-Side Cache Strategy
- **Current State**: Current audit fact: PWA is completely absent (no manifest, no service worker). Target product requirement: PWA-first mobile web application.
- **Problem**: Designing an offline and mobile-friendly strategy without disrupting standard App Router hydration.
- **Options**:
  - *Option A*: Manual vanilla service worker (`public/sw.js`).
  - *Option B*: Next.js PWA framework integration (`@serwist/next`) with Workbox strategies (Stale-While-Revalidate for timetables/announcements, Network-First for mutations).
- **Important Trade-offs**:
  - *Option A*: Complex lifecycle management, cache invalidation bugs, and high maintenance overhead.
  - *Option B*: Standardized, TypeScript-native service worker compilation with seamless Next.js App Router asset hashing.
- **Dependencies**: ADR-011 (API Architecture).
- **Migration Impact**: Configures `@serwist/next` in `next.config.mjs`, adds `manifest.webmanifest`, and provides offline fallback routes.
- **Decision Required Before Step 1?**: **NO** (Client layer rollout).

---

### ADR-020: Testing Pyramid & Test Infrastructure
- **Current State**: Zero tests, zero test runner, zero test configuration.
- **Problem**: High risk of regression during schema overhaul, authentication decoupling, and RBAC implementation.
- **Options**:
  - *Option A*: Defer testing until migration code is written.
  - *Option B*: Establish testing harness immediately before Step 1:
    - *Unit / Logic*: Vitest (Fast in-memory testing of Zod schemas, utilities, RBAC permission calculators).
    - *Database Integration*: Ephemeral PostgreSQL test container testing tenant-scoped queries.
    - *End-to-End*: Playwright smoke tests for authentication redirects and navigation.
- **Important Trade-offs**:
  - *Option A*: Guarantees regressions, broken schemas, and untraceable bugs during architectural refactoring.
  - *Option B*: Small upfront investment that provides continuous verification for every subsequent migration step.
- **Dependencies**: None.
- **Migration Impact**: Adds `vitest`, `@testing-library/react`, `playwright` to `devDependencies`; adds `npm test` script.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-021: Automated CI/CD Pipeline Gates
- **Current State**: Zero CI workflows; direct push to `main` without automated verification.
- **Problem**: Broken builds, type errors, or failed Prisma migrations can be deployed silently to production.
- **Options**:
  - *Option A*: Manual local verification before deployment.
  - *Option B*: GitHub Actions CI Pipeline enforcing strict blocking gates on pull requests:
    1. `npm run lint` (ESLint)
    2. `npx tsc --noEmit` (TypeScript strict typecheck)
    3. `npm test` (Vitest unit & integration tests)
    4. `npx prisma validate` (Schema validation)
    5. `npm run build` (Next.js compilation)
- **Important Trade-offs**:
  - *Option A*: High human error rate.
  - *Option B*: Automates quality control; prevents broken migrations from reaching main branches.
- **Dependencies**: ADR-020 (Testing).
- **Migration Impact**: Creates `.github/workflows/ci.yml`.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-022: Database Migration & Rollback Strategy
- **Current State**: Manual `prisma migrate dev` (which was improperly baked into the Dockerfile).
- **Problem**: Production database schema changes in a multi-tenant SaaS must be zero-downtime, non-destructive, and backward-compatible.
- **Options**:
  - *Option A*: Run `prisma migrate dev` on live production databases.
  - *Option B*: Strict Expand-and-Contract Migration Workflow using `prisma migrate deploy`:
    1. *Expand*: Add new tables (`User`, `Tenant`, `Role`), add nullable `tenant_id` columns.
    2. *Backfill*: Migrate existing data and assign foreign keys.
    3. *Contract*: Apply `NOT NULL` constraints, drop obsolete tables (`Admin`, legacy columns).
- **Important Trade-offs**:
  - *Option A*: Catastrophic risk of data loss or schema drift in production.
  - *Option B*: Standard enterprise practice; guarantees zero downtime and reversible deployment steps.
- **Dependencies**: ADR-004 (Tenant Isolation), ADR-010 (Prisma Strategy).
- **Migration Impact**: Separates schema expansion from legacy model deprecation into distinct migration milestones.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-023: Seed & Demo Data Strategy
- **Current State**: [prisma/seed.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/prisma/seed.ts) seeds mock strings (`teacher1`, `student1`) disconnected from Clerk IDs.
- **Problem**: Developers and automated tests need realistic Indian school data (CBSE classes, academic years, realistic names) linked to authenticated test accounts.
- **Options**:
  - *Option A*: Retain static disconnected seed script.
  - *Option B*: Modular Multi-Tenant Seeder:
    - Seeds a Platform Admin account.
    - Seeds two distinct sample schools (e.g., "Delhi Public Academy" and "St. Xavier's High School").
    - Populates academic hierarchies, classes, subjects, teachers, and students.
    - Configures deterministic synthetic test identities for automated E2E testing.
- **Important Trade-offs**:
  - *Option A*: Developers cannot test multi-tenant boundaries or real UI states.
  - *Option B*: Provides immediate verification of multi-tenant isolation and role dashboards.
- **Dependencies**: ADR-002 (Tenant Model), ADR-003 (RBAC).
- **Migration Impact**: Complete overhaul of `prisma/seed.ts`.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-024: Staging vs. Production Environment Topology
- **Current State**: Flat single-environment setup (`.env.local`).
- **Problem**: Developing directly against production databases or shared Clerk instances causes data contamination and user disruption.
- **Options**:
  - *Option A*: Single shared environment with feature flags.
  - *Option B*: Dedicated Three-Tier Topology:
    - *Local Development*: Local PostgreSQL (Docker), local Redis, Clerk Development instance.
    - *Staging / Preview*: Hosted staging PostgreSQL, managed Redis, Clerk Staging instance.
    - *Production*: Highly-available PostgreSQL (with connection pooling), Redis cluster, Clerk Production instance with custom domain authentication.
- **Important Trade-offs**:
  - *Option A*: Unacceptable risk of testing in production.
  - *Option B*: Isolates test data and synthetic Clerk users completely from production tenant data.
  - *Credential Hygiene*: Leaked credentials in `.env.example` appear to contain sensitive material and require immediate rotation/revocation.
- **Dependencies**: ADR-001 (Clerk Identity), ADR-021 (CI/CD).
- **Migration Impact**: Requires configuring environment variables and Clerk application instances per tier.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-025: Centralized Logging & Observability
- **Current State**: `console.log()` outputs scattered across code.
- **Problem**: Inability to diagnose cross-tenant errors, slow queries, or failed background jobs in production.
- **Options**:
  - *Option A*: Standard stdout `console.log`.
  - *Option B*: Structured JSON Logging (Pino) tagged with `tenantId`, `traceId`, and `userId`, ingested into a centralized log management provider.
- **Important Trade-offs**:
  - *Option A*: Unsearchable, unindexed, lacks context in serverless/container environments.
  - *Option B*: Fast root-cause analysis; automated alerting on error spikes per tenant.
- **Dependencies**: ADR-004 (Tenant Isolation).
- **Migration Impact**: Introduces application logger utility replacing raw `console.log`.
- **Decision Required Before Step 1?**: **NO** (Operational maturity).

---

### ADR-026: Error Tracking & Exception Reporting
- **Current State**: Errors caught in try/catch blocks return generic `{ success: false, error: true }` and are swallowed.
- **Problem**: Uncaught server exceptions, rendering failures, or client hydration crashes occur silently without engineering visibility.
- **Options**:
  - *Option A*: Rely on user bug reports.
  - *Option B*: Integrate Sentry or Highlight.io for automated stack trace capture and breadcrumb tracking.
- **Important Trade-offs**:
  - *Option A*: Broken features remain unnoticed for extended periods.
  - *Option B*: Immediate notification of production runtime crashes with source map de-obfuscation.
- **Dependencies**: None.
- **Migration Impact**: Wraps Next.js config with error monitoring SDK instrumentation.
- **Decision Required Before Step 1?**: **NO** (Pre-production release task).

---

### ADR-027: Data Retention & Soft Deletion Policy
- **Current State**: Hard cascading deletes (`prisma.*.delete()`).
- **Problem**: Accidental deletion of a class or student permanently purges historical academic grades, attendance, and fee history, violating Indian educational record retention norms.
- **Options**:
  - *Option A*: Hard deletion across all models.
  - *Option B*: Unified Soft Deletion Pattern (`isDeleted: Boolean`, `deletedAt: DateTime?`, `deletedById: String?`) on all core business entities, combined with Prisma client read extensions automatically filtering out deleted rows (`where: { deletedAt: null }`).
- **Important Trade-offs**:
  - *Option A*: Permanent data loss from simple user error.
  - *Option B*: Complete auditability and "Trash / Restore" capabilities; requires unique indexes to account for soft-deleted rows (`@@unique([tenantId, name, deletedAt])`).
- **Dependencies**: ADR-004 (Tenant Isolation), ADR-010 (Prisma Strategy).
- **Migration Impact**: Adds soft delete columns to Prisma schema and configures Prisma read extension filters.
- **Decision Required Before Step 1?**: **YES**.

---

### ADR-028: Multi-Tenant Database Performance & Scaling Strategy
- **Current State**: Zero foreign key indexes; unindexed `groupBy` and `count` operations on every page render.
- **Problem**: Performance may become a significant scalability bottleneck requiring validation through profiling as row counts grow.
- **Options**:
  - *Option A*: Reactive query optimization after slowdowns occur.
  - *Option B*: Proactive Multi-Tenant Scaling Baseline:
    1. Composite B-Tree indexes on every table prefixed by `tenantId` (`@@index([tenantId, classId])`, `@@index([tenantId, studentId, date])`).
    2. Connection pooling via PgBouncer / Supavisor to prevent connection starvation during autoscaling.
    3. Read-through caching for institutional static metadata (subjects, classes, settings) via Redis / Next.js cache.
- **Important Trade-offs**:
  - *Option A*: Risk of database degradation during morning peak hours (attendance marking).
  - *Option B*: Mitigates query latency risks regardless of tenant count or global database size.
- **Dependencies**: ADR-004 (Tenant Isolation), ADR-014 (Redis).
- **Migration Impact**: Defines composite index declarations across all models in `prisma/schema.prisma`.
- **Decision Required Before Step 1?**: **YES**.

---

## Summary of Gate Decisions (Required Before Step 1)

Before writing any migration or application code in Step 1, the following **17 foundational decisions must be formally locked**:

1. **ADR-001**: Clerk retained strictly as Identity Provider (`sub`, credentials, MFA); stripped of RBAC metadata.
2. **ADR-002**: Tenancy managed entirely in PostgreSQL (`Tenant` + `TenantMembership`), not Clerk Organizations.
3. **ADR-003**: Dynamic relational DB-driven RBAC (`Role`, `Permission`, `RolePermission`, `TenantMembership`).
4. **ADR-004**: Shared DB, shared schema multi-tenancy; evaluate application-level isolation, PostgreSQL RLS, or a combination during database design.
5. **ADR-005**: Preferred conceptual model: `User` (identity) + `TenantMembership` + Domain Profiles (`StudentProfile`, `StaffProfile`, `ParentProfile`). Exact schema design decided in Step 3.
6. **ADR-006**: System base roles with tenant-level custom role extensions.
7. **ADR-007**: Domain-subdomain-action permission format (`academic:exam:publish`).
8. **ADR-008**: Dual-plane access scope: `AccessScope: PLATFORM` (`/platform/*`) vs. `AccessScope: TENANT` (`/:tenant/*`).
9. **ADR-009**: Database-driven module entitlements based on subscription plan licenses.
10. **ADR-010**: Interactive transactions (`tx`) with optimistic concurrency for multi-entity mutations.
11. **ADR-011**: Hybrid API contract: Server Actions for web UI, Route Handlers for webhooks and PWA sync.
12. **ADR-012**: Action Wrapper Pattern (`createAuthorizedAction`) enforcing verified tenant context and permissions.
13. **ADR-013**: BullMQ + Redis background worker for asynchronous processing.
14. **ADR-014**: Native TCP Redis instance for queues and permission caching.
15. **ADR-018**: Dual-mode audit logging: Atomic synchronous persistence for critical business/security mutations; async queues for non-critical downstream telemetry.
16. **ADR-020**: Vitest + Playwright test harness established prior to code changes.
17. **ADR-021**: Automated GitHub Actions CI pipeline running lint, typecheck, tests, and schema checks.
18. **ADR-022**: Expand-and-contract migration strategy using `prisma migrate deploy`.
19. **ADR-023**: Multi-tenant seeder with sample schools and deterministic test identities.
20. **ADR-024**: Dedicated local, staging, and production environment segregation.
21. **ADR-027**: Soft deletion pattern (`deletedAt`) across all business entities.
22. **ADR-028**: Composite indexing strategy prefixed by `tenantId` across all relational tables.
