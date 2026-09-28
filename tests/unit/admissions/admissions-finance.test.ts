import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdmissionsService } from "@/lib/services/admissions-service";
import { SYSTEM_PERMISSIONS, SYSTEM_ROLES } from "@/lib/seeds/system-seed";
import { NotFoundError } from "@/lib/errors";

describe("Admissions & Wave 1 Finance Integration Invariants", () => {
  let admissionsService: AdmissionsService;
  let mockDb: any;
  const tenantId = "tnt_dps_delhi";

  beforeEach(() => {
    admissionsService = new AdmissionsService();
    mockDb = {
      $transaction: vi.fn(async (cb) => cb(mockDb)),
      admissionApplication: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      feeInvoice: {
        findFirst: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_mock" }),
      },
    };
  });

  describe("Separation of Admissions & Financial Authorization", () => {
    it("admissions role (ADMISSIONS_OFFICER) must not possess financial mutation permissions (finance.post, fees.refund)", () => {
      const admissionsOfficerRole = SYSTEM_ROLES.find(
        (r) => r.roleKey === "ADMISSIONS_OFFICER"
      );
      expect(admissionsOfficerRole).toBeDefined();

      const perms = admissionsOfficerRole!.permissions;
      expect(perms).toContain("admissions.admit");
      expect(perms).toContain("admissions.offer");

      // Non-negotiable invariant: Admissions permissions MUST NOT imply financial permissions
      expect(perms).not.toContain("finance.post");
      expect(perms).not.toContain("fees.refund");
      expect(perms).not.toContain("finance.manage");
    });

    it("admissions module must reuse existing Wave 1 financial permissions rather than inventing duplicates", () => {
      const financePerms = SYSTEM_PERMISSIONS.filter(
        (p) => p.moduleKey === "fees_module" || p.moduleKey === "finance_module"
      );
      const admissionPerms = SYSTEM_PERMISSIONS.filter(
        (p) => p.moduleKey === "admissions_module"
      );

      // Verify no duplicate financial keys inside admissions
      for (const p of admissionPerms) {
        expect(p.permissionKey.startsWith("fees.")).toBe(false);
        expect(p.permissionKey.startsWith("finance.")).toBe(false);
      }
    });
  });

  describe("Application Fee Invoicing & Financial Reference Binding", () => {
    it("should safely attach Wave 1 FeeInvoice to an admission application and record audit log", async () => {
      mockDb.admissionApplication.findFirst.mockResolvedValue({
        id: "appl_101",
        tenantId,
        status: "SUBMITTED",
      });

      mockDb.feeInvoice.findFirst.mockResolvedValue({
        id: "inv_fee_101",
        tenantId,
        invoiceNumber: "INV-2026-00001",
        balanceAmount: 5000,
      });

      mockDb.admissionApplication.update.mockResolvedValue({
        id: "appl_101",
        feeInvoiceId: "inv_fee_101",
      });

      const updated = await admissionsService.attachFeeInvoice(
        tenantId,
        "appl_101",
        "inv_fee_101",
        "usr_officer",
        "officer@school.com",
        mockDb
      );

      expect(updated.feeInvoiceId).toBe("inv_fee_101");
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          action: "APPLICATION_FEE_INVOICE_ATTACHED",
          actionCategory: "ADMISSIONS",
        }),
      });
    });

    it("should reject attaching fee invoice from another tenant (cross-tenant safety)", async () => {
      mockDb.admissionApplication.findFirst.mockResolvedValue({
        id: "appl_101",
        tenantId: "tnt_alpha",
      });

      // Invoice belongs to tenant_beta, so findFirst with tenant_alpha returns null
      mockDb.feeInvoice.findFirst.mockResolvedValue(null);

      await expect(
        admissionsService.attachFeeInvoice(
          "tnt_alpha",
          "appl_101",
          "inv_other_tenant",
          "usr_officer",
          undefined,
          mockDb
        )
      ).rejects.toThrow(NotFoundError);
    });
  });
});
