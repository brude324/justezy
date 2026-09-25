# 06 — Academic Structure & Historical Isolation Data Model

## 1. Architectural Mandate: Historical Data Immutability

**Status**: TARGET / SPECIFICATION  
**Scope**: Academic Calendar, Grade Structures, and Historical Record Preservation.

In educational institutions, academic records represent legal, permanent historical transcripts. When an academic session concludes and a student is promoted from **Class 9-A (Session 2025-2026)** to **Class 10-A (Session 2026-2027)**:
- **Historical Records Must Remain Immutable**: Past attendance logs, exam answer marks, teacher remarks, and issued report cards from Class 9 MUST NOT be updated, overwritten, or destroyed.
- **Academic Context Scoping**: All operational entities (Attendance, Lessons, Exams, Assignments, Marks) are strictly scoped to a specific `AcademicYear` and optionally a `Term`.

---

## 2. Conceptual Academic Structure Graph

```
┌─────────────────────────────────┐
│             Tenant              │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       1 ┌─────────────────────────────┐
│          AcademicYear           ├────────►│            Term             │
│  - yearLabel (e.g. 2026-2027)   │         │  - termName (e.g. Term 1)   │
│  - startDate / endDate          │         │  - startDate / endDate      │
│  - status (ACTIVE/ARCHIVED)     │         └─────────────────────────────┘
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       * ┌─────────────────────────────┐
│              Class              ├────────►│            Grade            │
│  - sectionName (e.g. "A")       │ 1       │  - gradeLevel (1..12)       │
│  - roomNumber                   │         │  - name (e.g. "Grade 10")   │
│  - supervisorTeacherId          │         └─────────────────────────────┘
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       * ┌─────────────────────────────┐
│          ClassSubject           ├────────►│           Subject           │
│  - classId                      │ 1       │  - subjectCode (e.g MATH-10)│
│  - subjectId                    │         │  - name                     │
│  - teacherId (StaffProfile)     │         │  - subjectType (THEORY/etc) │
└─────────────────────────────────┘         └─────────────────────────────┘
```

---

## 3. Detailed Entity Specifications

### 3.1 `AcademicYear`
- **Definition**: The institutional annual calendar session.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `yearLabel`: Display label (e.g., "2026-2027"). Unique within tenant.
  - `startDate`: Calendar date (e.g., `2026-04-01`).
  - `endDate`: Calendar date (e.g., `2027-03-31`).
  - `status`: Enum (`UPCOMING`, `ACTIVE`, `ARCHIVED`).
- **Invariants**: Exactly **one** `AcademicYear` per tenant may hold `status = 'ACTIVE'` at any time.

### 3.2 `Term`
- **Definition**: Grading sub-period within an academic year (e.g., Term 1, Mid-Term, Term 2 / Finals).
- **Attributes**:
  - `id`, `tenantId`, `academicYearId`.
  - `termName`: String (e.g., "Term 1 - Half Yearly").
  - `termOrder`: Integer (1, 2, 3) determining chronological sequence.
  - `startDate`, `endDate`: Calendar dates bounded by parent `AcademicYear`.

### 3.3 `Grade` & `Class`
- **`Grade`**: Curriculum level (e.g., Grade 9, Grade 10, Kindergarten).
- **`Class`**: Physical instructional cohort for a specific academic year (e.g., Grade 10, Section A in session 2026-2027).
  - *Attributes*: `id`, `tenantId`, `academicYearId`, `gradeId`, `sectionName`, `roomNumber`, `studentCapacity`, `supervisorTeacherId` (Class Teacher).
  - *Composite Uniqueness*: `@@unique([tenantId, academicYearId, gradeId, sectionName])`.
  - *Historical Safety*: When a new academic year begins, new `Class` records are provisioned for that year. The prior year's `Class` records remain permanently linked to their historical student enrollments.

### 3.4 `Subject` & `ClassSubject`
- **`Subject`**: Institutional master course definition (e.g., Mathematics, Physics, Hindi, History).
  - *Attributes*: `id`, `tenantId`, `subjectCode` (unique per tenant: e.g. `MATH-10`), `name`, `subjectType` (`THEORY`, `PRACTICAL`, `ELECTIVE`), `maxMarks`, `passMarks`.
- **`ClassSubject`**: Relational junction assigning a qualified teacher to instruct a subject for a specific class section.
  - *Attributes*: `id`, `tenantId`, `classId`, `subjectId`, `teacherId` (`StaffProfile`).
  - *Composite Uniqueness*: `@@unique([tenantId, classId, subjectId])`.
  - *Referential Protection*: A subject cannot be deleted if active `ClassSubject` assignments or examination papers link to it.

---

## 4. Historical Isolation Pattern

To preserve historical academic integrity across promotions:

```
[ Academic Session 2025-2026 ]                     [ Academic Session 2026-2027 ]
Class 9-A (id: "cls_9a_2025")                       Class 10-A (id: "cls_10a_2026")
      │                                                   │
      ├── StudentEnrollment (Roll 14)                            ├── StudentEnrollment (Roll 08)
      ├── 180 AttendanceRecords                                  ├── Active Daily Attendance
      ├── Mid-Term & Final ExamResults                           ├── New Term Exams
      └── Term 1 & 2 ReportCards (PDF snapshot)                  └── In-progress Homework
```

Because operational data points reference the unique `classId` and `academicYearId` rather than a mutable "current grade" string on the student profile, historical records remain completely isolated, queryable, and auditable forever.
