import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssetService } from "@/lib/services/asset-service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("Fixed Asset Service Unit & Lifecycle Invariants", () => {
  let assetService: AssetService;
  let mockDb: any;
  let mockTx: any;

  const tenantAlpha = "tnt_alpha_school";

  beforeEach(() => {
    assetService = new AssetService();

    mockTx = {
      assetCategory: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "acat_1", ...data })),
      },
      asset: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "ast_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "ast_1", ...data })),
      },
      assetAssignment: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "asgn_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "asgn_1", ...data })),
      },
      assetReturn: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "ret_1", ...data })),
      },
      assetTransfer: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "trf_1", ...data })),
      },
      assetMaintenance: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "mnt_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "mnt_1", ...data })),
      },
      assetDisposal: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "dsp_1", ...data })),
      },
      assetDepreciation: {
        upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: "dep_1", ...create })),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_1" }),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "obx_1" }),
      },
    };

    mockDb = {
      $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      assetCategory: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      asset: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      assetAssignment: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      assetMaintenance: {
        findFirst: vi.fn(),
      },
    };
  });

  describe("Asset Register & Category Management", () => {
    it("should successfully register an asset with tag uniqueness", async () => {
      mockDb.assetCategory.findFirst.mockResolvedValue({
        id: "cat_it",
        tenantId: tenantAlpha,
        usefulLifeMonths: 36,
        residualValuePercent: new Decimal(10),
      });
      mockDb.asset.findFirst.mockResolvedValue(null);

      const asset = await assetService.createAsset(
        {
          tenantId: tenantAlpha,
          assetTag: "AST-LAP-001",
          serialNumber: "SN12345678",
          name: "Dell Latitude 5420 Laptop",
          categoryId: "cat_it",
          acquisitionCost: 60000,
          location: "IT Room 101",
        },
        mockDb
      );

      expect(asset.assetTag).toBe("AST-LAP-001");
      expect(mockTx.asset.create).toHaveBeenCalled();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionCategory: "ASSET",
            action: "ASSET_REGISTERED",
          }),
        })
      );
      expect(mockTx.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "inventory.asset.created",
          }),
        })
      );
    });

    it("should reject duplicate asset tag within the same tenant", async () => {
      mockDb.asset.findFirst.mockResolvedValue({ id: "ast_exist", assetTag: "AST-LAP-001" });

      await expect(
        assetService.createAsset(
          {
            tenantId: tenantAlpha,
            assetTag: "AST-LAP-001",
            name: "Duplicate Laptop",
            categoryId: "cat_it",
            acquisitionCost: 60000,
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Asset Assignment Invariant (Single Active Custodian)", () => {
    it("should assign asset and change asset status to ASSIGNED", async () => {
      mockDb.asset.findFirst.mockResolvedValue({
        id: "ast_1",
        tenantId: tenantAlpha,
        assetTag: "AST-PROJ-01",
        status: "ACTIVE",
        condition: "GOOD",
      });
      mockDb.assetAssignment.findFirst.mockResolvedValue(null);

      const assignment = await assetService.assignAsset(
        {
          tenantId: tenantAlpha,
          assetId: "ast_1",
          assignedToType: "STAFF",
          assignedToId: "staff_physics_teacher",
        },
        mockDb
      );

      expect(assignment).toBeDefined();
      expect(mockTx.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ast_1" },
          data: { status: "ASSIGNED" },
        })
      );
      expect(mockTx.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "inventory.asset.assigned",
          }),
        })
      );
    });

    it("should strictly reject assignment if asset already has an active assignment", async () => {
      mockDb.asset.findFirst.mockResolvedValue({
        id: "ast_1",
        tenantId: tenantAlpha,
        assetTag: "AST-PROJ-01",
        status: "ASSIGNED",
      });
      mockDb.assetAssignment.findFirst.mockResolvedValue({
        id: "asgn_active",
        status: "ACTIVE",
        assignedToType: "STAFF",
        assignedToId: "staff_teacher_a",
      });

      await expect(
        assetService.assignAsset(
          {
            tenantId: tenantAlpha,
            assetId: "ast_1",
            assignedToType: "STAFF",
            assignedToId: "staff_teacher_b",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Asset Return Workflow", () => {
    it("should process return, update assignment to RETURNED, and restore asset status to ACTIVE", async () => {
      mockDb.assetAssignment.findFirst.mockResolvedValue({
        id: "asgn_1",
        assetId: "ast_1",
        tenantId: tenantAlpha,
        status: "ACTIVE",
        asset: { id: "ast_1", assetTag: "AST-MIC-01" },
      });

      const ret = await assetService.returnAsset(
        {
          tenantId: tenantAlpha,
          assignmentId: "asgn_1",
          condition: "GOOD",
          returnedByUserId: "usr_lab_tech",
        },
        mockDb
      );

      expect(ret).toBeDefined();
      expect(mockTx.assetAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "asgn_1" },
          data: expect.objectContaining({
            status: "RETURNED",
            conditionOnReturn: "GOOD",
          }),
        })
      );
      expect(mockTx.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ast_1" },
          data: expect.objectContaining({
            status: "ACTIVE",
            condition: "GOOD",
          }),
        })
      );
    });
  });

  describe("Asset Disposal Invariant", () => {
    it("should dispose asset, set bookValue to 0, and record disposal history without physical deletion", async () => {
      mockDb.asset.findFirst.mockResolvedValue({
        id: "ast_broken",
        tenantId: tenantAlpha,
        assetTag: "AST-DESK-99",
        status: "ACTIVE",
      });

      const disposal = await assetService.disposeAsset(
        {
          tenantId: tenantAlpha,
          assetId: "ast_broken",
          disposalType: "SCRAP",
          reason: "Broken beyond repair due to flood damage",
          proceedsAmount: 500,
          buyerName: "Local Scrap Dealer",
        },
        mockDb
      );

      expect(disposal).toBeDefined();
      expect(mockTx.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ast_broken" },
          data: {
            status: "DISPOSED",
            bookValue: new Decimal(0),
          },
        })
      );
      expect(mockTx.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "inventory.asset.disposed",
          }),
        })
      );
    });

    it("should reject re-disposing an already disposed asset", async () => {
      mockDb.asset.findFirst.mockResolvedValue({
        id: "ast_broken",
        tenantId: tenantAlpha,
        assetTag: "AST-DESK-99",
        status: "DISPOSED",
      });

      await expect(
        assetService.disposeAsset(
          {
            tenantId: tenantAlpha,
            assetId: "ast_broken",
            reason: "Attempt second disposal",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Depreciation Calculation (Straight-Line Method)", () => {
    it("should correctly compute monthly straight-line depreciation and reduce book value", async () => {
      // Cost: 60,000, Residual: 6,000, UsefulLife: 36 months => Depr = (60000 - 6000)/36 = 1500/month
      mockDb.asset.findFirst.mockResolvedValue({
        id: "ast_server",
        tenantId: tenantAlpha,
        assetTag: "AST-SRV-01",
        status: "ACTIVE",
        acquisitionCost: new Decimal(60000),
        residualValue: new Decimal(6000),
        bookValue: new Decimal(60000),
        usefulLifeMonths: 36,
      });

      const depr = await assetService.calculateDepreciation(
        tenantAlpha,
        "ast_server",
        "2026-2027",
        1,
        "usr_accountant",
        mockDb
      );

      expect(depr).toBeDefined();
      expect(mockTx.assetDepreciation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            depreciationAmount: new Decimal(1500),
            accumulatedDepreciation: new Decimal(1500),
            endingBookValue: new Decimal(58500),
          }),
        })
      );
      expect(mockTx.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ast_server" },
          data: { bookValue: new Decimal(58500) },
        })
      );
    });
  });
});
