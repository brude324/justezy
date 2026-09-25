# 16 — Legacy-to-Target Model Migration & Transformation Ledger

## 1. Executive Summary & Migration Principles

**Status**: TARGET / SPECIFICATION  
**Scope**: Complete Mapping of the 14 Baseline Step 0 Prisma Models to the Target SaaS Schema.

The Step 0 audit verified that the current repository contains **14 Prisma models** operating in a flat, single-tenant, tutorial-style schema without `tenantId`, without DB-driven RBAC, and with plain password fields.

This document establishes the authoritative transformation path for every legacy model, adhering to the non-destructive **Expand-and-Contract** migration pattern:
1. **Never drop legacy tables/columns immediately**: New target models and fields are added first (Expand).
2. **Automated Data Backfill**: Existing records are bound to a default baseline `Tenant` and unified into the `User` and `TenantMembership` architecture.
3. **Cutover & Deprecation**: Once application traffic routes to the target models, legacy columns and models are formally decommissioned (Contract).

---

## 2. Complete 14-Model Migration Ledger

| # | Current Model | Current Purpose & Baseline Deficiencies | Target Concept(s) | Target Field Mappings | Migration & Data Backfill Notes |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `Admin` | Hardcoded single-school administrator; contains `password: String`. | `User` + `TenantMembership` + `Role` (`INSTITUTION_OWNER`) | `username` → `User.clerkId` / `email`<br>`password` → Deprecated (Clerk auth) | Split into global `User` and institutional `TenantMembership`. Password field decommissioned; user invited to Clerk. |
| **2** | `Teacher` | Conflates identity with staff employment; plain password; global unique email. | `User` + `TenantMembership` + `StaffProfile` | `id` → `StaffProfile.id`<br>`username` → `User.clerkId`<br>`email` → `User.email`<br>`name`, `surname` → `StaffProfile.fullName` | Split identity to `User` and employment details to `StaffProfile`. Backfill default `tenantId` and create `TenantMembership` with `Role: TEACHER`. |
| **3** | `Student` | Single-tenant learner; global unique admission; plain password; no enrollment history. | `StudentProfile` + `StudentEnrollment` + (Optional `User`) | `id` → `StudentProfile.id`<br>`name`, `surname` → `StudentProfile.fullName`<br>`classId` → `StudentEnrollment.classId` | Backfill `tenantId`. Create `StudentProfile` with unique `[tenantId, admissionNumber]`. Create initial `StudentEnrollment` record for active session. |
| **4** | `Parent` | Flat table; single phone string; no multi-child binding junction; plain password. | `ParentProfile` + `StudentParentBinding` + (Optional `User`) | `id` → `ParentProfile.id`<br>`name`, `surname` → `ParentProfile.fullName`<br>`phone` → `ParentProfile.primaryPhone` | Backfill `tenantId`. Decompose 1:N student relation into dedicated `StudentParentBinding` junction supporting multiple guardians per child. |
| **5** | `Grade` | Global grade level number (1..12); lacks multi-tenancy. | `Grade` | `id` → `Grade.id`<br>`level` → `Grade.gradeLevel` | Add `tenantId`. Enforce `@@unique([tenantId, gradeLevel])`. Backfill default tenant. |
| **6** | `Class` | Global class cohort; supervisor teacher nullable (causes runtime crash in baseline). | `Class` | `id` → `Class.id`<br>`name` → `Class.sectionName`<br>`capacity` → `Class.studentCapacity`<br>`supervisorId` → `Class.supervisorTeacherId` | Add `tenantId` and `academicYearId`. Enforce `@@unique([tenantId, academicYearId, gradeId, sectionName])`. Handle null supervisor teacher gracefully. |
| **7** | `Subject` | Global subject catalog; delete action dangerous in baseline. | `Subject` + `ClassSubject` | `id` → `Subject.id`<br>`name` → `Subject.name` | Add `tenantId` and `subjectCode`. Enforce `@@unique([tenantId, subjectCode])`. Split teacher assignment into `ClassSubject` junction. |
| **8** | `Lesson` | Overloaded timetable slot; conflates scheduling with exam parent container. | `TimetableLesson` | `id` → `TimetableLesson.id`<br>`day` → `TimetableLesson.dayOfWeek`<br>`startTime`, `endTime` → Normalized time slots | Add `tenantId` and `academicYearId`. Decouple from `Exam`. Map time ranges to discrete `TimetablePeriod` foreign keys. |
| **9** | `Exam` | Flawed 1:1 coupling to `Lesson`; cannot model multi-week exam sessions. | `Exam` (Master) + `ExamPaper` (Slot) | `id` → `ExamPaper.id`<br>`title` → `Exam.title`<br>`startTime`, `endTime` → `ExamPaper.startTime`, `endTime` | **Architectural Split**: Create parent `Exam` milestone; convert legacy `Exam` records into `ExamPaper` subject slots linked to parent session. |
| **10** | `Assignment` | Global homework item; lacks digital student submission or attachment handling. | `Assignment` + `AssignmentSubmission` | `id` → `Assignment.id`<br>`title` → `Assignment.title`<br>`startDate`, `dueDate` → `Assignment.assignedDate`, `dueDate` | Add `tenantId` and `academicYearId`. Create child `AssignmentSubmission` table to support digital student file uploads. |
| **11** | `Result` | Single test score; duplicate student name bug in baseline; lacks grade calculations. | `ExamResult` | `id` → `ExamResult.id`<br>`score` → `ExamResult.totalMarks`<br>`studentId` → `ExamResult.studentId` | Add `tenantId`. Link to `ExamPaper`. Add auto-calculated `percentage` and `gradeLetter` driven by `GradingScheme`. |
| **12** | `Attendance` | Global attendance record; binary present boolean; lacks daily locking. | `AttendanceRecord` | `id` → `AttendanceRecord.id`<br>`date` → `AttendanceRecord.date`<br>`present` → `AttendanceRecord.status` (`PRESENT`/`ABSENT`) | Add `tenantId` and `classId`. Upgrade binary boolean to rich enum (`PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `EXCUSED`). Enforce `@@unique([tenantId, classId, date, studentId])`. |
| **13** | `Event` | Global school event; flat structure without academic calendar context. | `Event` | `id` → `Event.id`<br>`title` → `Event.title`<br>`startTime`, `endTime` → `Event.startDateTime`, `endDateTime` | Add `tenantId` and `academicYearId`. Add `eventType` enum, `isSchoolClosed` flag, and target audience JSON filter. |
| **14** | `Announcement`| Global bulletin; lacks audience targeting or urgent priority flags. | `Announcement` | `id` → `Announcement.id`<br>`title` → `Announcement.title`<br>`date` → `Announcement.publishedAt` | Add `tenantId`. Add `category` enum, `targetAudienceScope`, `isUrgent` flag, and markdown body support. |

---

## 3. Four-Step Migration Execution Pipeline

When Step 4 migration begins, the database backfill script will execute strictly down this dependency pipeline:

```
Step 1: Seed Default Benchmark Tenant
        INSERT INTO "Tenant" (id, name, slug, status, planTier)
        VALUES ('default_school', 'Default Academy', 'default-academy', 'ACTIVE', 'ACADEMIC_PRO');
        ↓
Step 2: Seed System Roles & Permissions
        INSERT INTO "Role" (isSystemRole, roleKey) VALUES (true, 'INSTITUTION_OWNER'), (true, 'TEACHER')...
        ↓
Step 3: Migrate Users & Memberships
        Extract unique emails from Admin, Teacher, Parent.
        Insert into "User" and create corresponding "TenantMembership" bound to 'default_school'.
        ↓
Step 4: Backfill Domain Records & Apply Foreign Keys
        UPDATE "Class", "Subject", "Student", "Attendance", "Exam", "Result"
        SET tenantId = 'default_school' WHERE tenantId IS NULL;
        Apply NOT NULL constraints and composite unique indexes.
```
