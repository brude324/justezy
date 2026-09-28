# Step 8: V2 Product Architecture & System Design Specification

**Platform**: SchoolyardSMS / Justezy Multi-Tenant Education SaaS  
**Phase**: Step 8 — V2 Architecture & Roadmap  
**Date**: September 26, 2026  
**Status**: APPROVED MASTER ARCHITECTURE SPECIFICATION  

---

## 1. Executive Summary

Following the successful completion of the V1 transformation, production pilot, multi-tenant expansion, and stabilization gates (Step 0 through Step 7), **Phase 8 establishes the complete architectural blueprint for V2**. 

In V2, Justezy evolves from a multi-tenant school administration dashboard into a comprehensive, integrated **Institutional Operating System**. V2 unifies the entire operational lifecycle of educational institutions:
- Student Acquisition & Onboarding (Admissions CRM)
- Institutional Finance (Fees, Online Payments, Double-Entry General Ledger)
- Physical Operations (Library, Transport Fleet, Consumables & Asset Inventory)
- Staff Governance & Compensation (HR, Leaves, Attendance, Integrated Payroll)
- Multi-Channel Communications (DLT-compliant SMS, WhatsApp Business, Email)
- Advanced Institutional Intelligence (Three-tier cross-module reporting & analytics)
- Asynchronous Task Infrastructure (BullMQ + Redis worker queues)
- Commercial Control Plane (Isolated SaaS subscription billing)

All V2 modules build strictly upon the validated V1 security and tenancy foundation: Clerk for authentication/identity, PostgreSQL application database for authorization authority, strict tenant isolation (`tenantId` composite indexing), dynamic RBAC, atomic permissions, horizontal access scopes, and module entitlement gating.

---

## 2. V1 Baseline & Invariant Architecture

V2 preserves the following non-negotiable architectural invariants:
1. **Authentication Boundary**: Clerk is the exclusive identity and credential provider. Zero application passwords; zero usage of Clerk metadata for institutional authorization.
2. **Authorization Authority**: PostgreSQL application database is authoritative for all `User`, `TenantMembership`, `Role`, `Permission`, `RolePermission`, `AccessScope`, and `ModuleEntitlement` records.
3. **Multi-Tenancy**: Shared database / shared schema. Every domain table contains an indexed `tenantId` foreign key. Client-provided tenant identifiers are untrusted; context is established server-side from host/subdomain.
4. **Dual-Gate Enforcement**: Access requires active institutional membership + active module license (`ModuleEntitlement`) + role permission + horizontal `AccessScope`.
5. **Fail-Closed Semantics**:
   - `401 Unauthorized`: Unauthenticated.
   - `402 Payment Required`: Module disabled / unlicensed for institution.
   - `403 Forbidden`: Lacks permission, access scope violated, or tenant suspended.
   - `404 Not Found`: Masked non-existent or cross-tenant resource to prevent enumeration.
6. **Transactional Auditability**: Critical mutations must commit an `AuditLog` entry in the same database transaction.
7. **PWA-First Architecture**: High-performance responsive web application with offline support and tenant-clearing service worker caches.

---

## 3. V2 Product Scope & Lifecycle Map

V2 maps the holistic operational lifecycle of an educational institution:

```
[Admissions CRM] ──> [Student Enrollment] ──> [Academics & Timetable]
       │                        │                         │
       ▼                        ▼                         ▼
[Application Fees]       [Fee Assignment]          [Daily Attendance]
       │                        │                         │
       ▼                        ▼                         ▼
[Online Payments] ──> [Fee Invoices / Dues]        [Exams & Report Cards]
       │                        │                         │
       └───────────────┬────────┘                         │
                       ▼                                  │
          [General Ledger Accounts] <─────────────────────┤ (Library Fines)
                       ▲                                  │ (Transport Fees)
                       │                                  │ (Inventory Purchases)
        [Staff Payroll Disbursement] <────────────────────┘ (Staff Attendance / LOP)
```

---

## 4. Bounded Contexts & Domain Architecture

V2 defines 20 bounded contexts across 18 schema planes:

| Plane | Domain Context | Core Entities | Primary Invariants |
| :---: | :--- | :--- | :--- |
| **Plane 1** | SaaS Control Plane | `Tenant`, `TenantPolicy`, `TenantBranding`, `SubscriptionPlan` | Subdomain uniqueness, status state machine |
| **Plane 2** | Identity & Dynamic RBAC | `User`, `TenantMembership`, `Role`, `Permission`, `RolePermission` | Clerk ID sync, dynamic permissions, scope binding |
| **Plane 3** | Academic Calendar & Hierarchy | `AcademicYear`, `Term`, `Grade`, `Class`, `Subject`, `ClassSubject` | Composite uniqueness `(tenantId, year, grade, section)` |
| **Plane 4** | People & Profiles | `StaffProfile`, `StudentProfile`, `ParentProfile`, `StudentParentBinding` | Unique admission # and employee ID per tenant |
| **Plane 5** | Timetable & Scheduling | `TimetablePeriod`, `TimetableLesson` | Zero double-booking for teachers or rooms |
| **Plane 6** | Attendance Management | `AttendanceRecord`, `AttendanceCorrection`, `AttendanceDailySummary` | Immutable daily record; corrections audited |
| **Plane 7** | Homework & Assignments | `Assignment`, `AssignmentSubmission` | Due date validation, student submission tracking |
| **Plane 8** | Examinations & Grading | `Exam`, `ExamPaper`, `GradingScheme`, `ExamResult`, `ReportCard` | Immutable published marks, grade band evaluation |
| **Plane 9** | Communication & Notices | `Announcement`, `Event`, `Notification`, `NotificationPreference` | Target audience scoping, opt-out preferences |
| **Plane 10**| Audit & Files | `AuditLog`, `DocumentReference` | Append-only audit logs, pre-signed storage URLs |
| **Plane 11**| Fees & Invoicing (V2) | `FeeCategory`, `FeeStructure`, `StudentFeeAssignment`, `FeeInvoice` | Auditable balance tracking; no boolean `paid` flags |
| **Plane 12**| Payments & Gateways (V2) | `PaymentGatewayConfig`, `PaymentIntent`, `Payment`, `PaymentAllocation` | Decoupled adapter, idempotent webhook verification |
| **Plane 13**| Financial General Ledger (V2) | `FiscalYear`, `FinancialPeriod`, `ChartOfAccount`, `JournalEntry` | Balanced debits/credits, closed period locks, reversals |
| **Plane 14**| Admissions CRM (V2) | `AdmissionSession`, `AdmissionEnquiry`, `AdmissionApplication`, `Offer` | Zero duplicate student identity on conversion |
| **Plane 15**| Library Management (V2) | `Book`, `BookCopy`, `LibraryMembership`, `BookBorrowRecord`, `Fine` | Accession tracking, automated overdue fine calculation |
| **Plane 16**| Transport & Fleet (V2) | `TransportVehicle`, `TransportDriver`, `TransportRoute`, `RouteStop` | Bus capacity limits, student route allocations |
| **Plane 17**| Inventory & Assets (V2) | `InventoryCategory`, `Vendor`, `InventoryItem`, `StockBatch`, `Asset` | FIFO stock costing, asset condition tracking |
| **Plane 18**| HR & Payroll (V2) | `StaffLeaveRequest`, `StaffAttendance`, `SalaryStructure`, `PayrollRun` | Attendance-based LOP deductions, journal posting |

---

## 5. Financial Architecture & General Ledger Engine

### 5.1 Financial Transaction Model
The financial engine rejects simplistic balance mutations. Every monetary interaction is modeled through discrete, immutable records:
1. **FeeStructure**: Institutional fee schedule broken into line-item components (`FeeStructureItem`).
2. **StudentFeeAssignment**: The binding of a structure to a student, recording customized concessions.
3. **FeeInvoice**: The formal claim for payment issued to the family. Contains `dueDate`, `subtotalAmount`, `discountAmount`, `paidAmount`, and `balanceAmount`.
4. **Payment**: Represents receipt of funds (via payment gateway, cheque, cash, or UPI).
5. **PaymentAllocation**: Explicitly maps payment amounts to specific invoices and invoice line items. Supports partial payments, split invoices, and advance credits.
6. **PaymentRefund**: Formal refund entry linked to the original payment with justification.

### 5.2 Double-Entry General Ledger Rules
- **Account Types**: `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`.
- **Balanced Journal Invariant**: Every `JournalEntry` contains multiple `JournalLine`s where:
  $$\sum \text{DebitAmount} = \sum \text{CreditAmount}$$
- **Posting Immutability**: Posted journal entries (`status: POSTED`) cannot be edited or deleted. Errors are corrected via paired reversal entries (`status: REVERSED`).
- **Fiscal Periods**: Transactions must post within an `OPEN` `FinancialPeriod`. Closed or locked periods reject postings.
- **Source Document Traceability**: Every journal entry records `sourceType` (`FEE_INVOICE`, `FEE_PAYMENT`, `PAYROLL_RUN`, `INVENTORY_PURCHASE`, etc.) and `sourceId`.

---

## 6. Payment Architecture & Gateway Abstraction

### 6.1 Provider Abstraction Interface
The application core is completely decoupled from payment gateway vendor SDKs via `PaymentGatewayAdapter`:
- `RazorpayAdapter` (UPI, Netbanking, Cards for Indian schools)
- `CashfreeAdapter` (Alternative Indian payment gateway)
- `StripeAdapter` (International schools / overseas currencies)
- `ManualPaymentAdapter` (Offline cash, bank deposits, cheques)

### 6.2 Idempotent Webhook Engine
- Gateway webhooks are cryptographically validated using HMAC-SHA256 signatures before reading the payload.
- Every event is recorded in `PaymentWebhookEvent` with a unique index on `(provider, eventId)`.
- Duplicate webhooks return HTTP 200 immediately without executing business logic.
- Processing runs in an atomic database transaction: `PaymentIntent` transition -> `Payment` creation -> `PaymentAllocation` -> `FeeInvoice` balance reduction -> `JournalEntry` posting.

### 6.3 Security & Compliance
- **PCI-DSS Compliance**: The application database **never** receives, processes, or stores raw credit card numbers (PANs) or CVVs. Payments use hosted checkouts or client-side tokenization.

---

## 7. Admissions & Enquiry CRM Architecture

- **Lead Pipeline**: Tracks prospective families from initial contact (`NEW` → `CONTACTED` → `VISIT_SCHEDULED` → `APPLIED`).
- **Application Portal**: Digital application with dynamic form fields and secure document collection.
- **Evaluation Workflow**: Entrance tests, interviews, and scoring rubrics.
- **Single Identity Invariant**: When an applicant is accepted and confirmed, the system converts the record into official entities in a single atomic transaction:
  - Generates application `User` (if digital portal active)
  - Creates `StudentProfile` with unique `admissionNumber`
  - Creates `StudentEnrollment` for the target class
  - Creates `ParentProfile` and `StudentParentBinding`
  - Assigns initial `StudentFeeAssignment` and generates admission invoice
  - Links `convertedStudentId` on `AdmissionApplication` to prevent duplicate re-enrollment.

---

## 8. Physical Operations: Library, Transport & Inventory

### 8.1 Library Management
- Multi-branch library support with accession numbers and Dewey decimal categorization.
- Real-time stock availability tracking (`totalCopies` vs `availableCopies`).
- Circulation rules: student vs. staff borrowing limits, loan durations, and renewals.
- Overdue tracking: Daily calculated fines emit `LibraryFine` records, which can be settled via cash or added to student fee invoices.

### 8.2 Transport & Fleet Management
- Physical asset management: Vehicles (fitness, insurance, PUC, pollution certs) and Drivers (licenses, medical validity).
- Route topology: Routes containing ordered `RouteStop` entities with morning/evening timings and staged fares.
- Student transport allocation: Generates monthly transport fees that feed into Wave 1 billing.

### 8.3 Inventory & Asset Management
- **Consumable Stock**: FIFO inventory tracking for stationery, uniforms, books, and lab chemicals. Tracks stock movements (`PURCHASE_RECEIPT`, `ISSUE_TO_STAFF`, `WRITE_OFF`).
- **Fixed Asset Register**: Barcoded equipment tracking (laptops, projectors, buses, lab apparatus) with condition history and staff custody assignments.
- Purchase entries post directly to General Ledger Accounts Payable.

---

## 9. Staff HR & Integrated Payroll Architecture

### 9.1 HR & Attendance Lifecycle
- Comprehensive employee records with document dossiers and emergency contacts.
- Institutional leave policies: Quotas for Casual, Sick, Earned, Maternity, and Unpaid leave.
- Biometric attendance integration: Daily clock-in/out records feeding automated loss-of-pay (LOP) deductions.

### 9.2 Payroll Calculation & Posting
- Salary structures: Basic, HRA, Dearness Allowance (DA), Custom Allowances, minus PF, ESI, and TDS deductions.
- Monthly `PayrollRun` calculation evaluates:
  $$\text{NetPayable} = \text{GrossSalary} - \text{LOP Deductions} - \text{Statutory Deductions} - \text{Loan Deductions}$$
- Managerial approval triggers atomic `JournalEntry` posting:
  - Debit: Staff Salary Expense Account
  - Credit: Bank Account / Salary Payable Account
  - Credit: PF / ESI / Tax Payable Accounts
- Automated, tamper-proof payslip PDF generation for staff self-service download.

---

## 10. Multi-Channel Communication Architecture

- **Driver Abstraction**: Provider-agnostic communication engine (`EmailDriver`, `SmsDriver`, `WhatsAppDriver`).
- **Regulatory Compliance (India DLT)**: SMS templates require pre-registered Entity ID and Template ID approved on Indian telecom operator DLT portals.
- **Audience Segmentation**: Precision targeting by class, grade, bus route, or fee delinquency status.
- **Delivery Guarantees**: Asynchronous queue dispatch with delivery receipts, retries, and failure visibility.

---

## 11. Cross-Module Reporting & Analytics Architecture

Adopts a three-tier reporting architecture (ADR-007):
1. **Tier 1 (Transactional Direct Queries)**: Real-time queries for daily screens (today's attendance, single student ledger).
2. **Tier 2 (Materialized Read Models)**: Dashboard KPIs and monthly summaries powered by database aggregation views refreshed on key events.
3. **Tier 3 (Asynchronous Export Pipeline)**: Heavy institutional exports (CBSE annual returns, full financial balance sheets, historical student transcripts) are offloaded to background workers and delivered as pre-signed download links.

---

## 12. Asynchronous Background Processing Tier (BullMQ + Redis)

- Dedicated task queues for long-running and asynchronous operations:
  - `notification-queue`: External telecom and email dispatches.
  - `import-queue`: Large CSV/Excel dataset processing.
  - `billing-queue`: Automated fee invoice generation and overdue interest.
  - `report-queue`: PDF generation, report card rendering, export compilation.
  - `maintenance-queue`: Document orphan sweeps, audit log archival.
- **Context Preservation**: Every job carries `tenantId` and executes inside `runWithTenantContext`.
- **Dead Letter Queue (DLQ)**: Jobs failing 3 retries are routed to DLQ for diagnostic alerting.

---

## 13. SaaS Billing vs. Institutional Finance Separation

Strict separation is enforced (ADR-009):
- **SaaS Billing (Control Plane)**: `SubscriptionPlan`, `TenantModuleEntitlement`, platform invoices (School pays Justezy).
- **Tenant Finance (Institutional Domain)**: `FeeInvoice`, `Payment`, `ChartOfAccount`, `JournalEntry` (Parent/Student pays School).
- Zero sharing of ledger accounts or financial records between the control plane and tenant institutions.

---

## 14. Security, Audit & Document Governance

1. **Defense-in-Depth Security**: Every V2 endpoint verifies Clerk authentication, tenant status (`ACTIVE`), module license (`ModuleEntitlement`), role permission, and horizontal `AccessScope`.
2. **Transactional Audit Logging**: Sensitive financial mutations (refunds, voided invoices, manual journal entries, payroll runs, applicant admissions) commit audit logs atomically.
3. **Secure Document Lifecycle**: Pre-signed URLs (maximum 15-minute expiry) for uploads and downloads; zero direct storage credentials exposed; storage paths strictly isolated by `tenantId`.

---

## 15. Testing & Quality Strategy

Every V2 module requires automated test coverage prior to release:
- **Unit Tests**: Domain calculations (fee dues, interest, tax deductions, balance assertions).
- **Integration Tests**: Service operations, database transactions, outbox event generation.
- **Security Tests**: Cross-tenant injection attempts, privilege escalation, unlicensed module blocking (HTTP 402), scope enforcement.
- **Financial Invariant Tests**: Double-entry balance tests, duplicate payment/webhook rejection, refund accounting accuracy.
- **E2E Tests**: Playwright browser flows covering parent online fee payment, applicant conversion, and staff payslip download.
