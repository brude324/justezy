# Step 2B — Master Screen Specifications Index & Verification Report

## 1. Executive Summary & Verification

**Status**: STEP 2B COMPLETE — SCREEN SPECIFICATIONS COMPLETE  
**Specification Quality Standard**: 40 Architectural Attributes Documented per Screen  
**Total Target V1 Screens Specified**: 38 Screens  
**Total Specification Documents**: 16 Domain Modules + 2 Universal Behavioral Contracts  

This document serves as the master verification ledger and technical index for all detailed screen functional specifications generated in Step 2B of the SchoolyardSMS transformation. Every specification adheres strictly to the architectural constraints, non-negotiable security invariants, and database multi-tenancy requirements established in `AGENTS.md` and `docs/architecture/`.

---

## 2. Universal Contracts Suite

| Document Name | File Path | Focus & Purpose | Status |
| :--- | :--- | :--- | :---: |
| **Universal Screen State Contract** | [`docs/screens/09-screen-state-contract.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/09-screen-state-contract.md) | Standardized UX & security states: Loading (skeleton/CLS < 0.05), Success, Absolute vs Filtered Empty, Partial Data degradation, HTTP 401 Unauthenticated, HTTP 403 Forbidden, HTTP 402 Module Disabled, HTTP 404 Cross-Tenant Isolation, Network Failure / Offline, and 8 standard Form states. | **COMPLETE** |
| **Universal Screen Action Contract** | [`docs/screens/10-screen-action-contract.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/10-screen-action-contract.md) | Standardized mutation lifecycles: Create, Update (optimistic concurrency), Delete (soft-delete policy & anti-defect routing), Publish (broadcast reach), Approve (four-eyes principle), Export (PII masking), typed ActionResult schema, and audit logging. | **COMPLETE** |

---

## 3. Master V1 Screen Specification Index

The table below indexes all 38 target V1 screens, linking directly to their exhaustive 40-point specifications under `docs/screens/specs/`:

| Screen ID | Screen Name | Logical Route | Owning Module | Required Permission | Required Entitlement | Specification Document | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **PUB-01** | Public Platform Landing | `/public` | Public & Marketing | Public | None | [`01-public-marketing-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/01-public-marketing-specs.md) | COMPLETE |
| **PUB-02** | Pricing & Plans Matrix | `/public/pricing` | Public & Marketing | Public | None | [`01-public-marketing-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/01-public-marketing-specs.md) | COMPLETE |
| **PUB-03** | Portal Finder | `/public/find-school` | Public & Marketing | Public | None | [`01-public-marketing-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/01-public-marketing-specs.md) | COMPLETE |
| **AUT-01** | Unified Sign-In Portal | `/auth/sign-in` | Authentication & Identity | Public | None | [`02-authentication-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/02-authentication-specs.md) | COMPLETE |
| **AUT-02** | Invitation Onboarding | `/auth/accept-invite`| Authentication & Identity | Token Verified | None | [`02-authentication-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/02-authentication-specs.md) | COMPLETE |
| **AUT-03** | MFA Verification | `/auth/mfa` | Authentication & Identity | Session Verified | None | [`02-authentication-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/02-authentication-specs.md) | COMPLETE |
| **AUT-04** | Password Reset Portal | `/auth/reset-password`| Authentication & Identity | Public | None | [`02-authentication-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/02-authentication-specs.md) | COMPLETE |
| **PLT-01** | SaaS Executive Overview| `/platform/dashboard`| Platform Control Plane | `platform.dashboard.read`| `platform_core` | [`03-platform-control-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/03-platform-control-specs.md) | COMPLETE |
| **PLT-02** | Tenant Directory | `/platform/tenants` | Platform Control Plane | `tenant.manage` | `platform_core` | [`03-platform-control-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/03-platform-control-specs.md) | COMPLETE |
| **PLT-03** | Tenant Provisioning | `/platform/tenants/new`| Platform Control Plane | `tenant.create` | `platform_core` | [`03-platform-control-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/03-platform-control-specs.md) | COMPLETE |
| **PLT-04** | Tenant Governance | `/platform/tenants/[id]`| Platform Control Plane | `tenant.manage` | `platform_core` | [`03-platform-control-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/03-platform-control-specs.md) | COMPLETE |
| **PLT-05** | Plan & Entitlements | `/platform/plans` | Platform Control Plane | `platform.plans.manage` | `platform_core` | [`03-platform-control-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/03-platform-control-specs.md) | COMPLETE |
| **PLT-06** | Platform User Directory| `/platform/users` | Platform Control Plane | `platform.users.read` | `platform_core` | [`03-platform-control-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/03-platform-control-specs.md) | COMPLETE |
| **PLT-07** | Platform Security Logs | `/platform/audit-logs`| Platform Control Plane | `platform.audit.read` | `platform_core` | [`03-platform-control-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/03-platform-control-specs.md) | COMPLETE |
| **TNT-DSH-01**| School Admin Dashboard | `/tenant/dashboard` | Institutional Core | `dashboard.admin.read` | `core_academics` | [`04-dashboards-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/04-dashboards-specs.md) | COMPLETE |
| **TNT-DSH-02**| Teacher Dashboard | `/tenant/dashboard` | Staff Experience | `dashboard.teacher.read`| `core_academics` | [`04-dashboards-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/04-dashboards-specs.md) | COMPLETE |
| **TNT-DSH-03**| Student Dashboard | `/tenant/dashboard` | Student Experience | `dashboard.student.read`| `core_academics` | [`04-dashboards-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/04-dashboards-specs.md) | COMPLETE |
| **TNT-DSH-04**| Parent Family Dashboard| `/tenant/dashboard` | Parent Experience | `dashboard.parent.read` | `core_academics` | [`04-dashboards-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/04-dashboards-specs.md) | COMPLETE |
| **TNT-STF-01**| Faculty Directory | `/tenant/teachers` | Staff Management | `teacher.profile.read` | `staff_directory` | [`05-staff-management-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/05-staff-management-specs.md) | COMPLETE |
| **TNT-STF-02**| Staff Profile Detail | `/tenant/teachers/[id]`| Staff Management | `teacher.profile.read` | `staff_directory` | [`05-staff-management-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/05-staff-management-specs.md) | COMPLETE |
| **TNT-STU-01**| Student Directory | `/tenant/students` | Student Management | `student.profile.read` | `student_directory` | [`06-student-management-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/06-student-management-specs.md) | COMPLETE |
| **TNT-STU-02**| Student 360 Profile | `/tenant/students/[id]`| Student Management | `student.profile.read` | `student_directory` | [`06-student-management-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/06-student-management-specs.md) | COMPLETE |
| **TNT-PAR-01**| Parent Directory | `/tenant/parents` | Parent Management | `parent.read` | `parent_directory` | [`07-parent-management-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/07-parent-management-specs.md) | COMPLETE |
| **TNT-ACD-01**| Academic Terms Manager | `/tenant/academic-years`| Academic Structure | `academic.year.manage` | `core_academics` | [`08-academic-structure-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/08-academic-structure-specs.md) | COMPLETE |
| **TNT-CLS-01**| Classes & Sections | `/tenant/classes` | Academic Structure | `class.read` | `core_academics` | [`08-academic-structure-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/08-academic-structure-specs.md) | COMPLETE |
| **TNT-SUB-01**| Subject Catalog | `/tenant/subjects` | Academic Structure | `subject.read` | `core_academics` | [`08-academic-structure-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/08-academic-structure-specs.md) | COMPLETE |
| **TNT-TBL-01**| Master Timetable Grid | `/tenant/timetable` | Timetable & Scheduling | `timetable.manage` | `timetable_module` | [`09-timetable-scheduling-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/09-timetable-scheduling-specs.md) | COMPLETE |
| **TNT-TBL-02**| Weekly Timetable View | `/tenant/timetable/view`| Timetable & Scheduling | `timetable.read` | `timetable_module` | [`09-timetable-scheduling-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/09-timetable-scheduling-specs.md) | COMPLETE |
| **TNT-ATT-01**| Daily Attendance | `/tenant/attendance` | Attendance Management | `attendance.mark` | `attendance_module` | [`10-attendance-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/10-attendance-specs.md) | COMPLETE |
| **TNT-ATT-02**| Attendance Analytics | `/tenant/attendance/reports`| Attendance Management | `attendance.read` | `attendance_module` | [`10-attendance-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/10-attendance-specs.md) | COMPLETE |
| **TNT-EXM-01**| Exam Schedules | `/tenant/exams` | Examination & Evaluation| `exam.read` | `exam_module` | [`11-examinations-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/11-examinations-specs.md) | COMPLETE |
| **TNT-EXM-02**| Exam Setup Wizard | `/tenant/exams/new` | Examination & Evaluation| `exam.create` | `exam_module` | [`11-examinations-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/11-examinations-specs.md) | COMPLETE |
| **TNT-ASN-01**| Assignments Hub | `/tenant/assignments` | Assignments & Learning | `assignment.read` | `assignment_module` | [`12-assignments-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/12-assignments-specs.md) | COMPLETE |
| **TNT-ASN-02**| Assignment Authoring | `/tenant/assignments/new`| Assignments & Learning | `assignment.create` | `assignment_module` | [`12-assignments-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/12-assignments-specs.md) | COMPLETE |
| **TNT-MRK-01**| Marks Entry Grid | `/tenant/results` | Examination & Evaluation| `result.enter` | `exam_module` | [`13-marks-results-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/13-marks-results-specs.md) | COMPLETE |
| **TNT-MRK-02**| Term Report Cards | `/tenant/report-cards` | Examination & Evaluation| `report_card.read` | `report_card_module` | [`13-marks-results-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/13-marks-results-specs.md) | COMPLETE |
| **TNT-ANN-01**| Announcements Hub | `/tenant/announcements`| Communications | `announcement.read` | `communication_module` | [`14-communications-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/14-communications-specs.md) | COMPLETE |
| **TNT-EVT-01**| School Calendar | `/tenant/events` | Communications | `event.read` | `communication_module` | [`14-communications-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/14-communications-specs.md) | COMPLETE |
| **TNT-NOT-01**| Notification Center | `/tenant/notifications`| Communications | Authenticated | `core_academics` | [`14-communications-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/14-communications-specs.md) | COMPLETE |
| **TNT-SET-01**| Institution Settings | `/tenant/settings` | Institution Governance | `tenant.settings.manage`| `core_academics` | [`15-institution-settings-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/15-institution-settings-specs.md) | COMPLETE |
| **ACC-01** | User Profile | `/account/profile` | Universal Account | Authenticated | None | [`16-universal-account-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/16-universal-account-specs.md) | COMPLETE |
| **ACC-02** | Security & Credentials | `/account/security` | Universal Account | Authenticated | None | [`16-universal-account-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/16-universal-account-specs.md) | COMPLETE |
| **ACC-03** | Notification Settings | `/account/notifications`| Universal Account | Authenticated | None | [`16-universal-account-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/16-universal-account-specs.md) | COMPLETE |
| **ACC-04** | Multi-Tenant Switcher | `/account/switch-school`| Universal Account | Multi-Tenant Member | None | [`16-universal-account-specs.md`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docs/screens/specs/16-universal-account-specs.md) | COMPLETE |

---

## 4. Verification Check Against Project Constraints

| Constraint | Validation Status | Verification Proof |
| :--- | :---: | :--- |
| **Documentation Only** | **PASSED** | No edits made to `src/`, `prisma/schema.prisma`, `package.json`, or config files. |
| **40 Attributes Documented** | **PASSED** | Every single screen from Screen 1 (`PUB-01`) through Screen 44 (`ACC-04`) explicitly defines all 40 required attributes. |
| **Multi-Tenancy Scoping** | **PASSED** | All tenant-facing screens mandate verified server-side `tenantId` and enforce `AccessScope` boundaries (`INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN`). |
| **Dual-Gate Security** | **PASSED** | Every screen contract explicitly distinguishes HTTP 402 Module Disabled from HTTP 403 Forbidden. |
| **PWA & Mobile First** | **PASSED** | Critical mobile workflows (`TNT-ATT-01`, `TNT-TBL-02`, `TNT-DSH-04`, `TNT-NOT-01`) specify one-thumb navigation, haptics, and offline candidacy. |
| **Audit Logging Invariants** | **PASSED** | All sensitive mutations specify structured `AuditLog` capture in compliance with `AGENTS.md`. |

---

```
STEP 2B STATUS: SCREEN SPECIFICATIONS COMPLETE
```
