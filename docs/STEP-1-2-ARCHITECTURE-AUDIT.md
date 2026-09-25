# Cross-Phase Architecture Audit: Step 1 & Step 2

## 1. Executive Summary & Audit Mandate

**Auditor Role**: Senior Product Architect, SaaS Architect & Technical Reviewer  
**Audit Scope**: Comprehensive cross-phase evaluation of:
- **STEP 0**: Current-State Audit Baseline (`docs/architecture-audit/`)
- **STEP 1**: Product Vision, Architecture & Engineering Specifications (`docs/product/`, `docs/architecture/`, `docs/engineering/`, `docs/roadmap/`, `docs/security/`, `docs/operations/`, `AGENTS.md`)
- **STEP 2**: Application Information Architecture & Detailed Screen Specifications (`docs/screens/`, `docs/STEP-2-SCREEN-INDEX.md`, `docs/STEP-2-SCREEN-SPECIFICATIONS.md`, `docs/STEP-2-FINAL-VALIDATION.md`)

**Audit Goal**: Strictly verify architectural integrity, security invariants, multi-tenant isolation rules, permission calibration, and screen-to-data dependencies before entering **STEP 3 (Database Architecture & Design)**.

---

## 2. Core Architectural Principles Evaluation

Every document across Step 1 and Step 2 was evaluated against the 13 foundational architectural invariants:

| # | Core Principle | Audit Evaluation & Implementation Verification | Verdict |
| :-: | :--- | :--- | :---: |
| **A** | **Authentication != Authorization** | **CONFIRMED**. Clerk exclusively manages credentials, session token issuance, MFA, and OAuth. PostgreSQL is the authoritative engine for application users, roles, permissions, scopes, and tenant bindings. Clerk metadata is explicitly barred from making business authorization decisions. | **PASS** |
| **B** | **Role != Permission** | **CONFIRMED**. All 38 target screens and action contracts evaluate atomic permission strings (`attendance.mark`, `result.publish`) instead of raw role checks (`if (role === 'admin')`). Roles serve purely as administrative collections of permissions. | **PASS** |
| **C** | **Tenant != User** | **CONFIRMED**. `Tenant` is an institutional entity; `User` is an individual global person. They exist in completely separate relational domains connected via `TenantMembership`. | **PASS** |
| **D** | **Tenant Membership != Identity** | **CONFIRMED**. A user can belong to multiple schools with different roles and statuses (e.g. Teacher in School A, Parent in School B). Identity is unified in `User` (1:1 with Clerk), while membership is tenant-scoped. Supported by `ACC-04` Multi-Tenant Switcher. | **PASS** |
| **E** | **RBAC != Module Entitlement** | **CONFIRMED**. Dual-gate evaluation model implemented across all screens. Gate 1 evaluates institutional subscription licensing (`HTTP 402 Module Disabled`). Gate 2 evaluates user RBAC permissions and access scope (`HTTP 403 Forbidden`). | **PASS** |
| **F** | **UI Visibility != Security Authorization** | **CONFIRMED**. Navigation hiding is treated strictly as an ergonomic convenience. Every Server Action and API endpoint is specified to independently enforce server-side authentication, tenant context, permissions, and access scopes. | **PASS** |
| **G** | **Client Tenant Identifiers are Untrusted** | **CONFIRMED**. Client-supplied headers like `x-tenant-id` or unverified body parameters are strictly rejected. Tenant context MUST be derived server-side from verified hostnames, subdomains, or cryptographically verified paths. | **PASS** |
| **H** | **Verified Tenant Context Required** | **CONFIRMED**. Every database query and business mutation touching domain entities requires a mandatory server-side `tenantId` filter. Unscoped queries are strictly prohibited. | **PASS** |
| **I** | **Server-Side Authorization Invariant** | **CONFIRMED**. All permission checks, access scope evaluations, and business rules are executed within Server Components, Server Actions, or API middleware before accessing Prisma ORM. | **PASS** |
| **J** | **V1 Future-Proofing (No V2/V3 Rewrites)** | **CONFIRMED**. V1 establishes the multi-tenant SaaS control plane, DB-based dynamic RBAC, module entitlement engine, and audit logging. V2 (Finance, Transport) and V3 (LMS, APIs) plug into this exact foundation as additional module entitlement keys and permissions without modifying core architecture. | **PASS** |
| **K** | **No Premature Physical DB Prescription** | **CONFIRMED**. Step 2 screen specifications define conceptual data requirements, relationships, and invariants without prematurely fixing physical SQL column names, migration commands, or database extensions. | **PASS** |
| **L** | **Separation of Product vs. Technical Choices** | **CONFIRMED**. Product requirements under `docs/product/` define user journeys, outcomes, and business boundaries, while `docs/architecture/` and `docs/engineering/` specify technical implementation patterns. | **PASS** |
| **M** | **Open Architectural Decisions Explicitly Marked** | **CONFIRMED**. Physical routing (Subdomain vs Path), SMS DLT Gateway provider, and PDF rendering engine are formally tagged as `OPEN DECISION` in `docs/STEP-2-FINAL-VALIDATION.md` and ADRs. | **PASS** |

---

## 3. Detailed Cross-Phase Audit Findings

### Finding 1: Technology & Provider Classification Audit
* **Severity**: `LOW` (Documentation Classification Clarity)
* **Status**: **RESOLVED**
* **Analysis**: Step 1 architecture documentation specifies various technologies across infrastructure tiers. To prevent premature implementation locks, all choices are classified below:
  - **CONFIRMED (Immutable Architecture Choices)**:
    - Next.js (App Router, Server Actions, React Server Components).
    - PostgreSQL as the authoritative relational data store.
    - Prisma ORM as the application data access layer.
    - Clerk as the exclusive authentication and identity provider.
    - Multi-tenant tenant-isolation at application database layer.
    - Dynamic database-driven RBAC engine (Role, Permission, RolePermission).
  - **PROPOSED (Target Implementation Standards)**:
    - Redis + BullMQ for asynchronous background queue processing.
    - AWS S3 / Cloudflare R2 for secure multi-tenant object storage.
    - Serilog / Winston structured JSON logging with OpenTelemetry tracing.
  - **OPEN DECISION (Decoupled Implementation Choices)**:
    - Physical Tenant URL Strategy: Subdomain (`tenant.schoolyardsms.in`) vs Path-prefix (`schoolyardsms.in/tenant/[slug]`).
    - Indian DLT SMS / WhatsApp Gateway: Gupshup vs Fast2SMS vs Twilio.
    - Server-Side PDF Report Card Engine: Headless Chrome / Puppeteer vs `@react-pdf/renderer` vs Typst binary.

### Finding 2: Terminology Normalization Audit
* **Severity**: `LOW` (Lexical Consistency)
* **Status**: **VERIFIED**
* **Analysis**: Checked for conflicting terms across Step 0, Step 1, and Step 2:
  - "Organization" vs "Tenant" vs "School": Step 1 and Step 2 strictly use **`Tenant`** for the database entity and system boundary, and **`Institution` / `School`** for user-facing domain contexts. Clerk Organizations are explicitly NOT used.
  - "UserRole" vs "Role": Normalized to **`Role`** (relational database role catalog bound to `TenantMembership`).
  - "AccessScope": Strictly normalized across all documents to four standard enums: `INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN`.

### Finding 3: Baseline Technical Debt & Dangerous Mapping Remediation
* **Severity**: `CRITICAL` (Baseline Defect Elimination)
* **Status**: **CONFIRMED REMEDIATED IN SPECIFICATIONS**
* **Analysis**: The Step 0 audit discovered severe baseline defects in the prototype:
  1. `FormModal.tsx` routed deletions of 7 unrelated entity types directly to `deleteSubject`.
     - *Audit Check*: `docs/screens/10-screen-action-contract.md` and `docs/screens/11-current-to-target-screen-migration-map.md` mandate individual, strongly typed, tenant-scoped deletion actions for every entity type.
  2. Student Dashboard (`src/app/(dashboard)/student/page.tsx`) crashed with `TypeError` when `classItem` array was empty (`classItem[0].id`).
     - *Audit Check*: `TNT-DSH-03` functional spec explicitly defines an onboarding Empty State when student is unassigned to a class.
  3. Class list crashed with `TypeError` when `supervisor` teacher was null.
     - *Audit Check*: `TNT-CLS-01` functional spec specifies optional chaining and "Unassigned" placeholder badge.
  4. Results list printed student name twice (`studentName + " " + studentName`).
     - *Audit Check*: `TNT-MRK-01` and `TNT-MRK-02` specifications mandate full legal student name rendering (`firstName + " " + lastName`).

### Finding 4: Conceptual Data & Permission Dependencies
* **Severity**: `NO ISSUE` (Complete & Validated)
* **Analysis**:
  - The newly created `docs/screens/13-screen-data-dependency-map.md` traces conceptual data requirements across all 38 V1 screens, confirming that all required academic, membership, attendance, and evaluation models are conceptually sound.
  - The newly created `docs/screens/14-screen-permission-dependency-audit.md` validates all 64 atomic permissions against standard CRUD/Publish/Approve verbs, ensuring zero role-string hardcoding.
  - The newly created `docs/architecture/15-step-3-database-inputs.md` formally defines all entities, composite uniqueness constraints, lifecycle status enums, and legacy migration invariants for Step 3.

---

## 4. Comprehensive Section-by-Section Verdicts

| Section | Audit Domain | Evaluation Criteria & Findings | Section Verdict |
| :---: | :--- | :--- | :---: |
| **A** | **Overall Direction** | Transformation follows the strict architectural hierarchy: Foundation → Identity → Tenant → Membership → RBAC → Tenant Domain → Entitlements → Screens → Workflows → Reporting. | **PASS** |
| **B** | **Product Direction** | Product scope under `docs/product/` clearly defines vision, Indian K-12/College market, personas, user journeys, and non-functional requirements without scope creep. | **PASS** |
| **C** | **Architecture Direction** | Clean separation between Clerk (Authentication/Identity) and PostgreSQL (Application Authorization/Data). ADRs establish sound long-term foundations. | **PASS** |
| **D** | **V1 Scope** | Perfectly balances production SaaS platform foundation (control plane, onboarding, audit) with core academic operations (attendance, timetable, exams, report cards, communications). | **PASS** |
| **E** | **V2/V3 Roadmap** | Phased roadmap under `docs/roadmap/` cleanly isolates operational expansion (Fees, Transport, Library in V2) and ecosystem scaling (LMS, Biometrics, APIs in V3). | **PASS** |
| **F** | **Tenant Model** | Robust multi-tenant SaaS architecture. Supports users belonging to multiple schools with independent roles via `TenantMembership`. Server-side tenant resolver verified. | **PASS** |
| **G** | **RBAC Engine** | Dynamic database-driven RBAC adhering to `ROLE != PERMISSION`. Horizontal `AccessScope` engine prevents unauthorized cross-class and peer data exposure. | **PASS** |
| **H** | **Module Entitlements** | Dual-gate security model verified. Gating handles unlicensed modules via `HTTP 402 Module Disabled` without revealing data structures or leaking metadata. | **PASS** |
| **I** | **Screen Architecture** | 38 target V1 screens comprehensively defined with unique IDs, routes, primary users, layouts, responsive tiers, and all 40 required attributes. | **PASS** |
| **J** | **Screen → Data Dependencies** | All conceptual data dependencies cataloged in `docs/screens/13-screen-data-dependency-map.md`. Conceptual dependencies are closed and complete. | **PASS** |
| **K** | **Screen → Permissions** | 64 atomic permissions audited in `docs/screens/14-screen-permission-dependency-audit.md`. Standard verb taxonomy enforced; zero raw role checks. | **PASS** |
| **L** | **Migration Readiness** | Current-to-target migration map (`docs/screens/11-current-to-target-screen-migration-map.md`) classifies all 25 baseline routes and remediates all prototype defects. | **PASS** |
| **M** | **Testing Coverage** | Complete testing strategy defined under `docs/engineering/07-testing-strategy.md` covering Unit, Integration, Security (IDOR, injection), and Playwright E2E suites. | **PASS** |
| **N** | **Step 3 Readiness** | `docs/architecture/15-step-3-database-inputs.md` provides complete, unambiguous inputs for physical Prisma schema design without premature syntax prescription. | **READY** |

---

## 5. Non-Negotiable Architectural Principles for Step 3

When the Database Architect and Backend Engineer begin **Step 3 (Database Architecture & Design)**, they must preserve the following **7 Non-Negotiable Invariants**:

1. **Mandatory Tenant Scoping (`tenantId`)**: Every database table representing institutional domain data MUST include a `tenantId` foreign key and composite indexes on `[tenantId, ...]`. Unscoped global business queries are strictly prohibited.
2. **Identity vs Membership Decoupling**: User authentication identity (`User.clerkId`) must be strictly decoupled from institutional authorization (`TenantMembership` + `Role`). A user must be able to hold distinct memberships in multiple tenants.
3. **Database-Driven RBAC (`ROLE != PERMISSION`)**: Roles and permissions must be modeled as relational entities (`Role`, `Permission`, `RolePermission`). Business operations and screens must never check hardcoded role names or Clerk metadata.
4. **Horizontal Access Scopes**: The database schema must model organizational hierarchies (Classes, Sections, Assigned Teachers, Linked Children) so that `AccessScope` evaluation (`INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN`) can be enforced deterministically via Prisma query filters.
5. **Composite Uniqueness Semantics**: Uniqueness must be scoped composites (e.g., `[tenantId, admissionNumber]`, `[tenantId, classId, date, studentId]`), permitting distinct institutions to use identical local codes without database collisions.
6. **Immutable Audit Logging**: The `AuditLog` model must be strictly append-only, capturing actor identity, action type, tenant context, IP address, and JSON diffs of modified records.
7. **Expand-and-Contract Migration Safety**: Database schema transformations from the baseline prototype must follow non-destructive Expand-and-Contract patterns with automated data backfill scripts and rollback plans.

---

## 6. Final Audit Status Verdict

```
================================================================================
STEP 1 + STEP 2 AUDIT STATUS: PASS
STEP 3 STATUS: READY
================================================================================
```
