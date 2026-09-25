# Permission-to-Screen Mapping & Action Operations

## 1. Conceptual Permission Contract

**Status**: TARGET / PROPOSED

In accordance with Step 1 architecture, access to any screen and execution of any action requires evaluating atomic permission strings structured as: `[domain].[entity].[action]`.

### Standardized Action Operations:
- **`read`**: View directory lists, single entity details, or aggregated summary metrics.
- **`create`**: Open create dialogs and submit new entity records.
- **`update`**: Edit existing entity details, change metadata, or reassign mappings.
- **`delete`**: Trigger entity removal or archival dialogs.
- **`publish`**: Officially lock and release draft entities (e.g. exam timetables, assessment marks) to students and parents.
- **`approve`**: Formally authorize sensitive workflows (e.g. marks overrides, fee waivers).
- **`export`**: Download tabular data extracts as CSV, Excel, or PDF.
- **`manage`**: Full administrative governance across an entire operational domain.

---

## 2. Comprehensive Permission-to-Screen Mapping Matrix

| Screen ID | Screen Name | Required Permission | Required Access Scope | Permitted Screen Operations | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **PLT-01** | Platform Dashboard | `platform.dashboard.read` | `PlatformScope.GLOBAL` | View global telemetry, active tenants, revenue charts. | TARGET |
| **PLT-02** | Tenant Directory | `tenant.manage` | `PlatformScope.GLOBAL` | Search, filter, export tenant list, toggle status. | TARGET |
| **PLT-03** | Tenant Provision Wizard | `tenant.create` | `PlatformScope.GLOBAL` | Create tenant, assign initial admin, configure domain. | TARGET |
| **PLT-04** | Tenant Console | `tenant.manage` | `PlatformScope.GLOBAL` | Edit school settings, adjust plans, suspend tenant. | TARGET |
| **PLT-05** | Plan Manager | `platform.plans.manage` | `PlatformScope.GLOBAL` | Create plans, toggle module entitlement bundles. | TARGET |
| **PLT-06** | Platform User Directory | `platform.users.read` | `PlatformScope.GLOBAL` | Lookup global users, inspect active sessions. | TARGET |
| **PLT-07** | Platform Security Logs | `platform.audit.read` | `PlatformScope.GLOBAL` | Filter security events, inspect failed logins. | TARGET |
| **TNT-DSH-01**| Institution Dashboard | `dashboard.admin.read` | `TenantScope.INSTITUTION_WIDE` | View live KPI cards, attendance bars, quick shortcuts. | TARGET |
| **TNT-DSH-02**| Teacher Dashboard | `dashboard.teacher.read` | `TenantScope.ASSIGNED_ONLY` | View today's schedule, assigned classes, quick marks. | TARGET |
| **TNT-DSH-03**| Student Dashboard | `dashboard.student.read` | `TenantScope.SELF_ONLY` | View timetable, upcoming exams, active assignments. | TARGET |
| **TNT-DSH-04**| Parent Dashboard | `dashboard.parent.read` | `TenantScope.LINKED_CHILDREN` | Toggle child switcher, view attendance rate, circulars. | TARGET |
| **TNT-STF-01**| Faculty Directory | `teacher.profile.read` | `TenantScope.INSTITUTION_WIDE` | View staff cards, search by name, filter by department. | TARGET |
| **TNT-STF-02**| Staff Profile Detail | `teacher.profile.read` | `TenantScope.ASSIGNED_ONLY` / `SELF` | View staff metadata, assigned classes, weekly schedule. | TARGET |
| **TNT-STU-01**| Student Directory | `student.profile.read` | `TenantScope.INSTITUTION_WIDE` | Search students, filter by class/teacher, export CSV. | TARGET |
| **TNT-STU-02**| Student 360 Profile | `student.profile.read` | `ASSIGNED_ONLY` / `LINKED` / `SELF` | View attendance rate, term marks, parent contact info. | TARGET |
| **TNT-PAR-01**| Parent Directory | `parent.read` | `TenantScope.INSTITUTION_WIDE` | View parent list, linked children count, contact phone. | TARGET |
| **TNT-ACD-01**| Academic Terms | `academic.year.manage` | `TenantScope.INSTITUTION_WIDE` | Create academic year, set active term, lock history. | TARGET |
| **TNT-CLS-01**| Classes & Sections | `class.read` | `TenantScope.INSTITUTION_WIDE` | View section capacities, supervisors, enrolled rosters. | TARGET |
| **TNT-SUB-01**| Curriculum Subjects | `subject.read` | `TenantScope.INSTITUTION_WIDE` | View subject list, assign certified teachers. | TARGET |
| **TNT-TBL-01**| Master Timetable Grid | `timetable.read` | `TenantScope.INSTITUTION_WIDE` | Construct period grids, resolve teacher collisions. | TARGET |
| **TNT-TBL-02**| Weekly Schedule Calendar| `timetable.read` | `ASSIGNED_ONLY` / `LINKED` / `SELF` | View weekly timetable, period rooms, teacher names. | TARGET |
| **TNT-ATT-01**| Daily Attendance Sheet | `attendance.mark` | `TenantScope.ASSIGNED_ONLY` | Toggle student present/absent, submit morning roll-call. | TARGET |
| **TNT-EXM-01**| Examination Schedules | `exam.read` | `TenantScope.INSTITUTION_WIDE` | View exam dates, max marks, passing thresholds. | TARGET |
| **TNT-ASN-01**| Homework & Assignments | `assignment.read` | `ASSIGNED_ONLY` / `LINKED` / `SELF` | Post homework, view submission instructions and dates. | TARGET |
| **TNT-MRK-01**| Marks Entry Grid | `result.write` | `TenantScope.ASSIGNED_ONLY` | Enter tabular exam marks, save draft, submit for review. | TARGET |
| **TNT-RES-01**| Assessment Results | `result.read` | `ASSIGNED_ONLY` / `LINKED` / `SELF` | View class score distribution, subject averages. | TARGET |
| **TNT-RPT-01**| Student Report Card | `report.read` | `ASSIGNED_ONLY` / `LINKED` / `SELF` | View consolidated term totals, GPA letter, download PDF. | TARGET |
| **TNT-COM-01**| School Announcements | `announcement.read` | `TenantScope.INSTITUTION_WIDE` | View circulars, filter by audience, post new notice. | TARGET |
| **TNT-COM-02**| School Events Calendar | `event.read` | `TenantScope.INSTITUTION_WIDE` | View upcoming events, sports meets, parent conferences. | TARGET |
| **TNT-NOT-01**| Notification Center | `notification.read` | `TenantScope.SELF_ONLY` | Mark notifications as read, view alert history. | TARGET |
| **TNT-SET-01**| Institution Settings | `tenant.settings.write` | `TenantScope.INSTITUTION_WIDE` | Edit school crest, contact details, operational hours. | TARGET |
| **TNT-SET-02**| Role & RBAC Manager | `rbac.role.manage` | `TenantScope.INSTITUTION_WIDE` | Adjust permission assignments per role, create custom roles. | TARGET |
| **TNT-AUD-01**| Institutional Audit Log | `audit.log.read` | `TenantScope.INSTITUTION_WIDE` | Filter mutation logs by actor, export compliance reports. | TARGET |
| **ACC-01** | Personal Profile | `profile.self.manage` | `TenantScope.SELF_ONLY` | Update contact number, upload avatar, view identity. | TARGET |
| **ACC-02** | Security Credentials | `security.self.manage` | `TenantScope.SELF_ONLY` | Reset password, view active session devices. | TARGET |
| **ACC-03** | Preferences | `preferences.self.manage` | `TenantScope.SELF_ONLY` | Toggle SMS, WhatsApp, and Email notification alerts. | TARGET |
| **ACC-04** | Tenant Switcher | Authenticated User | `TenantScope.SELF_ONLY` | Switch active school context for multi-tenant accounts. | TARGET |
