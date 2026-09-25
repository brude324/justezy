# Transformation Migration Phases & Implementation Plan

## 1. Migration Dependency Sequence

**Status**: DECISION

To guarantee system stability and prevent circular engineering deadlocks, the platform migration must strictly follow the architectural dependency hierarchy established in Step 0:

```
Step 0: Audit & Baseline Verification (COMPLETED)
   |
   v
Step 1: Product, Architecture & Engineering Specifications (CURRENT STEP)
   |
   v
Step 2: Automated Testing Harness & CI/CD Infrastructure
   |
   v
Step 3: Database Multi-Tenancy, Scoping & Schema Refactoring
   |
   v
Step 4: Identity Decoupling, Dynamic DB RBAC & Tenant Context
   |
   v
Step 5: Academic Domain Services & Server Action Guard Modernization
   |
   v
Step 6: UI Presentation Tier, FormModal Fixes & PWA Baseline
   |
   v
Step 7: Asynchronous Worker Tier (BullMQ, Redis & Notifications)
   |
   v
Step 8: End-to-End Security Validation, Penetration Testing & V1 Go-Live
```

---

## 2. Phase-by-Phase Deliverables

### Step 0: Existing Codebase Audit & Baseline (Completed)
- Completed comprehensive 22-document audit cataloging all 14 models, 18 routes, 0 tests, 0 queues, and security vulnerabilities under `docs/architecture-audit/`.

### Step 1: Product & Architecture Specifications (Current Step)
- Establish comprehensive product vision, multi-tenant architecture, DB RBAC models, engineering conventions, security standards, and roadmap specifications.

### Step 2: Testing Harness & CI/CD Infrastructure
- **Deliverables**:
  - Install and configure Vitest and Playwright test runners.
  - Create deterministic multi-tenant test factories and fixtures.
  - Implement GitHub Actions CI pipeline executing lint, typecheck, and tests on PR.
  - Fix Dockerfile to Next.js multi-stage standalone runner.

### Step 3: Database Multi-Tenancy & Schema Refactoring
- **Deliverables**:
  - Introduce `Tenant`, `TenantMembership`, `User`, `Role`, `Permission`, `ModuleEntitlement`, and `AuditLog` models in `prisma/schema.prisma`.
  - Add `tenantId` to all 14 existing domain models.
  - Convert global unique constraints (`Class.name`, `Subject.name`, `Grade.level`) to composite unique keys (`@@unique([tenantId, ...])`).
  - Implement extended Prisma client with automatic tenant query filtering.

### Step 4: Identity Decoupling & Dynamic DB RBAC
- **Deliverables**:
  - Decouple Clerk `publicMetadata` from application authorization.
  - Implement Clerk webhook route handler (`/api/webhooks/clerk`) for user identity synchronization.
  - Build server-side tenant resolver and AsyncLocalStorage context.
  - Implement RBAC policy evaluation engine and `createGuardedAction` wrapper.

### Step 5: Academic Domain Services & Guard Modernization
- **Deliverables**:
  - Encapsulate academic business logic in dedicated Domain Services (`StudentService`, `StaffService`, `AttendanceService`, `AssessmentService`).
  - Migrate all Server Actions in `actions.ts` to guarded, tenant-scoped implementations.
  - Implement atomic transactional audit logging for all mutations.

### Step 6: Presentation Tier, UI Fixes & PWA Baseline
- **Deliverables**:
  - Fix `FormModal.tsx` delete routing bug (decoupling from `deleteSubject`).
  - Implement missing `/list/attendance` route and daily roll-call screen.
  - Resolve student attendance rate calculation bug (`NaN%`).
  - Integrate `@serwist/next`, generate Web App Manifest, and establish service worker caching.

### Step 7: Asynchronous Workers & Notification Tier
- **Deliverables**:
  - Deploy standalone BullMQ worker daemon backed by Redis.
  - Implement queues for notifications, report card PDF generation, and bulk imports.
  - Integrate Indian DLT-compliant SMS/WhatsApp gateway client.

### Step 8: Final Validation, Penetration Testing & V1 Go-Live
- **Deliverables**:
  - Execute full STRIDE security penetration tests and cross-tenant leakage audits.
  - Run complete Playwright E2E test suite across all user personas.
  - Finalize production staging deployment and release V1 Core Academic Platform.
