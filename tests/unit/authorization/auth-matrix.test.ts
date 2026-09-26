import { describe, it, expect, vi, beforeEach } from "vitest";
import { PolicyEngine } from "@/lib/authorization/policy-engine";
import { TenantContextData } from "@/lib/tenant/tenant-context";
import {
  UnauthorizedError,
  ForbiddenError,
  ModuleDisabledError,
  ScopeAccessDeniedError,
} from "@/lib/errors";

describe("Authorization Test Matrix (Section 34)", () => {
  let policyEngine: PolicyEngine;
  let mockDb: any;

  const tenantA = "tnt_institution_alpha";
  const tenantB = "tnt_institution_beta";

  const makeUser = (id: string, email: string, name: string) => ({
    id,
    clerkId: `clerk_${id}`,
    email,
    firstName: name,
    lastName: "User",
    displayName: `${name} User`,
  });

  beforeEach(() => {
    policyEngine = new PolicyEngine();
    mockDb = {
      rolePermission: { findFirst: vi.fn() },
      tenantModuleEntitlement: { findUnique: vi.fn() },
      studentProfile: { findUnique: vi.fn(), findFirst: vi.fn() },
      parentProfile: { findFirst: vi.fn() },
      studentParentBinding: { findFirst: vi.fn() },
      staffProfile: { findFirst: vi.fn() },
      class: { findFirst: vi.fn() },
      classSubject: { findFirst: vi.fn() },
    };
  });

  const matrixCases = [
    // 1. Missing Identity (Unauthenticated) -> 401 Unauthorized
    {
      label: "none | Tenant A | - | - | - | enabled | 401 Unauthorized",
      context: undefined as any,
      permission: "student.read",
      expectedOutcome: "UNAUTHORIZED",
    },
    // 2. Identity present but Tenant missing -> Denied (401 or context error)
    {
      label: "user | none | - | - | - | enabled | denied",
      context: {
        tenant: undefined,
        user: makeUser("usr_1", "user@school.edu", "Unbound"),
        membership: undefined,
      } as any,
      permission: "student.read",
      expectedOutcome: "UNAUTHORIZED",
    },
    // 3. User in Tenant A, active membership, but permission not in role -> 403 Forbidden
    {
      label: "user | Tenant A | member | none | - | enabled | 403 Forbidden",
      context: {
        tenant: { id: tenantA, slug: "alpha", name: "Alpha", status: "ACTIVE", planTier: "STANDARD" },
        user: makeUser("usr_alice", "alice@school.edu", "Alice"),
        membership: { id: "mem_alice_a", tenantId: tenantA, userId: "usr_alice", roleId: "rol_student", status: "ACTIVE" },
      } as TenantContextData,
      permission: "tenant.delete", // student definitely does not have tenant.delete
      rolePermissionReturn: null,
      expectedOutcome: "FORBIDDEN",
    },
    // 4. User in Tenant A, granted permission, valid scope, enabled module -> Allow
    {
      label: "user | Tenant A | role | granted | valid | enabled | ALLOW",
      context: {
        tenant: { id: tenantA, slug: "alpha", name: "Alpha", status: "ACTIVE", planTier: "STANDARD" },
        user: makeUser("usr_admin", "admin@school.edu", "Admin"),
        membership: { id: "mem_admin_a", tenantId: tenantA, userId: "usr_admin", roleId: "rol_admin", status: "ACTIVE" },
      } as TenantContextData,
      permission: "student.read",
      rolePermissionReturn: {
        id: "rp_1",
        roleId: "rol_admin",
        permissionId: "p_stu_read",
        accessScope: "INSTITUTION_WIDE",
        permission: { permissionKey: "student.read", moduleKey: "core_academics" },
      },
      moduleEntitlementReturn: { isEnabled: true, expiresAt: null },
      expectedOutcome: "ALLOWED",
    },
    // 5. User in Tenant A, granted permission, invalid scope relation -> 403 Scope Denied
    {
      label: "user | Tenant A | role | granted | invalid scope | enabled | 403 Forbidden (Scope)",
      context: {
        tenant: { id: tenantA, slug: "alpha", name: "Alpha", status: "ACTIVE", planTier: "STANDARD" },
        user: makeUser("usr_teacher", "teach@school.edu", "Teacher"),
        membership: { id: "mem_teach_a", tenantId: tenantA, userId: "usr_teacher", roleId: "rol_teacher", status: "ACTIVE" },
      } as TenantContextData,
      permission: "attendance.read",
      requestOptions: { targetClassId: "cls_unassigned" },
      rolePermissionReturn: {
        id: "rp_2",
        roleId: "rol_teacher",
        permissionId: "p_att_read",
        accessScope: "ASSIGNED_ONLY",
        permission: { permissionKey: "attendance.read", moduleKey: "attendance_module" },
      },
      scopeMockSetup: (db: any) => {
        // Teacher is not assigned to this class
        db.staffProfile.findFirst.mockResolvedValue({ id: "stf_1", userId: "usr_teacher", tenantId: tenantA });
        db.class.findFirst.mockResolvedValue(null);
        db.classSubject.findFirst.mockResolvedValue(null);
      },
      expectedOutcome: "SCOPE_DENIED",
    },
    // 6. User in Tenant A, granted permission, valid scope, but module is DISABLED -> 402 Module Disabled
    {
      label: "user | Tenant A | role | granted | valid | disabled | 402 Module Disabled",
      context: {
        tenant: { id: tenantA, slug: "alpha", name: "Alpha", status: "ACTIVE", planTier: "STARTER" },
        user: makeUser("usr_teacher", "teach@school.edu", "Teacher"),
        membership: { id: "mem_teach_a", tenantId: tenantA, userId: "usr_teacher", roleId: "rol_teacher", status: "ACTIVE" },
      } as TenantContextData,
      permission: "exam.publish",
      rolePermissionReturn: {
        id: "rp_3",
        roleId: "rol_teacher",
        permissionId: "p_exam_pub",
        accessScope: "INSTITUTION_WIDE",
        permission: { permissionKey: "exam.publish", moduleKey: "exam_module" },
      },
      moduleEntitlementReturn: { isEnabled: false, expiresAt: null }, // Module disabled!
      expectedOutcome: "MODULE_DISABLED",
    },
    // 7. User in Tenant B, independent from Tenant A -> Independent isolated evaluation
    {
      label: "user | Tenant B | role | granted | valid | enabled | independent from Tenant A",
      context: {
        tenant: { id: tenantB, slug: "beta", name: "Beta", status: "ACTIVE", planTier: "ENTERPRISE" },
        user: makeUser("usr_beta_user", "beta@school.edu", "BetaUser"),
        membership: { id: "mem_beta", tenantId: tenantB, userId: "usr_beta_user", roleId: "rol_beta_teacher", status: "ACTIVE" },
      } as TenantContextData,
      permission: "exam.read",
      rolePermissionReturn: {
        id: "rp_beta",
        roleId: "rol_beta_teacher",
        permissionId: "p_exam_read",
        accessScope: "INSTITUTION_WIDE",
        permission: { permissionKey: "exam.read", moduleKey: "exam_module" },
      },
      moduleEntitlementReturn: { isEnabled: true, expiresAt: null },
      expectedOutcome: "ALLOWED",
    },
  ];

  matrixCases.forEach((tc) => {
    it(`Matrix Case: [${tc.label}]`, async () => {
      if (tc.rolePermissionReturn !== undefined) {
        mockDb.rolePermission.findFirst.mockResolvedValue(tc.rolePermissionReturn);
      }
      if (tc.moduleEntitlementReturn !== undefined) {
        mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue(tc.moduleEntitlementReturn);
      }
      if (tc.scopeMockSetup) {
        tc.scopeMockSetup(mockDb);
      }

      if (tc.expectedOutcome === "UNAUTHORIZED") {
        await expect(
          policyEngine.assertAuthorized(
            {
              permission: tc.permission,
              context: tc.context,
              ...(tc.requestOptions || {}),
            },
            mockDb
          )
        ).rejects.toThrow(UnauthorizedError);
      } else if (tc.expectedOutcome === "FORBIDDEN") {
        await expect(
          policyEngine.assertAuthorized(
            {
              permission: tc.permission,
              context: tc.context,
              ...(tc.requestOptions || {}),
            },
            mockDb
          )
        ).rejects.toThrow(ForbiddenError);
      } else if (tc.expectedOutcome === "SCOPE_DENIED") {
        await expect(
          policyEngine.assertAuthorized(
            {
              permission: tc.permission,
              context: tc.context,
              ...(tc.requestOptions || {}),
            },
            mockDb
          )
        ).rejects.toThrow(ScopeAccessDeniedError);
      } else if (tc.expectedOutcome === "MODULE_DISABLED") {
        await expect(
          policyEngine.assertAuthorized(
            {
              permission: tc.permission,
              context: tc.context,
              ...(tc.requestOptions || {}),
            },
            mockDb
          )
        ).rejects.toThrow(ModuleDisabledError);
      } else if (tc.expectedOutcome === "ALLOWED") {
        const decision = await policyEngine.assertAuthorized(
          {
            permission: tc.permission,
            context: tc.context,
            ...(tc.requestOptions || {}),
          },
          mockDb
        );
        expect(decision.allowed).toBe(true);
      }
    });
  });

  describe("Expanded Role Matrix Invariants across System Roles", () => {
    it("Principal can manage academics with INSTITUTION_WIDE scope when enabled", async () => {
      const principalContext: TenantContextData = {
        tenant: { id: tenantA, slug: "alpha", name: "Alpha", status: "ACTIVE", planTier: "STANDARD" },
        user: { id: "usr_princ", clerkId: "c_pr", email: "principal@alpha.edu", firstName: "Pragya", lastName: "Sharma", displayName: "Principal Sharma" },
        membership: { id: "mem_pr", tenantId: tenantA, userId: "usr_princ", roleId: "rol_principal", status: "ACTIVE" },
      };

      mockDb.rolePermission.findFirst.mockResolvedValue({
        id: "rp_pr",
        roleId: "rol_principal",
        accessScope: "INSTITUTION_WIDE",
        permission: { permissionKey: "timetable.manage", moduleKey: "timetable_module" },
      });
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({ isEnabled: true, expiresAt: null });

      const decision = await policyEngine.assertAuthorized(
        { permission: "timetable.manage", context: principalContext },
        mockDb
      );
      expect(decision.allowed).toBe(true);
      expect(decision.scope).toBe("INSTITUTION_WIDE");
    });

    it("Student cannot access other student record under SELF_ONLY scope", async () => {
      const studentContext: TenantContextData = {
        tenant: { id: tenantA, slug: "alpha", name: "Alpha", status: "ACTIVE", planTier: "STANDARD" },
        user: { id: "usr_student_1", clerkId: "c_s1", email: "student1@alpha.edu", firstName: "Rohan", lastName: "Verma", displayName: "Rohan V" },
        membership: { id: "mem_s1", tenantId: tenantA, userId: "usr_student_1", roleId: "rol_student", status: "ACTIVE" },
      };

      mockDb.rolePermission.findFirst.mockResolvedValue({
        id: "rp_s1",
        roleId: "rol_student",
        accessScope: "SELF_ONLY",
        permission: { permissionKey: "student.read", moduleKey: "core_academics" },
      });

      // Target is student 2
      await expect(
        policyEngine.assertAuthorized(
          {
            permission: "student.read",
            context: studentContext,
            resourceOwnerUserId: "usr_student_2",
          },
          mockDb
        )
      ).rejects.toThrow(ScopeAccessDeniedError);
    });

    it("Parent can access linked child record under LINKED_CHILDREN scope", async () => {
      const parentContext: TenantContextData = {
        tenant: { id: tenantA, slug: "alpha", name: "Alpha", status: "ACTIVE", planTier: "STANDARD" },
        user: { id: "usr_parent_1", clerkId: "c_p1", email: "parent1@alpha.edu", firstName: "Suresh", lastName: "Verma", displayName: "Suresh V" },
        membership: { id: "mem_p1", tenantId: tenantA, userId: "usr_parent_1", roleId: "rol_parent", status: "ACTIVE" },
      };

      mockDb.rolePermission.findFirst.mockResolvedValue({
        id: "rp_p1",
        roleId: "rol_parent",
        accessScope: "LINKED_CHILDREN",
        permission: { permissionKey: "attendance.read", moduleKey: "attendance_module" },
      });

      // Linked child binding exists in DB
      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "par_prof_1",
        userId: "usr_parent_1",
        tenantId: tenantA,
      });
      mockDb.studentParentBinding.findFirst.mockResolvedValue({
        id: "spb_1",
        parentId: "par_prof_1",
        studentId: "stu_kid_1",
      });

      const decision = await policyEngine.assertAuthorized(
        {
          permission: "attendance.read",
          context: parentContext,
          targetStudentId: "stu_kid_1",
        },
        mockDb
      );
      expect(decision.allowed).toBe(true);
    });
  });
});
