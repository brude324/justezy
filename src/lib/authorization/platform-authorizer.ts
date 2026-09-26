import { prismaTarget } from "@/lib/prisma-target";
import { getPlatformContext, PlatformContextData } from "@/lib/tenant/tenant-context";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { PlatformRoleType } from "./rbac-types";

export class PlatformAuthorizer {
  /**
   * Asserts that the current request has authorized platform control plane privileges.
   */
  async requirePlatformRole(
    allowedRoles: PlatformRoleType[] = ["SUPER_ADMIN"],
    context?: PlatformContextData,
    db = prismaTarget
  ): Promise<{ authorized: true; role: PlatformRoleType }> {
    const activeCtx = context || getPlatformContext();

    if (activeCtx) {
      if (!activeCtx.user) {
        throw new UnauthorizedError("Platform operation requires authenticated user");
      }

      if (
        activeCtx.isSuperAdmin ||
        allowedRoles.includes(activeCtx.platformRole as PlatformRoleType)
      ) {
        return { authorized: true, role: activeCtx.platformRole as PlatformRoleType };
      }

      throw new ForbiddenError(
        `Platform access denied: Required roles [${allowedRoles.join(", ")}], caller has '${activeCtx.platformRole}'`
      );
    }

    throw new UnauthorizedError("Platform administrative context is not active");
  }

  /**
   * Verifies if a user is an active platform operator in the database.
   */
  async getPlatformUser(userId: string, db = prismaTarget) {
    return db.platformUser.findUnique({
      where: { userId },
      include: { user: true },
    });
  }
}

export const platformAuthorizer = new PlatformAuthorizer();
export const requirePlatformRole = (
  allowedRoles?: PlatformRoleType[],
  context?: PlatformContextData,
  db = prismaTarget
) => platformAuthorizer.requirePlatformRole(allowedRoles, context, db);
