import { z } from "zod";
import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { ConflictError, ValidationError } from "@/lib/errors";

export const tenantOnboardingSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(63, "Slug cannot exceed 63 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens"),
  name: z.string().min(3, "Institution name must be at least 3 characters").max(120),
  legalName: z.string().optional(),
  affiliationBoard: z.string().optional(),
  affiliationCode: z.string().optional(),
  planTier: z.enum(["STARTER", "STANDARD", "PREMIUM", "ENTERPRISE"]).default("STANDARD"),
  currency: z.string().default("INR"),
  timezone: z.string().default("Asia/Kolkata"),
  locale: z.string().default("en-IN"),
  studentQuota: z.number().int().positive().default(500),
  staffQuota: z.number().int().positive().default(50),
  storageQuotaGb: z.number().int().positive().default(10),
  owner: z.object({
    clerkId: z.string().min(1, "Clerk ID is required"),
    email: z.string().email("Valid owner email is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().default(""),
    phone: z.string().optional(),
  }),
  policy: z
    .object({
      attendanceCutoffTime: z.string().default("10:30"),
      attendanceWarningThresholdPercent: z.number().min(0).max(100).default(75.0),
      autoSmsOnAbsence: z.boolean().default(true),
      defaultPassingPercentage: z.number().min(0).max(100).default(33.0),
      allowParentPortalRegistration: z.boolean().default(false),
    })
    .optional(),
  branding: z
    .object({
      primaryColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid 6-character hex color").default("#0284c7"),
      crestLogoUrl: z.string().url().optional(),
    })
    .optional(),
  additionalModules: z.array(z.string()).default([]),
  academicCalendar: z
    .object({
      yearLabel: z.string().default("2026-2027"),
      startDate: z.coerce.date().default(() => new Date("2026-04-01T00:00:00.000Z")),
      endDate: z.coerce.date().default(() => new Date("2027-03-31T23:59:59.999Z")),
      termNames: z.array(z.string()).default(["Term 1", "Term 2"]),
      gradeLevels: z.array(z.number().int()).default([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    })
    .optional(),
});

export type TenantOnboardingInput = z.input<typeof tenantOnboardingSchema>;
export type ValidatedTenantOnboardingInput = z.infer<typeof tenantOnboardingSchema>;

export interface OnboardingReadinessReport {
  readyForOperations: boolean;
  tenantId: string;
  slug: string;
  ownerUserId: string;
  ownerMembershipId: string;
  planTier: string;
  modulesEnabled: string[];
  academicYearId?: string;
  termsCount: number;
  gradesCount: number;
  checklist: {
    tenantCreated: boolean;
    policyConfigured: boolean;
    brandingConfigured: boolean;
    ownerRoleBound: boolean;
    coreModulesLicensed: boolean;
    academicStructureReady: boolean;
    auditRecorded: boolean;
  };
}

export interface OnboardingResult {
  tenant: any;
  ownerUser: any;
  ownerMembership: any;
  readinessReport: OnboardingReadinessReport;
}

export class TenantOnboardingService {
  /**
   * Orchestrates the complete, repeatable, server-authoritative institutional onboarding workflow.
   * Atomically provisions:
   *  1. Tenant entity
   *  2. Institutional Policy & Branding
   *  3. Owner Application User & Membership
   *  4. Module Entitlements (Core + Licensed Add-ons)
   *  5. Academic Structure (AcademicYear, Terms, Grades)
   *  6. Transactional Audit Log
   */
  async onboardTenant(
    input: TenantOnboardingInput,
    db: any = prismaTarget
  ): Promise<OnboardingResult> {
    const parseResult = tenantOnboardingSchema.safeParse(input);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      throw new ValidationError(`Tenant onboarding validation failed: ${errorMsg}`);
    }

    const data = parseResult.data;
    const slug = data.slug.toLowerCase().trim();

    // 1. Verify slug uniqueness
    const existing = await db.tenant.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictError(`Institution with subdomain/slug '${slug}' already exists`);
    }

    // 2. Ensure application user exists for the owner
    const ownerUser = await db.user.upsert({
      where: { clerkId: data.owner.clerkId },
      create: {
        clerkId: data.owner.clerkId,
        email: data.owner.email.toLowerCase().trim(),
        firstName: data.owner.firstName.trim(),
        lastName: data.owner.lastName?.trim() || "",
        displayName: `${data.owner.firstName.trim()} ${data.owner.lastName?.trim() || ""}`.trim(),
        phone: data.owner.phone || null,
        isEmailVerified: true,
        isActive: true,
      },
      update: {
        email: data.owner.email.toLowerCase().trim(),
        firstName: data.owner.firstName.trim(),
        lastName: data.owner.lastName?.trim() || "",
        displayName: `${data.owner.firstName.trim()} ${data.owner.lastName?.trim() || ""}`.trim(),
        isActive: true,
      },
    });

    // 3. Atomically provision institution via transaction
    return await db.$transaction(async (tx: any) => {
      // Step A: Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: data.name,
          legalName: data.legalName || data.name,
          affiliationBoard: data.affiliationBoard || null,
          affiliationCode: data.affiliationCode || null,
          status: "ACTIVE",
          planTier: data.planTier,
          currency: data.currency,
          timezone: data.timezone,
          locale: data.locale,
          studentQuota: data.studentQuota,
          staffQuota: data.staffQuota,
          storageQuotaGb: data.storageQuotaGb,
        },
      });

      // Step B: Configure Institutional Policy
      const policyData = data.policy || {
        attendanceCutoffTime: "10:30",
        attendanceWarningThresholdPercent: 75.0,
        autoSmsOnAbsence: true,
        defaultPassingPercentage: 33.0,
        allowParentPortalRegistration: false,
      };
      await tx.tenantPolicy.create({
        data: {
          tenantId: tenant.id,
          attendanceCutoffTime: policyData.attendanceCutoffTime,
          attendanceWarningThresholdPercent: policyData.attendanceWarningThresholdPercent,
          autoSmsOnAbsence: policyData.autoSmsOnAbsence,
          defaultPassingPercentage: policyData.defaultPassingPercentage,
          allowParentPortalRegistration: policyData.allowParentPortalRegistration,
        },
      });

      // Step C: Configure Institutional Branding
      const brandingData = data.branding || {
        primaryColorHex: "#0284c7",
      };
      await tx.tenantBranding.create({
        data: {
          tenantId: tenant.id,
          primaryColorHex: brandingData.primaryColorHex,
          crestLogoUrl: brandingData.crestLogoUrl || null,
        },
      });

      // Step D: Resolve or Create INSTITUTION_OWNER Role & Bind Membership
      let ownerRole = await tx.role.findFirst({
        where: { roleKey: "INSTITUTION_OWNER", tenantId: null },
      });
      if (!ownerRole) {
        ownerRole = await tx.role.create({
          data: {
            roleKey: "INSTITUTION_OWNER",
            name: "Institution Owner",
            description: "Institutional owner with full administrative privileges",
            isSystemRole: true,
          },
        });
      }

      const ownerMembership = await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: ownerUser.id,
          roleId: ownerRole.id,
          status: "ACTIVE",
        },
      });

      // Step E: Provision Core & Licensed Modules
      const coreModules = ["core_academics", "attendance_module", "communication_module"];
      const allModulesToEnable = Array.from(new Set([...coreModules, ...data.additionalModules]));

      for (const moduleKey of allModulesToEnable) {
        await tx.module.upsert({
          where: { moduleKey },
          create: {
            moduleKey,
            displayName: moduleKey.replace(/_/g, " ").toUpperCase(),
            isCore: coreModules.includes(moduleKey),
          },
          update: {},
        });

        await tx.tenantModuleEntitlement.create({
          data: {
            tenantId: tenant.id,
            moduleKey,
            isEnabled: true,
            source: coreModules.includes(moduleKey) ? "PLAN_INCLUDED" : "ADDON_PURCHASE",
          },
        });
      }

      // Step F: Bootstrap Initial Academic Calendar & Grades
      const calendar = data.academicCalendar || {
        yearLabel: "2026-2027",
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2027-03-31T23:59:59.999Z"),
        termNames: ["Term 1", "Term 2"],
        gradeLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      };

      const academicYear = await tx.academicYear.create({
        data: {
          tenantId: tenant.id,
          yearLabel: calendar.yearLabel,
          startDate: calendar.startDate,
          endDate: calendar.endDate,
          status: "ACTIVE",
        },
      });

      // Create Terms
      for (let i = 0; i < calendar.termNames.length; i++) {
        const termName = calendar.termNames[i];
        await tx.term.create({
          data: {
            tenantId: tenant.id,
            academicYearId: academicYear.id,
            termName,
            termOrder: i + 1,
            startDate: calendar.startDate,
            endDate: calendar.endDate,
          },
        });
      }

      // Create Grades
      for (const gradeLevel of calendar.gradeLevels) {
        await tx.grade.create({
          data: {
            tenantId: tenant.id,
            gradeLevel,
            name: `Grade ${gradeLevel}`,
          },
        });
      }

      // Step G: Transactional Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: ownerUser.id,
          actorEmail: ownerUser.email,
          actionCategory: "TENANT_MGMT",
          action: "TENANT_ONBOARDED",
          entityType: "Tenant",
          entityId: tenant.id,
          diffJson: JSON.stringify({
            slug,
            name: tenant.name,
            planTier: tenant.planTier,
            modulesEnabled: allModulesToEnable,
            academicYear: calendar.yearLabel,
            gradesCount: calendar.gradeLevels.length,
          }),
        },
      });

      const readinessReport: OnboardingReadinessReport = {
        readyForOperations: true,
        tenantId: tenant.id,
        slug: tenant.slug,
        ownerUserId: ownerUser.id,
        ownerMembershipId: ownerMembership.id,
        planTier: tenant.planTier,
        modulesEnabled: allModulesToEnable,
        academicYearId: academicYear.id,
        termsCount: calendar.termNames.length,
        gradesCount: calendar.gradeLevels.length,
        checklist: {
          tenantCreated: true,
          policyConfigured: true,
          brandingConfigured: true,
          ownerRoleBound: true,
          coreModulesLicensed: true,
          academicStructureReady: true,
          auditRecorded: true,
        },
      };

      logger.info("Multi-tenant institution onboarded successfully", {
        tenantId: tenant.id,
        slug: tenant.slug,
        ownerUserId: ownerUser.id,
        planTier: tenant.planTier,
        modulesCount: allModulesToEnable.length,
      });

      return {
        tenant,
        ownerUser,
        ownerMembership,
        readinessReport,
      };
    });
  }
}

export const tenantOnboardingService = new TenantOnboardingService();
