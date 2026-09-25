# Step 2 Master Screen Index & Ownership Registry

## 1. Overview & Master Registry

**Status**: TARGET / PROPOSED

This document provides the authoritative inventory and architectural ownership specification for every screen in the target SaaS platform. It serves as the primary technical blueprint for Step 3 database design, API service development, and UI implementation.

Total Target V1 Screens: **38 Screens** (7 Platform Control Plane, 4 Authentication/Public, 23 Tenant Workspace, 4 Universal Account).

---

## 2. Master V1 Screen Registry Table

| Screen ID | Screen Name | Owning Module | Logical Route | Primary User | Required Permission | Module Entitlement | Screen Type | Horizon | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **PUB-01** | Public Platform Landing | Public & Marketing | `/public` | Prospective Schools | Public | None | Landing | V1 | TARGET |
| **PUB-02** | Pricing & Plans Matrix | Public & Marketing | `/public/pricing` | School Leadership | Public | None | Landing | V1 | TARGET |
| **PUB-03** | Portal Finder | Public & Marketing | `/public/find-school` | Parents / Students | Public | None | Wizard | V1 | TARGET |
| **AUT-01** | Unified Sign-In Portal | Authentication | `/auth/sign-in` | All Users | Public | None | Authentication | V1 | TARGET |
| **AUT-02** | Invitation Onboarding | Authentication | `/auth/accept-invite` | Invited Staff/Students| Token Verified | None | Wizard | V1 | TARGET |
| **AUT-03** | MFA Verification | Authentication | `/auth/mfa` | Staff / Admin | Session Verified | None | Authentication | V1 | TARGET |
| **AUT-04** | Password Reset Portal | Authentication | `/auth/reset-password` | All Users | Public | None | Form | V1 | TARGET |
| **PLT-01** | SaaS Executive Overview | Platform Control | `/platform/dashboard` | SaaS Super Admin | `platform.dashboard.read` | `platform_core` | Dashboard | V1 | TARGET |
| **PLT-02** | Tenant Directory | Platform Control | `/platform/tenants` | SaaS Super Admin | `tenant.manage` | `platform_core` | List | V1 | TARGET |
| **PLT-03** | Tenant Provisioning | Platform Control | `/platform/tenants/new` | SaaS Super Admin | `tenant.create` | `platform_core` | Wizard | V1 | TARGET |
| **PLT-04** | Tenant Detail & Plans | Platform Control | `/platform/tenants/[id]`| SaaS Super Admin | `tenant.manage` | `platform_core` | Detail / Settings | V1 | TARGET |
| **PLT-05** | Plan & Entitlements | Platform Control | `/platform/plans` | SaaS Super Admin | `platform.plans.manage` | `platform_core` | List / Edit | V1 | TARGET |
| **PLT-06** | Platform User Directory | Platform Control | `/platform/users` | SaaS Super Admin | `platform.users.read` | `platform_core` | List | V1 | TARGET |
| **PLT-07** | Platform Security Logs | Platform Control | `/platform/audit-logs` | SaaS Super Admin | `platform.audit.read` | `platform_core` | List / Report | V1 | TARGET |
| **TNT-DSH-01**| School Admin Dashboard | Institutional Core | `/tenant/dashboard` | Institution Admin | `dashboard.admin.read` | `core_academics` | Dashboard | V1 | TARGET |
| **TNT-DSH-02**| Teacher Dashboard | Staff Experience | `/tenant/dashboard` | Teachers / Faculty | `dashboard.teacher.read` | `core_academics` | Dashboard | V1 | TARGET |
| **TNT-DSH-03**| Student Dashboard | Student Experience | `/tenant/dashboard` | Students | `dashboard.student.read` | `core_academics` | Dashboard | V1 | TARGET |
| **TNT-DSH-04**| Parent Family Dashboard| Parent Experience | `/tenant/dashboard` | Parents / Guardians | `dashboard.parent.read` | `core_academics` | Dashboard | V1 | TARGET |
| **TNT-STF-01**| Faculty Directory | Staff Management | `/tenant/teachers` | Admin, Teachers | `teacher.profile.read` | `staff_directory` | List | V1 | TARGET |
| **TNT-STF-02**| Staff Profile Detail | Staff Management | `/tenant/teachers/[id]`| Admin, Teacher (Self) | `teacher.profile.read` | `staff_directory` | Detail | V1 | TARGET |
| **TNT-STU-01**| Student Directory | Student Management | `/tenant/students` | Admin, Teachers | `student.profile.read` | `student_directory` | List | V1 | TARGET |
| **TNT-STU-02**| Student 360 Profile | Student Management | `/tenant/students/[id]`| Admin, Teacher, Parent | `student.profile.read` | `student_directory` | Detail | V1 | TARGET |
| **TNT-PAR-01**| Parent Directory | Parent Management | `/tenant/parents` | Admin, Staff | `parent.read` | `parent_directory` | List | V1 | TARGET |
| **TNT-ACD-01**| Academic Terms Manager | Academic Structure | `/tenant/academic-years`| Institution Admin | `academic.year.manage` | `core_academics` | List / Settings | V1 | TARGET |
| **TNT-CLS-01**| Classes & Sections | Academic Structure | `/tenant/classes` | Admin, Teachers | `class.read` | `core_academics` | List | V1 | TARGET |
| **TNT-SUB-01**| Curriculum Subjects | Academic Structure | `/tenant/subjects` | Admin, Teachers | `subject.read` | `core_academics` | List | V1 | TARGET |
| **TNT-TBL-01**| Master Timetable Grid | Scheduling Engine | `/tenant/timetable` | Admin, Coordinators | `timetable.read` | `core_academics` | Calendar / Grid | V1 | TARGET |
| **TNT-TBL-02**| Weekly Timetable View | Scheduling Engine | `/tenant/timetable` | Teachers, Students | `timetable.read` | `core_academics` | Calendar | V1 | TARGET |
| **TNT-ATT-01**| Daily Attendance Sheet | Student Attendance | `/tenant/attendance` | Teachers, Admin | `attendance.mark` | `attendance_module`| Workflow / List | V1 | TARGET |
| **TNT-EXM-01**| Examination Schedules | Assessment Engine | `/tenant/exams` | Admin, Teachers | `exam.read` | `examination_module`| List | V1 | TARGET |
| **TNT-ASN-01**| Homework Assignments | Assessment Engine | `/tenant/assignments` | Teachers, Students | `assignment.read` | `examination_module`| List | V1 | TARGET |
| **TNT-MRK-01**| Marks Entry Grid | Assessment Engine | `/tenant/results` | Subject Teachers | `result.write` | `examination_module`| Form / Grid | V1 | TARGET |
| **TNT-RES-01**| Assessment Results | Assessment Engine | `/tenant/results` | Teachers, Parents | `result.read` | `examination_module`| List / Report | V1 | TARGET |
| **TNT-RPT-01**| Student Report Card | Grading & Reporting | `/tenant/report-cards` | Parents, Students | `report.read` | `advanced_reports` | Report / Detail | V1 | TARGET |
| **TNT-COM-01**| Announcements Bulletin | Communications | `/tenant/announcements`| All School Users | `announcement.read` | `communications` | List | V1 | TARGET |
| **TNT-COM-02**| School Events Calendar | Communications | `/tenant/events` | All School Users | `event.read` | `communications` | Calendar / List | V1 | TARGET |
| **TNT-NOT-01**| Notification Center | Communications | `/tenant/notifications` | Authenticated User | Authenticated | `communications` | List | V1 | TARGET |
| **TNT-SET-01**| School Profile Settings| Governance | `/tenant/settings` | Institution Admin | `tenant.settings.write` | `core_academics` | Settings | V1 | TARGET |
| **TNT-SET-02**| Role & RBAC Manager | Governance | `/tenant/roles` | Institution Admin | `rbac.role.manage` | `core_academics` | List / Edit | V1 | TARGET |
| **TNT-AUD-01**| Institutional Audit | Governance & Audit | `/tenant/audit-logs` | Institution Admin | `audit.log.read` | `core_academics` | List / Report | V1 | TARGET |
| **ACC-01** | Personal Profile | User Account | `/account/profile` | Authenticated User | Self | Universal | Detail / Form | V1 | TARGET |
| **ACC-02** | Security & Sessions | User Account | `/account/security` | Authenticated User | Self | Universal | Settings | V1 | TARGET |
| **ACC-03** | Channel Preferences | User Account | `/account/preferences` | Authenticated User | Self | Universal | Settings | V1 | TARGET |
| **ACC-04** | School Switcher | User Account | `/account/switch-tenant`| Multi-Tenant User | Authenticated | Universal | List / Action | V1 | TARGET |

---

## 3. Comprehensive Screen Ownership Specifications (Selected Critical Workflows)

### Screen Specification: TNT-ATT-01 (Daily Class Attendance Roll-Call)
- **Screen ID**: `TNT-ATT-01`
- **Screen Name**: Daily Class Attendance Sheet
- **Module**: Student Attendance (`attendance_module`)
- **Context**: Institutional Tenant Workspace (`/tenant`)
- **Primary Users**: Class Teachers, Subject Teachers, School Administrators
- **Logical Route**: `/tenant/attendance`
- **Screen Type**: Workflow / List
- **Purpose**: Record morning roll-call attendance for class sections with one-tap status toggling.
- **Permission Requirements**: `attendance.mark`
- **Module Entitlement**: `attendance_module` (`OPTIONAL`)
- **Tenant Scope**: `TenantScope.ASSIGNED_ONLY` (Teachers) / `INSTITUTION_WIDE` (Admin)
- **Data Dependencies**: `Class`, `StudentProfile`, `Attendance`, `AcademicYear`
- **Parent Screen**: `/tenant/dashboard`
- **Child Screens**: None (Modal confirmation on submit)
- **Navigation Entry**: Sidebar item "Attendance"
- **Horizon**: `V1`
- **Responsive Class**: `PWA-CRITICAL` / `MOBILE-PRIMARY`
- **Status**: TARGET

### Screen Specification: TNT-MRK-01 (Marks Entry Grid)
- **Screen ID**: `TNT-MRK-01`
- **Screen Name**: Tabular Marks Entry & Verification Grid
- **Module**: Assessment Engine (`examination_module`)
- **Context**: Institutional Tenant Workspace (`/tenant`)
- **Primary Users**: Subject Teachers, Academic Administrators
- **Logical Route**: `/tenant/results` (Edit Mode)
- **Screen Type**: Form / Grid
- **Purpose**: High-density tabular marks entry with validation against maximum scores and draft saving.
- **Permission Requirements**: `result.write`
- **Module Entitlement**: `examination_module` (`OPTIONAL`)
- **Tenant Scope**: `TenantScope.ASSIGNED_ONLY` (Subject Instructor)
- **Data Dependencies**: `Exam`, `Subject`, `Class`, `StudentProfile`, `Result`
- **Parent Screen**: `/tenant/exams`
- **Child Screens**: Marks Verification Preview Dialog
- **Navigation Entry**: Sub-tab under "Exams & Results"
- **Horizon**: `V1`
- **Responsive Class**: `DESKTOP-PRIMARY`
- **Status**: TARGET

### Screen Specification: PLT-03 (Tenant Provisioning Wizard)
- **Screen ID**: `PLT-03`
- **Screen Name**: Tenant Provisioning Wizard
- **Module**: Platform Control Plane (`platform_core`)
- **Context**: SaaS Control Plane (`/platform`)
- **Primary Users**: SaaS Platform Super Admin
- **Logical Route**: `/platform/tenants/new`
- **Screen Type**: Wizard
- **Purpose**: Multi-step onboarding wizard provisioning a new institution, slug, initial admin, and subscription plan.
- **Permission Requirements**: `tenant.create`
- **Module Entitlement**: `platform_core` (`CORE`)
- **Tenant Scope**: `PlatformScope.GLOBAL`
- **Data Dependencies**: `Tenant`, `SubscriptionPlan`, `User`, `TenantMembership`
- **Parent Screen**: `/platform/tenants`
- **Child Screens**: Onboarding Confirmation Dialog
- **Navigation Entry**: Primary action button in Tenant Directory
- **Horizon**: `V1`
- **Responsive Class**: `DESKTOP-PRIMARY`
- **Status**: TARGET
