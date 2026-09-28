import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "@/lib/errors";
import { outboxService } from "./outbox-service";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================================================
// TYPES & INTERFACES — HR
// ============================================================================

export interface CreateHRDepartmentInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  parentDepartmentId?: string;
  headStaffId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateHRDesignationInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  level?: number;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateHRWorkLocationInput {
  tenantId: string;
  code: string;
  name: string;
  address?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateHREmploymentInput {
  tenantId: string;
  staffProfileId: string;
  employeeNumber: string;
  status?: "ACTIVE" | "PROBATION" | "ON_NOTICE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED" | "RESIGNED" | "RETIRED";
  employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "AD_HOC" | "INTERN" | "VISITING";
  departmentId?: string;
  designationId?: string;
  workLocationId?: string;
  reportingManagerStaffId?: string;
  joiningDate: Date;
  confirmationDate?: Date;
  emergencyContactJson?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateHREmploymentInput {
  status?: "ACTIVE" | "PROBATION" | "ON_NOTICE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED" | "RESIGNED" | "RETIRED";
  employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "AD_HOC" | "INTERN" | "VISITING";
  departmentId?: string;
  designationId?: string;
  workLocationId?: string;
  reportingManagerStaffId?: string;
  confirmationDate?: Date;
  exitDate?: Date;
  exitReason?: string;
  reason?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateHRContractInput {
  tenantId: string;
  employmentId: string;
  contractNumber: string;
  employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "AD_HOC" | "INTERN" | "VISITING";
  startDate: Date;
  endDate?: Date;
  probationPeriodDays?: number;
  noticePeriodDays?: number;
  documentReferenceId?: string;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateHRLeaveTypeInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  daysAllowedPerYear: number | Decimal;
  isPaid?: boolean;
  carryForwardDays?: number | Decimal;
  actorUserId?: string;
  actorEmail?: string;
}

export interface AllocateHRLeaveBalanceInput {
  tenantId: string;
  employmentId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number | Decimal;
  actorUserId?: string;
  actorEmail?: string;
}

export interface RequestHRLeaveInput {
  tenantId: string;
  employmentId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  daysCount: number | Decimal;
  reason?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateHRHolidayCalendarInput {
  tenantId: string;
  name: string;
  academicYearId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface AddHRHolidayInput {
  tenantId: string;
  calendarId: string;
  name: string;
  date: Date;
  holidayType?: "NATIONAL" | "REGIONAL" | "INSTITUTIONAL" | "RESTRICTED";
  description?: string;
  actorUserId?: string;
  actorEmail?: string;
}

// ============================================================================
// DOMAIN SERVICE — HR SERVICE
// ============================================================================

export class HRService {
  // --------------------------------------------------------------------------
  // DEPARTMENTS
  // --------------------------------------------------------------------------

  async createDepartment(input: CreateHRDepartmentInput, db = prismaTarget) {
    if (!input.tenantId || !input.code || !input.name) {
      throw new ValidationError("tenantId, code, and name are required for HR Department");
    }

    const existing = await db.hRDepartment.findFirst({
      where: { tenantId: input.tenantId, code: input.code.toUpperCase().trim() },
    });
    if (existing) {
      throw new ConflictError(`Department code '${input.code}' already exists in this institution`);
    }

    if (input.parentDepartmentId) {
      const parent = await db.hRDepartment.findFirst({
        where: { id: input.parentDepartmentId, tenantId: input.tenantId },
      });
      if (!parent) {
        throw new NotFoundError("Parent department not found or belongs to another institution");
      }
    }

    if (input.headStaffId) {
      const staff = await db.staffProfile.findFirst({
        where: { id: input.headStaffId, tenantId: input.tenantId },
      });
      if (!staff) {
        throw new NotFoundError("Head of department staff profile not found");
      }
    }

    const department = await db.hRDepartment.create({
      data: {
        tenantId: input.tenantId,
        code: input.code.toUpperCase().trim(),
        name: input.name.trim(),
        description: input.description?.trim(),
        parentDepartmentId: input.parentDepartmentId,
        headStaffId: input.headStaffId,
        active: true,
      },
    });

    logger.info("HR Department created", {
      tenantId: input.tenantId,
      departmentId: department.id,
      code: department.code,
    });

    return department;
  }

  async listDepartments(tenantId: string, db = prismaTarget) {
    return db.hRDepartment.findMany({
      where: { tenantId },
      include: {
        headStaff: { include: { user: true } },
        parentDepartment: true,
        _count: { select: { employments: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // DESIGNATIONS
  // --------------------------------------------------------------------------

  async createDesignation(input: CreateHRDesignationInput, db = prismaTarget) {
    if (!input.tenantId || !input.code || !input.name) {
      throw new ValidationError("tenantId, code, and name are required for HR Designation");
    }

    const existing = await db.hRDesignation.findFirst({
      where: { tenantId: input.tenantId, code: input.code.toUpperCase().trim() },
    });
    if (existing) {
      throw new ConflictError(`Designation code '${input.code}' already exists in this institution`);
    }

    const designation = await db.hRDesignation.create({
      data: {
        tenantId: input.tenantId,
        code: input.code.toUpperCase().trim(),
        name: input.name.trim(),
        description: input.description?.trim(),
        level: input.level || 1,
        active: true,
      },
    });

    logger.info("HR Designation created", {
      tenantId: input.tenantId,
      designationId: designation.id,
      code: designation.code,
    });

    return designation;
  }

  async listDesignations(tenantId: string, db = prismaTarget) {
    return db.hRDesignation.findMany({
      where: { tenantId },
      include: {
        _count: { select: { employments: true } },
      },
      orderBy: { level: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // WORK LOCATIONS
  // --------------------------------------------------------------------------

  async createWorkLocation(input: CreateHRWorkLocationInput, db = prismaTarget) {
    if (!input.tenantId || !input.code || !input.name) {
      throw new ValidationError("tenantId, code, and name are required for HR Work Location");
    }

    const existing = await db.hRWorkLocation.findFirst({
      where: { tenantId: input.tenantId, code: input.code.toUpperCase().trim() },
    });
    if (existing) {
      throw new ConflictError(`Work location code '${input.code}' already exists in this institution`);
    }

    return db.hRWorkLocation.create({
      data: {
        tenantId: input.tenantId,
        code: input.code.toUpperCase().trim(),
        name: input.name.trim(),
        address: input.address?.trim(),
        active: true,
      },
    });
  }

  async listWorkLocations(tenantId: string, db = prismaTarget) {
    return db.hRWorkLocation.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // EMPLOYEE MASTER & LIFECYCLE
  // --------------------------------------------------------------------------

  async createEmployee(input: CreateHREmploymentInput, db = prismaTarget) {
    if (!input.tenantId || !input.staffProfileId || !input.employeeNumber || !input.joiningDate) {
      throw new ValidationError("tenantId, staffProfileId, employeeNumber, and joiningDate are required");
    }

    // 1. Verify StaffProfile exists and belongs to this tenant
    const staff = await db.staffProfile.findFirst({
      where: { id: input.staffProfileId, tenantId: input.tenantId },
      include: { user: true },
    });
    if (!staff) {
      throw new NotFoundError("Staff profile not found in this institution");
    }

    // 2. Check for duplicate employment record for this staff member or employeeNumber
    const existingForStaff = await db.hREmployment.findFirst({
      where: { staffProfileId: input.staffProfileId, tenantId: input.tenantId },
    });
    if (existingForStaff) {
      throw new ConflictError("HR Employment record already exists for this staff profile");
    }

    const existingEmpNum = await db.hREmployment.findFirst({
      where: { tenantId: input.tenantId, employeeNumber: input.employeeNumber.trim() },
    });
    if (existingEmpNum) {
      throw new ConflictError(`Employee number '${input.employeeNumber}' already exists in this institution`);
    }

    // 3. Verify relations if provided
    if (input.departmentId) {
      const dept = await db.hRDepartment.findFirst({
        where: { id: input.departmentId, tenantId: input.tenantId },
      });
      if (!dept) throw new NotFoundError("Department not found in this institution");
    }

    if (input.designationId) {
      const desig = await db.hRDesignation.findFirst({
        where: { id: input.designationId, tenantId: input.tenantId },
      });
      if (!desig) throw new NotFoundError("Designation not found in this institution");
    }

    return db.$transaction(async (tx) => {
      const employment = await tx.hREmployment.create({
        data: {
          tenantId: input.tenantId,
          staffProfileId: input.staffProfileId,
          employeeNumber: input.employeeNumber.trim(),
          status: input.status || "ACTIVE",
          employmentType: input.employmentType || "FULL_TIME",
          departmentId: input.departmentId,
          designationId: input.designationId,
          workLocationId: input.workLocationId,
          reportingManagerStaffId: input.reportingManagerStaffId,
          joiningDate: new Date(input.joiningDate),
          confirmationDate: input.confirmationDate ? new Date(input.confirmationDate) : undefined,
          emergencyContactJson: input.emergencyContactJson,
        },
        include: {
          staffProfile: { include: { user: true } },
          department: true,
          designation: true,
          workLocation: true,
        },
      });

      // Initial history record
      await tx.hREmploymentHistory.create({
        data: {
          tenantId: input.tenantId,
          employmentId: employment.id,
          newDepartmentId: input.departmentId,
          newDesignationId: input.designationId,
          newStatus: employment.status,
          reason: "Initial employment registration",
          changedByUserId: input.actorUserId,
        },
      });

      // Transactional outbox event
      await outboxService.emit(
        {
          tenantId: input.tenantId,
          eventType: "hr.employee.created",
          aggregateType: "HREmployment",
          aggregateId: employment.id,
          payload: {
            employmentId: employment.id,
            employeeNumber: employment.employeeNumber,
            staffProfileId: employment.staffProfileId,
            status: employment.status,
            joiningDate: employment.joiningDate,
          },
        },
        tx
      );

      // Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId || "SYSTEM",
          actionCategory: "HR",
          action: "HR_EMPLOYEE_CREATED",
          entityType: "HREmployment",
          entityId: employment.id,
          diffJson: JSON.stringify({
            employeeNumber: employment.employeeNumber,
            staffProfileId: employment.staffProfileId,
            status: employment.status,
          }),
        },
      });

      logger.info("HR Employee registered", {
        tenantId: input.tenantId,
        employmentId: employment.id,
        employeeNumber: employment.employeeNumber,
      });

      return employment;
    });
  }

  async updateEmployment(
    tenantId: string,
    employmentId: string,
    input: UpdateHREmploymentInput,
    db = prismaTarget
  ) {
    const existing = await db.hREmployment.findFirst({
      where: { id: employmentId, tenantId },
      include: { staffProfile: true },
    });
    if (!existing) {
      throw new NotFoundError("HR Employment record not found in this institution");
    }

    // Lifecycle invariant: cannot mutate terminated/resigned/retired back to active without explicit process
    const terminalStatuses = ["TERMINATED", "RESIGNED", "RETIRED"];
    if (terminalStatuses.includes(existing.status) && input.status && !terminalStatuses.includes(input.status)) {
      throw new ConflictError(`Cannot reactivate employee in terminal status '${existing.status}'`);
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.hREmployment.update({
        where: { id: employmentId },
        data: {
          status: input.status ?? existing.status,
          employmentType: input.employmentType ?? existing.employmentType,
          departmentId: input.departmentId ?? existing.departmentId,
          designationId: input.designationId ?? existing.designationId,
          workLocationId: input.workLocationId ?? existing.workLocationId,
          reportingManagerStaffId: input.reportingManagerStaffId ?? existing.reportingManagerStaffId,
          confirmationDate: input.confirmationDate ? new Date(input.confirmationDate) : existing.confirmationDate,
          exitDate: input.exitDate ? new Date(input.exitDate) : existing.exitDate,
          exitReason: input.exitReason ?? existing.exitReason,
        },
        include: {
          staffProfile: { include: { user: true } },
          department: true,
          designation: true,
        },
      });

      // Track append-only history if departmental, designation, or status changes occurred
      const hasChanges =
        (input.departmentId && input.departmentId !== existing.departmentId) ||
        (input.designationId && input.designationId !== existing.designationId) ||
        (input.status && input.status !== existing.status);

      if (hasChanges) {
        await tx.hREmploymentHistory.create({
          data: {
            tenantId,
            employmentId,
            previousDepartmentId: existing.departmentId,
            newDepartmentId: updated.departmentId,
            previousDesignationId: existing.designationId,
            newDesignationId: updated.designationId,
            previousStatus: existing.status,
            newStatus: updated.status,
            reason: input.reason || "Employment record update",
            changedByUserId: input.actorUserId,
          },
        });
      }

      await outboxService.emit(
        {
          tenantId,
          eventType: "hr.employment.changed",
          aggregateType: "HREmployment",
          aggregateId: employmentId,
          payload: {
            employmentId,
            previousStatus: existing.status,
            newStatus: updated.status,
            reason: input.reason,
          },
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: input.actorUserId || "SYSTEM",
          actionCategory: "HR",
          action: "HR_EMPLOYMENT_UPDATED",
          entityType: "HREmployment",
          entityId: employmentId,
          diffJson: JSON.stringify({
            status: { from: existing.status, to: updated.status },
            departmentId: { from: existing.departmentId, to: updated.departmentId },
          }),
        },
      });

      return updated;
    });
  }

  async getEmployee(tenantId: string, employmentId: string, db = prismaTarget) {
    const emp = await db.hREmployment.findFirst({
      where: { id: employmentId, tenantId },
      include: {
        staffProfile: { include: { user: true } },
        department: true,
        designation: true,
        workLocation: true,
        contracts: true,
        histories: { orderBy: { changeDate: "desc" } },
        leaveBalances: { include: { leaveType: true } },
      },
    });
    if (!emp) throw new NotFoundError("Employee not found in this institution");
    return emp;
  }

  async listEmployees(
    tenantId: string,
    options?: { departmentId?: string; status?: string; page?: number; limit?: number },
    db = prismaTarget
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options?.departmentId) where.departmentId = options.departmentId;
    if (options?.status) where.status = options.status;

    const [items, total] = await Promise.all([
      db.hREmployment.findMany({
        where,
        include: {
          staffProfile: { include: { user: true } },
          department: true,
          designation: true,
        },
        orderBy: { employeeNumber: "asc" },
        skip,
        take: limit,
      }),
      db.hREmployment.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // --------------------------------------------------------------------------
  // EMPLOYMENT CONTRACTS
  // --------------------------------------------------------------------------

  async createContract(input: CreateHRContractInput, db = prismaTarget) {
    if (!input.tenantId || !input.employmentId || !input.contractNumber || !input.startDate) {
      throw new ValidationError("tenantId, employmentId, contractNumber, and startDate are required");
    }

    const emp = await db.hREmployment.findFirst({
      where: { id: input.employmentId, tenantId: input.tenantId },
    });
    if (!emp) throw new NotFoundError("Employment record not found in this institution");

    const existingNum = await db.hREmploymentContract.findFirst({
      where: { tenantId: input.tenantId, contractNumber: input.contractNumber.trim() },
    });
    if (existingNum) {
      throw new ConflictError(`Contract number '${input.contractNumber}' already exists`);
    }

    return db.$transaction(async (tx) => {
      const contract = await tx.hREmploymentContract.create({
        data: {
          tenantId: input.tenantId,
          employmentId: input.employmentId,
          contractNumber: input.contractNumber.trim(),
          employmentType: input.employmentType || "FULL_TIME",
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          probationPeriodDays: input.probationPeriodDays,
          noticePeriodDays: input.noticePeriodDays,
          status: "ACTIVE",
          documentReferenceId: input.documentReferenceId,
          notes: input.notes?.trim(),
        },
      });

      await outboxService.emit(
        {
          tenantId: input.tenantId,
          eventType: "hr.contract.created",
          aggregateType: "HREmploymentContract",
          aggregateId: contract.id,
          payload: {
            contractId: contract.id,
            employmentId: contract.employmentId,
            contractNumber: contract.contractNumber,
            startDate: contract.startDate,
          },
        },
        tx
      );

      return contract;
    });
  }

  // --------------------------------------------------------------------------
  // LEAVE MANAGEMENT
  // --------------------------------------------------------------------------

  async createLeaveType(input: CreateHRLeaveTypeInput, db = prismaTarget) {
    if (!input.tenantId || !input.code || !input.name || input.daysAllowedPerYear === undefined) {
      throw new ValidationError("tenantId, code, name, and daysAllowedPerYear are required for LeaveType");
    }

    const existing = await db.hRLeaveType.findFirst({
      where: { tenantId: input.tenantId, code: input.code.toUpperCase().trim() },
    });
    if (existing) {
      throw new ConflictError(`Leave type code '${input.code}' already exists`);
    }

    return db.hRLeaveType.create({
      data: {
        tenantId: input.tenantId,
        code: input.code.toUpperCase().trim(),
        name: input.name.trim(),
        description: input.description?.trim(),
        daysAllowedPerYear: new Decimal(input.daysAllowedPerYear),
        isPaid: input.isPaid !== undefined ? input.isPaid : true,
        carryForwardDays: input.carryForwardDays ? new Decimal(input.carryForwardDays) : new Decimal(0),
        active: true,
      },
    });
  }

  async allocateLeaveBalance(input: AllocateHRLeaveBalanceInput, db = prismaTarget) {
    const emp = await db.hREmployment.findFirst({
      where: { id: input.employmentId, tenantId: input.tenantId },
    });
    if (!emp) throw new NotFoundError("Employment record not found");

    const leaveType = await db.hRLeaveType.findFirst({
      where: { id: input.leaveTypeId, tenantId: input.tenantId },
    });
    if (!leaveType) throw new NotFoundError("Leave type not found");

    return db.hRLeaveBalance.upsert({
      where: {
        tenantId_employmentId_leaveTypeId_year: {
          tenantId: input.tenantId,
          employmentId: input.employmentId,
          leaveTypeId: input.leaveTypeId,
          year: input.year,
        },
      },
      create: {
        tenantId: input.tenantId,
        employmentId: input.employmentId,
        leaveTypeId: input.leaveTypeId,
        year: input.year,
        allocatedDays: new Decimal(input.allocatedDays),
        usedDays: new Decimal(0),
        pendingDays: new Decimal(0),
      },
      update: {
        allocatedDays: new Decimal(input.allocatedDays),
      },
    });
  }

  async requestLeave(input: RequestHRLeaveInput, db = prismaTarget) {
    if (!input.tenantId || !input.employmentId || !input.leaveTypeId || !input.startDate || !input.endDate) {
      throw new ValidationError("Missing required fields for leave request");
    }

    const emp = await db.hREmployment.findFirst({
      where: { id: input.employmentId, tenantId: input.tenantId },
    });
    if (!emp) throw new NotFoundError("Employment record not found in this institution");

    const leaveType = await db.hRLeaveType.findFirst({
      where: { id: input.leaveTypeId, tenantId: input.tenantId },
    });
    if (!leaveType) throw new NotFoundError("Leave type not found in this institution");

    const days = new Decimal(input.daysCount || 1);
    if (days.lte(0)) {
      throw new ValidationError("Leave daysCount must be greater than zero");
    }

    return db.$transaction(async (tx) => {
      const currentYear = new Date(input.startDate).getFullYear();
      const balance = await tx.hRLeaveBalance.findFirst({
        where: {
          tenantId: input.tenantId,
          employmentId: input.employmentId,
          leaveTypeId: input.leaveTypeId,
          year: currentYear,
        },
      });

      if (balance) {
        const availableDays = balance.allocatedDays.sub(balance.usedDays).sub(balance.pendingDays);
        if (days.gt(availableDays)) {
          throw new ConflictError(
            `Insufficient leave balance. Available: ${availableDays.toString()} days, Requested: ${days.toString()} days`
          );
        }
      }

      const leaveRequest = await tx.hRLeaveRequest.create({
        data: {
          tenantId: input.tenantId,
          employmentId: input.employmentId,
          leaveTypeId: input.leaveTypeId,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          daysCount: days,
          reason: input.reason?.trim(),
          status: "SUBMITTED",
        },
        include: { leaveType: true, employment: { include: { staffProfile: true } } },
      });

      if (balance) {
        await tx.hRLeaveBalance.update({
          where: { id: balance.id },
          data: { pendingDays: balance.pendingDays.add(days) },
        });
      }

      await outboxService.emit(
        {
          tenantId: input.tenantId,
          eventType: "hr.leave.submitted",
          aggregateType: "HRLeaveRequest",
          aggregateId: leaveRequest.id,
          payload: {
            leaveRequestId: leaveRequest.id,
            employmentId: leaveRequest.employmentId,
            daysCount: leaveRequest.daysCount,
            startDate: leaveRequest.startDate,
            endDate: leaveRequest.endDate,
          },
        },
        tx
      );

      return leaveRequest;
    });
  }

  async approveLeave(
    tenantId: string,
    leaveRequestId: string,
    approvedByUserId: string,
    db = prismaTarget
  ) {
    const leaveRequest = await db.hRLeaveRequest.findFirst({
      where: { id: leaveRequestId, tenantId },
      include: { employment: { include: { staffProfile: true } } },
    });
    if (!leaveRequest) throw new NotFoundError("Leave request not found");
    if (leaveRequest.status !== "SUBMITTED") {
      throw new ConflictError(`Cannot approve leave in '${leaveRequest.status}' state`);
    }

    // Invariant: Employee cannot approve own leave
    if (leaveRequest.employment.staffProfile.userId === approvedByUserId) {
      throw new ForbiddenError("Employees are strictly prohibited from approving their own leave requests");
    }

    const currentYear = new Date(leaveRequest.startDate).getFullYear();
    const balance = await db.hRLeaveBalance.findFirst({
      where: {
        tenantId,
        employmentId: leaveRequest.employmentId,
        leaveTypeId: leaveRequest.leaveTypeId,
        year: currentYear,
      },
    });

    return db.$transaction(async (tx) => {
      const approved = await tx.hRLeaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: "APPROVED",
          approvedByUserId,
          approvedAt: new Date(),
        },
      });

      if (balance) {
        await tx.hRLeaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: Decimal.max(0, balance.pendingDays.sub(leaveRequest.daysCount)),
            usedDays: balance.usedDays.add(leaveRequest.daysCount),
          },
        });
      }

      await outboxService.emit(
        {
          tenantId,
          eventType: "hr.leave.approved",
          aggregateType: "HRLeaveRequest",
          aggregateId: leaveRequestId,
          payload: {
            leaveRequestId,
            approvedByUserId,
            daysCount: leaveRequest.daysCount,
          },
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: approvedByUserId,
          actionCategory: "HR",
          action: "HR_LEAVE_APPROVED",
          entityType: "HRLeaveRequest",
          entityId: leaveRequestId,
          diffJson: JSON.stringify({ status: "APPROVED", daysCount: leaveRequest.daysCount }),
        },
      });

      return approved;
    });
  }

  async rejectLeave(
    tenantId: string,
    leaveRequestId: string,
    rejectedByUserId: string,
    rejectionReason: string,
    db = prismaTarget
  ) {
    const leaveRequest = await db.hRLeaveRequest.findFirst({
      where: { id: leaveRequestId, tenantId },
    });
    if (!leaveRequest) throw new NotFoundError("Leave request not found");
    if (leaveRequest.status !== "SUBMITTED") {
      throw new ConflictError(`Cannot reject leave in '${leaveRequest.status}' state`);
    }

    const currentYear = new Date(leaveRequest.startDate).getFullYear();
    const balance = await db.hRLeaveBalance.findFirst({
      where: {
        tenantId,
        employmentId: leaveRequest.employmentId,
        leaveTypeId: leaveRequest.leaveTypeId,
        year: currentYear,
      },
    });

    return db.$transaction(async (tx) => {
      const rejected = await tx.hRLeaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: "REJECTED",
          approvedByUserId: rejectedByUserId,
          rejectionReason,
        },
      });

      if (balance) {
        await tx.hRLeaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: Decimal.max(0, balance.pendingDays.sub(leaveRequest.daysCount)),
          },
        });
      }

      await outboxService.emit(
        {
          tenantId,
          eventType: "hr.leave.rejected",
          aggregateType: "HRLeaveRequest",
          aggregateId: leaveRequestId,
          payload: {
            leaveRequestId,
            rejectedByUserId,
            rejectionReason,
          },
        },
        tx
      );

      return rejected;
    });
  }

  async listLeaveRequests(
    tenantId: string,
    options?: { status?: any; employmentId?: string; page?: number; limit?: number },
    db = prismaTarget
  ) {
    const where: any = { tenantId };
    if (options?.status) where.status = options.status;
    if (options?.employmentId) where.employmentId = options.employmentId;

    return db.hRLeaveRequest.findMany({
      where,
      include: {
        leaveType: true,
        employment: {
          include: {
            staffProfile: { include: { user: true } },
            department: true,
            designation: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 100,
      skip: options?.page && options?.limit ? (options.page - 1) * options.limit : 0,
    });
  }

  // --------------------------------------------------------------------------
  // HOLIDAY CALENDARS
  // --------------------------------------------------------------------------

  async createHolidayCalendar(input: CreateHRHolidayCalendarInput, db = prismaTarget) {
    if (!input.tenantId || !input.name) {
      throw new ValidationError("tenantId and name are required for holiday calendar");
    }

    const existing = await db.hRHolidayCalendar.findFirst({
      where: { tenantId: input.tenantId, name: input.name.trim() },
    });
    if (existing) {
      throw new ConflictError(`Holiday calendar '${input.name}' already exists in this institution`);
    }

    return db.hRHolidayCalendar.create({
      data: {
        tenantId: input.tenantId,
        name: input.name.trim(),
        academicYearId: input.academicYearId,
        active: true,
      },
    });
  }

  async addHoliday(input: AddHRHolidayInput, db = prismaTarget) {
    if (!input.tenantId || !input.calendarId || !input.name || !input.date) {
      throw new ValidationError("tenantId, calendarId, name, and date are required");
    }

    const calendar = await db.hRHolidayCalendar.findFirst({
      where: { id: input.calendarId, tenantId: input.tenantId },
    });
    if (!calendar) throw new NotFoundError("Holiday calendar not found");

    return db.hRHoliday.create({
      data: {
        tenantId: input.tenantId,
        calendarId: input.calendarId,
        name: input.name.trim(),
        date: new Date(input.date),
        holidayType: input.holidayType || "INSTITUTIONAL",
        description: input.description?.trim(),
      },
    });
  }

  async listLeaveTypes(tenantId: string, db = prismaTarget) {
    return db.hRLeaveType.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async listHolidayCalendars(tenantId: string, db = prismaTarget) {
    return db.hRHolidayCalendar.findMany({
      where: { tenantId },
      include: { holidays: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async listHolidays(tenantId: string, calendarId?: string, db = prismaTarget) {
    const where: any = { tenantId };
    if (calendarId) where.calendarId = calendarId;
    return db.hRHoliday.findMany({
      where,
      orderBy: { date: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // HR REPORTING
  // --------------------------------------------------------------------------

  async getHeadcountReport(tenantId: string, db = prismaTarget) {
    const [total, byStatus, byDepartment, byEmploymentType] = await Promise.all([
      db.hREmployment.count({ where: { tenantId } }),
      db.hREmployment.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { id: true },
      }),
      db.hREmployment.groupBy({
        by: ["departmentId"],
        where: { tenantId },
        _count: { id: true },
      }),
      db.hREmployment.groupBy({
        by: ["employmentType"],
        where: { tenantId },
        _count: { id: true },
      }),
    ]);

    return { total, byStatus, byDepartment, byEmploymentType };
  }
}

export const hrService = new HRService();
