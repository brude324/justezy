import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { NotFoundError, UnauthorizedError, ForbiddenError } from "@/lib/errors";

export interface TenantDiagnosticOverview {
  tenant: {
    id: string;
    slug: string;
    name: string;
    legalName: string;
    status: string;
    planTier: string;
    studentQuota: number;
    staffQuota: number;
    storageQuotaGb: number;
    createdAt: Date;
    updatedAt: Date;
  };
  policy: any;
  branding: any;
  domainCount: number;
}

export interface TenantModuleDiagnostic {
  tenantId: string;
  modules: Array<{
    moduleKey: string;
    displayName: string;
    isCore: boolean;
    isEnabled: boolean;
    source: string;
    expiresAt: Date | null;
  }>;
}

export interface TenantMembershipSummary {
  tenantId: string;
  totalMemberships: number;
  byStatus: Record<string, number>;
  byRole: Record<string, number>;
}

export interface TenantDataHealthSummary {
  tenantId: string;
  counts: {
    academicYears: number;
    terms: number;
    grades: number;
    classes: number;
    staff: number;
    students: number;
    guardians: number;
    enrollments: number;
    attendanceRecords: number;
    exams: number;
    examResults: number;
    announcements: number;
  };
  anomalies: string[];
}

export interface OperatorContext {
  userId: string;
  email?: string;
  platformRole?: string;
  isPlatformAdmin?: boolean;
}

export class TenantDiagnosticService {
  /**
   * Asserts that the actor possesses valid platform support or admin privileges.
   */
  private assertPlatformAuthority(actor: OperatorContext) {
    if (!actor.userId) {
      throw new UnauthorizedError("Platform operator authentication required");
    }
    // Actor must be a platform admin or have platform role
    if (!actor.isPlatformAdmin && !actor.platformRole) {
      throw new ForbiddenError("Insufficient platform operational privileges for diagnostic inspection");
    }
  }

  /**
   * Diagnostic lookup of an institutional tenant's configuration, policy, and branding.
   */
  async getTenantOverview(
    tenantId: string,
    actor: OperatorContext,
    db: any = prismaTarget
  ): Promise<TenantDiagnosticOverview> {
    this.assertPlatformAuthority(actor);

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        policy: true,
        branding: true,
        domains: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant with ID '${tenantId}' not found`);
    }

    // Audit diagnostic access by platform operator
    if (db.auditLog && typeof db.auditLog.create === "function") {
      await db.auditLog.create({
        data: {
          tenantId,
          actorId: actor.userId,
          actorEmail: actor.email || null,
          actionCategory: "SECURITY",
          action: "TENANT_DIAGNOSTIC_ACCESSED",
          entityType: "Tenant",
          entityId: tenantId,
          diffJson: JSON.stringify({ operatorRole: actor.platformRole || "PLATFORM_ADMIN" }),
        },
      }).catch((err: any) => {
        logger.warn("Diagnostic access audit write failed", { err: err?.message });
      });
    }

    return {
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        legalName: tenant.legalName,
        status: tenant.status,
        planTier: tenant.planTier,
        studentQuota: tenant.studentQuota,
        staffQuota: tenant.staffQuota,
        storageQuotaGb: tenant.storageQuotaGb,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
      policy: tenant.policy,
      branding: tenant.branding,
      domainCount: tenant.domains?.length || 0,
    };
  }

  /**
   * Diagnostic lookup of tenant module entitlements and feature licensing state.
   */
  async getTenantModuleState(
    tenantId: string,
    actor: OperatorContext,
    db: any = prismaTarget
  ): Promise<TenantModuleDiagnostic> {
    this.assertPlatformAuthority(actor);

    const entitlements = await db.tenantModuleEntitlement.findMany({
      where: { tenantId },
      include: {
        module: true,
      },
    });

    return {
      tenantId,
      modules: entitlements.map((ent: any) => ({
        moduleKey: ent.moduleKey,
        displayName: ent.module?.displayName || ent.moduleKey,
        isCore: ent.module?.isCore ?? false,
        isEnabled: ent.isEnabled,
        source: ent.source,
        expiresAt: ent.expiresAt,
      })),
    };
  }

  /**
   * Diagnostic breakdown of tenant memberships by status and role.
   */
  async getTenantMembershipSummary(
    tenantId: string,
    actor: OperatorContext,
    db: any = prismaTarget
  ): Promise<TenantMembershipSummary> {
    this.assertPlatformAuthority(actor);

    const memberships = await db.tenantMembership.findMany({
      where: { tenantId },
      include: {
        role: true,
      },
    });

    const byStatus: Record<string, number> = {};
    const byRole: Record<string, number> = {};

    for (const mem of memberships) {
      byStatus[mem.status] = (byStatus[mem.status] || 0) + 1;
      const roleName = mem.role?.roleKey || mem.role?.name || "UNKNOWN_ROLE";
      byRole[roleName] = (byRole[roleName] || 0) + 1;
    }

    return {
      tenantId,
      totalMemberships: memberships.length,
      byStatus,
      byRole,
    };
  }

  /**
   * Diagnostic data health check that queries entity volumes and flags potential inconsistencies.
   */
  async getTenantOperationalHealth(
    tenantId: string,
    actor: OperatorContext,
    db: any = prismaTarget
  ): Promise<TenantDataHealthSummary> {
    this.assertPlatformAuthority(actor);

    const [
      academicYears,
      terms,
      grades,
      classes,
      staff,
      students,
      guardians,
      enrollments,
      attendanceRecords,
      exams,
      examResults,
      announcements,
    ] = await Promise.all([
      db.academicYear?.count({ where: { tenantId } }) ?? 0,
      db.term?.count({ where: { tenantId } }) ?? 0,
      db.grade?.count({ where: { tenantId } }) ?? 0,
      db.class?.count({ where: { tenantId } }) ?? 0,
      db.staffProfile?.count({ where: { tenantId } }) ?? 0,
      db.studentProfile?.count({ where: { tenantId } }) ?? 0,
      db.parentProfile?.count({ where: { tenantId } }) ?? 0,
      db.studentEnrollment?.count({ where: { tenantId } }) ?? 0,
      db.attendanceRecord?.count({ where: { tenantId } }) ?? 0,
      db.exam?.count({ where: { tenantId } }) ?? 0,
      db.examResult?.count({ where: { tenantId } }) ?? 0,
      db.announcement?.count({ where: { tenantId } }) ?? 0,
    ]);

    const anomalies: string[] = [];

    if (academicYears === 0) {
      anomalies.push("No academic years configured for tenant");
    }
    if (classes > 0 && staff === 0) {
      anomalies.push("Classes exist but zero staff profiles are registered");
    }
    if (students > 0 && enrollments === 0) {
      anomalies.push("Students are registered but zero active class enrollments found");
    }

    return {
      tenantId,
      counts: {
        academicYears,
        terms,
        grades,
        classes,
        staff,
        students,
        guardians,
        enrollments,
        attendanceRecords,
        exams,
        examResults,
        announcements,
      },
      anomalies,
    };
  }

  /**
   * Retrieves recent audit logs for incident triage and security review.
   */
  async getRecentAuditEvents(
    tenantId: string,
    limit = 50,
    actor: OperatorContext,
    db: any = prismaTarget
  ) {
    this.assertPlatformAuthority(actor);

    return db.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
    });
  }
}

export const tenantDiagnosticService = new TenantDiagnosticService();
