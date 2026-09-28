import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModuleGate } from "@/lib/authorization/module-gate";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";
import { ModuleDisabledError } from "@/lib/errors";

describe("Finance Authorization, Module Entitlement & AccessScope Tests (Categories O, P, Q, R, V)", () => {
  let moduleGate: ModuleGate;
  let scopeEvaluator: ScopeEvaluator;
  let mockDb: any;

  const tenantAlpha = "tnt_alpha_school";
  const tenantBeta = "tnt_beta_academy";

  beforeEach(() => {
    moduleGate = new ModuleGate();
    scopeEvaluator = new ScopeEvaluator();
    mockDb = {
      tenantModuleEntitlement: {
        findUnique: vi.fn(),
      },
      studentProfile: {
        findUnique: vi.fn(),
      },
      studentParentBinding: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      parentProfile: {
        findFirst: vi.fn(),
      },
    };
  });

  describe("Category P: Module Entitlement Gating (fees_module & finance_module)", () => {
    it("should allow fees operations when fees_module is enabled and not expired", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
        tenantId: tenantAlpha,
        moduleKey: "fees_module",
        isEnabled: true,
        expiresAt: new Date(Date.now() + 1000000),
      });

      const enabled = await moduleGate.isModuleEnabled(tenantAlpha, "fees_module", mockDb);
      expect(enabled).toBe(true);
    });

    it("should reject operations with ModuleDisabledError when fees_module is disabled", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
        tenantId: tenantAlpha,
        moduleKey: "fees_module",
        isEnabled: false,
      });

      await expect(
        moduleGate.assertModuleEnabled(tenantAlpha, "fees_module", mockDb)
      ).rejects.toThrow(ModuleDisabledError);
    });

    it("should reject operations with ModuleDisabledError when finance_module entitlement has expired", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
        tenantId: tenantAlpha,
        moduleKey: "finance_module",
        isEnabled: true,
        expiresAt: new Date(Date.now() - 10000), // Expired in past!
      });

      await expect(
        moduleGate.assertModuleEnabled(tenantAlpha, "finance_module", mockDb)
      ).rejects.toThrow(ModuleDisabledError);
    });
  });

  describe("Category Q & V: AccessScopes (INSTITUTION_WIDE, LINKED_CHILDREN, SELF_ONLY)", () => {
    it("INSTITUTION_WIDE: Finance Officer has clearance across all tenant students", async () => {
      const allowed = await scopeEvaluator.evaluateScope(
        "INSTITUTION_WIDE",
        { permission: "fees.collect", targetStudentId: "stu_any" },
        {
          tenant: { id: tenantAlpha } as any,
          user: { id: "usr_finance_officer" } as any,
          membership: { role: { roleKey: "FINANCE_OFFICER" } } as any,
        },
        mockDb
      );

      expect(allowed).toBe(true);
    });

    it("LINKED_CHILDREN: Parent can access fee invoices of their verified linked child", async () => {
      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "par_parent_1",
        tenantId: tenantAlpha,
      });
      mockDb.studentParentBinding.findFirst.mockResolvedValue({
        tenantId: tenantAlpha,
        studentId: "stu_child_1",
        parentId: "par_parent_1",
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        { permission: "fees.read", targetStudentId: "stu_child_1" },
        {
          tenant: { id: tenantAlpha } as any,
          user: { id: "usr_parent" } as any,
          membership: { parentProfile: { id: "par_parent_1" }, role: { roleKey: "PARENT" } } as any,
        },
        mockDb
      );

      expect(allowed).toBe(true);
    });

    it("LINKED_CHILDREN: Parent is blocked from viewing fee invoices of an unrelated student", async () => {
      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "par_parent_1",
        tenantId: tenantAlpha,
      });
      mockDb.studentParentBinding.findFirst.mockResolvedValue(null); // Not linked!

      const allowed = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        { permission: "fees.read", targetStudentId: "stu_stranger" },
        {
          tenant: { id: tenantAlpha } as any,
          user: { id: "usr_parent" } as any,
          membership: { parentProfile: { id: "par_parent_1" }, role: { roleKey: "PARENT" } } as any,
        },
        mockDb
      );

      expect(allowed).toBe(false);
    });

    it("SELF_ONLY: Student can access their own fee dues", async () => {
      mockDb.studentProfile.findUnique.mockResolvedValue({
        id: "stu_self",
        userId: "usr_student",
        tenantId: tenantAlpha,
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        { permission: "fees.read", targetStudentId: "stu_self" },
        {
          tenant: { id: tenantAlpha } as any,
          user: { id: "usr_student" } as any,
          membership: { role: { roleKey: "STUDENT" } } as any,
        },
        mockDb
      );

      expect(allowed).toBe(true);
    });

    it("SELF_ONLY: Student is blocked from accessing another student's fee dues", async () => {
      mockDb.studentProfile.findUnique.mockResolvedValue({
        id: "stu_other",
        userId: "usr_other_student", // Different user!
        tenantId: tenantAlpha,
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        { permission: "fees.read", targetStudentId: "stu_other" },
        {
          tenant: { id: tenantAlpha } as any,
          user: { id: "usr_student" } as any,
          membership: { role: { roleKey: "STUDENT" } } as any,
        },
        mockDb
      );

      expect(allowed).toBe(false);
    });
  });

  describe("Category R: Cross-Tenant Isolation Enforcement", () => {
    it("should reject student scope evaluation when student belongs to a different tenant", async () => {
      mockDb.studentProfile.findUnique.mockResolvedValue({
        id: "stu_cross",
        userId: "usr_student",
        tenantId: tenantBeta, // Belongs to Tenant Beta, but caller is in Tenant Alpha!
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        { permission: "fees.read", targetStudentId: "stu_cross" },
        {
          tenant: { id: tenantAlpha } as any,
          user: { id: "usr_student" } as any,
          membership: { role: { roleKey: "STUDENT" } } as any,
        },
        mockDb
      );

      expect(allowed).toBe(false);
    });
  });
});
