# Application Information Architecture (IA)

## 1. Executive Summary & Purpose

**Status**: TARGET / PROPOSED

This document establishes the comprehensive **Information Architecture (IA)** for the transformed multi-tenant SaaS platform. 

The existing prototype repository operates with a flat, single-school structure: 18 physical `page.tsx` files, no platform control plane, no tenant boundaries in URL hierarchies, and role dashboards tightly coupled to hardcoded Clerk metadata.

The target IA structures the application into **ten conceptual domains**, providing a clean, scalable taxonomy that separates the global SaaS control plane from isolated institutional tenant workspaces, while enabling persona-tailored navigation powered by dynamic permissions and module entitlements.

---

## 2. The Ten Conceptual Application Domains

```
                                [ Platform Root ]
                                        |
         +------------------------------+------------------------------+
         |                                                             |
[ 1. Public & Marketing ]                                    [ 2. Authentication ]
- Landing page, features, pricing                            - Sign-in, SSO, MFA, invite acceptance
         |                                                             |
         +------------------------------+------------------------------+
                                        |
                                        v
                            [ Authenticated Boundary ]
                                        |
     +----------------------------------+----------------------------------+
     |                                                                     |
[ 3. Platform SaaS Control Plane ]                           [ 4. Tenant Workspaces ]
- Multi-tenant governance                                    - Institutional operations
- Subscription & plan management                             - Context: Active Tenant ID
- Global platform audit logs                                 - Partitioned data domains
     |                                                                     |
     +-----------------+                                                   |
                       v                                                   |
         [ 10. Account & Preferences ] <-----------------------------------+
         - Identity, Security, Active Switcher                             |
                                                                           |
         +-----------------------------------------------------------------+
         |
         +------------+------------+------------+------------+
         |            |            |            |            |
         v            v            v            v            v
    [ 5. Staff ] [ 6. Students ] [ 7. Parents ] [ 8. Shared ] [ 9. Workflows ]
    Faculty &    Learners &      Guardians &    Timetable,    Exams, Marks,
    Operations   Academics       Wards          Calendar      Attendance
```

### Domain Descriptions:

1. **Public & Marketing**: Unauthenticated public landing pages, institutional discovery, product documentation, and self-service inquiry forms.
2. **Authentication & Identity**: Clerk-hosted and embedded authentication flows, password resets, MFA challenges, and institutional invitation acceptance.
3. **Platform / SaaS Control Plane**: High-privilege administrative space for SaaS operators to onboard institutions, manage subscription plans, toggle feature entitlements, and inspect system telemetry.
4. **Tenant / Institution Administration**: Institutional workspace for Principals, Directors, and School Administrators to configure academic calendars, manage staff, enroll students, and define operational settings.
5. **Staff / Teacher Experience**: Workspace for instructors, department heads, and class supervisors to record attendance, enter examination marks, view timetables, and issue assignments.
6. **Student Experience**: Personalized learner workspace for viewing daily schedules, homework assignments, historical grades, and published notices.
7. **Parent / Guardian Experience**: Family portal enabling multi-child toggling, attendance monitoring, fee payment, report card downloads, and direct school notices.
8. **Shared Institutional Services**: Cross-cutting school services including the master academic timetable, institutional calendar, and announcement bulletin feeds.
9. **Module-Specific Workflows**: Deep transactional workflows including examination result publishing, bulk CSV onboarding, and PDF report compilation.
10. **System & Account Settings**: Universal personal account management, security credentials, active tenant context switcher, and notification preferences.

---

## 3. High-Level Screen Taxonomy & Hierarchy

Every screen in the application belongs to a distinct structural context:

```
[ Namespace: /public ]
├── Public Landing Screen (ID: PUB-01)
├── Pricing & Plan Matrix (ID: PUB-02)
└── Institution Discovery / Portal Finder (ID: PUB-03)

[ Namespace: /auth ]
├── Sign-In Portal (ID: AUT-01)
├── Invitation Acceptance & Onboarding (ID: AUT-02)
├── Multi-Factor Authentication Challenge (ID: AUT-03)
└── Password Recovery & Reset (ID: AUT-04)

[ Namespace: /platform (Scope: PlatformScope.GLOBAL) ]
├── SaaS Executive Overview Dashboard (ID: PLT-01)
├── Tenant Directory & Institution Index (ID: PLT-02)
├── Tenant Provisioning Wizard (ID: PLT-03)
├── Tenant Detail & Subscription Manager (ID: PLT-04)
├── Global Plan & Module Entitlement Catalog (ID: PLT-05)
├── Platform User & Administrator Directory (ID: PLT-06)
└── Platform Audit Trail & Security Logs (ID: PLT-07)

[ Namespace: /tenant (Scope: Active Tenant Context) ]
├── Executive / Role Dashboards
│   ├── Institution Administrator Dashboard (ID: TNT-DSH-01)
│   ├── Teacher / Instructor Dashboard (ID: TNT-DSH-02)
│   ├── Student Learner Dashboard (ID: TNT-DSH-03)
│   └── Parent / Family Dashboard (ID: TNT-DSH-04)
│
├── People Management
│   ├── Faculty & Staff Directory (ID: TNT-STF-01)
│   ├── Staff Profile & Assignment View (ID: TNT-STF-02)
│   ├── Student Enrollment Directory (ID: TNT-STU-01)
│   ├── Student 360 Profile & Academic History (ID: TNT-STU-02)
│   └── Parent & Legal Guardian Directory (ID: TNT-PAR-01)
│
├── Academic Structure & Scheduling
│   ├── Academic Year & Term Management (ID: TNT-ACD-01)
│   ├── Classes & Sections Manager (ID: TNT-CLS-01)
│   ├── Curriculum Subjects & Teacher Allocations (ID: TNT-SUB-01)
│   ├── Master Institutional Timetable (ID: TNT-TBL-01)
│   └── Weekly Class / Teacher Schedule View (ID: TNT-TBL-02)
│
├── Student Operations & Attendance
│   ├── Daily Class Attendance Roll-Call (ID: TNT-ATT-01)
│   ├── Subject / Period Attendance Logging (ID: TNT-ATT-02)
│   └── Student Monthly Attendance Register (ID: TNT-ATT-03)
│
├── Assessments, Examinations & Grading
│   ├── Examination Schedules & Terms (ID: TNT-EXM-01)
│   ├── Homework & Assignment Directory (ID: TNT-ASN-01)
│   ├── Tabular Marks Entry & Verification Grid (ID: TNT-MRK-01)
│   ├── Assessment Results & Class Gradebook (ID: TNT-RES-01)
│   └── Student Consolidated Report Card (ID: TNT-RPT-01)
│
├── Institutional Communications
│   ├── School Announcements & Bulletins (ID: TNT-COM-01)
│   ├── Institutional Events & Calendar Feeds (ID: TNT-COM-02)
│   └── In-App Notification Center (ID: TNT-NOT-01)
│
└── Institutional Governance & Settings
    ├── Institution Profile & Branding Settings (ID: TNT-SET-01)
    ├── Role & Permission Management (ID: TNT-SET-02)
    └── Institutional Audit Log Trail (ID: TNT-AUD-01)

[ Namespace: /account (Scope: Authenticated User) ]
├── Personal Profile & Contact Information (ID: ACC-01)
├── Security Credentials & Active Sessions (ID: ACC-02)
├── Notification & Channel Preferences (ID: ACC-03)
└── Active Tenant Context Switcher (ID: ACC-04)
```

---

## 4. Architectural Separation Principles

1. **Platform Administration vs. Tenant Workspace**:
   - The SaaS control plane (`/platform`) is completely isolated from institutional tenant workspaces (`/tenant`).
   - Platform super-administrators have cross-tenant management access, but institutional staff can never view, navigate to, or query the `/platform` namespace.
2. **Unified Route Family with Persona-Aware Projection**:
   - Rather than creating duplicate URLs for every role (e.g. `/teacher/students`, `/admin/students`, `/parent/students`), the platform establishes unified domain routes (e.g. `/tenant/students/[id]`).
   - The screen projection adapts dynamically based on evaluated `AccessScope` (Teachers see academic notes, parents see linked children, administrators see administrative controls).
3. **Strict Context Enforcement**:
   - Every `/tenant/*` screen requires a verified server-side tenant context (`tenantId`). If a user attempts to access `/tenant/*` without an active, verified institutional membership, the application redirects to the Tenant Context Switcher (`/account/switch-tenant`) or returns `403 Forbidden`.
