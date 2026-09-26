import { describe, it, expect } from "vitest";
import {
  runWithTenantContext,
  getTenantContext,
  requireTenantContext,
  runWithPlatformContext,
  getPlatformContext,
  requirePlatformContext,
  TenantContextData,
  PlatformContextData,
} from "@/lib/tenant/tenant-context";
import { TenantContextMissingError, UnauthorizedError } from "@/lib/errors";

describe("Tenant & Platform Context Isolation (Step 4C)", () => {
  const sampleTenantContext1: TenantContextData = {
    tenant: {
      id: "tnt_alpha",
      slug: "alpha-school",
      name: "Alpha School",
      status: "ACTIVE",
      planTier: "STARTER",
    },
    user: {
      id: "usr_alice",
      clerkId: "clerk_alice",
      email: "alice@alpha.edu",
      firstName: "Alice",
      lastName: "Smith",
      displayName: "Alice Smith",
    },
    membership: {
      id: "mem_alice_alpha",
      tenantId: "tnt_alpha",
      userId: "usr_alice",
      roleId: "rol_teacher",
      status: "ACTIVE",
    },
  };

  const sampleTenantContext2: TenantContextData = {
    tenant: {
      id: "tnt_beta",
      slug: "beta-academy",
      name: "Beta Academy",
      status: "ACTIVE",
      planTier: "ENTERPRISE",
    },
    user: {
      id: "usr_bob",
      clerkId: "clerk_bob",
      email: "bob@beta.edu",
      firstName: "Bob",
      lastName: "Jones",
      displayName: "Bob Jones",
    },
    membership: {
      id: "mem_bob_beta",
      tenantId: "tnt_beta",
      userId: "usr_bob",
      roleId: "rol_principal",
      status: "ACTIVE",
    },
  };

  it("should throw TenantContextMissingError when requireTenantContext is called outside active scope", () => {
    expect(() => requireTenantContext()).toThrow(TenantContextMissingError);
    expect(getTenantContext()).toBeNull();
  });

  it("should return the active context when within runWithTenantContext", async () => {
    await runWithTenantContext(sampleTenantContext1, async () => {
      const active = requireTenantContext();
      expect(active.tenant.id).toBe("tnt_alpha");
      expect(active.user.id).toBe("usr_alice");
      expect(active.membership.roleId).toBe("rol_teacher");
    });

    // Outside the block, context is clean
    expect(getTenantContext()).toBeNull();
  });

  it("should maintain strict isolation across concurrent asynchronous execution paths", async () => {
    const taskAlpha = runWithTenantContext(sampleTenantContext1, async () => {
      // Simulate async database latency
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = requireTenantContext();
      expect(current.tenant.id).toBe("tnt_alpha");
      expect(current.user.id).toBe("usr_alice");
      return current.tenant.slug;
    });

    const taskBeta = runWithTenantContext(sampleTenantContext2, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      const current = requireTenantContext();
      expect(current.tenant.id).toBe("tnt_beta");
      expect(current.user.id).toBe("usr_bob");
      return current.tenant.slug;
    });

    const [slugAlpha, slugBeta] = await Promise.all([taskAlpha, taskBeta]);
    expect(slugAlpha).toBe("alpha-school");
    expect(slugBeta).toBe("beta-academy");
  });

  describe("Platform Context Separation", () => {
    const platformCtx: PlatformContextData = {
      user: {
        id: "usr_platform_admin",
        clerkId: "clerk_super",
        email: "superadmin@schoolyardsms.in",
      },
      platformRole: "SUPER_ADMIN",
      isSuperAdmin: true,
    };

    it("should throw UnauthorizedError when requirePlatformContext is called without platform scope", () => {
      expect(() => requirePlatformContext()).toThrow(UnauthorizedError);
      expect(getPlatformContext()).toBeNull();
    });

    it("should provide platform admin context within runWithPlatformContext", async () => {
      await runWithPlatformContext(platformCtx, async () => {
        const active = requirePlatformContext();
        expect(active.user.id).toBe("usr_platform_admin");
        expect(active.isSuperAdmin).toBe(true);

        // Platform context must NOT automatically establish a TenantContext
        expect(getTenantContext()).toBeNull();
      });
    });
  });
});
