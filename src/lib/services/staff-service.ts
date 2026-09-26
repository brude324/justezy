import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateStaffInput {
  tenantId: string;
  userId: string;
  membershipId: string;
  employeeId: string;
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  designation: string;
  department?: string;
  dateOfJoining?: Date;
  emergencyPhone?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateStaffInput {
  id: string;
  tenantId: string;
  fullName?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  designation?: string;
  department?: string;
  emergencyPhone?: string;
  status?: any;
  actorUserId?: string;
  actorEmail?: string;
}

export class StaffService {
  async createStaff(input: CreateStaffInput, db = prismaTarget) {
    const employeeId = input.employeeId.toUpperCase().trim();

    const existing = await db.staffProfile.findUnique({
      where: {
        tenantId_employeeId: {
          tenantId: input.tenantId,
          employeeId,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Staff member with Employee ID '${employeeId}' already exists in this institution`
      );
    }

    return await db.$transaction(async (tx) => {
      const staff = await tx.staffProfile.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          membershipId: input.membershipId,
          employeeId,
          fullName: input.fullName.trim(),
          gender: input.gender,
          designation: input.designation,
          department: input.department,
          dateOfJoining: input.dateOfJoining || new Date(),
          emergencyPhone: input.emergencyPhone,
          status: "ACTIVE",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ACADEMIC",
          action: "STAFF_ONBOARDED",
          entityType: "StaffProfile",
          entityId: staff.id,
          diffJson: JSON.stringify({ employeeId: staff.employeeId, fullName: staff.fullName }),
        },
      });

      logger.info("Staff profile created", {
        tenantId: input.tenantId,
        staffId: staff.id,
        employeeId: staff.employeeId,
      });

      return staff;
    });
  }

  async updateStaff(input: UpdateStaffInput, db = prismaTarget) {
    const staff = await db.staffProfile.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });

    if (!staff) {
      throw new NotFoundError(`Staff profile with ID '${input.id}' not found in this institution`);
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.staffProfile.update({
        where: { id: input.id },
        data: {
          ...(input.fullName && { fullName: input.fullName.trim() }),
          ...(input.gender && { gender: input.gender }),
          ...(input.designation && { designation: input.designation }),
          ...(input.department !== undefined && { department: input.department }),
          ...(input.emergencyPhone !== undefined && { emergencyPhone: input.emergencyPhone }),
          ...(input.status && { status: input.status }),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ACADEMIC",
          action: "STAFF_UPDATED",
          entityType: "StaffProfile",
          entityId: updated.id,
          diffJson: JSON.stringify({ before: staff, after: updated }),
        },
      });

      logger.info("Staff profile updated", {
        tenantId: input.tenantId,
        staffId: updated.id,
      });

      return updated;
    });
  }

  async deleteStaff(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const staff = await db.staffProfile.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            supervisedClasses: true,
            assignedSubjects: true,
            scheduledLessons: true,
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundError(`Staff profile with ID '${id}' not found in this institution`);
    }

    // Delete Safety Invariant:
    if (
      staff._count.supervisedClasses > 0 ||
      staff._count.assignedSubjects > 0 ||
      staff._count.scheduledLessons > 0
    ) {
      throw new ConflictError(
        `Cannot delete staff member '${staff.fullName}' because they have active class supervision, subject assignments, or scheduled lessons.`
      );
    }

    return await db.$transaction(async (tx) => {
      await tx.staffProfile.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ACADEMIC",
          action: "STAFF_DELETED",
          entityType: "StaffProfile",
          entityId: id,
          diffJson: JSON.stringify({ employeeId: staff.employeeId, fullName: staff.fullName }),
        },
      });

      logger.info("Staff member deleted", { tenantId, staffId: id });
      return { success: true };
    });
  }

  async listStaff(tenantId: string, db = prismaTarget) {
    return await db.staffProfile.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        supervisedClasses: true,
        assignedSubjects: {
          include: {
            subject: true,
            class: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
    });
  }

  async getStaff(id: string, tenantId: string, db = prismaTarget) {
    const staff = await db.staffProfile.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        supervisedClasses: true,
        assignedSubjects: {
          include: {
            subject: true,
            class: true,
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundError(`Staff member with ID '${id}' not found in this institution`);
    }

    return staff;
  }
}

export const staffService = new StaffService();
