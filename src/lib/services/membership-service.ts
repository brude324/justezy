import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { NotFoundError, TenantSuspendedError } from "@/lib/errors";

export class MembershipService {
  /**
   * Adds or updates a user's membership in a specific institutional tenant.
   */
  async addMembership(
    tenantId: string,
    userId: string,
    roleId: string,
    db = prismaTarget
  ) {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundError(`Tenant with ID '${tenantId}' not found`);
    }
    if (tenant.status === "SUSPENDED" || tenant.status === "ARCHIVED") {
      throw new TenantSuspendedError(`Tenant '${tenant.name}' is currently ${tenant.status.toLowerCase()}`);
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundError(`User with ID '${userId}' not found`);
    }

    const membership = await db.tenantMembership.upsert({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      create: {
        tenantId,
        userId,
        roleId,
        status: "ACTIVE",
      },
      update: {
        roleId,
        status: "ACTIVE",
      },
      include: {
        role: true,
        tenant: true,
      },
    });

    logger.info("Tenant membership assigned", {
      tenantId,
      userId,
      roleId,
      membershipId: membership.id,
    });

    return membership;
  }

  /**
   * Looks up a specific user's membership in a tenant.
   */
  async getMembership(tenantId: string, userId: string, db = prismaTarget) {
    return db.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      include: {
        role: true,
        tenant: true,
      },
    });
  }

  /**
   * Lists all institutional memberships for a given user.
   */
  async listUserMemberships(userId: string, db = prismaTarget) {
    return db.tenantMembership.findMany({
      where: {
        userId,
        status: "ACTIVE",
        tenant: {
          status: "ACTIVE",
        },
      },
      include: {
        tenant: true,
        role: true,
      },
    });
  }

  /**
   * Suspends or terminates a user's membership in a tenant.
   */
  async updateMembershipStatus(
    tenantId: string,
    userId: string,
    status: "ACTIVE" | "SUSPENDED" | "TERMINATED",
    db = prismaTarget
  ) {
    const updated = await db.tenantMembership.update({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      data: {
        status,
        terminatedAt: status === "TERMINATED" ? new Date() : null,
      },
    });

    logger.info("Tenant membership status updated", {
      tenantId,
      userId,
      newStatus: status,
    });

    return updated;
  }
}

export const membershipService = new MembershipService();
