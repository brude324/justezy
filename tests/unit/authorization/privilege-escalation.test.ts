import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleService } from "@/lib/authorization/role-service";
import { PolicyEngine } from "@/lib/authorization/policy-engine";
import { PlatformAuthorizer } from "@/lib/authorization/platform-authorizer";
import { TenantContextData } from "@/lib/tenant/tenant-context";
import { ForbiddenError, CrossTenantAccessError } from "@/lib/errors";

describe("Privilege Escalation Defense Invariants 1-10 (Step 4D)", () => {
  let roleService: RoleService;
  let policyEngine: PolicyEngine;
  let platformAuthorizer: PlatformAuthorizer;
  let mockDb: any;

  const tenantA = "tnt_school_alpha";
  const tenantB = "tnt_school_beta";

  beforeEach(() => {
    roleService = new RoleService();
    policyEngine = new PolicyEngine();
    platformAuthorizer = new PlatformAuthorizer();
    mockDb = {
      tenant: { findUnique: vi.fn() },
      role: { findUnique: vi.fn(), create: vi.fn() },
      tenantMembership: { findUnique: vi.fn(), update: vi.fn() },
      rolePermission: { findFirst: vi.fn() },
      auditLog: { create: vi.fn() },
      platformUser: { findUnique: vi.fn() },
      tenantModuleEntitlement: { findUnique: vi.fn().mockResolvedValue({ isEnabled: true, expiresAt: null }) },
    };
  });

  describe("Invariant 1: User Cannot Self-Assign Higher Role", () => {
    it("should reject a non-owner attempting to self-assign the INSTITUTION_OWNER role", async () => {
      mockDb.role.findUnique.mockResolvedValue({
        id: "rol_owner",
        roleKey: "INSTITUTION_OWNER",
        tenantId: null, // System role
      });

      // Caller is currently a TEACHER
      mockDb.tenantMembership.findUnique.mockResolvedValue({
        id: "mem_teacher",
        tenantId: tenantA,
        userId: "usr_teacher",
        role: { roleKey: "TEACHER" },
      });

      await expect(
        roleService.assignRoleToUser(
          {
            tenantId: tenantA,
            userId: "usr_teacher",
            roleId: "rol_owner",
            actorUserId: "usr_teacher", // Self-assignment!
          },
          mockDb
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Invariant 2: Member Cannot Modify Another Tenant's Roles", () => {
    it("should reject assigning a role belonging to another tenant (CrossTenantAccessError)", async () => {
      // Role belongs to Tenant B
      mockDb.role.findUnique.mockResolvedValue({
        id: "rol_custom_b",
        tenantId: tenantB,
        roleKey: "CUSTOM_ROLE_B",
      });

      await expect(
        roleService.assignRoleToUser(
          {
            tenantId: tenantA, // Target is Tenant A!
            userId: "usr_student",
            roleId: "rol_custom_b",
            actorUserId: "usr_admin_a",
          },
          mockDb
        )
      ).rejects.toThrow(CrossTenantAccessError);
    });
  });

  describe("Invariant 3, 4 & 5: Horizontal Cross-Role Privilege Grabbing", () => {
    it("teacher cannot grant themselves admin permissions by creating custom role without tenant.manage", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: tenantA });
      // Caller has role TEACHER (which lacks tenant.manage)
      mockDb.tenantMembership.findUnique.mockResolvedValue({
        status: "ACTIVE",
        role: {
          roleKey: "TEACHER",
          permissions: [{ permission: { permissionKey: "attendance.mark" } }],
        },
      });

      await expect(
        roleService.createCustomRole(
          {
            tenantId: tenantA,
            roleKey: "ROGUE_ADMIN",
            name: "Rogue Admin",
            permissions: [{ permissionKey: "tenant.manage" }],
            actorUserId: "usr_teacher_attacker",
          },
          mockDb
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it("student cannot exercise teacher permissions via database-driven evaluation", async () => {
      const studentContext: TenantContextData = {
        tenant: { id: tenantA, slug: "alpha", name: "Alpha", status: "ACTIVE", planTier: "STARTER" },
        user: { id: "usr_stu_1", clerkId: "c_1", email: "stu@alpha.edu", firstName: "Sam", lastName: "Student", displayName: "Sam" },
        membership: { id: "mem_stu", tenantId: tenantA, userId: "usr_stu_1", roleId: "rol_student", status: "ACTIVE" },
      };

      // Student role does NOT have attendance.mark in DB
      mockDb.rolePermission.findFirst.mockResolvedValue(null);

      const decision = await policyEngine.evaluate(
        { permission: "attendance.mark", context: studentContext },
        mockDb
      );

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("PERMISSION_DENIED");
    });

    it("parent cannot exercise institution-wide student directory export", async () => {
      const parentContext: TenantContextData = {
        tenant: { id: tenantA, slug: "alpha", name: "Alpha", status: "ACTIVE", planTier: "STARTER" },
        user: { id: "usr_prt_1", clerkId: "c_2", email: "parent@alpha.edu", firstName: "Pat", lastName: "Parent", displayName: "Pat" },
        membership: { id: "mem_prt", tenantId: tenantA, userId: "usr_prt_1", roleId: "rol_parent", status: "ACTIVE" },
      };

      // Parent role does NOT have student.export
      mockDb.rolePermission.findFirst.mockResolvedValue(null);

      await expect(
        policyEngine.assertAuthorized(
          { permission: "student.export", context: parentContext },
          mockDb
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Invariant 6 & 7: Platform vs Tenant Privilege Separation", () => {
    it("tenant admin cannot exercise platform operations", async () => {
      // Calling requirePlatformRole without platform context -> must throw UnauthorizedError
      await expect(
        platformAuthorizer.requirePlatformRole(["SUPER_ADMIN"])
      ).rejects.toThrow();
    });

    it("platform privileges are not granted by having tenant membership", async () => {
      const tenantAdminContext = {
        platformRole: "SUPPORT_OPERATOR",
        isSuperAdmin: false,
        user: { id: "usr_admin", clerkId: "c_adm", email: "adm@school.edu" },
      };

      // Operation requires SUPER_ADMIN; caller is only SUPPORT_OPERATOR
      await expect(
        platformAuthorizer.requirePlatformRole(["SUPER_ADMIN"], tenantAdminContext as any, mockDb)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Invariant 8, 9 & 10: Client-Supplied Authorization Tampering Rejection", () => {
    it("client-supplied role or permission in request body cannot bypass DB RolePermission evaluation", async () => {
      const context: TenantContextData = {
        tenant: { id: tenantA, slug: "alpha", name: "Alpha", status: "ACTIVE", planTier: "STARTER" },
        user: { id: "usr_malicious", clerkId: "c_3", email: "hacker@school.edu", firstName: "Hacker", lastName: "User", displayName: "Hacker" },
        membership: { id: "mem_hacker", tenantId: tenantA, userId: "usr_malicious", roleId: "rol_actual_student_in_db", status: "ACTIVE" },
      };

      // Attacker claims in payload: { role: 'INSTITUTION_OWNER', permission: 'exam.publish', accessScope: 'GLOBAL' }
      // DB resolves membership.roleId ('rol_actual_student_in_db') which lacks exam.publish
      mockDb.rolePermission.findFirst.mockResolvedValue(null);

      const decision = await policyEngine.evaluate(
        {
          permission: "exam.publish",
          context,
        },
        mockDb
      );

      // Must be evaluated from DB role, ignoring client claims
      expect(mockDb.rolePermission.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roleId: "rol_actual_student_in_db" }),
        })
      );
      expect(decision.allowed).toBe(false);
    });
  });
});
