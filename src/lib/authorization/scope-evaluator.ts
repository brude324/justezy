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

    // 3. Admission application matching caller's applicant or linked profile
    if (request.targetApplicationId) {
      const application = await db.admissionApplication.findUnique({
        where: { id: request.targetApplicationId },
        include: { applicant: true },
      });
      if (application && application.tenantId === tenantId) {
        if (application.applicant?.studentProfileId) {
          const studentProfile = await db.studentProfile.findUnique({
            where: { id: application.applicant.studentProfileId },
          });
          if (studentProfile && studentProfile.userId === userId) return true;
        }
      }
      return false;
    }

    // 4. Library member matching caller's user or student profile
    if (request.targetMemberId) {
      const member = await db.libraryMember.findUnique({
        where: { id: request.targetMemberId },
        include: { studentProfile: true },
      });
      if (member && member.tenantId === tenantId) {
        if (member.userId === userId) return true;
        if (member.studentProfile && member.studentProfile.userId === userId) return true;
      }
      return false;
    }

    // 5. Asset assigned to caller
    if (request.targetAssetId) {
      const staffProfile = await db.staffProfile.findFirst({
        where: { userId, tenantId },
      });
      const studentProfile = await db.studentProfile.findFirst({
        where: { userId, tenantId },
      });

      const assignedToIds = [userId];
      if (staffProfile) assignedToIds.push(staffProfile.id);
      if (studentProfile) assignedToIds.push(studentProfile.id);

      const activeAssignment = await db.assetAssignment.findFirst({
        where: {
          tenantId,
          assetId: request.targetAssetId,
          status: "ACTIVE",
          assignedToId: { in: assignedToIds },
        },
      });
      return Boolean(activeAssignment);
    }

    // If target employment record specified
    if (request.targetEmploymentId) {
      const employment = await db.hREmployment.findFirst({
        where: { id: request.targetEmploymentId, tenantId },
        include: { staffProfile: true },
      });
      return Boolean(employment && employment.staffProfile && employment.staffProfile.userId === userId);
    }

    // If resource is user itself
    if (request.resourceId && request.resourceType === "User") {
      return request.resourceId === userId;
    }

    // If no target resource specified (e.g., viewing own self dashboard)
    if (
      !request.resourceId &&
      !request.targetStudentId &&
      !request.targetApplicationId &&
      !request.targetMemberId &&
      !request.targetRouteId &&
      !request.targetWarehouseId &&
      !request.targetAssetId &&
      !request.targetDepartmentId &&
      !request.targetEmploymentId &&
      !request.resourceOwnerUserId
    ) {
      return true;
    }

    return false;
  }

  /**
   * LINKED_CHILDREN: Caller must be a registered guardian linked to the target student via StudentParentBinding
   * or applicant guardian contact.
   */
  private async evaluateLinkedChildrenScope(
    request: AuthorizationRequest,
    userId: string,
    tenantId: string,
    db = prismaTarget
  ): Promise<boolean> {
    // Critical: Do NOT expose payroll or HR sensitive records through LINKED_CHILDREN
    if (request.permission && (request.permission.startsWith("payroll.") || request.permission.startsWith("hr.compensation"))) {
      return false;
    }

    // If viewing parent dashboard without a specific child, application, or member targeted
    if (!request.targetStudentId && !request.targetApplicationId && !request.targetMemberId) {
      return true;
    }

    // 1. Resolve parent profile for this caller in this tenant
    const parentProfile = await db.parentProfile.findFirst({
      where: { userId, tenantId },
    });

    if (!parentProfile) {
      return false;
    }

    // 2. Student parent binding check
    if (request.targetStudentId) {
      const binding = await db.studentParentBinding.findFirst({
        where: {
          tenantId,
          parentId: parentProfile.id,
          studentId: request.targetStudentId,
        },
      });
      return Boolean(binding);
    }

    // 3. Admission application guardian binding check
    if (request.targetApplicationId) {
      const application = await db.admissionApplication.findUnique({
        where: { id: request.targetApplicationId },
        include: { applicant: true },
      });
      if (application && application.tenantId === tenantId && application.applicant) {
        if (application.applicant.guardianPhone === parentProfile.primaryPhone) {
          return true;
        }
        if (application.applicant.studentProfileId) {
          const binding = await db.studentParentBinding.findFirst({
            where: {
              tenantId,
              parentId: parentProfile.id,
              studentId: application.applicant.studentProfileId,
            },
          });
          return Boolean(binding);
        }
      }
      return false;
    }

    // 4. Library member guardian check
    if (request.targetMemberId) {
      const member = await db.libraryMember.findUnique({
        where: { id: request.targetMemberId },
      });
      if (member && member.tenantId === tenantId && member.studentProfileId) {
        const binding = await db.studentParentBinding.findFirst({
          where: {
            tenantId,
            parentId: parentProfile.id,
            studentId: member.studentProfileId,
          },
        });
        return Boolean(binding);
      }
      return false;
    }

    return false;
  }

  /**
   * ASSIGNED_ONLY: Caller must be a teacher assigned to the target class/section,
   * or reviewer assigned to an application, or owner of an enquiry, or driver/attendant on a route.
   */
  private async evaluateAssignedScope(
    request: AuthorizationRequest,
    userId: string,
    tenantId: string,
    db = prismaTarget
  ): Promise<boolean> {
    // 1. If assigned application review
    if (request.targetApplicationId) {
      const application = await db.admissionApplication.findUnique({
        where: { id: request.targetApplicationId },
      });
      return Boolean(application && application.tenantId === tenantId && application.reviewerUserId === userId);
    }

    // 2. If assigned enquiry owner
    if (request.targetEnquiryId) {
      const enquiry = await db.admissionEnquiry.findUnique({
        where: { id: request.targetEnquiryId },
      });
      return Boolean(enquiry && enquiry.tenantId === tenantId && enquiry.ownerUserId === userId);
    }

    // 3. If assigned transport route (Driver or Attendant)
    if (request.targetRouteId) {
      const driver = await db.transportDriver.findFirst({
        where: { userId, tenantId },
      });
      const attendant = await db.transportAttendant.findFirst({
        where: { userId, tenantId },
      });

      if (!driver && !attendant) {
        return false;
      }

      const orConditions = [];
      if (driver) orConditions.push({ driverId: driver.id });
      if (attendant) orConditions.push({ attendantId: attendant.id });

      const assignment = await db.transportRouteAssignment.findFirst({
        where: {
          tenantId,
          routeId: request.targetRouteId,
          active: true,
          OR: orConditions,
        },
      });
      return Boolean(assignment);
    }

    // 4. If assigned warehouse manager
    if (request.targetWarehouseId) {
      const staffProfile = await db.staffProfile.findFirst({
        where: { userId, tenantId },
      });
      if (!staffProfile) return false;

      const warehouse = await db.inventoryWarehouse.findFirst({
        where: {
          id: request.targetWarehouseId,
          tenantId,
          managerStaffId: staffProfile.id,
        },
      });
      return Boolean(warehouse);
    }

    // 5. If assigned asset
    if (request.targetAssetId) {
      const staffProfile = await db.staffProfile.findFirst({
        where: { userId, tenantId },
      });
      const assignedToIds = [userId];
      if (staffProfile) assignedToIds.push(staffProfile.id);

      const assignment = await db.assetAssignment.findFirst({
        where: {
          tenantId,
          assetId: request.targetAssetId,
          status: "ACTIVE",
          assignedToId: { in: assignedToIds },
        },
      });
      return Boolean(assignment);
    }

    // 6. If assigned department scope
    if (request.targetDepartmentId) {
      const staffProfile = await db.staffProfile.findFirst({
        where: { userId, tenantId },
      });
      if (!staffProfile) return false;

      const isHead = await db.hRDepartment.findFirst({
        where: { id: request.targetDepartmentId, tenantId, headStaffId: staffProfile.id },
      });
      if (isHead) return true;

      const isMember = await db.hREmployment.findFirst({
        where: { staffProfileId: staffProfile.id, departmentId: request.targetDepartmentId, tenantId, status: "ACTIVE" },
      });
      return Boolean(isMember);
    }

    // If viewing teacher dashboard without specific target class
    if (!request.targetClassId && !request.targetWarehouseId && !request.targetAssetId && !request.targetDepartmentId) {
      return true;
    }

    // 4. Resolve staff profile for this caller
    const staffProfile = await db.staffProfile.findFirst({
      where: { userId, tenantId },
    });

    if (!staffProfile) {
      return false;
    }

    // 5. Check if supervisor for this class
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

    // 6. Check if assigned subject teacher for this class
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
