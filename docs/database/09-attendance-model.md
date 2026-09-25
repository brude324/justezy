# 09 — Attendance Domain Data Model & Uniqueness Semantics

## 1. Operational Overview & Performance Invariants

**Status**: TARGET / SPECIFICATION  
**Scope**: High-Speed Daily Classroom Attendance, Absence Alerts, and Audit Logging.

Student attendance tracking is a high-volume, mission-critical operational workflow:
- **High Concurrency Morning Peak**: In an institution of 2,000 students across 50 classrooms, all 50 class teachers submit attendance simultaneously between 08:00 AM and 08:30 AM.
- **Uniqueness Invariant**: Exactly **one** canonical attendance record may exist for a student on a specific calendar date in a given classroom section. Duplicate submissions must be rejected deterministically by the database engine.
- **Immediate Parent Notification**: Marking a student `ABSENT` immediately queues a background SMS / WhatsApp dispatch job to the student's primary guardian.
- **Auditability of Retroactive Edits**: Past attendance corrections (> 2 days) require formal justification and administrative sign-off (`attendance.correct` / `attendance.approve`).

---

## 2. Conceptual Attendance Entity Graph

```
┌─────────────────────────────────┐
│             Tenant              │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       * ┌─────────────────────────────┐
│        AttendanceRecord         ├────────►│       StudentProfile        │
│  - date (Calendar Date)         │ 1       └─────────────────────────────┘
│  - status (PRESENT/ABSENT/etc)  │
│  - isLocked (Boolean)           │       * ┌─────────────────────────────┐
│  - markedByUserId               ├────────►│            Class            │
└───────────────┬─────────────────┘ 1       └─────────────────────────────┘
                │ 1
                │
                │ 0..*
┌───────────────▼─────────────────┐
│      AttendanceCorrection       │ (Audit trail of retroactive status changes)
│  - previousStatus               │
│  - newStatus                    │
│  - reasonText                   │
│  - approvedByUserId             │
└─────────────────────────────────┘
```

---

## 3. Detailed Entity Specifications

### 3.1 `AttendanceRecord`
- **Definition**: The atomic presence log for a student on a specific school day.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `academicYearId`: Foreign key to `AcademicYear`.
  - `classId`: Foreign key to `Class`.
  - `studentId`: Foreign key to `StudentProfile`.
  - `date`: Calendar date (`DateTime` clamped to midnight `YYYY-MM-DD` UTC).
  - `status`: Enum:
    - `PRESENT`: Student in attendance for all sessions.
    - `ABSENT`: Unexcused absence. Triggers immediate automated parent alert.
    - `LATE`: Tardy arrival after formal morning assembly/lock time.
    - `HALF_DAY`: Attended morning or afternoon session only.
    - `EXCUSED`: Authorized medical leave or sanctioned institutional event.
  - `remarks`: Optional string (e.g., "Doctor's note submitted").
  - `markedByUserId`: Foreign key to `User` who submitted attendance.
  - `markedAt`: Exact timestamp of record submission.
  - `isLocked`: Boolean flag (`true` once daily cutoff time passes, preventing unauthorized casual teacher edits).
- **Composite Uniqueness Semantics**:
  - `@@unique([tenantId, classId, date, studentId])`.
  - *Engineering Guarantee*: Prevents duplicate records regardless of double-taps on mobile devices or network retries.

### 3.2 `AttendanceCorrection`
- **Definition**: Immutable historical log of retroactive changes made to an attendance record.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `attendanceRecordId`: Foreign key to target `AttendanceRecord`.
  - `previousStatus`: Enum (`AttendanceStatus`).
  - `newStatus`: Enum (`AttendanceStatus`).
  - `reason`: Text (Mandatory explanation; min 10 characters).
  - `requestedByUserId`: Foreign key to `User` who submitted correction.
  - `approvedByUserId`: Foreign key to administrative `User` (Principal/Owner).
  - `approvedAt`: Timestamp of formal approval.

### 3.3 `AttendanceDailySummary` (Materialized Cache / Aggregation)
- **Definition**: Read-optimized daily snapshot facilitating instantaneous principal dashboard rendering.
- **Attributes**:
  - `id`, `tenantId`, `academicYearId`, `classId`, `date`.
  - `totalEnrolled`: Integer.
  - `totalPresent`: Integer.
  - `totalAbsent`: Integer.
  - `totalLate`: Integer.
  - `attendancePercentage`: Decimal (e.g., 95.0%).
  - `submittedAt`: Timestamp.
- **Composite Uniqueness**: `@@unique([tenantId, classId, date])`.

---

## 4. Operational Invariants & Policies

### 4.1 Daily Cutoff & Automatic Locking
- **Institutional Policy**: Defined in `TenantPolicy.attendanceCutoffTime` (e.g., 10:30 AM).
- **Behavior**: Once the cutoff passes, a scheduled background worker transitions `isLocked = true` for all submitted records of the day.
- Teachers attempting to modify locked records receive an error prompting them to submit an `AttendanceCorrection` request to the Principal.

### 4.2 Automated Absence Notification Pipeline
1. Teacher taps "Submit Attendance" on `TNT-ATT-01`.
2. Prisma transaction writes `AttendanceRecord` batch and updates `AttendanceDailySummary`.
3. In the post-commit transaction hook, any student with `status === 'ABSENT'` produces a background BullMQ notification payload:
   - Queries `StudentParentBinding` for `isPrimaryContact === true`.
   - Dispatches SMS template: *"Dear Parent, your ward [Student Name] has been marked ABSENT on [Date] at [School Name]."*
