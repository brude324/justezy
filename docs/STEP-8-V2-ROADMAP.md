# Step 8: V2 Phased Implementation Roadmap & Dependency Gates

**Project**: SchoolyardSMS / Justezy Multi-Tenant Education SaaS  
**Phase**: Step 8 — V2 Architecture & Roadmap  
**Date**: September 26, 2026  
**Status**: APPROVED IMPLEMENTATION ROADMAP  

---

## 1. Architectural Sequencing Principles

The V2 implementation roadmap is strictly **dependency-driven**, not chronological or marketing-driven. Modules are organized into progressive implementation waves where foundational primitives are established and hardened before dependent consumer modules are introduced:

```
Wave 0: V2 Foundation & Infrastructure Tier
  ↓
Wave 1: Fees + Online Payments + Financial General Ledger (Core Financial Primitives)
  ↓
Wave 2: Admissions & Enquiry CRM (Feeds Student Enrollment & Initial Fees)
  ↓
Wave 3: Library & Transport Operations (Consumes Student/Staff profiles; Emits Fines & Bus Fees)
  ↓
Wave 4: Inventory & Asset Management (Vendors, Stock Inward, Fixed Assets)
  ↓
Wave 5: Staff HR & Payroll (Consumes Staff Profiles; Emits Salary Liabilities to General Ledger)
  ↓
Wave 6: Advanced Multi-Channel Communication (SMS/DLT, WhatsApp, Email Provider Drivers)
  ↓
Wave 7: Cross-Module Reporting & Analytics (Read Models, Materialized Views, Async Exports)
  ↓
Wave 8: Bulk Operations & Asynchronous Background Workers (BullMQ + Redis Task Cluster)
  ↓
Wave 9: SaaS Billing & Platform Subscription Management (Isolated Control Plane Billing)
  ↓
Wave 10: Public API Platform & External Integrations (Biometric, RFID, Accounting)
```

---

## 2. Detailed Implementation Waves

---

### Wave 0: V2 Architecture Foundation & Infrastructure Prerequisites
- **Objective**: Establish shared infrastructure primitives required by all V2 modules without touching production application behavior.
- **Scope**:
  - Deploy BullMQ worker cluster and Redis instance for background queues.
  - Expand database schema (Planes 11–13) in non-production environments using Expand-and-Contract.
  - Implement Transactional Outbox pattern foundation in PostgreSQL.
  - Establish `PaymentGatewayAdapter` and `CommunicationDriver` interface skeletons.
- **Entry Criteria**: Step 7 multi-tenant production expansion verified and stable.
- **Exit Criteria**: Redis queue connectivity, outbox event dispatcher running in staging, V2 schema validated.
- **Architectural Gate**: Zero impact on running V1 production tenants.

---

### Wave 1: Fees, Online Payments & Financial General Ledger
- **Objective**: Build the institutional financial engine that all subsequent operational modules depend upon.
- **Scope**:
  - **Fees & Invoicing**: `FeeCategory`, `FeeStructure`, `StudentFeeAssignment`, `FeeInvoice`, `FeeDiscount`.
  - **Payments & Checkout**: `PaymentIntent`, `PaymentGatewayConfig` (Razorpay / Cashfree adapters), `Payment`, `PaymentAllocation`, `PaymentRefund`, cryptographic webhook verification.
  - **Financial Ledger**: `FiscalYear`, `FinancialPeriod`, `ChartOfAccount`, `LedgerAccount`, balanced double-entry `JournalEntry` & `JournalLine`.
  - Parent portal fee payment screen and automated receipt generation.
- **Entry Criteria**: Wave 0 infrastructure verified; target financial schema applied in staging.
- **Exit Criteria**:
  - 100% test pass on double-entry balance tests (`sum(debit) == sum(credit)`).
  - Webhook idempotency test verifies zero duplicate allocations on repeated gateway retries.
  - Partial payments, scholarship discounts, and refunds balance accurately.
- **Classification**: **REQUIRED CORE FINANCIAL FOUNDATION**.

---

### Wave 2: Admissions & Enquiry CRM
- **Objective**: Digitize the prospective student journey from marketing enquiry to enrolled student.
- **Scope**:
  - Public enquiry capture, lead stages, follow-up scheduling.
  - Online applicant portal, digital application form, document upload.
  - Entrance test and interview evaluation workflow.
  - Acceptance offer generation and provisional admission fee collection.
  - **Conversion Gate**: One-click applicant conversion to active `StudentProfile` and `StudentEnrollment` without duplicate identity creation.
  - Automated initial fee structure assignment on conversion.
- **Entry Criteria**: Wave 1 complete (Admissions depends on Wave 1 for application fee and admission deposit collection).
- **Exit Criteria**: Applicant conversion cleanly creates `User`, `StudentProfile`, `StudentEnrollment`, `ParentProfile`, and `StudentFeeAssignment` in a single transaction.
- **Classification**: **REQUIRED CORE ACADEMIC PIPELINE**.

---

### Wave 3: Library & Transport Operations
- **Objective**: Provide automated management of daily physical institutional services.
- **Scope**:
  - **Library Management**: Accession numbering, multi-branch catalog, borrowing rules, circulation desk, overdue calculation, `LibraryFine` generation.
  - **Transport Management**: Vehicles, driver licenses, routes, bus stops, student transport assignments, monthly fare calculation.
  - **Financial Hand-off**: Overdue fines and transport charges automatically link to student fee invoices via Wave 1 APIs.
- **Entry Criteria**: Wave 1 and Wave 2 complete; student and staff profiles available.
- **Exit Criteria**: Overdue library books generate auditable fines; student bus route allocations generate transport fee invoice items.
- **Classification**: **IMPORTANT OPERATIONAL SERVICES**.

---

### Wave 4: Inventory & Asset Management
- **Objective**: Track institutional consumables, stationery, lab equipment, and fixed physical assets.
- **Scope**:
  - Store categories, vendor catalog, purchase entries (Goods Received Notes).
  - Stock batch tracking with FIFO/unit cost tracking.
  - Consumable issuance to teachers, classes, and administrative departments.
  - Fixed asset register, barcode tagging, condition tracking, staff assignment.
  - Damaged stock write-offs and physical audit count adjustments.
- **Entry Criteria**: Wave 1 financial ledger active (purchase entries post to Accounts Payable & Asset accounts).
- **Exit Criteria**: Inward vendor purchases post balanced journal entries; asset assignments reflect on staff dossiers.
- **Classification**: **IMPORTANT OPERATIONAL MODULE**.

---

### Wave 5: Staff HR & Integrated Payroll
- **Objective**: Full staff employment lifecycle management and automated monthly payroll calculation.
- **Scope**:
  - Staff leave policies, quotas, carry-forward rules, leave application/approval workflow.
  - Daily staff biometric attendance tracking and loss-of-pay (LOP) calculations.
  - Salary structures (Basic, HRA, DA, Allowances, PF, ESI, TDS deductions).
  - Monthly `PayrollRun` calculation and managerial approval.
  - Automated `JournalEntry` posting to General Ledger (Salary Expense vs. Bank / PF Payable).
  - Staff self-service payslip generation and secure PDF download.
- **Entry Criteria**: Wave 1 (General Ledger) and Wave 4 active; staff profiles established.
- **Exit Criteria**: Approved payroll run atomically generates payslips and posts balanced debits/credits to General Ledger accounts.
- **Classification**: **REQUIRED INSTITUTIONAL GOVERNANCE**.

---

### Wave 6: Advanced Multi-Channel Communication
- **Objective**: Enterprise communication engine supporting transactional and bulk broadcasting across multiple channels.
- **Scope**:
  - Multi-channel drivers: Email (Resend/AWS SES), SMS (DLT-compliant Indian telecom gateways), WhatsApp Business API.
  - Templating engine with variable substitution and localized templates.
  - Target audience segmentation (by Grade, Class, Transport Route, Fee Defaulters).
  - Scheduled broadcasts and automated delivery receipts.
- **Entry Criteria**: BullMQ background queue operational (Wave 0); business events active (Waves 1–5).
- **Exit Criteria**: Asynchronous broadcast dispatches 10,000+ messages without blocking HTTP requests; DLT registration tokens enforced for SMS.
- **Classification**: **IMPORTANT INSTITUTIONAL COMMUNICATION**.

---

### Wave 7: Cross-Module Reporting & Analytics
- **Objective**: Comprehensive operational, academic, and financial visibility for school leadership.
- **Scope**:
  - **Academic Analytics**: Class pass percentages, grade distribution, subject difficulty index, attendance correlation.
  - **Financial Analytics**: Monthly collection trends, aging of outstanding fee receivables, revenue by fee head.
  - **Admissions Analytics**: Conversion funnels, enquiry sources, yield rates.
  - Implementation of read-optimized aggregation views and asynchronous long-running report exports (PDF/Excel).
- **Entry Criteria**: Operational data actively populating across Waves 1–6.
- **Exit Criteria**: Heavy analytical reports execute within <200ms using aggregation views or deliver via background export queue.
- **Classification**: **IMPORTANT MANAGEMENT INTELLIGENCE**.

---

### Wave 8: Bulk Operations & Background Worker Scaling
- **Objective**: Enterprise-scale bulk data ingestion, bulk updates, and automated system maintenance.
- **Scope**:
  - High-volume CSV/XLSX bulk importers for Fees, Transport, Library, and Staff.
  - Pre-flight dry-run validation, duplicate detection, and row-level error reporting.
  - Recurring scheduled jobs: automated fee invoice generation, overdue fine calculation, orphan document cleanup.
- **Entry Criteria**: BullMQ worker tier operational; all domain entities active.
- **Exit Criteria**: 5,000-row student fee import executes asynchronously with zero data corruption and full audit logging.
- **Classification**: **REQUIRED OPERATIONAL STABILITY**.

---

### Wave 9: SaaS Billing & Platform Subscription Operations
- **Objective**: Automate Justezy commercial operations, institution billing, and subscription management.
- **Scope**:
  - Self-serve plan upgrades/downgrades (`STARTER`, `STANDARD`, `PREMIUM`, `ENTERPRISE`).
  - Automated recurring SaaS subscription billing (Institution pays Justezy).
  - Add-on module licensing and quota enforcement (student/staff caps, storage limits).
  - Automated suspension on delinquent platform accounts.
- **Entry Criteria**: Platform control plane established; institutional tenant accounts active.
- **Exit Criteria**: Platform billing runs in strict isolation from tenant finance (ADR-009).
- **Classification**: **REQUIRED COMMERCIAL PLATFORM TIER**.

---

### Wave 10: Public API Platform & External Integrations
- **Objective**: Secure open integration ecosystem for external hardware and software.
- **Scope**:
  - Versioned REST APIs (`/api/v2/...`) with SHA-256 hashed API Keys and OAuth2 credentials.
  - Hardware integration endpoints: Biometric attendance machine sync, RFID school bus turnstiles.
  - Outbound webhook subscriptions for institutional third parties.
  - Export integrations for external accounting packages (Tally XML, QuickBooks CSV).
- **Entry Criteria**: V2 core domains stable and hardened across Waves 1–9.
- **Exit Criteria**: External API calls enforced by tenant scoping, atomic permissions, and dedicated rate limits.
- **Classification**: **OPTIONAL / ENTERPRISE EXTENSIBILITY (V2/V3 BOUNDARY)**.

---

## 3. V2 Feature Prioritization Matrix

| Module / Capability | Implementation Wave | Priority Level | Rationale & Architectural Dependency |
| :--- | :---: | :---: | :--- |
| **Fee Structures & Invoicing** | Wave 1 | **Required** | Primary commercial requirement for all fee-paying institutions. |
| **Online Payments & Gateways** | Wave 1 | **Required** | Parent convenience and automated collection reconciliation. |
| **Double-Entry General Ledger** | Wave 1 | **Required** | Accounting foundation; required by Fees, Payroll, and Inventory. |
| **Admissions & Conversion** | Wave 2 | **Required** | Feeds new student enrollments; collects admission fees. |
| **Library Management** | Wave 3 | **Important** | High-demand operational module; emits overdue fines to Finance. |
| **Transport Route Management** | Wave 3 | **Important** | Fleet operations; emits transport fees to Fee Invoices. |
| **Inventory & Consumables** | Wave 4 | **Important** | Track school assets and supplies; posts purchases to General Ledger. |
| **Staff HR & Leaves** | Wave 5 | **Required** | Staff tracking; leave balance directly affects payroll deductions. |
| **Integrated Staff Payroll** | Wave 5 | **Required** | Major institutional liability; posts directly to General Ledger. |
| **SMS (DLT) & WhatsApp Engine** | Wave 6 | **Important** | Critical communication channels for Indian educational market. |
| **Financial & Academic Reports**| Wave 7 | **Important** | Institutional decision-making; regulatory compliance. |
| **Bulk Import / Export Workers**| Wave 8 | **Required** | Smooth onboarding of large schools with thousands of records. |
| **SaaS Subscription Billing** | Wave 9 | **Required** | Commercial platform monetization and license gating. |
| **Public API & Webhooks** | Wave 10 | **Optional / V3**| Advanced integration; depends on fully stable core models. |
| **GPS Live Bus Tracking** | Wave 10 (V3) | **Future / V3** | High operational complexity; telematics hardware dependency. |
| **Biometric Facial Recognition**| Wave 10 (V3) | **Future / V3** | Hardware dependency; privacy/regulatory compliance overhead. |
| **AI Assessment Analytics** | V3 Roadmap | **Future / V3** | Experimental; non-essential for core institutional operations. |

---

## 4. Production Rollout & Zero-Downtime Migration Strategy

1. **Pre-Migration Safety Rehearsal**:
   - Every migration script must be validated against a sanitized production-volume staging database.
   - Rollback scripts must be verified prior to release authorization.
2. **Expand Phase (Schema Deployment)**:
   - Apply additive changes (new tables, nullable columns) using `npx prisma migrate deploy` during off-peak institutional hours.
3. **Data Backfill Phase**:
   - Seed default chart of accounts and default fee categories for existing tenants.
4. **Contract Phase**:
   - Apply non-null constraints and strict foreign key checks only after backfills are verified 100% clean.
5. **Canary Verification**:
   - Deploy new module code behind `ModuleEntitlement` flags. Enable pilot tenant (`dpa-delhi`) first before general availability.
