# 10 — Examination, Grading & Assessment Data Model

## 1. Architectural Mandate: Decoupling Assessment from Lessons

**Status**: TARGET / SPECIFICATION  
**Scope**: Examination Sessions, Multi-Paper Date Sheets, Homework, Grading Schemes, and Report Cards.

The Step 0 audit revealed a severe defect in the baseline prototype: the `Exam` model was coupled 1:1 to an individual timetable `Lesson`. This design failed for real-world institutions because:
1. Mid-Term or Final examination sessions span multiple weeks, include multiple subject papers, and follow special schedules completely independent of regular weekly timetable lessons.
2. An institutional exam (e.g. "Term 1 Summative Assessment") requires an overarching parent container with published status, start/end dates, and class targets.

The target architecture replaces this coupling with a dedicated **Examination & Assessment Hierarchy**.

---

## 2. Conceptual Assessment & Evaluation Graph

```
┌─────────────────────────────────┐
│             Tenant              │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       1 ┌─────────────────────────────┐
│              Exam               ├────────►│          ExamPaper          │
│  - title (e.g. Term 1 Finals)   │         │  - examDate, startTime      │
│  - status (DRAFT/PUBLISHED/etc) │         │  - subjectId, classId       │
└───────────────┬─────────────────┘         │  - maxMarks, passMarks      │
                │ 1                         └──────────────┬──────────────┘
                │                                          │ 1
                │                                          │
                │ *                                        │ *
┌───────────────▼─────────────────┐         ┌──────────────▼──────────────┐
│           ReportCard            │         │         ExamResult          │
│  - aggregatePercentage          │         │  - theoryMarks              │
│  - overallGrade                 │         │  - practicalMarks           │
│  - pdfSnapshotUrl               │         │  - totalMarks, gradeLetter  │
│  - status (PUBLISHED)           │         │  - studentId                │
└─────────────────────────────────┘         └─────────────────────────────┘
```

---

## 3. Detailed Entity Specifications

### 3.1 `Exam` (Assessment Session Master)
- **Definition**: An institutional assessment milestone.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `academicYearId`: Foreign key to `AcademicYear`.
  - `termId`: Foreign key to `Term`.
  - `title`: String (e.g., "Annual Examinations 2026-2027").
  - `startDate`, `endDate`: Calendar dates.
  - `instructions`: Text.
  - `status`: Enum (`DRAFT`, `SCHEDULED`, `ONGOING`, `COMPLETED`, `RESULTS_PUBLISHED`).
  - `createdAt`, `updatedAt`, `deletedAt`.

### 3.2 `ExamPaper` (Subject Schedule Slot)
- **Definition**: Individual subject examination scheduled within an `Exam` session.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `examId`: Foreign key to parent `Exam`.
  - `subjectId`: Foreign key to `Subject`.
  - `classId`: Foreign key to `Class`.
  - `examDate`: Calendar date.
  - `startTime`, `endTime`: Time-of-day.
  - `maxMarks`: Decimal (e.g., 100.0).
  - `passMarks`: Decimal (e.g., 33.0).
  - `roomNumber`: Optional string.
- **Composite Uniqueness**: `@@unique([tenantId, examId, classId, subjectId])`. Prevents scheduling two papers for the same subject and class within the same examination milestone.

### 3.3 `ExamResult` (Marks Entry Ledger)
- **Definition**: Recorded student score for an individual `ExamPaper`.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `examPaperId`: Foreign key to `ExamPaper`.
  - `studentId`: Foreign key to `StudentProfile`.
  - `theoryMarks`: Decimal (e.g., 68.5).
  - `practicalMarks`: Optional decimal (e.g., 24.0).
  - `totalMarks`: Decimal (Calculated: `theory + practical`).
  - `isAbsent`: Boolean (`true` if student missed the paper).
  - `percentage`: Decimal (Calculated: `totalMarks / maxMarks * 100`).
  - `gradeLetter`: String (e.g., "A1", "B2", "F" evaluated via `GradingScheme`).
  - `gradePoint`: Optional decimal (e.g., 9.0).
  - `remarks`: Optional string.
  - `enteredByUserId`: Foreign key to `User` (Subject Teacher).
  - `isVerified`: Boolean.
- **Composite Uniqueness**: `@@unique([tenantId, examPaperId, studentId])`. Guarantees a student has exactly one score record per paper.

### 3.4 `GradingScheme` (Configurable Evaluation Rules)
- **Definition**: Decoupled grading rules supporting various national and state boards.
- **Attributes**:
  - `id`, `tenantId`.
  - `schemeName`: String (e.g., "CBSE 9-Point Scale", "College GPA 10-Point").
  - `isDefault`: Boolean.
  - `rulesJson`: Structured JSON array of grade bands:
    ```json
    [
      { "minPercent": 91.0, "maxPercent": 100.0, "grade": "A1", "point": 10.0, "description": "Outstanding" },
      { "minPercent": 81.0, "maxPercent": 90.99, "grade": "A2", "point": 9.0,  "description": "Excellent" },
      { "minPercent": 71.0, "maxPercent": 80.99, "grade": "B1", "point": 8.0,  "description": "Very Good" },
      { "minPercent": 33.0, "maxPercent": 40.99, "grade": "D",  "point": 4.0,  "description": "Passing" },
      { "minPercent": 0.0,  "maxPercent": 32.99, "grade": "E",  "point": 0.0,  "description": "Needs Improvement / Failed" }
    ]
    ```

### 3.5 `ReportCard` (Official Published Transcript)
- **Definition**: Official published student academic report card.
- **Attributes**:
  - `id`, `tenantId`, `academicYearId`, `termId`, `studentId`, `classId`.
  - `grandTotal`: Decimal (Sum of marks obtained).
  - `totalMaxMarks`: Decimal (Sum of maximum possible marks).
  - `aggregatePercentage`: Decimal.
  - `overallGrade`: String.
  - `attendanceRatePercent`: Decimal.
  - `classRank`: Optional integer.
  - `coScholasticScoresJson`: JSON array of non-academic ratings (Work Education, Arts, Sports).
  - `teacherRemarks`: Text.
  - `principalRemarks`: Text.
  - `pdfSnapshotUrl`: String (Permanent immutable PDF storage link).
  - `status`: Enum (`DRAFT`, `GENERATED`, `SIGNED`, `PUBLISHED`).
- **Composite Uniqueness**: `@@unique([tenantId, academicYearId, termId, studentId])`.

---

## 4. Coursework: `Assignment` & `AssignmentSubmission`

```
┌─────────────────────────────────┐
│           Assignment            │
│  - classId, subjectId, teacherId│
│  - title, instructionsMarkdown  │
│  - dueDate, maxMarks            │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐
│      AssignmentSubmission       │
│  - studentId                    │
│  - submittedAt, fileUrls        │
│  - marksAwarded, feedback       │
│  - status (SUBMITTED/GRADED)    │
└─────────────────────────────────┘
```
- **Composite Uniqueness**: `@@unique([tenantId, assignmentId, studentId])`. Prevents duplicate submission records per student.
