import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModuleGate } from "@/lib/authorization/module-gate";
import { ModuleDisabledError } from "@/lib/errors";

describe("Module Entitlement Gating (Step 4D)", () => {
  let gate: ModuleGate;
  let mockDb: any;
  const tenantId = "tnt_test_school";

  beforeEach(() => {
    gate = new ModuleGate();
    mockDb = {
      tenantModuleEntitlement: {
        findUnique: vi.fn(),
      },
    };
  });

  it("should universally permit core modules without database lookups", async () => {
    const core1 = await gate.isModuleEnabled(tenantId, "core_academics", mockDb);
    const core2 = await gate.isModuleEnabled(tenantId, "attendance_module", mockDb);
    const core3 = await gate.isModuleEnabled(tenantId, "communication_module", mockDb);

    expect(core1).toBe(true);
    expect(core2).toBe(true);
    expect(core3).toBe(true);
    expect(mockDb.tenantModuleEntitlement.findUnique).not.toHaveBeenCalled();
  });

  it("should permit optional module when TenantModuleEntitlement is enabled", async () => {
    mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
      tenantId,
      moduleKey: "exam_module",
      isEnabled: true,
      expiresAt: null,
    });

    const isEnabled = await gate.isModuleEnabled(tenantId, "exam_module", mockDb);

    expect(isEnabled).toBe(true);
    expect(mockDb.tenantModuleEntitlement.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_moduleKey: {
          tenantId,
          moduleKey: "exam_module",
        },
      },
    });
  });

  it("should block optional module when TenantModuleEntitlement has isEnabled = false", async () => {
    mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
      tenantId,
      moduleKey: "report_card_module",
      isEnabled: false,
    });

    const isEnabled = await gate.isModuleEnabled(tenantId, "report_card_module", mockDb);
    expect(isEnabled).toBe(false);

    await expect(
      gate.assertModuleEnabled(tenantId, "report_card_module", mockDb)
    ).rejects.toThrow(ModuleDisabledError);
  });

  it("should block optional module when trial entitlement has expired", async () => {
    mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
      tenantId,
      moduleKey: "timetable_module",
      isEnabled: true,
      expiresAt: new Date(Date.now() - 1000 * 60), // Expired 1 min ago
    });

    const isEnabled = await gate.isModuleEnabled(tenantId, "timetable_module", mockDb);
    expect(isEnabled).toBe(false);

    await expect(
      gate.assertModuleEnabled(tenantId, "timetable_module", mockDb)
    ).rejects.toThrow(ModuleDisabledError);
  });
});
