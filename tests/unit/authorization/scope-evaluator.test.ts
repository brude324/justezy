import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";
import { TenantContextData } from "@/lib/tenant/tenant-context";
import { ScopeAccessDeniedError } from "@/lib/errors";

describe("ScopeEvaluator Horizontal Access Scope Engine (Step 4D)", () => {
  let evaluator: ScopeEvaluator;
  let mockDb: any;

  const sampleContext: TenantContextData = {
    tenant: { id: "tnt_scope_school", slug: "scope-school", name: "Scope School", status: "ACTIVE", planTier: "STARTER" },
    user: { id: "usr_caller_123", clerkId: "clerk_123", email: "caller@school.edu", firstName: "Caller", lastName: "User", displayName: "Caller User" },
    membership: { id: "mem_123", tenantId: "tnt_scope_school", userId: "usr_caller_123", roleId: "rol_teacher", status: "ACTIVE" },
  };

  beforeEach(() => {
    evaluator = new ScopeEvaluator();
    mockDb = {
      studentProfile: { findUnique: vi.fn() },
      parentProfile: { findFirst: vi.fn() },
      studentParentBinding: { findFirst: vi.fn() },
      staffProfile: { findFirst: vi.fn() },
      class: { findFirst: vi.fn() },
      classSubject: { findFirst: vi.fn() },
    };
  });

  describe("INSTITUTION_WIDE Scope", () => {
    it("should universally permit access across the active tenant", async () => {
      const allowed = await evaluator.evaluateScope(
        "INSTITUTION_WIDE",
        { permission: "student.read" },
        sampleContext,
        mockDb
      );
      expect(allowed).toBe(true);
    });
  });

  describe("SELF_ONLY Scope", () => {
    it("should allow when resourceOwnerUserId equals caller userId", async () => {
      const allowed = await evaluator.evaluateScope(
        "SELF_ONLY",
        {
          permission: "user.update",
          resourceOwnerUserId: "usr_caller_123", // Matches caller!
        },
        sampleContext,
        mockDb
      );
      expect(allowed).toBe(true);
    });

    it("should reject when resourceOwnerUserId belongs to another user", async () => {
      const allowed = await evaluator.evaluateScope(
        "SELF_ONLY",
        {
          permission: "user.update",
          resourceOwnerUserId: "usr_victim_456", // Foreign user!
        },
        sampleContext,
        mockDb
      );
      expect(allowed).toBe(false);
    });

    it("should allow student accessing their own linked student profile", async () => {
      mockDb.studentProfile.findUnique.mockResolvedValue({
        id: "stu_caller",
        userId: "usr_caller_123",
        tenantId: "tnt_scope_school",
      });

      const allowed = await evaluator.evaluateScope(
        "SELF_ONLY",
        {
          permission: "student.read",
          targetStudentId: "stu_caller",
        },
        sampleContext,
        mockDb
      );

      expect(allowed).toBe(true);
    });
  });

  describe("LINKED_CHILDREN Scope", () => {
    it("should allow parent to access record of linked child via StudentParentBinding", async () => {
      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "prt_caller",
        userId: "usr_caller_123",
        tenantId: "tnt_scope_school",
      });

      mockDb.studentParentBinding.findFirst.mockResolvedValue({
        id: "spb_1",
        parentId: "prt_caller",
        studentId: "stu_my_kid",
        tenantId: "tnt_scope_school",
      });

      const allowed = await evaluator.evaluateScope(
        "LINKED_CHILDREN",
        {
          permission: "attendance.read",
          targetStudentId: "stu_my_kid",
        },
        sampleContext,
        mockDb
      );

      expect(allowed).toBe(true);
      expect(mockDb.studentParentBinding.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: "tnt_scope_school",
          parentId: "prt_caller",
          studentId: "stu_my_kid",
        },
      });
    });

    it("should reject parent attempting to access unrelated student record", async () => {
      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "prt_caller",
        userId: "usr_caller_123",
        tenantId: "tnt_scope_school",
      });

      // No binding exists between parent and this foreign kid!
      mockDb.studentParentBinding.findFirst.mockResolvedValue(null);

      const allowed = await evaluator.evaluateScope(
        "LINKED_CHILDREN",
        {
          permission: "attendance.read",
          targetStudentId: "stu_stranger_kid",
        },
        sampleContext,
        mockDb
      );

      expect(allowed).toBe(false);

      await expect(
        evaluator.assertScope(
          "LINKED_CHILDREN",
          {
            permission: "attendance.read",
            targetStudentId: "stu_stranger_kid",
          },
          sampleContext,
          mockDb
        )
      ).rejects.toThrow(ScopeAccessDeniedError);
    });
  });

  describe("ASSIGNED_ONLY Scope", () => {
    it("should allow class supervisor to access assigned class record", async () => {
      mockDb.staffProfile.findFirst.mockResolvedValue({
        id: "stf_teacher",
        userId: "usr_caller_123",
        tenantId: "tnt_scope_school",
      });

      mockDb.class.findFirst.mockResolvedValue({
        id: "cls_10A",
        supervisorId: "stf_teacher",
      });

      const allowed = await evaluator.evaluateScope(
        "ASSIGNED_ONLY",
        {
          permission: "class.read",
          targetClassId: "cls_10A",
        },
        sampleContext,
        mockDb
      );

      expect(allowed).toBe(true);
    });

    it("should allow subject teacher assigned to class to access class record", async () => {
      mockDb.staffProfile.findFirst.mockResolvedValue({
        id: "stf_teacher",
        userId: "usr_caller_123",
        tenantId: "tnt_scope_school",
      });

      mockDb.class.findFirst.mockResolvedValue(null); // Not supervisor
      mockDb.classSubject.findFirst.mockResolvedValue({
        id: "cs_math",
        classId: "cls_10B",
        teacherId: "stf_teacher",
      });

      const allowed = await evaluator.evaluateScope(
        "ASSIGNED_ONLY",
        {
          permission: "result.enter",
          targetClassId: "cls_10B",
        },
        sampleContext,
        mockDb
      );

      expect(allowed).toBe(true);
    });

    it("should reject teacher accessing an unassigned class", async () => {
      mockDb.staffProfile.findFirst.mockResolvedValue({
        id: "stf_teacher",
        userId: "usr_caller_123",
        tenantId: "tnt_scope_school",
      });

      mockDb.class.findFirst.mockResolvedValue(null);
      mockDb.classSubject.findFirst.mockResolvedValue(null);

      const allowed = await evaluator.evaluateScope(
        "ASSIGNED_ONLY",
        {
          permission: "class.read",
          targetClassId: "cls_other_grade",
        },
        sampleContext,
        mockDb
      );

      expect(allowed).toBe(false);
    });
  });
});
