import { FinancialReconciliationService } from "../src/lib/services/financial-reconciliation";
import { logger } from "../src/lib/logger";

async function main() {
  const tenantId = process.env.PILOT_TENANT_ID || "tnt_pilot_dps";
  logger.info(`[PilotReconciliationScript] Starting financial reconciliation for tenant: ${tenantId}`);

  const service = new FinancialReconciliationService();
  try {
    const report = await service.runReconciliation(tenantId);

    console.log("==================================================");
    console.log("FINANCIAL PILOT RECONCILIATION REPORT");
    console.log("==================================================");
    console.log(`Tenant ID:                   ${report.tenantId}`);
    console.log(`Generated At:                ${report.generatedAt}`);
    console.log(`Overall Health Status:       ${report.overallStatus}`);
    console.log(`Total Students Invoiced:     ${report.studentCount}`);
    console.log(`All Students Reconciled:     ${report.studentsReconciled}`);
    console.log(`Sub-ledger Total Balance:    ₹${report.subledgerTotalOutstanding}`);
    console.log(`General Ledger AR Balance:   ₹${report.generalLedgerArBalance}`);
    console.log(`Sub-ledger === GL Balanced:  ${report.isSubledgerGlReconciled}`);
    console.log(`GL Trial Balance Debit:      ₹${report.glTrialBalanceDebit}`);
    console.log(`GL Trial Balance Credit:     ₹${report.glTrialBalanceCredit}`);
    console.log(`GL Trial Balance Balanced:   ${report.isTrialBalanceBalanced}`);
    console.log("--------------------------------------------------");
    console.log("DATA QUALITY CHECKS:");
    for (const check of report.dataQualityChecks) {
      const statusIcon = check.passed ? "✓ PASS" : "✗ FAIL";
      console.log(`  ${statusIcon} | ${check.checkName}: ${check.details}`);
    }
    console.log("==================================================");

    if (report.overallStatus !== "HEALTHY") {
      process.exit(1);
    }
  } catch (error: any) {
    logger.error("[PilotReconciliationScript] Reconciliation execution failed", {
      error: error?.message || String(error),
    });
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
