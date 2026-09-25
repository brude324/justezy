# V2 Scope: Operational Expansion & Automated Workflows

## 1. Executive Summary & V2 Strategic Horizon

**Status**: TARGET / PROPOSED (Post-V1 Roadmap)

**Version 2 (V2)** builds directly on top of the established V1 multi-tenant academic foundation. While V1 focuses on core daily classroom and school operational records, V2 expands into financial sustainability, automated parental communication, end-of-year academic progression, and administrative efficiency.

V2 features are decoupled into three distinct implementation tiers:
- **CORE V2**: Essential operational expansions that ship as the primary V2 release.
- **OPTIONAL V2**: Add-on licensed modules that institutions can toggle based on subscription.
- **DEPENDENCY / FUTURE**: Modules dependent on external integrations or advanced prerequisites.

---

## 2. V2 Module Classification Matrix

| Module / Operational Domain | Implementation Tier | Purpose & Business Value | Primary Dependencies | Status |
| :--- | :---: | :--- | :--- | :---: |
| **Fee Management & Invoicing** | **CORE V2** | Comprehensive fee structures, installment tracking, and receipt generation. | V1 Student & Class Modules | TARGET / PROPOSED |
| **Multi-Channel Advanced Notifications** | **CORE V2** | DLT-compliant Indian SMS, WhatsApp alerts, and automated absence warnings. | V1 Attendance & BullMQ Queue | TARGET / PROPOSED |
| **Student Academic Promotion** | **CORE V2** | End-of-year batch transition of students from Grade N to Grade N+1. | V1 Assessment & Class Modules | TARGET / PROPOSED |
| **Student Transfer & Withdrawal (TC)** | **CORE V2** | Formal student exit workflow, transfer certificate generation, and archival. | V1 Student & Audit Modules | TARGET / PROPOSED |
| **Bulk Data Import & Migration** | **CORE V2** | Background worker processing bulk CSV/Excel student and staff rosters. | V1 People Modules, BullMQ | TARGET / PROPOSED |
| **Advanced Report Card PDF Engine** | **CORE V2** | Asynchronous batch compilation of CBSE/State Board PDF report cards. | V1 Assessment, BullMQ Worker | TARGET / PROPOSED |
| **Admissions & Online Inquiries** | **OPTIONAL V2** | Public prospect forms, inquiry tracking, and document verification. | S3 Object Store, V1 Student | TARGET / PROPOSED |
| **Parent-Teacher Direct Messaging** | **OPTIONAL V2** | Controlled, audited communication channel between teachers and parents. | V1 Parent & Staff Modules | TARGET / PROPOSED |
| **Library Management** | **OPTIONAL V2** | ISBN cataloging, book issuance, return tracking, and late fee logging. | V1 Student & Staff Modules | TARGET / PROPOSED |
| **Transport & Fleet Routes** | **OPTIONAL V2** | Bus routes, vehicle rosters, driver allocations, and bus-pass fees. | V1 Student & Fee Modules | TARGET / PROPOSED |
| **Staff HR & Leave Management** | **OPTIONAL V2** | Teacher leave applications, substitute teacher assignments, attendance. | V1 Staff & Timetable Modules | TARGET / PROPOSED |
| **Advanced Document Vault** | **OPTIONAL V2** | Encrypted digital storage for birth certificates, transfer certificates, IDs. | S3 Storage Pipeline, DPDP Act | TARGET / PROPOSED |
| **Inventory & Asset Tracking** | **DEPENDENCY / FUTURE**| Institutional equipment, lab supplies, and furniture tracking. | Fee / Accounting Foundation | OPEN / TBD |
| **Finance & Basic Ledger Accounting**| **DEPENDENCY / FUTURE**| Double-entry general ledger, expense tracking, and bank reconciliation. | CORE V2 Fee Management | OPEN / TBD |

---

## 3. Detailed Specification of CORE V2 Modules

### 3.1 Fee Management, Invoicing & Receipts
- **Tier**: **CORE V2**
- **Purpose**: Automate the institutional revenue lifecycle, eliminate manual paper fee counters, and track student fee defaulters.
- **Core Workflows**:
  1. Admin defines institutional Fee Structures (e.g. "Grade 10 Annual Tuition: ₹45,000", payable in 3 quarterly installments).
  2. System generates pending fee invoices for all enrolled students in the active academic year.
  3. Office clerk records offline cash/cheque payment -> system atomically issues a tamper-evident digital receipt.
  4. Online payment links dispatched via WhatsApp (Razorpay/Cashfree gateway integration).
  5. Defaulter reports aggregate overdue accounts by class and trigger automated reminder SMS.
- **Key Entities**: `FeeStructure`, `FeeHead`, `FeeInvoice`, `FeePayment`, `FeeReceipt`.
- **Permissions**: `fee.structure.manage`, `fee.invoice.generate`, `fee.collect`, `fee.waiver.approve`.

### 3.2 Multi-Channel Advanced Notifications (SMS & WhatsApp)
- **Tier**: **CORE V2**
- **Purpose**: Automate real-time communications to parents over high-open-rate channels (SMS & WhatsApp) via BullMQ workers.
- **Core Workflows**:
  1. Morning attendance roll-call completes; attendance service enqueues absent student notifications.
  2. Notification worker resolves Indian DLT templates, merges student names/dates, and calls telecom gateway API.
  3. Delivery receipts (Delivered, Failed, DND) are tracked and logged in PostgreSQL.
- **Key Entities**: `NotificationTemplate`, `NotificationLog`, `TenantSmsQuota`.
- **Permissions**: `notification.broadcast`, `notification.template.manage`.

### 3.3 Student Academic Promotion & Rollover Engine
- **Purpose**: Execute seamless batch transitions of the entire student body at the close of an academic session.
- **Core Workflows**:
  1. Admin closes current Academic Year and verifies finalized exam results.
  2. Promotion wizard presents class rosters with suggested status (Promoted to next grade, Retained, Graduated).
  3. Admin confirms promotion; system creates new `StudentEnrollment` records in the upcoming Academic Year.
- **Key Entities**: `AcademicYear`, `StudentProfile`, `ClassEnrollment`.
- **Permissions**: `academic.promotion.execute`.

### 3.4 Student Transfer & Withdrawal (Transfer Certificate - TC)
- **Purpose**: Formalize student exits, clear departmental dues, and issue official Transfer Certificates.
- **Core Workflows**:
  1. Parent or admin submits withdrawal request.
  2. System checks for pending fee dues or unreturned library books.
  3. Admin enters conduct remarks, generates standardized TC document, and archives student profile.
- **Key Entities**: `TransferCertificate`, `StudentProfile`, `AuditLog`.
- **Permissions**: `student.transfer.issue`.

---

## 4. Detailed Specification of OPTIONAL V2 Modules

### 4.1 Admissions & Public Inquiries Pipeline
- **Tier**: **OPTIONAL V2**
- **Purpose**: Digitally capture student inquiries, track the prospect pipeline, and convert approved applicants directly into enrolled students.
- **Workflows**: Public inquiry form -> Staff follow-up calls -> Digital document upload -> Entrance test scheduling -> Fee payment -> One-click enrollment into V1 Student Directory.

### 4.2 Library Management Module
- **Tier**: **OPTIONAL V2**
- **Purpose**: Manage physical book circulation, media inventory, and late return penalties.
- **Workflows**: Book cataloging (ISBN / Barcode) -> Student barcode scan -> Checkout with due date -> Return scan with automated late fine computation.

### 4.3 Transport & Fleet Routes
- **Tier**: **OPTIONAL V2**
- **Purpose**: Coordinate student bus transportation, driver allocations, and transport fee calculations.
- **Workflows**: Route definitions (Stops, Timings, Bus number) -> Student bus stop assignment -> Transport fee line item added to student invoice -> Driver roster view.

### 4.4 Staff HR & Leave Tracking
- **Tier**: **OPTIONAL V2**
- **Purpose**: Digitize faculty leave applications, absence tracking, and substitute teacher timetable adjustments.
- **Workflows**: Teacher submits leave request -> Principal approves -> Timetable service alerts administrator to assign substitute instructor for affected lesson periods.
