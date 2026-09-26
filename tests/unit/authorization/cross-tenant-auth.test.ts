import { describe, it, expect, vi, beforeEach } from "vitest";
import { PolicyEngine } from "@/lib/authorization/policy-engine";
import { TenantContextData } from "@/lib/tenant/tenant-context";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";

describe("Cross-Tenant Authorization Isolation (Step 4D)", () => {
  let engine: PolicyEngine;
  let scopeEvaluator: ScopeEvaluator;
  let mockDb: any;

  const tenantAlpha = "tnt_alpha_school";
  const tenantBeta = "tnt_beta_academy";

  // Alice is an Institution Admin in Tenant Alpha
  const aliceAdminAlpha: TenantContextData = {
    tenant: { id: tenantAlpha, slug: "alpha", name: "Alpha School", status: "ACTIVE", planTier: "ENTERPRISE" },
    user: { id: "usr_alice", clerkId: "c_alice", email: "alice@alpha.edu", firstName: "Alice", lastName: "Admin", displayName: "Alice Admin" },
    membership: { id: "mem_alice_alpha", tenantId: tenantAlpha, userId: "usr_alice", roleId: "rol_admin_alpha", status: "ACTIVE" },
  };

  // Bob is a Teacher in Tenant Alpha
  const bobTeacherAlpha: TenantContextData = {
    tenant: { id: tenantAlpha, slug: "alpha", name: "Alpha School", status: "ACTIVE", planTier: "ENTERPRISE" },
    user: { id: "usr_bob", clerkId: "c_bob", email: "bob@alpha.edu", firstName: "Bob", lastName: "Teacher", displayName: "Bob Teacher" },
    membership: { id: "mem_bob_alpha", tenantId: tenantAlpha, userId: "usr_bob", roleId: "rol_teacher_alpha", status: "ACTIVE" },
  };

  // Charlie is a Parent in Tenant Alpha
  const charlieParentAlpha: TenantContextData = {
    tenant: { id: tenantAlpha, slug: "alpha", name: "Alpha School", status: "ACTIVE", planTier: "ENTERPRISE" },
    user: { id: "usr_charlie", clerkId: "c_charlie", email: "charlie@parent.com", firstName: "Charlie", lastName: "Parent", displayName: "Charlie Parent" },
    membership: { id: "mem_charlie_alpha", tenantId: tenantAlpha, userId: "usr_charlie", roleId: "rol_parent_alpha", status: "ACTIVE" },
  };

  beforeEach(() => {
    engine = new PolicyEngine();
    scopeEvaluator = new ScopeEvaluator();
    mockDb = {
      tenantModuleEntitlement: { findUnique: vi.fn() },
      rolePermission: { findFirst: vi.fn() },
      staffProfile: { findFirst: vi.fn() },
      class: { findFirst: vi.fn() },
      classSubject: { findFirst: vi.fn() },
      parentProfile: { findFirst: vi.fn() },
      studentParentBinding: { findFirst: vi.fn() },
    };
  });

  it("Tenant A admin cannot access or perform admin operations on Tenant B resources", async () => {
    // When executing in Tenant Beta context with Alice's identity
    const aliceInTenantBeta: TenantContextData = {
      ...aliceAdminAlpha,
      tenant: { id: tenantBeta, slug: "beta", name: "Beta Academy", status: "ACTIVE", planTier: "STARTER" },
      membership: {
        id: "mem_alice_beta",
        tenantId: tenantBeta,
        userId: "usr_alice",
        roleId: "none",
        status: "SUSPENDED", // Alice has no active membership in Tenant Beta!
      },
    };

    const decision = await engine.evaluate(
      {
        permission: "tenant.manage",
        context: aliceInTenantBeta,
      },
      mockDb
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("SUSPENDED");
  });

  it("Tenant A teacher cannot access class records belonging to Tenant B", async () => {
    // Bob's staff profile only exists in Tenant Alpha
    mockDb.staffProfile.findFirst.mockResolvedValue(null); // No staff profile in Tenant Beta
    mockDb.class.findFirst.mockResolvedValue(null);
    mockDb.classSubject.findFirst.mockResolvedValue(null);

    const allowed = await scopeEvaluator.evaluateScope(
      "ASSIGNED_ONLY",
      {
        permission: "class.read",
        targetClassId: "cls_beta_grade10",
      },
      bobTeacherAlpha,
      mockDb
    );

    expect(allowed).toBe(false);
  });

  it("Tenant A parent cannot access student records belonging to Tenant B", async () => {
    mockDb.parentProfile.findFirst.mockResolvedValue({
      id: "prt_charlie",
      userId: "usr_charlie",
      tenantId: tenantAlpha,
    });

    // Student belongs to Tenant Beta, so no binding exists in Tenant Alpha
    mockDb.studentParentBinding.findFirst.mockResolvedValue(null);

    const allowed = await scopeEvaluator.evaluateScope(
      "LINKED_CHILDREN",
      {
        permission: "attendance.read",
        targetStudentId: "stu_beta_student",
      },
      charlieParentAlpha,
      mockDb
    );

    expect(allowed).toBe(false);
  });

  it("matching role names across different institutions cannot bypass tenant boundaries", async () => {
    // An admin in School Alpha cannot query School Beta's RolePermission table
    mockDb.rolePermission.findFirst.mockResolvedValue(null);

    const decision = await engine.evaluate(
      {
        permission: "academic.year.manage",
        context: {
          ...aliceAdminAlpha,
          tenant: { id: tenantBeta, slug: "beta", name: "Beta", status: "ACTIVE", planTier: "STARTER" },
          membership: { ...aliceAdminAlpha.membership, tenantId: tenantBeta },
        },
      },
      mockDb
    );

    expect(decision.allowed).toBe(false);
  });
});
