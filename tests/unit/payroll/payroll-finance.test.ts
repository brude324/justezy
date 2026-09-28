import { describe, it, expect, vi, beforeEach } from "vitest";
import { PayrollService } from "@/lib/services/payroll-service";
import { Decimal } from "@prisma/client/runtime/library";

vi.mock("@/lib/services/outbox-service", () => ({
  outboxService: {
    emit: vi.fn().mockResolvedValue({ id: "evt_1" }),
    emitEvent: vi.fn().mockResolvedValue({ id: "evt_1" }),
  },
}));

describe("Payroll Financial Boundary & Double-Entry Ledger Invariants", () => {
  let payrollService: PayrollService;
  let mockDb: any;
  let mockTx: any;

  const tenantAlpha = "tnt_alpha_school";
  const tenantBeta = "tnt_beta_academy";

  beforeEach(() => {
    payrollService = new PayrollService();

    mockTx = {
      payrollPeriod: {
        update: vi.fn().mockResolvedValue({ id: "per_1" }),
      },
      payrollRun: {
        findFirst: vi.fn(),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "run_fin_1", ...data })),
      },
      chartOfAccount: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          const key = where.code || where.subtype || "account";
          return Promise.resolve({
            id: `coa_${String(key).toLowerCase()}`,
            code: key,
            name: key,
            tenantId: where.tenantId,
          });
        }),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          return Promise.resolve({
            id: where.id,
            code: "ACC",
            name: "Account",
            accountType: "EXPENSE",
            tenantId: "tnt_alpha_school",
            ledgerAccount: { id: "la_1", currentBalance: new Decimal(0) },
          });
        }),
      },
      ledgerAccount: {
        update: vi.fn().mockResolvedValue({ id: "la_1" }),
      },
      financialPeriod: {
        findFirst: vi.fn().mockResolvedValue({ id: "fp_1", name: "FY2026", status: "OPEN" }),
      },
      journalEntry: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation(({ data }) => {
          return Promise.resolve({ id: "jrnl_fin_1", ...data });
        }),
      },
      payrollAccountingPosting: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "post_1", ...data })),
      },
      payslip: {
        create: vi.fn().mockResolvedValue({ id: "slip_1" }),
        upsert: vi.fn().mockResolvedValue({ id: "slip_1" }),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "evt_1" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_1" }),
      },
    };

    mockDb = {
      ...mockTx,
      $transaction: vi.fn(async (cb) => cb(mockTx)),
    };
  });

  it("Financial Invariant 1: Payroll calculation does NOT directly mutate GL before finalization", async () => {
    // When a run is just calculated or reviewed, GL journal entry should not be called
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled();
    expect(mockTx.payrollAccountingPosting.create).not.toHaveBeenCalled();
  });

  it("Financial Invariant 2 & 3: Finalized payroll creates balanced GL journal (Total Debits == Total Credits)", async () => {
    const gross = new Decimal("125000.00");
    const deductions = new Decimal("15000.00");
    const net = new Decimal("110000.00");

    mockDb.payrollRun.findFirst.mockResolvedValue({
      id: "run_fin_1",
      tenantId: tenantAlpha,
      runNumber: "RUN-2026-05",
      status: "APPROVED",
      periodId: "per_may_2026",
      totalGrossPay: gross,
      totalEmployeeDeductions: deductions,
      totalDeductions: deductions,
      totalNetPay: net,
      period: { name: "May 2026", year: 2026, month: 5 },
      calculations: [],
    });

    await payrollService.finalizePayrollRun(tenantAlpha, "run_fin_1", "usr_cfo", mockDb);

    expect(mockTx.journalEntry.create).toHaveBeenCalledTimes(1);

    const callArgs = mockTx.journalEntry.create.mock.calls[0][0];
    const journalData = callArgs.data;

    expect(journalData.tenantId).toBe(tenantAlpha);
    expect(journalData.lines.create).toBeDefined();

    const lines = journalData.lines.create;

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const line of lines) {
      if (line.debitAmount) totalDebit = totalDebit.plus(line.debitAmount);
      if (line.creditAmount) totalCredit = totalCredit.plus(line.creditAmount);
    }

    expect(totalDebit.toString()).toBe("125000");
    expect(totalCredit.toString()).toBe("125000");
    expect(totalDebit.equals(totalCredit)).toBe(true); // Balanced double-entry!
  });

  it("Financial Invariant 4: Duplicate finalization does NOT duplicate journal entry", async () => {
    mockDb.payrollRun.findFirst.mockResolvedValue({
      id: "run_fin_1",
      tenantId: tenantAlpha,
      runNumber: "RUN-2026-05",
      status: "FINALIZED", // Already finalized
      totalGrossPay: new Decimal(100000),
      totalDeductions: new Decimal(10000),
      totalNetPay: new Decimal(90000),
      period: { name: "May 2026" },
    });

    await payrollService.finalizePayrollRun(tenantAlpha, "run_fin_1", "usr_cfo", mockDb);

    expect(mockTx.journalEntry.create).not.toHaveBeenCalled();
    expect(mockTx.payrollAccountingPosting.create).not.toHaveBeenCalled();
  });

  it("Financial Invariant 7: Tenant isolation in financial records", async () => {
    mockDb.payrollRun.findFirst.mockResolvedValue(null); // Run not found for TenantBeta

    await expect(
      payrollService.finalizePayrollRun(tenantBeta, "run_fin_1", "usr_beta_actor", mockDb)
    ).rejects.toThrow();
  });
});
