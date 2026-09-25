# Step 0: Final Validation Report

## A. Audit Completeness Assessment

Every required dimension of the SchoolyardSMS (`lama-dev-next-dashboard`) repository has been rigorously inspected, cross-checked against source code, verified via static analysis and runtime build execution, and documented under `docs/architecture-audit/`.

| Audit Dimension | Target Verification Requirement | Verified Status | Evidence Location |
| :--- | :--- | :---: | :--- |
| **Repository Structure** | Full directory tree, routing layouts, components, scripts, configs | **COMPLETE** | [01-repository-structure.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/01-repository-structure.md) |
| **Technology Stack** | Exact package versions, runtime assumptions, missing tools | **COMPLETE** | [02-technology-stack.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/02-technology-stack.md) |
| **Application Architecture** | RSC/Client boundaries, Server Actions, data access flow | **COMPLETE** | [03-current-architecture.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/03-current-architecture.md) |
| **Authentication & Authz** | Clerk integration, session claims, middleware, Server Action guards | **COMPLETE** | [04-authentication-authorization.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/04-authentication-authorization.md) |
| **Database & Schema** | All 14 models, enums, relations, missing indexes, constraints | **COMPLETE** | [05-database-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/05-database-audit.md) |
| **Modules & Domains** | 10 functioning modules + 4 missing/mock modules audited | **COMPLETE** | [06-module-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/06-module-audit.md) |
| **Screens & Routes** | 18 physical `page.tsx` files, 19 compiled routes, menu audit | **COMPLETE** | [07-route-screen-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/07-route-screen-audit.md) |
| **Background Processing** | Redis / BullMQ / Cron audit (verified 100% absent) | **COMPLETE** | [08-background-processing.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/08-background-processing.md) |
| **PWA & Client Architecture** | Manifest, service worker, offline cache (verified 100% absent) | **COMPLETE** | [09-pwa-client-architecture.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/09-pwa-client-architecture.md) |
| **External Integrations** | Clerk, Cloudinary, PostgreSQL/Supabase audited | **COMPLETE** | [10-integrations.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/10-integrations.md) |
| **Security Audit** | IDOR, missing action authz, leaked credentials, unsigned uploads | **COMPLETE** | [11-security-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/11-security-audit.md) |
| **Testing Audit** | Verified 0 test files; executed lint, typecheck, build baseline | **COMPLETE** | [12-testing-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/12-testing-audit.md) |
| **CI/CD & Deployment** | GitHub Actions (absent), Dockerfile (defective migration/single-stage), Compose (typo) | **COMPLETE** | [13-cicd-deployment-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/13-cicd-deployment-audit.md) |
| **Performance & Scaling** | In-memory aggregations, missing indexes, connection limits | **COMPLETE** | [14-performance-scalability.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/14-performance-scalability.md) |
| **Migration Impact** | Impact analysis of 9 core SaaS migration vectors | **COMPLETE** | [15-migration-impact.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/15-migration-impact.md) |
| **Reuse Assessment** | 22-subsystem KEEP / REFACTOR / REPLACE / REMOVE matrix | **COMPLETE** | [16-reuse-assessment.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/16-reuse-assessment.md) |
| **Risk Register** | 12 technical risks ranked by severity with mitigations | **COMPLETE** | [17-risk-register.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/17-risk-register.md) |
| **Baseline Snapshot** | Git commit, branch status, dependencies, and command outputs | **COMPLETE** | [18-baseline.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/18-baseline.md) |
| **Step 0B: Dependencies** | 6 migration streams, 10-layer SaaS hierarchy, 5 inversions | **COMPLETE** | [19-migration-dependency-map.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/19-migration-dependency-map.md) |
| **Step 0C: Decisions** | 28 Architecture Decision Records (ADRs) evaluated | **COMPLETE** | [20-architecture-decision-register.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md) |
| **Step 0: Validation** | Authoritative synthesis report with final validation status | **COMPLETE** | [21-step-0-validation.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/21-step-0-validation.md) |

---

## B. Documents Reviewed

The audit documentation consists of 22 markdown documents and 3 technical diagrams:

### Markdown Documents
1. [00-audit-summary.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/00-audit-summary.md) — Comprehensive executive summary and architectural index.
2. [01-repository-structure.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/01-repository-structure.md) — Repository tree, module boundaries, and file classification.
3. [02-technology-stack.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/02-technology-stack.md) — Package manifest analysis, dependency health, and runtime assumptions.
4. [03-current-architecture.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/03-current-architecture.md) — Data flow, RSC vs. Client boundaries, and mutation mechanics.
5. [04-authentication-authorization.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/04-authentication-authorization.md) — Current Clerk role metadata and security vulnerabilities.
6. [05-database-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/05-database-audit.md) — 14 Prisma models, schema constraints, and relation analysis.
7. [06-module-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/06-module-audit.md) — Audit of 10 functioning modules and 4 mock/dead modules.
8. [07-route-screen-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/07-route-screen-audit.md) — Screen inventory, dynamic routes, and count reconciliation.
9. [08-background-processing.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/08-background-processing.md) — Audit of asynchronous execution, job queues, and atomic audit logging rules.
10. [09-pwa-client-architecture.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/09-pwa-client-architecture.md) — PWA audit fact (absent) vs. target requirement.
11. [10-integrations.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/10-integrations.md) — Third-party integrations (Clerk, Cloudinary, PostgreSQL).
12. [11-security-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/11-security-audit.md) — Security posture, unprotected Server Actions, and exposed secrets.
13. [12-testing-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/12-testing-audit.md) — Testing posture and baseline command verification.
14. [13-cicd-deployment-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/13-cicd-deployment-audit.md) — CI/CD absence, Dockerfile build defect (migrate dev at build time), and compose syntax typo.
15. [14-performance-scalability.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/14-performance-scalability.md) — Scaling bottlenecks, indexing gaps, and connection pooling.
16. [15-migration-impact.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/15-migration-impact.md) — Detailed impact across 9 core migration vectors.
17. [16-reuse-assessment.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/16-reuse-assessment.md) — Subsystem disposition matrix (Keep/Refactor/Replace/Remove).
18. [17-risk-register.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/17-risk-register.md) — 12 technical risks with likelihood, impact, and mitigations.
19. [18-baseline.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/18-baseline.md) — Baseline verification snapshot and exact command outputs.
20. [19-migration-dependency-map.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/19-migration-dependency-map.md) — 6 migration streams, 10-tier target hierarchy, and code inversions.
21. [20-architecture-decision-register.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md) — 28 evaluated Architecture Decision Records.
22. [21-step-0-validation.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/21-step-0-validation.md) — Authoritative validation synthesis report.

### Technical Diagrams
1. [docs/architecture-audit/diagrams/current-architecture.mmd](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/diagrams/current-architecture.mmd) — Current verified system architecture.
2. [docs/architecture-audit/diagrams/current-database.mmd](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/diagrams/current-database.mmd) — Complete Entity-Relationship diagram of all 14 models.
3. [docs/architecture-audit/diagrams/migration-dependency.mmd](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/diagrams/migration-dependency.mmd) — Proposed SaaS hierarchy, violation mappings, and dependency layers.

---

## C. Corrections Applied During Consistency Review

1. **Authentication Terminology**:
   - Replaced inaccurate phrasing ("Current Auth → Clerk Identity Auth") with authoritative precision: **"Current Clerk Authentication + Clerk Role Metadata → Clerk Authentication/Identity + Application DB Authorization"**.
   - Explicitly clarified functional separation:
     - **Clerk**: Authentication, user session management, identity lifecycle, MFA, token issuance.
     - **PostgreSQL**: Application `User`, `TenantMembership`, `Role`, `Permission`, `AccessScope`, `ModuleEntitlement`, and institutional business authorization.
     - Confirmed that the future system does **not** replace Clerk authentication.

2. **Identity Model Architecture**:
   - Eliminated any claim that all Admin, Teacher, Student, and Parent data should collapse into a single generic table.
   - Formalized the target conceptual identity model:
     - `User` = Identity/person record (linked to Clerk `sub`).
     - `TenantMembership` = Binding between `User` and `Tenant` (role, access scope, membership status).
     - Domain profiles = `StudentProfile`, `StaffProfile` (or `TeacherProfile`), `ParentProfile`, etc.
   - Formally designated the physical Prisma schema design as a **Step 3 database design decision**.

3. **Tenant Context Security**:
   - Eliminated any statement implying client-supplied headers (e.g. `x-tenant-id`) can be trusted directly.
   - Documented zero-trust tenant context rules:
     - Tenant must always be resolved and verified server-side.
     - Tenant selection must be validated against the authenticated user's active `TenantMembership` records.
     - Client-controlled headers may only serve as internal transport tokens after server-side cryptographic or session verification.
     - Tenant resolution mechanism (subdomain vs. custom domain vs. path) remains an open Step 1 decision.

4. **Database Multi-Tenant Isolation & RLS**:
   - Softened rigid mandates specifying PostgreSQL RLS as mandatory.
   - Updated language to: **"Evaluate application-level isolation, PostgreSQL RLS, or a combination during database architecture design."**
   - Documented trade-offs between Prisma query extensions, connection pooling overhead, and native database policies without prematurely locking the decision.

5. **Audit Logging Architecture**:
   - Resolved the contradiction between transactional consistency and asynchronous message queues.
   - Documented authoritative rule: **Critical business and security audit events must be persisted atomically within the database transaction of the corresponding mutation.**
   - Background message queues (Redis / BullMQ) are designated strictly for secondary event processing, notification delivery, export generation, report generation, and bulk imports.

6. **Clerk User Provisioning Lifecycle**:
   - Removed simplistic assumptions ("Create DB User → Create Clerk User" or vice versa).
   - Documented the complex provisioning lifecycle requirements:
     - Pending application identity.
     - Tenant membership binding.
     - Clerk invitation / user creation API calls.
     - Clerk webhook synchronization (`user.created`, `user.updated`).
     - Idempotency keys, retry queues, reconciliation workers, and failure recovery.
   - Formally deferred the final provisioning workflow design to **Step 1 ADR**.

7. **Overstatements & Tone Normalization**:
   - Reviewed and purged unsupported assertions:
     - Replaced "exponential performance degradation" with "may become a scalability bottleneck requiring validation through profiling".
     - Replaced "eliminate up to 80% of database traffic" with "reduce redundant read traffic under sustained multi-user load".
     - Replaced hardcoded timeout assumptions with "requires workload benchmarking".
     - Replaced claims that credentials are definitely active with "appears to contain sensitive credential material requiring immediate rotation and revocation".

8. **Current State vs. Target State Boundary**:
   - Ensured every audit document clearly demarcates `CURRENT / VERIFIED` facts from `TARGET / PROPOSED` recommendations.
   - Guaranteed that proposed architectural patterns are never presented as existing code implementations.

9. **Baseline Build Status Calibration**:
   - Corrected build reporting across `12-testing-audit.md`, `18-baseline.md`, and summary documents.
   - Because `npm run build` completed code transpilation but emitted runtime Prisma database connection failures during static generation, recorded: **BUILD RESULT: PASS WITH ENVIRONMENT/RUNTIME ERRORS**.

10. **Structural Count Reconciliation & Module Definition**:
    - Reconciled all architectural quantities in [07-route-screen-audit.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/07-route-screen-audit.md#3-structural-count-reconciliation):
      - **Functioning business modules**: Logical modules with implemented data-backed functionality somewhere in the current application (e.g., Teachers, Students, Parents, Subjects, Classes, Lessons, Exams, Assignments, Results, Events/Announcements, and **Attendance** via `Attendance` model, `AttendanceChartContainer`, and `StudentAttendanceCard`).
      - **Complete application routes**: Dedicated user-facing routes/pages (`page.tsx`) providing primary screen interfaces (11 list routes, 2 detail routes, 4 dashboards, 1 sign-in).
      - **Attendance Route Fact**: Attendance possesses data-backed functionality, but `/list/attendance` remains a missing route. It does **not** possess a complete CRUD page.
      - **Physical `page.tsx` files**: Exactly 18 files.
      - **Compiled Next.js routes**: Exactly 19 routes (18 application routes + `/_not-found`).
      - **Sidebar menu items**: Exactly 17 items (14 in `MENU` section + 3 in `OTHER` section).
      - **Missing / mock modules**: Exactly 4 modules (Messages has no model/page; Announcements & Events are display-only lists without detail views; Profile / Settings are mock links; Attendance lacks a dedicated list route).
      - **Prisma models**: Exactly 14 models + 2 enums.

11. **Terminology Normalization**:
    - Standardized universally on: `Tenant`, `TenantMembership`, `User`, `Role`, `Permission`, `AccessScope`, `ModuleEntitlement`.
    - Eliminated accidental synonyms (`OrganizationMembership`, `TenantMembershipRole`, `UserRole`) unless describing specific conceptual distinctions.

12. **Domain Model Design Postponement**:
    - Ensured target models (`PlatformAdmin`, `TenantModule`, `SubscriptionPlan`, `AuditLog`, `UserRole`, `AcademicYear`, `StudentProfile`, `StaffProfile`) are documented as proposed target concepts.
    - Physical schema design is formally reserved for the database architecture design stage (Step 3).

13. **PWA Requirements Separation**:
    - Separated `CURRENT AUDIT FACT: PWA is completely absent (0%)` from `TARGET PRODUCT REQUIREMENT: PWA/offline/mobile capability is required`.
    - Purged unsupported demographic generalizations.

14. **Mermaid Diagrams Validation**:
    - Updated `docs/architecture-audit/diagrams/migration-dependency.mmd` to reflect normalized terminology, atomic audit logging distinction, and verified violation mappings.

15. **Dockerfile Factual Accuracy**:
    - Confirmed that the `Dockerfile` executes `RUN npx prisma migrate dev --name init` and `RUN npm run build`. It does not contain `--standalone`.
    - Accurately documented that executing `prisma migrate dev` during image build is defective and requires replacement with `prisma migrate deploy` at runtime/release, along with a multi-stage build and non-root execution.

---

## D. Remaining Factual Uncertainties & External Variables

Before beginning production implementation in Step 1 and subsequent phases, the following external variables must be determined:

1. **Indian Telecom / SMS / WhatsApp Gateway Selection**:
   - Specific aggregator selection (e.g. Gupshup, Exotel, Twilio India) for transactional parent SMS, OTP logins, and DLT (Distributed Ledger Technology) template registration compliance in India.
2. **Production Cloud Infrastructure & Hosting Target**:
   - Selection of deployment host (e.g., Supabase PostgreSQL vs. AWS RDS/ElastiCache vs. self-hosted VPS) to determine whether PgBouncer connection pooling is native or requires dedicated deployment.
3. **Clerk Custom Domain Authentication Setup**:
   - Determination of whether `auth.schoolyard.in` or custom institution subdomains will be configured to avoid third-party cookie blocking on iOS/Safari clients.
4. **Cloudinary Asset Storage Plan vs. S3 Migration**:
   - Clarification on whether Cloudinary remains the target media store for student/staff documents or if an S3-compatible private bucket (e.g. AWS S3 or Cloudflare R2) is required for sensitive institutional records.

---

## E. Architectural Decisions Intentionally Deferred to Step 1 / 2 / 3

| Step | Topic | Intentionally Deferred Architectural Decision | ADR Reference |
| :---: | :--- | :--- | :--- |
| **Step 1** | Tenant Routing | Subdomain routing (`tenant.schoolyard.in`) vs. Path-based routing (`schoolyard.in/:tenant/...`) vs. Custom domains. | [ADR-004](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-004-tenant-isolation-strategy) |
| **Step 1** | User Provisioning | Selection between Webhook-First vs. DB-Outbox-First provisioning lifecycle; Clerk invitation workflow; retry & reconciliation. | [ADR-005](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-005-user-identity-mapping-and-provisioning-lifecycle) |
| **Step 1** | API Architecture | Standardizing Server Actions for internal UI forms vs. Route Handlers for external APIs/webhooks vs. hybrid service layer. | [ADR-011](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-011-api-architecture), [ADR-012](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-012-server-actions-vs-route-handlers) |
| **Step 1** | Background Queue | BullMQ + Redis deployment topology vs. lightweight alternatives for asynchronous workers. | [ADR-013](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-013-queue-architecture), [ADR-014](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-014-redis-dependency) |
| **Step 2** | Platform Administration | Multi-tenant SaaS control plane architecture, institution provisioning wizard, and subscription tier enforcement. | [ADR-009](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-009-modulefeature-entitlement-model) |
| **Step 2** | PWA Caching Strategy | Serwist / Workbox runtime caching policies for network-first dashboard data vs. cache-first static assets. | [ADR-019](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-019-pwaclient-caching-strategy) |
| **Step 3** | Physical Database Schema | Exact physical Prisma schema for `Tenant`, `TenantMembership`, `User`, `Role`, `Permission`, `StudentProfile`, `StaffProfile`. | [ADR-002](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-002-tenant-model-and-clerk-integration), [ADR-003](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-003-database-driven-rbac-design) |
| **Step 3** | DB Isolation Mechanism | Prisma Client Extensions vs. PostgreSQL RLS policies vs. hybrid connection isolation. | [ADR-004](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-004-tenant-isolation-strategy) |
| **Step 3** | Composite Key Migration | Schema migration path for converting global unique keys (`Class.name`, `Subject.name`, `Grade.level`) to `@@unique([tenantId, ...])`. | [ADR-022](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/20-architecture-decision-register.md#adr-022-database-migration-strategy) |

---

## F. Critical Security Findings

1. **Unprotected Server Actions (Critical Severity)**:
   - All mutation functions in `src/lib/actions.ts` (`createSubject`, `deleteTeacher`, `createExam`, etc.) execute without verifying caller identity, tenant context, or role permissions. Any unauthenticated caller can invoke them.
2. **Client Metadata Role Tampering Risk (High Severity)**:
   - Authorization relies on Clerk's `sessionClaims.metadata.role`. The application never verifies role claims against a database record during request execution.
3. **Client-Controlled Tenant Headers Must Never Be Trusted (Critical Rule)**:
   - Tenant identifiers provided in client headers (e.g. `x-tenant-id`) represent an untrusted transport token. Tenant resolution must be executed and validated server-side against authenticated `TenantMembership` records.
4. **FormModal Destructive Routing Bug (High Severity)**:
   - [FormModal.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/FormModal.tsx#L24-L32) routes delete operations for 7 distinct entities (`parent`, `lesson`, `assignment`, `result`, `attendance`, `event`, `announcement`) directly to `deleteSubject`, causing accidental subject destruction.
5. **Unsigned Client-Side Cloudinary Uploads (Medium Severity)**:
   - The Cloudinary upload widget in `src/components/forms/TeacherForm.tsx` and `StudentForm.tsx` relies on an unsigned preset (`school`), allowing arbitrary file uploads to the Cloudinary CDN.
6. **Exposed Credentials in Repository History (High Severity)**:
   - The `.env` file appears to contain sensitive live credentials (Clerk publishable/secret keys, Supabase DB URI, Cloudinary secret). These must be immediately rotated, revoked, and removed from tracking.

---

## G. Critical Migration Blockers

1. **Global Database Constraints Incompatible with Multi-Tenancy**:
   - `Subject.name`, `Class.name`, and `Grade.level` enforce `@unique` globally across the database. Multi-tenant onboarding is blocked until these become composite keys scoped to `tenantId`.
2. **Zero Automated Testing Baseline**:
   - With 0 unit tests, 0 integration tests, and 0 E2E tests, any architectural modification risks silent regressions in scheduling and grading workflows.
3. **Defective Docker Build Pipeline**:
   - The [Dockerfile](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/Dockerfile) incorrectly executes `RUN npx prisma migrate dev --name init` during the image build step, which requires an interactive database connection and fails in standard container build environments. Production migrations must be decoupled into a release/runtime step (`prisma migrate deploy`).
   - The image is a fat single-stage container retaining development dependencies and full source code, and processes run as root without a dedicated non-root user.
4. **Direct Component-to-Database Coupling**:
   - React Server Components directly execute Prisma queries across all tables without a central tenant filter or service abstraction.

---

## H. Current Technology Stack (Verified Fact)

Sourced directly from [package.json](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/package.json) and [18-baseline.md](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/architecture-audit/18-baseline.md):

- **Framework**: Next.js `14.2.5` (App Router, Server Actions, RSC).
- **Core Runtime**: React `18.3.1` (installed under `^18`), React DOM `18.3.1` (installed under `^18`), Node.js (`v24.15.0` host environment, `FROM node:18` in Dockerfile).
- **Language**: TypeScript `5.5.4` (installed under `^5`).
- **Database ORM**: Prisma Client & CLI `5.19.1` (installed under `^5.19.1`).
- **Database Engine**: PostgreSQL (hosted on Supabase / PostgreSQL 15 in Docker compose).
- **Authentication**: Clerk Next.js SDK `@clerk/nextjs` `5.4.1` (installed under `^5.4.1`), `@clerk/elements` `0.14.6` (installed under `^0.14.6`).
- **Styling**: Tailwind CSS `^3.4.1`, PostCSS `^8`, Autoprefixer `^10.4.20`.
- **Form Management**: React Hook Form `^7.52.2`, `@hookform/resolvers` `^3.9.0`, Zod `^3.23.8`.
- **Media Uploads**: `next-cloudinary` `^6.13.0`.
- **Data Visualization**: Recharts `2.12.7` (installed under `^2.12.7`), React Calendar `5.0.0` (installed under `^5.0.0`), React Big Calendar `1.13.2` (installed under `^1.13.2`), Moment `2.30.1` (installed under `^2.30.1`).
- **Notifications UI**: React Toastify `^10.0.5`.

---

## I. Current Database State (Verified Fact)

- **Models**: Exactly **14 models**:
  - Identity/Actors: `Admin`, `Student`, `Teacher`, `Parent`.
  - Academic Structure: `Grade`, `Class`, `Subject`, `Lesson`.
  - Assessment & Attendance: `Exam`, `Assignment`, `Result`, `Attendance`.
  - Institutional Communications: `Event`, `Announcement`.
- **Enums**: Exactly **2 enums**:
  - `UserSex`: `MALE`, `FEMALE`.
  - `Day`: `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`.
- **Multi-Tenancy**: 0% — No table contains a `tenantId` or institution foreign key.
- **Audit Logging**: 0% — No audit trail or mutation history tables exist.
- **Indexes**: 0 explicit `@@index` directives; only primary keys and `@unique` constraints are indexed.

---

## J. Current Authentication State (Verified Fact)

- **Provider**: Clerk (`@clerk/nextjs` `^5.4.1`).
- **Mechanism**: Edge middleware (`clerkMiddleware`) intercepts requests, reads `sessionClaims.metadata.role`, and compares against `routeAccessMap` in `src/lib/settings.ts`.
- **Identity Storage**: Separate physical tables for `Admin`, `Teacher`, `Student`, `Parent`.
- **Authorization Enforcement**: 100% dependent on Clerk `publicMetadata`. No database verification occurs during page navigation or Server Action execution.
- **Target Direction**: **Clerk Authentication/Identity + Application DB Authorization** (Clerk validates identity; PostgreSQL governs users, memberships, roles, permissions, scopes, and entitlements).

---

## K. Current Testing & CI State (Verified Fact)

- **Automated Test Files**: **0 files** (no Vitest, Jest, Cypress, or Playwright).
- **CI/CD Pipelines**: **0 workflows** (no `.github/workflows` directory).
- **TypeScript Static Verification**: `npx tsc --noEmit` exits with **0 errors (PASS)**.
- **ESLint Verification**: `npm run lint` exits with **0 errors (PASS)**.
- **Build Verification**: `npm run build` exits with **PASS WITH ENVIRONMENT/RUNTIME ERRORS** (compilation succeeded, but static page generation encountered Prisma runtime connection errors).

---

## L. Current Route and Module State (Verified Fact)

- **Physical Route Files**: Exactly **18 `page.tsx` files**:
  - `src/app/[[...sign-in]]/page.tsx`
  - 4 Role Dashboards: `src/app/(dashboard)/admin/page.tsx`, `teacher/page.tsx`, `student/page.tsx`, `parent/page.tsx`
  - 11 List routes: `list/teachers/page.tsx`, `list/students/page.tsx`, `list/parents/page.tsx`, `list/subjects/page.tsx`, `list/classes/page.tsx`, `list/lessons/page.tsx`, `list/exams/page.tsx`, `list/assignments/page.tsx`, `list/results/page.tsx`, `list/events/page.tsx`, `list/announcements/page.tsx`
  - 2 Detail routes: `list/teachers/[id]/page.tsx`, `list/students/[id]/page.tsx`
- **Compiled Routes**: Exactly **19 routes** (18 application routes + `/_not-found`).
- **Sidebar Menu Items**: Exactly **17 items** in `src/components/Menu.tsx` (14 under `MENU`, 3 under `OTHER`).
- **Complete List Routes**: Exactly **11 list screens** with dedicated `page.tsx` files.
- **Functioning Business Modules**: Logical modules with implemented data-backed functionality somewhere in the current application: Teachers, Students, Parents, Subjects, Classes, Lessons, Exams, Assignments, Results, Events/Announcements, and **Attendance** (functioning data-backed module via `Attendance` model, `AttendanceChartContainer`, and `StudentAttendanceCard`, though lacking a dedicated `/list/attendance` route and CRUD page).
- **Missing / Mock Modules**: Exactly **4 modules/screens**:
  - Messages (no model, no page, dead link to `/list/messages`).
  - Announcements & Events are display-only lists without detail views.
  - Profile / Settings are mock links.
  - Attendance lacks a dedicated list route (`/list/attendance`).

---

## 10 Most Important Facts for the Development Agent (Before Starting Step 1)

1. **Clerk is for Authentication Only**: Never use Clerk's `publicMetadata` or Clerk Organizations for authorization or roles. Clerk only validates identity (`userId` / `sub`). All application users, tenant memberships, roles, permissions, scopes, and module entitlements reside strictly in PostgreSQL.
2. **The Database Has Zero Multi-Tenancy Today**: All 14 existing Prisma models operate globally without a `tenantId`. Every query in the application currently returns data indiscriminately across institutions.
3. **Global Unique Constraints Will Break Multi-Tenancy**: `Class.name`, `Subject.name`, and `Grade.level` are marked `@unique` globally. These must be converted to composite unique keys (`@@unique([tenantId, name])`) during schema migration.
4. **Server Actions Currently Have Zero Authorization**: Any anonymous caller can invoke `actions.ts` endpoints to create, update, or delete teachers, classes, and exams. All mutations must be wrapped in authenticated, tenant-verified, permission-checked guards.
5. **Never Trust Client-Controlled Tenant Headers**: Headers such as `x-tenant-id` are untrusted client input. Tenant context must always be resolved and verified server-side against authenticated `TenantMembership` records.
6. **FormModal Has a Dangerous Bug**: [FormModal.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/FormModal.tsx#L24-L32) routes deletions of parents, lessons, assignments, results, attendance, events, and announcements directly to `deleteSubject`, causing accidental subject destruction.
7. **There Are Zero API Routes Today**: The application currently has no `src/app/api` directory. All data reads are React Server Component queries, and all mutations are Server Actions. Webhooks (e.g. Clerk sync) will require introducing Route Handlers.
8. **Critical Audit Logs Must Be Atomic**: Business and security audit log records must be persisted atomically with the database mutation transaction. Background queues (Redis/BullMQ) are strictly for secondary downstream consumers, notifications, exports, and bulk jobs.
9. **Zero Automated Tests Exist**: There are no unit, integration, or E2E tests in the codebase. A Vitest and Playwright test harness must be established before schema changes are introduced.
10. **The Git Working Tree Must Follow Strict Architectural Layering**: Work must strictly proceed down the dependency hierarchy: **Foundation → Identity → Tenant → Membership → RBAC → Tenant Domain → Entitlements → Screens → Workflows**. Attempting to build screens or workflows before the Tenant/RBAC foundation is established will fail.

---

STEP 0 STATUS: READY FOR STEP 1
