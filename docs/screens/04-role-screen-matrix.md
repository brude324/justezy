# Role-to-Screen Access Matrix

## 1. Architectural Principle: Permission-Driven Projections

**Status**: TARGET / PROPOSED

A foundational tenet established in Step 1 is: **`ROLE != PERMISSION`**. 

Screen access is governed by the underlying **Permissions** and horizontal **Access Scopes** possessed by a user's active membership, rather than hardcoded role names. 

The matrix below maps standardized default institutional roles to screens as a **baseline projection**. Institutional administrators have the authority to customize permission bindings per role.

### Evaluated Role Archetypes:
- **`SUPER_ADMIN`**: SaaS Platform Operator (`PlatformScope.GLOBAL`).
- **`INST_ADMIN`**: Institution Owner, Principal, or Managing Director (`TenantScope.INSTITUTION_WIDE`).
- **`ACAD_ADMIN`**: Academic Dean, Exam Coordinator, or Vice Principal (*OPEN DECISION: Separate role vs. customized Admin permissions*).
- **`TEACHER`**: Faculty Member, Class Teacher, or Subject Instructor (`TenantScope.ASSIGNED_ONLY`).
- **`STAFF`**: Administrative Clerk or Office Staff (`TenantScope.OPERATIONAL_DOMAINS`).
- **`STUDENT`**: Enrolled Learner (`TenantScope.SELF_ONLY`).
- **`PARENT`**: Family Guardian (`TenantScope.LINKED_CHILDREN`).

---

## 2. Comprehensive Role-to-Screen Matrix

| Screen ID | Screen Name | Super Admin | Inst Admin | Acad Admin | Teacher | Staff | Student | Parent | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **PUB-01** | Public Landing | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Public |
| **AUT-01** | Sign-In Portal | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Public |
| **PLT-01** | Platform Executive Dashboard | **FULL** | No | No | No | No | No | No | TARGET |
| **PLT-02** | Tenant Directory | **FULL** | No | No | No | No | No | No | TARGET |
| **PLT-03** | Tenant Provisioning Wizard | **FULL** | No | No | No | No | No | No | TARGET |
| **PLT-04** | Tenant Detail & Plans | **FULL** | No | No | No | No | No | No | TARGET |
| **PLT-05** | Plan & Entitlement Catalog | **FULL** | No | No | No | No | No | No | TARGET |
| **PLT-06** | Platform User Directory | **FULL** | No | No | No | No | No | No | TARGET |
| **PLT-07** | Platform Security Audit Trail| **FULL** | No | No | No | No | No | No | TARGET |
| **TNT-DSH-01**| Institution Admin Dashboard | No | **FULL** | **FULL** | No | No | No | No | TARGET |
| **TNT-DSH-02**| Teacher Workspace Dashboard | No | View | View | **FULL** | No | No | No | TARGET |
| **TNT-DSH-03**| Student Learner Dashboard | No | No | No | No | No | **SELF** | No | TARGET |
| **TNT-DSH-04**| Parent Family Dashboard | No | No | No | No | No | No | **LINKED**| TARGET |
| **TNT-STF-01**| Faculty & Staff Directory | No | **FULL** | View | View | View | No | No | TARGET |
| **TNT-STF-02**| Staff Profile & Assignments | No | **FULL** | View | **SELF** | View | No | No | TARGET |
| **TNT-STU-01**| Student Enrollment Directory| No | **FULL** | **FULL** | Assigned | View | No | No | TARGET |
| **TNT-STU-02**| Student 360 Academic Profile| No | **FULL** | **FULL** | Assigned | View | **SELF** | **LINKED**| TARGET |
| **TNT-PAR-01**| Parent & Guardian Directory | No | **FULL** | View | Assigned | View | No | No | TARGET |
| **TNT-ACD-01**| Academic Year & Term Manager| No | **FULL** | View | No | No | No | No | TARGET |
| **TNT-CLS-01**| Classes & Sections Manager | No | **FULL** | **FULL** | Assigned | View | View | View | TARGET |
| **TNT-SUB-01**| Subjects & Curriculum | No | **FULL** | **FULL** | Assigned | View | View | View | TARGET |
| **TNT-TBL-01**| Master Timetable Grid | No | **FULL** | **FULL** | View | View | No | No | TARGET |
| **TNT-TBL-02**| Weekly Schedule Calendar | No | View | View | Assigned | View | **SELF** | **LINKED**| TARGET |
| **TNT-ATT-01**| Daily Class Attendance | No | **FULL** | **FULL** | Assigned | View | **SELF** | **LINKED**| TARGET |
| **TNT-EXM-01**| Examination Schedules | No | **FULL** | **FULL** | Assigned | View | View | View | TARGET |
| **TNT-ASN-01**| Homework & Assignments | No | **FULL** | **FULL** | Assigned | No | **SELF** | **LINKED**| TARGET |
| **TNT-MRK-01**| Marks Entry Grid | No | **FULL** | **FULL** | Assigned | No | No | No | TARGET |
| **TNT-RES-01**| Assessment Results | No | **FULL** | **FULL** | Assigned | No | **SELF** | **LINKED**| TARGET |
| **TNT-RPT-01**| Student Report Card | No | **FULL** | **FULL** | Assigned | No | **SELF** | **LINKED**| TARGET |
| **TNT-COM-01**| Bulletins & Announcements | No | **FULL** | **FULL** | View | View | View | View | TARGET |
| **TNT-COM-02**| School Events & Calendar | No | **FULL** | **FULL** | View | View | View | View | TARGET |
| **TNT-NOT-01**| In-App Notification Center | No | **FULL** | **FULL** | **SELF** | **SELF** | **SELF** | **SELF** | TARGET |
| **TNT-SET-01**| Institution Settings | No | **FULL** | No | No | No | No | No | TARGET |
| **TNT-SET-02**| Role & Permission Manager | No | **FULL** | No | No | No | No | No | TARGET |
| **TNT-AUD-01**| Institutional Audit Trail | No | **FULL** | No | No | No | No | No | TARGET |
| **ACC-01** | Personal Profile | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | TARGET |
| **ACC-02** | Security & Credentials | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | TARGET |
| **ACC-03** | Notification Preferences | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | TARGET |
| **ACC-04** | Active Tenant Switcher | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | **SELF** | TARGET |

---

## 3. Matrix Legend & Scope Conventions

- **`FULL`**: Unrestricted create, read, update, delete, and publish capabilities across the entire institution.
- **`Assigned`**: Read and write capabilities restricted strictly to the user's assigned classes, subjects, or sections (`TenantScope.ASSIGNED_ONLY`).
- **`View`**: Read-only directory access without mutation permissions.
- **`SELF`**: Capabilities strictly bounded to the user's personal record (`TenantScope.SELF_ONLY`).
- **`LINKED`**: Capabilities strictly bounded to student records linked via verified parent-child relations (`TenantScope.LINKED_CHILDREN`).
- **`No`**: Screen route is hidden from navigation and access is blocked by server-side policy guards.
