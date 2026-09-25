# 07 — Student Lifecycle & Enrollment Data Model

## 1. Architectural Mandate: Profile vs. Enrollment Separation

**Status**: TARGET / SPECIFICATION  
**Scope**: Student Identity, Annual Placement, Promotions, and Archival.

In the transformed database architecture, a student's permanent institutional identity is cleanly decoupled from their annual classroom placement:
- **`StudentProfile`**: Represents the learner's permanent institutional record (Admission Number, Date of Birth, Gender, Blood Group, Medical Alerts, Guardian Links). This record endures from the day the student is admitted until long after graduation.
- **`StudentEnrollment`**: Represents the student's placement in a specific classroom cohort for a specific academic year (Grade 10-A, Session 2026-2027, Roll Number 14). A student has one `StudentEnrollment` per active year.
- **`User` (Optional)**: If the student is granted digital portal access, their `StudentProfile` is bound to a global `User` record via `userId`. If the student is a young primary school child without personal login credentials, `userId` remains `null`, while the linked guardians access their records via `ParentProfile`.

---

## 2. Conceptual Student Lifecycle Graph

```
┌─────────────────────────────────┐
│              Tenant             │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       0..1 ┌─────────────────────────────┐
│          StudentProfile         ├───────────►│            User             │
│  - admissionNumber (Unique)     │            │  (Optional Portal Identity) │
│  - fullName, DOB, Gender        │            └─────────────────────────────┘
│  - status (ACTIVE/PROMOTED/etc) │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       * ┌─────────────────────────────┐
│        StudentEnrollment        ├────────►│            Class            │
│  - rollNumber                   │ 1       │  - Grade & Section          │
│  - academicYearId               │         └─────────────────────────────┘
│  - status (ACTIVE/TRANSFERRED)  │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐
│     StudentAcademicHistory      │ (Archived transcript snapshot upon promotion)
│  - cumulativeGpa                │
│  - totalAttendancePercent       │
│  - promotionStatus (PROMOTED)   │
└─────────────────────────────────┘
```

---

## 3. Detailed Entity Specifications

### 3.1 `StudentProfile`
- **Definition**: Permanent institutional ledger of an enrolled learner.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `userId`: Optional foreign key to `User` (if student has personal login credentials).
  - `admissionNumber`: String (e.g., "ADM-2026-0842").
  - `fullName`: String.
  - `gender`: Enum (`MALE`, `FEMALE`, `OTHER`).
  - `dateOfBirth`: Calendar date.
  - `bloodGroup`: Enum (`A_POS`, `A_NEG`, `B_POS`, `B_NEG`, `O_POS`, `O_NEG`, `AB_POS`, `AB_NEG`).
  - `address`: String.
  - `medicalNotes`: Text (Allergies, chronic conditions).
  - `maskedNationalId`: Encrypted string (Aadhaar / National ID, masked in standard UI).
  - `status`: Enum (`ENROLLED`, `ACTIVE`, `PROMOTED`, `TRANSFERRED`, `GRADUATED`, `WITHDRAWN`).
  - `admissionDate`: Calendar date.
  - `createdAt`, `updatedAt`, `deletedAt`.
- **Composite Uniqueness**: `@@unique([tenantId, admissionNumber])`. Guarantees admission numbers are unique within the institution while permitting other institutions to use the same numbering sequence.

### 3.2 `StudentEnrollment`
- **Definition**: Academic placement of a student in a class cohort for a given year.
- **Attributes**:
  - `id`, `tenantId`, `studentId`, `academicYearId`, `classId`.
  - `rollNumber`: Integer (e.g., 14).
  - `enrollmentDate`: Calendar date.
  - `status`: Enum (`ACTIVE`, `PROMOTED`, `TRANSFERRED`, `WITHDRAWN`).
- **Composite Uniqueness**:
  - `@@unique([tenantId, academicYearId, studentId])`: Prevents enrolling the same student in multiple classes during the same academic year.
  - `@@unique([tenantId, classId, rollNumber])`: Ensures roll numbers are strictly unique within a specific classroom section.

### 3.3 `StudentAcademicHistory`
- **Definition**: Permanent historical summary created at the conclusion of an academic year upon execution of the annual promotion pipeline.
- **Attributes**:
  - `id`, `tenantId`, `studentId`, `academicYearId`, `classId`, `promotedToClassId`.
  - `finalAttendanceRate`: Decimal percentage (e.g., 94.2%).
  - `aggregatePercentage`: Decimal score (e.g., 88.5%).
  - `cumulativeGpa`: Optional grade point.
  - `promotionDecision`: Enum (`PROMOTED`, `DETAINED`, `CONDITIONAL_PASS`, `TRANSFERRED_OUT`).
  - `decisionDate`: Timestamp.
  - `finalRemarks`: Text.

---

## 4. Student State Machine Transitions

```
[ Admission Inquiry ]
         │
         ▼
    ( ENROLLED )  ──► Provisioned in StudentProfile; assigned initial Admission No.
         │
         ▼
     ( ACTIVE )   ──► Bound to StudentEnrollment in Class; actively records attendance.
         │
         ├──► ( PROMOTED )    ──► Successfully completes year; advances to next Class enrollment.
         ├──► ( TRANSFERRED ) ──► Formal transfer certificate (TC) issued to another school.
         ├──► ( WITHDRAWN )   ──► Voluntary withdrawal by parents/guardians.
         └──► ( GRADUATED )   ──► Completed final grade standard (e.g. Grade 12 Alumnus).
```

When a student transitions to `TRANSFERRED` or `GRADUATED`, their `StudentProfile` and historical `StudentEnrollment` records are retained in read-only status (`status = 'ARCHIVED'`), preserving complete institutional compliance auditability.
