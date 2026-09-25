# Navigation Architecture & Dynamic Menu System

## 1. Dynamic Navigation Generation Model

**Status**: TARGET / PROPOSED

Step 0 identified that the baseline navigation menu (`Menu.tsx`) is a static component that hardcodes 17 items and relies on unverified `role` strings.

In the target architecture, navigation is **never static** and is **never derived solely from hardcoded role names**. Instead, the navigation engine dynamically computes the visible menu items for the current session based on a 4-tier evaluation pipeline:

```
[ Tier 1: Identity & Authentication ]
  - Is the user authenticated via Clerk?
                  |
                  v
[ Tier 2: Tenant Membership ]
  - What is the user's active institution context?
                  |
                  v
[ Tier 3: Module Entitlements ]
  - Which functional modules are licensed & enabled for this tenant?
                  |
                  v
[ Tier 4: Granular Permissions & Scopes ]
  - Does the user's assigned role possess the required permission?
                  |
                  v
[ Rendered Navigation Tree ]
```

---

## 2. Navigation Contexts & Archetypes

### Context A: Public Navigation
- **Target Audience**: Unauthenticated public visitors, prospective institutions, parents looking for their school portal.
- **Top Navigation Bar**:
  - Logo (`Schoolyard`)
  - Features (`/public#features`)
  - Pricing (`/public/pricing`)
  - Find Your School (`/public/find-school`)
  - Sign In Button (`/auth/sign-in`)

### Context B: Platform Super Admin Navigation
- **Target Audience**: SaaS Platform Operators (`PlatformScope.GLOBAL`).
- **Sidebar Menu**:
  - **Overview**: Dashboard (`/platform/dashboard`)
  - **Institutions**: Tenant Directory (`/platform/tenants`), Provision School (`/platform/tenants/new`)
  - **Commercials**: Plans & Entitlements (`/platform/plans`)
  - **Security**: Global Users (`/platform/users`), Platform Audit Trail (`/platform/audit-logs`)
  - **System**: Platform Settings (`/platform/settings`)

### Context C: Institution Administrator Navigation
- **Target Audience**: Principals, School Directors, Academic Administrators.
- **Sidebar Menu**:
  - **Dashboard**: Institutional Overview (`/tenant/dashboard`)
  - **People**: Faculty & Staff (`/tenant/teachers`), Students (`/tenant/students`), Parents (`/tenant/parents`)
  - **Academics**: Academic Terms (`/tenant/academic-years`), Classes & Sections (`/tenant/classes`), Subjects (`/tenant/subjects`), Master Timetable (`/tenant/timetable`)
  - **Classroom Operations**: Daily Attendance (`/tenant/attendance`)
  - **Assessments**: Examinations (`/tenant/exams`), Results & Marks (`/tenant/results`), Report Cards (`/tenant/report-cards`)
  - **Communication**: Bulletins (`/tenant/announcements`), School Events (`/tenant/events`)
  - **Governance**: Roles & RBAC (`/tenant/roles`), Audit Logs (`/tenant/audit-logs`), School Settings (`/tenant/settings`)

### Context D: Staff / Teacher Navigation
- **Target Audience**: Class Teachers, Subject Instructors, Department Heads.
- **Sidebar Menu**:
  - **My Workspace**: Teacher Dashboard (`/tenant/dashboard`), My Schedule (`/tenant/timetable`)
  - **My Students**: Assigned Classes (`/tenant/classes`), Student Rosters (`/tenant/students`)
  - **Daily Roll-Call**: Take Attendance (`/tenant/attendance`)
  - **Grading & Homework**: Post Homework (`/tenant/assignments`), Enter Exam Marks (`/tenant/results`)
  - **Notices**: School Circulars (`/tenant/announcements`), Calendar (`/tenant/events`)

### Context E: Student Learner Navigation
- **Target Audience**: Enrolled Students (`TenantScope.SELF_ONLY`).
- **Sidebar Menu / Mobile Bottom Bar**:
  - **Home**: Student Dashboard (`/tenant/dashboard`)
  - **My Classes**: Timetable & Periods (`/tenant/timetable`)
  - **Homework**: Active Assignments (`/tenant/assignments`)
  - **My Progress**: Exam Results & Marks (`/tenant/results`), Report Card (`/tenant/report-cards`)
  - **Attendance**: My Attendance Record (`/tenant/attendance`)
  - **Notices**: School Circulars (`/tenant/announcements`)

### Context F: Parent & Guardian Navigation
- **Target Audience**: Parents and Legal Guardians (`TenantScope.LINKED_CHILDREN`).
- **Header Element**: **Active Child Switcher** (Dropdown toggling between enrolled siblings).
- **Sidebar Menu / Mobile Bottom Bar**:
  - **Family Portal**: Parent Dashboard (`/tenant/dashboard`)
  - **Academics**: Child's Timetable (`/tenant/timetable`), Homework Tracker (`/tenant/assignments`)
  - **Safety & Attendance**: Daily Attendance Feed (`/tenant/attendance`)
  - **Assessment**: Term Exam Results (`/tenant/results`), Download Report Card (`/tenant/report-cards`)
  - **School Notices**: Official Circulars (`/tenant/announcements`), Calendar (`/tenant/events`)

---

## 3. Core Navigation Shell Components

```
+-------------------------------------------------------------------------+
|                               TOP NAVBAR                                |
|  [Logo: Schoolyard]  [Active Tenant Badge: DPS Delhi]   [Search]        |
|                      [Child Switcher (Parents)]         [Bell] [Avatar] |
+-------------------------------------------------------------------------+
|     SIDEBAR MENU      |                   MAIN CONTENT                  |
|                       |                                                 |
| - Dashboard           | Breadcrumbs: Home > Students > Rahul Sharma     |
| - People              | +---------------------------------------------+ |
|   • Teachers          | |                                             | |
|   • Students          | |                                             | |
|   • Parents           | |               PAGE CONTENT                  | |
| - Academics           | |                                             | |
|   • Classes           | |                                             | |
|   • Subjects          | +---------------------------------------------+ |
|   • Timetable         |                                                 |
| - Attendance          |                                                 |
| - Exams & Marks       |                                                 |
| - Settings            |                                                 |
+-----------------------+-------------------------------------------------+
|                       MOBILE BOTTOM NAVIGATION                          |
|    [Home]        [Schedule]        [Attendance]        [Notifications]  |
+-------------------------------------------------------------------------+
```

1. **Responsive Dual Navigation**:
   - **Desktop (> 1024px)**: Expandable/collapsible sidebar menu grouped into logical domains, paired with top navbar breadcrumbs.
   - **Mobile (< 768px)**: Fixed bottom navigation bar for the 4-5 highest-frequency tasks (Dashboard, Timetable, Attendance, Notices), complemented by a slide-out hamburger drawer for secondary settings.
2. **Breadcrumb Navigation**:
   - Automatically generated breadcrumbs at the top of every screen (e.g. `Home > Academics > Classes > Grade 10-A > Edit Section`), enabling fast parent-level navigation without browser back buttons.
3. **Contextual Action Bar**:
   - Standardized top-right action cluster on all list screens containing search, filter toggles, export CSV buttons, and the primary create action (e.g. `+ Add Student`).
