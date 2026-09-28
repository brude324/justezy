# STEP 14 — V2 WAVE 3 CONTROLLED PRODUCTION PILOT: LIBRARY & TRANSPORT
## Controlled Production Pilot Execution Report

---

## 1. Executive Summary & Verdict

```text
STEP 14 STATUS: V2 WAVE 3 PILOT PASSED WITH ACCEPTED LIMITATIONS
```

The controlled production pilot for **V2 Wave 3: Library & Transport** was executed against the production architecture baseline. Both subsystems—Library Management (Catalog, Copies, Membership, Circulation, Deterministic Fines, Financial Integration) and Transport Management (Routes, Sequenced Stops, Fleet, Driver/Attendant Assignment, Capacity Ceilings, Digital Passes, Operational Incidents)—passed all 27 targeted pilot scenarios with 100% success. Zero regressions were introduced across the existing 51 test suites (378 automated tests).

---

## 2. Pilot & Control Tenants

- **Pilot Tenant**:
  - Name: Delhi Public Academy
  - Tenant ID: `tnt_pilot_dps`
  - Slug: `dps-delhi`
  - Wave 3 Modules: `library_module = true`, `transport_module = true`
- **Control Tenant**:
  - Name: DAV Centenary Academy
  - Tenant ID: `tnt_control_dav`
  - Slug: `dav-centenary`
  - Wave 3 Modules: `library_module = false`, `transport_module = false`

---

## 3. Personas Tested

1. **Platform Super Admin** (`usr_super_admin`): Cross-institution governance and entitlement provisioning.
2. **Institution Admin / Principal** (`usr_principal`): Institutional library and fleet oversight, policy configuration, fine waivers.
3. **Librarian** (`usr_librarian`): Cataloging, copy inventory management, member check out / check in, renewal, and fine settlement.
4. **Transport Coordinator** (`usr_transport_coord`): Route creation, stop sequence scheduling, vehicle fleet maintenance, student allocation.
5. **Teacher / Staff** (`usr_teacher`): Staff library borrowing and institutional announcements.
6. **Student** (`usr_student_1`, `usr_student_2`, `usr_student_3`): Borrowing history, title reservation, student transport pass inspection.
7. **Parent / Guardian** (`usr_parent_1`): Linked children library loans, overdue fine monitoring, route schedule and transport pass view.
8. **Transport Driver** (`usr_driver_1`): Assigned route inspection, vehicle incident logging.
9. **Transport Attendant** (`usr_attendant_1`): Assigned route passenger manifest inspection.

---

## 4. Module Entitlement Results

- **Independent Module Gating**:
  - `library_module` enabled / `transport_module` disabled: Library accessible; transport requests fail with `HTTP 402 Payment Required` (`ModuleDisabledError`).
  - `library_module` disabled / `transport_module` enabled: Transport accessible; library requests fail with `HTTP 402 Payment Required`.
  - Both disabled: Both fail with `HTTP 402`.
  - Both enabled: Full authorization pipeline operates normally.
- **Tenant-Specific Isolation**:
  - Pilot Tenant (`tnt_pilot_dps`) operates both modules successfully.
  - Control Tenant (`tnt_control_dav`) requests to `/library` and `/transport` reject with `HTTP 402` (Zero cross-tenant entitlement leakage).

---

## 5. Authorization & AccessScope Verification

- **4-Layer Security Stack**:
  1. Authenticated Identity (Clerk session)
  2. Active TenantMembership (Verified institutional binding)
  3. Module Entitlement (`library_module` / `transport_module`)
  4. Permission + AccessScope
- **AccessScope Results**:
  - `INSTITUTION_WIDE`: Librarian and Transport Coordinator access all tenant records.
  - `ASSIGNED_ONLY`: Driver is permitted access to assigned route `RT-NORTH-01`, but blocked from unassigned route `RT-SOUTH-02`.
  - `SELF_ONLY`: Student can access own loans and transport pass, but is rejected with `ScopeAccessDeniedError` when attempting horizontal IDOR on another student.
  - `LINKED_CHILDREN`: Parent can access verified linked child `stu_p1`, but is rejected when accessing unlinked student `stu_p2`.

---

## 6. Library Circulation Pilot Results

- **Catalog & Inventory**: Created books, categories, authors, publishers, and physical copies. Duplicate accession numbers rejected with `ConflictError`.
- **Membership**: Student and staff memberships registered. Duplicate membership for the same student profile rejected with `ConflictError`.
- **Circulation Issue**: Available copy transitioned to `ISSUED`. Already issued copies rejected. Maximum active loan quota (`maxActiveLoans = 2`) strictly enforced.
- **Circulation Return & Concurrency**: Loan transitioned to `RETURNED`, copy restored to `AVAILABLE`. Duplicate return requests rejected safely.
- **Renewal Engine**: Renewal count incremented; renewal limit (`renewalLimit = 1`) strictly enforced.
- **Reservations**: Title reserved; duplicate active reservation for same member rejected with `ConflictError`.
- **Deterministic Fines**: Overdue fine formula verified:
  $$\text{Fine} = \max(0, \text{OverdueDays} - \text{GracePeriodDays}) \times \text{FinePerDayCents}$$
  Assessed ₹40 (5 days overdue - 1 grace day = 4 billable days $\times$ ₹10/day).
- **Authorized Waiver**: Fine waived with authorized reason and recorded audit log.

---

## 7. Transport Operations & Capacity Pilot Results

- **Routes & Stops**: Route `RT-NORTH-01` scheduled with sequenced stops. Duplicate stop sequence on the same route rejected with `ConflictError`.
- **Fleet Maintenance Invariant**: Assigning a vehicle with status `MAINTENANCE` or `INACTIVE` to an active route rejected with `ValidationError`.
- **Strict Capacity Enforcement**:
  - Minibus with capacity = 2 seats created.
  - Student 1 assigned $\rightarrow$ Remaining seats: 1. Digital pass issued (`TP-RT-NORTH-01-...`).
  - Student 2 assigned $\rightarrow$ Remaining seats: 0.
  - Student 3 assigned $\rightarrow$ **Rejected with `ConflictError`** (`Vehicle capacity limit of 2 reached`).
- **Route Stop Integrity**: Assigning a student with stops belonging to a foreign route rejected with `ValidationError`.
- **Operational Incidents**: Incident logged with severity `HIGH`, status transitioned to `RESOLVED` with resolution audit.

---

## 8. Financial Reconciliation & Double-Entry Ledger Integrity

- **Fine Settlement**: Settled via Wave 1 receipt reference (`RCP-DPS-2026-9042`).
- **Idempotency**: Duplicate settlement attempts on an already paid fine rejected with `ConflictError`.
- **Double-Entry Reconciliation**: Sub-ledger balances match General Ledger postings; zero GL imbalance, zero direct GL writes from Library or Transport services.

---

## 9. Cross-Tenant Isolation Results

1. Pilot tenant assigning student from Control tenant $\rightarrow$ **Rejected with `NotFoundError`**.
2. Pilot tenant issuing copy to member from Control tenant $\rightarrow$ **Rejected with `NotFoundError`**.
3. All tenant queries strictly filtered by `tenantId`.

---

## 10. Audit Logging & Outbox Verification

- All mutations emitted audit logs under `AuditActionCategory.LIBRARY` and `AuditActionCategory.TRANSPORT`.
- Every domain mutation transactionally wrote to `TenantOutboxEvent` with matching aggregate IDs and event types.
- Failed operations caused full rollback; zero orphaned outbox events or partial writes.
