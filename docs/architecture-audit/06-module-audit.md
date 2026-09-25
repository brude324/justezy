# Section F: Existing Modules & Business Domains Audit

## 1. Domain Disposition Summary

| Module Name | Purpose | Models Involved | Maturity Level | Disposition | Migration Justification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & Identity** | User login, session management | Clerk only (`Admin`, `Teacher`, `Student`, `Parent` IDs) | Prototype | **REFACTOR** | Retain Clerk for authentication only; decouple RBAC, session claims, and replace with DB membership lookup. |
| **Admin Analytics & Dashboard** | Summary KPIs, counts, attendance & finance charts | `Admin`, `Teacher`, `Student`, `Parent`, `Attendance` | Tutorial / Mock | **REPLACE** | Replace mock `FinanceChart` and hardcoded `UserCard` aggregations with real multi-tenant tenant analytics services. |
| **Teacher Management** | Directory of instructors, subject mappings | `Teacher`, `Subject`, `Class`, `Lesson` | Basic CRUD | **REFACTOR** | Retain UI table/cards; refactor data access, add tenant isolation, Indian designation fields, and staff roles. |
| **Student Management** | Directory of students, profiles, class assignments | `Student`, `Class`, `Grade`, `Parent`, `Attendance` | Basic CRUD | **REFACTOR** | Retain UI table/cards; add admission numbers, roll numbers, academic sessions, and multi-tenant schema isolation. |
| **Parent / Guardian Directory**| Parent directory with child relationships | `Parent`, `Student` | Read-only List | **REFACTOR** | List exists, but no form, no create/update action, and delete action executes `deleteSubject` bug. Needs complete CRUD. |
| **Academics: Subjects** | Course definitions & teacher linkages | `Subject`, `Teacher`, `Lesson` | Basic CRUD | **REFACTOR** | Retain form and list; remove global `@unique` constraint on name, add tenant scoping and subject codes. |
| **Academics: Classes & Grades** | Sections, capacity limits, teacher supervisors | `Class`, `Grade`, `Teacher`, `Lesson` | Basic CRUD | **REFACTOR** | Retain UI; fix `Grade.classess` relation typo, remove global `@unique` on class name, add tenant scoping. |
| **Timetable & Lessons** | Weekly schedule of periods and classes | `Lesson`, `Subject`, `Class`, `Teacher` | List / Calendar | **REFACTOR** | Retain `react-big-calendar` integration; add Saturday support, time-of-day slots, and CRUD forms. |
| **Examinations** | Exam scheduling and period linking | `Exam`, `Lesson`, `Result` | Partial CRUD | **REFACTOR** | Retain basic form; decouple from single `Lesson`, tie to terms/academic years, fix commented-out authorization. |
| **Assignments & Homework** | Homework deadlines and assignments | `Assignment`, `Lesson`, `Result` | List Only | **REFACTOR** | Form missing, delete action points to `deleteSubject`; needs form, attachments, and student submission tracking. |
| **Assessment Results & Marks** | Recording scores for exams & homework | `Result`, `Exam`, `Assignment`, `Student` | List Only | **REPLACE** | Form and actions missing; score is simple integer; needs grading scale, GPA/percentage logic, and report cards. |
| **Student Attendance** | Attendance logging and calculation | `Attendance`, `Student`, `Lesson` | Functioning Logic / Route Missing | **REFACTOR / EXPAND** | Implemented as a data-backed logical module (`Attendance` model, `AttendanceChartContainer`, `StudentAttendanceCard`), but lacks a dedicated user-facing `/list/attendance` route/page and CRUD actions. |
| **Events Management** | Calendar dates and institutional activities | `Event`, `Class` | List Only | **REFACTOR** | Form missing, delete points to `deleteSubject`; add multi-tenant calendar feeds and audience targeting. |
| **Announcements & Bulletin** | School bulletins and notices | `Announcement`, `Class` | List / Widget | **REFACTOR** | Form missing, delete points to `deleteSubject`; add push/SMS/email delivery, attachments, and recipient targeting. |
| **Messaging / Community** | In-app messaging and community communication | None | Non-existent | **REMOVE / REPLACE** | Menu links to `/list/messages`, but directory and code do not exist. To be built on clean messaging architecture. |
| **Finance / Fees** | Fee tracking, income/expenses | None | UI Mock Only | **REPLACE** | `FinanceChart.tsx` renders static dummy numbers. No fee collection, ledger, or invoice models exist. |

> [!NOTE]
> **Definition Distinction**:
> - **Functioning business modules**: Logical modules with implemented data-backed functionality somewhere in the current application (e.g., Attendance has data models, database queries, chart visualizations, and metric cards).
> - **Complete application route**: A dedicated user-facing route/page (`page.tsx`) providing a primary screen interface (e.g., `/list/teachers`, `/list/students`). Attendance does **not** possess a dedicated CRUD page (`/list/attendance` is a missing route).


---

## 2. In-Depth Module Analysis

### 2.1 Student Management Module
- **Current Routes**: `/list/students`, `/list/students/[id]`
- **Capabilities**:
  - Displays paginated table of students with search by name and filtering by `teacherId` or `classId`.
  - Single student page displays personal metadata, attendance percentage, class name, timetable, and shortcut links.
  - Client form (`StudentForm.tsx`) with image upload via Cloudinary.
  - Server Action (`createStudent`, `updateStudent`, `deleteStudent`) creates/deletes user in Clerk, then in PostgreSQL.
- **Flaws & Limitations**:
  - Grade is derived via `student.class.name.charAt(0) + 'th'` (assumes classes are named "4A", breaks on kindergarten or multi-digit grades like 10).
  - No rollback: If Prisma fails during `createStudent`, Clerk user remains permanently provisioned.
  - Attendance rate calculation in `StudentAttendanceCard.tsx` divides by total days; if 0 days exist, renders `NaN%`.

### 2.2 Teacher Management Module
- **Current Routes**: `/list/teachers`, `/list/teachers/[id]`
- **Capabilities**:
  - Displays paginated table of teachers with subject and class badges.
  - Single teacher page displays profile, attendance KPI, shortcuts, and schedule calendar.
  - Server Actions handle Clerk and DB synchronization.
- **Flaws & Limitations**:
  - Teacher attendance is hardcoded to "90%" on single teacher page.
  - Teacher performance pie chart (`Performance.tsx`) displays hardcoded "9.2 of 10 max LTS".
  - Attempting to update a teacher's password triggers a Prisma runtime crash because `password` does not exist on the Prisma `Teacher` model.

### 2.3 Academic Scheduling & Timetable Module
- **Current Routes**: `/list/lessons`, `/list/classes`, `/list/subjects`
- **Capabilities**:
  - Lesson list displays subject, class, and assigned teacher.
  - `BigCalendarContainer.tsx` pulls lessons and formats them for the current week using `adjustScheduleToCurrentWeek()`.
- **Flaws & Limitations**:
  - [src/lib/utils.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/utils.ts) mutates `new Date()` in-place when calculating current week dates.
  - `BigCalender.tsx` hardcodes calendar min and max hours for year 2025 (`new Date(2025, 1, 0, 8, 0, 0)`).
  - Saturday is omitted from the `Day` enum, incompatible with typical Indian school schedules.
