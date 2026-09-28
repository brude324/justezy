# STEP 17: V2 Wave 5 — HR & Payroll Architecture & Specification

## 1. Architecture Overview

V2 Wave 5 introduces two related but explicitly separated bounded contexts: **Human Resources (HR)** and **Payroll** for SchoolyardSMS / Justezy. The platform strictly enforces multi-tenant identity, role-based access control, atomic permissions, module entitlement checks, tenant-scoped database services, and Wave 1 double-entry financial integration:

```
Clerk Session (Identity / Authentication only)
  ↓
Application User (PostgreSQL)
  ↓
TenantMembership (Active institutional binding)
  ↓
RBAC (Role + Atomic Permission Catalog)
  ↓
Module Entitlement (hr_module & payroll_module — independently enabled, HTTP 402 on failure)
  ↓
AccessScope Engine (INSTITUTION_WIDE, ASSIGNED_ONLY, SELF_ONLY)
  ↓
Tenant-Scoped Domain Services (HRService, PayrollService)
  ↓
Target Prisma Client (Composite tenantId-scoped operations)
  ↓
PostgreSQL Database
```

### Bounded Context Separation
- **HR Bounded Context**: Owns staff master records (`HREmployment`) extending `StaffProfile`, employment contracts, departments, designations, work locations, work schedules, holiday calendars, leave types, leave balances, leave applications/approvals, and HR documents.
- **Payroll Bounded Context**: Owns salary components, salary structures, employee compensation assignments, payroll periods, payroll runs, deterministic Decimal-safe salary calculations, loss of pay deductions, payslips, payroll adjustments, and financial posting boundaries.
- **Service Boundaries**: Payroll reads required HR employment, attendance, and leave data, but **never** directly mutates HR domain records. HR **never** directly manipulates payroll calculation or ledger records.
- **Financial Integration Boundary**: Payroll integrates with the existing Wave 1 `LedgerService` (`postJournalEntry`) to post balanced journal vouchers. Payroll does not create a parallel general ledger or journal table.

---

## 2. HR Database Models (Target Schema Plane 19)

Normalized additive models added to [`prisma/schema.target.prisma`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/prisma/schema.target.prisma):
1. `HRDepartment`: Hierarchical departments and academic wings (`tenantId`, `code`, `name`, `parentDepartmentId`, `headStaffId`, `active`). Tenant-unique `[tenantId, code]`.
2. `HRDesignation`: Institutional titles and academic ranks (`tenantId`, `code`, `name`, `level`, `active`). Tenant-unique `[tenantId, code]`.
3. `HRWorkLocation`: Campus sites and branches (`tenantId`, `code`, `name`, `address`, `active`). Tenant-unique `[tenantId, code]`.
4. `HREmployment`: Authoritative institutional employee master linked 1-to-1 to existing `StaffProfile` (`tenantId`, `staffProfileId`, `employeeNumber`, `status`, `employmentType`, `departmentId`, `designationId`, `workLocationId`, `joiningDate`, `confirmationDate`, `exitDate`, `exitReason`, `emergencyContactJson`). Tenant-unique `[tenantId, employeeNumber]`.
5. `HREmploymentHistory`: Append-only audit trail of status, department, and designation changes (`tenantId`, `employmentId`, `previousStatus`, `newStatus`, `previousDepartmentId`, `newDepartmentId`, `reason`, `changedByUserId`).
6. `HREmploymentContract`: Formal contracts and agreements (`tenantId`, `employmentId`, `contractNumber`, `employmentType`, `startDate`, `endDate`, `probationPeriodDays`, `noticePeriodDays`, `status`, `documentReferenceId`).
7. `HRWorkSchedule` & `HREmployeeWorkSchedule`: Shifts, working hours, and expected working days.
8. `HRHolidayCalendar` & `HRHoliday`: Institutional and regional holiday schedules (`tenantId`, `calendarId`, `name`, `date`, `holidayType`).
9. `HRLeaveType`: Configurable leave categories (`tenantId`, `code`, `name`, `daysAllowedPerYear`, `isPaid`, `carryForwardDays`). Tenant-unique `[tenantId, code]`.
10. `HRLeaveBalance`: Annual quota and balance tracking (`tenantId`, `employmentId`, `leaveTypeId`, `year`, `allocatedDays`, `usedDays`, `pendingDays`). Tenant-unique `[tenantId, employmentId, leaveTypeId, year]`.
11. `HRLeaveRequest`: Staff leave applications (`tenantId`, `employmentId`, `leaveTypeId`, `startDate`, `endDate`, `daysCount`, `status`, `reason`, `approvedByUserId`, `approvedAt`, `rejectionReason`).
12. `HRAttendancePolicy` & `HRAttendanceRecord`: Institutional attendance rules, working hours, and punch records.
13. `HRDocument`: Sensitive employee documents (`tenantId`, `employmentId`, `documentType`, `title`, `documentReferenceId`).

---

## 3. Payroll Database Models (Target Schema Plane 20)

Normalized additive models added to [`prisma/schema.target.prisma`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/prisma/schema.target.prisma):
1. `SalaryComponent`: Reusable earnings, deductions, and employer contributions (`tenantId`, `code`, `name`, `type`, `calculationMethod`, `defaultAmount`, `percentage`, `isTaxable`, `isRecurring`). Tenant-unique `[tenantId, code]`.
2. `SalaryStructure` & `SalaryStructureItem`: Institutional salary templates and pay bands (`tenantId`, `code`, `name`, `description`, `active`). Tenant-unique `[tenantId, code]`.
3. `EmployeeCompensation` & `EmployeeCompensationItem`: Individual employee salary assignment snapshots (`tenantId`, `employmentId`, `salaryStructureId`, `effectiveFrom`, `effectiveTo`, `ctcAmount`, `grossAmount`, `netAmount`, `status`).
4. `PayrollPeriod`: Monthly or bi-weekly pay cycles (`tenantId`, `code`, `name`, `year`, `month`, `startDate`, `endDate`, `workingDays`, `status`). Tenant-unique `[tenantId, code]`.
5. `PayrollRun`: Institutional payroll processing batch (`tenantId`, `periodId`, `runNumber`, `status`, `calculationVersion`, `totalGross`, `totalDeductions`, `totalEmployerContributions`, `totalNet`, `journalEntryId`). Tenant-unique `[tenantId, periodId]`.
6. `Payslip` & `PayslipItem`: Immutable historical payslip records (`tenantId`, `payrollRunId`, `employmentId`, `periodId`, `grossEarnings`, `totalDeductions`, `employerContributions`, `netPay`, `workingDays`, `presentDays`, `unpaidLeaveDays`, `paymentStatus`). Tenant-unique `[tenantId, payrollRunId, employmentId]`.
7. `PayrollAdjustment`: Audited salary arrears, bonuses, reimbursements, or deduction corrections (`tenantId`, `employmentId`, `periodId`, `type`, `amount`, `reason`, `approvedByUserId`, `status`).

---

## 4. Lifecycle State Machines

### Employment Status Lifecycle
`ACTIVE` $\rightarrow$ `PROBATION` | `ON_NOTICE` | `ON_LEAVE` | `SUSPENDED` | `TERMINATED` | `RESIGNED` | `RETIRED`.
- Terminal statuses (`TERMINATED`, `RESIGNED`, `RETIRED`) cannot be reactivated without administrative intervention.
- All transitions generate append-only `HREmploymentHistory` entries.

### Contract Status Lifecycle
`DRAFT` $\rightarrow$ `ACTIVE` $\rightarrow$ `EXPIRED` | `TERMINATED` | `CANCELLED`.

### Leave Request Lifecycle
`DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `APPROVED` | `REJECTED` | `CANCELLED`.
- Self-approval is strictly prohibited: An employee cannot approve their own leave request (`403 Forbidden`).
- Submission reserves `pendingDays` on `HRLeaveBalance`. Approval converts `pendingDays` to `usedDays`. Rejection releases `pendingDays`.

### Payroll Period Lifecycle
`OPEN` $\rightarrow$ `PROCESSING` $\rightarrow$ `CALCULATED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `APPROVED` $\rightarrow$ `FINALIZED` $\rightarrow$ `LOCKED`.

### Payroll Run Lifecycle
`DRAFT` $\rightarrow$ `PROCESSING` $\rightarrow$ `CALCULATED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `APPROVED` $\rightarrow$ `FINALIZED` | `CANCELLED`.
- Finalization is idempotent: Calling finalize twice returns the existing finalized run and prevents duplicate accounting entries or outbox events.
- Once finalized, calculations and payslips are immutable; corrections require explicit `PayrollAdjustment` entries in subsequent periods.

---

## 5. Deterministic Salary Calculation Engine

Calculations use Prisma's `Decimal` type to eliminate JavaScript IEEE-754 floating point imprecision:
1. **Gross Earnings**: Sum of basic pay, allowances (HRA, transport, special), and active recurring earnings.
2. **Attendance & LOP Adjustments**: Loss of Pay (LOP) deduction is calculated deterministically:
   $$\text{LOP Deduction} = \frac{\text{Unpaid Leave Days}}{\text{Working Days}} \times \text{Basic Salary}$$
3. **Statutory & Standard Deductions**: Deductions computed from components or percentages (PF, professional tax, loan repayment).
4. **Net Pay**: $\text{Gross Earnings} - \text{Total Deductions}$.
5. **Historical Reproducibility**: Each run records `calculationVersion` and persists immutable `PayslipItem` line items. Subsequent changes to `SalaryStructure` do not affect past runs.

---

## 6. Financial Integration & Wave 1 GL Boundary

Payroll integrates with the existing Wave 1 `LedgerService`:
- When a payroll run is finalized with `postToGeneralLedger: true`, `PayrollService` calls `ledgerService.postJournalEntry` atomically.
- **Posting Structure**:
  - Debit: **Payroll Expense** (Gross salary + allowances)
  - Debit: **Employer Contribution Expense** (Employer PF/ESI)
  - Credit: **Payroll Payable** (Net salary payable to staff)
  - Credit: **Statutory / Contribution Payable** (Total deductions & contributions)
- **Balancing Invariant**: $\sum \text{Debits} = \sum \text{Credits}$ is enforced by the double-entry engine.
- Duplicate posting is prohibited: A unique `journalEntryId` is recorded on `PayrollRun`.

---

## 7. Security, Tenant Isolation & Access Control

1. **Multi-Tenancy**: Every institutional table contains `tenantId`. Database constraints reject foreign keys across tenants.
2. **Module Gating**: Both `hr_module` and `payroll_module` fail closed with `HTTP 402 Payment Required` when disabled.
3. **RBAC & Granular Permissions**:
   - 18 HR permissions (`hr.read`, `hr.create`, `hr.manage`, `hr.employee.read`, `hr.leave.approve`, etc.)
   - 13 Payroll permissions (`payroll.read`, `payroll.calculate`, `payroll.approve`, `payroll.finalize`, `payroll.accounting.post`, etc.)
   - System roles: `HR_MANAGER`, `HR_OFFICER`, `PAYROLL_MANAGER`, `PAYROLL_OFFICER`.
4. **AccessScope Enforcement**:
   - `INSTITUTION_WIDE`: Administrators access institutional data.
   - `ASSIGNED_ONLY`: Department-level scoping.
   - `SELF_ONLY`: Staff members can view only their own employment profile, leave, and payslips. Cross-staff salary exposure is blocked (`403 Forbidden`).
   - `LINKED_CHILDREN`: Does not expose payroll data to parents or guardians.

---

## 8. Audit Logging & Outbox Events

- **Audit Events**: `HR_EMPLOYEE_CREATED`, `HR_EMPLOYMENT_UPDATED`, `HR_LEAVE_APPROVED`, `PAYROLL_RUN_CALCULATED`, `PAYROLL_RUN_FINALIZED`. Sensitive salary metadata is minimized in audit diffs.
- **Outbox Events**: `hr.employee.created`, `hr.employment.changed`, `hr.leave.submitted`, `hr.leave.approved`, `payroll.run.calculated`, `payroll.run.finalized`, `payroll.accounting.posted`. All events are transactional and commit within the database transaction.
