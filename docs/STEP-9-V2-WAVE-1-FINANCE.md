# Step 9: V2 Wave 1 — Fees & Collections + Payment Engine + Financial Ledger

**Project**: SchoolyardSMS / Justezy Multi-Tenant Education SaaS  
**Phase**: Phase 9 — V2 Wave 1 Implementation  
**Date**: September 26, 2026  
**Status**: IMPLEMENTED & VALIDATED (READY FOR PILOT)  

---

## 1. Executive Implementation Summary

Phase 9 successfully delivers **Wave 1 of V2**: the complete foundational financial architecture for SchoolyardSMS / Justezy, comprising:
1. **Fees & Collections Subsystem**:
   - Institutional fee categories (`FeeCategory`)
   - Academic-year fee structures with frequency and due schedules (`FeeStructure`, `FeeStructureItem`)
   - Student fee assignments with concession/scholarship calculation (`StudentFeeAssignment`)
   - Formal fee invoicing with line-item charge heads and balance tracking (`FeeInvoice`, `FeeInvoiceItem`)
   - Invoice cancellation & voiding protections
2. **Provider-Agnostic Payment Engine**:
   - Gateway abstraction layer (`PaymentGatewayAdapter`, `MockPaymentGatewayAdapter`, `RazorpayPaymentGatewayAdapter`)
   - Payment intent generation (`PaymentIntent`)
   - Multi-mode payment recording (Online, Cash, Cheque, Bank Transfer, UPI, POS Card)
   - Strict payment allocation against invoice line items (`PaymentAllocation`)
   - Financial receipts generation (`receiptNumber`)
   - Controlled payment refunds with balance restoration (`PaymentRefund`)
   - Cryptographic webhook verification with persistent deduplication (`PaymentWebhookEvent`)
3. **Double-Entry Financial General Ledger (GL)**:
   - Institutional Chart of Accounts initialization (`ChartOfAccount`, `LedgerAccount`)
   - Fiscal year and financial period controls (`FiscalYear`, `FinancialPeriod`)
   - Balanced journal entry posting engine (`JournalEntry`, `JournalLine`)
   - Non-destructive reversal transactions (`status: REVERSED`)
   - Automatic debit/credit account balance propagation
4. **Transactional Outbox & Governance**:
   - Transactional outbox event emission (`TenantOutboxEvent`)
   - V2 dual-gate authorization (`fees_module`, `finance_module`)
   - AccessScopes (`INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN`)
   - Immutable audit logging across all monetary operations (`AuditLog`)

---

## 2. Architecture Mapping & Physical Schema

The target physical schema (`prisma/schema.target.prisma`) was expanded to incorporate Planes 11, 12, 13, and Outbox:

```
[FeeStructure] ──────> [FeeStructureItem]
       │                        │
       ▼                        ▼
[StudentFeeAssignment] ──> [FeeInvoice] ──────> [FeeInvoiceItem]
                                ▲                      ▲
                                │                      │
[Payment] ─────────────> [PaymentAllocation] ──────────┘
    │                           │
    ├─> [PaymentRefund]         │
    │                           ▼
    └──────────────────> [JournalEntry] ──────> [JournalLine]
                                ▲                      │
                                │                      ▼
                         [FinancialPeriod]      [LedgerAccount]
```

### Entities Established
- **Plane 11 (Fees)**: `FeeCategory`, `FeeStructure`, `FeeStructureItem`, `StudentFeeAssignment`, `FeeDiscount`, `FeeInvoice`, `FeeInvoiceItem`.
- **Plane 12 (Payments)**: `PaymentGatewayConfig`, `PaymentIntent`, `Payment`, `PaymentAllocation`, `PaymentRefund`, `PaymentWebhookEvent`.
- **Plane 13 (General Ledger)**: `FiscalYear`, `FinancialPeriod`, `ChartOfAccount`, `LedgerAccount`, `JournalEntry`, `JournalLine`.
- **Domain Outbox**: `TenantOutboxEvent`.

---

## 3. Financial Invariants & Integrity Controls

All 15 non-negotiable financial invariants established in Phase 8 are programmatically enforced:

| Invariant # | Invariant Rule | Implementation Mechanism |
| :--- | :--- | :--- |
| **Inv 1** | Tenant-Scoped Records | Compound indexing `[tenantId, ...]` on every table; queries filter by verified `tenantId`. |
| **Inv 2** | Balanced Journal Entries | `LedgerService.postJournalEntry` asserts $\sum \text{Debit} == \sum \text{Credit}$; throws `ValidationError` if unbalanced. |
| **Inv 3** | Immutability of Posted Entries | Posted journal entries reject direct edits; corrections require compensating reversal entries. |
| **Inv 4** | No Silent Deletion | Deletion of posted financial records is prohibited by business rules and relational foreign keys. |
| **Inv 5** | Reversal Compensating Transactions | `LedgerService.reverseJournalEntry` creates opposing entry (`REV-...`) with swapped debit/credit lines. |
| **Inv 6** | Auditable Payment Lifecycle | Every state transition logs to `AuditLog` and emits a domain event to `TenantOutboxEvent`. |
| **Inv 7** | Allocation Bound to Payment Amount | `PaymentService.recordPayment` asserts $\sum \text{allocations} \le \text{payment.amount}$. |
| **Inv 8** | Allocation Bound to Invoice Balance | `PaymentService.recordPayment` asserts $\text{allocation} \le \text{invoice.balanceAmount}$. |
| **Inv 9** | Non-Over-Refund Guarantee | `PaymentService.processRefund` asserts $\text{refund} \le \text{payment.amount} - \sum \text{priorRefunds}$. |
| **Inv 10** | Webhook Idempotency | `PaymentWebhookEvent` table enforces uniqueness on `(provider, eventId)`; duplicate events return immediately. |
| **Inv 11** | No Duplicate Financial Txns | Webhook replays do not repeat payments, invoice allocations, or journal postings. |
| **Inv 12** | Database Transaction Safety | Prisma `$transaction(async (tx) => ...)` wraps all multi-entity monetary updates. |
| **Inv 13** | Strict Tenant Isolation | Cross-tenant access is blocked at both authorization and database query layers. |
| **Inv 14** | Zero Boolean Financial State | No `paid = true/false` flags; financial truth is deterministically computed from charges, balances, and allocations. |
| **Inv 15** | Closed Period Posting Guard | Transactions reject posting into `CLOSED` or `LOCKED` `FinancialPeriod`s. |

---

## 4. Fee & Billing Lifecycle

```
1. Configuration:
   FeeCategory ("TUITION") ──> FeeStructure ("Class 10 Annual Fee") ──> FeeStructureItems

2. Student Binding:
   FeeStructure + Student ──> StudentFeeAssignment (Base: 50,000, Concession: 10,000, Net: 40,000)

3. Invoicing:
   StudentFeeAssignment ──> FeeInvoice (Subtotal: 20,000, Discount: 0, Balance: 20,000, Status: ISSUED)

4. Settlement:
   FeeInvoice + Payment (20,000) ──> PaymentAllocation (20,000) ──> FeeInvoice (Balance: 0, Status: PAID)
```

---

## 5. Payment & Webhook Architecture

### Gateway Abstraction Layer
The application core never directly imports external vendor SDKs:
- `PaymentGatewayAdapter` provides uniform contracts:
  - `createPaymentIntent(params)`
  - `verifyWebhookSignature(payload, signature, secret)`
  - `fetchTransactionStatus(transactionRef)`
  - `initiateRefund(params)`
- `MockPaymentGatewayAdapter`: Used in development, CI, and test suites.
- `RazorpayPaymentGatewayAdapter`: Production adapter for Indian institutions utilizing HMAC-SHA256 signature verification.

### Webhook Ingestion & Replay Defense
```
Inbound Webhook 
      │
      ▼
Verify HMAC-SHA256 Signature (timing-safe comparison)
      │
      ▼
Check PaymentWebhookEvent table for (provider, eventId)
      ├── Existing? ──> Log warning, return { duplicate: true, processed: true }
      └── New?
            │
            ▼
      Begin Database Transaction ($transaction):
            ├── Create PaymentWebhookEvent record
            ├── Transition PaymentIntent (PENDING -> SUCCESS)
            ├── Create Payment record
            ├── Allocate to FeeInvoice(s) (update balanceAmount & paidAmount)
            ├── Emit Outbox Events (fees.payment.received, fees.payment.allocated)
            ├── Mark PaymentWebhookEvent.isProcessed = true
            └── Commit Transaction
```

---

## 6. General Ledger Accounting Models

### Standard Chart of Accounts (COA)
Initialized per institution via `LedgerService.initializeChartOfAccounts`:
- `1010` — Cash on Hand (`ASSET`, `CASH`)
- `1020` — Operating Bank Account (`ASSET`, `BANK`)
- `1200` — Accounts Receivable - Student Fees (`ASSET`, `ACCOUNTS_RECEIVABLE`)
- `2010` — Accounts Payable - Vendors (`LIABILITY`, `ACCOUNTS_PAYABLE`)
- `3010` — Institutional Retained Surplus (`EQUITY`, `EQUITY_RETAINED`)
- `4010` — Tuition Fee Income (`REVENUE`, `TUITION_INCOME`)
- `4020` — Transport Fee Income (`REVENUE`, `TRANSPORT_INCOME`)
- `4030` — Library Fine Income (`REVENUE`, `LIBRARY_INCOME`)
- `5010` — Fee Concession & Scholarship Expense (`EXPENSE`, `OPERATING_EXPENSE`)
- `5020` — Fee Refund Adjustment Clearing (`EXPENSE`, `OPERATING_EXPENSE`)

### Normal Balances & Account Updates
- **Assets & Expenses**: Normal Debit balance ($\text{New Balance} = \text{Current Balance} + \text{Debit} - \text{Credit}$).
- **Liabilities, Equity & Revenue**: Normal Credit balance ($\text{New Balance} = \text{Current Balance} + \text{Credit} - \text{Debit}$).

---

## 7. Security, Authorization & Scopes

### Dual-Gate Pipeline
1. **Module Entitlement**:
   - `fees_module` controls fee structures, invoices, and online collection.
   - `finance_module` controls chart of accounts, journal postings, and period closing.
   - Disabled module throws `ModuleDisabledError` (HTTP 402).
2. **RBAC Permissions**:
   - `fees.read`, `fees.manage`, `fees.assign`, `fees.collect`, `fees.refund`
   - `finance.read`, `finance.manage`, `finance.post`, `finance.reconcile`
   - Missing permission throws `PermissionDeniedError` (HTTP 403).
3. **Horizontal AccessScopes**:
   - `INSTITUTION_WIDE`: Administrator, Finance Officer.
   - `ASSIGNED_ONLY`: Class Teacher (fee status of assigned section).
   - `LINKED_CHILDREN`: Parents/Guardians (can only view invoices/receipts of verified linked children via `StudentParentBinding`).
   - `SELF_ONLY`: Students (can only view their own fee dues).

---

## 8. Operational & Rollout Procedures

### Controlled Multi-Tenant Rollout Strategy
1. **Expand Target Schema**: Execute target schema update (`prisma:generate:target`).
2. **Internal Benchmark Tenant**: Initialize COA and fee structures on test institution (`tnt_default_benchmark`).
3. **Module Licensing**: Enable `fees_module` and `finance_module` selectively for Pilot Tenant via `TenantModuleEntitlement`.
4. **Data Verification**: Run financial integrity audit to verify zero unallocated payments or unbalanced journal entries.
5. **Broad Production Enablement**: Sequentially activate entitlements for production schools following pilot sign-off.
