# Product Scope & Roadmap Boundaries

## 1. Overview & Phasing Framework

**Status**: TARGET / PROPOSED

To ensure disciplined execution and mitigate technical debt, the product scope is structured across three primary delivery horizons: **V1 (Core Academic Foundation & SaaS Migration)**, **V2 (Operational Workflows & Communications)**, and **V3 (Advanced Operations & Institutional Ecosystem)**.

```
+--------------------------------------------------------------------------+
|                        V1: CORE ACADEMIC PLATFORM                        |
|  - SaaS Tenant Foundation & Server-Side Tenant Resolution                |
|  - Clerk Identity + DB-Driven Dynamic RBAC & Permissions                 |
|  - Refactored Academic Entities (Classes, Sections, Subjects, Lessons)   |
|  - Staff, Student & Parent Profiles with Scoped Unique Identifiers       |
|  - Basic Timetable & Weekly Scheduling                                   |
|  - Examinations, Gradebooks & Baseline Marks Entry                       |
|  - Basic Attendance (Daily & Subject) & Audit Logging Foundation         |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
|                     V2: WORKFLOWS & COMMUNICATIONS                       |
|  - Multi-Channel Notifications (SMS, WhatsApp, In-App, Email)            |
|  - Fee Management & Institutional Invoicing (Indian Gateways)            |
|  - Academic Report Card Generation (PDF generation worker)               |
|  - Full PWA Offline Timetable & Mobile Attendance Marking                |
|  - Institutional Bulletin & Targeted Announcements Engine                |
|  - Bulk Student & Staff Onboarding (CSV / Excel Import Worker)           |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
|                   V3: ADVANCED ENTERPRISE OPERATIONS                     |
|  - Online Admissions & Student Enrollment Pipeline                       |
|  - Transport & Bus Route Tracking                                        |
|  - Library Management & Book Circulations                                |
|  - Hostel & Dormitory Allocation                                         |
|  - Advanced Institutional Analytics & Predictive Attrition Dashboards    |
|  - Open REST / Webhook API for Third-Party Ecosystem Integrations        |
+--------------------------------------------------------------------------+
```

---

## 2. V1 Scope: Core Academic Platform (Migration Target)

The immediate objective of the SaaS migration is to transform the existing baseline into a fully isolated, robust V1 platform.

| Module / Area | Baseline State (CURRENT / VERIFIED) | V1 Target Scope (TARGET / PROPOSED) | Status |
| :--- | :--- | :--- | :---: |
| **Tenant Foundation** | 0% implemented; single-tenant database. | Multi-tenant schema, server-side tenant resolution, institutional settings, active academic year context. | DECISION |
| **Identity & RBAC** | Hardcoded Clerk `publicMetadata.role`. Zero server action authorization. | Clerk authentication (`userId`), PostgreSQL `User`, `TenantMembership`, dynamic `Role` & `Permission` engine. | DECISION |
| **Institution Admin** | Hardcoded tutorial stats on `/admin`. | Comprehensive tenant administration: academic terms, class/section setup, staff assignments. | TARGET / PROPOSED |
| **Student Directory** | Table at `/list/students`, single page at `[id]`. Global IDs only. | Scoped admission numbers, class/section bindings, parent links, emergency contacts, profile view. | TARGET / PROPOSED |
| **Staff Directory** | Table at `/list/teachers`, single page at `[id]`. Single role. | Institutional staff profiles, departmental assignments, designation tracking, subject mappings. | TARGET / PROPOSED |
| **Parent Directory** | Table at `/list/parents`, no form, delete action bug. | Parent/Guardian directory, student-parent relationship mapping, primary guardian contact flag. | TARGET / PROPOSED |
| **Subjects & Classes** | Global `@unique` names colliding across institutions. | Scoped subjects (`@@unique([tenantId, code])`), section capacities, class teacher assignments. | DECISION |
| **Lessons & Timetable** | Client BigCalendar, 2025 hardcoded dates, no Saturday. | Multi-period daily timetable, Saturday toggle, teacher conflict checks, section schedule views. | TARGET / PROPOSED |
| **Examinations & Marks**| Unprotected exam forms, single-integer result scores. | Assessment terms, exam schedules, maximum/passing marks, student score entry with validation. | TARGET / PROPOSED |
| **Attendance** | Missing `/list/attendance` route; student card NaN bug. | Daily class attendance marking, subject-wise attendance logs, monthly student attendance summary. | TARGET / PROPOSED |
| **Audit Logging** | 0% implemented. | Atomic audit logging for all student/staff deletions, role changes, marks modifications, and settings. | DECISION |

---

## 3. V2 Scope: Workflows & Institutional Operations

**Status**: TARGET / PROPOSED (Roadmap)

V2 extends the core academic engine with automated background processing, parental communication, and financial operations:

1. **Multi-Channel Notification Dispatcher**:
   - Transactional SMS and WhatsApp alerts for attendance absence, fee dues, and emergency school closures.
   - Background worker (BullMQ + Redis) executing rate-limited delivery against Indian telecom aggregators.
2. **Fee Management & Ledger**:
   - Fee structure definitions (Tuition, Transport, Examination, Laboratory).
   - Term-wise installment generation, offline cash/cheque receipt recording, online payment gateway integration (Razorpay/Cashfree).
   - Defaulter reports and automated reminder workflows.
3. **Report Card Engine**:
   - Institutional report card templates (CBSE 9-point grading scale, percentage rankings, teacher remarks).
   - Asynchronous batch PDF compilation and download for entire classes/sections.
4. **Offline PWA Capabilities**:
   - Offline timetable viewing for students and teachers.
   - Offline attendance recording with background sync when connectivity is restored.
5. **Data Import & Migration Utility**:
   - Bulk Excel/CSV upload for student admissions, staff records, and historic grades via background worker.

---

## 4. V3 Scope: Advanced Institutional Ecosystem

**Status**: OPEN / TBD (Proposed Future Roadmap)

V3 expands the platform into full campus enterprise management:

1. **Admissions & Enrollment Portal**:
   - Public application form, document upload verification, interview scheduling, and seat allotment.
2. **Transport & Fleet Management**:
   - Vehicle registration, driver assignments, route stops, and student bus-pass tracking.
3. **Library & Media Center**:
   - ISBN cataloging, book issuance, return dates, late fine calculations.
4. **Hostel & Facility Management**:
   - Dormitory building allocation, room capacity management, mess billing.
5. **Open Integrations & Webhooks**:
   - Biometric attendance device webhooks (RFID, facial recognition).
   - Third-party LMS exports and accounting ledger integrations.

---

## 5. Scope Exclusion (Out-of-Scope for V1)

To protect delivery velocity, the following features are **explicitly out of scope** for V1:
- Native iOS / Android binary apps in app stores (PWA is prioritized).
- Real-time video conferencing or classroom streaming.
- Complex double-entry general ledger accounting (V2 fee collection only).
- Hardware biometric device firmware integration.
- Custom LMS learning authoring tools (SCORM / xAPI).
