import { describe, it, expect, vi, beforeEach } from "vitest";
import { PolicyEngine } from "@/lib/authorization/policy-engine";
import { TenantContextData } from "@/lib/tenant/tenant-context";
import { ForbiddenError, ModuleDisabledError, ScopeAccessDeniedError } from "@/lib/errors";

describe("PolicyEngine Dual-Gate Pipeline (Step 4D)", () => {
  let engine: PolicyEngine;
  let mockDb: any;

  const validContext: TenantContextData = {
    tenant: {
      id: "tnt_active_school",
      slug: "active-school",
      name: "Active School",
      status: "ACTIVE",
      planTier: "ACADEMIC_PRO",
    },
    user: {
      id: "usr_alice",
      clerkId: "clerk_alice",
      email: "alice@school.edu",
      firstName: "Alice",
      lastName: "Teacher",
      displayName: "Alice Teacher",
    },
    membership: {
      id: "mem_alice",
      tenantId: "tnt_active_school",
      userId: "usr_alice",
      roleId: "rol_teacher",
      status: "ACTIVE",
    },
  };

  beforeEach(() => {
    engine = new PolicyEngine();
    mockDb = {
      tenantModuleEntitlement: {
        findUnique: vi.fn(),
      },
      rolePermission: {
        findFirst: vi.fn(),
      },
      studentProfile: {
        findUnique: vi.fn(),
      },
      parentProfile: {
        findFirst: vi.fn(),
      },
      studentParentBinding: {
        findFirst: vi.fn(),
      },
      staffProfile: {
        findFirst: vi.fn(),
      },
      class: {
        findFirst: vi.fn(),
      },
      classSubject: {
        findFirst: vi.fn(),
      },
    };
  });

  it("should permit access when module is enabled, permission granted, and scope is satisfied", async () => {
    // 1. Module is core (attendance_module) -> automatically enabled
    // 2. Role permission exists with INSTITUTION_WIDE
    mockDb.rolePermission.findFirst.mockResolvedValue({
      id: "rp_1",
      roleId: "rol_teacher",
      accessScope: "INSTITUTION_WIDE",
      permission: {
        permissionKey: "attendance.read",
      },
    });

    const decision = await engine.evaluate(
      {
        permission: "attendance.read",
        context: validContext,
      },
      mockDb
    );

    expect(decision.allowed).toBe(true);
    expect(decision.permissionKey).toBe("attendance.read");
    expect(decision.scope).toBe("INSTITUTION_WIDE");
  });

  it("should block with ModuleDisabledError (HTTP 402) when module entitlement is disabled (Gate 1)", async () => {
    // exam_module is optional; mock as disabled in database
    mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
      tenantId: "tnt_active_school",
      moduleKey: "exam_module",
      isEnabled: false, // Disabled!
    });

    await expect(
      engine.assertAuthorized(
        {
          permission: "exam.read",
          context: validContext,
        },
        mockDb
      )
    ).rejects.toThrow(ModuleDisabledError);

    // Assert that rolePermission was NOT queried because Gate 1 failed first
    expect(mockDb.rolePermission.findFirst).not.toHaveBeenCalled();
  });

  it("should block with ForbiddenError (HTTP 403) when permission is missing from role (Gate 2)", async () => {
    // Module enabled (core academics)
    // Permission query returns null (role does not have permission)
    mockDb.rolePermission.findFirst.mockResolvedValue(null);

    await expect(
      engine.assertAuthorized(
        {
          permission: "tenant.manage", // Teacher attempting admin action
          context: validContext,
        },
        mockDb
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it("should block with ScopeAccessDeniedError (HTTP 403) when horizontal access scope is violated (Gate 3)", async () => {
    // Role has permission, but access scope is ASSIGNED_ONLY
    mockDb.rolePermission.findFirst.mockResolvedValue({
      id: "rp_assign",
      roleId: "rol_teacher",
      accessScope: "ASSIGNED_ONLY",
      permission: {
        permissionKey: "class.read",
      },
    });

    // Staff profile exists for Alice
    mockDb.staffProfile.findFirst.mockResolvedValue({
      id: "stf_alice",
      userId: "usr_alice",
      tenantId: "tnt_active_school",
    });

    // Teacher is NOT assigned as class supervisor or subject teacher for class 'cls_unassigned'
    mockDb.class.findFirst.mockResolvedValue(null);
    mockDb.classSubject.findFirst.mockResolvedValue(null);

    await expect(
      engine.assertAuthorized(
        {
          permission: "class.read",
          context: validContext,
          targetClassId: "cls_unassigned",
        },
        mockDb
      )
    ).rejects.toThrow(ScopeAccessDeniedError);
  });

  it("can helper should return false without throwing on denied permission", async () => {
    mockDb.rolePermission.findFirst.mockResolvedValue(null);

    const allowed = await engine.can("random.permission", validContext, mockDb);
    expect(allowed).toBe(false);
  });

  it("should fail closed if tenant membership is SUSPENDED or TERMINATED", async () => {
    const suspendedContext: TenantContextData = {
      ...validContext,
      membership: {
        ...validContext.membership,
        status: "SUSPENDED",
      },
    };

    const decision = await engine.evaluate(
      {
        permission: "attendance.read",
        context: suspendedContext,
      },
      mockDb
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("SUSPENDED");
  });
});
