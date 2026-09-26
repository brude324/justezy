import { prismaTarget } from "@/lib/prisma-target";
import { ModuleDisabledError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const CORE_MODULES = new Set([
  "core_academics",
  "attendance_module",
  "communication_module",
]);

export class ModuleGate {
  /**
   * Checks whether a module capability is licensed and enabled for a specific institutional tenant.
   *
   * Core modules (core_academics, attendance_module, communication_module) are universally enabled.
   * Optional modules require an active TenantModuleEntitlement with isEnabled = true.
   */
  async isModuleEnabled(
    tenantId: string,
    moduleKey: string,
    db = prismaTarget
  ): Promise<boolean> {
    if (!tenantId || !moduleKey) {
      return false;
    }

    // Core modules are always enabled
    if (CORE_MODULES.has(moduleKey)) {
      return true;
    }

    const entitlement = await db.tenantModuleEntitlement.findUnique({
      where: {
        tenantId_moduleKey: {
          tenantId,
          moduleKey,
        },
      },
    });

    if (!entitlement) {
      return false;
    }

    if (!entitlement.isEnabled) {
      return false;
    }

    if (entitlement.expiresAt && entitlement.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Asserts that a module is enabled for the tenant.
   * Throws ModuleDisabledError (HTTP 402) if the module is disabled or not licensed.
   */
  async assertModuleEnabled(
    tenantId: string,
    moduleKey: string,
    db = prismaTarget
  ): Promise<void> {
    const enabled = await this.isModuleEnabled(tenantId, moduleKey, db);
    if (!enabled) {
      logger.warn("Access blocked by module entitlement gate", {
        tenantId,
        moduleKey,
      });
      throw new ModuleDisabledError(
        `Feature module '${moduleKey}' is not licensed or enabled for this institution`
      );
    }
  }
}

export const moduleGate = new ModuleGate();
