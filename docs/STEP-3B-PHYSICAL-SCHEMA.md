# Step 3B — Physical Database Schema & Prisma Architecture Summary

## 1. Executive Summary & Verification

**Phase**: STEP 3B — PHYSICAL DATABASE SCHEMA & PRISMA DESIGN  
**Status**: VALIDATED & COMPLETE  
**Primary Target Schema Draft**: [`docs/database/prisma-schema-target.prisma`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/prisma-schema-target.prisma)  
**Live Database / Source Code Impact**: **ZERO**. Production `prisma/schema.prisma` was untouched; zero migrations run; zero database connections opened.

This document serves as the master summary of the physical database schema and Prisma ORM architecture designed in Step 3B. It establishes the physical tables, enums, relationships, composite uniqueness semantics, indexing rules, delete policies, and the eight-phase migration execution strategy.

---

## 2. Quantitative Physical Schema Ledger

```
Total Modeled Physical Tables (Models): 43
Total Declared Enums: 24
Total Composite Unique Constraints: 22
Total High-Frequency Secondary Indexes: 42
Primary Key Standard: CUIDv2 (id: String @id @default(cuid()))
Storage Strategy: Direct denormalized tenantId across all institutional models
Isolation Strategy: Hybrid (Prisma extension application scoping + PostgreSQL RLS backstop)
```

---

## 3. Physical Model Distribution by Domain Group

### 3.1 Platform & SaaS Control Plane (5 Models)
- `Tenant`: Sovereign institutional boundary.
- `TenantPolicy`: Institutional rules (attendance cutoff, passing threshold, auto-SMS flags).
- `TenantBranding`: Official crest logo, primary colors, digital signatures, report card headers.
- `TenantDomain`: Custom apex domain and subdomain mappings.
- `SubscriptionPlan`: SaaS pricing tiers (Starter, Academic Pro, Enterprise).

### 3.2 Feature Licensing (2 Models)
- `Module`: Universal capability catalog (`core_academics`, `attendance_module`, `exam_module`, `timetable_module`, etc.).
- `TenantModuleEntitlement`: Active tenant feature licenses and expiration dates.

### 3.3 Identity & Dynamic RBAC (7 Models)
- `User`: Global human individual (1:1 with Clerk authentication).
- `PlatformUser`: SaaS super administrators and support operators.
- `UserPreference`: Language and theme settings.
- `TenantMembership`: Multi-tenant binding of user to tenant with assigned role.
- `Role`: Institutional role definitions (System roles + Custom tenant roles).
- `Permission`: 64 atomic capabilities (`attendance.mark`, `exam.publish`).
- `RolePermission`: Relational junction with horizontal `AccessScope` boundaries (`INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN`).
- `TenantInvitation`: Cryptographically signed onboarding invitation tokens.

### 3.4 Academic Calendar & Structure (6 Models)
- `AcademicYear`: Academic session (e.g., "2026-2027").
- `Term`: Grading periods (Term 1, Term 2).
- `Grade`: Curriculum levels (Grade 1 through 12).
- `Class`: Physical classroom cohorts (e.g., Grade 10-A).
- `Subject`: Master curriculum catalog.
- `ClassSubject`: Allocation of qualified teachers to subjects and class sections.

### 3.5 People & Enrollment Lifecycle (6 Models)
- `StaffProfile`: Faculty and personnel employment records.
- `StudentProfile`: Permanent institutional learner records.
- `ParentProfile`: Guardian contact records.
- `StudentParentBinding`: Multi-child, multi-guardian relational junction.
- `StudentEnrollment`: Placement in a class cohort for a specific academic year.
- `StudentAcademicHistory`: Archival transcript snapshot upon grade promotion.

### 3.6 Timetable & Scheduling (2 Models)
- `TimetablePeriod`: Standard daily time slots (e.g. Period 1, Lunch Break).
- `TimetableLesson`: Weekly instructional slots on weekdays with teacher conflict avoidance.

### 3.7 Attendance (3 Models)
- `AttendanceRecord`: Daily student presence logs (`PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `EXCUSED`).
- `AttendanceCorrection`: Audit log of retroactive modifications.
- `AttendanceDailySummary`: Read-optimized aggregation snapshot for principal dashboards.

### 3.8 Coursework & Assessments (7 Models)
- `Assignment`: Coursework distributed by teachers.
- `AssignmentSubmission`: Student digital homework submissions and teacher evaluations.
- `Exam`: Institutional assessment milestones.
- `ExamPaper`: Individual subject examination papers.
- `GradingScheme`: Configurable grading scales (e.g., CBSE 9-Point Scale).
- `ExamResult`: Recorded raw marks, practical scores, percentages, and letter grades.
- `ReportCard`: Official term report cards with permanent PDF snapshot URLs.

### 3.9 Communications, Audit & Storage (5 Models)
- `Announcement`: Official circulars and bulletins with audience targeting.
- `Event`: Master institutional calendar events.
- `Notification`: User in-app notifications inbox.
- `NotificationPreference`: User delivery switches (In-App, Push, SMS, Email).
- `AuditLog`: Append-only transactional security and operational audit trail.
- `DocumentReference`: S3 / Cloudflare R2 object storage metadata references.
- `LeadInquiry`: Public marketing portal inquiries.

---

## 4. Key Architectural Policies & Invariants

1. **Multi-Tenancy Enforcement**:
   - Every institutional table contains a mandatory, non-nullable `tenantId` column.
   - Accidental cross-tenant relational links are blocked via composite foreign keys (e.g., `ClassSubject` references `[tenantId, classId]` and `[tenantId, subjectId]`).
2. **Identity Decoupling**:
   - Authentication credentials, password changes, and sessions reside exclusively in Clerk.
   - The application PostgreSQL database models the `User` and binds them to schools via `TenantMembership`.
3. **Disciplined Delete Actions**:
   - `onDelete: Restrict` is enforced on `StudentProfile`, `Class`, `Subject`, `AttendanceRecord`, and `ExamResult` to prevent accidental loss of legal academic history.
4. **Temporal Standards**:
   - All timestamps stored in UTC (`TIMESTAMPTZ`).
   - Whole calendar dates normalized to midnight UTC (`00:00:00.000Z`).
   - Timetable period start/end times stored as discrete 24-hour time strings (`"09:00"`).

---

## 5. Eight-Phase Migration Architecture Summary

Detailed in [`docs/database/17-migration-strategy.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/17-migration-strategy.md):
- **Phase 1**: Add new foundational tables (`Tenant`, `User`, `Role`, `Permission`, `Module`, `Plan`).
- **Phase 2**: Add nullable `tenantId` and new domain tables.
- **Phase 3**: Automated data backfill (Seed default benchmark tenant; migrate `Admin`, `Teacher`, `Parent` to `User`).
- **Phase 4**: Enforce `NOT NULL` constraints and composite unique indexes.
- **Phase 5**: Transform overloaded legacy relations (`Exam` split into `Exam` + `ExamPaper`).
- **Phase 6**: Automated integrity verification (Assert 100% row-count checksums).
- **Phase 7**: Application cutover to target multi-tenant service layer.
- **Phase 8**: Post-validation decommissioning of legacy prototype structures.

---

## 6. Open Decisions (`OPEN DECISION`)

1. **`OPEN DECISION`: Physical Partitioning Timing for `AuditLog`**:
   - Range-partitioning physical table monthly in PostgreSQL can be introduced as a Phase 2 hardening step or Day 1 schema feature.
2. **`OPEN DECISION`: Dedicated Read-Replicas for Report Generation**:
   - For high-volume institutions generating 2,000 PDF report cards simultaneously, routing read traffic to a PostgreSQL read replica will be evaluated in load testing prior to release.

---

```
================================================================================
STEP 3B STATUS: TARGET PHYSICAL SCHEMA COMPLETE
================================================================================
```
