import { TenantContextData } from "@/lib/tenant/tenant-context";

export type AccessScopeType =
  | "GLOBAL"
  | "INSTITUTION_WIDE"
  | "ASSIGNED_ONLY"
  | "SELF_ONLY"
  | "LINKED_CHILDREN";

export type PlatformRoleType = "SUPER_ADMIN" | "SUPPORT_OPERATOR" | "AUDITOR";

export interface AuthorizationRequest {
  permission: string;
  context?: TenantContextData;
  resourceId?: string;
  resourceType?: string;
  resourceOwnerUserId?: string;
  targetStudentId?: string;
  targetClassId?: string;
  targetApplicationId?: string;
  targetEnquiryId?: string;
  targetMemberId?: string;
  targetRouteId?: string;
  targetWarehouseId?: string;
  targetAssetId?: string;
  targetDepartmentId?: string;
  targetEmploymentId?: string;
  moduleKey?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
  scope?: AccessScopeType;
  permissionKey?: string;
  moduleKey?: string;
  code?: "MODULE_DISABLED" | "PERMISSION_DENIED" | "SCOPE_DENIED" | string;
}

export interface RequirePermissionOptions {
  context?: TenantContextData;
  resourceId?: string;
  resourceType?: string;
  resourceOwnerUserId?: string;
  targetStudentId?: string;
  targetClassId?: string;
  targetApplicationId?: string;
  targetEnquiryId?: string;
  targetMemberId?: string;
  targetRouteId?: string;
  targetWarehouseId?: string;
  targetAssetId?: string;
  targetDepartmentId?: string;
  targetEmploymentId?: string;
  moduleKey?: string;
}

