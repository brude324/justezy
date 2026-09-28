import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "@/lib/errors";
import { outboxService } from "./outbox-service";
import { ledgerService } from "./ledger-service";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================================================
// TYPES & INTERFACES — PAYROLL
// ============================================================================

export interface CreateSalaryComponentInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  type?: "EARNING" | "DEDUCTION" | "EMPLOYER_CONTRIBUTION";
  calculationMethod?: "FIXED" | "PERCENTAGE_OF_BASIC" | "PERCENTAGE_OF_GROSS" | "DAYS_BASED" | "MANUAL";
  defaultAmount?: number | Decimal;
  percentage?: number | Decimal;
  isTaxable?: boolean;
  isRecurring?: boolean;
  actorUserId?: string;
  actorEmail?: string;
}

export interface SalaryStructureItemInput {
  componentId: string;
  amount?: number | Decimal;
  percentage?: number | Decimal;
}

export interface CreateSalaryStructureInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  items: SalaryStructureItemInput[];
  actorUserId?: string;
  actorEmail?: string;
}

export interface EmployeeCompensationItemInput {
  componentId: string;
  amount: number | Decimal;
  calculationMethod?: "FIXED" | "PERCENTAGE_OF_BASIC" | "PERCENTAGE_OF_GROSS" | "DAYS_BASED" | "MANUAL";
}

export interface AssignEmployeeCompensationInput {
  tenantId: string;
  employmentId: string;
  salaryStructureId?: string;
  basicSalary: number | Decimal;
  grossSalary?: number | Decimal;
  effectiveFrom: Date;
  effectiveTo?: Date;
  items?: EmployeeCompensationItemInput[];
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreatePayrollPeriodInput {
  tenantId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  fiscalYearId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreatePayrollRunInput {
  tenantId: string;
  periodId: string;
  runNumber?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface CreatePayrollAdjustmentInput {
  tenantId: string;
  employmentId: string;
  periodId?: string;
  adjustmentType?: "ARREARS" | "BONUS" | "REIMBURSEMENT" | "DEDUCTION_CORRECTION" | "UNPAID_LEAVE_DEDUCTION" | "MANUAL_ADJUSTMENT";
  amount: number | Decimal;
  reason: string;
  actorUserId: string;
  actorEmail?: string;
}

// ============================================================================
// DOMAIN SERVICE — PAYROLL SERVICE
// ============================================================================

export class PayrollService {
  // --------------------------------------------------------------------------
  // SALARY COMPONENTS & STRUCTURES
  // --------------------------------------------------------------------------

  async createSalaryComponent(input: CreateSalaryComponentInput, db = prismaTarget) {
    if (!input.tenantId || !input.code || !input.name) {
      throw new ValidationError("tenantId, code, and name are required for SalaryComponent");
    }

    const existing = await db.salaryComponent.findFirst({
      where: { tenantId: input.tenantId, code: input.code.toUpperCase().trim() },
    });
    if (existing) {
      throw new ConflictError(`Salary component code '${input.code}' already exists`);
    }

    return db.salaryComponent.create({
      data: {
        tenantId: input.tenantId,
        code: input.code.toUpperCase().trim(),
        name: input.name.trim(),
        description: input.description?.trim(),
        type: input.type || "EARNING",
        calculationMethod: input.calculationMethod || "FIXED",
        defaultAmount: input.defaultAmount !== undefined ? new Decimal(input.defaultAmount) : new Decimal(0),
        percentage: input.percentage !== undefined ? new Decimal(input.percentage) : new Decimal(0),
        isTaxable: input.isTaxable !== undefined ? input.isTaxable : true,
        isRecurring: input.isRecurring !== undefined ? input.isRecurring : true,
        active: true,
      },
    });
  }

  async listSalaryComponents(tenantId: string, db = prismaTarget) {
    return db.salaryComponent.findMany({
      where: { tenantId },
      orderBy: { code: "asc" },
    });
  }

  async createSalaryStructure(input: CreateSalaryStructureInput, db = prismaTarget) {
    if (!input.tenantId || !input.code || !input.name) {
      throw new ValidationError("tenantId, code, and name are required for SalaryStructure");
    }

    const existing = await db.salaryStructure.findFirst({
      where: { tenantId: input.tenantId, code: input.code.toUpperCase().trim() },
    });
    if (existing) {
      throw new ConflictError(`Salary structure code '${input.code}' already exists`);
    }

    return db.$transaction(async (tx) => {
      const structure = await tx.salaryStructure.create({
        data: {
          tenantId: input.tenantId,
          code: input.code.toUpperCase().trim(),
          name: input.name.trim(),
          description: input.description?.trim(),
          active: true,
        },
      });

      if (input.items && input.items.length > 0) {
        for (const item of input.items) {
          await tx.salaryStructureItem.create({
            data: {
              tenantId: input.tenantId,
              structureId: structure.id,
              componentId: item.componentId,
              amount: item.amount !== undefined ? new Decimal(item.amount) : new Decimal(0),
              percentage: item.percentage !== undefined ? new Decimal(item.percentage) : new Decimal(0),
            },
          });
        }
      }

      return tx.salaryStructure.findUnique({
        where: { id: structure.id },
        include: { items: { include: { component: true } } },
      });
    });
  }

  async listSalaryStructures(tenantId: string, db = prismaTarget) {
    return db.salaryStructure.findMany({
      where: { tenantId },
      include: { items: { include: { component: true } } },
      orderBy: { name: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // EMPLOYEE COMPENSATION ASSIGNMENT
  // --------------------------------------------------------------------------

  async assignCompensation(input: AssignEmployeeCompensationInput, db = prismaTarget) {
    if (!input.tenantId || !input.employmentId || input.basicSalary === undefined || !input.effectiveFrom) {
      throw new ValidationError("tenantId, employmentId, basicSalary, and effectiveFrom are required");
    }

    const emp = await db.hREmployment.findFirst({
      where: { id: input.employmentId, tenantId: input.tenantId },
    });
    if (!emp) throw new NotFoundError("Employment record not found in this institution");

    const basic = new Decimal(input.basicSalary);
    let gross = input.grossSalary !== undefined ? new Decimal(input.grossSalary) : basic;

    return db.$transaction(async (tx) => {
      // Deactivate previous active compensation assignments
      await tx.employeeCompensation.updateMany({
        where: { tenantId: input.tenantId, employmentId: input.employmentId, status: "ACTIVE" },
        data: { status: "INACTIVE", effectiveTo: new Date(input.effectiveFrom) },
      });

      const compensation = await tx.employeeCompensation.create({
        data: {
          tenantId: input.tenantId,
          employmentId: input.employmentId,
          salaryStructureId: input.salaryStructureId,
          effectiveFrom: new Date(input.effectiveFrom),
          effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
          basicSalary: basic,
          grossSalary: gross,
          status: "ACTIVE",
          notes: input.notes?.trim(),
        },
      });

      // Add compensation component items if provided
      if (input.items && input.items.length > 0) {
        let calculatedGross = basic;
        for (const item of input.items) {
          const compItem = await tx.employeeCompensationItem.create({
            data: {
              tenantId: input.tenantId,
              compensationId: compensation.id,
              componentId: item.componentId,
              amount: new Decimal(item.amount),
              calculationMethod: item.calculationMethod || "FIXED",
            },
            include: { component: true },
          });
          if (compItem.component.type === "EARNING") {
            calculatedGross = calculatedGross.add(new Decimal(item.amount));
          }
        }
        if (!input.grossSalary) {
          gross = calculatedGross;
          await tx.employeeCompensation.update({
            where: { id: compensation.id },
            data: { grossSalary: gross },
          });
        }
      }

      await outboxService.emit(
        {
          tenantId: input.tenantId,
          eventType: "payroll.compensation.assigned",
          aggregateType: "EmployeeCompensation",
          aggregateId: compensation.id,
          payload: {
            compensationId: compensation.id,
            employmentId: input.employmentId,
            basicSalary: basic,
            grossSalary: gross,
            effectiveFrom: compensation.effectiveFrom,
          },
        },
        tx
      );

      return tx.employeeCompensation.findUnique({
        where: { id: compensation.id },
        include: { items: { include: { component: true } } },
      });
    });
  }

  async getEmployeeCompensation(tenantId: string, employmentId: string, db = prismaTarget) {
    const comp = await db.employeeCompensation.findFirst({
      where: { tenantId, employmentId, status: "ACTIVE" },
      include: { items: { include: { component: true } }, salaryStructure: true },
    });
    return comp;
  }

  // --------------------------------------------------------------------------
  // PAYROLL PERIODS
  // --------------------------------------------------------------------------

  async createPayrollPeriod(input: CreatePayrollPeriodInput, db = prismaTarget) {
    if (!input.tenantId || !input.name || !input.startDate || !input.endDate) {
      throw new ValidationError("tenantId, name, startDate, and endDate are required for PayrollPeriod");
    }

    const existing = await db.payrollPeriod.findFirst({
      where: { tenantId: input.tenantId, name: input.name.trim() },
    });
    if (existing) {
      throw new ConflictError(`Payroll period '${input.name}' already exists in this institution`);
    }

    return db.payrollPeriod.create({
      data: {
        tenantId: input.tenantId,
        name: input.name.trim(),
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "OPEN",
        fiscalYearId: input.fiscalYearId,
      },
    });
  }

  async listPayrollPeriods(tenantId: string, db = prismaTarget) {
    return db.payrollPeriod.findMany({
      where: { tenantId },
      orderBy: { startDate: "desc" },
    });
  }

  // --------------------------------------------------------------------------
  // PAYROLL RUNS & CALCULATION ENGINE
  // --------------------------------------------------------------------------

  async createPayrollRun(input: CreatePayrollRunInput, db = prismaTarget) {
    if (!input.tenantId || !input.periodId) {
      throw new ValidationError("tenantId and periodId are required for PayrollRun");
    }

    const period = await db.payrollPeriod.findFirst({
      where: { id: input.periodId, tenantId: input.tenantId },
    });
    if (!period) throw new NotFoundError("Payroll period not found in this institution");

    // Prevent duplicate active runs for same period
    const existingRun = await db.payrollRun.findFirst({
      where: {
        tenantId: input.tenantId,
        periodId: input.periodId,
        status: { in: ["DRAFT", "PROCESSING", "CALCULATED", "UNDER_REVIEW", "APPROVED", "FINALIZED"] },
      },
    });
    if (existingRun) {
      throw new ConflictError(`An active payroll run already exists for period '${period.name}'`);
    }

    const count = await db.payrollRun.count({ where: { tenantId: input.tenantId } });
    const runNumber = input.runNumber || `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    return db.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({
        data: {
          tenantId: input.tenantId,
          periodId: input.periodId,
          runNumber,
          status: "DRAFT",
          createdByUserId: input.actorUserId,
        },
        include: { period: true },
      });

      await outboxService.emit(
        {
          tenantId: input.tenantId,
          eventType: "payroll.run.created",
          aggregateType: "PayrollRun",
          aggregateId: run.id,
          payload: {
            payrollRunId: run.id,
            periodId: run.periodId,
            runNumber: run.runNumber,
          },
        },
        tx
      );

      return run;
    });
  }

  async calculatePayrollRun(tenantId: string, payrollRunId: string, actorUserId: string, db = prismaTarget) {
    const run = await db.payrollRun.findFirst({
      where: { id: payrollRunId, tenantId },
      include: { period: true },
    });
    if (!run) throw new NotFoundError("Payroll run not found in this institution");
    if (run.status === "FINALIZED") {
      throw new ConflictError(`Cannot recalculate a finalized payroll run`);
    }

    // 1. Fetch active employments with active compensation
    const employments = await db.hREmployment.findMany({
      where: { tenantId, status: { in: ["ACTIVE", "PROBATION", "ON_NOTICE"] } },
      include: {
        staffProfile: { include: { user: true } },
        compensations: {
          where: { status: "ACTIVE" },
          include: { items: { include: { component: true } } },
        },
      },
    });

    return db.$transaction(async (tx) => {
      // Clean up any previous calculations for this run
      await tx.payrollCalculation.deleteMany({
        where: { payrollRunId },
      });

      let totalEmployees = 0;
      let totalGrossEarnings = new Decimal(0);
      let totalEmployeeDeductions = new Decimal(0);
      let totalEmployerContributions = new Decimal(0);
      let totalNetPay = new Decimal(0);

      for (const emp of employments) {
        const comp = emp.compensations[0];
        if (!comp) continue; // Skip employees with no active compensation configured

        totalEmployees += 1;
        const basic = comp.basicSalary;
        let earnings = basic;
        let deductions = new Decimal(0);
        let employerContrib = new Decimal(0);

        const lineItems: any[] = [
          {
            code: "BASIC",
            name: "Basic Salary",
            type: "EARNING",
            amount: basic.toNumber(),
          },
        ];

        // Component items
        for (const item of comp.items) {
          const itemAmount = item.amount;
          if (item.component.type === "EARNING") {
            earnings = earnings.add(itemAmount);
            lineItems.push({
              code: item.component.code,
              name: item.component.name,
              type: "EARNING",
              amount: itemAmount.toNumber(),
            });
          } else if (item.component.type === "DEDUCTION") {
            deductions = deductions.add(itemAmount);
            lineItems.push({
              code: item.component.code,
              name: item.component.name,
              type: "DEDUCTION",
              amount: itemAmount.toNumber(),
            });
          } else if (item.component.type === "EMPLOYER_CONTRIBUTION") {
            employerContrib = employerContrib.add(itemAmount);
            lineItems.push({
              code: item.component.code,
              name: item.component.name,
              type: "EMPLOYER_CONTRIBUTION",
              amount: itemAmount.toNumber(),
            });
          }
        }

        // Attendance & Unpaid Leave Integration
        const unpaidLeaves = await tx.hRLeaveRequest.findMany({
          where: {
            tenantId,
            employmentId: emp.id,
            status: "APPROVED",
            leaveType: { isPaid: false },
            startDate: { lte: run.period.endDate },
            endDate: { gte: run.period.startDate },
          },
        });

        let unpaidDays = new Decimal(0);
        for (const l of unpaidLeaves) {
          unpaidDays = unpaidDays.add(l.daysCount);
        }

        const workingDays = new Decimal(30);
        if (unpaidDays.gt(0)) {
          const dailyRate = basic.div(workingDays);
          const unpaidDeduction = dailyRate.mul(unpaidDays).toDecimalPlaces(2);
          deductions = deductions.add(unpaidDeduction);
          lineItems.push({
            code: "UNPAID_LEAVE",
            name: `Unpaid Leave (${unpaidDays.toString()} days)`,
            type: "DEDUCTION",
            amount: unpaidDeduction.toNumber(),
          });
        }

        // Applied adjustments
        const adjustments = await tx.payrollAdjustment.findMany({
          where: {
            tenantId,
            employmentId: emp.id,
            status: "APPROVED",
            appliedInPayrollRunId: null,
          },
        });

        for (const adj of adjustments) {
          if (["ARREARS", "BONUS", "REIMBURSEMENT"].includes(adj.adjustmentType)) {
            earnings = earnings.add(adj.amount);
            lineItems.push({
              code: adj.adjustmentType,
              name: `Adjustment: ${adj.reason}`,
              type: "EARNING",
              amount: adj.amount.toNumber(),
            });
          } else {
            deductions = deductions.add(adj.amount);
            lineItems.push({
              code: adj.adjustmentType,
              name: `Adjustment: ${adj.reason}`,
              type: "DEDUCTION",
              amount: adj.amount.toNumber(),
            });
          }
          await tx.payrollAdjustment.update({
            where: { id: adj.id },
            data: { status: "APPLIED", appliedInPayrollRunId: run.id },
          });
        }

        const net = earnings.sub(deductions);

        totalGrossEarnings = totalGrossEarnings.add(earnings);
        totalEmployeeDeductions = totalEmployeeDeductions.add(deductions);
        totalEmployerContributions = totalEmployerContributions.add(employerContrib);
        totalNetPay = totalNetPay.add(net);

        await tx.payrollCalculation.create({
          data: {
            tenantId,
            payrollRunId: run.id,
            employmentId: emp.id,
            workingDays,
            presentDays: workingDays.sub(unpaidDays),
            absentDays: new Decimal(0),
            unpaidLeaveDays: unpaidDays,
            grossEarnings: earnings,
            totalDeductions: deductions,
            employerContributions: employerContrib,
            netPay: net,
            taxableAmount: earnings,
            lineItemsJson: JSON.stringify(lineItems),
          },
        });
      }

      const updatedRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: "CALCULATED",
          totalEmployees,
          totalGrossEarnings,
          totalEmployeeDeductions,
          totalEmployerContributions,
          totalNetPay,
          calculatedAt: new Date(),
        },
        include: { period: true, calculations: true },
      });

      await outboxService.emit(
        {
          tenantId,
          eventType: "payroll.run.calculated",
          aggregateType: "PayrollRun",
          aggregateId: run.id,
          payload: {
            payrollRunId: run.id,
            totalEmployees,
            totalGrossEarnings,
            totalNetPay,
          },
        },
        tx
      );

      return updatedRun;
    });
  }

  async reviewPayrollRun(tenantId: string, payrollRunId: string, reviewerUserId: string, db = prismaTarget) {
    const run = await db.payrollRun.findFirst({
      where: { id: payrollRunId, tenantId },
    });
    if (!run) throw new NotFoundError("Payroll run not found");
    if (run.status !== "CALCULATED" && run.status !== "UNDER_REVIEW") {
      throw new ConflictError(`Cannot review payroll run in '${run.status}' state`);
    }

    return db.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: "UNDER_REVIEW" },
    });
  }

  async approvePayrollRun(tenantId: string, payrollRunId: string, approverUserId: string, db = prismaTarget) {
    const run = await db.payrollRun.findFirst({
      where: { id: payrollRunId, tenantId },
    });
    if (!run) throw new NotFoundError("Payroll run not found");
    if (run.status !== "CALCULATED" && run.status !== "UNDER_REVIEW") {
      throw new ConflictError(`Cannot approve payroll run in '${run.status}' state`);
    }

    return db.$transaction(async (tx) => {
      const approved = await tx.payrollRun.update({
        where: { id: payrollRunId },
        data: {
          status: "APPROVED",
          approvedByUserId: approverUserId,
          approvedAt: new Date(),
        },
      });

      await outboxService.emit(
        {
          tenantId,
          eventType: "payroll.run.approved",
          aggregateType: "PayrollRun",
          aggregateId: run.id,
          payload: {
            payrollRunId: run.id,
            approvedByUserId: approverUserId,
            totalNetPay: run.totalNetPay,
          },
        },
        tx
      );

      return approved;
    });
  }

  // --------------------------------------------------------------------------
  // PAYROLL FINALIZATION & FINANCIAL INTEGRATION
  // --------------------------------------------------------------------------

  async finalizePayrollRun(tenantId: string, payrollRunId: string, finalizerUserId: string, db = prismaTarget) {
    const run = await db.payrollRun.findFirst({
      where: { id: payrollRunId, tenantId },
      include: {
        period: true,
        calculations: {
          include: {
            employment: {
              include: {
                staffProfile: { include: { user: true } },
                department: true,
                designation: true,
              },
            },
          },
        },
      },
    });
    if (!run) throw new NotFoundError("Payroll run not found");

    // Idempotency: If already finalized, safely return existing state
    if (run.status === "FINALIZED") {
      return run;
    }

    if (run.status !== "APPROVED") {
      throw new ConflictError(`Cannot finalize payroll run in '${run.status}' state (must be APPROVED)`);
    }

    return db.$transaction(async (tx) => {
      // 1. Generate immutable payslips for all calculated employees
      for (const calc of run.calculations) {
        const payslipNumber = `PS-${run.period.name.replace(/\s+/g, "")}-${calc.employment.employeeNumber}`;
        await tx.payslip.upsert({
          where: {
            payrollRunId_employmentId: {
              payrollRunId: run.id,
              employmentId: calc.employmentId,
            },
          },
          create: {
            tenantId,
            payrollRunId: run.id,
            employmentId: calc.employmentId,
            periodId: run.periodId,
            payslipNumber,
            employeeName: calc.employment.staffProfile.fullName,
            employeeNumber: calc.employment.employeeNumber,
            departmentName: calc.employment.department?.name,
            designationName: calc.employment.designation?.name,
            grossEarnings: calc.grossEarnings,
            totalDeductions: calc.totalDeductions,
            netPay: calc.netPay,
            calculationVersion: run.calculationVersion,
            snapshotJson: calc.lineItemsJson,
            isPublished: true,
          },
          update: {},
        });
      }

      // 2. Financial Boundary Integration: Balanced Double-Entry Journal
      // Debit: Salary Expense (totalGrossEarnings)
      // Credit: Payroll Payable (totalNetPay)
      // Credit: Tax/Statutory Payable (totalEmployeeDeductions)
      // Total Debit = Total Credit!
      let journalEntryId: string | undefined = undefined;

      // Find or create active financial period and chart of accounts
      const financialPeriod = await tx.financialPeriod.findFirst({
        where: { tenantId, status: "OPEN" },
      });

      if (financialPeriod) {
        // Resolve Ledger Accounts
        const [salaryExpenseAccount, payrollPayableAccount, taxPayableAccount] = await Promise.all([
          tx.chartOfAccount.findFirst({
            where: { tenantId, accountType: "EXPENSE" },
          }),
          tx.chartOfAccount.findFirst({
            where: { tenantId, accountType: "LIABILITY" },
          }),
          tx.chartOfAccount.findFirst({
            where: { tenantId, accountType: "LIABILITY" },
          }),
        ]);

        if (salaryExpenseAccount && payrollPayableAccount) {
          const grossAmount = (run as any).totalGrossEarnings || (run as any).totalGrossPay || new Decimal(0);
          const netAmount = (run as any).totalNetPay || new Decimal(0);
          const deductionsAmount = (run as any).totalEmployeeDeductions || (run as any).totalDeductions || new Decimal(0);

          const entry = await ledgerService.postJournalEntry(
            {
              tenantId,
              periodId: financialPeriod.id,
              entryDate: new Date(),
              sourceType: "PAYROLL_RUN" as any,
              sourceId: run.id,
              referenceNumber: run.runNumber,
              narration: `Payroll disbursement for period ${run.period.name} (${run.runNumber})`,
              actorUserId: finalizerUserId,
              lines: [
                {
                  accountId: salaryExpenseAccount.id,
                  debitAmount: grossAmount,
                  creditAmount: new Decimal(0),
                  narration: "Gross Salary Expense",
                },
                {
                  accountId: payrollPayableAccount.id,
                  debitAmount: new Decimal(0),
                  creditAmount: netAmount,
                  narration: "Net Salaries Payable to Employees",
                },
                ...(taxPayableAccount && deductionsAmount && new Decimal(deductionsAmount).gt(0)
                  ? [
                      {
                        accountId: taxPayableAccount.id,
                        debitAmount: new Decimal(0),
                        creditAmount: deductionsAmount,
                        narration: "Employee Deductions and Withholdings Payable",
                      },
                    ]
                  : []),
              ],
            },
            tx as any
          );

          journalEntryId = entry.id;

          // Record accounting posting boundary
          await tx.payrollAccountingPosting.create({
            data: {
              tenantId,
              payrollRunId: run.id,
              journalEntryId: entry.id,
              totalExpense: grossAmount,
              totalPayable: netAmount,
              postedByUserId: finalizerUserId,
            },
          });
        }
      }

      // 3. Mark run as FINALIZED
      const finalizedRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: "FINALIZED",
          finalizedByUserId: finalizerUserId,
          finalizedAt: new Date(),
          journalEntryId,
        },
      });

      // 4. Close payroll period if configured
      await tx.payrollPeriod.update({
        where: { id: run.periodId },
        data: { status: "FINALIZED" },
      });

      // 5. Emit Outbox Events
      await outboxService.emit(
        {
          tenantId,
          eventType: "payroll.run.finalized",
          aggregateType: "PayrollRun",
          aggregateId: run.id,
          payload: {
            payrollRunId: run.id,
            runNumber: run.runNumber,
            totalGrossEarnings: run.totalGrossEarnings,
            totalNetPay: run.totalNetPay,
            journalEntryId,
          },
        },
        tx
      );

      // 6. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: finalizerUserId,
          actionCategory: "PAYROLL",
          action: "PAYROLL_RUN_FINALIZED",
          entityType: "PayrollRun",
          entityId: run.id,
          diffJson: JSON.stringify({
            status: "FINALIZED",
            totalEmployees: run.totalEmployees,
            totalNetPay: run.totalNetPay,
            journalEntryId,
          }),
        },
      });

      return finalizedRun;
    });
  }

  // --------------------------------------------------------------------------
  // PAYSLIPS & ADJUSTMENTS
  // --------------------------------------------------------------------------


  async listPayslips(
    tenantId: string,
    options?: { employmentId?: string; periodId?: string; page?: number; limit?: number },
    db = prismaTarget
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options?.employmentId) where.employmentId = options.employmentId;
    if (options?.periodId) where.periodId = options.periodId;

    const [items, total] = await Promise.all([
      db.payslip.findMany({
        where,
        include: { period: true },
        orderBy: { generatedAt: "desc" },
        skip,
        take: limit,
      }),
      db.payslip.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createAdjustment(input: CreatePayrollAdjustmentInput, db = prismaTarget) {
    if (!input.tenantId || !input.employmentId || input.amount === undefined || !input.reason) {
      throw new ValidationError("tenantId, employmentId, amount, and reason are required for PayrollAdjustment");
    }

    const emp = await db.hREmployment.findFirst({
      where: { id: input.employmentId, tenantId: input.tenantId },
    });
    if (!emp) throw new NotFoundError("Employment record not found in this institution");

    const amount = new Decimal(input.amount);
    if (amount.lte(0)) {
      throw new ValidationError("Adjustment amount must be positive");
    }

    return db.payrollAdjustment.create({
      data: {
        tenantId: input.tenantId,
        employmentId: input.employmentId,
        periodId: input.periodId,
        adjustmentType: input.adjustmentType || "MANUAL_ADJUSTMENT",
        amount,
        reason: input.reason.trim(),
        status: "APPROVED", // Auto-approved when entered by authorized payroll officer
        requestedByUserId: input.actorUserId,
        approvedByUserId: input.actorUserId,
      },
    });
  }

  async listPayrollRuns(
    tenantId: string,
    options?: { periodId?: string; status?: string; page?: number; limit?: number },
    db = prismaTarget
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options?.periodId) where.periodId = options.periodId;
    if (options?.status) where.status = options.status;

    const runs = await db.payrollRun.findMany({
      where,
      include: { period: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    return runs.map((r) => ({
      ...r,
      grossTotal: r.totalGrossEarnings,
      deductionsTotal: r.totalEmployeeDeductions,
      netTotal: r.totalNetPay,
    }));
  }

  async getPayrollRun(tenantId: string, runId: string, db = prismaTarget) {
    const run = await db.payrollRun.findFirst({
      where: { id: runId, tenantId },
      include: {
        period: true,
        calculations: {
          include: {
            employment: {
              include: {
                staffProfile: { include: { user: true } },
                department: true,
                designation: true,
              },
            },
          },
        },
        accountingPosting: true,
      },
    });
    if (!run) throw new NotFoundError("Payroll run not found");
    return {
      ...run,
      grossTotal: run.totalGrossEarnings,
      deductionsTotal: run.totalEmployeeDeductions,
      netTotal: run.totalNetPay,
    };
  }

  async getPayslip(tenantId: string, payslipId: string, db = prismaTarget) {
    const slip = await db.payslip.findFirst({
      where: { id: payslipId, tenantId },
      include: {
        period: true,
        employment: {
          include: {
            staffProfile: { include: { user: true } },
            department: true,
            designation: true,
          },
        },
      },
    });
    if (!slip) throw new NotFoundError("Payslip not found");
    let snapshotData = {};
    try {
      snapshotData = JSON.parse(slip.snapshotJson);
    } catch {
      //
    }
    return {
      ...slip,
      snapshotData,
    };
  }

  async getPayrollSummaryReport(tenantId: string, db = prismaTarget) {
    const finalizedRuns = await db.payrollRun.findMany({
      where: { tenantId, status: "FINALIZED" },
      include: { period: true },
    });

    let totalGrossDisbursed = new Decimal(0);
    let totalDeductionsRetained = new Decimal(0);
    let totalNetDisbursed = new Decimal(0);

    const periodsSummary = finalizedRuns.map((r) => {
      totalGrossDisbursed = totalGrossDisbursed.plus(r.totalGrossEarnings);
      totalDeductionsRetained = totalDeductionsRetained.plus(r.totalEmployeeDeductions);
      totalNetDisbursed = totalNetDisbursed.plus(r.totalNetPay);
      return {
        periodName: r.period.name,
        periodCode: r.runNumber,
        gross: r.totalGrossEarnings.toString(),
        deductions: r.totalEmployeeDeductions.toString(),
        net: r.totalNetPay.toString(),
      };
    });

    return {
      totalGrossDisbursed: totalGrossDisbursed.toString(),
      totalDeductionsRetained: totalDeductionsRetained.toString(),
      totalNetDisbursed: totalNetDisbursed.toString(),
      finalizedRunsCount: finalizedRuns.length,
      periodsSummary,
    };
  }
}

export const payrollService = new PayrollService();
