# Module Entitlement-to-Screen Mapping

## 1. Architectural Distinction: Dual-Gate Screen Access

**Status**: DECISION

A critical finding from Step 1 is the dual-gate requirement for screen access:

```
                      [ Client Navigation Request ]
                                    |
                                    v
            +-----------------------------------------------+
            |          GATE 1: MODULE ENTITLEMENT           |
            |   Does the active institution's subscription  |
            |   enable this functional module key?          |
            +-----------------------------------------------+
                        |                       |
                     [ NO ]                  [ YES ]
                        |                       |
                        v                       v
               { MODULE DISABLED }     +-----------------------------------------------+
              - Render 402 Upgrade     |              GATE 2: USER RBAC                |
                Screen or Feature Gate |   Does the user's role have permission & scope|
              - "Module not enabled    |   to access this specific screen?             |
                 for this institution" +-----------------------------------------------+
                                                    |                       |
                                                 [ NO ]                  [ YES ]
                                                    |                       |
                                                    v                       v
                                            { ACCESS DENIED }      { SCREEN RENDERED }
                                           - Render 403 Forbidden - Render HTML / RSC
                                           - "You lack permission - Interactive UI
                                              to view this resource"
```

- **State 1: "Module Disabled"**: The user may be the School Principal, but if the institution has not subscribed to the module (e.g. `notification_sms`), the feature is gated at the institutional level.
- **State 2: "User Not Authorized"**: The institution has licensed the module (e.g. `attendance_module`), but an unprivileged user (e.g. a student) attempts to access an administrative screen (e.g. `/tenant/attendance`).

---

## 2. Module Entitlement Classification Scheme

| Entitlement Class | Definition & Licensing Policy | Default Behavior |
| :--- | :--- | :--- |
| **`CORE`** | Mandatory platform capabilities essential for basic operation (Staff, Students, Classes, Subjects). | Always active for every tenant. Cannot be disabled. |
| **`OPTIONAL`** | Standard academic features that can be toggled per subscription plan (Attendance, Exams, Bulletins). | Enabled in Standard & Enterprise plans. |
| **`ENTITLEMENT_CONTROLLED`**| High-value add-ons carrying third-party costs (SMS/WhatsApp notifications, custom PDF report card builders). | Requires explicit add-on license or quota purchase. |
| **`FUTURE`** | Post-V1 roadmap modules (Fees, Admissions, Library, Transport, Biometrics). | Reserved module keys; rendered as disabled placeholders. |

---

## 3. Comprehensive Module-to-Screen Entitlement Matrix

| Screen ID | Screen Name | Owning Module | Module Key | Entitlement Class | Gating Failure Screen State | Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **PLT-01** | Platform Dashboard | Platform Control Plane | `platform_core` | `CORE` | Platform Super Admin Only | TARGET |
| **PLT-02** | Tenant Directory | Platform Control Plane | `platform_core` | `CORE` | Platform Super Admin Only | TARGET |
| **PLT-03** | Tenant Provisioning | Platform Control Plane | `platform_core` | `CORE` | Platform Super Admin Only | TARGET |
| **PLT-04** | Tenant Detail | Platform Control Plane | `platform_core` | `CORE` | Platform Super Admin Only | TARGET |
| **PLT-05** | Plan Manager | Platform Control Plane | `platform_core` | `CORE` | Platform Super Admin Only | TARGET |
| **PLT-06** | Platform Users | Platform Control Plane | `platform_core` | `CORE` | Platform Super Admin Only | TARGET |
| **PLT-07** | Platform Audit Logs | Platform Control Plane | `platform_core` | `CORE` | Platform Super Admin Only | TARGET |
| **TNT-DSH-01**| Institution Dashboard| Institution Workspace | `core_academics` | `CORE` | Fallback to Sign-In | TARGET |
| **TNT-DSH-02**| Teacher Dashboard | Staff Experience | `core_academics` | `CORE` | Fallback to Sign-In | TARGET |
| **TNT-DSH-03**| Student Dashboard | Student Experience | `core_academics` | `CORE` | Fallback to Sign-In | TARGET |
| **TNT-DSH-04**| Parent Dashboard | Parent Experience | `core_academics` | `CORE` | Fallback to Sign-In | TARGET |
| **TNT-STF-01**| Staff Directory | Faculty Management | `staff_directory` | `CORE` | Always Active | TARGET |
| **TNT-STF-02**| Staff Profile Detail | Faculty Management | `staff_directory` | `CORE` | Always Active | TARGET |
| **TNT-STU-01**| Student Directory | Student Management | `student_directory`| `CORE` | Always Active | TARGET |
| **TNT-STU-02**| Student 360 Profile | Student Management | `student_directory`| `CORE` | Always Active | TARGET |
| **TNT-PAR-01**| Parent Directory | Parent Management | `parent_directory` | `CORE` | Always Active | TARGET |
| **TNT-ACD-01**| Academic Terms | Academic Structure | `core_academics` | `CORE` | Always Active | TARGET |
| **TNT-CLS-01**| Classes & Sections | Academic Structure | `core_academics` | `CORE` | Always Active | TARGET |
| **TNT-SUB-01**| Curriculum Subjects | Academic Structure | `core_academics` | `CORE` | Always Active | TARGET |
| **TNT-TBL-01**| Master Timetable Grid| Scheduling Engine | `core_academics` | `CORE` | Always Active | TARGET |
| **TNT-TBL-02**| Weekly Timetable View| Scheduling Engine | `core_academics` | `CORE` | Always Active | TARGET |
| **TNT-ATT-01**| Daily Attendance | Student Attendance | `attendance_module`| `OPTIONAL` | `402 Upgrade Required` Banner | TARGET |
| **TNT-EXM-01**| Examination Schedules| Assessment Engine | `examination_module`| `OPTIONAL` | `402 Upgrade Required` Banner | TARGET |
| **TNT-ASN-01**| Homework Assignments | Assessment Engine | `examination_module`| `OPTIONAL` | `402 Upgrade Required` Banner | TARGET |
| **TNT-MRK-01**| Marks Entry Grid | Assessment Engine | `examination_module`| `OPTIONAL` | `402 Upgrade Required` Banner | TARGET |
| **TNT-RES-01**| Assessment Results | Assessment Engine | `examination_module`| `OPTIONAL` | `402 Upgrade Required` Banner | TARGET |
| **TNT-RPT-01**| Student Report Card | Grading & Reporting | `advanced_reports` | `OPTIONAL` | `402 Upgrade Required` Banner | TARGET |
| **TNT-COM-01**| School Announcements | Communications | `communications` | `OPTIONAL` | Hide Menu / 403 Forbidden | TARGET |
| **TNT-COM-02**| School Events | Communications | `communications` | `OPTIONAL` | Hide Menu / 403 Forbidden | TARGET |
| **TNT-NOT-01**| In-App Notification | Communications | `communications` | `CORE` | Always Active | TARGET |
| **TNT-SET-01**| Institution Settings | Governance | `core_academics` | `CORE` | Always Active | TARGET |
| **TNT-SET-02**| Role & RBAC Manager | Governance | `core_academics` | `CORE` | Always Active | TARGET |
| **TNT-AUD-01**| Institutional Audit | Governance & Audit | `core_academics` | `CORE` | Always Active | TARGET |
| **TNT-FEE-01**| Fee Management | Institutional Finance| `finance_module` | `FUTURE` | `Feature Coming Soon (V2)` | FUTURE/V2 |
| **TNT-ADM-01**| Online Admissions | Admissions Portal | `admissions_portal`| `FUTURE` | `Feature Coming Soon (V2)` | FUTURE/V2 |
| **TNT-LIB-01**| Library Catalog | Campus Facilities | `library_module` | `FUTURE` | `Feature Coming Soon (V2)` | FUTURE/V2 |
| **TNT-TRN-01**| Bus Routes & Fleet | Campus Facilities | `transport_module` | `FUTURE` | `Feature Coming Soon (V2)` | FUTURE/V2 |
