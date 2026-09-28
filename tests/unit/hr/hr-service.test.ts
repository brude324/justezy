import { describe, it, expect, vi, beforeEach } from "vitest";
import { HRService } from "@/lib/services/hr-service";
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

vi.mock("@/lib/services/outbox-service", () => ({
  outboxService: {
    emit: vi.fn().mockResolvedValue({ id: "evt_1" }),
  },
}));

describe("HR Service Unit & Domain Invariants", () => {
  let hrService: HRService;
  let mockDb: any;
  let mockTx: any;

  const tenantAlpha = "tnt_alpha_school";
  const tenantBeta = "tnt_beta_academy";

  beforeEach(() => {
    hrService = new HRService();

    mockTx = {
      hRDepartment: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "dept_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      hRDesignation: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "desig_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      hRWorkLocation: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "loc_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      staffProfile: {
        findFirst: vi.fn(),
      },
      hREmployment: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "emp_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "emp_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      hREmploymentHistory: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "hist_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      hREmploymentContract: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "cnt_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "cnt_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      hRLeaveType: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "lt_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      hRLeaveBalance: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "bal_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "bal_1", ...data })),
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: "bal_1", ...create })),
      },
      hRLeaveRequest: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "lr_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "lr_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      hRHolidayCalendar: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "cal_1", ...data })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      hRHoliday: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "hol_1", ...data })),
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

  describe("Departments & Designations", () => {
    it("should successfully create a new department within a tenant", async () => {
      mockDb.hRDepartment.findFirst.mockResolvedValue(null);

      const dept = await hrService.createDepartment(
        {
          tenantId: tenantAlpha,
          code: "MATH_DEPT",
          name: "Mathematics Department",
        },
        mockDb
      );

      expect(dept.code).toBe("MATH_DEPT");
      expect(dept.tenantId).toBe(tenantAlpha);
      expect(mockDb.hRDepartment.create).toHaveBeenCalled();
    });

    it("should reject department creation if code already exists in tenant", async () => {
      mockDb.hRDepartment.findFirst.mockResolvedValue({ id: "existing_dept", code: "MATH_DEPT" });

      await expect(
        hrService.createDepartment(
          {
            tenantId: tenantAlpha,
            code: "MATH_DEPT",
            name: "Duplicate Math",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should create a designation and reject duplicates within tenant", async () => {
      mockDb.hRDesignation.findFirst.mockResolvedValueOnce(null);

      const desig = await hrService.createDesignation(
        {
          tenantId: tenantAlpha,
          code: "SR_TEACHER",
          name: "Senior Teacher",
          level: 2,
        },
        mockDb
      );

      expect(desig.code).toBe("SR_TEACHER");

      mockDb.hRDesignation.findFirst.mockResolvedValueOnce({ id: "existing_desig", code: "SR_TEACHER" });
      await expect(
        hrService.createDesignation(
          {
            tenantId: tenantAlpha,
            code: "SR_TEACHER",
            name: "Senior Teacher Duplicate",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Employee Master & Lifecycle", () => {
    it("should register an employee linked to an existing StaffProfile in tenant", async () => {
      mockDb.staffProfile.findFirst.mockResolvedValue({
        id: "staff_1",
        tenantId: tenantAlpha,
        hrEmployment: null,
      });
      mockDb.hREmployment.findFirst.mockResolvedValue(null);

      const emp = await hrService.createEmployee(
        {
          tenantId: tenantAlpha,
          staffProfileId: "staff_1",
          employeeNumber: "EMP-2026-001",
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          joiningDate: new Date("2026-01-15"),
          actorUserId: "usr_admin",
        },
        mockDb
      );

      expect(emp.employeeNumber).toBe("EMP-2026-001");
      expect(emp.tenantId).toBe(tenantAlpha);
      expect(mockTx.hREmployment.create).toHaveBeenCalled();
      expect(mockTx.hREmploymentHistory.create).toHaveBeenCalled();
    });

    it("should reject employee registration if StaffProfile belongs to another tenant (Tenant Isolation)", async () => {
      mockDb.staffProfile.findFirst.mockResolvedValue(null); // Not found in tenantAlpha

      await expect(
        hrService.createEmployee(
          {
            tenantId: tenantAlpha,
            staffProfileId: "staff_beta_1",
            employeeNumber: "EMP-001",
            employmentType: "FULL_TIME",
            status: "ACTIVE",
            joiningDate: new Date(),
            actorUserId: "usr_admin",
          },
          mockDb
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("should reject duplicate employee numbers within the same tenant", async () => {
      mockDb.staffProfile.findFirst.mockResolvedValue({
        id: "staff_2",
        tenantId: tenantAlpha,
        hrEmployment: null,
      });
      mockDb.hREmployment.findFirst
        .mockResolvedValueOnce(null) // no existing for this staff
        .mockResolvedValueOnce({
          id: "existing_emp",
          employeeNumber: "EMP-2026-001",
        });

      await expect(
        hrService.createEmployee(
          {
            tenantId: tenantAlpha,
            staffProfileId: "staff_2",
            employeeNumber: "EMP-2026-001",
            employmentType: "FULL_TIME",
            status: "ACTIVE",
            joiningDate: new Date(),
            actorUserId: "usr_admin",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should record append-only employment history on lifecycle status update", async () => {
      mockDb.hREmployment.findFirst.mockResolvedValue({
        id: "emp_1",
        tenantId: tenantAlpha,
        status: "PROBATION",
        departmentId: "dept_math",
        designationId: "desig_jr",
      });

      await hrService.updateEmployment(
        tenantAlpha,
        "emp_1",
        {
          status: "ACTIVE",
          confirmationDate: new Date("2026-06-01"),
          reason: "Completed 6-month probation successfully",
          actorUserId: "usr_hr_manager",
        },
        mockDb
      );

      expect(mockTx.hREmployment.update).toHaveBeenCalled();
      expect(mockTx.hREmploymentHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: tenantAlpha,
            employmentId: "emp_1",
            newStatus: "ACTIVE",
          }),
        })
      );
    });
  });

  describe("Employment Contracts", () => {
    it("should create an employment contract and enforce uniqueness", async () => {
      mockDb.hREmployment.findFirst.mockResolvedValue({ id: "emp_1", tenantId: tenantAlpha });
      mockDb.hREmploymentContract.findFirst.mockResolvedValue(null);

      const contract = await hrService.createContract(
        {
          tenantId: tenantAlpha,
          employmentId: "emp_1",
          contractNumber: "CNT-2026-001",
          employmentType: "FULL_TIME",
          startDate: new Date("2026-01-01"),
        },
        mockDb
      );

      expect(contract.contractNumber).toBe("CNT-2026-001");
      expect(mockTx.hREmploymentContract.create).toHaveBeenCalled();
    });

    it("should reject contract creation with duplicate contract number", async () => {
      mockDb.hREmployment.findFirst.mockResolvedValue({ id: "emp_1", tenantId: tenantAlpha });
      mockDb.hREmploymentContract.findFirst.mockResolvedValue({ id: "active_cnt", contractNumber: "CNT-2026-001" });

      await expect(
        hrService.createContract(
          {
            tenantId: tenantAlpha,
            employmentId: "emp_1",
            contractNumber: "CNT-2026-001",
            employmentType: "FULL_TIME",
            startDate: new Date("2026-01-01"),
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Leave Management & Policy Invariants", () => {
    it("should submit leave request with balance sufficiency", async () => {
      mockDb.hREmployment.findFirst.mockResolvedValue({ id: "emp_1", tenantId: tenantAlpha });
      mockDb.hRLeaveType.findFirst.mockResolvedValue({ id: "lt_casual", tenantId: tenantAlpha, isPaid: true });
      mockDb.hRLeaveBalance.findFirst.mockResolvedValue({
        id: "bal_1",
        allocatedDays: new Decimal(12),
        usedDays: new Decimal(2),
        pendingDays: new Decimal(0),
      });

      const req = await hrService.requestLeave(
        {
          tenantId: tenantAlpha,
          employmentId: "emp_1",
          leaveTypeId: "lt_casual",
          startDate: new Date("2026-04-10"),
          endDate: new Date("2026-04-12"),
          daysCount: new Decimal(3),
          reason: "Family event",
          actorUserId: "usr_staff_1",
        },
        mockDb
      );

      expect(req.daysCount).toEqual(new Decimal(3));
      expect(mockTx.hRLeaveRequest.create).toHaveBeenCalled();
      expect(mockTx.hRLeaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pendingDays: expect.any(Decimal),
          }),
        })
      );
    });

    it("should REJECT self-approval by applicant (Security Invariant: employee cannot approve own leave)", async () => {
      mockDb.hRLeaveRequest.findFirst.mockResolvedValue({
        id: "lr_1",
        tenantId: tenantAlpha,
        status: "SUBMITTED",
        employment: {
          staffProfile: {
            userId: "usr_applicant",
          },
        },
      });

      await expect(
        hrService.approveLeave(
          tenantAlpha,
          "lr_1",
          "usr_applicant", // Self-approver!
          mockDb
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it("should allow authorized manager to approve leave and debit balance", async () => {
      mockDb.hRLeaveRequest.findFirst.mockResolvedValue({
        id: "lr_1",
        tenantId: tenantAlpha,
        status: "SUBMITTED",
        employmentId: "emp_1",
        leaveTypeId: "lt_casual",
        daysCount: new Decimal(2),
        startDate: new Date("2026-04-10"),
        employment: {
          staffProfile: {
            userId: "usr_applicant",
          },
        },
      });
      mockDb.hRLeaveBalance.findFirst.mockResolvedValue({
        id: "bal_1",
        year: 2026,
        allocatedDays: new Decimal(10),
        usedDays: new Decimal(1),
        pendingDays: new Decimal(2),
      });

      const approved = await hrService.approveLeave(
        tenantAlpha,
        "lr_1",
        "usr_manager_different",
        mockDb
      );

      expect(approved.status).toBe("APPROVED");
      expect(mockTx.hRLeaveRequest.update).toHaveBeenCalled();
      expect(mockTx.hRLeaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usedDays: expect.any(Decimal),
            pendingDays: expect.any(Decimal),
          }),
        })
      );
    });
  });

  describe("Holiday Calendars", () => {
    it("should configure holiday calendar and add holidays", async () => {
      mockDb.hRHolidayCalendar.findFirst.mockResolvedValue(null);

      const cal = await hrService.createHolidayCalendar(
        {
          tenantId: tenantAlpha,
          name: "Academic Year 2026 Holidays",
        },
        mockDb
      );

      expect(cal.name).toBe("Academic Year 2026 Holidays");
      expect(mockDb.hRHolidayCalendar.create).toHaveBeenCalled();

      mockDb.hRHolidayCalendar.findFirst.mockResolvedValue({ id: "cal_1", tenantId: tenantAlpha });
      mockDb.hRHoliday.findFirst.mockResolvedValue(null);

      await hrService.addHoliday(
        {
          tenantId: tenantAlpha,
          calendarId: "cal_1",
          name: "Republic Day",
          date: new Date("2026-01-26"),
          holidayType: "NATIONAL",
        },
        mockDb
      );

      expect(mockDb.hRHoliday.create).toHaveBeenCalled();
    });
  });
});
