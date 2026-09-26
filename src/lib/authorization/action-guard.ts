import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { getTenantContext, runWithTenantContext, TenantContextData } from "@/lib/tenant/tenant-context";
import { requirePermission } from "./policy-engine";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Resolves the authenticated TenantContextData for Server Actions.
 * 1. Checks AsyncLocalStorage for an existing tenant context (e.g. from middleware).
 * 2. If absent, resolves identity via Clerk auth() and queries the application DB for active TenantMembership.
 * 3. Fails closed if unauthenticated, user record missing, or no active membership exists.
 */
export async function resolveActionTenantContext(db = prismaTarget): Promise<TenantContextData> {
  const existing = getTenantContext();
  if (existing) {
    return existing;
  }

  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new UnauthorizedError("Authentication required to perform this action");
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          tenant: true,
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError("Application user record not found for authenticated identity");
  }

  if (!user.memberships || user.memberships.length === 0) {
    throw new ForbiddenError("Caller has no active institutional tenant memberships");
  }

  // Use the primary active membership
  const activeMembership = user.memberships[0];

  const contextData: TenantContextData = {
    tenant: {
      id: activeMembership.tenant.id,
      slug: activeMembership.tenant.slug,
      name: activeMembership.tenant.name,
      status: activeMembership.tenant.status,
      planTier: activeMembership.tenant.planTier,
    },
    user: {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
    },
    membership: {
      id: activeMembership.id,
      tenantId: activeMembership.tenantId,
      userId: activeMembership.userId,
      roleId: activeMembership.roleId,
      status: activeMembership.status,
      role: activeMembership.role
        ? {
            id: activeMembership.role.id,
            roleKey: activeMembership.role.roleKey,
            name: activeMembership.role.name,
          }
        : null,
    },
  };

  return contextData;
}

export type ActionResponse<T = any> = {
  success: boolean;
  error: boolean;
  message?: string;
  data?: T;
  requestId?: string;
};

/**
 * Executes a server action within an authenticated, tenant-isolated, and permission-checked boundary.
 */
export async function executeGuardedAction<TOutput>(
  permissionKey: string,
  handler: (context: TenantContextData) => Promise<TOutput>,
  options?: {
    resourceId?: string;
    resourceType?: string;
    targetStudentId?: string;
    targetClassId?: string;
    moduleKey?: string;
  },
  db = prismaTarget
): Promise<ActionResponse<TOutput>> {
  let requestId: string | undefined;
  try {
    const reqHeaders = headers();
    requestId = reqHeaders.get("x-request-id") || undefined;
  } catch {
    // Graceful fallback when invoked outside active HTTP request context (e.g., in unit tests)
  }

  try {
    const context = await resolveActionTenantContext(db);

    return await runWithTenantContext(context, async () => {
      // Gate 1 to 3: Enforce permissions, modules, and access scopes
      await requirePermission(
        permissionKey,
        {
          context,
          ...options,
        },
        db
      );

      // Execute authorized domain service logic
      const result = await handler(context);
      return { success: true, error: false, data: result, requestId };
    });
  } catch (err: any) {
    logger.warn("Guarded action rejected or failed", {
      permissionKey,
      requestId,
      errorName: err.name,
      message: err.message,
    });
    return {
      success: false,
      error: true,
      message: err.message || "An error occurred while performing this operation",
      requestId,
    };
  }
}
