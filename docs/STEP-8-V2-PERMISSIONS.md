# Step 8: V2 Dynamic RBAC, Permissions & Entitlement Catalog

**Project**: SchoolyardSMS / Justezy Multi-Tenant Education SaaS  
**Phase**: Step 8 — V2 Architecture & Roadmap  
**Date**: September 26, 2026  
**Status**: APPROVED SPECIFICATION  

---

## 1. Overview of V2 Authorization Architecture

V2 strictly maintains the Dual-Gate Authorization Pipeline established in Steps 4D and 4E:
```
Request
  ↓
Gate 0: Tenant Status (ACTIVE) & Membership Status (ACTIVE)
  ↓
Gate 1: Module Entitlement Gate (asserts institution licensed the requested module)
  ↓
Gate 2: Role Permission Gate (asserts caller's role possesses atomic permission)
  ↓
Gate 3: Horizontal AccessScope Gate (asserts relation boundary: INSTITUTION_WIDE, ASSIGNED_ONLY, SELF_ONLY, LINKED_CHILDREN)
  ↓
Execution
```

- **HTTP 401 Unauthorized**: Caller is unauthenticated.
- **HTTP 402 Payment Required**: Institution has not licensed/enabled the target module (`MODULE_DISABLED`).
- **HTTP 403 Forbidden**: Role lacks atomic permission or horizontal scope boundary is violated (`FORBIDDEN` / `SCOPE_ACCESS_DENIED` / `TENANT_SUSPENDED`).

---

## 2. V2 Module Entitlements Catalog

Every institutional tenant can license core and optional modules. Core modules are always enabled; optional modules require active subscription or add-on entitlement:

| Module Key | Display Name | Core / Optional | Associated Domains |
| :--- | :--- | :---: | :--- |
| `core_academics` | Core Academics & Structure | **Core** | Academic calendar, classes, subjects, grades |
| `attendance_module` | Attendance Management | **Core** | Student attendance & daily summaries |
| `communication_module` | Basic Announcements | **Core** | School notices, holiday circulars |
| `report_card_module` | Examinations & Report Cards | Optional | Summative exams, grading schemes, report cards |
| `timetable_module` | Timetable & Scheduling | Optional | Periods, timetable grid, lesson scheduling |
| `fees_module` | Fees & Collections | **Optional** | Fee structures, student billing, online payments, receipts |
| `finance_module` | Financial General Ledger | **Optional** | Chart of accounts, journal entries, balance sheets |
| `admissions_module` | Admissions & Enquiry CRM | **Optional** | Enquiries, applications, entrance tests, enrollment conversion |
| `library_module` | Library Management | **Optional** | Catalog, book accession, borrowing, overdue fines |
| `transport_module` | Transport & Fleet | **Optional** | Routes, bus stops, vehicle tracking, transport allocations |
| `inventory_module` | Inventory & Asset Management | **Optional** | Stores, stock batches, purchase entries, asset register |
| `hr_module` | Staff HR & Leaves | **Optional** | Staff attendance, leave policies, document dossiers |
| `payroll_module` | Staff Payroll & Payslips | **Optional** | Salary structures, allowances, deductions, payslips |
| `advanced_communication_module` | Multi-Channel Messaging | **Optional** | SMS (DLT), WhatsApp Business API, scheduled broadcasts |
| `analytics_module` | Advanced Institutional Analytics | **Optional** | Cross-domain analytics, cohort retention, financial trends |

---

## 3. V2 Atomic Permissions Catalog

Permissions follow the standard convention: `<domain>.<entity>.<verb>` or `<domain>.<verb>`.

### 3.1 Fees & Collections (`fees_module`)
| Permission Key | Verb | Allowed Access Scopes | Description |
| :--- | :--- | :--- | :--- |
| `fees.structure.read` | read | `INSTITUTION_WIDE` | View fee categories, structures, and installment rules |
| `fees.structure.manage` | manage | `INSTITUTION_WIDE` | Create, update, or deactivate institutional fee structures |
| `fees.assignment.read` | read | `INSTITUTION_WIDE`, `SELF_ONLY`, `LINKED_CHILDREN` | View assigned fees and concessions for students |
| `fees.assignment.manage` | manage | `INSTITUTION_WIDE` | Assign fee structures and scholarships to students |
| `fees.invoice.read` | read | `INSTITUTION_WIDE`, `SELF_ONLY`, `LINKED_CHILDREN` | View student fee invoices and outstanding dues |
| `fees.invoice.create` | create | `INSTITUTION_WIDE` | Generate and issue fee invoices (single or bulk) |
| `fees.invoice.void` | void | `INSTITUTION_WIDE` | Void or cancel unpaid/disputed fee invoices |
| `fees.collect` | collect | `INSTITUTION_WIDE` | Record manual payments (cash, cheque, POS) and generate receipts |
| `fees.online_pay` | pay | `SELF_ONLY`, `LINKED_CHILDREN` | Initiate online payment via gateway checkout |
| `fees.receipt.read` | read | `INSTITUTION_WIDE`, `SELF_ONLY`, `LINKED_CHILDREN` | Download official fee payment receipts |
| `fees.refund` | refund | `INSTITUTION_WIDE` | Authorize and execute fee payment refunds |
| `fees.discount.manage` | manage | `INSTITUTION_WIDE` | Manage scholarship and concession policies |

### 3.2 Financial General Ledger (`finance_module`)
| Permission Key | Verb | Allowed Access Scopes | Description |
| :--- | :--- | :--- | :--- |
| `finance.account.read` | read | `INSTITUTION_WIDE` | View chart of accounts and ledger balances |
| `finance.account.manage` | manage | `INSTITUTION_WIDE` | Create and configure ledger accounts |
| `finance.period.manage` | manage | `INSTITUTION_WIDE` | Open, close, or lock financial fiscal periods |
| `finance.journal.read` | read | `INSTITUTION_WIDE` | View posted journal entries and audit trails |
| `finance.journal.post` | post | `INSTITUTION_WIDE` | Create manual journal adjustment entries |
| `finance.journal.reverse` | reverse | `INSTITUTION_WIDE` | Reverse incorrect posted journal entries |
| `finance.report.read` | read | `INSTITUTION_WIDE` | Generate trial balances, income statements, balance sheets |
| `finance.reconcile` | reconcile | `INSTITUTION_WIDE` | Perform bank and payment gateway reconciliations |

### 3.3 Admissions & Enquiry CRM (`admissions_module`)
| Permission Key | Verb | Allowed Access Scopes | Description |
| :--- | :--- | :--- | :--- |
| `admissions.enquiry.read` | read | `INSTITUTION_WIDE` | View admission enquiries and prospect pipeline |
| `admissions.enquiry.manage` | manage | `INSTITUTION_WIDE` | Record new enquiries, update follow-ups, change status |
| `admissions.application.read` | read | `INSTITUTION_WIDE` | View submitted admission applications and documents |
| `admissions.application.submit`| create | `PUBLIC`, `SELF_ONLY` | Submit digital admission application form |
| `admissions.document.verify` | verify | `INSTITUTION_WIDE` | Verify submitted applicant identity and academic documents |
| `admissions.interview.conduct`| evaluate | `INSTITUTION_WIDE`, `ASSIGNED_ONLY` | Record applicant interview notes, test marks, ratings |
| `admissions.decision.make` | decide | `INSTITUTION_WIDE` | Issue acceptance offers, provisional offers, waitlists |
| `admissions.convert` | convert | `INSTITUTION_WIDE` | Convert confirmed applicant to active `StudentProfile` |

### 3.4 Library Management (`library_module`)
| Permission Key | Verb | Allowed Access Scopes | Description |
| :--- | :--- | :--- | :--- |
| `library.catalog.read` | read | `INSTITUTION_WIDE` | Search and browse book catalog and availability |
| `library.catalog.manage` | manage | `INSTITUTION_WIDE` | Add books, edit metadata, manage accession numbers |
| `library.circulation.issue` | issue | `INSTITUTION_WIDE` | Check out books to student or staff members |
| `library.circulation.return`| return | `INSTITUTION_WIDE` | Return borrowed books, inspect condition |
| `library.circulation.renew` | renew | `INSTITUTION_WIDE`, `SELF_ONLY` | Renew borrowed book loan duration |
| `library.fine.manage` | manage | `INSTITUTION_WIDE` | Calculate, waive, or collect overdue book fines |
| `library.membership.manage` | manage | `INSTITUTION_WIDE` | Manage patron cards, borrowing limits, status |

### 3.5 Transport Management (`transport_module`)
| Permission Key | Verb | Allowed Access Scopes | Description |
| :--- | :--- | :--- | :--- |
| `transport.route.read` | read | `INSTITUTION_WIDE`, `LINKED_CHILDREN` | View bus routes, timings, and stop lists |
| `transport.route.manage` | manage | `INSTITUTION_WIDE` | Create and modify routes, stops, and schedules |
| `transport.vehicle.manage` | manage | `INSTITUTION_WIDE` | Manage fleet vehicles, fitness, insurance, maintenance |
| `transport.driver.manage` | manage | `INSTITUTION_WIDE` | Manage driver licenses, background checks, duty logs |
| `transport.assignment.read` | read | `INSTITUTION_WIDE`, `SELF_ONLY`, `LINKED_CHILDREN` | View student transport allocations and bus stop |
| `transport.assignment.manage`| manage | `INSTITUTION_WIDE` | Allocate students to bus routes and stops |

### 3.6 Inventory & Asset Management (`inventory_module`)
| Permission Key | Verb | Allowed Access Scopes | Description |
| :--- | :--- | :--- | :--- |
| `inventory.item.read` | read | `INSTITUTION_WIDE` | View store catalog, current stock, reorder levels |
| `inventory.item.manage` | manage | `INSTITUTION_WIDE` | Create inventory items, update categories |
| `inventory.stock.receive` | receive | `INSTITUTION_WIDE` | Inward purchase stock batches from vendors |
| `inventory.stock.issue` | issue | `INSTITUTION_WIDE` | Issue consumable stock to staff, departments, classes |
| `inventory.stock.adjust` | adjust | `INSTITUTION_WIDE` | Adjust physical stock counts and write off damaged items |
| `inventory.asset.manage` | manage | `INSTITUTION_WIDE` | Register fixed assets, tag barcodes, track condition |
| `inventory.asset.assign` | assign | `INSTITUTION_WIDE` | Assign assets (laptops, lab equipment) to staff |

### 3.7 Staff HR & Leaves (`hr_module`)
| Permission Key | Verb | Allowed Access Scopes | Description |
| :--- | :--- | :--- | :--- |
| `hr.staff.read` | read | `INSTITUTION_WIDE` | View staff employee dossiers and qualification records |
| `hr.staff.manage` | manage | `INSTITUTION_WIDE` | Onboard staff, manage employment contracts, record exits |
| `hr.attendance.read` | read | `INSTITUTION_WIDE`, `SELF_ONLY` | View staff biometric/daily attendance records |
| `hr.attendance.mark` | mark | `INSTITUTION_WIDE` | Mark or correct staff daily attendance |
| `hr.leave.apply` | create | `SELF_ONLY` | Submit staff leave application |
| `hr.leave.approve` | approve | `INSTITUTION_WIDE`, `ASSIGNED_ONLY` | Approve or reject subordinate staff leave requests |
| `hr.policy.manage` | manage | `INSTITUTION_WIDE` | Configure institutional leave allowances and quotas |

### 3.8 Staff Payroll (`payroll_module`)
| Permission Key | Verb | Allowed Access Scopes | Description |
| :--- | :--- | :--- | :--- |
| `payroll.structure.manage` | manage | `INSTITUTION_WIDE` | Define salary structures, allowances, PF/ESI deductions |
| `payroll.salary.assign` | assign | `INSTITUTION_WIDE` | Assign salary packages and revisions to staff |
| `payroll.run.process` | process | `INSTITUTION_WIDE` | Calculate monthly payroll run based on attendance/leaves |
| `payroll.run.approve` | approve | `INSTITUTION_WIDE` | Final approval of payroll run and post to General Ledger |
| `payroll.disburse` | disburse | `INSTITUTION_WIDE` | Record bank payout disbursement references |
| `payroll.payslip.read` | read | `INSTITUTION_WIDE`, `SELF_ONLY` | View and download monthly payslips |

---

## 4. Preliminary Role-to-Permission Mapping Matrix

Roles in Justezy are dynamic and institutional, but the system provides standardized default roles:

| Role Key | Role Name | Primary Permission Domains |
| :--- | :--- | :--- |
| `INSTITUTION_OWNER` | Institution Owner | Full access across all licensed modules (`*.*.*`) |
| `INSTITUTION_ADMIN` | Institutional Administrator | Full academic, operational, admissions, HR, and communication governance |
| `FINANCE_OFFICER` | Bursar / Accountant | `fees.*`, `finance.*`, `payroll.payslip.read` |
| `ADMISSIONS_OFFICER` | Admissions Manager | `admissions.*`, `core_academics.read`, `student.read` |
| `LIBRARIAN` | Chief Librarian | `library.*`, `student.read`, `staff.read` |
| `TRANSPORT_MANAGER` | Fleet Supervisor | `transport.*`, `student.read`, `staff.read` |
| `STOREKEEPER` | Inventory Manager | `inventory.*`, `staff.read` |
| `HR_MANAGER` | Human Resources Lead | `hr.*`, `payroll.*` |
| `TEACHER` | Educator / Faculty | `academic.*` (`ASSIGNED_ONLY`), `attendance.mark`, `hr.leave.apply`, `payroll.payslip.read` (`SELF_ONLY`) |
| `STUDENT` | Enrolled Student | `academic.read` (`SELF_ONLY`), `fees.invoice.read` (`SELF_ONLY`), `library.circulation.renew` (`SELF_ONLY`) |
| `PARENT` | Parent / Guardian | `student.read` (`LINKED_CHILDREN`), `fees.invoice.read`, `fees.online_pay`, `fees.receipt.read` (`LINKED_CHILDREN`) |

---

## 5. High-Risk Sensitive Financial & Administrative Operations

The following sensitive operations require mandatory audit logging (`AuditActionCategory`), IP recording, and second-level authorization or dual-key approval:
1. `fees.refund`: Direct financial outflow. Requires explicit reason and manager approval.
2. `fees.invoice.void`: Canceling invoiced receivables. Requires audit diff of outstanding balance.
3. `finance.period.manage`: Reopening closed financial periods. Restricted to Owner/Platform Admin.
4. `finance.journal.reverse`: Reversing ledger postings. Creates paired reversal entry with cross-reference.
5. `payroll.run.approve`: Authorizing bulk salary disbursements. Posts liabilities directly to General Ledger.
6. `admissions.convert`: Converting applicant to official student. Creates legal student and enrollment records.
7. `inventory.stock.adjust`: Writing off inventory loss. Requires justification and managerial sign-off.
