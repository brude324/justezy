import { describe, it, expect } from "vitest";
import { generateReconciliationReport } from "@/lib/migration/reconciliation";

describe("Data Reconciliation & Integrity Assertions", () => {
  const baseCounts = {
    teachers: { legacy: 15, target: 15 },
    students: { legacy: 80, target: 80 },
    parents: { legacy: 60, target: 60 },
    attendance: { legacy: 500, target: 500 },
    results: { legacy: 240, target: 240 },
    classes: { legacy: 6, target: 6 },
    subjects: { legacy: 10, target: 10 },
    events: { legacy: 5, target: 5 },
    announcements: { legacy: 8, target: 8 },
  };

  const baseIntegrity = {
    orphanedEnrollments: 0,
    orphanedParentBindings: 0,
    orphanedAttendanceRecords: 0,
    orphanedExamResults: 0,
    nullTenantRecords: 0,
  };

  it("should return overallStatus: PASS when all legacy counts match target counts and 0 orphaned records", () => {
    const report = generateReconciliationReport({
      tenantId: "tnt_default_benchmark",
      counts: baseCounts,
      integrity: baseIntegrity,
    });

    expect(report.overallStatus).toBe("PASS");
    expect(report.unresolvedRecordCount).toBe(0);
    expect(report.counts.every((c) => c.status === "MATCH")).toBe(true);
    expect(report.integrity.every((i) => i.passed)).toBe(true);
  });

  it("should return overallStatus: FAIL when any count mismatch is detected", () => {
    const report = generateReconciliationReport({
      tenantId: "tnt_default_benchmark",
      counts: {
        ...baseCounts,
        students: { legacy: 80, target: 79 }, // 1 missing student record
      },
      integrity: baseIntegrity,
    });

    expect(report.overallStatus).toBe("FAIL");
    expect(report.unresolvedRecordCount).toBe(1);

    const studentComparison = report.counts.find((c) => c.entityName.includes("Student"));
    expect(studentComparison?.status).toBe("MISMATCH");
    expect(studentComparison?.difference).toBe(-1);
  });

  it("should return overallStatus: FAIL when orphaned foreign-key records are detected", () => {
    const report = generateReconciliationReport({
      tenantId: "tnt_default_benchmark",
      counts: baseCounts,
      integrity: {
        ...baseIntegrity,
        orphanedEnrollments: 2, // 2 orphaned enrollments
      },
    });

    expect(report.overallStatus).toBe("FAIL");
    const enrollmentAssertion = report.integrity.find((i) =>
      i.assertionName.includes("Enrollments")
    );
    expect(enrollmentAssertion?.passed).toBe(false);
  });

  it("should return overallStatus: FAIL when unscoped null-tenant records are discovered", () => {
    const report = generateReconciliationReport({
      tenantId: "tnt_default_benchmark",
      counts: baseCounts,
      integrity: {
        ...baseIntegrity,
        nullTenantRecords: 5,
      },
    });

    expect(report.overallStatus).toBe("FAIL");
    const tenantAssertion = report.integrity.find((i) =>
      i.assertionName.includes("Multi-Tenant Scoping")
    );
    expect(tenantAssertion?.passed).toBe(false);
  });
});
