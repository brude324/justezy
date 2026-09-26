import { describe, it, expect, vi, beforeEach } from "vitest";
import { TenantService } from "@/lib/services/tenant-service";
import { ConflictError, NotFoundError } from "@/lib/errors";

describe("Tenant Creation & Lifecycle Foundation (Step 4C)", () => {
  let tenantService: TenantService;
  let mockDb: any;
  let mockTx: any;

  beforeEach(() => {
    tenantService = new TenantService();
    mockTx = {
      tenant: { create: vi.fn() },
      tenantPolicy: { create: vi.fn() },
      tenantBranding: { create: vi.fn() },
      role: { findFirst: vi.fn(), create: vi.fn() },
      tenantMembership: { create: vi.fn() },
      module: { upsert: vi.fn() },
      tenantModuleEntitlement: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };

    mockDb = {
      tenant: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockTx)),
    };
  });

  it("should atomically create Tenant, Policy, Branding, Owner Membership, and Entitlements", async () => {
    mockDb.tenant.findUnique.mockResolvedValue(null); // Slug is available
    mockDb.user.findUnique.mockResolvedValue({ id: "usr_owner_1", email: "owner@school.edu" });

    mockTx.tenant.create.mockResolvedValue({
      id: "tnt_dps",
      slug: "dps-delhi",
      name: "Delhi Public School",
      status: "ACTIVE",
      planTier: "ACADEMIC_PRO",
    });

    mockTx.role.findFirst.mockResolvedValue({ id: "rol_owner", roleKey: "INSTITUTION_OWNER" });
    mockTx.tenantMembership.create.mockResolvedValue({
      id: "mem_1",
      tenantId: "tnt_dps",
      userId: "usr_owner_1",
      roleId: "rol_owner",
      status: "ACTIVE",
    });

    const result = await tenantService.createTenant(
      {
        slug: "DPS-Delhi", // Should normalize to lowercase
        name: "Delhi Public School",
        ownerUserId: "usr_owner_1",
        planTier: "ACADEMIC_PRO",
      },
      mockDb
    );

    // Assert normalized slug
    expect(mockDb.tenant.findUnique).toHaveBeenCalledWith({ where: { slug: "dps-delhi" } });

    // Assert atomic creation steps
    expect(mockTx.tenant.create).toHaveBeenCalled();
    expect(mockTx.tenantPolicy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: "tnt_dps", autoSmsOnAbsence: true }),
    });
    expect(mockTx.tenantBranding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: "tnt_dps", primaryColorHex: "#0284c7" }),
    });
    expect(mockTx.tenantMembership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tnt_dps",
        userId: "usr_owner_1",
        status: "ACTIVE",
      }),
    });
    expect(mockTx.tenantModuleEntitlement.create).toHaveBeenCalledTimes(3); // Core modules
    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tnt_dps",
        action: "TENANT_PROVISIONED",
      }),
    });

    expect(result.tenant.id).toBe("tnt_dps");
    expect(result.membership.roleId).toBe("rol_owner");
  });

  it("should reject tenant creation with duplicate slug (ConflictError)", async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: "existing_tnt", slug: "greenwood" });

    await expect(
      tenantService.createTenant(
        { slug: "greenwood", name: "Greenwood", ownerUserId: "usr_1" },
        mockDb
      )
    ).rejects.toThrow(ConflictError);
  });

  it("should reject tenant creation if owner user does not exist (NotFoundError)", async () => {
    mockDb.tenant.findUnique.mockResolvedValue(null);
    mockDb.user.findUnique.mockResolvedValue(null); // Owner missing

    await expect(
      tenantService.createTenant(
        { slug: "new-school", name: "New School", ownerUserId: "usr_nonexistent" },
        mockDb
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("should update tenant status across lifecycle states", async () => {
    mockDb.tenant.update.mockResolvedValue({
      id: "tnt_1",
      status: "SUSPENDED",
    });

    const updated = await tenantService.updateTenantStatus("tnt_1", "SUSPENDED", mockDb);

    expect(mockDb.tenant.update).toHaveBeenCalledWith({
      where: { id: "tnt_1" },
      data: { status: "SUSPENDED" },
    });
    expect(updated.status).toBe("SUSPENDED");
  });
});
