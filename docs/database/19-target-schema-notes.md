# 19 — Physical Schema Architectural & Engineering Notes

## 1. Overview & Document Purpose

**Status**: TARGET / SPECIFICATION  
**Scope**: Technical Deep-Dive into the Physical PostgreSQL & Prisma Schema Design.

This document accompanies [`prisma-schema-target.prisma`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/database/prisma-schema-target.prisma), providing the engineering rationale, trade-off evaluations, and performance decisions that govern the physical schema.

---

## 2. Multi-Tenancy Physical Implementation: Direct vs. Indirect Ownership

A recurring architectural question in multi-tenant SaaS schema design is whether secondary and tertiary child entities should carry a direct `tenantId` column or rely on indirect joins through their parent entity:

```
Option 1 (Indirect Ownership):
Tenant ──► Class ──► Lesson ──► Exam ──► Result
Result.tenantId is derived via Result.exam.lesson.class.tenantId

Option 2 (Direct Denormalized Ownership - SELECTED):
Every model carries a mandatory direct tenantId column:
Result.tenantId, Exam.tenantId, Lesson.tenantId, Class.tenantId
```

### Engineering Rationale for Direct `tenantId`:
1. **Bulletproof Query Isolation**: With direct `tenantId`, every query executes with `WHERE tenant_id = :tenantId`. It does not require expensive multi-table joins just to assert institutional ownership.
2. **PostgreSQL Row-Level Security (RLS)**: PostgreSQL native RLS policies perform best when filtering on a local column (`tenant_id = current_setting(...)`). Indirect joins in RLS policies can force sequential table scans and cripple database throughput.
3. **Compound Foreign Keys**: Direct `tenantId` enables composite foreign keys (`[tenantId, parentId]`), making accidental cross-tenant relational links impossible at the database engine level.
4. **Maintenance & Partitioning**: Enables native PostgreSQL table partitioning by `tenant_id` for massive high-volume institutional clusters in future phases.

---

## 3. Referential Action Policies: Strict Cascade vs. Restrict

The physical schema rejects the careless application of `onDelete: Cascade`. Deleting a record must never inadvertently destroy legal academic history:

| Entity Relationship | Selected Delete Action | Engineering Rationale |
| :--- | :---: | :--- |
| `Class` → `StudentEnrollment` | **`Restrict`** | Deleting a classroom group is blocked if active student enrollments exist. Students must be explicitly transferred first. |
| `StudentProfile` → `AttendanceRecord` | **`Restrict`** | A student profile cannot be hard-deleted if attendance records exist. Compliance laws mandate preserving attendance logs. |
| `StudentProfile` → `ExamResult` | **`Restrict`** | Protects student test marks and transcripts from permanent destruction. |
| `Class` → `supervisorTeacher` | **`SetNull`** | If a teacher resigns or is archived, the class simply loses its supervisor; the classroom group and its enrolled students remain intact. |
| `Exam` → `ExamPaper` | `Cascade` | Deleting a draft exam milestone cleanly removes its scheduled paper slots. |
| `Assignment` → `AssignmentSubmission` | `Cascade` | Deleting an assignment removes associated homework submissions. |
| `Tenant` → Child Entities | `Cascade` / `Soft Delete` | Cascade is declared in the Prisma schema to allow clean tear-downs in local integration testing and test runner environments. Production environments enforce soft-deletion (`deletedAt != null`). |

---

## 4. Key Performance Indexes & Query Patterns

The physical schema incorporates **42 high-frequency indexes** tailored to the primary query patterns identified in Step 2:

1. **Roster Morning Rendering (`TNT-ATT-01`)**:
   - `StudentEnrollment`: `@@index([tenantId, classId, status])`
   - *Query*: `SELECT * FROM StudentEnrollment WHERE tenantId = :t AND classId = :c AND status = 'ACTIVE' ORDER BY rollNumber ASC`.
   - *Result*: Instant index-only scan avoiding sequential scans across the global student enrollment table.
2. **Attendance Defaulters Aggregation (`TNT-ATT-02`)**:
   - `AttendanceRecord`: `@@index([tenantId, date, status])`
   - *Query*: Fast grouping and counting of present vs absent students across the institution for today's date.
3. **Teacher Timetable Conflict Check (`TNT-TBL-01`)**:
   - `TimetableLesson`: `@@unique([tenantId, teacherId, academicYearId, dayOfWeek, periodId])`
   - *Performance*: Database engine automatically asserts that a teacher cannot be double-booked across distinct classrooms during overlapping period slots on the same day.

---

## 5. Temporal Standards & Anti-Corruption Invariants

1. **UTC Normalization**:
   - PostgreSQL physical storage standardizes strictly on UTC (`TIMESTAMPTZ`).
   - Presentation logic formats dates into Indian Standard Time (IST) on client surfaces.
2. **Elimination of Timezone Date Drift**:
   - Whole calendar dates (Date of Birth, Attendance Date, Exam Paper Date) are clamped to midnight UTC (`00:00:00.000Z`).
   - Timetable period start and end times are stored as discrete 24-hour time strings (`"09:00"`, `"09:45"`), eliminating arbitrary date dependencies.
