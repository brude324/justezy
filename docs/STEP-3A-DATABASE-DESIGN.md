# Step 3A — Conceptual Database Design Master Summary

## 1. Executive Summary & Deliverables Ledger

**Phase**: STEP 3A — DATABASE ARCHITECTURE & CONCEPTUAL DATA MODEL  
**Status**: VALIDATED & COMPLETE  
**Controlling Documents**: `docs/database/`, `docs/architecture/`, `docs/screens/`, `AGENTS.md`  
**Application Code Modifications**: Exactly **0** lines of application source code modified; zero database migrations executed; production `prisma/schema.prisma` untouched.

This document synthesizes the conceptual database architecture designed in Step 3A. It provides the authoritative data modeling blueprint for transforming SchoolyardSMS from a single-school prototype into an enterprise-grade multi-tenant SaaS platform.

---

## 2. Master Documentation Ledger

The complete Step 3A database architecture suite consists of 17 dedicated specifications:

| Document Path | Title & Focus | Architectural Purpose | Status |
| :--- | :--- | :--- | :---: |
| [`01-conceptual-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/01-conceptual-model.md) | High-Level Conceptual Model | 5 architectural planes and 20 conceptual domain clusters. | **COMPLETE** |
| [`02-domain-models.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/02-domain-models.md) | Complete Entity Inventory | Comprehensive attribute and relationship specifications across all 20 domains. | **COMPLETE** |
| [`03-data-ownership-and-tenancy.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/03-data-ownership-and-tenancy.md) | Data Ownership & Multi-Tenancy | Sovereign tenant boundaries, platform vs tenant data, and composite foreign key isolation. | **COMPLETE** |
| [`04-rbac-data-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/04-rbac-data-model.md) | Dynamic DB-Driven RBAC | Role, Permission, RolePermission, AccessScope engine enforcing `ROLE != PERMISSION`. | **COMPLETE** |
| [`05-entitlement-data-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/05-entitlement-data-model.md) | Module Entitlements & Licensing | Commercial feature gating decoupled from RBAC; dual-gate security pipeline. | **COMPLETE** |
| [`06-academic-data-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/06-academic-data-model.md) | Academic Structure & History | AcademicYear, Term, Grade, Class, Subject, and historical data immutability. | **COMPLETE** |
| [`07-student-lifecycle-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/07-student-lifecycle-model.md) | Student Lifecycle & Placement | StudentProfile, StudentEnrollment, StudentAcademicHistory, and promotion state transitions. | **COMPLETE** |
| [`08-staff-and-guardian-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/08-staff-and-guardian-model.md) | Staff & Parent/Guardian Models | StaffProfile, ParentProfile, StudentParentBinding, and multi-child family graph resolution. | **COMPLETE** |
| [`09-attendance-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/09-attendance-model.md) | Attendance Domain & Uniqueness | AttendanceRecord, AttendanceCorrection, daily locking, and composite uniqueness semantics. | **COMPLETE** |
| [`10-assessment-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/10-assessment-model.md) | Examination & Grading Model | Exam (Master), ExamPaper (Slot), ExamResult, GradingScheme, and ReportCard snapshots. | **COMPLETE** |
| [`11-communication-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/11-communication-model.md) | Communications & Alerts | Announcement, Event, Notification, NotificationPreference, and provider abstraction. | **COMPLETE** |
| [`12-audit-data-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/12-audit-data-model.md) | Audit Logging & Compliance | Immutable append-only AuditLog, targeted JSON diffs, and DPDP Act compliance. | **COMPLETE** |
| [`13-file-data-model.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/13-file-data-model.md) | Files & Documents Reference | DocumentReference entity, direct presigned cloud uploads, and tenant storage quotas. | **COMPLETE** |
| [`14-key-index-and-constraint-strategy.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/14-key-index-and-constraint-strategy.md) | Keys, Indexes & Constraints | CUIDv2 primary keys, composite uniqueness, restrict delete rules, and UTC time handling. | **COMPLETE** |
| [`15-database-isolation-strategy.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/15-database-isolation-strategy.md) | Database Multi-Tenant Isolation | Hybrid evaluation: Application scoping via Prisma extension backed by PostgreSQL RLS. | **COMPLETE** |
| [`16-legacy-to-target-model-mapping.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/16-legacy-to-target-model-mapping.md) | Legacy-to-Target Migration | Mapping of all 14 baseline Prisma models and 4-step data backfill execution pipeline. | **COMPLETE** |
| [`diagrams/01-conceptual-erd.mmd`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/diagrams/01-conceptual-erd.mmd) | Conceptual ERD Diagram | High-level Mermaid entity-relationship diagram across all 5 architectural planes. | **COMPLETE** |

---

## 3. Quantitative Architectural Summary

```
Total Conceptual Domain Clusters: 20 (Clusters A through T)
Total Modeled Entities: 38 Conceptual Domain Models
Total Enforced Composite Unique Constraints: 13 Scoped Constraints
Total Core Status State Machines: 9 Domain Enums
Primary Key Standard: CUIDv2 (Collision-resistant, non-sequential, URL-safe)
Multi-Tenant Isolation Strategy: Hybrid (Application Prisma Extension + PostgreSQL RLS Backstop)
Baseline Migration Strategy: Non-destructive Expand-and-Contract (4-phase backfill)
```

---

## 4. Key Architectural Choices & Rationales

1. **Authentication vs. Application Identity Decoupling**:
   - Clerk manages credentials, sessions, MFA, and OAuth.
   - PostgreSQL stores the application `User`, which holds independent `TenantMembership` bindings across multiple schools.
2. **Dynamic Database-Driven RBAC (`ROLE != PERMISSION`)**:
   - Zero hardcoded role strings in application code.
   - Roles (`Role`) are collections of permissions (`Permission`) evaluated within horizontal access scopes (`AccessScope`: `INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN`).
3. **Decoupled Assessment Hierarchy**:
   - Permanently eliminates the Step 0 baseline defect where `Exam` was coupled 1:1 to `Lesson`.
   - Introduces parent `Exam` sessions, independent `ExamPaper` date sheet slots, configurable `GradingScheme` scales, and permanent PDF `ReportCard` snapshots.
4. **Historical Academic Isolation**:
   - Separates permanent `StudentProfile` identity from annual `StudentEnrollment` classroom placement.
   - Historical attendance, marks, and transcripts remain immutable across annual grade promotions.
5. **Multi-Child & Multi-Guardian Family Modeling**:
   - Replaces flat parent strings with `ParentProfile` and `StudentParentBinding`, supporting multiple guardians per student and multiple siblings per family.
6. **Append-Only Auditability**:
   - `AuditLog` is strictly append-only, capturing targeted JSON field diffs without leaking sensitive PII.

---

## 5. Explicit Open Architectural Decisions (`OPEN DECISION`)

The following technical decisions remain intentionally open for Step 3B (Physical Schema Implementation) and Step 4 (Service Implementation):

1. **`OPEN DECISION`: PostgreSQL Native Table Partitioning for `AuditLog`**:
   - *Option A*: Range-partition `AuditLog` monthly in PostgreSQL via native DDL.
   - *Option B*: Retain single unpartitioned table in V1 with an automated 90-day cold archival worker.
   - *Resolution*: Step 3B physical schema design.
2. **`OPEN DECISION`: RLS Activation Phase Gate**:
   - *Option A (Recommended)*: Activate Prisma extension application-level scoping immediately in V1; activate PostgreSQL RLS as a hardening release gate prior to production deployment.
   - *Option B*: Enforce PostgreSQL RLS policies from Day 1 of development.
   - *Resolution*: Step 3B physical schema & migration testing.

---

```
================================================================================
STEP 3A STATUS: CONCEPTUAL DATABASE DESIGN COMPLETE
================================================================================
```
