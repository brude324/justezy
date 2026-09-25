# Cross-Horizon Module Dependency & Complexity Matrix

## 1. Matrix Overview & Complexity Definitions

**Status**: TARGET / PROPOSED

This matrix provides a consolidated dependency and technical complexity evaluation for every module across the V1, V2, and V3 horizons. It serves as the primary sequencing guide for architectural planning and sprint estimation.

### Evaluation Criteria:
- **RBAC Complexity**: Low (Static role check) | Medium (Scope/Assignment checks) | High (Multi-tier dynamic policies & custom overrides).
- **Tenant Impact**: Isolated (Single entity scoping) | Medium (Relational tenant joins) | Critical (Cross-cutting isolation, partition indexing, or global constraint transformations).
- **Data Complexity**: Simple (Flat table CRUD) | Medium (Multi-table relational transactions) | High (Complex state machine, historical rollbacks, or massive time-series aggregations).
- **Integration Complexity**: None (Internal only) | Low (Single standard client) | Medium (Queues/Workers/S3) | High (External telecom, banking gateways, hardware IoT).
- **Testing Complexity**: Low (Standard unit tests) | Medium (DB integration & transactional rollbacks) | High (Multi-tenant concurrent E2E browser flows & failure simulations).

---

## 2. Comprehensive Module Matrix

| Module Name | Horizon | Depends On | Primary Users | RBAC Complexity | Tenant Impact | Data Complexity | Integration Complexity | Testing Complexity |
| :--- | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Clerk Auth & App User** | **V1** | None (Foundation) | All Users | Low | Critical | Low | Medium (Clerk) | Medium |
| **Tenant & Membership** | **V1** | Clerk Auth | Platform/School Admin | Medium | Critical | Medium | Low | High |
| **Dynamic DB RBAC** | **V1** | Tenant & Membership | All Users | High | Critical | Medium | Low | High |
| **Module Entitlements** | **V1** | Tenant & Membership | Platform Admin | Medium | High | Low | Low (Redis) | Medium |
| **Atomic Audit Logging** | **V1** | DB Engine | Admin, Auditors | Low | High | Medium | None | High |
| **PWA Baseline** | **V1** | Web Shell | Mobile Users | Low | Low | Low | Low (Service Worker)| Medium |
| **Staff & Teachers** | **V1** | Tenant & RBAC | Admin, Staff | Medium | High | Medium | Low (S3) | Medium |
| **Students & Parents** | **V1** | Tenant, Class, Staff | Admin, Teachers, Parents | High | High | High | Low (S3) | High |
| **Classes & Sections** | **V1** | Tenant, Academic Year| Admin, Teachers | Medium | Critical | Medium | None | Medium |
| **Subjects & Curriculum**| **V1** | Tenant, Staff | Admin, Teachers | Low | Critical | Medium | None | Medium |
| **Timetable & Lessons** | **V1** | Class, Subject, Staff | Teachers, Students | High | High | High | None | High |
| **Daily Attendance** | **V1** | Student, Class, Staff| Teachers, Parents | High | High | High | Low | High |
| **Exams & Assessment** | **V1** | Class, Subject, Term | Teachers, Students | Medium | High | High | None | High |
| **Marks Entry & Results**| **V1** | Exam, Student | Teachers, Admin | High | High | High | None | High |
| **Basic Report Cards** | **V1** | Marks, Attendance | Admin, Parents | Medium | High | High | None | Medium |
| **Announcements/Events** | **V1** | Tenant, Roles | All Users | Low | Medium | Low | None | Low |
| **Fee Management** | **V2** | Student, Class, Audit| Admin, Accountant, Parents| High | Critical | High | High (Razorpay) | High |
| **Multi-Channel SMS/WA** | **V2** | Attendance, BullMQ | Parents, Staff | Medium | High | Medium | High (DLT Telecom)| High |
| **Student Promotion** | **V2** | Assessment, Class | School Admin | High | Critical | High | None | High |
| **Transfer Certificates**| **V2** | Student, Fee, Audit | Office Clerk, Admin | Medium | High | Medium | Low (PDF) | Medium |
| **Bulk Data Import** | **V2** | People Modules, BullMQ| Admin, Tech Ops | Medium | High | High | Medium (Worker) | High |
| **Report Card PDF Engine**| **V2** | Assessment, BullMQ | Teachers, Parents | Medium | High | High | Medium (Chromium)| High |
| **Admissions Pipeline** | **V2** | Student, S3 Storage | Admissions Officer | Medium | High | Medium | Medium (S3/Payment)| Medium |
| **Library Management** | **V2** | Student, Staff | Librarian, Students | Medium | Medium | Medium | Low (Barcode) | Medium |
| **Transport & Fleet** | **V2** | Student, Fee Module | Transport Manager | Medium | Medium | Medium | Low | Medium |
| **Staff HR & Leave** | **V2** | Staff, Timetable | Principal, Teachers | High | Medium | Medium | None | High |
| **Workflow Automation** | **V3** | All Core Services | School Leadership | High | Critical | High | Medium | High |
| **Public API & Webhooks** | **V3** | Tenant, RBAC, Queue | Developers, Integrators | High | Critical | High | High (OAuth/Svix) | High |
| **Biometric Attendance** | **V3** | Attendance, Webhooks | Gate Staff, Admin | Medium | High | High | High (IoT Hardware)| High |
| **Predictive Analytics** | **V3** | All Historic Data | Institutional Directors | Medium | Critical | High | High (ML Pipeline) | High |
| **Full Accounting & ERP**| **V3** | Fee Module, Invoices | Chartered Accountants | High | Critical | High | High (Banking APIs)| High |
| **AI Timetable Solver** | **V3** | Timetable, Rooms | Academic Coordinators | Medium | High | High | High (AI Engine) | High |
