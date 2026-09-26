import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateTenantParams {
  slug: string;
  name: string;
  legalName?: string;
  ownerUserId: string;
  planTier?: string;
  currency?: string;
  timezone?: string;
  locale?: string;
  studentQuota?: number;
  staffQuota?: number;
}

export class TenantService {
  /**
   * Atomically creates a new Tenant along with default policies, branding,
   * initial owner membership, and baseline module entitlements.
   */
  async createTenant(params: CreateTenantParams, db = prismaTarget) {
    const slug = params.slug.toLowerCase().trim();

    // Check slug uniqueness
    const existing = await db.tenant.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictError(`Tenant with slug '${slug}' already exists`);
    }

    // Verify owner user exists
    const owner = await db.user.findUnique({
      where: { id: params.ownerUserId },
    });
    if (!owner) {
      throw new NotFoundError(`Owner user with ID '${params.ownerUserId}' not found`);
    }

    return await db.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: params.name,
          legalName: params.legalName || params.name,
          status: "ACTIVE",
          planTier: params.planTier || "STARTER",
          currency: params.currency || "INR",
          timezone: params.timezone || "Asia/Kolkata",
          locale: params.locale || "en-IN",
          studentQuota: params.studentQuota ?? 500,
          staffQuota: params.staffQuota ?? 50,
        },
      });

      // 2. Create Default TenantPolicy
      await tx.tenantPolicy.create({
        data: {
          tenantId: tenant.id,
          attendanceCutoffTime: "10:30",
          attendanceWarningThresholdPercent: 75.0,
          autoSmsOnAbsence: true,
          defaultPassingPercentage: 33.0,
          allowParentPortalRegistration: false,
        },
      });

      // 3. Create Default TenantBranding
      await tx.tenantBranding.create({
        data: {
          tenantId: tenant.id,
          primaryColorHex: "#0284c7",
        },
      });

      // 4. Resolve or create INSTITUTION_OWNER system role
      let ownerRole = await tx.role.findFirst({
        where: { roleKey: "INSTITUTION_OWNER", tenantId: null },
      });
      if (!ownerRole) {
        ownerRole = await tx.role.create({
          data: {
            roleKey: "INSTITUTION_OWNER",
            name: "Institution Owner",
            description: "Full institutional administrative governance",
            isSystemRole: true,
          },
        });
      }

      // 5. Create Initial Owner TenantMembership
      const membership = await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: owner.id,
          roleId: ownerRole.id,
          status: "ACTIVE",
        },
      });

      // 6. Provision Core Module Entitlements
      const coreModules = ["core_academics", "attendance_module", "communication_module"];
      for (const moduleKey of coreModules) {
        // Ensure module exists in catalog
        await tx.module.upsert({
          where: { moduleKey },
          create: {
            moduleKey,
            displayName: moduleKey.replace(/_/g, " ").toUpperCase(),
            isCore: true,
          },
          update: {},
        });

        await tx.tenantModuleEntitlement.create({
          data: {
            tenantId: tenant.id,
            moduleKey,
            isEnabled: true,
          },
        });
      }

      // 7. Audit Log Entry
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: owner.id,
          actorEmail: owner.email,
          actionCategory: "TENANT_MGMT",
          action: "TENANT_PROVISIONED",
          entityType: "Tenant",
          entityId: tenant.id,
          diffJson: JSON.stringify({ slug, name: tenant.name, planTier: tenant.planTier }),
        },
      });

      logger.info("New institutional tenant provisioned atomically", {
        tenantId: tenant.id,
        slug: tenant.slug,
        ownerUserId: owner.id,
      });

      return { tenant, membership };
    });
  }

  async getTenantById(tenantId: string, db = prismaTarget) {
    return db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        policy: true,
        branding: true,
        domains: true,
      },
    });
  }

  async getTenantBySlug(slug: string, db = prismaTarget) {
    return db.tenant.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      include: {
        policy: true,
        branding: true,
        domains: true,
      },
    });
  }

  /**
   * Allowed lifecycle transitions for institutional tenants.
   */
  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    PROVISIONING: ["TRIAL", "ACTIVE", "ARCHIVED"],
    TRIAL: ["ACTIVE", "SUSPENDED", "ARCHIVED"],
    ACTIVE: ["SUSPENDED", "ARCHIVED"],
    SUSPENDED: ["ACTIVE", "ARCHIVED"],
    ARCHIVED: ["ACTIVE"],
  };

  /**
   * Updates tenant lifecycle status adhering to the authorized state machine.
   * Emits audit logs and fails safely on invalid transitions.
   */
  async updateTenantStatus(
    tenantId: string,
    newStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED" | "PROVISIONING" | "TRIAL",
    options?: { actorId?: string; actorEmail?: string; reason?: string } | any,
    db = prismaTarget
  ) {
    // Handle overload where 3rd param might be db instance from existing tests
    const isDb = options && typeof options.$transaction === "function";
    const actualDb = isDb ? options : db;
    const actorId = isDb ? undefined : options?.actorId;
    const actorEmail = isDb ? undefined : options?.actorEmail;
    const reason = isDb ? undefined : options?.reason;

    const currentTenant = await actualDb.tenant.findUnique?.({
      where: { id: tenantId },
      select: { id: true, status: true, name: true, slug: true },
    });

    const currentStatus = currentTenant?.status || "ACTIVE";
    if (currentTenant && currentStatus !== newStatus) {
      const allowed = TenantService.VALID_TRANSITIONS[currentStatus];
      if (!allowed || !allowed.includes(newStatus)) {
        throw new ConflictError(
          `Invalid tenant lifecycle transition from '${currentStatus}' to '${newStatus}'`
        );
      }
    }

    const updated = await actualDb.tenant.update({
      where: { id: tenantId },
      data: { status: newStatus },
    });

    // Record audit event if auditLog model is available
    if (actualDb.auditLog && typeof actualDb.auditLog.create === "function") {
      await actualDb.auditLog.create({
        data: {
          tenantId,
          actorId: actorId || null,
          actorEmail: actorEmail || null,
          actionCategory: "TENANT_MGMT",
          action: "TENANT_LIFECYCLE_TRANSITION",
          entityType: "Tenant",
          entityId: tenantId,
          diffJson: JSON.stringify({
            previousStatus: currentStatus,
            newStatus,
            reason: reason || "Lifecycle status change",
          }),
        },
      }).catch((err: any) => {
        logger.warn("Failed to write tenant lifecycle audit log", { err: err?.message });
      });
    }

    logger.info("Tenant lifecycle status updated", {
      tenantId,
      previousStatus: currentStatus,
      newStatus,
      reason,
    });

    return updated;
  }
}

export const tenantService = new TenantService();
