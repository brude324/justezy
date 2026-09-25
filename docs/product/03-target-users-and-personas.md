# Target Users, Personas & Organizational Scopes

## 1. Persona Overview & Multi-Tenant Mapping

**Status**: TARGET / PROPOSED

In a multi-tenant institutional SaaS platform, individual human beings interact with institutions in distinct capacities. A single person (User) may simultaneously be a Teacher in Institution A and a Parent in Institution B. 

Authorization, scope of visibility, and operational responsibilities must be modeled cleanly around institutional personas.

```
                            [ Person / User ]
                                    |
                    +---------------+---------------+
                    |                               |
          [ Tenant A: St. Jude ]          [ Tenant B: DPS ]
                    |                               |
         ( Role: Teacher )               ( Role: Parent )
                    |                               |
         - Grades Class 8A               - Views Child in Class 3B
         - Marks Attendance              - Pays Fees
```

---

## 2. Core User Personas

### 2.1 SaaS Platform Administrator (Super Admin)
- **Role Type**: Global / Platform Control Plane.
- **Operational Context**: Cross-tenant oversight, billing, subscription management, tenant onboarding.
- **Key Responsibilities**:
  - Provisioning new institutional tenants and initial administrator credentials.
  - Configuring institutional subscription tiers and module entitlements.
  - Monitoring platform-wide telemetry, performance, and security audit logs.
  - Managing billing status and tenant suspension for non-payment.
- **Primary Pain Points**: Lack of automated tenant provisioning, lack of visibility into system abuse or tenant isolation breaches.

### 2.2 Institution Administrator (Principal / Director / Head of School)
- **Role Type**: Tenant-Scoped Executive.
- **Operational Context**: Entire single institution (`Tenant`).
- **Key Responsibilities**:
  - Academic calendar configuration, term definitions, class and section setup.
  - Staff onboarding, role assignments, and departmental oversight.
  - Institutional fee structures, defaulter approvals, and fee collections.
  - Publishing official school-wide announcements and reviewing compliance logs.
- **Primary Pain Points**: Disparate spreadsheets, manual data consolidation, delayed notification delivery to parents, unauthorized marks tampering.

### 2.3 Teacher / Instructor (Class Teacher & Subject Teacher)
- **Role Type**: Tenant-Scoped Academic Staff.
- **Operational Context**: Scoped to assigned Classes, Sections, and Subjects (`AccessScope.ASSIGNED_ONLY`).
- **Key Responsibilities**:
  - Taking daily period/subject attendance.
  - Entering exam marks and evaluating homework assignments.
  - Viewing weekly class timetable and substitute assignments.
  - Sending section-specific messages and announcements.
- **Primary Pain Points**: Cumbersome attendance registers, repetitive manual report card calculations, lack of fast mobile entry.

### 2.4 Student
- **Role Type**: Tenant-Scoped Learner.
- **Operational Context**: Strictly self-scoped (`AccessScope.SELF_ONLY`).
- **Key Responsibilities**:
  - Viewing individual weekly timetable, periods, and room allocations.
  - Checking published homework assignments, due dates, and exam dates.
  - Reviewing historical assessment results, report cards, and attendance percentages.
- **Primary Pain Points**: Fragmented paper notices, lack of timetable clarity, delayed feedback on exam marks.

### 2.5 Parent / Legal Guardian
- **Role Type**: Tenant-Scoped Family Guardian.
- **Operational Context**: Scoped to linked children records (`AccessScope.LINKED_CHILDREN`).
- **Key Responsibilities**:
  - Monitoring child's daily attendance records and absence alerts.
  - Reviewing academic performance, teacher remarks, and report cards.
  - Reviewing fee dues, receipts, and executing online fee payments (V2).
  - Receiving official institutional communications and emergency alerts.
- **Primary Pain Points**: Lack of real-time attendance alerts, cumbersome cash-only fee payments at school counters, multiple school portals for different children.

### 2.6 Institutional Administrative Staff (Accountant / Office Clerk)
- **Role Type**: Tenant-Scoped Operational Staff.
- **Operational Context**: Scoped to institutional finance and records.
- **Key Responsibilities**:
  - Creating student admission records and verifying documentation.
  - Generating fee invoices, recording offline payments, and issuing stamped receipts.
  - Managing student transfer certificates (TC) and historic archives.
- **Primary Pain Points**: Reconciling manual payment ledgers against bank statements, tedious document filing.

---

## 3. Persona Access Scope Matrix

| Persona | Tenant Context | Access Scope Level | Cross-Tenant Allowed? | Status |
| :--- | :--- | :--- | :---: | :---: |
| **SaaS Platform Admin** | Global / Multi-Tenant | `PlatformScope.GLOBAL` | Yes (Control Plane) | TARGET / PROPOSED |
| **Institution Admin** | Single Active Tenant | `TenantScope.INSTITUTION_WIDE` | No | TARGET / PROPOSED |
| **Accountant / Office Clerk**| Single Active Tenant | `TenantScope.OPERATIONAL_DOMAINS` | No | TARGET / PROPOSED |
| **Teacher** | Single Active Tenant | `TenantScope.ASSIGNED_STUDENTS_AND_CLASSES` | No | TARGET / PROPOSED |
| **Student** | Single Active Tenant | `TenantScope.SELF_ONLY` | No | TARGET / PROPOSED |
| **Parent / Guardian** | Single Active Tenant | `TenantScope.LINKED_CHILDREN_ONLY` | No | TARGET / PROPOSED |
