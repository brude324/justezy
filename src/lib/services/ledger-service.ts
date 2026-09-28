import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { outboxService } from "./outbox-service";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreateFiscalYearInput {
  tenantId: string;
  yearLabel: string;
  startDate: Date;
  endDate: Date;
  academicYearId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface JournalLineInput {
  accountId: string;
  lineNumber?: number;
  debitAmount: number | string | Decimal;
  creditAmount: number | string | Decimal;
  narration?: string;
}

export interface PostJournalEntryInput {
  tenantId: string;
  periodId: string;
  entryDate: Date;
  sourceType:
    | "FEE_INVOICE"
    | "FEE_PAYMENT"
    | "FEE_REFUND"
    | "PAYROLL_RUN"
    | "INVENTORY_PURCHASE"
    | "ASSET_PURCHASE"
    | "LIBRARY_FINE"
    | "TRANSPORT_CHARGE"
    | "MANUAL_ADJUSTMENT";
  sourceId?: string;
  referenceNumber?: string;
  narration: string;
  lines: JournalLineInput[];
  actorUserId?: string;
  actorEmail?: string;
}

export class LedgerService {
  /**
   * Initializes default standard Chart of Accounts for a new institution.
   */
  async initializeChartOfAccounts(tenantId: string, db = prismaTarget) {
    const DEFAULT_ACCOUNTS = [
      { code: "1010", name: "Cash on Hand", type: "ASSET" as const, subtype: "CASH" as const },
      { code: "1020", name: "Operating Bank Account", type: "ASSET" as const, subtype: "BANK" as const },
      { code: "1200", name: "Accounts Receivable - Student Fees", type: "ASSET" as const, subtype: "ACCOUNTS_RECEIVABLE" as const },
      { code: "2010", name: "Accounts Payable - Vendors", type: "LIABILITY" as const, subtype: "ACCOUNTS_PAYABLE" as const },
      { code: "3010", name: "Institutional Retained Surplus", type: "EQUITY" as const, subtype: "EQUITY_RETAINED" as const },
      { code: "4010", name: "Tuition Fee Income", type: "REVENUE" as const, subtype: "TUITION_INCOME" as const },
      { code: "4020", name: "Transport Fee Income", type: "REVENUE" as const, subtype: "TRANSPORT_INCOME" as const },
      { code: "4030", name: "Library Fine Income", type: "REVENUE" as const, subtype: "LIBRARY_INCOME" as const },
      { code: "5010", name: "Fee Concession & Scholarship Expense", type: "EXPENSE" as const, subtype: "OPERATING_EXPENSE" as const },
      { code: "5020", name: "Fee Refund Adjustment Clearing", type: "EXPENSE" as const, subtype: "OPERATING_EXPENSE" as const },
    ];

    const results = [];
    for (const acc of DEFAULT_ACCOUNTS) {
      const coa = await db.chartOfAccount.upsert({
        where: {
          tenantId_accountCode: {
            tenantId,
            accountCode: acc.code,
          },
        },
        update: {
          accountName: acc.name,
          accountType: acc.type,
          accountSubtype: acc.subtype,
          isActive: true,
        },
        create: {
          tenantId,
          accountCode: acc.code,
          accountName: acc.name,
          accountType: acc.type,
          accountSubtype: acc.subtype,
          isActive: true,
          ledgerAccount: {
            create: {
              tenantId,
              openingBalance: new Decimal(0),
              currentBalance: new Decimal(0),
              currency: "INR",
            },
          },
        },
        include: { ledgerAccount: true },
      });
      results.push(coa);
    }

    logger.info("[LedgerService] Default Chart of Accounts initialized", {
      tenantId,
      accountsCreated: results.length,
    });

    return results;
  }

  /**
   * Sets up a FiscalYear with 12 open monthly financial periods.
   */
  async createFiscalYearAndPeriods(input: CreateFiscalYearInput, db = prismaTarget) {
    const existing = await db.fiscalYear.findUnique({
      where: {
        tenantId_yearLabel: {
          tenantId: input.tenantId,
          yearLabel: input.yearLabel,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Fiscal year '${input.yearLabel}' already exists for this institution`);
    }

    return await db.$transaction(async (tx) => {
      const fiscalYear = await tx.fiscalYear.create({
        data: {
          tenantId: input.tenantId,
          yearLabel: input.yearLabel,
          startDate: input.startDate,
          endDate: input.endDate,
          academicYearId: input.academicYearId,
          status: "OPEN",
        },
      });

      // Generate 12 monthly periods
      const startYear = input.startDate.getFullYear();
      const startMonth = input.startDate.getMonth(); // 0-indexed

      for (let i = 1; i <= 12; i++) {
        const periodStart = new Date(startYear, startMonth + i - 1, 1);
        const periodEnd = new Date(startYear, startMonth + i, 0, 23, 59, 59);
        const monthName = periodStart.toLocaleString("en-US", { month: "short" });

        await tx.financialPeriod.create({
          data: {
            tenantId: input.tenantId,
            fiscalYearId: fiscalYear.id,
            periodNumber: i,
            periodName: `Period ${i} (${monthName} ${periodStart.getFullYear()})`,
            startDate: periodStart,
            endDate: periodEnd,
            status: "OPEN",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "FINANCE",
          action: "FISCAL_YEAR_CREATED",
          entityType: "FiscalYear",
          entityId: fiscalYear.id,
          diffJson: JSON.stringify({
            yearLabel: fiscalYear.yearLabel,
            periodsCreated: 12,
          }),
        },
      });

      return fiscalYear;
    });
  }

  /**
   * Closes or locks a financial period.
   */
  async closeFinancialPeriod(
    tenantId: string,
    periodId: string,
    status: "CLOSED" | "LOCKED" = "CLOSED",
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const period = await db.financialPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) {
      throw new NotFoundError("Financial period not found");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.financialPeriod.update({
        where: { id: periodId },
        data: { status },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "FINANCE",
          action: "FINANCIAL_PERIOD_CLOSED",
          entityType: "FinancialPeriod",
          entityId: period.id,
          diffJson: JSON.stringify({
            periodNumber: period.periodNumber,
            previousStatus: period.status,
            newStatus: status,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "finance.period.closed",
        aggregateType: "FinancialPeriod",
        aggregateId: period.id,
        payload: {
          periodId: period.id,
          periodNumber: period.periodNumber,
          status,
        },
      });

      return updated;
    });
  }

  /**
   * Posts an immutable, balanced Double-Entry Journal Entry.
   *
   * Enforces:
   * Invariant 2: Total Debits == Total Credits
   * Invariant 3: Posted entries cannot be edited
   * Financial Period Control: Rejects posting into CLOSED or LOCKED periods
   */
  async postJournalEntry(input: PostJournalEntryInput, db = prismaTarget) {
    if (!input.lines || input.lines.length < 2) {
      throw new ValidationError("Double-entry journal entry must contain at least 2 lines");
    }

    // 1. Verify Financial Period is OPEN
    const period = await db.financialPeriod.findFirst({
      where: { id: input.periodId, tenantId: input.tenantId },
    });
    if (!period) {
      throw new NotFoundError("Financial period not found for this institution");
    }
    if (period.status !== "OPEN") {
      throw new ValidationError(`Cannot post into a ${period.status.toLowerCase()} financial period`);
    }

    // 2. Validate Double-Entry Invariant: SUM(debits) === SUM(credits)
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const line of input.lines) {
      const debit = new Decimal(line.debitAmount.toString());
      const credit = new Decimal(line.creditAmount.toString());

      if (debit.isNegative() || credit.isNegative()) {
        throw new ValidationError("Debit and credit line amounts cannot be negative");
      }
      if (debit.isZero() && credit.isZero()) {
        throw new ValidationError("Journal line must have either a debit or a credit amount");
      }
      if (!debit.isZero() && !credit.isZero()) {
        throw new ValidationError("A single journal line cannot contain both debit and credit amounts");
      }

      totalDebit = totalDebit.plus(debit);
      totalCredit = totalCredit.plus(credit);
    }

    // Invariant 2 assertion
    if (!totalDebit.equals(totalCredit)) {
      throw new ValidationError(
        `Journal entry is unbalanced: Total Debits (${totalDebit.toString()}) must equal Total Credits (${totalCredit.toString()})`
      );
    }

    const executePost = async (tx: any) => {
      // Generate entry number
      const count = await tx.journalEntry.count({
        where: { tenantId: input.tenantId },
      });
      const entryNumber = `JRN-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

      // Create Entry
      const entry = await tx.journalEntry.create({
        data: {
          tenantId: input.tenantId,
          periodId: input.periodId,
          entryNumber,
          entryDate: input.entryDate,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          referenceNumber: input.referenceNumber,
          narration: input.narration,
          status: "POSTED",
          totalDebit,
          totalCredit,
          postedByUserId: input.actorUserId,
          lines: {
            create: input.lines.map((l, index) => ({
              tenantId: input.tenantId,
              accountId: l.accountId,
              lineNumber: l.lineNumber || index + 1,
              debitAmount: new Decimal(l.debitAmount.toString()),
              creditAmount: new Decimal(l.creditAmount.toString()),
              narration: l.narration,
            })),
          },
        },
        include: { lines: true },
      });

      // Update account balances in ledger
      for (const line of input.lines) {
        const coa = await tx.chartOfAccount.findUnique({
          where: { id: line.accountId },
          include: { ledgerAccount: true },
        });

        if (coa && coa.ledgerAccount) {
          const debit = new Decimal(line.debitAmount.toString());
          const credit = new Decimal(line.creditAmount.toString());
          const currentBal = new Decimal(coa.ledgerAccount.currentBalance.toString());

          // Asset & Expense accounts: Normal Debit balance (+debit, -credit)
          // Liability, Equity & Revenue accounts: Normal Credit balance (+credit, -debit)
          let newBal = currentBal;
          if (coa.accountType === "ASSET" || coa.accountType === "EXPENSE") {
            newBal = currentBal.plus(debit).minus(credit);
          } else {
            newBal = currentBal.plus(credit).minus(debit);
          }

          await tx.ledgerAccount.update({
            where: { id: coa.ledgerAccount.id },
            data: { currentBalance: newBal },
          });
        }
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "FINANCE",
          action: "JOURNAL_ENTRY_POSTED",
          entityType: "JournalEntry",
          entityId: entry.id,
          diffJson: JSON.stringify({
            entryNumber,
            totalDebit: totalDebit.toString(),
            totalCredit: totalCredit.toString(),
            lineCount: input.lines.length,
          }),
        },
      });

      // Outbox Event
      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "finance.journal.posted",
        aggregateType: "JournalEntry",
        aggregateId: entry.id,
        payload: {
          journalEntryId: entry.id,
          entryNumber,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          totalAmount: totalDebit.toString(),
        },
      });

      logger.info("[LedgerService] Balanced journal entry posted", {
        tenantId: input.tenantId,
        entryNumber,
        totalAmount: totalDebit.toString(),
      });

      return entry;
    };

    if (typeof (db as any).$transaction === "function") {
      return await (db as any).$transaction(executePost);
    }
    return await executePost(db);
  }

  /**
   * Reverses a posted journal entry by creating an opposing compensating entry.
   * Enforces Invariant 5: Reversal instead of destructive modification.
   */
  async reverseJournalEntry(
    tenantId: string,
    originalEntryId: string,
    reason: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const original = await db.journalEntry.findFirst({
      where: { id: originalEntryId, tenantId },
      include: { lines: true, period: true },
    });

    if (!original) {
      throw new NotFoundError("Journal entry not found");
    }

    if (original.status === "REVERSED") {
      throw new ValidationError("Journal entry is already reversed");
    }

    return await db.$transaction(async (tx) => {
      // Swapped line items: Debit becomes Credit, Credit becomes Debit
      const reversalLines = original.lines.map((l, index) => ({
        accountId: l.accountId,
        lineNumber: index + 1,
        debitAmount: l.creditAmount, // Swapped
        creditAmount: l.debitAmount, // Swapped
        narration: `Reversal of ${original.entryNumber}: ${reason}`,
      }));

      // Find an open period
      let targetPeriodId = original.periodId;
      if (original.period.status !== "OPEN") {
        const openPeriod = await tx.financialPeriod.findFirst({
          where: { tenantId, status: "OPEN" },
          orderBy: { startDate: "asc" },
        });
        if (!openPeriod) {
          throw new ValidationError("No open financial period available to post reversal");
        }
        targetPeriodId = openPeriod.id;
      }

      // Create reversing entry
      const count = await tx.journalEntry.count({ where: { tenantId } });
      const revEntryNumber = `REV-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

      const reversingEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          periodId: targetPeriodId,
          entryNumber: revEntryNumber,
          entryDate: new Date(),
          sourceType: "MANUAL_ADJUSTMENT",
          sourceId: original.id,
          referenceNumber: original.entryNumber,
          narration: `Compensating reversal of ${original.entryNumber}: ${reason}`,
          status: "POSTED",
          totalDebit: original.totalDebit,
          totalCredit: original.totalCredit,
          postedByUserId: actorUserId,
          lines: {
            create: reversalLines.map((l) => ({
              tenantId,
              accountId: l.accountId,
              lineNumber: l.lineNumber,
              debitAmount: new Decimal(l.debitAmount.toString()),
              creditAmount: new Decimal(l.creditAmount.toString()),
              narration: l.narration,
            })),
          },
        },
      });

      // Update original status to REVERSED
      await tx.journalEntry.update({
        where: { id: original.id },
        data: { status: "REVERSED" },
      });

      // Update ledger balances with reversal
      for (const line of reversalLines) {
        const coa = await tx.chartOfAccount.findUnique({
          where: { id: line.accountId },
          include: { ledgerAccount: true },
        });

        if (coa && coa.ledgerAccount) {
          const debit = new Decimal(line.debitAmount.toString());
          const credit = new Decimal(line.creditAmount.toString());
          const currentBal = new Decimal(coa.ledgerAccount.currentBalance.toString());

          let newBal = currentBal;
          if (coa.accountType === "ASSET" || coa.accountType === "EXPENSE") {
            newBal = currentBal.plus(debit).minus(credit);
          } else {
            newBal = currentBal.plus(credit).minus(debit);
          }

          await tx.ledgerAccount.update({
            where: { id: coa.ledgerAccount.id },
            data: { currentBalance: newBal },
          });
        }
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "FINANCE",
          action: "JOURNAL_ENTRY_REVERSED",
          entityType: "JournalEntry",
          entityId: original.id,
          diffJson: JSON.stringify({
            originalEntryNumber: original.entryNumber,
            reversalEntryNumber: revEntryNumber,
            reason,
          }),
        },
      });

      return reversingEntry;
    });
  }

  /**
   * Helper to retrieve ChartOfAccount ID by account code.
   */
  async getAccountIdByCode(tenantId: string, code: string, db = prismaTarget): Promise<string> {
    const acc = await db.chartOfAccount.findUnique({
      where: {
        tenantId_accountCode: {
          tenantId,
          accountCode: code,
        },
      },
    });
    if (!acc) {
      throw new NotFoundError(`Chart of Account code '${code}' not found`);
    }
    return acc.id;
  }
}

export const ledgerService = new LedgerService();
