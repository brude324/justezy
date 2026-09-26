import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";

export interface IntegrityFinding {
  checkId: string;
  name: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  status: "PASS" | "FAIL";
  issueCount: number;
  details?: any;
}

export interface DataQualityReport {
  tenantId: string;
  timestamp: string;
  status: "HEALTHY" | "WARNING" | "CORRUPTED";
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  };
  findings: IntegrityFinding[];
  recommendations: string[];
}

export class DataQualityAuditor {
  /**
   * Performs an automated data integrity audit for an institutional tenant.
   * Identifies orphaned records, cross-tenant leakages, duplicates, and capacity violations.
   */
  async runTenantIntegrityAudit(
    tenantId: string,
    db: any = prismaTarget
  ): Promise<DataQualityReport> {
    const findings: IntegrityFinding[] = [];
    const recommendations: string[] = [];

    // Check 1: Duplicate Student Admission Numbers
    const duplicateStudents = await db.studentProfile?.groupBy?.({
      by: ["admissionNumber"],
      where: { tenantId },
      _count: { admissionNumber: true },
      having: {
        admissionNumber: {
          _count: { gt: 1 },
        },
      },
    }) ?? [];

    const dupStudentCount = duplicateStudents.length;
    findings.push({
      checkId: "CHK-001",
      name: "Duplicate Student Admission Numbers",
      severity: "CRITICAL",
      status: dupStudentCount === 0 ? "PASS" : "FAIL",
      issueCount: dupStudentCount,
      details: dupStudentCount > 0 ? duplicateStudents : undefined,
    });
    if (dupStudentCount > 0) {
      recommendations.push("Resolve duplicate admission numbers to prevent academic record collision");
    }

    // Check 2: Duplicate Staff Employee IDs
    const duplicateStaff = await db.staffProfile?.groupBy?.({
      by: ["employeeId"],
      where: { tenantId },
      _count: { employeeId: true },
      having: {
        employeeId: {
          _count: { gt: 1 },
        },
      },
    }) ?? [];

    const dupStaffCount = duplicateStaff.length;
    findings.push({
      checkId: "CHK-002",
      name: "Duplicate Staff Employee IDs",
      severity: "CRITICAL",
      status: dupStaffCount === 0 ? "PASS" : "FAIL",
      issueCount: dupStaffCount,
      details: dupStaffCount > 0 ? duplicateStaff : undefined,
    });
    if (dupStaffCount > 0) {
      recommendations.push("De-duplicate staff employee IDs to maintain access security");
    }

    // Check 3: Orphaned or Cross-Tenant Student Enrollments
    const enrollments = await db.studentEnrollment?.findMany?.({
      where: { tenantId },
      include: {
        student: { select: { id: true, tenantId: true } },
        class: { select: { id: true, tenantId: true } },
      },
    }) ?? [];

    const invalidEnrollments = enrollments.filter(
      (e: any) =>
        !e.student ||
        !e.class ||
        e.student.tenantId !== tenantId ||
        e.class.tenantId !== tenantId
    );

    findings.push({
      checkId: "CHK-003",
      name: "Cross-Tenant or Orphaned Student Enrollments",
      severity: "CRITICAL",
      status: invalidEnrollments.length === 0 ? "PASS" : "FAIL",
      issueCount: invalidEnrollments.length,
      details: invalidEnrollments.length > 0 ? invalidEnrollments.map((e: any) => e.id) : undefined,
    });
    if (invalidEnrollments.length > 0) {
      recommendations.push("Purge or re-bind cross-tenant and orphaned student enrollments immediately");
    }

    // Check 4: Cross-Tenant Parent-Student Bindings
    const bindings = await db.studentParentBinding?.findMany?.({
      where: { tenantId },
      include: {
        student: { select: { id: true, tenantId: true } },
        parent: { select: { id: true, tenantId: true } },
      },
    }) ?? [];

    const invalidBindings = bindings.filter(
      (b: any) =>
        !b.student ||
        !b.parent ||
        b.student.tenantId !== tenantId ||
        b.parent.tenantId !== tenantId
    );

    findings.push({
      checkId: "CHK-004",
      name: "Cross-Tenant or Orphaned Guardian Bindings",
      severity: "CRITICAL",
      status: invalidBindings.length === 0 ? "PASS" : "FAIL",
      issueCount: invalidBindings.length,
      details: invalidBindings.length > 0 ? invalidBindings.map((b: any) => b.id) : undefined,
    });
    if (invalidBindings.length > 0) {
      recommendations.push("Remove corrupted student-parent relationships to prevent privacy violations");
    }

    // Check 5: Cross-Tenant Attendance Records
    const attendanceRecords = await db.attendanceRecord?.findMany?.({
      where: { tenantId },
      include: {
        class: { select: { id: true, tenantId: true } },
        student: { select: { id: true, tenantId: true } },
      },
      take: 1000,
    }) ?? [];

    const invalidAttendance = attendanceRecords.filter(
      (a: any) =>
        (a.class && a.class.tenantId !== tenantId) ||
        (a.student && a.student.tenantId !== tenantId)
    );

    findings.push({
      checkId: "CHK-005",
      name: "Cross-Tenant Attendance Records",
      severity: "CRITICAL",
      status: invalidAttendance.length === 0 ? "PASS" : "FAIL",
      issueCount: invalidAttendance.length,
    });
    if (invalidAttendance.length > 0) {
      recommendations.push("Quarantine cross-tenant attendance records");
    }

    // Check 6: Cross-Tenant Exam Results
    const examResults = await db.examResult?.findMany?.({
      where: { tenantId },
      include: {
        examPaper: { select: { id: true, tenantId: true } },
        student: { select: { id: true, tenantId: true } },
      },
      take: 1000,
    }) ?? [];

    const invalidResults = examResults.filter(
      (r: any) =>
        (r.examPaper && r.examPaper.tenantId !== tenantId) ||
        (r.student && r.student.tenantId !== tenantId)
    );

    findings.push({
      checkId: "CHK-006",
      name: "Cross-Tenant Exam Results",
      severity: "CRITICAL",
      status: invalidResults.length === 0 ? "PASS" : "FAIL",
      issueCount: invalidResults.length,
    });

    // Check 7: Class Capacity Over-allocation
    const classes = await db.class?.findMany?.({
      where: { tenantId },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    }) ?? [];

    const overCapacityClasses = classes.filter(
      (c: any) => c._count?.enrollments > c.studentCapacity
    );

    findings.push({
      checkId: "CHK-007",
      name: "Class Student Capacity Over-Allocation",
      severity: "MEDIUM",
      status: overCapacityClasses.length === 0 ? "PASS" : "FAIL",
      issueCount: overCapacityClasses.length,
      details: overCapacityClasses.map((c: any) => ({
        classId: c.id,
        capacity: c.studentCapacity,
        enrolled: c._count?.enrollments,
      })),
    });
    if (overCapacityClasses.length > 0) {
      recommendations.push("Reallocate students or increase room capacity for oversubscribed sections");
    }

    const failedChecks = findings.filter((f) => f.status === "FAIL").length;
    const criticalFailures = findings.filter((f) => f.status === "FAIL" && f.severity === "CRITICAL").length;

    let status: "HEALTHY" | "WARNING" | "CORRUPTED" = "HEALTHY";
    if (criticalFailures > 0) {
      status = "CORRUPTED";
    } else if (failedChecks > 0) {
      status = "WARNING";
    }

    const report: DataQualityReport = {
      tenantId,
      timestamp: new Date().toISOString(),
      status,
      summary: {
        totalChecks: findings.length,
        passedChecks: findings.length - failedChecks,
        failedChecks,
      },
      findings,
      recommendations,
    };

    logger.info("Data quality integrity audit completed", {
      tenantId,
      status,
      failedChecks,
    });

    return report;
  }
}

export const dataQualityAuditor = new DataQualityAuditor();
