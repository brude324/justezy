# 18 — Comprehensive Database Seeding Strategy

## 1. Executive Summary & Security Policy

**Status**: TARGET / SPECIFICATION  
**Scope**: Production System Seeding and Staging/Development Demo Fixtures.

In the transformed SaaS platform, database seeding is partitioned into two distinct categories:
1. **System Foundational Seeds (Mandatory for All Environments)**: System roles, atomic permissions, module definitions, default subscription tiers, and system policies required for the application to function.
2. **Demo & Staging Fixtures (Isolated to Dev/Staging)**: Synthetic educational institutions, mock teachers, enrolled students, sample timetables, and demo examination results for development and automated testing.

**Strict Security Policy**:
- **Zero Secrets in Seed Files**: API keys, database credentials, production signing secrets, and live Clerk tokens MUST NEVER appear in seed scripts.
- **Idempotency**: All seed scripts MUST utilize `upsert` semantics (e.g. `prisma.permission.upsert(...)`), ensuring they can be executed repeatedly on existing databases without corrupting data or throwing unique constraint violations.

---

## 2. Seed Execution Architecture

```
                          [ prisma/seed.ts ]
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│   TIER 1: SYSTEM FOUNDATIONS    │     │   TIER 2: DEMO FIXTURES         │
│  (Production, Staging, Dev)     │     │  (Staging and Local Dev Only)   │
│                                 │     │                                 │
│  1. Module Catalog (7 Modules)  │     │  1. Demo Tenant (demo-academy)  │
│  2. Permissions (64 Tokens)     │     │  2. Demo Academic Year (26-27)  │
│  3. System Roles (6 Roles)      │     │  3. Demo Classes (10-A, 10-B)   │
│  4. RolePermission Bindings     │     │  4. Demo Users & Personas       │
│  5. Subscription Plans (3 Tiers)│     │  5. Demo Roster & Timetable     │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

---

## 3. Tier 1: System Foundational Seeds Specification

### 3.1 Module Catalog
Seeds the core and optional feature modules:
```typescript
const MODULES = [
  { moduleKey: 'core_academics', displayName: 'Core Academics & Directory', isCore: true },
  { moduleKey: 'attendance_module', displayName: 'Daily Student Attendance', isCore: true },
  { moduleKey: 'communication_module', displayName: 'Announcements & Calendar', isCore: true },
  { moduleKey: 'timetable_module', displayName: 'Timetable & Scheduling', isCore: false },
  { moduleKey: 'exam_module', displayName: 'Examinations & Marks Entry', isCore: false },
  { moduleKey: 'report_card_module', displayName: 'Report Cards & Transcripts', isCore: false },
  { moduleKey: 'assignment_module', displayName: 'Assignments & Coursework', isCore: false },
];
```

### 3.2 Atomic Permissions Catalog
Seeds the complete set of 64 audited permissions across operational verbs (`read`, `create`, `update`, `delete`, `publish`, `approve`, `export`, `manage`):
- `platform.dashboard.read`, `tenant.manage`, `tenant.create`, `platform.plans.manage`, `platform.users.read`, `platform.audit.read`
- `dashboard.admin.read`, `dashboard.teacher.read`, `dashboard.student.read`, `dashboard.parent.read`
- `teacher.profile.read`, `teacher.create`, `teacher.update`, `teacher.delete`, `teacher.export`
- `student.profile.read`, `student.create`, `student.update`, `student.delete`, `student.export`
- `parent.read`, `parent.create`, `parent.update`, `parent.export`
- `academic.year.manage`, `class.read`, `class.create`, `class.update`, `class.delete`
- `subject.read`, `subject.create`, `subject.update`, `subject.delete`
- `timetable.manage`, `timetable.read`
- `attendance.read`, `attendance.mark`, `attendance.correct`, `attendance.export`
- `exam.read`, `exam.create`, `exam.update`, `exam.publish`
- `result.read`, `result.enter`, `result.update`, `result.publish`, `result.export`
- `report_card.read`, `report_card.generate`, `report_card.publish`, `report_card.export`
- `assignment.read`, `assignment.create`, `assignment.submit`, `assignment.grade`, `assignment.delete`
- `announcement.read`, `announcement.create`, `announcement.publish`, `announcement.delete`
- `event.read`, `event.create`, `event.update`, `event.delete`
- `tenant.settings.read`, `tenant.settings.manage`, `sensitive_data.read`

### 3.3 System Predefined Roles & Access Scopes
Seeds standard roles with `tenantId: null` and `isSystemRole: true`:
1. **`INSTITUTION_OWNER`**: All institutional permissions with `accessScope: INSTITUTION_WIDE`.
2. **`PRINCIPAL`**: All academic, attendance, exam, and report card permissions with `accessScope: INSTITUTION_WIDE`.
3. **`TEACHER`**: Instructional permissions (`attendance.mark`, `assignment.grade`, `result.enter`) with `accessScope: ASSIGNED_ONLY`.
4. **`STAFF`**: Administrative registry permissions (`student.profile.read`, `teacher.profile.read`).
5. **`STUDENT`**: Self-service learning permissions (`attendance.read`, `assignment.submit`, `result.read`) with `accessScope: SELF_ONLY`.
6. **`PARENT`**: Family monitoring permissions (`attendance.read`, `result.read`, `report_card.read`) with `accessScope: LINKED_CHILDREN`.

### 3.4 Subscription Plans Catalog
Seeds commercial tiers:
1. **`STARTER`**: Monthly ₹15 / student; includes core modules (`core_academics`, `attendance_module`, `communication_module`).
2. **`ACADEMIC_PRO`**: Monthly ₹35 / student; bundles core + `timetable_module`, `exam_module`, `assignment_module`.
3. **`ENTERPRISE`**: Monthly ₹60 / student; bundles all modules including `report_card_module` + unlimited quotas.

---

## 4. Tier 2: Staging & Development Demo Fixtures

*Gated by environment*: `if (process.env.NODE_ENV !== 'production')`

1. **Demo Tenant**:
   - `slug`: `demo-academy`
   - `name`: "Greenwood International Academy"
   - `planTier`: `ENTERPRISE`
2. **Demo Academic Session**:
   - `yearLabel`: "2026-2027", `status`: `ACTIVE`
   - Terms: "Term 1 (Autumn)" and "Term 2 (Spring)"
3. **Demo Roster**:
   - 2 Grades: Grade 9, Grade 10
   - 4 Class Sections: 9-A, 9-B, 10-A, 10-B
   - 6 Subjects: Mathematics, Physics, Chemistry, English, Hindi, Computer Science
   - 8 Teachers (`StaffProfile`) with realistic assignments
   - 80 Students (`StudentProfile` + `StudentEnrollment`) with generated roll numbers
   - 60 Guardians (`ParentProfile` + `StudentParentBinding`)
4. **Demo Operational Workflows**:
   - 14 days of realistic daily attendance logs (showing typical 95% attendance with random absentees).
   - Full weekly timetable periods and lesson schedules.
   - Mid-Term Examination session with scheduled papers and entered marks.
5. **Demo Platform User**:
   - Synthetic Super Admin identity for testing platform control plane screens (`PLT-01` through `PLT-07`).
