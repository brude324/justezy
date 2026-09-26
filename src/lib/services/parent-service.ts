import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateParentInput {
  tenantId: string;
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  occupation?: string;
  address?: string;
  userId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateParentInput {
  id: string;
  tenantId: string;
  fullName?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  occupation?: string;
  address?: string;
  isActive?: boolean;
  actorUserId?: string;
  actorEmail?: string;
}

export class ParentService {
  async createParent(input: CreateParentInput, db = prismaTarget) {
    const primaryPhone = input.primaryPhone.trim();

    const existing = await db.parentProfile.findUnique({
      where: {
        tenantId_primaryPhone: {
          tenantId: input.tenantId,
          primaryPhone,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Parent / guardian with phone '${primaryPhone}' already registered in this institution`
      );
    }

    return await db.$transaction(async (tx) => {
      const parent = await tx.parentProfile.create({
        data: {
          tenantId: input.tenantId,
          fullName: input.fullName.trim(),
          primaryPhone,
          secondaryPhone: input.secondaryPhone,
          email: input.email,
          occupation: input.occupation,
          address: input.address,
          userId: input.userId,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "STUDENT",
          action: "PARENT_REGISTERED",
          entityType: "ParentProfile",
          entityId: parent.id,
          diffJson: JSON.stringify({ fullName: parent.fullName, phone: parent.primaryPhone }),
        },
      });

      logger.info("Parent profile created", { tenantId: input.tenantId, parentId: parent.id });
      return parent;
    });
  }

  async updateParent(input: UpdateParentInput, db = prismaTarget) {
    const parent = await db.parentProfile.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });

    if (!parent) {
      throw new NotFoundError(`Parent with ID '${input.id}' not found in this institution`);
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.parentProfile.update({
        where: { id: input.id },
        data: {
          ...(input.fullName && { fullName: input.fullName.trim() }),
          ...(input.primaryPhone && { primaryPhone: input.primaryPhone.trim() }),
          ...(input.secondaryPhone !== undefined && { secondaryPhone: input.secondaryPhone }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.occupation !== undefined && { occupation: input.occupation }),
          ...(input.address !== undefined && { address: input.address }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "STUDENT",
          action: "PARENT_UPDATED",
          entityType: "ParentProfile",
          entityId: updated.id,
          diffJson: JSON.stringify({ before: parent, after: updated }),
        },
      });

      logger.info("Parent profile updated", { tenantId: input.tenantId, parentId: updated.id });
      return updated;
    });
  }

  async deleteParent(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const parent = await db.parentProfile.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { children: true },
        },
      },
    });

    if (!parent) {
      throw new NotFoundError(`Parent with ID '${id}' not found in this institution`);
    }

    // Delete Safety Invariant:
    if (parent._count.children > 0) {
      throw new ConflictError(
        `Cannot delete parent profile '${parent.fullName}' because they have ${parent._count.children} linked student profile(s). Unlink student bindings first.`
      );
    }

    return await db.$transaction(async (tx) => {
      await tx.parentProfile.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "STUDENT",
          action: "PARENT_DELETED",
          entityType: "ParentProfile",
          entityId: id,
          diffJson: JSON.stringify({ fullName: parent.fullName }),
        },
      });

      logger.info("Parent record safely deleted", { tenantId, parentId: id });
      return { success: true };
    });
  }

  async listParents(tenantId: string, db = prismaTarget) {
    return await db.parentProfile.findMany({
      where: { tenantId },
      include: {
        children: {
          include: {
            student: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
    });
  }

  async getParent(id: string, tenantId: string, db = prismaTarget) {
    const parent = await db.parentProfile.findFirst({
      where: { id, tenantId },
      include: {
        children: {
          include: { student: true },
        },
      },
    });

    if (!parent) {
      throw new NotFoundError(`Parent with ID '${id}' not found in this institution`);
    }

    return parent;
  }
}

export const parentService = new ParentService();
