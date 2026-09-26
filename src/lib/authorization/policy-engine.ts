import { prismaTarget } from "@/lib/prisma-target";
import { requireTenantContext, TenantContextData } from "@/lib/tenant/tenant-context";
import { ForbiddenError, UnauthorizedError, TenantSuspendedError } from "@/lib/errors";
import { moduleGate } from "./module-gate";
import { scopeEvaluator } from "./scope-evaluator";
import {
  AuthorizationRequest,
  AuthorizationDecision,
  RequirePermissionOptions,
  AccessScopeType,
} from "./rbac-types";
import { logger } from "@/lib/logger";
import { SYSTEM_PERMISSIONS } from "@/lib/seeds/system-seed";

// Fast lookup map from permissionKey to moduleKey
const PERMISSION_MODULE_MAP = new Map<string, string>(
  SYSTEM_PERMISSIONS.map((p) => [p.permissionKey, p.moduleKey])
);

export class PolicyEngine {
  /**
   * Authorizes an operation through the full dual-gate pipeline:
   * 0. Tenant Status & Tenant Membership Active Invariants
   * 1. Module Entitlement Gate (asserts institution licensed module)
   * 2. RBAC Permission Gate (asserts role contains atomic permission)
   * 3. AccessScope Boundary Gate (asserts horizontal relation boundary)
   */
  async evaluate(
    request: AuthorizationRequest,
    db = prismaTarget
  ): Promise<AuthorizationDecision> {
    const context = request.context || requireTenantContext();

    if (!context || !context.user || !context.tenant) {
      throw new UnauthorizedError("Authentication and tenant context are required for authorization");
    }

    const { tenant, user, membership } = context;

    // Gate 0A: Active Institutional Tenant Invariant
    if (tenant.status === "SUSPENDED" || tenant.status === "ARCHIVED" || tenant.status === "PROVISIONING") {
      logger.warn("Authorization rejected: Tenant is not active", {
        userId: user.id,
        tenantId: tenant.id,
        tenantStatus: tenant.status,
      });
      return {
        allowed: false,
        reason: `Institution is currently ${tenant.status.toLowerCase()}`,
        code: tenant.status === "SUSPENDED" ? "TENANT_SUSPENDED" : "TENANT_NOT_ACTIVE",
      };
    }

    // Gate 0B: Active Membership Invariant
    if (membership.status !== "ACTIVE") {
      logger.warn("Authorization rejected: Membership is not active", {
        userId: user.id,
        tenantId: tenant.id,
        membershipStatus: membership.status,
      });
      return {
        allowed: false,
        reason: `Tenant membership status is ${membership.status}`,
      };
    }

    // Gate 1: Module Entitlement Evaluation
    const moduleKey =
      request.moduleKey ||
      PERMISSION_MODULE_MAP.get(request.permission);

    if (moduleKey) {
      const isEnabled = await moduleGate.isModuleEnabled(tenant.id, moduleKey, db);
      if (!isEnabled) {
        logger.warn("Authorization rejected by Module Entitlement Gate", {
          tenantId: tenant.id,
          moduleKey,
          permission: request.permission,
        });
        return {
          allowed: false,
          reason: `Module '${moduleKey}' is not enabled for this institution`,
          moduleKey,
          code: "MODULE_DISABLED",
        };
      }
    }

    // Gate 2: Role Permission Evaluation
    const rolePermission = await db.rolePermission.findFirst({
      where: {
        roleId: membership.roleId,
        permission: {
          permissionKey: request.permission,
        },
      },
      include: {
        permission: true,
      },
    });

    if (!rolePermission) {
      logger.warn("Authorization rejected: Permission not granted to role", {
        userId: user.id,
        roleId: membership.roleId,
        permission: request.permission,
      });
      return {
        allowed: false,
        reason: `Role does not possess permission '${request.permission}'`,
        permissionKey: request.permission,
        code: "PERMISSION_DENIED",
      };
    }

    const accessScope = rolePermission.accessScope as AccessScopeType;

    // Gate 3: Horizontal Access Scope Evaluation
    const isScopePermitted = await scopeEvaluator.evaluateScope(
      accessScope,
      request,
      context,
      db
    );

    if (!isScopePermitted) {
      logger.warn("Authorization rejected by horizontal AccessScope boundary", {
        userId: user.id,
        permission: request.permission,
        accessScope,
      });
      return {
        allowed: false,
        reason: `Access scope '${accessScope}' boundary violated`,
        scope: accessScope,
        code: "SCOPE_DENIED",
      };
    }

    return {
      allowed: true,
      scope: accessScope,
      permissionKey: request.permission,
      moduleKey,
    };
  }

  /**
   * Asserts that an operation is authorized, throwing appropriate typed errors:
   * - ModuleDisabledError (HTTP 402) if module is disabled
   * - ForbiddenError / ScopeAccessDeniedError (HTTP 403) if permission or scope fails
   */
  async assertAuthorized(
    request: AuthorizationRequest,
    db = prismaTarget
  ): Promise<AuthorizationDecision> {
    const decision = await this.evaluate(request, db);

    if (!decision.allowed) {
      if (decision.code === "TENANT_SUSPENDED") {
        throw new TenantSuspendedError(decision.reason || "Institution account is suspended");
      }

      if (decision.code === "MODULE_DISABLED") {
        await moduleGate.assertModuleEnabled(
          request.context?.tenant.id || requireTenantContext().tenant.id,
          decision.moduleKey!,
          db
        );
      }

      if (decision.code === "SCOPE_DENIED") {
        await scopeEvaluator.assertScope(
          decision.scope!,
          request,
          request.context || requireTenantContext(),
          db
        );
      }

      throw new ForbiddenError(decision.reason || "Forbidden: Access denied");
    }

    return decision;
  }

  /**
   * Evaluates if caller can perform an action without throwing.
   */
  async can(
    permissionKey: string,
    context?: TenantContextData,
    db = prismaTarget
  ): Promise<boolean> {
    try {
      const decision = await this.evaluate({ permission: permissionKey, context }, db);
      return decision.allowed;
    } catch {
      return false;
    }
  }

  /**
   * Standard assertion helper for Server Actions and Route Handlers.
   * Usage: await requirePermission("student.read", { targetStudentId: "..." });
   */
  async requirePermission(
    permissionKey: string,
    options?: RequirePermissionOptions,
    db = prismaTarget
  ): Promise<AuthorizationDecision> {
    return this.assertAuthorized(
      {
        permission: permissionKey,
        ...options,
      },
      db
    );
  }
}

export const policyEngine = new PolicyEngine();
export const authorize = (request: AuthorizationRequest, db = prismaTarget) =>
  policyEngine.assertAuthorized(request, db);
export const requirePermission = (
  permissionKey: string,
  options?: RequirePermissionOptions,
  db = prismaTarget
) => policyEngine.requirePermission(permissionKey, options, db);
export const can = (permissionKey: string, context?: TenantContextData, db = prismaTarget) =>
  policyEngine.can(permissionKey, context, db);
