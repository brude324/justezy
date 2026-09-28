# Step 8: V2 Architectural Decision Records (ADRs)

**Project**: SchoolyardSMS / Justezy Multi-Tenant Education SaaS  
**Phase**: Step 8 — V2 Architecture & Roadmap  
**Date**: September 26, 2026  
**Status**: APPROVED / ARCHITECTURAL SPECIFICATION  

---

## Index of V2 Architectural Decision Records

- [ADR-001: V2 Domain Boundaries & Bounded Contexts](#adr-001-v2-domain-boundaries--bounded-contexts)
- [ADR-002: Fees and Financial Transaction Model](#adr-002-fees-and-financial-transaction-model)
- [ADR-003: Double-Entry General Ledger Architecture & Financial Invariants](#adr-003-double-entry-general-ledger-architecture--financial-invariants)
- [ADR-004: Payment Gateway Adapter & Provider Abstraction](#adr-004-payment-gateway-adapter--provider-abstraction)
- [ADR-005: Payment Webhook Verification & Idempotency Engine](#adr-005-payment-webhook-verification--idempotency-engine)
- [ADR-006: Asynchronous Background Processing Tier (BullMQ + Redis)](#adr-006-asynchronous-background-processing-tier-bullmq--redis)
- [ADR-007: Reporting Architecture (Transactional vs. Materialized vs. Async)](#adr-007-reporting-architecture-transactional-vs-materialized-vs-async)
- [ADR-008: Multi-Channel Communication Provider Abstraction](#adr-008-multi-channel-communication-provider-abstraction)
- [ADR-009: Strict Separation of SaaS Billing vs. Tenant Institutional Finance](#adr-009-strict-separation-of-saas-billing-vs-tenant-institutional-finance)
- [ADR-010: V2 Database Migration & Schema Evolution Strategy](#adr-010-v2-database-migration--schema-evolution-strategy)
- [ADR-011: Public API & External Integrations Strategy](#adr-011-public-api--external-integrations-strategy)
- [ADR-012: Document Lifecycle & Secure Storage Strategy](#adr-012-document-lifecycle--secure-storage-strategy)

---

### ADR-001: V2 Domain Boundaries & Bounded Contexts

#### Context
V1 established the foundational multi-tenant identity, dynamic RBAC, academic structure, student profiles, attendance, assessments, and notifications. V2 expands Justezy into an integrated institutional operating system covering Fees, General Ledger, Admissions CRM, Library, Transport, Inventory/Assets, HR, and Payroll. Without rigorous bounded context partitioning, models from different disciplines risk tight coupling and circular dependencies.

#### Decision
We partition the V2 system into 20 explicit Bounded Contexts grouped across 18 Physical Schema Planes:
1. **Identity & Access Context**: Clerk authentication, Application `User`, `PlatformUser`.
2. **Tenant & Control Plane Context**: `Tenant`, `TenantPolicy`, `TenantBranding`, `SubscriptionPlan`.
3. **Membership & Dynamic RBAC Context**: `TenantMembership`, `Role`, `Permission`, `RolePermission`.
4. **Academic Structure Context**: `AcademicYear`, `Term`, `Grade`, `Class`, `Subject`.
5. **Student Lifecycle Context**: `StudentProfile`, `StudentEnrollment`, `StudentAcademicHistory`.
6. **Staff & Guardian Context**: `StaffProfile`, `ParentProfile`, `StudentParentBinding`.
7. **Timetable Context**: `TimetablePeriod`, `TimetableLesson`.
8. **Attendance Context**: `AttendanceRecord`, `AttendanceCorrection`, `AttendanceDailySummary`.
9. **Assessment & Grading Context**: `Exam`, `ExamPaper`, `ExamResult`, `GradingScheme`, `ReportCard`.
10. **Assignments Context**: `Assignment`, `AssignmentSubmission`.
11. **Communication Context**: `Announcement`, `Event`, `Notification`, `NotificationPreference`.
12. **Document & Media Context**: `DocumentReference`.
13. **Audit & Compliance Context**: `AuditLog`.
14. **Fees & Invoicing Context**: `FeeCategory`, `FeeStructure`, `StudentFeeAssignment`, `FeeInvoice`, `FeeDiscount`.
15. **Payments Context**: `PaymentGatewayConfig`, `PaymentIntent`, `Payment`, `PaymentAllocation`, `PaymentRefund`.
16. **Financial Ledger Context**: `FiscalYear`, `FinancialPeriod`, `ChartOfAccount`, `LedgerAccount`, `JournalEntry`, `JournalLine`.
17. **Admissions CRM Context**: `AdmissionSession`, `AdmissionEnquiry`, `AdmissionApplication`, `AdmissionInterview`, `AdmissionOffer`.
18. **Library Context**: `LibraryBranch`, `BookCategory`, `Book`, `BookCopy`, `LibraryMembership`, `BookBorrowRecord`, `LibraryFine`.
19. **Transport Context**: `TransportVehicle`, `TransportDriver`, `TransportRoute`, `RouteStop`, `StudentTransportAssignment`.
20. **Inventory & Assets Context**: `InventoryCategory`, `Vendor`, `InventoryItem`, `StockBatch`, `StockMovement`, `AssetRegister`.
21. **HR & Payroll Context**: `StaffLeavePolicy`, `StaffLeaveRequest`, `StaffAttendanceRecord`, `SalaryStructure`, `PayrollRun`, `Payslip`.

#### Consequences
- Each bounded context owns its entities, commands, and validation invariants.
- Cross-domain interactions occur strictly through explicit service interfaces and domain events, never through ad-hoc direct database joins.
- Shared database / shared schema multi-tenancy is maintained, with every institutional record strictly scoped by `tenantId`.

---

### ADR-002: Fees and Financial Transaction Model

#### Context
A frequent anti-pattern in naive school software is modeling fees as a simple boolean flag (`paid = true/false`) or a mutable balance column. This makes partial payments, scholarship concessions, late fees, multi-child payments, refunds, and financial auditing impossible to reconcile.

#### Decision
We mandate an auditable, invoice-and-allocation financial transaction model:
1. **FeeStructure**: Defines the institutional fee schedule per grade/academic year broken into discrete `FeeStructureItem`s (e.g. Tuition, Lab, Term 1 Bus, Sports).
2. **StudentFeeAssignment**: Binds a fee structure to an individual student, applying personalized scholarship/concession adjustments.
3. **FeeInvoice**: Represents an immutable legal demand for payment issued to the student/parent, with explicit `dueDate`, `subtotalAmount`, `discountAmount`, `paidAmount`, and `balanceAmount`.
4. **Payment**: Represents an actual inflow of funds (via gateway, UPI QR, cheque, or cash), generating a permanent receipt number.
5. **PaymentAllocation**: A junction record that distributes payment amounts across specific invoices and invoice line items. This enables:
   - Partial payments (e.g., paying ₹10,000 toward a ₹25,000 invoice).
   - Multi-invoice payments (a single parent payment settling Term 1 tuition + lab fee).
   - Overpayments credited to student balance.
6. **PaymentRefund**: Explicit refund transaction referencing the original `Payment`, with reason and reversal audit trail.

#### Invariants
- Invoices are never silently mutated once payments are allocated.
- Outstanding balance is computed as: `balanceAmount = subtotalAmount - discountAmount - sum(allocatedPayments) + sum(refunds)`.
- Financial balance adjustments require an explicit credit/debit memo.

---

### ADR-003: Double-Entry General Ledger Architecture & Financial Invariants

#### Context
Educational institutions require formal bookkeeping to track cash flow, tuition revenue, receivables, staff salary liabilities, and asset depreciation. Peripheral modules (Fees, Transport, Library, Payroll, Inventory) must not create siloed ledgers.

#### Decision
We implement a unified, multi-tenant double-entry General Ledger in Plane 13:
1. **Chart of Accounts**: Standardized accounts (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`) customized per tenant.
2. **Fiscal Years & Periods**: Financial transactions must fall within an `OPEN` `FinancialPeriod`. Closed periods cannot accept mutations without formal reopening by Platform/Tenant Super Admins.
3. **Journal Entries & Lines**:
   - Every journal entry consists of balanced debits and credits: `sum(debitAmount) == sum(creditAmount)`.
   - Immutable once posted (`status: POSTED`).
   - Corrections must be made via reversal entries (`status: REVERSED`), never via SQL `UPDATE` or `DELETE`.
4. **Source Document Referencing**:
   - Every operational transaction that has a financial effect (Invoice issuance, Fee collection, Refund, Payroll disbursement, Vendor purchase, Transport maintenance) automatically posts a corresponding `JournalEntry` referencing `sourceType` and `sourceId`.

#### Example Journal Posting
*Parent pays ₹15,000 tuition fee via Netbanking:*
- Debit: Bank Account (Asset) +₹15,000
- Credit: Accounts Receivable - Tuition (Asset) -₹15,000
- Balanced: ₹15,000 == ₹15,000.

---

### ADR-004: Payment Gateway Adapter & Provider Abstraction

#### Context
Institutions in India and international markets use different payment aggregators (Razorpay, Cashfree, PayU, Stripe). Hardcoding a single gateway SDK directly into fee checkout tightly couples domain logic to third-party vendor APIs.

#### Decision
We introduce a `PaymentGatewayAdapter` interface that abstracts all third-party interactions:
```typescript
export interface PaymentGatewayAdapter {
  createOrder(intent: CreatePaymentIntentParams): Promise<GatewayOrderResult>;
  verifyWebhookSignature(payload: string, headers: Record<string, string>, secret: string): boolean;
  parseWebhookEvent(payload: string): ParsedGatewayEvent;
  initiateRefund(params: RefundParams): Promise<GatewayRefundResult>;
}
```
- Domain services interact exclusively with `PaymentGatewayAdapter`.
- Specific adapters (`RazorpayAdapter`, `CashfreeAdapter`, `StripeAdapter`) implement the interface.
- Institutional gateway credentials (`keyId`, encrypted secret) are stored in `PaymentGatewayConfig` per tenant.
- Sensitive credentials, raw credit card PANs, and CVVs are **never stored** in the application database (PCI-DSS compliance via hosted checkout / tokenization).

---

### ADR-005: Payment Webhook Verification & Idempotency Engine

#### Context
Payment gateway webhooks are asynchronous, subject to network retries, and can arrive out of order or multiple times for the same transaction. Processing duplicate webhooks can double-credit student fee balances or generate duplicate journal entries.

#### Decision
We mandate an idempotent payment webhook processing pipeline:
1. **Cryptographic Verification**: Webhook signatures are validated using provider HMAC-SHA256 secrets before reading request bodies.
2. **Webhook Event Log**: Every incoming event is logged in `PaymentWebhookEvent` with `provider`, `eventId`, and raw payload.
3. **Unique Constraint Deduplication**: A unique index on `@@index([provider, eventId])` ensures duplicate deliveries are immediately detected.
4. **State Machine Processing**:
   - If `eventId` has already been processed (`isProcessed: true`), the endpoint immediately returns HTTP 200 without re-allocating funds.
   - Processing executes inside an atomic database transaction: `PaymentIntent` transition -> `Payment` creation -> `PaymentAllocation` -> `FeeInvoice` balance update -> `JournalEntry` posting.
5. **Fail-Safe Acknowledgment**: Unhandled exceptions leave `isProcessed: false` and record `errorMessage` for operator review without dropping the event.

---

### ADR-006: Asynchronous Background Processing Tier (BullMQ + Redis)

#### Context
In V1, all operations executed synchronously within Next.js API/action lifecycles. In V2, workloads such as bulk student/fee imports (1,000+ rows), scheduled fee reminder dispatches (10,000+ SMS/WhatsApp messages), automated payroll calculations, report card PDF generation, and recurring fee generation will exceed synchronous request timeouts (15s–30s).

#### Decision
We introduce an asynchronous worker queue tier using **BullMQ backed by Redis**:
- **Queue Responsibilities**:
  - `notification-queue`: Email, SMS, WhatsApp dispatches.
  - `import-queue`: Asynchronous large dataset ingestion (CSV/XLSX).
  - `billing-queue`: Recurring fee generation and invoice posting.
  - `report-queue`: Heavy analytical PDF/Excel snapshot rendering.
  - `maintenance-queue`: Document orphan sweeps, audit retention archival.
- **Tenant Context Preservation**: Every BullMQ job payload **must** carry `tenantId` and `actorUserId`. The worker executes using `runWithTenantContext` to ensure tenant isolation invariants are preserved in background threads.
- **Dead Letter Queue (DLQ)**: Jobs failing after 3 exponential backoff retries are routed to a DLQ with structured error logs and alert triggers.

---

### ADR-007: Reporting Architecture (Transactional vs. Materialized vs. Async)

#### Context
Running complex analytical queries (e.g. cross-term academic progress, annual fee collection vs. receivables, staff attendance vs. payroll) directly against live transactional tables risks connection pool starvation and database lock contention.

#### Decision
We adopt a three-tier reporting model:
1. **Tier 1: Operational Transactional Queries**
   - Direct Prisma queries for daily operational screens (e.g. today's attendance summary, single student fee statement).
   - Scoped strictly by `tenantId` with indexed foreign keys.
2. **Tier 2: Read-Optimized Aggregation Views**
   - For dashboards and management summaries (monthly fee collection by head, grade-wise exam averages), use database-level read views or PostgreSQL Materialized Views refreshed periodically or on significant mutation events.
3. **Tier 3: Asynchronous Long-Running Reports**
   - Comprehensive institution exports, CBSE/State Board compliance sheets, and historical financial balance sheets are offloaded to `report-queue` workers.
   - Rendered reports are stored in object storage (`DocumentReference`) and delivered to the user via in-app download link.

---

### ADR-008: Multi-Channel Communication Provider Abstraction

#### Context
Schools in India communicate via SMS (mandatory DLT template registration), WhatsApp Business API, and Email. Directly binding communication triggers to external telecom APIs creates vendor lock-in and brittle error handling.

#### Decision
We implement a provider-independent multi-channel communication engine:
1. **Channel Abstraction**:
   - `NotificationService` routes messages through channel drivers: `EmailDriver` (Resend/SES), `SmsDriver` (Gupshup/Exotel with DLT entity/template IDs), and `WhatsAppDriver`.
2. **Template Engine**:
   - Messages use parameterized templates with localization tokens: `{{studentName}}`, `{{amount}}`, `{{dueDate}}`.
3. **Notification Preferences**:
   - Evaluates `NotificationPreference` per recipient (user opt-in/opt-out per category).
4. **Delivery Audit & Status**:
   - All dispatches are tracked with delivery status (`QUEUED`, `SENT`, `DELIVERED`, `FAILED`) and provider message reference for auditing and troubleshooting.

---

### ADR-009: Strict Separation of SaaS Billing vs. Tenant Institutional Finance

#### Context
There are two completely separate financial domains in a multi-tenant SaaS:
1. **SaaS Billing (Control Plane)**: Educational institutions paying Justezy SaaS for platform subscriptions, quotas, and module add-ons.
2. **Tenant Finance (Institutional Domain)**: Parents, students, and sponsors paying the school for tuition, uniforms, bus fares, and meals.
Confusing these two planes or sharing ledger accounts violates data privacy and introduces catastrophic tenant boundary leaks.

#### Decision
We enforce strict physical and logical separation:
- **Plane 1 (SaaS Control Plane)**: Owns `SubscriptionPlan`, `TenantModuleEntitlement`, and future platform-level invoicing entities.
- **Plane 11–13 (Institutional Domain)**: Owns institutional `FeeStructure`, `FeeInvoice`, `Payment`, `ChartOfAccount`, and `JournalEntry`.
- Institutional ledger accounts and payments **never** reference platform SaaS subscription fees.
- Platform operators have zero visibility into institutional ledger details without explicit audit-logged support authorization.

---

### ADR-010: V2 Database Migration & Schema Evolution Strategy

#### Context
Migrating a live multi-tenant database to V2 requires adding 30+ new models across 8 planes without downtime, locking existing tables, or breaking running V1 institutional operations.

#### Decision
We adopt the **Expand-and-Contract Migration Pattern**:
1. **Expand Phase**:
   - New V2 tables (Planes 11–18) and nullable foreign keys are applied to PostgreSQL using `prisma migrate deploy`.
   - Existing V1 tables remain completely intact. No columns are dropped or renamed.
2. **Backfill Phase**:
   - Deterministic backfill scripts populate default charts of accounts, fee categories, and system roles for existing production tenants.
3. **Contract Phase**:
   - Constraints, non-null requirements, and foreign keys on V2 tables are hardened once data consistency is validated.
4. **Zero-Downtime Rule**:
   - Schema migrations must never execute table rewrites during peak school hours.
   - All migrations must be rehearsed in staging against production-volume snapshots before production release.

---

### ADR-011: Public API & External Integrations Strategy

#### Context
Educational institutions require integrations with external biometric attendance hardware, RFID bus turnstiles, library barcode scanners, and third-party accounting software (Tally, QuickBooks).

#### Decision
We architect the Public Integration Layer with enterprise API standards:
1. **API Versioning**: URL-path versioning (`/api/v2/...`).
2. **Authentication & Authorization**:
   - External machines/integrations authenticate using tenant-scoped API Keys (`X-API-Key` hashed with SHA-256 in database) or OAuth2 Client Credentials.
   - API keys are bound to specific `AccessScope` and atomic permissions (e.g. `attendance.biometric.sync`, `finance.export`).
3. **Webhook Subscriptions**: External third parties can subscribe to outbound tenant domain events (`StudentEnrolled`, `FeePaid`, `AttendanceMarked`) with HMAC secret signature verification.
4. **Rate Limiting**: Integration endpoints have dedicated rate limit quotas independent of user UI traffic.

---

### ADR-012: Document Lifecycle & Secure Storage Strategy

#### Context
V2 introduces sensitive documents: student admission birth certificates/Aadhaar cards, staff employment contracts, salary payslips, fee receipts, and vehicle insurance policies. Exposing direct S3/R2 storage buckets or public URLs creates critical privacy and compliance liabilities.

#### Decision
We extend the `DocumentReference` architecture established in Step 5:
1. **Tenant-Isolated S3/R2 Partitioning**:
   - Storage keys follow: `tenants/{tenantId}/{entityType}/{entityId}/{uuid}-{filename}`.
2. **Pre-Signed Upload & Download URLs**:
   - Clients never receive storage credentials. Uploads and downloads use time-limited pre-signed URLs (maximum 15-minute validity).
3. **Authorization-Guarded Access**:
   - Downloading a student document or payslip requires evaluating the caller's `TenantContext`, `Permission`, and `AccessScope` (e.g. parents can only access linked children documents).
4. **MIME & Size Enforcement**:
   - Magic byte verification and maximum file size limits (5MB for images, 10MB for PDFs) before persisting metadata.
5. **Orphan Cleanup**:
   - Uncommitted uploads and soft-deleted documents are scheduled for automated bucket sweeping via background worker.

---

## 3. Decision Register Summary

| ADR Reference | Topic | Confirmed Status | Implementation Wave |
| :--- | :--- | :---: | :---: |
| **ADR-001** | V2 Domain Boundaries & Bounded Contexts | APPROVED | Wave 0 |
| **ADR-002** | Fees & Financial Transaction Model | APPROVED | Wave 1 |
| **ADR-003** | Double-Entry General Ledger Engine | APPROVED | Wave 1 |
| **ADR-004** | Payment Gateway Adapter & Provider Abstraction | APPROVED | Wave 1 |
| **ADR-005** | Payment Webhook Verification & Idempotency | APPROVED | Wave 1 |
| **ADR-006** | Asynchronous Processing (BullMQ + Redis) | APPROVED | Wave 1 / Wave 8 |
| **ADR-007** | Three-Tier Reporting & Analytics Architecture | APPROVED | Wave 7 |
| **ADR-008** | Multi-Channel Communication Provider Abstraction | APPROVED | Wave 6 |
| **ADR-009** | Separation of SaaS Billing vs. Tenant Finance | APPROVED | Wave 0 / Wave 9 |
| **ADR-010** | Database Migration Strategy (Expand-and-Contract) | APPROVED | Wave 0–10 |
| **ADR-011** | Public API & External Integrations Strategy | APPROVED | Wave 10 |
| **ADR-012** | Document Lifecycle & Secure Pre-Signed Storage | APPROVED | Wave 1–5 |
