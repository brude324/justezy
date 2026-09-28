# STEP 17: V2 Wave 5 — HR & Payroll Completion Report

## 1. Implementation Summary
Step 17 implements two related but explicitly decoupled bounded contexts: **Human Resources (HR)** and **Payroll** for the multi-tenant SaaS platform.
- **HR Bounded Context**: Authoritative employee master linked 1-to-1 to existing `StaffProfile` (zero duplicate user identities), hierarchical departments, designations, work locations, append-only employment history, employment contracts, holiday calendars, configurable leave types, multi-year leave balances, multi-tier leave approval workflows (with strictly enforced self-approval prohibitions), attendance feed integration, and employee document references.
- **Payroll Bounded Context**: Reusable earnings, deductions, and employer contributions (`SalaryComponent`), versioned compensation assignments (`EmployeeCompensation`), pay cycles with state-machine locks (`PayrollPeriod`), deterministic calculation batches (`PayrollRun`) with four-eye review/approval/finalization lifecycles, Decimal arithmetic (`@prisma/client/runtime/library`), attendance/LOP deductions, immutable historical payslips (`Payslip`), and audited payroll adjustments (`PayrollAdjustment`).
- **Financial Integration Boundary**: Payroll integrates with the existing Wave 1 `LedgerService` (`postJournalEntry`). No parallel accounting truth, general ledger, or journal tables were created.
- **Tenant Isolation**: Every institutional record has `tenantId` and tenant-scoped composite indexes/keys. Cross-tenant access is rejected at database and service layers.

---

## 2. Models (Target Schema Planes 19 & 20)
20 normalized multi-tenant models added to `prisma/schema.target.prisma`:

### Plane 19: Human Resources (HR)
1. `HRDepartment`: Hierarchical department structure (`tenantId`, `code`, `name`, `parentDepartmentId`, `headStaffId`, `active`). Tenant-unique `[tenantId, code]`.
2. `HRDesignation`: Job titles, academic ranks, and bands (`tenantId`, `code`, `name`, `level`, `active`). Tenant-unique `[tenantId, code]`.
3. `HRWorkLocation`: Campus locations and branches (`tenantId`, `code`, `name`, `address`, `active`). Tenant-unique `[tenantId, code]`.
4. `HREmployment`: Authoritative employee master linked 1-to-1 to `StaffProfile` (`tenantId`, `staffProfileId`, `employeeNumber`, `status`, `employmentType`, `departmentId`, `designationId`, `workLocationId`, `joiningDate`, `confirmationDate`, `exitDate`, `exitReason`, `emergencyContactJson`). Tenant-unique `[tenantId, employeeNumber]`.
5. `HREmploymentHistory`: Append-only transition log (`tenantId`, `employmentId`, `previousStatus`, `newStatus`, `previousDepartmentId`, `newDepartmentId`, `reason`, `changedByUserId`).
6. `HREmploymentContract`: Formal contract covenants and notice periods (`tenantId`, `employmentId`, `contractNumber`, `employmentType`, `startDate`, `endDate`, `probationPeriodDays`, `noticePeriodDays`, `status`, `documentReferenceId`).
7. `HRWorkSchedule` & `HREmployeeWorkSchedule`: Shifts, working hours, and schedules.
8. `HRHolidayCalendar` & `HRHoliday`: Institutional calendars and holiday exceptions.
9. `HRLeaveType`: Configurable leave allowances and carry-forward rules (`tenantId`, `code`, `name`, `daysAllowedPerYear`, `isPaid`, `carryForwardDays`). Tenant-unique `[tenantId, code]`.
10. `HRLeaveBalance`: Multi-year leave balances (`tenantId`, `employmentId`, `leaveTypeId`, `year`, `allocatedDays`, `usedDays`, `pendingDays`). Tenant-unique `[tenantId, employmentId, leaveTypeId, year]`.
11. `HRLeaveRequest`: Staff leave applications (`tenantId`, `employmentId`, `leaveTypeId`, `startDate`, `endDate`, `daysCount`, `status`, `reason`, `approvedByUserId`, `approvedAt`, `rejectionReason`).
12. `HRAttendancePolicy` & `HRAttendanceRecord`: Institutional attendance feeds.
13. `HRDocument`: Secure employee document references.

### Plane 20: Payroll Management
14. `SalaryComponent`: Reusable earnings, deductions, and employer contributions (`tenantId`, `code`, `name`, `type`, `calculationMethod`, `defaultAmount`, `percentage`, `isTaxable`, `isRecurring`). Tenant-unique `[tenantId, code]`.
15. `SalaryStructure` & `SalaryStructureItem`: Pay band templates and formulas (`tenantId`, `code`, `name`, `active`). Tenant-unique `[tenantId, code]`.
16. `EmployeeCompensation` & `EmployeeCompensationItem`: Effective salary assignments (`tenantId`, `employmentId`, `salaryStructureId`, `effectiveFrom`, `effectiveTo`, `ctcAmount`, `grossAmount`, `netAmount`, `status`).
17. `PayrollPeriod`: Institutional pay cycles with status locks (`tenantId`, `code`, `name`, `year`, `month`, `startDate`, `endDate`, `workingDays`, `status`). Tenant-unique `[tenantId, code]`.
18. `PayrollRun`: Institutional payroll run batches with calculation versioning (`tenantId`, `periodId`, `runNumber`, `status`, `calculationVersion`, `totalGross`, `totalDeductions`, `totalEmployerContributions`, `totalNet`, `journalEntryId`). Tenant-unique `[tenantId, periodId]`.
19. `Payslip` & `PayslipItem`: Immutable historical payslips (`tenantId`, `payrollRunId`, `employmentId`, `periodId`, `grossEarnings`, `totalDeductions`, `employerContributions`, `netPay`, `workingDays`, `presentDays`, `unpaidLeaveDays`, `paymentStatus`). Tenant-unique `[tenantId, payrollRunId, employmentId]`.
20. `PayrollAdjustment`: Audited arrears, bonuses, and loss-of-pay corrections (`tenantId`, `employmentId`, `periodId`, `type`, `amount`, `reason`, `approvedByUserId`, `status`).

---

## 3. Permissions (31 Atomic Permissions)
- **HR Permissions (18)**:
  - `hr.read`, `hr.create`, `hr.update`, `hr.manage`, `hr.employee.read`, `hr.employee.manage`, `hr.department.manage`, `hr.designation.manage`, `hr.contract.manage`, `hr.compensation.read`, `hr.compensation.manage`, `hr.leave.read`, `hr.leave.request`, `hr.leave.approve`, `hr.attendance.read`, `hr.document.read`, `hr.document.manage`, `hr.export`.
- **Payroll Permissions (13)**:
  - `payroll.read`, `payroll.create`, `payroll.update`, `payroll.manage`, `payroll.calculate`, `payroll.review`, `payroll.approve`, `payroll.finalize`, `payroll.adjust`, `payroll.payslip.read`, `payroll.payslip.manage`, `payroll.export`, `payroll.accounting.post`.

---

## 4. Roles (4 System Roles)
1. `HR_MANAGER`: Full institutional HR administration (`INSTITUTION_WIDE`).
2. `HR_OFFICER`: Department/assigned operational HR duties (`ASSIGNED_ONLY` or `INSTITUTION_WIDE`).
3. `PAYROLL_MANAGER`: Full payroll calculation, approval, and finalization authority (`INSTITUTION_WIDE`).
4. `PAYROLL_OFFICER`: Payroll preparation and review (`ASSIGNED_ONLY` or `INSTITUTION_WIDE`).
- Employee Self-Service: Limited to `SELF_ONLY` (own profile, own leave balance/requests, own payslips).
- Cross-Role Invariant: `LINKED_CHILDREN` strictly **prohibits** payroll access to parents/guardians.

---

## 5. Module Entitlements
- `hr_module`: Independent non-core module entitlement (default disabled).
- `payroll_module`: Independent non-core module entitlement (default disabled).
- Both fail closed with `HTTP 402 Payment Required` when disabled.
- Enabling HR does not automatically enable Payroll, and vice versa.

---

## 6. Services
- `HRService` (`src/lib/services/hr-service.ts`): Department/designation/location management, employee master registration, append-only history tracking, contract management, leave quota allocation, leave request/approval/rejection with self-approval guards, holiday calendars, and headcount reporting.
- `PayrollService` (`src/lib/services/payroll-service.ts`): Salary components, salary structures, versioned compensation assignments, pay periods, payroll runs, deterministic Decimal-safe salary calculations, attendance Loss of Pay (LOP) basic proration, payroll adjustments, four-eye review/approval/finalization lifecycles, idempotent finalization, immutable payslip generation, and GL posting.

---

## 7. Routes (19 Next.js App Router Routes)
All routes are module-gated and statically optimized:
- `/hr`: Institutional HR dashboard
- `/hr/employees`: Employee directory and staff master
- `/hr/employees/[id]`: Employee profile, contract, and history details
- `/hr/departments`: Departments and academic wings directory
- `/hr/designations`: Designations, seniority bands, and rank titles
- `/hr/contracts`: Active and expired employment contracts
- `/hr/compensation`: Compensation templates and staff assignments
- `/hr/leave`: Leave applications and approval queue
- `/hr/holidays`: Institutional holiday calendar
- `/hr/attendance`: Attendance feeds and working day reconciliations
- `/hr/documents`: Document references and compliance records
- `/hr/reports`: Headcount, departmental distribution, and turnover reports
- `/payroll`: Payroll operations dashboard
- `/payroll/periods`: Pay cycles and cycle locking
- `/payroll/runs`: Payroll calculation batches and finalization workflow
- `/payroll/employees`: Employee salary assignments
- `/payroll/salary-structures`: Salary components and pay band templates
- `/payroll/adjustments`: Arrears, bonuses, and deductions adjustments
- `/payroll/payslips`: Staff payslip records
- `/payroll/reports`: Payroll cost, tax liability, and accounting reconciliation reports

---

## 8. Financial Integration
- Integrated directly with Wave 1 [`LedgerService`](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/services/ledger-service.ts) (`postJournalEntry`).
- Balanced Double-Entry Posting:
  - Debit: **Payroll Expense** (Gross salary + allowances)
  - Debit: **Employer Contribution Expense** (Employer statutory contributions)
  - Credit: **Payroll Payable** (Net salary payable to staff)
  - Credit: **Statutory / Contribution Payable** (Total deductions & contributions)
- Total Debits == Total Credits verified.
- Fiscal period lock respected (closed periods reject postings).
- Idempotency verified: Re-finalizing does not duplicate journal entries.

---

## 9. Tenant Isolation
- Every table has a mandatory `tenantId` field with composite foreign keys and uniqueness constraints.
- Multi-tenant IDOR attack tests verify cross-tenant access rejection (`403 Forbidden` / `404 Not Found`).
- Cross-tenant employee linking, leave approval, and payroll runs are rejected.

---

## 10. Authorization & AccessScope
- Authorization enforces 4 layers:
  1. Authenticated Clerk identity
  2. Active institutional `TenantMembership`
  3. Module entitlement (`hr_module` / `payroll_module`)
  4. Role permission with `AccessScope` evaluation (`INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`).
- Self-approval is strictly prohibited: employees attempting to approve their own leave receive `403 Forbidden`.
- Salary confidentiality: ordinary teachers and parents have zero visibility into other staff salaries.

---

## 11. Audit & Outbox Events
- **Audit Logs**: `HR_EMPLOYEE_CREATED`, `HR_EMPLOYMENT_UPDATED`, `HR_LEAVE_APPROVED`, `PAYROLL_RUN_CALCULATED`, `PAYROLL_RUN_FINALIZED`.
- **Transactional Outbox Events**: `hr.employee.created`, `hr.employment.changed`, `hr.contract.created`, `hr.leave.submitted`, `hr.leave.approved`, `hr.leave.rejected`, `payroll.run.calculated`, `payroll.run.approved`, `payroll.run.finalized`, `payroll.accounting.posted`. All commit atomically within domain transactions.

---

## 12. Unit & Integration Tests
- **HR Suite (`tests/unit/hr/`)**: 13/13 passed.
- **Payroll Suite (`tests/unit/payroll/`)**: 11/11 passed (7 domain lifecycle + 4 financial GL integration).
- **Full Suite (`npm test`)**: 57 test files passed, 443/443 tests passed (100% pass rate).

---

## 13. Playwright E2E Tests
- `tests/e2e/hr-payroll.spec.ts`: 16/16 tests passed (100%). Covers module entitlement gating, HR directory, departments, designations, contracts, leave, holidays, reports, payroll periods, runs, staff salary, structures, adjustments, payslips, and payroll reports.

---

## 14. Static Verification Gates
- **Prisma Validate**: `The schema at prisma\schema.target.prisma is valid 🚀` (PASS).
- **TypeScript Static Check**: `npm run typecheck` $\rightarrow$ 0 errors (PASS).
- **ESLint**: `npm run lint` $\rightarrow$ 0 errors, 0 warnings (PASS).
- **Production Build**: `npm run build` $\rightarrow$ Compiled cleanly, 85 routes statically optimized (PASS).

---

## 15. Migration Verification
- Schema modifications follow the Expand-and-Contract strategy and are purely additive.
- Zero destructive column modifications or deletions of V1/V2/V3/V4 tables.
- Target schema validated via `npm run prisma:validate:target`.

---

## 16. Regression Results
All prior wave tests pass without regressions:
- V1 Core Academics & Settings: PASS
- Wave 1 Fees, Payments & Financial Ledger: PASS
- Wave 2 Admissions & CRM: PASS
- Wave 3 Library & Transport: PASS
- Wave 4 Inventory & Assets: PASS

---

## 17. Accepted Limitations
The following capabilities are explicitly deferred to future waves:
1. Full statutory tax calculation engine (PF/ESI/TDS government filing and API uploads). Configurable deduction components are supported.
2. Hardware biometric devices (physical fingerprint/facial recognition attendance devices).
3. GPS attendance tracking.
4. Direct banking payment gateway NEFT/RTGS automation.
5. Native mobile employee application.
6. Recruitment & ATS modules.
7. Omnichannel communications (Wave 6).

---

## 18. Known Risks
- Database connection strings with unencoded special characters in passwords must use standard URL encoding to prevent parser errors in standalone Prisma invocations.
- Large payroll calculations with >10,000 employees should be dispatched via background worker queues once background processing infrastructure is established.

---

## 19. Pilot Validation Checklist (For Step 18)
- [ ] Synthetic pilot tenant provisioning with `hr_module` and `payroll_module` enabled.
- [ ] Control tenant provisioning with both modules disabled (asserting HTTP 402).
- [ ] Employee master registration with realistic departmental hierarchy and designations.
- [ ] Leave application and four-eye manager approval flow.
- [ ] Monthly pay period creation and cycle locking.
- [ ] Attendance Loss of Pay (LOP) feed consumption.
- [ ] Payroll calculation run with gross, deduction, and net pay validation.
- [ ] Four-eye payroll approval and idempotent finalization.
- [ ] Balanced double-entry financial posting verification against Wave 1 general ledger.
- [ ] Cross-tenant IDOR attack rejection verification.
- [ ] Self-service payslip access validation under `SELF_ONLY` access scope.

---

## 20. Final Status

```
STEP 17 STATUS: V2 WAVE 5 READY FOR PILOT
```
