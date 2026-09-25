# 17 — Multi-Phase Database Migration & Legacy Transformation Strategy

## 1. Executive Summary & Non-Negotiable Invariants

**Status**: TARGET / SPECIFICATION  
**Scope**: Zero-Downtime, Expand-and-Contract Migration from Step 0 Baseline to Target SaaS Schema.

The Step 0 audit verified that the current repository contains **14 Prisma models** with severe baseline defects: zero multi-tenancy, raw passwords in tables, broken relational mappings, and disconnected identity silos (`Admin`, `Teacher`, `Student`, `Parent`).

In accordance with `AGENTS.md`:
- **Never use `prisma migrate dev` in staging, production, or container builds**.
- **Never drop tables or columns in Phase 1**: All database changes follow the **Expand-and-Contract** pattern.
- **Mandatory Pre-Migration Snapshot**: Physical PostgreSQL snapshot taken before executing migrations.
- **Automated Data Backfill & Reconciliation**: 100% of legacy data must be verified with row-count and foreign-key checksums.
- **Reversible Migrations**: Every migration phase must have a tested SQL rollback script.

---

## 2. The Eight-Phase Migration Architecture

The migration is partitioned into eight disciplined phases:

```
[ Phase 1: Foundational Tables ] ──► Provision Tenant, User, Role, Permission, Module, Plans.
                │
[ Phase 2: Add Tenant Foreign Keys ] ──► Add nullable tenantId and new target tables.
                │
[ Phase 3: Identity & Data Backfill ] ──► Seed default tenant; migrate Admin/Teacher/Parent to User.
                │
[ Phase 4: Enforce Constraints ] ──► Make tenantId NOT NULL; apply composite unique indexes.
                │
[ Phase 5: Transform Relations ] ──► Split Exams into Exam/ExamPaper; create StudentParentBinding.
                │
[ Phase 6: Automated Verification ] ──► Row-count reconciliation; FK integrity assertion.
                │
[ Phase 7: Application Cutover ] ──► Deploy target multi-tenant service layer and RSC screens.
                │
[ Phase 8: Decommission Legacy ] ──► Drop obsolete columns and temporary compatibility views.
```

---

## 3. Phase-by-Phase Execution Plan

### Phase 1: Add New Foundational Tables
* **Action**: Execute initial forward migration script creating SaaS platform control plane and identity models:
  - Tables: `Tenant`, `TenantPolicy`, `TenantBranding`, `TenantDomain`, `SubscriptionPlan`, `Module`, `TenantModuleEntitlement`, `User`, `UserPreference`, `PlatformUser`, `TenantMembership`, `Role`, `Permission`, `RolePermission`, `TenantInvitation`, `AuditLog`.
* **Database State**: Zero impact on existing 14 tables; application continues running uninterrupted.

### Phase 2: Add Tenant Foreign Keys (Nullable) & New Domain Tables
* **Action**:
  - Add nullable `tenantId: String?` to existing domain tables: `Class`, `Subject`, `Lesson`, `Attendance`, `Event`, `Announcement`.
  - Create new target tables: `StaffProfile`, `StudentProfile`, `ParentProfile`, `StudentParentBinding`, `StudentEnrollment`, `StudentAcademicHistory`, `TimetablePeriod`, `TimetableLesson`, `ExamPaper`, `GradingScheme`, `ReportCard`, `AssignmentSubmission`, `DocumentReference`.

### Phase 3: Automated Legacy Identity & Data Backfill
* **Step 3.1: Seed Default Benchmark Tenant**:
  ```sql
  INSERT INTO "Tenant" (id, slug, name, legal_name, status, plan_tier, created_at, updated_at)
  VALUES ('tnt_default_benchmark', 'default-academy', 'Default Academy', 'Default Educational Academy Pvt Ltd', 'ACTIVE', 'ACADEMIC_PRO', NOW(), NOW());
  ```
* **Step 3.2: Seed Core System Roles & Permissions**:
  - Seed system roles: `INSTITUTION_OWNER`, `PRINCIPAL`, `TEACHER`, `STAFF`, `STUDENT`, `PARENT`.
  - Seed 64 atomic permissions.
* **Step 3.3: Backfill Users & Memberships**:
  - Extract unique email addresses from `Admin`, `Teacher`, and `Parent`.
  - Insert unified `User` records with synthetic Clerk ID mappings (`clerk_migrated_${legacyId}`).
  - Insert corresponding `TenantMembership` records bound to `'tnt_default_benchmark'`.
* **Step 3.4: Backfill Persona Profiles**:
  - `Teacher` → Insert into `StaffProfile` (map `name + " " + surname` to `fullName`, assign `employeeId = legacyId`).
  - `Student` → Insert into `StudentProfile` (map `id` to `admissionNumber`, copy DOB, blood type).
  - `Parent` → Insert into `ParentProfile`.
  - Reconstruct family graph: Iterate legacy `Student.parentId` and populate `StudentParentBinding` with `relationshipType: GUARDIAN`.
* **Step 3.5: Backfill Academic Session & Enrollments**:
  - Create default `AcademicYear` ("2026-2027", `status: ACTIVE`).
  - Create `StudentEnrollment` for every student in their existing `Student.classId`.

### Phase 4: Enforce Tenant Constraints & Composite Indexes
* **Action**:
  - Execute SQL data validation: Verify `COUNT(*) WHERE tenantId IS NULL` equals 0 across all tables.
  - Alter columns to enforce `NOT NULL`:
    ```sql
    ALTER TABLE "Class" ALTER COLUMN "tenantId" SET NOT NULL;
    ALTER TABLE "Subject" ALTER COLUMN "tenantId" SET NOT NULL;
    ALTER TABLE "AttendanceRecord" ALTER COLUMN "tenantId" SET NOT NULL;
    ```
  - Create composite unique constraints:
    - `@@unique([tenantId, admissionNumber])`
    - `@@unique([tenantId, employeeId])`
    - `@@unique([tenantId, classId, date, studentId])`

### Phase 5: Transform Overloaded & Defective Relations
* **Action**:
  - **Deconstruct Exam/Lesson Coupling**: For every legacy `Exam` record, create a parent `Exam` session ("Legacy Assessment") and transform the legacy record into an `ExamPaper` linked to the class and subject.
  - **Transform Results**: Populate `ExamResult` referencing the new `ExamPaper` ID.
  - **Transform Attendance**: Convert binary `present: Boolean` to rich enum (`true` → `PRESENT`, `false` → `ABSENT`).

### Phase 6: Automated Integrity Verification & Reconciliation
* **Action**: Automated validation script runs in staging against a sanitized clone of the production database:
  - `ASSERT count(legacy.Teacher) === count(target.StaffProfile)`
  - `ASSERT count(legacy.Student) === count(target.StudentProfile)`
  - `ASSERT count(legacy.Parent) === count(target.ParentProfile)`
  - `ASSERT count(legacy.Attendance) === count(target.AttendanceRecord)`
  - `ASSERT count(legacy.Result) === count(target.ExamResult)`
  - Assert zero dangling foreign keys (`orphaned enrollments === 0`).

### Phase 7: Application Cutover
* **Action**:
  - Deploy new Next.js application release configured to use the target multi-tenant service layer and Clerk identity sync.
  - Traffic routes to target models.

### Phase 8: Decommission Legacy Structures (Post-Validation)
* **Action**: (Executed 14 days post-cutover after production stability verification):
  - Drop obsolete tables: `Admin`, legacy `Teacher`, legacy `Student`, legacy `Parent`, legacy `Lesson`, legacy `Exam`, legacy `Result`, legacy `Attendance`.
  - Drop deprecated plain password columns.

---

## 4. Rollback & Disaster Recovery Strategy

1. **Pre-Migration Physical Backup**:
   - `pg_dump -Fc --no-acl --no-owner $DATABASE_URL > pre_migration_backup_$(date +%s).dump`
2. **Phase-Specific Down Scripts**:
   - Every forward SQL script `XX_phase_up.sql` is accompanied by an inverse `XX_phase_down.sql`.
   - If a failure occurs in Phase 3 or 4, `phase_down.sql` removes added indexes and foreign keys, leaving baseline application tables completely operational.
3. **Rollback Threshold**:
   - If automated verification in Phase 6 detects > 0 record count mismatches or foreign key integrity failures, the pipeline halts immediately, triggers `phase_down.sql`, and restores the pre-migration snapshot.
