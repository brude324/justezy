import { describe, it, expect, vi, beforeEach } from "vitest";
import { MembershipService } from "@/lib/services/membership-service";
import { NotFoundError, TenantSuspendedError } from "@/lib/errors";

describe("Tenant Membership Binding & Isolation (Step 4C)", () => {
  let membershipService: MembershipService;
  let mockDb: any;

  beforeEach(() => {
    membershipService = new MembershipService();
    mockDb = {
      tenant: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
      tenantMembership: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };
  });

  it("should bind user to tenant with assigned role", async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: "tnt_active", status: "ACTIVE", name: "Active School" });
    mockDb.user.findUnique.mockResolvedValue({ id: "usr_teacher", email: "teacher@school.edu" });

    mockDb.tenantMembership.upsert.mockResolvedValue({
      id: "mem_tch_1",
      tenantId: "tnt_active",
      userId: "usr_teacher",
      roleId: "rol_teacher",
      status: "ACTIVE",
    });

    const membership = await membershipService.addMembership(
      "tnt_active",
      "usr_teacher",
      "rol_teacher",
      mockDb
    );

    expect(mockDb.tenantMembership.upsert).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: "tnt_active", userId: "usr_teacher" } },
      create: {
        tenantId: "tnt_active",
        userId: "usr_teacher",
        roleId: "rol_teacher",
        status: "ACTIVE",
      },
      update: {
        roleId: "rol_teacher",
        status: "ACTIVE",
      },
      include: {
        role: true,
        tenant: true,
      },
    });

    expect(membership.id).toBe("mem_tch_1");
  });

  it("should reject adding membership to a SUSPENDED tenant (TenantSuspendedError)", async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      id: "tnt_suspended",
      status: "SUSPENDED",
      name: "Delinquent Academy",
    });

    await expect(
      membershipService.addMembership("tnt_suspended", "usr_1", "rol_1", mockDb)
    ).rejects.toThrow(TenantSuspendedError);
  });

  it("should reject adding membership if user does not exist (NotFoundError)", async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: "tnt_1", status: "ACTIVE" });
    mockDb.user.findUnique.mockResolvedValue(null);

    await expect(
      membershipService.addMembership("tnt_1", "usr_missing", "rol_1", mockDb)
    ).rejects.toThrow(NotFoundError);
  });

  it("should allow a single user to hold memberships in multiple distinct tenants", async () => {
    mockDb.tenantMembership.findMany.mockResolvedValue([
      { id: "mem_1", tenantId: "tnt_school_a", roleId: "rol_teacher", tenant: { name: "School A" } },
      { id: "mem_2", tenantId: "tnt_school_b", roleId: "rol_principal", tenant: { name: "School B" } },
    ]);

    const memberships = await membershipService.listUserMemberships("usr_multi_org", mockDb);

    expect(memberships).toHaveLength(2);
    expect(memberships[0].tenantId).toBe("tnt_school_a");
    expect(memberships[1].tenantId).toBe("tnt_school_b");
  });
});
