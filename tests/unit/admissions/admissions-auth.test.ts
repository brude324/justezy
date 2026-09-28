import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModuleGate } from "@/lib/authorization/module-gate";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";
import { ModuleDisabledError, ScopeAccessDeniedError } from "@/lib/errors";

describe("Admissions Authorization, Module Entitlement & AccessScope Tests", () => {
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
      admissionApplication: {
        findUnique: vi.fn(),
      },
      admissionEnquiry: {
        findUnique: vi.fn(),
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

  describe("Module Entitlement Gating (admissions_module)", () => {
    it("should allow admissions operations when admissions_module is licensed and enabled", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
        tenantId: tenantAlpha,
        moduleKey: "admissions_module",
        isEnabled: true,
        expiresAt: new Date(Date.now() + 1000000),
      });

      const isEnabled = await moduleGate.isModuleEnabled(tenantAlpha, "admissions_module", mockDb);
      expect(isEnabled).toBe(true);
    });

    it("should reject operations with HTTP 402 ModuleDisabledError when admissions_module is disabled", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
        tenantId: tenantAlpha,
        moduleKey: "admissions_module",
        isEnabled: false,
      });

      await expect(
        moduleGate.assertModuleEnabled(tenantAlpha, "admissions_module", mockDb)
      ).rejects.toThrow(ModuleDisabledError);
    });

    it("should reject operations with HTTP 402 when admissions_module entitlement is not present", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue(null);

      await expect(
        moduleGate.assertModuleEnabled(tenantAlpha, "admissions_module", mockDb)
      ).rejects.toThrow(ModuleDisabledError);
    });
  });

  describe("AccessScope Boundaries for Admissions", () => {
    const mockContext = {
      tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
      user: { id: "usr_caller", email: "caller@example.com" } as any,
      membership: { id: "mem_1", status: "ACTIVE" } as any,
      role: { roleKey: "ADMISSIONS_OFFICER" } as any,
      permissions: new Set(["admissions.read", "admissions.review"]),
      scope: "ASSIGNED_ONLY" as any,
    };

    it("INSTITUTION_WIDE: should allow access across all tenant admission records", async () => {
      const allowed = await scopeEvaluator.evaluateScope(
        "INSTITUTION_WIDE",
        {
          permission: "admissions.read",
          targetApplicationId: "appl_any",
        },
        mockContext,
        mockDb
      );

      expect(allowed).toBe(true);
    });

    it("ASSIGNED_ONLY: should permit reviewer assigned to the target application", async () => {
      mockDb.admissionApplication.findUnique.mockResolvedValue({
        id: "appl_assigned",
        tenantId: tenantAlpha,
        reviewerUserId: "usr_caller", // Caller matches reviewer
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        {
          permission: "admissions.review",
          targetApplicationId: "appl_assigned",
        },
        mockContext,
        mockDb
      );

      expect(allowed).toBe(true);
    });

    it("ASSIGNED_ONLY: should deny reviewer not assigned to the target application", async () => {
      mockDb.admissionApplication.findUnique.mockResolvedValue({
        id: "appl_other",
        tenantId: tenantAlpha,
        reviewerUserId: "usr_different_counselor",
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        {
          permission: "admissions.review",
          targetApplicationId: "appl_other",
        },
        mockContext,
        mockDb
      );

      expect(allowed).toBe(false);
    });

    it("LINKED_CHILDREN: should permit registered guardian matching applicant guardian contact", async () => {
      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "par_caller",
        tenantId: tenantAlpha,
        primaryPhone: "9876543210",
      });

      mockDb.admissionApplication.findUnique.mockResolvedValue({
        id: "appl_child",
        tenantId: tenantAlpha,
        applicant: {
          guardianPhone: "9876543210",
        },
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        {
          permission: "admissions.read",
          targetApplicationId: "appl_child",
        },
        mockContext,
        mockDb
      );

      expect(allowed).toBe(true);
    });

    it("LINKED_CHILDREN: should reject guardian for unrelated applicant", async () => {
      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "par_caller",
        tenantId: tenantAlpha,
        primaryPhone: "9876543210",
      });

      mockDb.admissionApplication.findUnique.mockResolvedValue({
        id: "appl_unrelated",
        tenantId: tenantAlpha,
        applicant: {
          guardianPhone: "9999999999", // Unrelated phone
        },
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        {
          permission: "admissions.read",
          targetApplicationId: "appl_unrelated",
        },
        mockContext,
        mockDb
      );

      expect(allowed).toBe(false);
    });
  });

  describe("Tenant Isolation Invariants", () => {
    it("should reject cross-tenant application access when tenantId does not match", async () => {
      // Application belongs to Tenant Beta, caller is in Tenant Alpha
      mockDb.admissionApplication.findUnique.mockResolvedValue({
        id: "appl_beta",
        tenantId: tenantBeta,
        reviewerUserId: "usr_caller",
      });

      const mockContextAlpha = {
        tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
        user: { id: "usr_caller" } as any,
        membership: { status: "ACTIVE" } as any,
        role: { roleKey: "ADMISSIONS_OFFICER" } as any,
        permissions: new Set(["admissions.read"]),
        scope: "ASSIGNED_ONLY" as any,
      };

      const allowed = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        {
          permission: "admissions.read",
          targetApplicationId: "appl_beta",
        },
        mockContextAlpha,
        mockDb
      );

      // Fails because tenantId does not match caller's verified institutional context
      expect(allowed).toBe(false);
    });
  });
});
