# Step 4E — V1 Business Module Migration & Production Application Authorization

## 1. Executive Summary & Purpose

Step 4E migrates the existing SchoolyardSMS V1 application from its prototype/single-tenant architecture to the production multi-tenant SaaS architecture established across Steps 4A–4D.

Every protected V1 business operation now executes through the canonical pipeline:

```
Clerk Authentication
        ↓
   Application User
        ↓
  Tenant Context (AsyncLocalStorage)
        ↓
  TenantMembership (assert ACTIVE)
        ↓
  ModuleEntitlement Gate (HTTP 402 if disabled)
        ↓
  RolePermission Gate (HTTP 403 if absent)
        ↓
  AccessScope Gate (INSTITUTION_WIDE | ASSIGNED_ONLY | SELF_ONLY | LINKED_CHILDREN)
        ↓
  Input Validation (Zod Schemas)
        ↓
  Tenant-Scoped Domain Service (prismaTarget)
        ↓
  Transactional Audit Log (AuditLog)
        ↓
  Next.js Cache Revalidation & Response
```

---

## 2. V1 Module Inventory & Migration Matrix

| Module | Legacy Model(s) | Target Prisma Model(s) | Domain Service | Permissions Enforced | AccessScope | Module Entitlement | Audit Category | Status |
|---|---|---|---|---|---|---|---|---|
| **Academics / Subjects** | `Subject` | `Subject`, `ClassSubject` | `AcademicService` | `subject.create`, `subject.update`, `subject.delete`, `subject.read` | `INSTITUTION_WIDE` | `core_academics` | `ACADEMIC` | **MIGRATED** |
| **Academics / Classes** | `Class` | `Class`, `Grade`, `AcademicYear` | `AcademicService` | `class.create`, `class.update`, `class.delete`, `class.read` | `INSTITUTION_WIDE` | `core_academics` | `ACADEMIC` | **MIGRATED** |
| **Timetable Lessons** | `Lesson` | `TimetableLesson`, `TimetablePeriod` | `AcademicService` | `timetable.manage`, `timetable.read` | `ASSIGNED_ONLY` | `timetable_module` | `ACADEMIC` | **MIGRATED** |
| **Students** | `Student` | `StudentProfile`, `StudentEnrollment` | `StudentService` | `student.create`, `student.update`, `student.delete`, `student.profile.read` | `INSTITUTION_WIDE` / `SELF_ONLY` | `core_academics` | `STUDENT` | **MIGRATED** |
| **Staff / Teachers** | `Teacher` | `StaffProfile`, `TenantMembership` | `StaffService` | `teacher.create`, `teacher.update`, `teacher.delete`, `teacher.profile.read` | `INSTITUTION_WIDE` / `ASSIGNED_ONLY` | `core_academics` | `ACADEMIC` | **MIGRATED** |
| **Parents / Guardians** | `Parent` | `ParentProfile`, `StudentParentBinding` | `ParentService` | `parent.create`, `parent.update`, `parent.read` | `LINKED_CHILDREN` | `core_academics` | `STUDENT` | **MIGRATED** |
| **Attendance** | `Attendance` | `AttendanceRecord`, `AttendanceCorrection` | `AttendanceService` | `attendance.mark`, `attendance.correct`, `attendance.read` | `ASSIGNED_ONLY` / `INSTITUTION_WIDE` | `attendance_module` | `ATTENDANCE` | **MIGRATED** |
| **Exams & Assessments** | `Exam` | `Exam`, `ExamPaper`, `ExamResult` | `AssessmentService` | `exam.create`, `exam.update`, `exam.read`, `result.update` | `INSTITUTION_WIDE` / `ASSIGNED_ONLY` | `exam_module` | `EVALUATION` | **MIGRATED** |
| **Assignments** | `Assignment` | `Assignment`, `AssignmentSubmission` | `AssignmentService` | `assignment.create`, `assignment.update`, `assignment.delete`, `assignment.read` | `ASSIGNED_ONLY` / `SELF_ONLY` | `assignment_module` | `ACADEMIC` | **MIGRATED** |
| **Announcements** | `Announcement` | `Announcement` | `CommunicationService` | `announcement.create`, `announcement.delete`, `announcement.read` | `INSTITUTION_WIDE` | `communication_module` | `ACADEMIC` | **MIGRATED** |
| **Events** | `Event` | `Event` | `CommunicationService` | `event.create`, `event.delete`, `event.read` | `INSTITUTION_WIDE` | `communication_module` | `ACADEMIC` | **MIGRATED** |

---

## 3. Domain Service Architecture

All business logic, database transactions, foreign key validations, and audit logs are encapsulated in dedicated domain services under `src/lib/services/`:

- **[`AcademicService`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/services/academic-service.ts)**:
  - Manages `Subject` and `Class` section lifecycles.
  - Delete safety: Blocks deleting subjects with active class subjects, lessons, exam papers, or assignments. Blocks deleting classes with enrolled students or attendance records.
- **[`StudentService`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/services/student-service.ts)**:
  - Manages `StudentProfile`, `StudentEnrollment`, and `StudentParentBinding`.
  - Delete safety: Protects academic history. If attendance records or exam marks exist, transitions status to `WITHDRAWN` and timestamps `deletedAt` rather than dropping student records.
- **[`StaffService`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/services/staff-service.ts)**:
  - Manages `StaffProfile` and binds to `TenantMembership`.
  - Delete safety: Prevents deleting staff members with active class supervision or subject assignments.
- **[`ParentService`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/services/parent-service.ts)**:
  - Manages `ParentProfile` and `StudentParentBinding`.
  - Delete safety: Requires unlinking student bindings before deleting a parent profile.
- **[`AttendanceService`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/services/attendance-service.ts)**:
  - Manages daily roll-call attendance on `AttendanceRecord`.
  - Delete safety: Locked records cannot be deleted; administrative correction via `AttendanceCorrection` is enforced.
- **[`AssessmentService`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/services/assessment-service.ts)**:
  - Manages `Exam`, `ExamPaper`, and `ExamResult`.
  - Delete safety: Exams with recorded student marks cannot be deleted. Verified results cannot be deleted.
- **[`AssignmentService`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/services/assignment-service.ts)**:
  - Manages `Assignment` and `AssignmentSubmission`.
  - Delete safety: Assignments with graded student submissions cannot be deleted.
- **[`CommunicationService`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/services/communication-service.ts)**:
  - Manages `Announcement` and `Event` scheduling with audience scoping.

---

## 4. FormModal Security Fix

### Legacy Vulnerability
In the baseline prototype, `FormModal.tsx` contained a severe routing defect where 7 unrelated entity types:
- `parent`
- `lesson`
- `assignment`
- `result`
- `attendance`
- `event`
- `announcement`
were all routed directly to `deleteSubject`. Submitting a delete request on an event or assignment silently attempted to execute `deleteSubject` on whatever ID was supplied!

### Modernized Solution
1. Implemented 12 explicit, type-safe Server Actions in [`actions.ts`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts):
   - `deleteSubject`, `deleteClass`, `deleteTeacher`, `deleteStudent`, `deleteExam`
   - `deleteParent`, `deleteLesson`, `deleteAssignment`, `deleteResult`, `deleteAttendance`, `deleteEvent`, `deleteAnnouncement`
2. Updated [`FormModal.tsx`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/FormModal.tsx) `deleteActionMap` so every entity type invokes its own dedicated, authorized Server Action.
3. Added error toast notification on `FormModal.tsx` so delete safety rejections or permission errors display explicit user-friendly explanations.

---

## 5. Server Action Modernization

All Server Actions in [`actions.ts`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts) now wrap mutations in `executeGuardedAction()`:
- Identity is resolved server-side via Clerk `auth()`.
- Active `TenantMembership` is verified from the database.
- Centralized policy engine evaluates atomic permissions and module gates.
- Mutations execute inside domain services with transactional `AuditLog` writes.
- Dual-write compatibility mirrors changes to legacy tables during the transitional phase.

---

## 6. UI Conditional Action Controls

`FormContainer.tsx` now evaluates `can(permKey)` server-side:
- For `type === "create"`, checks `can("${table}.create")`.
- For `type === "update"`, checks `can("${table}.update")`.
- For `type === "delete"`, checks `can("${table}.delete")`.
- If permission is absent, `FormContainer` returns `null`, preventing unauthorized UI buttons and forms from rendering.

---

## 7. Audit Strategy

All mutations write an atomic record to the `AuditLog` table within the same transaction as the state change:
- `ACADEMIC`: Subjects, classes, lessons, assignments, announcements, events.
- `STUDENT`: Enrollments, updates, withdrawals, parent bindings.
- `ATTENDANCE`: Roll-call marks and corrections.
- `EVALUATION`: Exams, papers, and mark entries.
- Captured metadata includes: `tenantId`, `actorId`, `actorEmail`, `action`, `entityType`, `entityId`, `diffJson`, and timestamp. Sensitive secrets are never logged.

---

## 8. Verification & Validation Summary

- **ESLint**: 0 warnings, 0 errors.
- **TypeScript**: 0 type errors (`tsc --noEmit`).
- **Vitest**: 143 passing tests across 26 test files (100% pass).
- **Playwright**: E2E smoke tests pass.
- **Next.js Production Build**: Compiles cleanly with exit code 0.
