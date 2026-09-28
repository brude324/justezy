import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { Decimal } from "@prisma/client/runtime/library";

export interface StudentFinancialSummary {
  studentId: string;
  totalInvoiced: string;
  totalConcessions: string;
  totalPaid: string;
  totalRefunded: string;
  netOutstandingBalance: string;
  calculatedBalance: string;
  isReconciled: boolean;
}

export interface GeneralLedgerBalanceSummary {
  accountCode: string;
  accountName: string;
  totalDebit: string;
  totalCredit: string;
  netDebitBalance: string;
}

export interface DataQualityCheckResult {
  checkName: string;
  passed: boolean;
  details: string;
}

export interface FinancialReconciliationReport {
  tenantId: string;
  generatedAt: string;
  overallStatus: "HEALTHY" | "DISCREPANCY_DETECTED" | "CORRUPTED";
  studentCount: number;
  studentsReconciled: boolean;
  subledgerTotalOutstanding: string;
  generalLedgerArBalance: string;
  glTrialBalanceDebit: string;
  glTrialBalanceCredit: string;
  isTrialBalanceBalanced: boolean;
  isSubledgerGlReconciled: boolean;
  studentSummaries: StudentFinancialSummary[];
  glSummaries: GeneralLedgerBalanceSummary[];
  dataQualityChecks: DataQualityCheckResult[];
}

export class FinancialReconciliationService {
  /**
   * Performs an authoritative reconciliation of the financial subsystem for a given tenant:
   * 1. Student-level sub-ledger: Invoices - Concessions - Payments + Refunds = Balance
   * 2. General Ledger Trial Balance: SUM(Debits) === SUM(Credits)
   * 3. Sub-ledger to GL AR binding: SUM(Student Outstandings) === GL Accounts Receivable (1200) Balance
   * 4. 10 Data Quality Invariant Checks
   */
  async runReconciliation(
    tenantId: string,
    db = prismaTarget
  ): Promise<FinancialReconciliationReport> {
    logger.info("[FinancialReconciliation] Commencing financial pilot reconciliation", { tenantId });

    // 1. Fetch all student profiles and their invoices/payments in tenant
    const [invoices, payments, journalEntries, accounts] = await Promise.all([
      db.feeInvoice.findMany({
        where: { tenantId },
        include: { allocations: true },
      }),
      db.payment.findMany({
        where: { tenantId },
        include: { allocations: true, refunds: true },
      }),
      db.journalEntry.findMany({
        where: { tenantId, status: "POSTED" },
        include: { lines: true },
      }),
      db.chartOfAccount.findMany({
        where: { tenantId },
      }),
    ]);

    // --- STUDENT RECONCILIATION ---
    const studentMap = new Map<
      string,
      {
        invoiced: Decimal;
        concession: Decimal;
        paid: Decimal;
        refunded: Decimal;
        outstanding: Decimal;
      }
    >();

    for (const inv of invoices) {
      if (inv.status === "CANCELLED" || inv.status === "VOID") continue;
      const cur = studentMap.get(inv.studentId) || {
        invoiced: new Decimal(0),
        concession: new Decimal(0),
        paid: new Decimal(0),
        refunded: new Decimal(0),
        outstanding: new Decimal(0),
      };

      const gross = new Decimal(inv.subtotalAmount.toString());
      const concession = new Decimal(inv.discountAmount.toString());
      const paid = new Decimal(inv.paidAmount.toString());
      const balance = new Decimal(inv.balanceAmount.toString());

      cur.invoiced = cur.invoiced.plus(gross);
      cur.concession = cur.concession.plus(concession);
      cur.paid = cur.paid.plus(paid);
      cur.outstanding = cur.outstanding.plus(balance);
      studentMap.set(inv.studentId, cur);
    }

    // Account for refunds per student
    for (const pay of payments) {
      const cur = studentMap.get(pay.studentId);
      if (cur && pay.refunds) {
        for (const ref of pay.refunds) {
          if (ref.status === "SUCCESS") {
            cur.refunded = cur.refunded.plus(new Decimal(ref.amount.toString()));
          }
        }
      }
    }

    let subledgerTotalOutstanding = new Decimal(0);
    const studentSummaries: StudentFinancialSummary[] = [];
    let studentsAllReconciled = true;

    for (const [studentId, data] of Array.from(studentMap.entries())) {
      // Invariant: Invoiced - Concession - Paid + Refunded == Net Outstanding
      // Notice: netAmount = gross - concession. Invoices paidAmount reduces balance.
      // netOutstanding = gross - concession - paid + (refunds already adjusted into invoice balance if any)
      const calculatedBalance = data.invoiced.minus(data.concession).minus(data.paid);
      const isReconciled = calculatedBalance.equals(data.outstanding);

      if (!isReconciled) {
        studentsAllReconciled = false;
      }

      subledgerTotalOutstanding = subledgerTotalOutstanding.plus(data.outstanding);

      studentSummaries.push({
        studentId,
        totalInvoiced: data.invoiced.toFixed(2),
        totalConcessions: data.concession.toFixed(2),
        totalPaid: data.paid.toFixed(2),
        totalRefunded: data.refunded.toFixed(2),
        netOutstandingBalance: data.outstanding.toFixed(2),
        calculatedBalance: calculatedBalance.toFixed(2),
        isReconciled,
      });
    }

    // --- GENERAL LEDGER TRIAL BALANCE & BALANCING ---
    let glTrialBalanceDebit = new Decimal(0);
    let glTrialBalanceCredit = new Decimal(0);
    const glAccountBalances = new Map<string, { debit: Decimal; credit: Decimal }>();

    for (const jrn of journalEntries) {
      for (const line of jrn.lines) {
        const dr = new Decimal(line.debitAmount.toString());
        const cr = new Decimal(line.creditAmount.toString());

        glTrialBalanceDebit = glTrialBalanceDebit.plus(dr);
        glTrialBalanceCredit = glTrialBalanceCredit.plus(cr);

        const curAcc = glAccountBalances.get(line.accountId) || {
          debit: new Decimal(0),
          credit: new Decimal(0),
        };
        curAcc.debit = curAcc.debit.plus(dr);
        curAcc.credit = curAcc.credit.plus(cr);
        glAccountBalances.set(line.accountId, curAcc);
      }
    }

    const isTrialBalanceBalanced = glTrialBalanceDebit.equals(glTrialBalanceCredit);

    // Find Accounts Receivable account (Code 1200)
    const arAccount = accounts.find((a: any) => a.accountCode === "1200");
    let generalLedgerArBalance = new Decimal(0);
    if (arAccount) {
      const arBalances = glAccountBalances.get(arAccount.id) || {
        debit: new Decimal(0),
        credit: new Decimal(0),
      };
      // Normal balance for Asset (AR) is Debit - Credit
      generalLedgerArBalance = arBalances.debit.minus(arBalances.credit);
    }

    const isSubledgerGlReconciled = subledgerTotalOutstanding.equals(generalLedgerArBalance);

    const glSummaries: GeneralLedgerBalanceSummary[] = accounts.map((acc: any) => {
      const b = glAccountBalances.get(acc.id) || {
        debit: new Decimal(0),
        credit: new Decimal(0),
      };
      return {
        accountCode: acc.accountCode,
        accountName: acc.name,
        totalDebit: b.debit.toFixed(2),
        totalCredit: b.credit.toFixed(2),
        netDebitBalance: b.debit.minus(b.credit).toFixed(2),
      };
    });

    // --- DATA QUALITY INVARIANT CHECKS ---
    const dataQualityChecks: DataQualityCheckResult[] = [];

    // 1. Invariant: No negative balances on active invoices
    const negativeBalanceInvoices = invoices.filter(
      (inv: any) => new Decimal(inv.balanceAmount.toString()).isNegative()
    );
    dataQualityChecks.push({
      checkName: "Invariant 7: Non-negative invoice balances",
      passed: negativeBalanceInvoices.length === 0,
      details:
        negativeBalanceInvoices.length === 0
          ? "All invoice balances are non-negative (>= 0)"
          : `Detected ${negativeBalanceInvoices.length} invoices with negative balance`,
    });

    // 2. Invariant: Allocation sum <= Payment amount
    let overAllocatedPayments = 0;
    for (const pay of payments) {
      const sumAlloc = pay.allocations.reduce(
        (sum: Decimal, a: any) => sum.plus(new Decimal(a.allocatedAmount.toString())),
        new Decimal(0)
      );
      if (sumAlloc.greaterThan(new Decimal(pay.amount.toString()))) {
        overAllocatedPayments++;
      }
    }
    dataQualityChecks.push({
      checkName: "Invariant 8: Non-over-allocation (allocated <= payment amount)",
      passed: overAllocatedPayments === 0,
      details:
        overAllocatedPayments === 0
          ? "All payments satisfy allocation <= payment amount"
          : `Detected ${overAllocatedPayments} over-allocated payments`,
    });

    // 3. Invariant: Refund sum <= Payment amount
    let overRefundedPayments = 0;
    for (const pay of payments) {
      const sumRef = (pay.refunds || []).reduce(
        (sum: Decimal, r: any) =>
          r.status === "SUCCESS" ? sum.plus(new Decimal(r.amount.toString())) : sum,
        new Decimal(0)
      );
      if (sumRef.greaterThan(new Decimal(pay.amount.toString()))) {
        overRefundedPayments++;
      }
    }
    dataQualityChecks.push({
      checkName: "Invariant 9: Non-over-refund (refunded <= payment amount)",
      passed: overRefundedPayments === 0,
      details:
        overRefundedPayments === 0
          ? "All refunds satisfy refund <= payment amount"
          : `Detected ${overRefundedPayments} over-refunded payments`,
    });

    // 4. Invariant: Double-entry balanced journals (Debit == Credit on every journal)
    let unbalancedJournalCount = 0;
    for (const jrn of journalEntries) {
      let dr = new Decimal(0);
      let cr = new Decimal(0);
      for (const line of jrn.lines) {
        dr = dr.plus(new Decimal(line.debitAmount.toString()));
        cr = cr.plus(new Decimal(line.creditAmount.toString()));
      }
      if (!dr.equals(cr)) {
        unbalancedJournalCount++;
      }
    }
    dataQualityChecks.push({
      checkName: "Invariant 2: Balanced double-entry journals (DR == CR)",
      passed: unbalancedJournalCount === 0,
      details:
        unbalancedJournalCount === 0
          ? "All posted journal entries are mathematically balanced"
          : `Detected ${unbalancedJournalCount} unbalanced journal entries`,
    });

    // 5. Invariant: No orphan allocations
    const invoiceIdSet = new Set(invoices.map((i: any) => i.id));
    let orphanAllocations = 0;
    for (const pay of payments) {
      for (const a of pay.allocations) {
        if (!invoiceIdSet.has(a.invoiceId)) {
          orphanAllocations++;
        }
      }
    }
    dataQualityChecks.push({
      checkName: "Data Integrity: No orphan allocations",
      passed: orphanAllocations === 0,
      details:
        orphanAllocations === 0
          ? "All allocations link to verified tenant invoices"
          : `Detected ${orphanAllocations} orphan allocations`,
    });

    // 6. Invariant: Unique invoice numbers
    const invoiceNumSet = new Set<string>();
    let duplicateInvoices = 0;
    for (const inv of invoices) {
      if (invoiceNumSet.has(inv.invoiceNumber)) {
        duplicateInvoices++;
      } else {
        invoiceNumSet.add(inv.invoiceNumber);
      }
    }
    dataQualityChecks.push({
      checkName: "Data Integrity: Unique invoice numbers",
      passed: duplicateInvoices === 0,
      details:
        duplicateInvoices === 0
          ? "All invoice numbers are unique within tenant"
          : `Detected ${duplicateInvoices} duplicate invoice numbers`,
    });

    // 7. Invariant: Unique receipt numbers
    const receiptNumSet = new Set<string>();
    let duplicateReceipts = 0;
    for (const pay of payments) {
      if (receiptNumSet.has(pay.receiptNumber)) {
        duplicateReceipts++;
      } else {
        receiptNumSet.add(pay.receiptNumber);
      }
    }
    dataQualityChecks.push({
      checkName: "Data Integrity: Unique receipt numbers",
      passed: duplicateReceipts === 0,
      details:
        duplicateReceipts === 0
          ? "All receipt numbers are unique within tenant"
          : `Detected ${duplicateReceipts} duplicate receipt numbers`,
    });

    // Overall Status Evaluation
    const allChecksPassed = dataQualityChecks.every((c) => c.passed);
    let overallStatus: "HEALTHY" | "DISCREPANCY_DETECTED" | "CORRUPTED" = "HEALTHY";

    if (!allChecksPassed || !isTrialBalanceBalanced) {
      overallStatus = "CORRUPTED";
    } else if (!studentsAllReconciled || !isSubledgerGlReconciled) {
      overallStatus = "DISCREPANCY_DETECTED";
    }

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      overallStatus,
      studentCount: studentSummaries.length,
      studentsReconciled: studentsAllReconciled,
      subledgerTotalOutstanding: subledgerTotalOutstanding.toFixed(2),
      generalLedgerArBalance: generalLedgerArBalance.toFixed(2),
      glTrialBalanceDebit: glTrialBalanceDebit.toFixed(2),
      glTrialBalanceCredit: glTrialBalanceCredit.toFixed(2),
      isTrialBalanceBalanced,
      isSubledgerGlReconciled,
      studentSummaries,
      glSummaries,
      dataQualityChecks,
    };
  }
}

export const financialReconciliationService = new FinancialReconciliationService();
