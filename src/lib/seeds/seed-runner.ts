import { SYSTEM_MODULES, SYSTEM_PERMISSIONS, SYSTEM_ROLES, SYSTEM_PLANS } from "./system-seed";
import { DEMO_TENANT, DEMO_ACADEMIC_YEAR, DEMO_TERMS, DEMO_GRADES, DEMO_CLASSES, DEMO_SUBJECTS } from "./demo-seed";
import type { PrismaClient as TargetPrismaClient } from "@/generated/target-client";

export interface SeedResult {
  modulesSeeded: number;
  permissionsSeeded: number;
  rolesSeeded: number;
  rolePermissionsBound: number;
  plansSeeded: number;
}

/**
 * Executes Tier 1 System Foundational Seeds.
 * Completely idempotent: uses upsert semantics to prevent constraint collisions.
 */
export async function seedSystemFoundations(prisma: TargetPrismaClient): Promise<SeedResult> {
  // 1. Seed Modules
  let modulesCount = 0;
  for (const mod of SYSTEM_MODULES) {
    await prisma.module.upsert({
      where: { moduleKey: mod.moduleKey },
      update: {
        displayName: mod.displayName,
        description: mod.description,
        isCore: mod.isCore,
      },
      create: {
        moduleKey: mod.moduleKey,
        displayName: mod.displayName,
        description: mod.description,
        isCore: mod.isCore,
      },
    });
    modulesCount++;
  }

  // 2. Seed Permissions
  let permissionsCount = 0;
  const permissionMap = new Map<string, string>();
  for (const perm of SYSTEM_PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { permissionKey: perm.permissionKey },
      update: {
        moduleKey: perm.moduleKey,
        verb: perm.verb,
        description: perm.description,
      },
      create: {
        permissionKey: perm.permissionKey,
        moduleKey: perm.moduleKey,
        verb: perm.verb,
        description: perm.description,
      },
    });
    permissionMap.set(perm.permissionKey, record.id);
    permissionsCount++;
  }

  // 3. Seed Predefined System Roles
  let rolesCount = 0;
  let rolePermissionsCount = 0;

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_roleKey: {
          tenantId: "SYSTEM",
          roleKey: roleDef.roleKey,
        },
      },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: true,
      },
      create: {
        tenantId: "SYSTEM",
        roleKey: roleDef.roleKey,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: true,
      },
    });
    rolesCount++;

    // Bind permissions to role
    for (const permKey of roleDef.permissions) {
      const permId = permissionMap.get(permKey);
      if (!permId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permId,
          },
        },
        update: {
          accessScope: roleDef.defaultScope,
        },
        create: {
          roleId: role.id,
          permissionId: permId,
          accessScope: roleDef.defaultScope,
        },
      });
      rolePermissionsCount++;
    }
  }

  // 4. Seed Subscription Plans
  let plansCount = 0;
  for (const plan of SYSTEM_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { planKey: plan.planKey },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPricePerStudent: plan.monthlyPricePerStudent,
        annualDiscountPercent: plan.annualDiscountPercent,
        includedModulesJson: JSON.stringify(plan.includedModules),
      },
      create: {
        planKey: plan.planKey,
        name: plan.name,
        description: plan.description,
        monthlyPricePerStudent: plan.monthlyPricePerStudent,
        annualDiscountPercent: plan.annualDiscountPercent,
        includedModulesJson: JSON.stringify(plan.includedModules),
      },
    });
    plansCount++;
  }

  return {
    modulesSeeded: modulesCount,
    permissionsSeeded: permissionsCount,
    rolesSeeded: rolesCount,
    rolePermissionsBound: rolePermissionsCount,
    plansSeeded: plansCount,
  };
}

/**
 * Executes Tier 2 Demo Fixture Seeds for local development and staging.
 */
export async function seedDemoFixtures(prisma: TargetPrismaClient): Promise<void> {
  // 1. Seed Demo Tenant
  await prisma.tenant.upsert({
    where: { id: DEMO_TENANT.id },
    update: {
      slug: DEMO_TENANT.slug,
      name: DEMO_TENANT.name,
      legalName: DEMO_TENANT.legalName,
      status: DEMO_TENANT.status,
      planTier: DEMO_TENANT.planTier,
    },
    create: {
      id: DEMO_TENANT.id,
      slug: DEMO_TENANT.slug,
      name: DEMO_TENANT.name,
      legalName: DEMO_TENANT.legalName,
      status: DEMO_TENANT.status,
      planTier: DEMO_TENANT.planTier,
      currency: DEMO_TENANT.currency,
      timezone: DEMO_TENANT.timezone,
    },
  });

  // 2. Seed Academic Year
  await prisma.academicYear.upsert({
    where: { id: DEMO_ACADEMIC_YEAR.id },
    update: {
      yearLabel: DEMO_ACADEMIC_YEAR.yearLabel,
      status: DEMO_ACADEMIC_YEAR.status,
    },
    create: {
      id: DEMO_ACADEMIC_YEAR.id,
      tenantId: DEMO_ACADEMIC_YEAR.tenantId,
      yearLabel: DEMO_ACADEMIC_YEAR.yearLabel,
      status: DEMO_ACADEMIC_YEAR.status,
      startDate: DEMO_ACADEMIC_YEAR.startDate,
      endDate: DEMO_ACADEMIC_YEAR.endDate,
    },
  });

  // 3. Seed Terms
  for (const term of DEMO_TERMS) {
    await prisma.term.upsert({
      where: { id: term.id },
      update: { termName: term.termName, termOrder: term.termOrder },
      create: {
        id: term.id,
        tenantId: term.tenantId,
        academicYearId: term.academicYearId,
        termName: term.termName,
        termOrder: term.termOrder,
        startDate: term.startDate,
        endDate: term.endDate,
      },
    });
  }

  // 4. Seed Grades
  for (const grade of DEMO_GRADES) {
    await prisma.grade.upsert({
      where: { id: grade.id },
      update: { name: grade.name, gradeLevel: grade.gradeLevel },
      create: {
        id: grade.id,
        tenantId: grade.tenantId,
        gradeLevel: grade.gradeLevel,
        name: grade.name,
      },
    });
  }

  // 5. Seed Classes
  for (const cls of DEMO_CLASSES) {
    await prisma.class.upsert({
      where: { id: cls.id },
      update: { sectionName: cls.sectionName, studentCapacity: cls.studentCapacity },
      create: {
        id: cls.id,
        tenantId: cls.tenantId,
        academicYearId: cls.academicYearId,
        gradeId: cls.gradeId,
        sectionName: cls.sectionName,
        studentCapacity: cls.studentCapacity,
      },
    });
  }

  // 6. Seed Subjects
  for (const sub of DEMO_SUBJECTS) {
    await prisma.subject.upsert({
      where: { id: sub.id },
      update: { name: sub.name, subjectCode: sub.subjectCode },
      create: {
        id: sub.id,
        tenantId: sub.tenantId,
        name: sub.name,
        subjectCode: sub.subjectCode,
      },
    });
  }
}
