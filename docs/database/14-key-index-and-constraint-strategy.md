# 14 — Key, Index, Constraint & Time Handling Strategy

## 1. Primary Key Architecture: CUIDv2 vs. UUIDv7 vs. Numeric

**Status**: TARGET / SPECIFICATION  
**Scope**: Identifiers, Indexing Performance, Data Integrity, and Temporal Standards.

### 1.1 Selected Identifier Strategy: CUIDv2
For application entity primary keys, the target schema standardizes on **CUIDv2** (Collision-resistant Unique Identifiers):
```prisma
id  String  @id @default(cuid())
```

### 1.2 Architectural Rationale & Comparison
| Identifier Type | Distributed Generation | B-Tree Index Fragmentation | URL-Safe / Clean Display | Migration Compatibility | Decision |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Numeric Serial (BigInt)** | No (Database single point) | Low (Monotonic) | Poor (Exposes entity count) | High risk in multi-tenant SaaS | **REJECTED** |
| **Random UUIDv4** | Yes (Client/Server) | High (Random page splits) | Acceptable (36 chars with dashes) | Legacy format | **REJECTED** |
| **UUIDv7** | Yes (Time-ordered) | Low (Monotonic) | Acceptable (36 chars) | Strong alternative | **VIABLE ALTERNATIVE** |
| **CUIDv2** | **Yes (Secure & fast)** | **Low (Sortable prefix)** | **Superior (Short, clean, no dashes)**| **Native Prisma standard** | **SELECTED STANDARD** |

- **Security Advantage**: CUIDv2 strings are non-sequential and cryptographically random, preventing IDOR (Insecure Direct Object Reference) enumeration attacks where malicious users attempt to iterate IDs (`/student/1`, `/student/2`).
- **Prisma Ecosystem Fit**: CUID is natively supported in Prisma ORM without external database extensions or compile-time dependencies.

---

## 2. Uniqueness Strategy: Global vs. Tenant-Local

The architecture strictly distinguishes between **Global Uniqueness** and **Tenant-Local Uniqueness**:

### 2.1 Global Uniqueness
Enforced strictly for SaaS platform root entities:
- `Tenant.slug`: Unique across all institutions to prevent subdomain hostname collisions.
- `User.clerkId`: Unique globally to enforce 1:1 binding with external Clerk authentication.
- `User.email`: Unique globally for unified identity sign-in.
- `SubscriptionPlan.planKey`: Unique globally across the SaaS catalog.
- `Permission.permissionKey`: Unique globally across the system catalog.

### 2.2 Tenant-Local Uniqueness (Scoped Composites)
Within an institution, natural codes and numbers must be unique *only within that institution*, while allowing other institutions to use the same numbers:
- `@@unique([tenantId, admissionNumber])` on `StudentProfile`.
- `@@unique([tenantId, employeeId])` on `StaffProfile`.
- `@@unique([tenantId, subjectCode])` on `Subject`.
- `@@unique([tenantId, yearLabel])` on `AcademicYear`.
- `@@unique([tenantId, academicYearId, gradeId, sectionName])` on `Class`.
- `@@unique([tenantId, classId, date, studentId])` on `AttendanceRecord`.
- `@@unique([tenantId, examId, classId, subjectId])` on `ExamPaper`.
- `@@unique([tenantId, examPaperId, studentId])` on `ExamResult`.
- `@@unique([tenantId, assignmentId, studentId])` on `AssignmentSubmission`.

---

## 3. Indexing Strategy & High-Frequency Query Paths

Every index in the target database is intentionally designed to support the core query patterns of multi-tenant education workloads:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TENANT-PREFIXED INDEX PATTERN                   │
│                                                                        │
│   INDEX idx_entity_lookup ON TableName (tenantId, lookupColumn)        │
│                                                                        │
│   Example: @@index([tenantId, classId, date])                          │
│   - First evaluates tenant boundary (eliminates cross-tenant records)  │
│   - Second evaluates classroom section                                 │
│   - Third filters by specific calendar date                            │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Master Index Directory
1. **Roster Lookups**:
   - `StudentEnrollment`: `@@index([tenantId, classId, status])` — powers instant morning attendance roster rendering.
2. **Attendance Reporting**:
   - `AttendanceRecord`: `@@index([tenantId, studentId, date])` — powers student 360 monthly attendance calendar heatmap.
   - `AttendanceRecord`: `@@index([tenantId, date, status])` — powers principal dashboard daily attendance percentage aggregation.
3. **Marks & Results Entry**:
   - `ExamResult`: `@@index([tenantId, examPaperId, studentId])` — powers marks entry spreadsheet and auto-gpa calculations.
4. **Timetable Scheduling**:
   - `TimetableLesson`: `@@index([tenantId, classId, dayOfWeek])` — powers student/class weekly timetable view.
   - `TimetableLesson`: `@@index([tenantId, teacherId, dayOfWeek])` — powers teacher personal weekly schedule view and conflict detection.
5. **Audit Queries**:
   - `AuditLog`: `@@index([tenantId, createdAt])` — powers institutional audit trail pagination in `TNT-SET-01`.

---

## 4. Referential Integrity & Cascade Delete Policies

In an educational SaaS system, `onDelete: Cascade` must be used with extreme discipline. Careless cascading deletes can wipe out years of legal academic records upon a single user deletion.

| Relationship | Constraint Action | Architectural Rationale |
| :--- | :---: | :--- |
| `Tenant` → `Class` / `Subject` | `Cascade` | Complete tenant teardown in test/seed environments. (Production protected via soft-delete). |
| `Class` → `StudentEnrollment` | **`Restrict`** | **Cannot delete a Class if active student enrollments exist**. Prevents orphaning students. |
| `StudentProfile` → `AttendanceRecord` | **`Restrict`** | **Cannot hard-delete a student if attendance history exists**. Must soft-delete / transfer. |
| `StudentProfile` → `ExamResult` | **`Restrict`** | **Cannot delete a student if legal exam marks exist**. |
| `Subject` → `ExamPaper` | **`Restrict`** | Cannot delete a subject if scheduled for an active or past examination. |
| `Exam` → `ExamPaper` | `Cascade` | Deleting a draft exam removes its paper slots cleanly. |
| `Assignment` → `AssignmentSubmission` | `Cascade` | Deleting an assignment removes associated submissions. |
| `User` → `TenantMembership` | `Cascade` | Revoking a global identity removes tenant bindings cleanly. |

---

## 5. Temporal & Date/Time Handling Standards

### 5.1 Storage Timezone Standard
- **All Database Timestamps are UTC**: Physical PostgreSQL `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ` / Prisma `DateTime`) strictly stores timestamps in UTC.
- **Client Presentation**: Timestamps are formatted into Indian Standard Time (IST / `Asia/Kolkata`) on the client using `Intl.DateTimeFormat` or server-side utility helpers.

### 5.2 Calendar Dates vs. Timestamps
- **Calendar Dates (`date`)**: For concepts that represent a whole calendar day (Date of Birth, Attendance Date, Exam Date, Term Start/End), the value is normalized to midnight UTC (`YYYY-MM-DDT00:00:00.000Z`) to eliminate timezone shift bugs where dates change by +/- 1 day between IST and UTC.
- **Time-of-Day (`startTime`, `endTime`)**: For timetable periods and exam timings (e.g., "09:00 AM" to "09:45 AM"), stored as 24-hour time strings (`"09:00"`, `"09:45"`) or integer minutes from midnight (`540`, `585`), decoupling time-of-day from arbitrary calendar dates.
