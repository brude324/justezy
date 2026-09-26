import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import {
  ForbiddenError,
  NotFoundError,
  CrossTenantAccessError,
  ConflictError,
} from "@/lib/errors";
import { AccessScopeType } from "./rbac-types";

export interface CreateCustomRoleParams {
  tenantId: string;
  roleKey: string;
  name: string;
  description?: string;
  permissions: Array<{
    permissionKey: string;
    accessScope?: AccessScopeType;
  }>;
  actorUserId: string;
}

export interface AssignRoleParams {
  tenantId: string;
  userId: string;
  roleId: string;
  actorUserId: string;
}

export class RoleService {
  /**
   * Creates a tenant-custom role with assigned atomic permissions and horizontal access scopes.
   */
  async createCustomRole(params: CreateCustomRoleParams, db = prismaTarget) {
    const { tenantId, roleKey, name, description, permissions, actorUserId } = params;

    // 1. Verify tenant exists
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    // 2. Privilege Escalation Defense: Verify actor holds active membership in this tenant
    const actorMembership = await db.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId, userId: actorUserId },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!actorMembership || actorMembership.status !== "ACTIVE") {
      throw new ForbiddenError("Caller lacks active membership to manage roles in this tenant");
    }

    const hasManagePermission =
      actorMembership.role.roleKey === "INSTITUTION_OWNER" ||
      actorMembership.role.permissions.some(
        (rp) => rp.permission.permissionKey === "tenant.manage"
      );

    if (!hasManagePermission) {
      throw new ForbiddenError("Privilege Escalation Blocked: Caller lacks permission to manage roles");
    }

    // 3. Check role key uniqueness within this tenant
    const existing = await db.role.findUnique({
      where: {
        tenantId_roleKey: { tenantId, roleKey },
      },
    });
    if (existing) {
      throw new ConflictError(`Role '${roleKey}' already exists for this tenant`);
    }

    return await db.$transaction(async (tx) => {
      // 4. Create Custom Role
      const role = await tx.role.create({
        data: {
          tenantId,
          roleKey,
          name,
          description,
          isSystemRole: false,
        },
      });

      // 5. Bind Permissions
      for (const p of permissions) {
        const permRecord = await tx.permission.findUnique({
          where: { permissionKey: p.permissionKey },
        });

        if (!permRecord) {
          throw new NotFoundError(`Permission '${p.permissionKey}' does not exist in catalog`);
        }

        await tx.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permRecord.id,
            accessScope: (p.accessScope || "INSTITUTION_WIDE") as any,
          },
        });
      }

      // 6. Audit Trail
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actionCategory: "RBAC",
          action: "CUSTOM_ROLE_CREATED",
          entityType: "Role",
          entityId: role.id,
          diffJson: JSON.stringify({ roleKey, name, permissionsCount: permissions.length }),
        },
      });

      logger.info("Custom tenant role created", {
        tenantId,
        roleId: role.id,
        roleKey,
        actorUserId,
      });

      return role;
    });
  }

  /**
   * Assigns a role to a user's membership within a specific tenant.
   *
   * SECURITY INVARIANTS:
   * 1. Cannot assign roles across tenant boundaries.
   * 2. Cannot self-escalate privileges.
   */
  async assignRoleToUser(params: AssignRoleParams, db = prismaTarget) {
    const { tenantId, userId, roleId, actorUserId } = params;

    // 1. Verify target role belongs to this tenant OR is a system role (tenantId: null)
    const targetRole = await db.role.findUnique({
      where: { id: roleId },
    });
    if (!targetRole) {
      throw new NotFoundError(`Role '${roleId}' not found`);
    }

    if (targetRole.tenantId && targetRole.tenantId !== tenantId) {
      throw new CrossTenantAccessError(
        `Cross-Tenant Escalation Blocked: Role '${roleId}' belongs to another institution`
      );
    }

    // 2. Prevent self-escalation if caller is not already owner/admin
    if (userId === actorUserId && targetRole.roleKey === "INSTITUTION_OWNER") {
      const currentMembership = await db.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId: actorUserId } },
        include: { role: true },
      });
      if (currentMembership?.role.roleKey !== "INSTITUTION_OWNER") {
        throw new ForbiddenError("Privilege Escalation Blocked: Cannot self-assign Institution Owner");
      }
    }

    // 3. Update Membership
    const updatedMembership = await db.tenantMembership.update({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      data: {
        roleId,
      },
      include: {
        role: true,
      },
    });

    // 4. Audit Trail
    await db.auditLog.create({
      data: {
        tenantId,
        actorId: actorUserId,
        actionCategory: "RBAC",
        action: "MEMBERSHIP_ROLE_ASSIGNED",
        entityType: "TenantMembership",
        entityId: updatedMembership.id,
        diffJson: JSON.stringify({ targetUserId: userId, newRoleId: roleId, roleKey: targetRole.roleKey }),
      },
    });

    logger.info("Role assigned to user membership", {
      tenantId,
      userId,
      roleId,
      actorUserId,
    });

    return updatedMembership;
  }

  /**
   * Retrieves all permissions and access scopes bound to a role.
   */
  async getRolePermissions(roleId: string, db = prismaTarget) {
    return db.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    });
  }
}

export const roleService = new RoleService();
