import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryService } from "@/lib/services/inventory-service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("Inventory Service Unit & Domain Invariants", () => {
  let inventoryService: InventoryService;
  let mockDb: any;
  let mockTx: any;

  const tenantAlpha = "tnt_alpha_school";
  const tenantBeta = "tnt_beta_academy";

  beforeEach(() => {
    inventoryService = new InventoryService();

    mockTx = {
      inventoryCategory: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "cat_1", ...data })),
      },
      inventoryUnit: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "unit_1", ...data })),
      },
      inventoryVendor: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "ven_1", ...data })),
      },
      inventoryWarehouse: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "wh_1", ...data })),
      },
      inventoryLocation: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "loc_1", ...data })),
      },
      inventoryItem: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "item_1", ...data })),
        update: vi.fn(),
      },
      inventoryStock: {
        findFirst: vi.fn(),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "stk_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "stk_1", ...data })),
      },
      inventoryStockLot: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      inventoryStockMovement: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "mov_1", ...data })),
      },
      inventoryPurchaseRequest: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "pr_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "pr_1", ...data })),
      },
      inventoryPurchaseOrder: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "po_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "po_1", ...data })),
      },
      inventoryPurchaseOrderItem: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
      inventoryReceipt: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "rcv_1", ...data })),
      },
      inventoryReceiptItem: {
        create: vi.fn(),
      },
      inventoryIssue: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "iss_1", ...data })),
      },
      inventoryIssueItem: {
        create: vi.fn(),
      },
      inventoryTransfer: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "trf_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "trf_1", ...data })),
      },
      inventoryTransferItem: {
        create: vi.fn(),
      },
      inventoryAdjustment: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "adj_1", ...data })),
      },
      inventoryAdjustmentItem: {
        create: vi.fn(),
      },
      inventoryReservation: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "res_1", ...data })),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "res_1", ...data })),
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
      inventoryCategory: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventoryUnit: {
        findFirst: vi.fn().mockResolvedValue({ id: "unit_pcs", tenantId: tenantAlpha, code: "PCS", name: "Pieces" }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventoryVendor: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventoryWarehouse: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventoryLocation: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventoryItem: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      inventoryStock: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventoryPurchaseRequest: {
        findFirst: vi.fn(),
      },
      inventoryPurchaseOrder: {
        findFirst: vi.fn(),
      },
      inventoryTransfer: {
        findFirst: vi.fn(),
      },
      inventoryReservation: {
        findFirst: vi.fn(),
      },
      inventoryReorderRule: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
      },
      staffProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: "staff_1", tenantId: tenantAlpha }),
      },
    };
  });

  describe("Item Catalog Management", () => {
    it("should successfully create an inventory item with SKU uniqueness", async () => {
      mockDb.inventoryItem.findFirst.mockResolvedValue(null);

      const item = await inventoryService.createItem(
        {
          tenantId: tenantAlpha,
          sku: "ST-PEN-001",
          name: "Blue Ballpoint Pen",
          unitId: "unit_pcs",
          unitCost: 15.0,
          reorderThreshold: 50,
          reorderQuantity: 200,
        },
        mockDb
      );

      expect(item.sku).toBe("ST-PEN-001");
      expect(mockTx.inventoryItem.create).toHaveBeenCalled();
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionCategory: "INVENTORY",
            action: "INVENTORY_ITEM_CREATED",
          }),
        })
      );
      expect(mockTx.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "inventory.item.created",
          }),
        })
      );
    });

    it("should reject duplicate SKU within the same tenant", async () => {
      mockDb.inventoryItem.findFirst.mockResolvedValue({ id: "item_exist", sku: "ST-PEN-001" });

      await expect(
        inventoryService.createItem(
          {
            tenantId: tenantAlpha,
            sku: "ST-PEN-001",
            name: "Duplicate Pen",
            unitId: "unit_pcs",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Stock Receiving (Receipts) Invariant", () => {
    it("should receive stock, update stock balance, and create movement history", async () => {
      mockDb.inventoryWarehouse.findFirst.mockResolvedValue({ id: "wh_main", tenantId: tenantAlpha });
      mockDb.inventoryVendor.findFirst.mockResolvedValue({ id: "ven_1", tenantId: tenantAlpha });

      mockTx.inventoryStock.findFirst.mockResolvedValue({
        id: "stk_1",
        onHand: new Decimal(20),
        reserved: new Decimal(5),
        available: new Decimal(15),
        unitCost: new Decimal(10),
      });

      const receipt = await inventoryService.receiveStock(
        {
          tenantId: tenantAlpha,
          warehouseId: "wh_main",
          vendorId: "ven_1",
          receivedByUserId: "usr_keeper",
          items: [
            {
              itemId: "item_pen",
              quantityReceived: 30,
              unitCost: 12,
            },
          ],
        },
        mockDb
      );

      expect(receipt).toBeDefined();
      expect(mockTx.inventoryReceipt.create).toHaveBeenCalled();
      // OnHand: 20 + 30 = 50, Available: 50 - 5 = 45
      expect(mockTx.inventoryStock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            onHand: new Decimal(50),
            available: new Decimal(45),
          }),
        })
      );
      expect(mockTx.inventoryStockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            movementType: "RECEIPT",
            quantity: new Decimal(30),
          }),
        })
      );
    });
  });

  describe("Stock Issue Invariant (available = onHand - reserved >= requested)", () => {
    it("should successfully issue stock when available quantity is sufficient", async () => {
      mockDb.inventoryWarehouse.findFirst.mockResolvedValue({ id: "wh_main", tenantId: tenantAlpha });

      // Available: 50 - 10 = 40 >= 25
      mockTx.inventoryStock.findFirst.mockResolvedValue({
        id: "stk_1",
        onHand: new Decimal(50),
        reserved: new Decimal(10),
        available: new Decimal(40),
        unitCost: new Decimal(15),
      });

      const issue = await inventoryService.issueStock(
        {
          tenantId: tenantAlpha,
          warehouseId: "wh_main",
          issuedToType: "DEPARTMENT",
          issuedToId: "dept_science",
          issuedByUserId: "usr_keeper",
          items: [{ itemId: "item_pen", quantity: 25 }],
        },
        mockDb
      );

      expect(issue).toBeDefined();
      // OnHand: 50 - 25 = 25, Available: 25 - 10 = 15
      expect(mockTx.inventoryStock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            onHand: new Decimal(25),
            available: new Decimal(15),
          }),
        })
      );
    });

    it("should strictly reject stock issue if requested quantity exceeds available stock", async () => {
      mockDb.inventoryWarehouse.findFirst.mockResolvedValue({ id: "wh_main", tenantId: tenantAlpha });

      // Available: 50 - 45 = 5 < 10 requested
      mockTx.inventoryStock.findFirst.mockResolvedValue({
        id: "stk_1",
        onHand: new Decimal(50),
        reserved: new Decimal(45),
        available: new Decimal(5),
      });

      await expect(
        inventoryService.issueStock(
          {
            tenantId: tenantAlpha,
            warehouseId: "wh_main",
            issuedToType: "CLASS",
            issuedToId: "cls_10a",
            issuedByUserId: "usr_keeper",
            items: [{ itemId: "item_pen", quantity: 10 }],
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Stock Transfer Invariants", () => {
    it("should reject transfer between the exact same warehouse", async () => {
      await expect(
        inventoryService.requestTransfer(
          {
            tenantId: tenantAlpha,
            sourceWarehouseId: "wh_main",
            destinationWarehouseId: "wh_main",
            requestedByUserId: "usr_keeper",
            items: [{ itemId: "item_1", quantity: 10 }],
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should dispatch transfer and reduce source warehouse stock atomically", async () => {
      mockDb.inventoryWarehouse.findFirst
        .mockResolvedValueOnce({ id: "wh_main", tenantId: tenantAlpha, name: "Main Store" })
        .mockResolvedValueOnce({ id: "wh_lab", tenantId: tenantAlpha, name: "Science Lab Store" });

      mockDb.inventoryStock.findFirst.mockResolvedValue({
        id: "stk_main",
        onHand: new Decimal(100),
        reserved: new Decimal(0),
        available: new Decimal(100),
      });

      mockTx.inventoryStock.findFirst.mockResolvedValue({
        id: "stk_main",
        onHand: new Decimal(100),
        reserved: new Decimal(0),
        available: new Decimal(100),
      });

      const transfer = await inventoryService.requestTransfer(
        {
          tenantId: tenantAlpha,
          sourceWarehouseId: "wh_main",
          destinationWarehouseId: "wh_lab",
          requestedByUserId: "usr_1",
          items: [{ itemId: "item_flask", quantity: 20 }],
        },
        mockDb
      );

      expect(transfer).toBeDefined();
      expect(mockTx.inventoryStock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            onHand: new Decimal(80),
            available: new Decimal(80),
          }),
        })
      );
    });
  });

  describe("Stock Reservations Invariant (reserved <= onHand, available = onHand - reserved)", () => {
    it("should create reservation and increase reserved quantity while decreasing available stock", async () => {
      mockTx.inventoryStock.findFirst.mockResolvedValue({
        id: "stk_1",
        onHand: new Decimal(100),
        reserved: new Decimal(20),
        available: new Decimal(80),
      });

      const res = await inventoryService.reserveStock(
        {
          tenantId: tenantAlpha,
          warehouseId: "wh_main",
          itemId: "item_sheet",
          quantity: 30,
          reservedForType: "EXAM_PRINTING",
          reservedByUserId: "usr_teacher",
        },
        mockDb
      );

      expect(res).toBeDefined();
      // Reserved: 20 + 30 = 50, Available: 100 - 50 = 50
      expect(mockTx.inventoryStock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reserved: new Decimal(50),
            available: new Decimal(50),
          }),
        })
      );
    });

    it("should reject reservation if requested quantity exceeds available stock", async () => {
      mockTx.inventoryStock.findFirst.mockResolvedValue({
        id: "stk_1",
        onHand: new Decimal(100),
        reserved: new Decimal(95),
        available: new Decimal(5),
      });

      await expect(
        inventoryService.reserveStock(
          {
            tenantId: tenantAlpha,
            warehouseId: "wh_main",
            itemId: "item_sheet",
            quantity: 10,
            reservedForType: "EXAM",
            reservedByUserId: "usr_teacher",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });
});
