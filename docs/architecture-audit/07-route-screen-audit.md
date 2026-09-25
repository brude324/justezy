# Section G: Screens & Routes Audit

## 1. Complete Route Inventory

Across the application, exactly **18 physical `page.tsx` files** exist in `src/app`. During Next.js production build, exactly **19 routes** are compiled (the 18 application routes plus the internal `/_not-found` route).

| Route Path | Type | Role Requirement (Middleware) | Backend Dependencies | Rendering Mode | Purpose & Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `[[...sign-in]]` | Client / Auth | Public | Clerk `@clerk/elements` | Dynamic (SSR) | Custom login page. Authenticates user and redirects to `/${role}`. |
| `/admin` | Server / Dashboard | `admin` | `prisma.admin`, `teacher`, `student`, `parent`, `attendance`, `event`, `announcement` | Dynamic (RSC) | Administrative KPI dashboard with summary counts and charts. |
| `/teacher` | Server / Dashboard | `teacher` | `prisma.lesson`, `announcement` | Dynamic (RSC) | Teacher personal schedule and announcements. |
| `/student` | Server / Dashboard | `student` | `prisma.class`, `lesson`, `announcement`, `event` | Dynamic (RSC) | Student personal class timetable and school announcements. |
| `/parent` | Server / Dashboard | `parent` | `prisma.student`, `class`, `lesson`, `announcement` | Dynamic (RSC) | Parent dashboard showing schedules for enrolled children. |
| `/list/teachers` | Server / List | `admin`, `teacher` | `prisma.teacher`, `subject`, `class` | Dynamic (RSC) | Paginated directory of teachers with search and filters. |
| `/list/teachers/[id]` | Server / Detail | `admin`, `teacher` (via `/list/teachers`) | `prisma.teacher`, `lesson`, `subject`, `class` | Dynamic (RSC) | Profile view of an individual teacher with timetable. |
| `/list/students` | Server / List | `admin`, `teacher` | `prisma.student`, `class` | Dynamic (RSC) | Paginated directory of students with search and filters. |
| `/list/students/[id]` | Server / Detail | `admin`, `teacher` (via `/list/students`) | `prisma.student`, `class`, `lesson`, `attendance` | Dynamic (RSC) | Profile view of an individual student with timetable. |
| `/list/parents` | Server / List | `admin`, `teacher` | `prisma.parent`, `student` | Dynamic (RSC) | Paginated directory of parents and guardian phone contacts. |
| `/list/subjects` | Server / List | `admin` | `prisma.subject`, `teacher` | Dynamic (RSC) | Directory of institutional academic subjects. |
| `/list/classes` | Server / List | `admin`, `teacher` | `prisma.class`, `teacher`, `grade` | Dynamic (RSC) | Directory of classes, sections, and supervisor teachers. |
| `/list/lessons` | Server / List | `admin`, `teacher` (implicit) | `prisma.lesson`, `subject`, `class`, `teacher` | Dynamic (RSC) | Timetable periods mapped to subjects and instructors. |
| `/list/exams` | Server / List | `admin`, `teacher`, `student`, `parent` | `prisma.exam`, `lesson`, `subject`, `teacher`, `class` | Dynamic (RSC) | Scheduled examinations filtered by caller's role. |
| `/list/assignments` | Server / List | `admin`, `teacher`, `student`, `parent` | `prisma.assignment`, `lesson`, `subject`, `teacher`, `class` | Dynamic (RSC) | Homework and course assignments list. |
| `/list/results` | Server / List | `admin`, `teacher`, `student`, `parent` | `prisma.result`, `exam`, `assignment`, `student` | Dynamic (RSC) | Test scores and marks recorded across assessments. |
| `/list/events` | Server / List | `admin`, `teacher`, `student`, `parent` | `prisma.event`, `class` | Dynamic (RSC) | Calendar events, school assemblies, and holidays. |
| `/list/announcements`| Server / List | `admin`, `teacher`, `student`, `parent` | `prisma.announcement`, `class` | Dynamic (RSC) | Administrative bulletins and notifications. |

---

## 2. Broken, Ghost & Dead-End Links

The following routes are linked in navigation ([src/components/Menu.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/Menu.tsx) and [src/components/Navbar.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/Navbar.tsx)), but **DO NOT EXIST** in the filesystem:

1. **`/` (Root Home Page)**:
   - There is no `src/app/page.tsx`. Navigating to `http://localhost:3000/` results in a **404 Not Found**.
2. **`/list/attendance`**:
   - Menu item links to `/list/attendance`. No directory or file exists. Results in **404 Not Found**.
3. **`/list/messages`**:
   - Menu item links to `/list/messages`. No directory or file exists. Results in **404 Not Found**.
4. **`/profile`**:
   - Menu item links to `/profile`. No directory or file exists. Results in **404 Not Found**.
5. **`/settings`**:
   - Menu item links to `/settings`. No directory or file exists. Results in **404 Not Found**.
6. **`/logout`**:
   - Menu item links to `/logout`. No route exists (Clerk logout is only available via the `<UserButton />` popover). Results in **404 Not Found**.

---

## 3. Structural Count Reconciliation

To prevent confusion during migration planning, these distinct architectural dimensions are reconciled with explicit definitions:

- **Functioning business modules**: Logical modules with implemented data-backed functionality somewhere in the current application (even if embedded in other pages or dashboards).
- **Complete application routes**: Dedicated user-facing routes/pages (`page.tsx`) providing primary screen interfaces.

| Metric Dimension | Verified Count | Exact Breakdown & Architectural Definition |
| :--- | :---: | :--- |
| **Physical `page.tsx` Files** | **18** | Exactly 18 physical `page.tsx` files located within `src/app/` (1 sign-in, 4 dashboards, 11 list pages, 2 detail pages). |
| **Next.js Compiled Routes** | **19** | 18 application routes + 1 internal `/_not-found` route generated during build. |
| **Menu Items in Navigation** | **17** | Defined in `src/components/Menu.tsx`: 14 items under "MENU" + 3 items under "OTHER". |
| **Complete List Routes** | **11** | Dedicated list screens: `/list/teachers`, `/list/students`, `/list/parents`, `/list/subjects`, `/list/classes`, `/list/lessons`, `/list/exams`, `/list/assignments`, `/list/results`, `/list/events`, `/list/announcements`. (Note: `/list/attendance` is missing). |
| **Functioning Business Modules** | **10+** | Logical domains with implemented data-backed functionality: Teachers, Students, Parents, Subjects, Classes, Lessons, Exams, Assignments, Results, Events/Announcements, and **Attendance** (implemented via `Attendance` model, `AttendanceChartContainer`, and `StudentAttendanceCard`, though lacking a dedicated `/list/attendance` route and CRUD page). |
| **Missing / Mock Modules** | **4** | Messaging (no model or route), Finance (static mock UI only), Profile & Settings (dead links), and dedicated Attendance list/CRUD page (route missing). |
| **Prisma Schema Models** | **14** | `Admin`, `Student`, `Teacher`, `Parent`, `Grade`, `Class`, `Subject`, `Lesson`, `Exam`, `Assignment`, `Result`, `Attendance`, `Event`, `Announcement` (+ 2 Enums: `UserSex`, `Day`). |

---

## 4. Route Parameter Handling & Vulnerabilities

1. **Unhandled Array Access in `src/app/(dashboard)/student/page.tsx`**:
   ```typescript
   const classItem = await prisma.class.findMany({
     where: { students: { some: { id: userId! } } },
   });
   // ...
   <BigCalendarContainer type="classId" id={classItem[0].id} />
   ```
   If a newly created student is not yet assigned to a class, `classItem` is empty `[]`. Accessing `classItem[0].id` crashes the server rendering process with an unhandled `TypeError: Cannot read properties of undefined (reading 'id')`.

2. **Null Dereference in `src/app/(dashboard)/list/classes/page.tsx`**:
   ```typescript
   <td className="hidden md:table-cell">
     {item.supervisor.name + " " + item.supervisor.surname}
   </td>
   ```
   In the Prisma schema, `Class.supervisorId` is optional (`String?`). If a class does not have an assigned supervisor teacher, `item.supervisor` is `null`, throwing an unhandled `TypeError` on page render.

3. **Duplicated Name Bug in `src/app/(dashboard)/list/results/page.tsx`**:
   ```typescript
   <td>{item.studentName + " " + item.studentName}</td>
   ```
   Prints the student's first name twice (e.g., "Aarav Aarav") instead of `studentName + " " + studentSurname`.
