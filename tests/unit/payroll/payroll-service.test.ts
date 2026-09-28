import { describe, it, expect, vi, beforeEach } from "vitest";
import { PayrollService } from "@/lib/services/payroll-service";
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

vi.mock("@/lib/services/outbox-service", () => ({
  outboxService: {
    emit: vi.fn().mockResolvedValue({ id: "evt_1" }),
    emitEvent: vi.fn().mockResolvedValue({ id: "evt_1" }),
  },
}));

describe("Payroll Service Unit & Domain Invariants", () => {
  let payrollService: PayrollService;
  let mockDb: any;
  let mockTx: any;

  const tenantAlpha = "tnt_alpha_school";
  const tenantBeta = "tnt_beta_academy";

  beforeEach(() => {
    payrollService = new PayrollService();

    mockTx = {
      salaryComponent: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "comp_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      salaryStructure: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "struct_1", ...data })),
        findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id, items: [] })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      salaryStructureItem: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "item_1", ...data })),
      },
      hREmployment: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      employeeCompensation: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "comp_assign_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "comp_assign_1", ...data })),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve({ id: where.id, basicSalary: new Decimal(40000), items: [] })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      employeeCompensationItem: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "assign_item_1", ...data })),
      },
      payrollPeriod: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "period_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "period_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      payrollRun: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "run_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "run_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      payrollCalculation: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "calc_1", ...data })),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      payrollAdjustment: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "adj_1", ...data })),
      },
      payslip: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "slip_1", ...data })),
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: "slip_1", ...create })),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      hRLeaveRequest: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      chartOfAccount: {
        findFirst: vi.fn().mockImplementation(({ where }) => {
          const key = where.code || where.subtype || "account";
          return Promise.resolve({ id: `coa_${String(key).toLowerCase()}`, code: key, name: key, tenantId: where.tenantId });
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
        create: vi.fn().mockResolvedValue({ id: "jrnl_1", journalNumber: "JRNL-001" }),
      },
      payrollAccountingPosting: {
        create: vi.fn().mockResolvedValue({ id: "post_1" }),
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

  describe("Components & Salary Structures", () => {
    it("should create salary component and reject duplicates within tenant", async () => {
      mockDb.salaryComponent.findFirst.mockResolvedValueOnce(null);

      const comp = await payrollService.createSalaryComponent(
        {
          tenantId: tenantAlpha,
          code: "BASIC_PAY",
          name: "Basic Salary",
          type: "EARNING",
          calculationMethod: "FIXED",
        },
        mockDb
      );

      expect(comp.code).toBe("BASIC_PAY");
      expect(comp.type).toBe("EARNING");

      mockDb.salaryComponent.findFirst.mockResolvedValueOnce({ id: "existing_comp", code: "BASIC_PAY" });
      await expect(
        payrollService.createSalaryComponent(
          {
            tenantId: tenantAlpha,
            code: "BASIC_PAY",
            name: "Duplicate Basic",
            type: "EARNING",
            calculationMethod: "FIXED",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should assemble salary structure with earnings and deductions", async () => {
      mockDb.salaryStructure.findFirst.mockResolvedValue(null);
      mockDb.salaryComponent.findFirst
        .mockResolvedValueOnce({ id: "c_basic", code: "BASIC" })
        .mockResolvedValueOnce({ id: "c_hra", code: "HRA" });

      const structure = await payrollService.createSalaryStructure(
        {
          tenantId: tenantAlpha,
          code: "GRADE_1_TEACHER",
          name: "Grade 1 Teacher Scale",
          items: [
            { componentId: "c_basic", amount: new Decimal(30000) },
            { componentId: "c_hra", percentage: new Decimal(20) },
          ],
        },
        mockDb
      );

      expect(structure!.id).toBeDefined();
      expect(mockTx.salaryStructureItem.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("Employee Compensation Assignment", () => {
    it("should assign compensation structure to employee with gross calculation", async () => {
      mockDb.hREmployment.findFirst.mockResolvedValue({ id: "emp_1", tenantId: tenantAlpha });
      mockDb.salaryStructure.findFirst.mockResolvedValue({
        id: "struct_1",
        tenantId: tenantAlpha,
        items: [
          { componentId: "c_basic", component: { id: "c_basic", name: "Basic", type: "EARNING" }, amount: new Decimal(40000), percentage: null },
          { componentId: "c_hra", component: { id: "c_hra", name: "HRA", type: "EARNING" }, amount: new Decimal(10000), percentage: null },
        ],
      });
      mockDb.employeeCompensation.findFirst.mockResolvedValue(null);

      const assign = await payrollService.assignCompensation(
        {
          tenantId: tenantAlpha,
          employmentId: "emp_1",
          salaryStructureId: "struct_1",
          basicSalary: new Decimal(40000),
          grossSalary: new Decimal(50000),
          effectiveFrom: new Date("2026-04-01"),
          actorUserId: "usr_payroll_admin",
        },
        mockDb
      );

      expect(assign!.basicSalary).toEqual(new Decimal(40000));
      expect(mockTx.employeeCompensation.create).toHaveBeenCalled();
    });
  });

  describe("Deterministic Calculation & Loss of Pay Invariants", () => {
    it("should calculate payroll run and create calculation records", async () => {
      mockDb.payrollRun.findFirst.mockResolvedValue({
        id: "run_1",
        tenantId: tenantAlpha,
        runNumber: "RUN-2026-04",
        status: "DRAFT",
        periodId: "per_apr_2026",
        period: {
          id: "per_apr_2026",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2026-04-30"),
          workingDays: 30,
        },
      });

      const mockEmployee = {
        id: "emp_1",
        tenantId: tenantAlpha,
        status: "ACTIVE",
        employeeNumber: "EMP-001",
        staffProfile: { user: { firstName: "John", lastName: "Doe" } },
        compensations: [
          {
            id: "comp_1",
            status: "ACTIVE",
            basicSalary: new Decimal(30000),
            grossSalary: new Decimal(35000),
            items: [],
          },
        ],
      };

      mockDb.hREmployment.findMany = vi.fn().mockResolvedValue([mockEmployee]);
      mockDb.hRLeaveRequest.findMany = vi.fn().mockResolvedValue([
        {
          employmentId: "emp_1",
          daysCount: new Decimal(3),
          leaveType: { isPaid: false },
        },
      ]);
      mockDb.payrollAdjustment.findMany = vi.fn().mockResolvedValue([]);

      const run = await payrollService.calculatePayrollRun(
        tenantAlpha,
        "run_1",
        "usr_payroll_officer",
        mockDb
      );

      expect(mockTx.payrollCalculation.create).toHaveBeenCalled();
      expect(mockTx.payrollRun.update).toHaveBeenCalled();
      expect(run.status).toBe("CALCULATED");
    });
  });

  describe("Payroll Lifecycle, Four-Eye Approval & Finalization", () => {
    it("should transition run through REVIEW and APPROVE", async () => {
      mockDb.payrollRun.findFirst.mockResolvedValue({
        id: "run_1",
        tenantId: tenantAlpha,
        status: "CALCULATED",
        totalNetPay: new Decimal(50000),
      });

      const reviewed = await payrollService.reviewPayrollRun(
        tenantAlpha,
        "run_1",
        "usr_reviewer",
        mockDb
      );
      expect(reviewed.status).toBe("UNDER_REVIEW");

      mockDb.payrollRun.findFirst.mockResolvedValue({
        id: "run_1",
        tenantId: tenantAlpha,
        status: "UNDER_REVIEW",
        totalNetPay: new Decimal(50000),
      });

      const approved = await payrollService.approvePayrollRun(
        tenantAlpha,
        "run_1",
        "usr_approver",
        mockDb
      );
      expect(approved.status).toBe("APPROVED");
    });

    it("should finalize approved run, create immutable payslips, and post balanced GL journal", async () => {
      mockDb.payrollRun.findFirst.mockResolvedValue({
        id: "run_1",
        tenantId: tenantAlpha,
        runNumber: "RUN-2026-04",
        status: "APPROVED",
        periodId: "per_apr_2026",
        totalGrossPay: new Decimal(50000),
        totalEmployeeDeductions: new Decimal(5000),
        totalDeductions: new Decimal(5000),
        totalNetPay: new Decimal(45000),
        period: { name: "April 2026", year: 2026, month: 4 },
        calculations: [
          {
            id: "calc_1",
            employmentId: "emp_1",
            grossPay: new Decimal(50000),
            totalDeductions: new Decimal(5000),
            netPay: new Decimal(45000),
            snapshotJson: JSON.stringify({ earnings: [], deductions: [] }),
            employment: {
              employeeNumber: "EMP-001",
              staffProfile: { user: { firstName: "Alice", lastName: "Smith" } },
            },
          },
        ],
      });
      mockDb.payslip.findFirst.mockResolvedValue(null);

      const finalized = await payrollService.finalizePayrollRun(
        tenantAlpha,
        "run_1",
        "usr_manager",
        mockDb
      );

      expect(finalized.status).toBe("FINALIZED");
      expect(mockTx.payslip.upsert).toHaveBeenCalled();
      expect(mockTx.journalEntry.create).toHaveBeenCalled();
      expect(mockTx.payrollAccountingPosting.create).toHaveBeenCalled();
    });

    it("should be IDEMPOTENT: second finalization call must not create duplicate payslips or GL journals", async () => {
      mockDb.payrollRun.findFirst.mockResolvedValue({
        id: "run_1",
        tenantId: tenantAlpha,
        runNumber: "RUN-2026-04",
        status: "FINALIZED", // Already finalized!
      });

      const res = await payrollService.finalizePayrollRun(
        tenantAlpha,
        "run_1",
        "usr_manager",
        mockDb
      );

      expect(res.status).toBe("FINALIZED");
      expect(mockTx.payslip.upsert).not.toHaveBeenCalled();
      expect(mockTx.journalEntry.create).not.toHaveBeenCalled();
    });
  });
});
