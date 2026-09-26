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
