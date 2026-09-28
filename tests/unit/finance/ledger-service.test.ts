import { describe, it, expect, vi, beforeEach } from "vitest";
import { LedgerService } from "@/lib/services/ledger-service";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("LedgerService Domain Tests — Wave 1 (Categories K, L, M, N, S, T)", () => {
  let service: LedgerService;
  let mockDb: any;
  const tenantId = "tnt_test_school";

  beforeEach(() => {
    service = new LedgerService();
    mockDb = {
      chartOfAccount: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      fiscalYear: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      financialPeriod: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      journalEntry: {
        create: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      ledgerAccount: {
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "outbox_mock_1" }),
      },
      $transaction: vi.fn(async (cb) => cb(mockDb)),
    };
  });

  describe("Category K & N: Chart of Accounts & Fiscal Periods", () => {
    it("should initialize default standard chart of accounts", async () => {
      mockDb.chartOfAccount.upsert.mockResolvedValue({ id: "acc_mock" });

      const accounts = await service.initializeChartOfAccounts(tenantId, mockDb);

      expect(accounts.length).toBe(10);
      expect(mockDb.chartOfAccount.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_accountCode: {
              tenantId,
              accountCode: "1010",
            },
          },
        })
      );
    });

    it("should create fiscal year with 12 open monthly periods", async () => {
      mockDb.fiscalYear.findUnique.mockResolvedValue(null);
      mockDb.fiscalYear.create.mockResolvedValue({
        id: "fy_2026",
        tenantId,
        yearLabel: "2026-2027",
      });

      const fy = await service.createFiscalYearAndPeriods(
        {
          tenantId,
          yearLabel: "2026-2027",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          actorUserId: "usr_admin",
        },
        mockDb
      );

      expect(fy.id).toBe("fy_2026");
      // 12 monthly periods created
      expect(mockDb.financialPeriod.create).toHaveBeenCalledTimes(12);
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "FISCAL_YEAR_CREATED",
            actionCategory: "FINANCE",
          }),
        })
      );
    });

    it("should close financial period and emit outbox event", async () => {
      mockDb.financialPeriod.findFirst.mockResolvedValue({
        id: "period_1",
        tenantId,
        periodNumber: 1,
        status: "OPEN",
      });
      mockDb.financialPeriod.update.mockResolvedValue({
        id: "period_1",
        status: "CLOSED",
      });

      const closed = await service.closeFinancialPeriod(
        tenantId,
        "period_1",
        "CLOSED",
        "usr_admin",
        undefined,
        mockDb
      );

      expect(closed.status).toBe("CLOSED");
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "finance.period.closed",
          }),
        })
      );
    });
  });

  describe("Category K & L: Double-Entry Balancing & Posting Invariants", () => {
    it("should successfully post balanced journal entry and update account balances", async () => {
      mockDb.financialPeriod.findFirst.mockResolvedValue({
        id: "period_1",
        tenantId,
        status: "OPEN",
      });

      mockDb.journalEntry.count.mockResolvedValue(50);
      mockDb.journalEntry.create.mockResolvedValue({
        id: "jrn_1",
        entryNumber: "JRN-2026-00051",
        totalDebit: new Decimal("25000.00"),
        totalCredit: new Decimal("25000.00"),
        status: "POSTED",
      });

      // Mock chart of accounts for ledger balance updates
      mockDb.chartOfAccount.findUnique
        .mockResolvedValueOnce({
          id: "acc_bank",
          accountType: "ASSET",
          ledgerAccount: { id: "la_bank", currentBalance: new Decimal("100000.00") },
        })
        .mockResolvedValueOnce({
          id: "acc_ar",
          accountType: "ASSET",
          ledgerAccount: { id: "la_ar", currentBalance: new Decimal("50000.00") },
        });

      const entry = await service.postJournalEntry(
        {
          tenantId,
          periodId: "period_1",
          entryDate: new Date("2026-05-10"),
          sourceType: "FEE_PAYMENT",
          narration: "Student fee payment collected via Bank Transfer",
          lines: [
            { accountId: "acc_bank", lineNumber: 1, debitAmount: 25000, creditAmount: 0 },
            { accountId: "acc_ar", lineNumber: 2, debitAmount: 0, creditAmount: 25000 },
          ],
        },
        mockDb
      );

      expect(entry.entryNumber).toBe("JRN-2026-00051");
      // Bank Asset account debited (+25,000): 100,000 -> 125,000
      expect(mockDb.ledgerAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "la_bank" },
          data: { currentBalance: new Decimal("125000.00") },
        })
      );
      // AR Asset account credited (-25,000): 50,000 -> 25,000
      expect(mockDb.ledgerAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "la_ar" },
          data: { currentBalance: new Decimal("25000.00") },
        })
      );
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "finance.journal.posted",
          }),
        })
      );
    });

    it("should enforce Invariant 2: reject unbalanced journal entry where debits != credits", async () => {
      mockDb.financialPeriod.findFirst.mockResolvedValue({
        id: "period_1",
        tenantId,
        status: "OPEN",
      });

      await expect(
        service.postJournalEntry(
          {
            tenantId,
            periodId: "period_1",
            entryDate: new Date(),
            sourceType: "MANUAL_ADJUSTMENT",
            narration: "Unbalanced attempt",
            lines: [
              { accountId: "acc_1", debitAmount: 10000, creditAmount: 0 },
              { accountId: "acc_2", debitAmount: 0, creditAmount: 9500 }, // 10,000 != 9,500!
            ],
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should reject posting into a CLOSED or LOCKED financial period", async () => {
      mockDb.financialPeriod.findFirst.mockResolvedValue({
        id: "period_locked",
        tenantId,
        status: "LOCKED",
      });

      await expect(
        service.postJournalEntry(
          {
            tenantId,
            periodId: "period_locked",
            entryDate: new Date(),
            sourceType: "MANUAL_ADJUSTMENT",
            narration: "Posting in locked period",
            lines: [
              { accountId: "acc_1", debitAmount: 1000, creditAmount: 0 },
              { accountId: "acc_2", debitAmount: 0, creditAmount: 1000 },
            ],
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Category M: Reversal Instead of Destructive Editing (Invariant 5)", () => {
    it("should reverse posted journal entry by generating compensating opposing entry", async () => {
      mockDb.journalEntry.findFirst.mockResolvedValue({
        id: "jrn_original",
        tenantId,
        entryNumber: "JRN-2026-00010",
        periodId: "period_1",
        period: { status: "OPEN" },
        status: "POSTED",
        totalDebit: new Decimal("5000.00"),
        totalCredit: new Decimal("5000.00"),
        lines: [
          { accountId: "acc_cash", lineNumber: 1, debitAmount: new Decimal("5000.00"), creditAmount: new Decimal("0.00") },
          { accountId: "acc_income", lineNumber: 2, debitAmount: new Decimal("0.00"), creditAmount: new Decimal("5000.00") },
        ],
      });

      mockDb.journalEntry.count.mockResolvedValue(100);
      mockDb.journalEntry.create.mockResolvedValue({
        id: "jrn_rev",
        entryNumber: "REV-2026-00101",
        status: "POSTED",
      });

      mockDb.chartOfAccount.findUnique
        .mockResolvedValueOnce({
          id: "acc_cash",
          accountType: "ASSET",
          ledgerAccount: { id: "la_cash", currentBalance: new Decimal("20000.00") },
        })
        .mockResolvedValueOnce({
          id: "acc_income",
          accountType: "REVENUE",
          ledgerAccount: { id: "la_income", currentBalance: new Decimal("50000.00") },
        });

      const reversal = await service.reverseJournalEntry(
        tenantId,
        "jrn_original",
        "Duplicate posting correction",
        "usr_admin",
        undefined,
        mockDb
      );

      expect(reversal.id).toBe("jrn_rev");
      // Original entry marked as REVERSED
      expect(mockDb.journalEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "jrn_original" },
          data: { status: "REVERSED" },
        })
      );
      // Reversal lines should swap: Cash credited 5000, Income debited 5000
      expect(mockDb.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceType: "MANUAL_ADJUSTMENT",
            referenceNumber: "JRN-2026-00010",
          }),
        })
      );
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "JOURNAL_ENTRY_REVERSED",
            actionCategory: "FINANCE",
          }),
        })
      );
    });

    it("should reject reversal if journal entry is already reversed", async () => {
      mockDb.journalEntry.findFirst.mockResolvedValue({
        id: "jrn_already_rev",
        tenantId,
        status: "REVERSED",
        period: { status: "OPEN" },
        lines: [],
      });

      await expect(
        service.reverseJournalEntry(tenantId, "jrn_already_rev", "Second reversal", "usr_admin", undefined, mockDb)
      ).rejects.toThrow(ValidationError);
    });
  });
});
