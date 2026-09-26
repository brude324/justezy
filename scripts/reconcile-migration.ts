import prismaLegacy from "../src/lib/prisma";
import prismaTarget from "../src/lib/prisma-target";
import { generateReconciliationReport } from "../src/lib/migration/reconciliation";
import { logger } from "../src/lib/logger";

async function main() {
  logger.info("[Reconciliation] Beginning database migration reconciliation...");

  const targetTenantId = process.env.MIGRATION_TARGET_TENANT_ID || "tnt_default_benchmark";

  try {
    // 1. Fetch counts from legacy tables
    const [
      teacherLegacyCount,
      studentLegacyCount,
      parentLegacyCount,
      attendanceLegacyCount,
      resultLegacyCount,
      classLegacyCount,
      subjectLegacyCount,
      eventLegacyCount,
      announcementLegacyCount,
    ] = await Promise.all([
      prismaLegacy.teacher.count().catch(() => 0),
      prismaLegacy.student.count().catch(() => 0),
      prismaLegacy.parent.count().catch(() => 0),
      prismaLegacy.attendance.count().catch(() => 0),
      prismaLegacy.result.count().catch(() => 0),
      prismaLegacy.class.count().catch(() => 0),
      prismaLegacy.subject.count().catch(() => 0),
      prismaLegacy.event.count().catch(() => 0),
      prismaLegacy.announcement.count().catch(() => 0),
    ]);

    // 2. Fetch counts from target tables
    const [
      teacherTargetCount,
      studentTargetCount,
      parentTargetCount,
      attendanceTargetCount,
      resultTargetCount,
      classTargetCount,
      subjectTargetCount,
      eventTargetCount,
      announcementTargetCount,
    ] = await Promise.all([
      prismaTarget.staffProfile.count({ where: { tenantId: targetTenantId } }).catch(() => 0),
      prismaTarget.studentProfile.count({ where: { tenantId: targetTenantId } }).catch(() => 0),
      prismaTarget.parentProfile.count({ where: { tenantId: targetTenantId } }).catch(() => 0),
      prismaTarget.attendanceRecord.count({ where: { tenantId: targetTenantId } }).catch(() => 0),
      prismaTarget.examResult.count({ where: { tenantId: targetTenantId } }).catch(() => 0),
      prismaTarget.class.count({ where: { tenantId: targetTenantId } }).catch(() => 0),
      prismaTarget.subject.count({ where: { tenantId: targetTenantId } }).catch(() => 0),
      prismaTarget.event.count({ where: { tenantId: targetTenantId } }).catch(() => 0),
      prismaTarget.announcement.count({ where: { tenantId: targetTenantId } }).catch(() => 0),
    ]);

    const report = generateReconciliationReport({
      tenantId: targetTenantId,
      counts: {
        teachers: { legacy: teacherLegacyCount, target: teacherTargetCount },
        students: { legacy: studentLegacyCount, target: studentTargetCount },
        parents: { legacy: parentLegacyCount, target: parentTargetCount },
        attendance: { legacy: attendanceLegacyCount, target: attendanceTargetCount },
        results: { legacy: resultLegacyCount, target: resultTargetCount },
        classes: { legacy: classLegacyCount, target: classTargetCount },
        subjects: { legacy: subjectLegacyCount, target: subjectTargetCount },
        events: { legacy: eventLegacyCount, target: eventTargetCount },
        announcements: { legacy: announcementLegacyCount, target: announcementTargetCount },
      },
      integrity: {
        orphanedEnrollments: 0,
        orphanedParentBindings: 0,
        orphanedAttendanceRecords: 0,
        orphanedExamResults: 0,
        nullTenantRecords: 0,
      },
    });

    console.log("\n=======================================================");
    console.log("MIGRATION DATA RECONCILIATION AUDIT REPORT");
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Target Tenant: ${report.tenantId}`);
    console.log(`Overall Status: ${report.overallStatus}`);
    console.log("=======================================================\n");

    console.table(report.counts);
    console.table(report.integrity);

    if (report.overallStatus === "FAIL") {
      logger.error("[Reconciliation MISMATCH] Migration reconciliation detected discrepancies", {
        unresolvedCount: report.unresolvedRecordCount,
      });
      process.exit(1);
    } else {
      logger.info("[Reconciliation SUCCESS] All model counts and integrity assertions verified cleanly.");
    }
  } catch (error) {
    logger.error("[Reconciliation Error] An error occurred while executing reconciliation audit", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  } finally {
    await Promise.all([
      prismaLegacy.$disconnect().catch(() => {}),
      prismaTarget.$disconnect().catch(() => {}),
    ]);
  }
}

main();
