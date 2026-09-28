/**
 * Tier 1: System Foundational Seeds
 * Derived from docs/database/18-seed-strategy.md
 * 
 * Strict Security Policy:
 * 1. Zero secrets in seed files
 * 2. Idempotent: safe to rerun repeatedly without corrupting data or violating constraints
 */

export interface SystemModuleDefinition {
  moduleKey: string;
  displayName: string;
  description: string;
  isCore: boolean;
}

export const SYSTEM_MODULES: SystemModuleDefinition[] = [
  {
    moduleKey: "core_academics",
    displayName: "Core Academics & Directory",
    description: "Student, Staff, Class, Subject, and Academic Year management.",
    isCore: true,
  },
  {
    moduleKey: "attendance_module",
    displayName: "Daily Student Attendance",
    description: "Daily and period-level attendance tracking and absentee alerts.",
    isCore: true,
  },
  {
    moduleKey: "communication_module",
    displayName: "Announcements & Calendar",
    description: "Institutional announcements, events, and calendar integration.",
    isCore: true,
  },
  {
    moduleKey: "timetable_module",
    displayName: "Timetable & Scheduling",
    description: "Multi-period class timetables, teacher allocations, and conflict checks.",
    isCore: false,
  },
  {
    moduleKey: "exam_module",
    displayName: "Examinations & Marks Entry",
    description: "Exam schedules, paper management, and grade ledger entry.",
    isCore: false,
  },
  {
    moduleKey: "report_card_module",
    displayName: "Report Cards & Transcripts",
    description: "Term report card generation, grade calculation, and transcripts.",
    isCore: false,
  },
  {
    moduleKey: "assignment_module",
    displayName: "Assignments & Coursework",
    description: "Digital homework assignment publishing, student submissions, and grading.",
    isCore: false,
  },
  {
    moduleKey: "fees_module",
    displayName: "Fees & Collections",
    description: "Fee structures, invoicing, online payments, and collections.",
    isCore: false,
  },
  {
    moduleKey: "finance_module",
    displayName: "Financial General Ledger",
    description: "Chart of accounts, double-entry journal entries, and financial periods.",
    isCore: false,
  },
  {
    moduleKey: "admissions_module",
    displayName: "Admissions & Enquiry CRM",
    description: "Prospective student enquiries, applications, document verification, interview scheduling, and enrollment.",
    isCore: false,
  },
  {
    moduleKey: "library_module",
    displayName: "Library Management",
    description: "Catalog, book inventory, circulation loans, reservations, fines, and circulation rules.",
    isCore: false,
  },
  {
    moduleKey: "transport_module",
    displayName: "Transport Management",
    description: "Vehicle fleet, routes, stops, driver route assignments, student passes, and transport incidents.",
    isCore: false,
  },
  {
    moduleKey: "inventory_module",
    displayName: "Inventory & Assets",
    description: "Item catalog, warehouses, stock movements, purchase orders, asset register, assignments, and maintenance.",
    isCore: false,
  },
  {
    moduleKey: "hr_module",
    displayName: "Human Resources",
    description: "Employee master, employment lifecycle, departments, designations, contracts, compensation, leave, and holidays.",
    isCore: false,
  },
  {
    moduleKey: "payroll_module",
    displayName: "Payroll Management",
    description: "Salary structures, payroll periods, runs, calculations, payslips, adjustments, and financial ledger integration.",
    isCore: false,
  },
];

export interface SystemPermissionDefinition {
  permissionKey: string;
  moduleKey: string;
  verb: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: SystemPermissionDefinition[] = [
  // Platform & Tenant Control Plane (6)
  { permissionKey: "platform.dashboard.read", moduleKey: "core_academics", verb: "read", description: "Read Platform Dashboard" },
  { permissionKey: "tenant.manage", moduleKey: "core_academics", verb: "manage", description: "Manage All Tenants" },
  { permissionKey: "tenant.create", moduleKey: "core_academics", verb: "create", description: "Create New Tenant" },
  { permissionKey: "platform.plans.manage", moduleKey: "core_academics", verb: "manage", description: "Manage Subscription Plans" },
  { permissionKey: "platform.users.read", moduleKey: "core_academics", verb: "read", description: "View Global Platform Users" },
  { permissionKey: "platform.audit.read", moduleKey: "core_academics", verb: "read", description: "View Global System Audit Logs" },

  // Dashboards (4)
  { permissionKey: "dashboard.admin.read", moduleKey: "core_academics", verb: "read", description: "Access Admin Dashboard" },
  { permissionKey: "dashboard.teacher.read", moduleKey: "core_academics", verb: "read", description: "Access Teacher Dashboard" },
  { permissionKey: "dashboard.student.read", moduleKey: "core_academics", verb: "read", description: "Access Student Dashboard" },
  { permissionKey: "dashboard.parent.read", moduleKey: "core_academics", verb: "read", description: "Access Parent Dashboard" },

  // Staff & Teachers (5)
  { permissionKey: "teacher.profile.read", moduleKey: "core_academics", verb: "read", description: "Read Teacher Profiles" },
  { permissionKey: "teacher.create", moduleKey: "core_academics", verb: "create", description: "Create New Staff Member" },
  { permissionKey: "teacher.update", moduleKey: "core_academics", verb: "update", description: "Update Staff Member Details" },
  { permissionKey: "teacher.delete", moduleKey: "core_academics", verb: "delete", description: "Delete / Terminate Staff Member" },
  { permissionKey: "teacher.export", moduleKey: "core_academics", verb: "export", description: "Export Teacher Directory" },

  // Learners & Students (5)
  { permissionKey: "student.profile.read", moduleKey: "core_academics", verb: "read", description: "Read Student Profiles" },
  { permissionKey: "student.create", moduleKey: "core_academics", verb: "create", description: "Enroll New Student" },
  { permissionKey: "student.update", moduleKey: "core_academics", verb: "update", description: "Update Student Information" },
  { permissionKey: "student.delete", moduleKey: "core_academics", verb: "delete", description: "Withdraw / Delete Student" },
  { permissionKey: "student.export", moduleKey: "core_academics", verb: "export", description: "Export Student Roster" },

  // Parents & Guardians (4)
  { permissionKey: "parent.read", moduleKey: "core_academics", verb: "read", description: "Read Parent & Guardian Profiles" },
  { permissionKey: "parent.create", moduleKey: "core_academics", verb: "create", description: "Register New Guardian" },
  { permissionKey: "parent.update", moduleKey: "core_academics", verb: "update", description: "Update Guardian Contact Information" },
  { permissionKey: "parent.export", moduleKey: "core_academics", verb: "export", description: "Export Guardian Directory" },

  // Academic Structure (5)
  { permissionKey: "academic.year.manage", moduleKey: "core_academics", verb: "manage", description: "Manage Academic Years & Terms" },
  { permissionKey: "class.read", moduleKey: "core_academics", verb: "read", description: "View Classes & Sections" },
  { permissionKey: "class.create", moduleKey: "core_academics", verb: "create", description: "Create New Class Section" },
  { permissionKey: "class.update", moduleKey: "core_academics", verb: "update", description: "Update Class Section Details" },
  { permissionKey: "class.delete", moduleKey: "core_academics", verb: "delete", description: "Delete Class Section" },

  // Subjects (4)
  { permissionKey: "subject.read", moduleKey: "core_academics", verb: "read", description: "View Subject Catalog" },
  { permissionKey: "subject.create", moduleKey: "core_academics", verb: "create", description: "Add New Subject" },
  { permissionKey: "subject.update", moduleKey: "core_academics", verb: "update", description: "Update Subject Information" },
  { permissionKey: "subject.delete", moduleKey: "core_academics", verb: "delete", description: "Delete Subject" },

  // Timetable & Scheduling (2)
  { permissionKey: "timetable.manage", moduleKey: "timetable_module", verb: "manage", description: "Manage Timetable Periods & Allocations" },
  { permissionKey: "timetable.read", moduleKey: "timetable_module", verb: "read", description: "View Timetable Schedules" },

  // Attendance (4)
  { permissionKey: "attendance.read", moduleKey: "attendance_module", verb: "read", description: "View Attendance Records & Reports" },
  { permissionKey: "attendance.mark", moduleKey: "attendance_module", verb: "create", description: "Mark Daily / Period Attendance" },
  { permissionKey: "attendance.correct", moduleKey: "attendance_module", verb: "update", description: "Submit Attendance Correction" },
  { permissionKey: "attendance.export", moduleKey: "attendance_module", verb: "export", description: "Export Attendance Logs" },

  // Examinations (4)
  { permissionKey: "exam.read", moduleKey: "exam_module", verb: "read", description: "View Examination Sessions & Papers" },
  { permissionKey: "exam.create", moduleKey: "exam_module", verb: "create", description: "Create Examination Session" },
  { permissionKey: "exam.update", moduleKey: "exam_module", verb: "update", description: "Update Exam Schedule & Details" },
  { permissionKey: "exam.publish", moduleKey: "exam_module", verb: "publish", description: "Publish Exam Timetable to Institution" },

  // Marks & Results (5)
  { permissionKey: "result.read", moduleKey: "exam_module", verb: "read", description: "View Student Exam Marks & Results" },
  { permissionKey: "result.enter", moduleKey: "exam_module", verb: "create", description: "Enter Exam Marks" },
  { permissionKey: "result.update", moduleKey: "exam_module", verb: "update", description: "Modify Entered Exam Marks" },
  { permissionKey: "result.publish", moduleKey: "exam_module", verb: "publish", description: "Publish Results to Students & Parents" },
  { permissionKey: "result.export", moduleKey: "exam_module", verb: "export", description: "Export Result Ledgers" },

  // Report Cards (4)
  { permissionKey: "report_card.read", moduleKey: "report_card_module", verb: "read", description: "View Student Report Cards" },
  { permissionKey: "report_card.generate", moduleKey: "report_card_module", verb: "create", description: "Generate Term Report Cards" },
  { permissionKey: "report_card.publish", moduleKey: "report_card_module", verb: "publish", description: "Publish Report Cards" },
  { permissionKey: "report_card.export", moduleKey: "report_card_module", verb: "export", description: "Export PDF Report Cards" },

  // Coursework & Assignments (5)
  { permissionKey: "assignment.read", moduleKey: "assignment_module", verb: "read", description: "View Assignments" },
  { permissionKey: "assignment.create", moduleKey: "assignment_module", verb: "create", description: "Publish New Assignment" },
  { permissionKey: "assignment.submit", moduleKey: "assignment_module", verb: "create", description: "Submit Completed Assignment" },
  { permissionKey: "assignment.grade", moduleKey: "assignment_module", verb: "update", description: "Grade Student Assignment Submissions" },
  { permissionKey: "assignment.delete", moduleKey: "assignment_module", verb: "delete", description: "Delete Assignment" },

  // Communication & Events (8)
  { permissionKey: "announcement.read", moduleKey: "communication_module", verb: "read", description: "Read Institutional Announcements" },
  { permissionKey: "announcement.create", moduleKey: "communication_module", verb: "create", description: "Draft Announcement" },
  { permissionKey: "announcement.publish", moduleKey: "communication_module", verb: "publish", description: "Publish Announcement" },
  { permissionKey: "announcement.delete", moduleKey: "communication_module", verb: "delete", description: "Delete Announcement" },
  { permissionKey: "event.read", moduleKey: "communication_module", verb: "read", description: "View Calendar Events" },
  { permissionKey: "event.create", moduleKey: "communication_module", verb: "create", description: "Schedule Calendar Event" },
  { permissionKey: "event.update", moduleKey: "communication_module", verb: "update", description: "Update Calendar Event" },
  { permissionKey: "event.delete", moduleKey: "communication_module", verb: "delete", description: "Cancel / Delete Calendar Event" },

  // Institutional Governance & Audit (3)
  { permissionKey: "tenant.settings.read", moduleKey: "core_academics", verb: "read", description: "View Institution Settings" },
  { permissionKey: "tenant.settings.manage", moduleKey: "core_academics", verb: "manage", description: "Manage Institution Policies & Branding" },
  { permissionKey: "sensitive_data.read", moduleKey: "core_academics", verb: "read", description: "View Encrypted PII Data (Audit Logged)" },

  // Fees & Collections (5)
  { permissionKey: "fees.read", moduleKey: "fees_module", verb: "read", description: "View fee structures, invoices, and payment receipts" },
  { permissionKey: "fees.manage", moduleKey: "fees_module", verb: "manage", description: "Configure fee structures, categories, and discounts" },
  { permissionKey: "fees.assign", moduleKey: "fees_module", verb: "assign", description: "Assign fees and concessions to students" },
  { permissionKey: "fees.collect", moduleKey: "fees_module", verb: "collect", description: "Collect payments and issue fee receipts" },
  { permissionKey: "fees.refund", moduleKey: "fees_module", verb: "refund", description: "Process fee payment refunds" },

  // Financial General Ledger (4)
  { permissionKey: "finance.read", moduleKey: "finance_module", verb: "read", description: "View chart of accounts and general ledger" },
  { permissionKey: "finance.manage", moduleKey: "finance_module", verb: "manage", description: "Manage fiscal years, periods, and chart of accounts" },
  { permissionKey: "finance.post", moduleKey: "finance_module", verb: "post", description: "Post manual journal entries to general ledger" },
  { permissionKey: "finance.reconcile", moduleKey: "finance_module", verb: "reconcile", description: "Reconcile payment accounts and bank transactions" },

  // Admissions & Enquiry CRM (13)
  { permissionKey: "admissions.read", moduleKey: "admissions_module", verb: "read", description: "View enquiries, applicants, and admission applications" },
  { permissionKey: "admissions.create", moduleKey: "admissions_module", verb: "create", description: "Create prospective enquiries and applications" },
  { permissionKey: "admissions.update", moduleKey: "admissions_module", verb: "update", description: "Update enquiry and applicant details" },
  { permissionKey: "admissions.manage", moduleKey: "admissions_module", verb: "manage", description: "Manage admission sessions and sources" },
  { permissionKey: "admissions.review", moduleKey: "admissions_module", verb: "review", description: "Review and evaluate admission applications" },
  { permissionKey: "admissions.verify_documents", moduleKey: "admissions_module", verb: "verify_documents", description: "Verify or reject applicant uploaded documents" },
  { permissionKey: "admissions.schedule_interview", moduleKey: "admissions_module", verb: "schedule_interview", description: "Schedule applicant interviews and tests" },
  { permissionKey: "admissions.record_result", moduleKey: "admissions_module", verb: "record_result", description: "Record interview notes and test results" },
  { permissionKey: "admissions.decide", moduleKey: "admissions_module", verb: "decide", description: "Make admission decisions (approve, reject, waitlist)" },
  { permissionKey: "admissions.offer", moduleKey: "admissions_module", verb: "offer", description: "Generate and manage admission offers" },
  { permissionKey: "admissions.admit", moduleKey: "admissions_module", verb: "admit", description: "Confirm admission and convert to enrolled student" },
  { permissionKey: "admissions.cancel", moduleKey: "admissions_module", verb: "cancel", description: "Cancel enquiries, applications, and offers" },
  { permissionKey: "admissions.export", moduleKey: "admissions_module", verb: "export", description: "Export admissions lists and funnel metrics" },

  // Library Management (11)
  { permissionKey: "library.read", moduleKey: "library_module", verb: "read", description: "View library catalog, copies, loans, reservations, and fines" },
  { permissionKey: "library.create", moduleKey: "library_module", verb: "create", description: "Create books, copies, authors, publishers, and categories" },
  { permissionKey: "library.update", moduleKey: "library_module", verb: "update", description: "Update book details, copy statuses, and policies" },
  { permissionKey: "library.manage", moduleKey: "library_module", verb: "manage", description: "Manage library configuration, policies, and members" },
  { permissionKey: "library.issue", moduleKey: "library_module", verb: "create", description: "Issue book copies to members" },
  { permissionKey: "library.return", moduleKey: "library_module", verb: "update", description: "Process return of issued book copies" },
  { permissionKey: "library.renew", moduleKey: "library_module", verb: "update", description: "Renew active book loans" },
  { permissionKey: "library.reserve", moduleKey: "library_module", verb: "create", description: "Reserve books and manage reservations" },
  { permissionKey: "library.fine", moduleKey: "library_module", verb: "create", description: "Assess and settle library overdue and damage fines" },
  { permissionKey: "library.waive_fine", moduleKey: "library_module", verb: "update", description: "Waive assessed library fines" },
  { permissionKey: "library.export", moduleKey: "library_module", verb: "export", description: "Export catalog and circulation reports" },

  // Transport Management (9)
  { permissionKey: "transport.read", moduleKey: "transport_module", verb: "read", description: "View transport routes, stops, vehicles, and schedules" },
  { permissionKey: "transport.create", moduleKey: "transport_module", verb: "create", description: "Create routes, stops, vehicles, and drivers" },
  { permissionKey: "transport.update", moduleKey: "transport_module", verb: "update", description: "Update route details, vehicle details, and schedules" },
  { permissionKey: "transport.manage", moduleKey: "transport_module", verb: "manage", description: "Manage transport settings and facilities" },
  { permissionKey: "transport.route_manage", moduleKey: "transport_module", verb: "manage", description: "Manage route assignments and stop sequences" },
  { permissionKey: "transport.vehicle_manage", moduleKey: "transport_module", verb: "manage", description: "Manage vehicle fleet status and assignments" },
  { permissionKey: "transport.assignment_manage", moduleKey: "transport_module", verb: "manage", description: "Assign and unassign students to transport routes" },
  { permissionKey: "transport.incident_manage", moduleKey: "transport_module", verb: "manage", description: "Record and resolve operational transport incidents" },
  { permissionKey: "transport.export", moduleKey: "transport_module", verb: "export", description: "Export transport rosters and occupancy reports" },

  // Inventory Management (14)
  { permissionKey: "inventory.read", moduleKey: "inventory_module", verb: "read", description: "View inventory catalog, stock levels, warehouses, and purchase orders" },
  { permissionKey: "inventory.create", moduleKey: "inventory_module", verb: "create", description: "Create inventory items, categories, units, and vendors" },
  { permissionKey: "inventory.update", moduleKey: "inventory_module", verb: "update", description: "Update inventory catalog, reorder rules, and warehouse details" },
  { permissionKey: "inventory.manage", moduleKey: "inventory_module", verb: "manage", description: "Manage inventory configurations, warehouses, and reorder policies" },
  { permissionKey: "inventory.purchase_request", moduleKey: "inventory_module", verb: "create", description: "Create purchase requests for items" },
  { permissionKey: "inventory.purchase_approve", moduleKey: "inventory_module", verb: "update", description: "Approve or reject purchase requests" },
  { permissionKey: "inventory.purchase_order", moduleKey: "inventory_module", verb: "create", description: "Create and manage purchase orders" },
  { permissionKey: "inventory.receive", moduleKey: "inventory_module", verb: "create", description: "Receive inventory stock against purchase orders" },
  { permissionKey: "inventory.issue", moduleKey: "inventory_module", verb: "create", description: "Issue stock to departments, staff, and locations" },
  { permissionKey: "inventory.transfer", moduleKey: "inventory_module", verb: "create", description: "Transfer stock between warehouses" },
  { permissionKey: "inventory.adjust", moduleKey: "inventory_module", verb: "create", description: "Perform inventory count corrections and stock adjustments" },
  { permissionKey: "inventory.reserve", moduleKey: "inventory_module", verb: "create", description: "Reserve stock for scheduled educational or operational use" },
  { permissionKey: "inventory.reorder", moduleKey: "inventory_module", verb: "manage", description: "Configure automated reorder rules and alerts" },
  { permissionKey: "inventory.export", moduleKey: "inventory_module", verb: "export", description: "Export stock valuation, movements, and ledger reports" },

  // Fixed Asset Management (11)
  { permissionKey: "asset.read", moduleKey: "inventory_module", verb: "read", description: "View asset register, assignments, maintenance, and history" },
  { permissionKey: "asset.create", moduleKey: "inventory_module", verb: "create", description: "Register new institutional fixed assets and components" },
  { permissionKey: "asset.update", moduleKey: "inventory_module", verb: "update", description: "Update asset specifications, serial numbers, and locations" },
  { permissionKey: "asset.manage", moduleKey: "inventory_module", verb: "manage", description: "Manage asset categories, depreciation policies, and lifecycles" },
  { permissionKey: "asset.assign", moduleKey: "inventory_module", verb: "create", description: "Assign assets to staff, departments, or rooms" },
  { permissionKey: "asset.transfer", moduleKey: "inventory_module", verb: "update", description: "Transfer assets between custodians or locations" },
  { permissionKey: "asset.return", moduleKey: "inventory_module", verb: "update", description: "Process return of assigned assets" },
  { permissionKey: "asset.maintenance", moduleKey: "inventory_module", verb: "create", description: "Schedule and record asset maintenance and servicing" },
  { permissionKey: "asset.dispose", moduleKey: "inventory_module", verb: "delete", description: "Request, approve, and record asset disposals" },
  { permissionKey: "asset.depreciation", moduleKey: "inventory_module", verb: "update", description: "Calculate and record asset depreciation metadata" },
  { permissionKey: "asset.export", moduleKey: "inventory_module", verb: "export", description: "Export asset register, maintenance logs, and depreciation schedules" },

  // Human Resources Management (18)
  { permissionKey: "hr.read", moduleKey: "hr_module", verb: "read", description: "View HR dashboard, departments, designations, and employees" },
  { permissionKey: "hr.create", moduleKey: "hr_module", verb: "create", description: "Create HR departments, designations, and records" },
  { permissionKey: "hr.update", moduleKey: "hr_module", verb: "update", description: "Update HR departments, designations, and policies" },
  { permissionKey: "hr.manage", moduleKey: "hr_module", verb: "manage", description: "Manage overall HR operations and configurations" },
  { permissionKey: "hr.employee.read", moduleKey: "hr_module", verb: "read", description: "View employee profiles and employment details" },
  { permissionKey: "hr.employee.manage", moduleKey: "hr_module", verb: "manage", description: "Create, update, and manage employee master records" },
  { permissionKey: "hr.department.manage", moduleKey: "hr_module", verb: "manage", description: "Configure and manage institutional departments" },
  { permissionKey: "hr.designation.manage", moduleKey: "hr_module", verb: "manage", description: "Configure and manage employee designations" },
  { permissionKey: "hr.contract.manage", moduleKey: "hr_module", verb: "manage", description: "Create and manage employment contracts" },
  { permissionKey: "hr.compensation.read", moduleKey: "hr_module", verb: "read", description: "View employee compensation assignments" },
  { permissionKey: "hr.compensation.manage", moduleKey: "hr_module", verb: "manage", description: "Manage salary structures and employee compensation" },
  { permissionKey: "hr.leave.read", moduleKey: "hr_module", verb: "read", description: "View employee leave balances and requests" },
  { permissionKey: "hr.leave.request", moduleKey: "hr_module", verb: "create", description: "Submit leave requests for employees" },
  { permissionKey: "hr.leave.approve", moduleKey: "hr_module", verb: "update", description: "Approve or reject employee leave requests" },
  { permissionKey: "hr.attendance.read", moduleKey: "hr_module", verb: "read", description: "View employee attendance and work schedules" },
  { permissionKey: "hr.document.read", moduleKey: "hr_module", verb: "read", description: "View employee HR documents and contracts" },
  { permissionKey: "hr.document.manage", moduleKey: "hr_module", verb: "manage", description: "Upload, verify, and manage employee documents" },
  { permissionKey: "hr.export", moduleKey: "hr_module", verb: "export", description: "Export employee directories, leave, and HR reports" },

  // Payroll Management (13)
  { permissionKey: "payroll.read", moduleKey: "payroll_module", verb: "read", description: "View payroll dashboard, periods, runs, and payslips" },
  { permissionKey: "payroll.create", moduleKey: "payroll_module", verb: "create", description: "Create payroll components, structures, and periods" },
  { permissionKey: "payroll.update", moduleKey: "payroll_module", verb: "update", description: "Update payroll components and configurations" },
  { permissionKey: "payroll.manage", moduleKey: "payroll_module", verb: "manage", description: "Manage overall payroll operations and policies" },
  { permissionKey: "payroll.calculate", moduleKey: "payroll_module", verb: "create", description: "Execute deterministic payroll calculations for periods" },
  { permissionKey: "payroll.review", moduleKey: "payroll_module", verb: "update", description: "Review and verify calculated payroll runs" },
  { permissionKey: "payroll.approve", moduleKey: "payroll_module", verb: "update", description: "Approve verified payroll runs" },
  { permissionKey: "payroll.finalize", moduleKey: "payroll_module", verb: "update", description: "Finalize and lock payroll runs and generate payslips" },
  { permissionKey: "payroll.adjust", moduleKey: "payroll_module", verb: "create", description: "Create and apply payroll adjustments and arrears" },
  { permissionKey: "payroll.payslip.read", moduleKey: "payroll_module", verb: "read", description: "View employee payslips" },
  { permissionKey: "payroll.payslip.manage", moduleKey: "payroll_module", verb: "manage", description: "Publish and distribute employee payslips" },
  { permissionKey: "payroll.export", moduleKey: "payroll_module", verb: "export", description: "Export payroll summaries, bank transfer lists, and reports" },
  { permissionKey: "payroll.accounting.post", moduleKey: "payroll_module", verb: "create", description: "Post finalized payroll transactions to financial ledger" },
];

export interface SystemRoleDefinition {
  roleKey: string;
  name: string;
  description: string;
  defaultScope: "GLOBAL" | "INSTITUTION_WIDE" | "ASSIGNED_ONLY" | "SELF_ONLY" | "LINKED_CHILDREN";
  permissions: string[];
}

export const SYSTEM_ROLES: SystemRoleDefinition[] = [
  {
    roleKey: "INSTITUTION_OWNER",
    name: "Institution Owner / Trustee",
    description: "Complete administrative and governance authority over the institution.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: SYSTEM_PERMISSIONS.map((p) => p.permissionKey).filter(
      (k) => !k.startsWith("platform.")
    ),
  },
  {
    roleKey: "PRINCIPAL",
    name: "Principal / Academic Director",
    description: "Academic operations, timetable approval, examinations, and reporting.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "teacher.profile.read", "teacher.create", "teacher.update", "teacher.delete", "teacher.export",
      "student.profile.read", "student.create", "student.update", "student.delete", "student.export",
      "parent.read", "parent.create", "parent.update", "parent.export",
      "academic.year.manage", "class.read", "class.create", "class.update", "class.delete",
      "subject.read", "subject.create", "subject.update", "subject.delete",
      "timetable.manage", "timetable.read",
      "attendance.read", "attendance.mark", "attendance.correct", "attendance.export",
      "exam.read", "exam.create", "exam.update", "exam.publish",
      "result.read", "result.enter", "result.update", "result.publish", "result.export",
      "report_card.read", "report_card.generate", "report_card.publish", "report_card.export",
      "assignment.read", "assignment.delete",
      "announcement.read", "announcement.create", "announcement.publish", "announcement.delete",
      "event.read", "event.create", "event.update", "event.delete",
      "admissions.read", "admissions.review", "admissions.decide", "admissions.offer", "admissions.admit", "admissions.export",
      "library.read", "library.manage", "library.export",
      "transport.read", "transport.manage", "transport.export",
      "inventory.read", "inventory.manage", "inventory.export",
      "asset.read", "asset.manage", "asset.export",
      "hr.read", "hr.employee.read", "hr.leave.read", "hr.leave.approve", "hr.export",
      "payroll.read", "payroll.review", "payroll.approve", "payroll.export",
      "tenant.settings.read",
    ],
  },
  {
    roleKey: "TEACHER",
    name: "Subject Teacher / Class Supervisor",
    description: "Assigned class attendance marking, coursework grading, and exam mark entry.",
    defaultScope: "ASSIGNED_ONLY",
    permissions: [
      "dashboard.teacher.read",
      "teacher.profile.read",
      "student.profile.read",
      "class.read", "subject.read",
      "timetable.read",
      "attendance.read", "attendance.mark",
      "exam.read",
      "result.read", "result.enter", "result.update",
      "report_card.read",
      "assignment.read", "assignment.create", "assignment.submit", "assignment.grade", "assignment.delete",
      "announcement.read", "announcement.create",
      "event.read",
      "library.read", "library.reserve",
      "transport.read",
    ],
  },
  {
    roleKey: "STAFF",
    name: "Administrative Office Staff",
    description: "Student admissions, guardian records, and operational reporting.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "teacher.profile.read",
      "student.profile.read", "student.create", "student.update", "student.export",
      "parent.read", "parent.create", "parent.update", "parent.export",
      "class.read", "subject.read",
      "timetable.read",
      "attendance.read", "attendance.export",
      "announcement.read", "announcement.create",
      "event.read", "event.create",
      "admissions.read", "admissions.create", "admissions.update", "admissions.verify_documents", "admissions.schedule_interview",
      "library.read",
      "transport.read",
    ],
  },
  {
    roleKey: "STUDENT",
    name: "Enrolled Student Learner",
    description: "Personal timetable, homework submission, attendance review, and report cards.",
    defaultScope: "SELF_ONLY",
    permissions: [
      "dashboard.student.read",
      "timetable.read",
      "attendance.read",
      "exam.read",
      "result.read",
      "report_card.read",
      "assignment.read", "assignment.submit",
      "announcement.read",
      "event.read",
      "fees.read",
      "library.read", "library.reserve",
      "transport.read",
    ],
  },
  {
    roleKey: "PARENT",
    name: "Parent / Legal Guardian",
    description: "Monitoring attendance, homework assignments, and academic performance for linked children.",
    defaultScope: "LINKED_CHILDREN",
    permissions: [
      "dashboard.parent.read",
      "attendance.read",
      "exam.read",
      "result.read",
      "report_card.read",
      "assignment.read",
      "announcement.read",
      "event.read",
      "fees.read",
      "fees.collect",
      "admissions.read",
      "admissions.create",
      "admissions.update",
      "library.read", "library.reserve",
      "transport.read",
    ],
  },
  {
    roleKey: "FINANCE_OFFICER",
    name: "Finance & Accounts Officer",
    description: "Fee management, payment collection, reconciliation, and general ledger operations.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "fees.read", "fees.manage", "fees.assign", "fees.collect", "fees.refund",
      "finance.read", "finance.manage", "finance.post", "finance.reconcile",
      "student.profile.read", "parent.read", "class.read",
    ],
  },
  {
    roleKey: "ADMISSIONS_OFFICER",
    name: "Admissions Officer / Counselor",
    description: "Admissions CRM, enquiry tracking, document verification, interview scheduling, and applicant enrollment.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "admissions.read", "admissions.create", "admissions.update", "admissions.manage",
      "admissions.review", "admissions.verify_documents", "admissions.schedule_interview",
      "admissions.record_result", "admissions.decide", "admissions.offer", "admissions.admit",
      "admissions.cancel", "admissions.export",
      "student.profile.read", "parent.read", "class.read",
    ],
  },
  {
    roleKey: "LIBRARIAN",
    name: "Librarian / Library Officer",
    description: "Catalog curation, book circulation, member loans, renewals, reservations, and fine administration.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "library.read", "library.create", "library.update", "library.manage",
      "library.issue", "library.return", "library.renew", "library.reserve",
      "library.fine", "library.waive_fine", "library.export",
      "student.profile.read", "parent.read", "class.read",
    ],
  },
  {
    roleKey: "TRANSPORT_COORDINATOR",
    name: "Transport Coordinator / Fleet Manager",
    description: "Route planning, vehicle fleet management, driver allocations, student transport assignments, and incident tracking.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "transport.read", "transport.create", "transport.update", "transport.manage",
      "transport.route_manage", "transport.vehicle_manage", "transport.assignment_manage",
      "transport.incident_manage", "transport.export",
      "student.profile.read", "parent.read", "class.read",
    ],
  },
  {
    roleKey: "INVENTORY_MANAGER",
    name: "Inventory & Store Manager",
    description: "Catalog curation, stock levels, warehouse management, reorder rules, and stock transfers.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "inventory.read", "inventory.create", "inventory.update", "inventory.manage",
      "inventory.purchase_request", "inventory.purchase_approve", "inventory.purchase_order",
      "inventory.receive", "inventory.issue", "inventory.transfer", "inventory.adjust",
      "inventory.reserve", "inventory.reorder", "inventory.export",
      "asset.read",
      "tenant.settings.read",
    ],
  },
  {
    roleKey: "STORE_KEEPER",
    name: "Storekeeper / Inventory Clerk",
    description: "Daily stock receipts, issues, transfers, physical count adjustments, and reservations.",
    defaultScope: "ASSIGNED_ONLY",
    permissions: [
      "dashboard.admin.read",
      "inventory.read", "inventory.receive", "inventory.issue", "inventory.transfer",
      "inventory.adjust", "inventory.reserve", "inventory.export",
    ],
  },
  {
    roleKey: "PROCUREMENT_OFFICER",
    name: "Procurement & Purchase Officer",
    description: "Vendor directory, purchase requests, purchase order generation, and receipt monitoring.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "inventory.read", "inventory.create", "inventory.purchase_request",
      "inventory.purchase_approve", "inventory.purchase_order", "inventory.receive",
      "inventory.export",
      "asset.read", "asset.create",
    ],
  },
  {
    roleKey: "ASSET_MANAGER",
    name: "Fixed Asset Manager",
    description: "Asset register, custodian assignments, transfers, returns, maintenance, and disposal.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "asset.read", "asset.create", "asset.update", "asset.manage",
      "asset.assign", "asset.transfer", "asset.return", "asset.maintenance",
      "asset.dispose", "asset.depreciation", "asset.export",
      "inventory.read",
      "tenant.settings.read",
    ],
  },
  {
    roleKey: "HR_MANAGER",
    name: "Human Resources Manager",
    description: "Employee master, contracts, compensation structures, leave administration, and HR policies.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "hr.read", "hr.create", "hr.update", "hr.manage",
      "hr.employee.read", "hr.employee.manage",
      "hr.department.manage", "hr.designation.manage",
      "hr.contract.manage",
      "hr.compensation.read", "hr.compensation.manage",
      "hr.leave.read", "hr.leave.request", "hr.leave.approve",
      "hr.attendance.read",
      "hr.document.read", "hr.document.manage",
      "hr.export",
      "payroll.read",
      "tenant.settings.read",
    ],
  },
  {
    roleKey: "HR_OFFICER",
    name: "Human Resources Officer / Executive",
    description: "Employee document verification, leave recording, and scoped departmental HR support.",
    defaultScope: "ASSIGNED_ONLY",
    permissions: [
      "dashboard.admin.read",
      "hr.read", "hr.employee.read", "hr.employee.manage",
      "hr.leave.read", "hr.leave.request",
      "hr.attendance.read",
      "hr.document.read", "hr.document.manage",
      "hr.export",
    ],
  },
  {
    roleKey: "PAYROLL_MANAGER",
    name: "Payroll Manager / Finance Head",
    description: "Salary structures, payroll calculations, run approvals, finalization, payslips, and GL posting.",
    defaultScope: "INSTITUTION_WIDE",
    permissions: [
      "dashboard.admin.read",
      "payroll.read", "payroll.create", "payroll.update", "payroll.manage",
      "payroll.calculate", "payroll.review", "payroll.approve", "payroll.finalize",
      "payroll.adjust",
      "payroll.payslip.read", "payroll.payslip.manage",
      "payroll.export",
      "payroll.accounting.post",
      "hr.read", "hr.employee.read", "hr.compensation.read",
      "tenant.settings.read",
    ],
  },
  {
    roleKey: "PAYROLL_OFFICER",
    name: "Payroll Officer / Accountant",
    description: "Payroll calculation execution, attendance verification, payslip distribution, and report generation.",
    defaultScope: "ASSIGNED_ONLY",
    permissions: [
      "dashboard.admin.read",
      "payroll.read", "payroll.calculate", "payroll.review",
      "payroll.payslip.read", "payroll.export",
      "hr.read", "hr.employee.read",
    ],
  },
];

export interface SystemSubscriptionPlanDefinition {
  planKey: string;
  name: string;
  description: string;
  monthlyPricePerStudent: number;
  annualDiscountPercent: number;
  includedModules: string[];
}

export const SYSTEM_PLANS: SystemSubscriptionPlanDefinition[] = [
  {
    planKey: "STARTER",
    name: "Schoolyard Starter",
    description: "Core student directory, daily attendance, and institutional communication.",
    monthlyPricePerStudent: 15.0,
    annualDiscountPercent: 15.0,
    includedModules: ["core_academics", "attendance_module", "communication_module"],
  },
  {
    planKey: "ACADEMIC_PRO",
    name: "Schoolyard Academic Pro",
    description: "Complete academic operations with timetable scheduling, exams, and coursework.",
    monthlyPricePerStudent: 35.0,
    annualDiscountPercent: 15.0,
    includedModules: [
      "core_academics",
      "attendance_module",
      "communication_module",
      "timetable_module",
      "exam_module",
      "assignment_module",
    ],
  },
  {
    planKey: "ENTERPRISE",
    name: "Schoolyard Institution Enterprise",
    description: "Full suite with official report cards, custom domain, and unlimited capacity.",
    monthlyPricePerStudent: 60.0,
    annualDiscountPercent: 20.0,
    includedModules: [
      "core_academics",
      "attendance_module",
      "communication_module",
      "timetable_module",
      "exam_module",
      "report_card_module",
      "assignment_module",
    ],
  },
];
