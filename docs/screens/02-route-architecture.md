# Logical Route Architecture & URL Namespace Design

## 1. Abstracted Logical Routing Strategy

**Status**: DECISION (Abstracted Route Architecture); OPEN / TBD (Physical Ingress Routing Mechanism)

Step 0 established that the baseline codebase relies on hardcoded role directories (`/admin`, `/teacher`, `/student`, `/parent`). In Step 1, we determined that client routing must not lock the architecture into a specific physical routing strategy (subdomain vs. path prefix vs. custom domain).

Therefore, this specification defines a **Logical Route Architecture** based on standardized namespaces. The application router will map these logical paths to whichever physical ingress resolution strategy is finalized in Step 1B / Step 3:

```
[ Physical Strategy A: Subdomain ]
https://dps.schoolyard.in/students/std_123  --> Maps to Logical: /tenant/students/std_123

[ Physical Strategy B: Path Prefix ]
https://schoolyard.in/dps/students/std_123  --> Maps to Logical: /tenant/students/std_123

[ Physical Strategy C: Custom Domain ]
https://portal.dpsdelhi.edu.in/students/std_123 --> Maps to Logical: /tenant/students/std_123
```

---

## 2. Standardized Logical Route Namespaces

```
/
├── public/                 # Public marketing, institution discovery & legal
├── auth/                   # Identity verification, SSO, invitations & MFA
├── platform/               # SaaS Control Plane (Platform Super Admin only)
├── tenant/                 # Active Institutional Workspace (Tenant Members only)
└── account/                # Universal User Profile, Security & Tenant Switcher
```

---

## 3. Comprehensive V1 Logical Route Catalog

### 3.1 Public Namespace (`/public`)
| Logical Route | Screen Name | Screen Type | Target Persona | Auth Required? |
| :--- | :--- | :---: | :--- | :---: |
| `/` or `/public` | Public Platform Landing | Landing | Prospective Schools | No |
| `/public/pricing` | Subscription Plans Matrix | Landing | School Leadership | No |
| `/public/find-school`| Institution Portal Finder | Wizard | Parents / Students | No |

### 3.2 Authentication Namespace (`/auth`)
| Logical Route | Screen Name | Screen Type | Target Persona | Auth Required? |
| :--- | :--- | :---: | :--- | :---: |
| `/auth/sign-in` | Unified Login Portal | Authentication | All Users | No (Clerk) |
| `/auth/accept-invite`| Institutional Invite Onboarding | Wizard | New Staff / Students | Yes (Token) |
| `/auth/mfa` | Multi-Factor Challenge | Authentication | Staff / Admin | Yes (Clerk) |
| `/auth/reset-password`| Password Reset Form | Form | All Users | No (Clerk) |

### 3.3 Platform Control Plane Namespace (`/platform`)
*Access Scope: `PlatformScope.GLOBAL` — Restricted to SaaS Super Administrators*

| Logical Route | Screen Name | Screen Type | Primary Function |
| :--- | :--- | :---: | :--- |
| `/platform/dashboard` | SaaS Platform Executive Dashboard | Dashboard | High-level metrics, active tenants, MRR. |
| `/platform/tenants` | Tenant Directory & Search | List | Paginated list of all onboarded schools. |
| `/platform/tenants/new` | Tenant Provisioning Wizard | Wizard | Provision new school, admin, and domain. |
| `/platform/tenants/[tenantId]`| Tenant Management Console | Detail / Settings | Adjust status, view metrics, manage plans. |
| `/platform/plans` | Subscription Plan Manager | List / Edit | Configure tiers and module entitlement bundles. |
| `/platform/users` | Global User Directory | List | Platform-wide user lookup and audit. |
| `/platform/audit-logs`| System Security & Audit Log | List / Report | Cross-tenant security events and breach monitoring. |

### 3.4 Institutional Tenant Namespace (`/tenant`)
*Access Scope: Verified Active Tenant Context (`tenantId`)*

| Logical Route | Screen Name | Screen Type | Primary Permissions Evaluated |
| :--- | :--- | :---: | :--- |
| `/tenant/dashboard` | Role-Projected Dashboard | Dashboard | `dashboard.view` (Adapts to Role & Scope) |
| `/tenant/teachers` | Staff & Faculty Directory | List | `teacher.profile.read` |
| `/tenant/teachers/[id]` | Staff 360 Profile & Schedule | Detail | `teacher.profile.read` |
| `/tenant/students` | Student Enrollment Directory | List | `student.profile.read` |
| `/tenant/students/[id]` | Student 360 Academic Profile | Detail | `student.profile.read` (Scoped) |
| `/tenant/parents` | Parent & Guardian Directory | List | `parent.read` |
| `/tenant/academic-years` | Academic Year & Terms | List / Settings | `academic.year.manage` |
| `/tenant/classes` | Classes & Sections Directory | List | `class.read` |
| `/tenant/subjects` | Curriculum Subjects & Allocations | List | `subject.read` |
| `/tenant/timetable` | Master Timetable & Schedule Grid | Calendar | `timetable.read` |
| `/tenant/attendance` | Daily Class Attendance Roll-Call | Workflow / List | `attendance.read`, `attendance.mark` |
| `/tenant/exams` | Examination Schedules & Terms | List | `exam.read` |
| `/tenant/assignments` | Homework & Assignments Directory | List | `assignment.read` |
| `/tenant/results` | Assessment Results & Class Marks | List / Report | `result.read`, `result.write` |
| `/tenant/report-cards` | Student Report Card Portal | Report / List | `report.read`, `report.generate` |
| `/tenant/announcements` | Institutional Bulletins & Circulars | List | `announcement.read` |
| `/tenant/events` | School Calendar & Events | Calendar / List | `event.read` |
| `/tenant/notifications` | In-App Notification Center | List | Authenticated User |
| `/tenant/settings` | Institution Profile & Branding | Settings | `tenant.settings.write` |
| `/tenant/roles` | RBAC Role & Permission Manager | List / Edit | `rbac.role.manage` |
| `/tenant/audit-logs` | Institutional Audit Trail | List / Report | `audit.log.read` |

### 3.5 User Account & Context Namespace (`/account`)
| Logical Route | Screen Name | Screen Type | Purpose |
| :--- | :--- | :---: | :--- |
| `/account/profile` | Personal Profile & Identity | Detail / Form | Update name, contact phone, avatar. |
| `/account/security` | Security, Sessions & MFA | Settings | Manage active devices, rotate passwords. |
| `/account/preferences` | Notification Preferences | Settings | Toggle SMS/Email/WhatsApp alerts. |
| `/account/switch-tenant`| Institutional Context Switcher | List / Action | Select active school for multi-tenant users. |

---

## 4. Future Roadmap Route Placeholders (V2 & V3)

To prevent route collisions during subsequent engineering horizons, the following route namespaces are formally reserved:

### 4.1 Reserved V2 Route Families (`FUTURE / V2`)
- `/tenant/admissions/*` — Online student inquiry pipeline, applicant reviews, and enrollment wizard.
- `/tenant/fees/*` — Fee structures, student billing ledgers, online payment receipts, and defaulter tracking.
- `/tenant/promotions/*` — End-of-year batch student promotion wizard and section rollovers.
- `/tenant/transfers/*` — Student exit clearance and Transfer Certificate (TC) document issuance.
- `/tenant/library/*` — ISBN cataloging, book issuance, return scanning, and late fee tracking.
- `/tenant/transport/*` — Bus route definitions, fleet rosters, stop assignments, and driver directories.
- `/tenant/staff-hr/*` — Faculty leave applications, absence tracking, and substitute teacher allocation.

### 4.2 Reserved V3 Route Families (`FUTURE / V3`)
- `/tenant/workflows/*` — Visual approval workflow builder and custom multi-tier operational pipelines.
- `/tenant/analytics/*` — Predictive machine learning dashboards, student attrition early-warnings, and BI.
- `/tenant/integrations/*` — Biometric gate turnstile settings, RFID hardware sync, and third-party LMS bridges.
- `/platform/developer/*` — Public REST API keys, developer documentation, and outbound webhook endpoints.
