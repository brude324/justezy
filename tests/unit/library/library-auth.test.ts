import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModuleGate } from "@/lib/authorization/module-gate";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";
import { ModuleDisabledError, ScopeAccessDeniedError } from "@/lib/errors";

describe("Library Authorization, Module Entitlement & AccessScope Tests", () => {
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
      libraryMember: {
        findUnique: vi.fn(),
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
    };
  });

  describe("Module Entitlement Gating (library_module)", () => {
    it("should allow library operations when library_module is enabled", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
        tenantId: tenantAlpha,
        moduleKey: "library_module",
        isEnabled: true,
      });

      const isEnabled = await moduleGate.isModuleEnabled(tenantAlpha, "library_module", mockDb);
      expect(isEnabled).toBe(true);
    });

    it("should reject operations with HTTP 402 ModuleDisabledError when library_module is disabled", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
        tenantId: tenantAlpha,
        moduleKey: "library_module",
        isEnabled: false,
      });

      await expect(
        moduleGate.assertModuleEnabled(tenantAlpha, "library_module", mockDb)
      ).rejects.toThrow(ModuleDisabledError);
    });

    it("should reject operations with HTTP 402 when library_module entitlement is not present", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue(null);

      await expect(
        moduleGate.assertModuleEnabled(tenantAlpha, "library_module", mockDb)
      ).rejects.toThrow(ModuleDisabledError);
    });
  });

  describe("AccessScope Boundaries for Library", () => {
    const mockContext = {
      tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
      user: { id: "usr_librarian", email: "librarian@alpha.org" } as any,
      membership: { id: "mem_lib_1", status: "ACTIVE" } as any,
      role: { roleKey: "LIBRARIAN" } as any,
      permissions: new Set(["library.read", "library.issue", "library.return"]),
      scope: "INSTITUTION_WIDE" as any,
    };

    it("INSTITUTION_WIDE: Librarian can access all library records within tenant", async () => {
      const allowed = await scopeEvaluator.evaluateScope(
        "INSTITUTION_WIDE",
        {
          permission: "library.read",
          targetMemberId: "mem_any_1",
        },
        mockContext,
        mockDb
      );
      expect(allowed).toBe(true);
    });

    it("SELF_ONLY: Student can access their own library member records", async () => {
      const studentContext = {
        tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
        user: { id: "usr_student_alice", email: "alice@alpha.org" } as any,
        membership: { id: "mem_stu_1", status: "ACTIVE" } as any,
        role: { roleKey: "STUDENT" } as any,
        permissions: new Set(["library.read"]),
        scope: "SELF_ONLY" as any,
      };

      mockDb.libraryMember.findUnique.mockResolvedValue({
        id: "lib_mem_alice",
        tenantId: tenantAlpha,
        userId: "usr_student_alice",
        studentProfileId: "stu_alice_prof",
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        {
          permission: "library.read",
          targetMemberId: "lib_mem_alice",
        },
        studentContext,
        mockDb
      );
      expect(allowed).toBe(true);
    });

    it("SELF_ONLY: Student is rejected when attempting to access another student's library records", async () => {
      const studentContext = {
        tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
        user: { id: "usr_student_alice", email: "alice@alpha.org" } as any,
        membership: { id: "mem_stu_1", status: "ACTIVE" } as any,
        role: { roleKey: "STUDENT" } as any,
        permissions: new Set(["library.read"]),
        scope: "SELF_ONLY" as any,
      };

      mockDb.libraryMember.findUnique.mockResolvedValue({
        id: "lib_mem_bob",
        tenantId: tenantAlpha,
        userId: "usr_student_bob",
        studentProfileId: "stu_bob_prof",
        studentProfile: { userId: "usr_student_bob" },
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        {
          permission: "library.read",
          targetMemberId: "lib_mem_bob",
        },
        studentContext,
        mockDb
      );
      expect(allowed).toBe(false);
    });

    it("LINKED_CHILDREN: Parent can access linked child's library records", async () => {
      const parentContext = {
        tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
        user: { id: "usr_parent_carol", email: "carol@example.com" } as any,
        membership: { id: "mem_par_1", status: "ACTIVE" } as any,
        role: { roleKey: "PARENT" } as any,
        permissions: new Set(["library.read"]),
        scope: "LINKED_CHILDREN" as any,
      };

      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "parent_prof_1",
        userId: "usr_parent_carol",
        tenantId: tenantAlpha,
      });

      mockDb.libraryMember.findUnique.mockResolvedValue({
        id: "lib_mem_alice",
        tenantId: tenantAlpha,
        studentProfileId: "stu_alice_prof",
      });

      mockDb.studentParentBinding.findFirst.mockResolvedValue({
        id: "bind_1",
        tenantId: tenantAlpha,
        parentId: "parent_prof_1",
        studentId: "stu_alice_prof",
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        {
          permission: "library.read",
          targetMemberId: "lib_mem_alice",
        },
        parentContext,
        mockDb
      );
      expect(allowed).toBe(true);
    });

    it("LINKED_CHILDREN: Parent is rejected when attempting to access unrelated student's library records", async () => {
      const parentContext = {
        tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
        user: { id: "usr_parent_carol", email: "carol@example.com" } as any,
        membership: { id: "mem_par_1", status: "ACTIVE" } as any,
        role: { roleKey: "PARENT" } as any,
        permissions: new Set(["library.read"]),
        scope: "LINKED_CHILDREN" as any,
      };

      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "parent_prof_1",
        userId: "usr_parent_carol",
        tenantId: tenantAlpha,
      });

      mockDb.libraryMember.findUnique.mockResolvedValue({
        id: "lib_mem_stranger",
        tenantId: tenantAlpha,
        studentProfileId: "stu_stranger_prof",
      });

      mockDb.studentParentBinding.findFirst.mockResolvedValue(null);

      const allowed = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        {
          permission: "library.read",
          targetMemberId: "lib_mem_stranger",
        },
        parentContext,
        mockDb
      );
      expect(allowed).toBe(false);
    });
  });
});
