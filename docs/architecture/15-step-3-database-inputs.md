# 15 — Step 3 Database Architecture & Design Inputs

## 1. Executive Summary & Purpose

**Status**: TARGET / SPECIFICATION BRIEFING  
**Audience**: Database Architect & Lead Backend Engineer for Step 3 (Database Architecture & Design).

This document serves as the formal architectural bridge between **Step 2 (Screen & Route Architecture)** and **Step 3 (Database Architecture & Design)**. It defines the complete set of conceptual entities, relational boundaries, multi-tenant isolation rules, uniqueness constraints, lifecycle states, and legacy migration invariants that the physical PostgreSQL database schema (via Prisma ORM) must satisfy.

In accordance with architectural principles:
- **No premature physical schema prescription**: This briefing establishes *what* conceptual entities, boundaries, and invariants must exist, leaving physical table naming conventions, index tuning, composite foreign key syntax, and Prisma extension mechanisms to Step 3.
- **Tenant Isolation**: Every institutional data entity MUST be explicitly tenant-partitioned via `tenantId`.
- **Identity & RBAC Separation**: User identity (Clerk) is strictly separated from institutional membership and relational database RBAC.

---

## 2. Required Conceptual Entities & Domain Clusters

Step 3 must model the following 8 conceptual domain clusters:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. IDENTITY & MULTI-TENANCY                     │
│  • Tenant             • User                   • TenantMembership      │
│  • TenantInvitation   • SubscriptionPlan       • ModuleEntitlement     │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼────────────────────────────────────┐
│         2. RBAC ENGINE            │       3. ACADEMIC STRUCTURE        │
│  • Role                           │  • AcademicYear    • Term          │
│  • Permission                     │  • Grade           • Class         │
│  • RolePermission                 │  • Section         • Subject       │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼────────────────────────────────────┐
│      4. INSTITUTIONAL USERS       │     5. TIMETABLE & ATTENDANCE      │
│  • StaffProfile                   │  • TimetablePeriod                 │
│  • StudentProfile                 │  • TimetableLesson                 │
│  • ParentProfile                  │  • AttendanceRecord                │
│  • StudentParentBinding           │  • AttendanceSummary (Aggregate)   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼────────────────────────────────────┐
│    6. EVALUATION & CURRICULUM     │      7. COMMUNICATIONS & EVENTS    │
│  • Exam            • ExamPaper    │  • Announcement    • Event         │
│  • Assignment      • Submission   │  • Notification    • LeadInquiry   │
│  • ExamResult      • ReportCard   │                                    │
└───────────────────────────────────┴────────────────────────────────────┘
                                    │
┌────────────────────────────────────────────────────────────────────────┐
│                    8. AUDIT & SYSTEM GOVERNANCE                        │
│  • AuditLog            • TenantPolicy          • UserPreference        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Required Relational Ownership & Boundary Rules

### 3.1 The Tenant Boundary Invariant
- **Root Entity**: `Tenant` is the sovereign institutional boundary.
- **Tenant-Scoped Data**: Every record in clusters 3 through 8 MUST maintain a foreign key to `Tenant` (`tenantId`).
- **Cascade Behavior**: If a `Tenant` is soft-deleted or archived, its domain data remains isolated; hard deletion cascades cleanly in development/test seeds, but in production, soft-deletion (`deletedAt`) is mandated.

### 3.2 User vs. Membership Separation
- **`User`**: Represents a global person across the SaaS platform (1:1 with Clerk `clerkId`). A user has exactly one primary email and verified phone number.
- **`TenantMembership`**: Represents the binding of a `User` to a specific `Tenant`.
  - A user may possess multiple `TenantMembership` records (e.g., Parent with children in 2 different schools; Teacher teaching at 2 campuses).
  - A user's role is bound to the `TenantMembership`, NOT directly to the `User`.
- **Person Profiles**:
  - `StaffProfile` represents employment details within a tenant (1:1 with `TenantMembership` where role is staff/teacher).
  - `StudentProfile` represents enrollment details within a tenant (bound to `Tenant`, assigned to `Class` and `Section`).
  - `ParentProfile` represents guardian identity within a tenant, connected to one or more `StudentProfile` records via a dedicated relational junction (`StudentParentBinding`).

### 3.3 Academic Calendar Scoping
- **Active Session**: Academic activities (Attendance, Timetable, Exams, Homework, Marks, Report Cards) must be bound to an `AcademicYear` and optionally a `Term`.
- Historical academic records for previous years must remain queryable without mutating active session data.

---

## 4. Required Composite Uniqueness Semantics

Step 3 must ensure the physical database enforces composite uniqueness across the following dimensions to prevent data corruption and cross-tenant pollution:

| Domain | Semantic Uniqueness Invariant | Business Purpose |
| :--- | :--- | :--- |
| **Tenant** | `subdomain` / `slug` (Global) | Prevents multi-tenant hostname routing collisions. |
| **User** | `clerkId` (Global) | Enforces 1:1 binding with Clerk authentication identity. |
| **Membership**| `[tenantId, userId]` | Prevents duplicate active memberships for the same user in a single institution. |
| **Student** | `[tenantId, admissionNumber]` | Ensures admission numbers are unique within the school, while permitting identical admission numbers across different schools. |
| **Student** | `[tenantId, classId, sectionId, academicYearId, rollNumber]` | Ensures roll numbers are strictly unique within a specific classroom section for a given academic year. |
| **Staff** | `[tenantId, employeeId]` | Ensures employee staff codes are unique within the institution. |
| **Subject** | `[tenantId, subjectCode]` | Prevents duplicate curriculum subject codes within an institution. |
| **Class** | `[tenantId, gradeName, sectionName, academicYearId]` | Ensures a grade-section combination (e.g. "Grade 10-A") is unique within an academic session. |
| **Attendance** | `[tenantId, classId, date, studentId]` | Prevents double-marking attendance for a student on the same calendar day. |
| **Timetable** | `[tenantId, teacherId, dayOfWeek, periodId, academicYearId]` | Prevents scheduling a teacher to two different classes during overlapping periods on the same day. |
| **Timetable** | `[tenantId, classId, dayOfWeek, periodId, academicYearId]` | Prevents assigning two different subjects/teachers to the same class during the same period. |
| **Marks** | `[tenantId, examPaperId, studentId]` | Ensures a student has exactly one recorded result per examination paper. |
| **Entitlement**| `[tenantId, moduleKey]` | Ensures a tenant possesses exactly one active license record per functional module. |

---

## 5. Required Lifecycle & Status State Machines

Step 3 must model explicit status enums for key domain entities:

1. **`TenantStatus`**:
   - `PROVISIONING` → `TRIAL` → `ACTIVE` → `SUSPENDED` → `ARCHIVED`.
2. **`MembershipStatus`**:
   - `INVITED` → `ACTIVE` → `SUSPENDED` → `TERMINATED`.
3. **`StudentStatus`**:
   - `ENROLLED` → `ACTIVE` → `PROMOTED` → `TRANSFERRED` → `GRADUATED` → `WITHDRAWN`.
4. **`StaffStatus`**:
   - `INVITED` → `ACTIVE` → `ON_LEAVE` → `RESIGNED` → `TERMINATED`.
5. **`AttendanceStatus`**:
   - `PRESENT` | `ABSENT` | `LATE` | `EXCUSED` | `HALF_DAY`.
6. **`ExamStatus`**:
   - `DRAFT` → `SCHEDULED` → `ONGOING` → `COMPLETED` → `RESULTS_PUBLISHED`.
7. **`AssignmentStatus`**:
   - `DRAFT` → `PUBLISHED` → `CLOSED` → `ARCHIVED`.
8. **`SubmissionStatus`**:
   - `NOT_SUBMITTED` → `SUBMITTED` → `GRADED` → `RESUBMISSION_REQUESTED`.
9. **`ReportCardStatus`**:
   - `DRAFT` → `GENERATED` → `SIGNED` → `PUBLISHED`.

---

## 6. Required Auditability & Soft Deletion

- **Immutable Audit Logging**:
  - `AuditLog` entity must be append-only (no update or delete operations permitted).
  - Captures: `id`, `tenantId`, `actorId`, `actorEmail`, `action`, `entityType`, `entityId`, `ipAddress`, `userAgent`, `metadata` (JSON diff of old vs new values), `createdAt`.
- **Soft Deletion (`deletedAt: DateTime?`)**:
  - Core domain entities (`Tenant`, `User`, `StaffProfile`, `StudentProfile`, `Class`, `Subject`, `AttendanceRecord`, `ExamResult`) must support soft deletion to prevent catastrophic cascading data loss.

---

## 7. Known Legacy Baseline Migration Constraints

Step 3 database design must account for migrating the existing Step 0 single-tenant prototype database into the target schema:

1. **Missing `tenantId`**:
   - Existing 14 Prisma models have zero multi-tenancy. Step 3 must design a non-destructive migration path: (A) Create default benchmark `Tenant`; (B) Add nullable `tenantId`; (C) Backfill existing records with default `tenantId`; (D) Enforce `NOT NULL` constraint and composite unique indexes.
2. **Insecure Password Fields**:
   - Legacy models contain plain/hash password fields (`password: String`) on `Admin`, `Teacher`, `Student`, `Parent`. Step 3 must deprecate these fields in favor of Clerk authentication.
3. **Split Entity Fragmentation**:
   - Current database treats `Admin`, `Teacher`, `Student`, `Parent` as four completely disconnected, isolated tables. Step 3 must unify identity into `User` + `TenantMembership` + persona profiles.
4. **Foreign Key Integrity**:
   - The current baseline schema uses raw string foreign keys without composite tenant scoping. Step 3 must introduce composite relational constraints (`[tenantId, foreignId]`) where supported to guarantee tenant isolation at the database foreign key level.

---

## 8. Step 3 Readiness Sign-Off

The conceptual data requirements, relationships, uniqueness semantics, and migration constraints documented above provide a complete and unambiguous foundation for Step 3 (Database Architecture & Design).
