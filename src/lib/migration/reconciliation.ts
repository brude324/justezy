/**
 * Migration Data Reconciliation Engine
 * Derived from docs/database/17-migration-strategy.md (Phase 6)
 */

export interface ModelCountComparison {
  entityName: string;
  legacyCount: number;
  targetCount: number;
  difference: number;
  status: "MATCH" | "MISMATCH";
}

export interface IntegrityAssertion {
  assertionName: string;
  expected: number | boolean;
  actual: number | boolean;
  passed: boolean;
  details?: string;
}

export interface ReconciliationReport {
  timestamp: string;
  tenantId: string;
  overallStatus: "PASS" | "FAIL";
  counts: ModelCountComparison[];
  integrity: IntegrityAssertion[];
  unresolvedRecordCount: number;
}

export function generateReconciliationReport(params: {
  tenantId: string;
  counts: {
    teachers: { legacy: number; target: number };
    students: { legacy: number; target: number };
    parents: { legacy: number; target: number };
    attendance: { legacy: number; target: number };
    results: { legacy: number; target: number };
    classes: { legacy: number; target: number };
    subjects: { legacy: number; target: number };
    events: { legacy: number; target: number };
    announcements: { legacy: number; target: number };
  };
  integrity: {
    orphanedEnrollments: number;
    orphanedParentBindings: number;
    orphanedAttendanceRecords: number;
    orphanedExamResults: number;
    nullTenantRecords: number;
  };
}): ReconciliationReport {
  const countComparisons: ModelCountComparison[] = [
    {
      entityName: "Teacher -> StaffProfile",
      legacyCount: params.counts.teachers.legacy,
      targetCount: params.counts.teachers.target,
      difference: params.counts.teachers.target - params.counts.teachers.legacy,
      status: params.counts.teachers.target === params.counts.teachers.legacy ? "MATCH" : "MISMATCH",
    },
    {
      entityName: "Student -> StudentProfile",
      legacyCount: params.counts.students.legacy,
      targetCount: params.counts.students.target,
      difference: params.counts.students.target - params.counts.students.legacy,
      status: params.counts.students.target === params.counts.students.legacy ? "MATCH" : "MISMATCH",
    },
    {
      entityName: "Parent -> ParentProfile",
      legacyCount: params.counts.parents.legacy,
      targetCount: params.counts.parents.target,
      difference: params.counts.parents.target - params.counts.parents.legacy,
      status: params.counts.parents.target === params.counts.parents.legacy ? "MATCH" : "MISMATCH",
    },
    {
      entityName: "Attendance -> AttendanceRecord",
      legacyCount: params.counts.attendance.legacy,
      targetCount: params.counts.attendance.target,
      difference: params.counts.attendance.target - params.counts.attendance.legacy,
      status: params.counts.attendance.target === params.counts.attendance.legacy ? "MATCH" : "MISMATCH",
    },
    {
      entityName: "Result -> ExamResult",
      legacyCount: params.counts.results.legacy,
      targetCount: params.counts.results.target,
      difference: params.counts.results.target - params.counts.results.legacy,
      status: params.counts.results.target === params.counts.results.legacy ? "MATCH" : "MISMATCH",
    },
    {
      entityName: "Class -> Class",
      legacyCount: params.counts.classes.legacy,
      targetCount: params.counts.classes.target,
      difference: params.counts.classes.target - params.counts.classes.legacy,
      status: params.counts.classes.target === params.counts.classes.legacy ? "MATCH" : "MISMATCH",
    },
    {
      entityName: "Subject -> Subject",
      legacyCount: params.counts.subjects.legacy,
      targetCount: params.counts.subjects.target,
      difference: params.counts.subjects.target - params.counts.subjects.legacy,
      status: params.counts.subjects.target === params.counts.subjects.legacy ? "MATCH" : "MISMATCH",
    },
    {
      entityName: "Event -> Event",
      legacyCount: params.counts.events.legacy,
      targetCount: params.counts.events.target,
      difference: params.counts.events.target - params.counts.events.legacy,
      status: params.counts.events.target === params.counts.events.legacy ? "MATCH" : "MISMATCH",
    },
    {
      entityName: "Announcement -> Announcement",
      legacyCount: params.counts.announcements.legacy,
      targetCount: params.counts.announcements.target,
      difference: params.counts.announcements.target - params.counts.announcements.legacy,
      status: params.counts.announcements.target === params.counts.announcements.legacy ? "MATCH" : "MISMATCH",
    },
  ];

  const integrityAssertions: IntegrityAssertion[] = [
    {
      assertionName: "Zero Orphaned Student Enrollments",
      expected: 0,
      actual: params.integrity.orphanedEnrollments,
      passed: params.integrity.orphanedEnrollments === 0,
      details: params.integrity.orphanedEnrollments === 0 ? "All enrollments linked to valid profiles & classes." : "Orphaned enrollment detected.",
    },
    {
      assertionName: "Zero Orphaned Parent-Student Bindings",
      expected: 0,
      actual: params.integrity.orphanedParentBindings,
      passed: params.integrity.orphanedParentBindings === 0,
      details: params.integrity.orphanedParentBindings === 0 ? "All bindings link existing students and guardians." : "Orphaned guardian binding detected.",
    },
    {
      assertionName: "Zero Orphaned Attendance Records",
      expected: 0,
      actual: params.integrity.orphanedAttendanceRecords,
      passed: params.integrity.orphanedAttendanceRecords === 0,
      details: params.integrity.orphanedAttendanceRecords === 0 ? "All attendance records reference valid students & classes." : "Orphaned attendance record detected.",
    },
    {
      assertionName: "Zero Orphaned Exam Results",
      expected: 0,
      actual: params.integrity.orphanedExamResults,
      passed: params.integrity.orphanedExamResults === 0,
      details: params.integrity.orphanedExamResults === 0 ? "All exam results reference valid exam papers & students." : "Orphaned exam score detected.",
    },
    {
      assertionName: "Mandatory Multi-Tenant Scoping (Zero Null tenantId)",
      expected: 0,
      actual: params.integrity.nullTenantRecords,
      passed: params.integrity.nullTenantRecords === 0,
      details: params.integrity.nullTenantRecords === 0 ? "100% of migrated target records bound to verified tenantId." : "Unscoped records discovered in target tables.",
    },
  ];

  const allCountsMatch = countComparisons.every((c) => c.status === "MATCH");
  const allIntegrityPassed = integrityAssertions.every((i) => i.passed);

  const unresolvedRecordCount = countComparisons.reduce(
    (sum, c) => sum + Math.abs(c.difference),
    0
  );

  return {
    timestamp: new Date().toISOString(),
    tenantId: params.tenantId,
    overallStatus: allCountsMatch && allIntegrityPassed ? "PASS" : "FAIL",
    counts: countComparisons,
    integrity: integrityAssertions,
    unresolvedRecordCount,
  };
}
