import { prismaTarget } from "@/lib/prisma-target";
import { TenantContextData } from "@/lib/tenant/tenant-context";
import { ScopeAccessDeniedError } from "@/lib/errors";
import { AccessScopeType, AuthorizationRequest } from "./rbac-types";
import { logger } from "@/lib/logger";

export class ScopeEvaluator {
  /**
   * Evaluates whether the caller's horizontal AccessScope permits access
   * to the requested resource.
   */
  async evaluateScope(
    scope: AccessScopeType,
    request: AuthorizationRequest,
    context: TenantContextData,
    db = prismaTarget
  ): Promise<boolean> {
    const tenantId = context.tenant.id;
    const userId = context.user.id;

    switch (scope) {
      case "GLOBAL":
      case "INSTITUTION_WIDE":
        // Caller has institutional clearance for this tenant
        return true;

      case "SELF_ONLY":
        return this.evaluateSelfScope(request, userId, tenantId, db);

      case "LINKED_CHILDREN":
        return this.evaluateLinkedChildrenScope(request, userId, tenantId, db);

      case "ASSIGNED_ONLY":
        return this.evaluateAssignedScope(request, userId, tenantId, db);

      default:
        logger.warn("Unknown AccessScope encountered during evaluation", { scope });
        return false;
    }
  }

  /**
   * SELF_ONLY: Caller can only access their own user record or linked student profile.
   */
  private async evaluateSelfScope(
    request: AuthorizationRequest,
    userId: string,
    tenantId: string,
    db = prismaTarget
  ): Promise<boolean> {
    // 1. Direct user ownership
    if (request.resourceOwnerUserId) {
      return request.resourceOwnerUserId === userId;
    }

    // 2. Student record matching caller's linked StudentProfile
    if (request.targetStudentId) {
      const studentProfile = await db.studentProfile.findUnique({
        where: { id: request.targetStudentId },
      });
      return Boolean(studentProfile && studentProfile.userId === userId && studentProfile.tenantId === tenantId);
    }

    // If resource is user itself
    if (request.resourceId && request.resourceType === "User") {
      return request.resourceId === userId;
    }

    // If no target resource specified (e.g., viewing own self dashboard)
    if (!request.resourceId && !request.targetStudentId && !request.resourceOwnerUserId) {
      return true;
    }

    return false;
  }

  /**
   * LINKED_CHILDREN: Caller must be a registered guardian linked to the target student via StudentParentBinding.
   */
  private async evaluateLinkedChildrenScope(
    request: AuthorizationRequest,
    userId: string,
    tenantId: string,
    db = prismaTarget
  ): Promise<boolean> {
    // If viewing parent dashboard without a specific child targeted
    if (!request.targetStudentId) {
      return true;
    }

    // 1. Resolve parent profile for this caller in this tenant
    const parentProfile = await db.parentProfile.findFirst({
      where: { userId, tenantId },
    });

    if (!parentProfile) {
      return false;
    }

    // 2. Query StudentParentBinding from DB (never trusting client headers)
    const binding = await db.studentParentBinding.findFirst({
      where: {
        tenantId,
        parentId: parentProfile.id,
        studentId: request.targetStudentId,
      },
    });

    return Boolean(binding);
  }

  /**
   * ASSIGNED_ONLY: Caller must be a teacher assigned to the target class/section or subject.
   */
  private async evaluateAssignedScope(
    request: AuthorizationRequest,
    userId: string,
    tenantId: string,
    db = prismaTarget
  ): Promise<boolean> {
    // If viewing teacher dashboard without specific target class
    if (!request.targetClassId) {
      return true;
    }

    // 1. Resolve staff profile for this caller
    const staffProfile = await db.staffProfile.findFirst({
      where: { userId, tenantId },
    });

    if (!staffProfile) {
      return false;
    }

    // 2. Check if supervisor for this class
    const supervisedClass = await db.class.findFirst({
      where: {
        id: request.targetClassId,
        tenantId,
        supervisorTeacherId: staffProfile.id,
      },
    });
    if (supervisedClass) {
      return true;
    }

    // 3. Check if assigned subject teacher for this class
    const assignedClassSubject = await db.classSubject.findFirst({
      where: {
        tenantId,
        classId: request.targetClassId,
        teacherId: staffProfile.id,
      },
    });

    return Boolean(assignedClassSubject);
  }

  /**
   * Asserts that the caller's AccessScope permits access, throwing ScopeAccessDeniedError if not.
   */
  async assertScope(
    scope: AccessScopeType,
    request: AuthorizationRequest,
    context: TenantContextData,
    db = prismaTarget
  ): Promise<void> {
    const isAllowed = await this.evaluateScope(scope, request, context, db);
    if (!isAllowed) {
      logger.warn("Operation denied by horizontal AccessScope boundary", {
        scope,
        userId: context.user.id,
        tenantId: context.tenant.id,
        permission: request.permission,
        targetStudentId: request.targetStudentId,
        targetClassId: request.targetClassId,
      });
      throw new ScopeAccessDeniedError(
        `Access denied: Caller lacks required '${scope}' relationship to access this record`
      );
    }
  }
}

export const scopeEvaluator = new ScopeEvaluator();
