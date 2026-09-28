import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "@/lib/errors";
import { outboxService } from "./outbox-service";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateInventoryCategoryInput {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateInventoryUnitInput {
  tenantId: string;
  name: string;
  code: string;
  symbol?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateInventoryVendorInput {
  tenantId: string;
  vendorCode: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateInventoryWarehouseInput {
  tenantId: string;
  code: string;
  name: string;
  managerStaffId?: string;
  address?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateInventoryLocationInput {
  tenantId: string;
  warehouseId: string;
  code: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateInventoryItemInput {
  tenantId: string;
  sku: string;
  internalCode?: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  unitId: string;
  reorderThreshold?: number | Decimal;
  reorderQuantity?: number | Decimal;
  minStock?: number | Decimal;
  maxStock?: number | Decimal;
  trackLot?: boolean;
  trackExpiry?: boolean;
  valuationMethod?: "FIFO" | "LIFO" | "WEIGHTED_AVERAGE";
  unitCost?: number | Decimal;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreatePurchaseRequestItemInput {
  itemId: string;
  quantity: number | Decimal;
  estimatedUnitCost?: number | Decimal;
}

export interface CreatePurchaseRequestInput {
  tenantId: string;
  requesterUserId: string;
  department?: string;
  justification?: string;
  items: CreatePurchaseRequestItemInput[];
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreatePurchaseOrderItemInput {
  itemId: string;
  orderedQuantity: number | Decimal;
  unitPrice: number | Decimal;
  taxPercent?: number | Decimal;
}

export interface CreatePurchaseOrderInput {
  tenantId: string;
  vendorId: string;
  expectedDeliveryDate?: Date;
  notes?: string;
  items: CreatePurchaseOrderItemInput[];
  actorUserId?: string;
  actorEmail?: string;
}

export interface ReceiveStockItemInput {
  itemId: string;
  purchaseOrderItemId?: string;
  quantityReceived: number | Decimal;
  unitCost: number | Decimal;
  lotNumber?: string;
  expiryDate?: Date;
  locationId?: string;
}

export interface ReceiveStockInput {
  tenantId: string;
  warehouseId: string;
  purchaseOrderId?: string;
  vendorId?: string;
  receivedByUserId: string;
  invoiceNumber?: string;
  notes?: string;
  items: ReceiveStockItemInput[];
  actorUserId?: string;
  actorEmail?: string;
}

export interface IssueStockItemInput {
  itemId: string;
  quantity: number | Decimal;
  locationId?: string;
}

export interface IssueStockInput {
  tenantId: string;
  warehouseId: string;
  issuedToType: string; // DEPARTMENT, CLASS, LABORATORY, OFFICE, STAFF, ROOM
  issuedToId?: string;
  issuedByUserId: string;
  reason?: string;
  items: IssueStockItemInput[];
  actorUserId?: string;
  actorEmail?: string;
}

export interface RequestTransferInput {
  tenantId: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  requestedByUserId: string;
  notes?: string;
  items: {
    itemId: string;
    quantity: number | Decimal;
  }[];
  actorUserId?: string;
  actorEmail?: string;
}

export interface AdjustStockItemInput {
  itemId: string;
  quantity: number | Decimal;
  direction: "INCREASE" | "DECREASE";
  unitCost?: number | Decimal;
  reason?: string;
  locationId?: string;
}

export interface AdjustStockInput {
  tenantId: string;
  warehouseId: string;
  adjustedByUserId: string;
  reason: string;
  items: AdjustStockItemInput[];
  actorUserId?: string;
  actorEmail?: string;
}

export interface ReserveStockInput {
  tenantId: string;
  warehouseId: string;
  itemId: string;
  quantity: number | Decimal;
  reservedForType: string;
  reservedForId?: string;
  reservedByUserId: string;
  expiryDate?: Date;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpsertReorderRuleInput {
  tenantId: string;
  warehouseId: string;
  itemId: string;
  reorderPoint: number | Decimal;
  reorderQuantity: number | Decimal;
  preferredVendorId?: string;
  leadTimeDays?: number;
  actorUserId?: string;
  actorEmail?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class InventoryService {
  // --------------------------------------------------------------------------
  // CATEGORIES & UNITS
  // --------------------------------------------------------------------------

  async createCategory(input: CreateInventoryCategoryInput, db = prismaTarget) {
    const existing = await db.inventoryCategory.findFirst({
      where: { tenantId: input.tenantId, code: input.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictError(`Category code '${input.code}' already exists in tenant`);
    }

    return db.$transaction(async (tx) => {
      const category = await tx.inventoryCategory.create({
        data: {
          tenantId: input.tenantId,
          name: input.name.trim(),
          code: input.code.trim().toUpperCase(),
          description: input.description,
          parentId: input.parentId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "INVENTORY",
          action: "INVENTORY_CATEGORY_CREATED",
          entityType: "InventoryCategory",
          entityId: category.id,
          diffJson: JSON.stringify({ name: category.name, code: category.code }),
        },
      });

      return category;
    });
  }

  async listCategories(tenantId: string, db = prismaTarget) {
    return db.inventoryCategory.findMany({
      where: { tenantId, active: true },
      include: { parent: true, children: true },
      orderBy: { name: "asc" },
    });
  }

  async createUnit(input: CreateInventoryUnitInput, db = prismaTarget) {
    const existing = await db.inventoryUnit.findFirst({
      where: { tenantId: input.tenantId, code: input.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictError(`Unit code '${input.code}' already exists in tenant`);
    }

    return db.$transaction(async (tx) => {
      const unit = await tx.inventoryUnit.create({
        data: {
          tenantId: input.tenantId,
          name: input.name.trim(),
          code: input.code.trim().toUpperCase(),
          symbol: input.symbol,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "INVENTORY",
          action: "INVENTORY_UNIT_CREATED",
          entityType: "InventoryUnit",
          entityId: unit.id,
          diffJson: JSON.stringify({ name: unit.name, code: unit.code }),
        },
      });

      return unit;
    });
  }

  async listUnits(tenantId: string, db = prismaTarget) {
    return db.inventoryUnit.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // VENDORS
  // --------------------------------------------------------------------------

  async createVendor(input: CreateInventoryVendorInput, db = prismaTarget) {
    const existing = await db.inventoryVendor.findFirst({
      where: { tenantId: input.tenantId, vendorCode: input.vendorCode.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictError(`Vendor code '${input.vendorCode}' already exists in tenant`);
    }

    return db.$transaction(async (tx) => {
      const vendor = await tx.inventoryVendor.create({
        data: {
          tenantId: input.tenantId,
          vendorCode: input.vendorCode.trim().toUpperCase(),
          name: input.name.trim(),
          contactName: input.contactName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          taxId: input.taxId,
          paymentTerms: input.paymentTerms,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "INVENTORY",
          action: "INVENTORY_VENDOR_CREATED",
          entityType: "InventoryVendor",
          entityId: vendor.id,
          diffJson: JSON.stringify({ name: vendor.name, code: vendor.vendorCode }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.vendor.created",
        aggregateType: "InventoryVendor",
        aggregateId: vendor.id,
        payload: { vendorId: vendor.id, code: vendor.vendorCode, name: vendor.name },
      });

      return vendor;
    });
  }

  async listVendors(tenantId: string, db = prismaTarget) {
    return db.inventoryVendor.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async getVendor(tenantId: string, id: string, db = prismaTarget) {
    const vendor = await db.inventoryVendor.findFirst({
      where: { id, tenantId },
    });
    if (!vendor) throw new NotFoundError("Vendor not found");
    return vendor;
  }

  // --------------------------------------------------------------------------
  // WAREHOUSES & LOCATIONS
  // --------------------------------------------------------------------------

  async createWarehouse(input: CreateInventoryWarehouseInput, db = prismaTarget) {
    const existing = await db.inventoryWarehouse.findFirst({
      where: { tenantId: input.tenantId, code: input.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictError(`Warehouse code '${input.code}' already exists in tenant`);
    }

    if (input.managerStaffId) {
      const staff = await db.staffProfile.findFirst({
        where: { id: input.managerStaffId, tenantId: input.tenantId },
      });
      if (!staff) throw new ValidationError("Assigned warehouse manager staff profile does not exist in tenant");
    }

    return db.$transaction(async (tx) => {
      const warehouse = await tx.inventoryWarehouse.create({
        data: {
          tenantId: input.tenantId,
          code: input.code.trim().toUpperCase(),
          name: input.name.trim(),
          managerStaffId: input.managerStaffId,
          address: input.address,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "INVENTORY",
          action: "INVENTORY_WAREHOUSE_CREATED",
          entityType: "InventoryWarehouse",
          entityId: warehouse.id,
          diffJson: JSON.stringify({ code: warehouse.code, name: warehouse.name }),
        },
      });

      return warehouse;
    });
  }

  async listWarehouses(tenantId: string, db = prismaTarget) {
    return db.inventoryWarehouse.findMany({
      where: { tenantId, active: true },
      include: {
        managerStaff: true,
        locations: true,
        _count: { select: { stocks: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async getWarehouse(tenantId: string, id: string, db = prismaTarget) {
    const warehouse = await db.inventoryWarehouse.findFirst({
      where: { id, tenantId },
      include: {
        managerStaff: true,
        locations: true,
        stocks: { include: { item: true, location: true } },
      },
    });
    if (!warehouse) throw new NotFoundError("Warehouse not found");
    return warehouse;
  }

  async createLocation(input: CreateInventoryLocationInput, db = prismaTarget) {
    const warehouse = await db.inventoryWarehouse.findFirst({
      where: { id: input.warehouseId, tenantId: input.tenantId },
    });
    if (!warehouse) throw new NotFoundError("Warehouse not found in tenant");

    const existing = await db.inventoryLocation.findFirst({
      where: { warehouseId: input.warehouseId, code: input.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictError(`Location code '${input.code}' already exists in warehouse`);
    }

    return db.$transaction(async (tx) => {
      const location = await tx.inventoryLocation.create({
        data: {
          tenantId: input.tenantId,
          warehouseId: input.warehouseId,
          code: input.code.trim().toUpperCase(),
          aisle: input.aisle,
          rack: input.rack,
          shelf: input.shelf,
          bin: input.bin,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "INVENTORY",
          action: "INVENTORY_LOCATION_CREATED",
          entityType: "InventoryLocation",
          entityId: location.id,
          diffJson: JSON.stringify({ code: location.code, warehouseId: location.warehouseId }),
        },
      });

      return location;
    });
  }

  async listLocations(tenantId: string, warehouseId?: string, db = prismaTarget) {
    return db.inventoryLocation.findMany({
      where: {
        tenantId,
        active: true,
        ...(warehouseId ? { warehouseId } : {}),
      },
      orderBy: { code: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // ITEM CATALOG
  // --------------------------------------------------------------------------

  async createItem(input: CreateInventoryItemInput, db = prismaTarget) {
    const existingSku = await db.inventoryItem.findFirst({
      where: { tenantId: input.tenantId, sku: input.sku.trim().toUpperCase() },
    });
    if (existingSku) {
      throw new ConflictError(`SKU '${input.sku}' already exists in tenant`);
    }

    if (input.barcode) {
      const existingBarcode = await db.inventoryItem.findFirst({
        where: { tenantId: input.tenantId, barcode: input.barcode.trim() },
      });
      if (existingBarcode) {
        throw new ConflictError(`Barcode '${input.barcode}' already exists in tenant`);
      }
    }

    const unit = await db.inventoryUnit.findFirst({
      where: { id: input.unitId, tenantId: input.tenantId },
    });
    if (!unit) throw new ValidationError("Unit of measure does not exist in tenant");

    if (input.categoryId) {
      const category = await db.inventoryCategory.findFirst({
        where: { id: input.categoryId, tenantId: input.tenantId },
      });
      if (!category) throw new ValidationError("Category does not exist in tenant");
    }

    return db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          tenantId: input.tenantId,
          sku: input.sku.trim().toUpperCase(),
          internalCode: input.internalCode,
          barcode: input.barcode?.trim(),
          name: input.name.trim(),
          description: input.description,
          categoryId: input.categoryId,
          unitId: input.unitId,
          reorderThreshold: new Decimal(input.reorderThreshold ?? 10),
          reorderQuantity: new Decimal(input.reorderQuantity ?? 50),
          minStock: new Decimal(input.minStock ?? 0),
          maxStock: input.maxStock ? new Decimal(input.maxStock) : null,
          trackLot: input.trackLot ?? false,
          trackExpiry: input.trackExpiry ?? false,
          valuationMethod: input.valuationMethod ?? "FIFO",
          unitCost: new Decimal(input.unitCost ?? 0),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "INVENTORY",
          action: "INVENTORY_ITEM_CREATED",
          entityType: "InventoryItem",
          entityId: item.id,
          diffJson: JSON.stringify({ sku: item.sku, name: item.name }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.item.created",
        aggregateType: "InventoryItem",
        aggregateId: item.id,
        payload: { itemId: item.id, sku: item.sku, name: item.name },
      });

      return item;
    });
  }

  async getItem(tenantId: string, id: string, db = prismaTarget) {
    const item = await db.inventoryItem.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        unit: true,
        stocks: { include: { warehouse: true, location: true } },
        reorderRules: { include: { warehouse: true, preferredVendor: true } },
      },
    });
    if (!item) throw new NotFoundError("Inventory item not found");
    return item;
  }

  async listItems(
    filter: {
      tenantId: string;
      categoryId?: string;
      search?: string;
      activeOnly?: boolean;
      skip?: number;
      take?: number;
    },
    db = prismaTarget
  ) {
    const where: any = {
      tenantId: filter.tenantId,
      ...(filter.activeOnly !== false ? { active: true } : {}),
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: "insensitive" } },
              { sku: { contains: filter.search, mode: "insensitive" } },
              { barcode: { contains: filter.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        include: {
          category: true,
          unit: true,
          stocks: { include: { warehouse: true } },
        },
        orderBy: { name: "asc" },
        skip: filter.skip ?? 0,
        take: filter.take ?? 50,
      }),
      db.inventoryItem.count({ where }),
    ]);

    return { items, total };
  }

  // --------------------------------------------------------------------------
  // STOCK MANAGEMENT & INVARIANTS
  // --------------------------------------------------------------------------

  async getStock(tenantId: string, itemId: string, warehouseId: string, db = prismaTarget) {
    return db.inventoryStock.findFirst({
      where: { tenantId, itemId, warehouseId },
      include: { item: true, warehouse: true, location: true },
    });
  }

  async listStock(
    filter: {
      tenantId: string;
      warehouseId?: string;
      belowReorderOnly?: boolean;
      skip?: number;
      take?: number;
    },
    db = prismaTarget
  ) {
    const where: any = {
      tenantId: filter.tenantId,
      ...(filter.warehouseId ? { warehouseId: filter.warehouseId } : {}),
    };

    const stocks = await db.inventoryStock.findMany({
      where,
      include: {
        item: { include: { unit: true, category: true } },
        warehouse: true,
        location: true,
      },
      orderBy: { item: { name: "asc" } },
      skip: filter.skip ?? 0,
      take: filter.take ?? 50,
    });

    if (filter.belowReorderOnly) {
      return stocks.filter((s) => s.available.lessThanOrEqualTo(s.item.reorderThreshold));
    }

    return stocks;
  }

  async getStockValuation(tenantId: string, db = prismaTarget) {
    const stocks = await db.inventoryStock.findMany({
      where: { tenantId },
      include: { item: true },
    });

    let totalValuation = new Decimal(0);
    let totalItems = 0;

    for (const stock of stocks) {
      const cost = stock.unitCost.greaterThan(0) ? stock.unitCost : stock.item.unitCost;
      totalValuation = totalValuation.add(stock.onHand.mul(cost));
      totalItems += 1;
    }

    return {
      totalValuation,
      itemCount: totalItems,
    };
  }

  // --------------------------------------------------------------------------
  // PURCHASE REQUESTS
  // --------------------------------------------------------------------------

  async createPurchaseRequest(input: CreatePurchaseRequestInput, db = prismaTarget) {
    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Purchase request must contain at least one item");
    }

    for (const item of input.items) {
      const dbItem = await db.inventoryItem.findFirst({
        where: { id: item.itemId, tenantId: input.tenantId },
      });
      if (!dbItem) throw new ValidationError(`Item '${item.itemId}' does not exist in tenant`);
      if (new Decimal(item.quantity).lessThanOrEqualTo(0)) {
        throw new ValidationError("Requested quantity must be positive");
      }
    }

    const prNumber = `PR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

    return db.$transaction(async (tx) => {
      const pr = await tx.inventoryPurchaseRequest.create({
        data: {
          tenantId: input.tenantId,
          prNumber,
          requesterUserId: input.requesterUserId,
          department: input.department,
          justification: input.justification,
          status: "SUBMITTED",
          items: {
            create: input.items.map((i) => ({
              tenantId: input.tenantId,
              itemId: i.itemId,
              quantity: new Decimal(i.quantity),
              estimatedUnitCost: i.estimatedUnitCost ? new Decimal(i.estimatedUnitCost) : null,
            })),
          },
        },
        include: { items: { include: { item: true } } },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "INVENTORY",
          action: "INVENTORY_PURCHASE_REQUEST_SUBMITTED",
          entityType: "InventoryPurchaseRequest",
          entityId: pr.id,
          diffJson: JSON.stringify({ prNumber: pr.prNumber, itemCount: pr.items.length }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.purchase.request.created",
        aggregateType: "InventoryPurchaseRequest",
        aggregateId: pr.id,
        payload: { purchaseRequestId: pr.id, prNumber: pr.prNumber },
      });

      return pr;
    });
  }

  async approvePurchaseRequest(
    tenantId: string,
    id: string,
    approverUserId: string,
    db = prismaTarget
  ) {
    const pr = await db.inventoryPurchaseRequest.findFirst({
      where: { id, tenantId },
    });
    if (!pr) throw new NotFoundError("Purchase request not found");
    if (pr.status !== "SUBMITTED") {
      throw new ConflictError(`Cannot approve purchase request in '${pr.status}' state`);
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.inventoryPurchaseRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedByUserId: approverUserId,
          approvedAt: new Date(),
        },
        include: { items: { include: { item: true } } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: approverUserId,
          actionCategory: "INVENTORY",
          action: "INVENTORY_PURCHASE_REQUEST_APPROVED",
          entityType: "InventoryPurchaseRequest",
          entityId: id,
          diffJson: JSON.stringify({ status: "APPROVED", approvedBy: approverUserId }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "inventory.purchase.request.approved",
        aggregateType: "InventoryPurchaseRequest",
        aggregateId: id,
        payload: { purchaseRequestId: id, prNumber: pr.prNumber },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // PURCHASE ORDERS
  // --------------------------------------------------------------------------

  async createPurchaseOrder(input: CreatePurchaseOrderInput, db = prismaTarget) {
    const vendor = await db.inventoryVendor.findFirst({
      where: { id: input.vendorId, tenantId: input.tenantId },
    });
    if (!vendor) throw new NotFoundError("Vendor not found in tenant");

    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Purchase order must have at least one line item");
    }

    let subtotal = new Decimal(0);
    let totalTax = new Decimal(0);

    for (const item of input.items) {
      const dbItem = await db.inventoryItem.findFirst({
        where: { id: item.itemId, tenantId: input.tenantId },
      });
      if (!dbItem) throw new ValidationError(`Item '${item.itemId}' does not exist in tenant`);

      const qty = new Decimal(item.orderedQuantity);
      if (qty.lessThanOrEqualTo(0)) throw new ValidationError("Ordered quantity must be positive");

      const price = new Decimal(item.unitPrice);
      const taxPercent = new Decimal(item.taxPercent ?? 0);
      const lineTotal = qty.mul(price);
      const lineTax = lineTotal.mul(taxPercent).div(100);

      subtotal = subtotal.add(lineTotal);
      totalTax = totalTax.add(lineTax);
    }

    const totalAmount = subtotal.add(totalTax);
    const poNumber = `PO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

    return db.$transaction(async (tx) => {
      const po = await tx.inventoryPurchaseOrder.create({
        data: {
          tenantId: input.tenantId,
          poNumber,
          vendorId: input.vendorId,
          status: "ISSUED",
          expectedDeliveryDate: input.expectedDeliveryDate,
          subtotalAmount: subtotal,
          taxAmount: totalTax,
          totalAmount,
          notes: input.notes,
          approvedByUserId: input.actorUserId,
          approvedAt: new Date(),
          items: {
            create: input.items.map((i) => {
              const qty = new Decimal(i.orderedQuantity);
              const price = new Decimal(i.unitPrice);
              const tax = new Decimal(i.taxPercent ?? 0);
              return {
                tenantId: input.tenantId,
                itemId: i.itemId,
                orderedQuantity: qty,
                unitPrice: price,
                taxPercent: tax,
                totalPrice: qty.mul(price).add(qty.mul(price).mul(tax).div(100)),
              };
            }),
          },
        },
        include: { items: { include: { item: true } }, vendor: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "INVENTORY",
          action: "INVENTORY_PURCHASE_ORDER_CREATED",
          entityType: "InventoryPurchaseOrder",
          entityId: po.id,
          diffJson: JSON.stringify({ poNumber: po.poNumber, totalAmount: po.totalAmount.toString() }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.purchase.order.created",
        aggregateType: "InventoryPurchaseOrder",
        aggregateId: po.id,
        payload: { purchaseOrderId: po.id, poNumber: po.poNumber, totalAmount: po.totalAmount.toString() },
      });

      return po;
    });
  }

  async listPurchaseOrders(tenantId: string, status?: string, db = prismaTarget) {
    return db.inventoryPurchaseOrder.findMany({
      where: {
        tenantId,
        ...(status ? { status: status as any } : {}),
      },
      include: { vendor: true, items: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // --------------------------------------------------------------------------
  // STOCK RECEIPTS (RECEIVING INVENTORY)
  // --------------------------------------------------------------------------

  async receiveStock(input: ReceiveStockInput, db = prismaTarget) {
    const warehouse = await db.inventoryWarehouse.findFirst({
      where: { id: input.warehouseId, tenantId: input.tenantId },
    });
    if (!warehouse) throw new NotFoundError("Warehouse not found in tenant");

    if (input.vendorId) {
      const vendor = await db.inventoryVendor.findFirst({
        where: { id: input.vendorId, tenantId: input.tenantId },
      });
      if (!vendor) throw new NotFoundError("Vendor not found in tenant");
    }

    let po: any = null;
    if (input.purchaseOrderId) {
      po = await db.inventoryPurchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, tenantId: input.tenantId },
        include: { items: true },
      });
      if (!po) throw new NotFoundError("Purchase order not found in tenant");
      if (po.status === "CANCELLED" || po.status === "RECEIVED") {
        throw new ConflictError(`Cannot receive against PO in status '${po.status}'`);
      }
    }

    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Receipt must have at least one line item");
    }

    const receiptNumber = `RCV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

    return db.$transaction(async (tx) => {
      const receipt = await tx.inventoryReceipt.create({
        data: {
          tenantId: input.tenantId,
          receiptNumber,
          warehouseId: input.warehouseId,
          purchaseOrderId: input.purchaseOrderId,
          vendorId: input.vendorId || po?.vendorId,
          receivedByUserId: input.receivedByUserId,
          invoiceNumber: input.invoiceNumber,
          notes: input.notes,
        },
      });

      for (const item of input.items) {
        const qtyReceived = new Decimal(item.quantityReceived);
        if (qtyReceived.lessThanOrEqualTo(0)) {
          throw new ValidationError("Received quantity must be positive");
        }
        const unitCost = new Decimal(item.unitCost);

        // 1. Create Receipt Line Item
        await tx.inventoryReceiptItem.create({
          data: {
            tenantId: input.tenantId,
            receiptId: receipt.id,
            purchaseOrderItemId: item.purchaseOrderItemId,
            itemId: item.itemId,
            quantityReceived: qtyReceived,
            unitCost,
            lotNumber: item.lotNumber,
            expiryDate: item.expiryDate,
          },
        });

        // 2. Increment Stock
        const existingStock = await tx.inventoryStock.findFirst({
          where: {
            tenantId: input.tenantId,
            itemId: item.itemId,
            warehouseId: input.warehouseId,
          },
        });

        if (existingStock) {
          const newOnHand = existingStock.onHand.add(qtyReceived);
          const newAvailable = newOnHand.sub(existingStock.reserved);

          // Weighted average unit cost calculation
          const totalExistingValuation = existingStock.onHand.mul(existingStock.unitCost);
          const addedValuation = qtyReceived.mul(unitCost);
          const newWeightedCost = newOnHand.greaterThan(0)
            ? totalExistingValuation.add(addedValuation).div(newOnHand)
            : unitCost;

          await tx.inventoryStock.update({
            where: { id: existingStock.id },
            data: {
              onHand: newOnHand,
              available: newAvailable,
              unitCost: newWeightedCost,
            },
          });
        } else {
          await tx.inventoryStock.create({
            data: {
              tenantId: input.tenantId,
              itemId: item.itemId,
              warehouseId: input.warehouseId,
              locationId: item.locationId,
              onHand: qtyReceived,
              reserved: new Decimal(0),
              available: qtyReceived,
              unitCost,
            },
          });
        }

        // 3. Lot / Expiry tracking if provided
        if (item.lotNumber) {
          const existingLot = await tx.inventoryStockLot.findFirst({
            where: {
              tenantId: input.tenantId,
              itemId: item.itemId,
              lotNumber: item.lotNumber,
            },
          });
          if (existingLot) {
            await tx.inventoryStockLot.update({
              where: { id: existingLot.id },
              data: { quantity: existingLot.quantity.add(qtyReceived) },
            });
          } else {
            await tx.inventoryStockLot.create({
              data: {
                tenantId: input.tenantId,
                itemId: item.itemId,
                lotNumber: item.lotNumber,
                expiryDate: item.expiryDate,
                quantity: qtyReceived,
                unitCost,
              },
            });
          }
        }

        // 4. Update PO Item if linked
        if (item.purchaseOrderItemId) {
          const poItem = await tx.inventoryPurchaseOrderItem.findFirst({
            where: { id: item.purchaseOrderItemId, tenantId: input.tenantId },
          });
          if (poItem) {
            await tx.inventoryPurchaseOrderItem.update({
              where: { id: poItem.id },
              data: { receivedQuantity: poItem.receivedQuantity.add(qtyReceived) },
            });
          }
        }

        // 5. Immutable Stock Movement History
        await tx.inventoryStockMovement.create({
          data: {
            tenantId: input.tenantId,
            itemId: item.itemId,
            destinationLocationId: item.locationId,
            quantity: qtyReceived,
            movementType: "RECEIPT",
            referenceType: "INVENTORY_RECEIPT",
            referenceId: receipt.id,
            actorUserId: input.receivedByUserId,
            reason: `Received against ${po ? `PO: ${po.poNumber}` : "Direct Receipt"}`,
          },
        });
      }

      // 6. Update PO status if all items received
      if (po) {
        const poItems = await tx.inventoryPurchaseOrderItem.findMany({
          where: { purchaseOrderId: po.id },
        });
        const fullyReceived = poItems.every((pi) => pi.receivedQuantity.greaterThanOrEqualTo(pi.orderedQuantity));
        await tx.inventoryPurchaseOrder.update({
          where: { id: po.id },
          data: { status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED" },
        });
      }

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId || input.receivedByUserId,
          actorEmail: input.actorEmail,
          actionCategory: "INVENTORY",
          action: "INVENTORY_STOCK_RECEIVED",
          entityType: "InventoryReceipt",
          entityId: receipt.id,
          diffJson: JSON.stringify({ receiptNumber: receipt.receiptNumber, warehouseId: receipt.warehouseId }),
        },
      });

      // 8. Transactional Outbox Event
      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.stock.received",
        aggregateType: "InventoryReceipt",
        aggregateId: receipt.id,
        payload: { receiptId: receipt.id, receiptNumber: receipt.receiptNumber, warehouseId: input.warehouseId },
      });

      return receipt;
    });
  }

  // --------------------------------------------------------------------------
  // STOCK ISSUES (DISPATCH / CONSUMPTION)
  // --------------------------------------------------------------------------

  async issueStock(input: IssueStockInput, db = prismaTarget) {
    const warehouse = await db.inventoryWarehouse.findFirst({
      where: { id: input.warehouseId, tenantId: input.tenantId },
    });
    if (!warehouse) throw new NotFoundError("Warehouse not found in tenant");

    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Issue request must contain at least one item");
    }

    const issueNumber = `ISS-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

    return db.$transaction(async (tx) => {
      // 1. Verify availability and invariants across all items
      for (const item of input.items) {
        const qtyRequested = new Decimal(item.quantity);
        if (qtyRequested.lessThanOrEqualTo(0)) {
          throw new ValidationError("Issue quantity must be positive");
        }

        const stock = await tx.inventoryStock.findFirst({
          where: {
            tenantId: input.tenantId,
            itemId: item.itemId,
            warehouseId: input.warehouseId,
          },
        });

        if (!stock || stock.available.lessThan(qtyRequested)) {
          throw new ConflictError(
            `Insufficient available stock for item '${item.itemId}'. Available: ${stock?.available.toString() ?? "0"}, Requested: ${qtyRequested.toString()}`
          );
        }
      }

      // 2. Create Issue header
      const issue = await tx.inventoryIssue.create({
        data: {
          tenantId: input.tenantId,
          issueNumber,
          warehouseId: input.warehouseId,
          issuedToType: input.issuedToType,
          issuedToId: input.issuedToId,
          issuedByUserId: input.issuedByUserId,
          reason: input.reason,
        },
      });

      // 3. Process each line item
      for (const item of input.items) {
        const qty = new Decimal(item.quantity);

        const stock = (await tx.inventoryStock.findFirst({
          where: {
            tenantId: input.tenantId,
            itemId: item.itemId,
            warehouseId: input.warehouseId,
          },
        }))!;

        // Record line item
        await tx.inventoryIssueItem.create({
          data: {
            tenantId: input.tenantId,
            issueId: issue.id,
            itemId: item.itemId,
            quantity: qty,
            unitCost: stock.unitCost,
          },
        });

        // Decrement stock invariant: available = onHand - reserved
        const newOnHand = stock.onHand.sub(qty);
        const newAvailable = newOnHand.sub(stock.reserved);

        if (newAvailable.lessThan(0) || newOnHand.lessThan(0)) {
          throw new ConflictError("Stock mutation would result in negative inventory");
        }

        await tx.inventoryStock.update({
          where: { id: stock.id },
          data: {
            onHand: newOnHand,
            available: newAvailable,
          },
        });

        // Immutable movement history
        await tx.inventoryStockMovement.create({
          data: {
            tenantId: input.tenantId,
            itemId: item.itemId,
            sourceLocationId: stock.locationId,
            quantity: qty,
            movementType: "ISSUE",
            referenceType: "INVENTORY_ISSUE",
            referenceId: issue.id,
            actorUserId: input.issuedByUserId,
            reason: input.reason || `Issued to ${input.issuedToType}`,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId || input.issuedByUserId,
          actorEmail: input.actorEmail,
          actionCategory: "INVENTORY",
          action: "INVENTORY_STOCK_ISSUED",
          entityType: "InventoryIssue",
          entityId: issue.id,
          diffJson: JSON.stringify({ issueNumber: issue.issueNumber, issuedTo: input.issuedToType }),
        },
      });

      // 5. Outbox Event
      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.stock.issued",
        aggregateType: "InventoryIssue",
        aggregateId: issue.id,
        payload: { issueId: issue.id, issueNumber: issue.issueNumber, warehouseId: input.warehouseId },
      });

      return issue;
    });
  }

  // --------------------------------------------------------------------------
  // STOCK TRANSFERS (WAREHOUSE TO WAREHOUSE)
  // --------------------------------------------------------------------------

  async requestTransfer(input: RequestTransferInput, db = prismaTarget) {
    if (input.sourceWarehouseId === input.destinationWarehouseId) {
      throw new ValidationError("Source and destination warehouses must be different");
    }

    const [srcWarehouse, destWarehouse] = await Promise.all([
      db.inventoryWarehouse.findFirst({ where: { id: input.sourceWarehouseId, tenantId: input.tenantId } }),
      db.inventoryWarehouse.findFirst({ where: { id: input.destinationWarehouseId, tenantId: input.tenantId } }),
    ]);

    if (!srcWarehouse || !destWarehouse) {
      throw new NotFoundError("Source or destination warehouse not found in tenant");
    }

    for (const item of input.items) {
      const stock = await db.inventoryStock.findFirst({
        where: { tenantId: input.tenantId, itemId: item.itemId, warehouseId: input.sourceWarehouseId },
      });
      const qty = new Decimal(item.quantity);
      if (!stock || stock.available.lessThan(qty)) {
        throw new ConflictError(`Insufficient available stock at source warehouse for item '${item.itemId}'`);
      }
    }

    const transferNumber = `TRF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

    return db.$transaction(async (tx) => {
      const transfer = await tx.inventoryTransfer.create({
        data: {
          tenantId: input.tenantId,
          transferNumber,
          sourceWarehouseId: input.sourceWarehouseId,
          destinationWarehouseId: input.destinationWarehouseId,
          requestedByUserId: input.requestedByUserId,
          status: "IN_TRANSIT",
          shippedAt: new Date(),
          notes: input.notes,
          items: {
            create: input.items.map((i) => ({
              tenantId: input.tenantId,
              itemId: i.itemId,
              quantity: new Decimal(i.quantity),
            })),
          },
        },
        include: { items: true },
      });

      // Deduct from source warehouse
      for (const item of input.items) {
        const qty = new Decimal(item.quantity);
        const stock = (await tx.inventoryStock.findFirst({
          where: { tenantId: input.tenantId, itemId: item.itemId, warehouseId: input.sourceWarehouseId },
        }))!;

        const newOnHand = stock.onHand.sub(qty);
        const newAvailable = newOnHand.sub(stock.reserved);

        if (newAvailable.lessThan(0)) {
          throw new ConflictError("Transfer deduction would result in negative available inventory");
        }

        await tx.inventoryStock.update({
          where: { id: stock.id },
          data: { onHand: newOnHand, available: newAvailable },
        });

        await tx.inventoryStockMovement.create({
          data: {
            tenantId: input.tenantId,
            itemId: item.itemId,
            quantity: qty,
            movementType: "TRANSFER_OUT",
            referenceType: "INVENTORY_TRANSFER",
            referenceId: transfer.id,
            actorUserId: input.requestedByUserId,
            reason: `Transfer to ${destWarehouse.name}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId || input.requestedByUserId,
          actionCategory: "INVENTORY",
          action: "INVENTORY_TRANSFER_DISPATCHED",
          entityType: "InventoryTransfer",
          entityId: transfer.id,
          diffJson: JSON.stringify({ transferNumber: transfer.transferNumber, status: "IN_TRANSIT" }),
        },
      });

      return transfer;
    });
  }

  async receiveTransfer(tenantId: string, transferId: string, receiverUserId: string, db = prismaTarget) {
    const transfer = await db.inventoryTransfer.findFirst({
      where: { id: transferId, tenantId },
      include: { items: true, destinationWarehouse: true },
    });
    if (!transfer) throw new NotFoundError("Transfer not found");
    if (transfer.status !== "IN_TRANSIT") {
      throw new ConflictError(`Cannot receive transfer in '${transfer.status}' state`);
    }

    return db.$transaction(async (tx) => {
      // Increment stock at destination warehouse
      for (const item of transfer.items) {
        const destStock = await tx.inventoryStock.findFirst({
          where: { tenantId, itemId: item.itemId, warehouseId: transfer.destinationWarehouseId },
        });

        if (destStock) {
          const newOnHand = destStock.onHand.add(item.quantity);
          const newAvailable = newOnHand.sub(destStock.reserved);
          await tx.inventoryStock.update({
            where: { id: destStock.id },
            data: { onHand: newOnHand, available: newAvailable },
          });
        } else {
          await tx.inventoryStock.create({
            data: {
              tenantId,
              itemId: item.itemId,
              warehouseId: transfer.destinationWarehouseId,
              onHand: item.quantity,
              reserved: new Decimal(0),
              available: item.quantity,
            },
          });
        }

        await tx.inventoryStockMovement.create({
          data: {
            tenantId,
            itemId: item.itemId,
            quantity: item.quantity,
            movementType: "TRANSFER_IN",
            referenceType: "INVENTORY_TRANSFER",
            referenceId: transfer.id,
            actorUserId: receiverUserId,
            reason: `Transfer received at ${transfer.destinationWarehouse.name}`,
          },
        });
      }

      const updated = await tx.inventoryTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          approvedByUserId: receiverUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: receiverUserId,
          actionCategory: "INVENTORY",
          action: "INVENTORY_TRANSFER_RECEIVED",
          entityType: "InventoryTransfer",
          entityId: transfer.id,
          diffJson: JSON.stringify({ transferNumber: transfer.transferNumber, status: "RECEIVED" }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "inventory.stock.transferred",
        aggregateType: "InventoryTransfer",
        aggregateId: transfer.id,
        payload: { transferId: transfer.id, transferNumber: transfer.transferNumber },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // STOCK ADJUSTMENTS (PHYSICAL COUNT CORRECTIONS / WRITE-OFFS)
  // --------------------------------------------------------------------------

  async adjustStock(input: AdjustStockInput, db = prismaTarget) {
    const warehouse = await db.inventoryWarehouse.findFirst({
      where: { id: input.warehouseId, tenantId: input.tenantId },
    });
    if (!warehouse) throw new NotFoundError("Warehouse not found in tenant");

    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Adjustment must include at least one item");
    }

    const adjustmentNumber = `ADJ-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

    return db.$transaction(async (tx) => {
      // Verify decrease requests don't exceed available
      for (const item of input.items) {
        const qty = new Decimal(item.quantity);
        if (qty.lessThanOrEqualTo(0)) throw new ValidationError("Adjustment quantity must be positive");

        if (item.direction === "DECREASE") {
          const stock = await tx.inventoryStock.findFirst({
            where: { tenantId: input.tenantId, itemId: item.itemId, warehouseId: input.warehouseId },
          });
          if (!stock || stock.available.lessThan(qty)) {
            throw new ConflictError(
              `Cannot decrease stock by ${qty.toString()}. Available: ${stock?.available.toString() ?? "0"}`
            );
          }
        }
      }

      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          tenantId: input.tenantId,
          adjustmentNumber,
          warehouseId: input.warehouseId,
          adjustedByUserId: input.adjustedByUserId,
          reason: input.reason,
          status: "POSTED",
          items: {
            create: input.items.map((i) => ({
              tenantId: input.tenantId,
              itemId: i.itemId,
              quantity: new Decimal(i.quantity),
              direction: i.direction,
              unitCost: new Decimal(i.unitCost ?? 0),
              reason: i.reason,
            })),
          },
        },
      });

      for (const item of input.items) {
        const qty = new Decimal(item.quantity);
        const stock = await tx.inventoryStock.findFirst({
          where: { tenantId: input.tenantId, itemId: item.itemId, warehouseId: input.warehouseId },
        });

        if (item.direction === "INCREASE") {
          if (stock) {
            const newOnHand = stock.onHand.add(qty);
            const newAvailable = newOnHand.sub(stock.reserved);
            await tx.inventoryStock.update({
              where: { id: stock.id },
              data: { onHand: newOnHand, available: newAvailable },
            });
          } else {
            await tx.inventoryStock.create({
              data: {
                tenantId: input.tenantId,
                itemId: item.itemId,
                warehouseId: input.warehouseId,
                onHand: qty,
                reserved: new Decimal(0),
                available: qty,
              },
            });
          }

          await tx.inventoryStockMovement.create({
            data: {
              tenantId: input.tenantId,
              itemId: item.itemId,
              quantity: qty,
              movementType: "ADJUSTMENT_IN",
              referenceType: "INVENTORY_ADJUSTMENT",
              referenceId: adjustment.id,
              actorUserId: input.adjustedByUserId,
              reason: input.reason,
            },
          });
        } else {
          // DECREASE
          const newOnHand = stock!.onHand.sub(qty);
          const newAvailable = newOnHand.sub(stock!.reserved);

          await tx.inventoryStock.update({
            where: { id: stock!.id },
            data: { onHand: newOnHand, available: newAvailable },
          });

          await tx.inventoryStockMovement.create({
            data: {
              tenantId: input.tenantId,
              itemId: item.itemId,
              quantity: qty,
              movementType: "ADJUSTMENT_OUT",
              referenceType: "INVENTORY_ADJUSTMENT",
              referenceId: adjustment.id,
              actorUserId: input.adjustedByUserId,
              reason: input.reason,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId || input.adjustedByUserId,
          actionCategory: "INVENTORY",
          action: "INVENTORY_STOCK_ADJUSTED",
          entityType: "InventoryAdjustment",
          entityId: adjustment.id,
          diffJson: JSON.stringify({ adjustmentNumber: adjustment.adjustmentNumber, reason: input.reason }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.stock.adjusted",
        aggregateType: "InventoryAdjustment",
        aggregateId: adjustment.id,
        payload: { adjustmentId: adjustment.id, adjustmentNumber: adjustment.adjustmentNumber },
      });

      return adjustment;
    });
  }

  // --------------------------------------------------------------------------
  // STOCK RESERVATIONS
  // --------------------------------------------------------------------------

  async reserveStock(input: ReserveStockInput, db = prismaTarget) {
    const qty = new Decimal(input.quantity);
    if (qty.lessThanOrEqualTo(0)) throw new ValidationError("Reservation quantity must be positive");

    const reservationNumber = `RES-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

    return db.$transaction(async (tx) => {
      const stock = await tx.inventoryStock.findFirst({
        where: { tenantId: input.tenantId, itemId: input.itemId, warehouseId: input.warehouseId },
      });

      if (!stock || stock.available.lessThan(qty)) {
        throw new ConflictError(
          `Insufficient available stock for reservation. Available: ${stock?.available.toString() ?? "0"}, Requested: ${qty.toString()}`
        );
      }

      const reservation = await tx.inventoryReservation.create({
        data: {
          tenantId: input.tenantId,
          reservationNumber,
          itemId: input.itemId,
          warehouseId: input.warehouseId,
          quantity: qty,
          reservedForType: input.reservedForType,
          reservedForId: input.reservedForId,
          reservedByUserId: input.reservedByUserId,
          expiryDate: input.expiryDate,
          status: "ACTIVE",
        },
      });

      // Update stock: reserved increases, available decreases (onHand unchanged)
      const newReserved = stock.reserved.add(qty);
      const newAvailable = stock.onHand.sub(newReserved);

      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: {
          reserved: newReserved,
          available: newAvailable,
        },
      });

      await tx.inventoryStockMovement.create({
        data: {
          tenantId: input.tenantId,
          itemId: input.itemId,
          quantity: qty,
          movementType: "RESERVATION",
          referenceType: "INVENTORY_RESERVATION",
          referenceId: reservation.id,
          actorUserId: input.reservedByUserId,
          reason: `Reserved for ${input.reservedForType}`,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId || input.reservedByUserId,
          actionCategory: "INVENTORY",
          action: "INVENTORY_STOCK_RESERVED",
          entityType: "InventoryReservation",
          entityId: reservation.id,
          diffJson: JSON.stringify({ reservationNumber: reservation.reservationNumber, quantity: qty.toString() }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.stock.reserved",
        aggregateType: "InventoryReservation",
        aggregateId: reservation.id,
        payload: { reservationId: reservation.id, reservationNumber: reservation.reservationNumber },
      });

      return reservation;
    });
  }

  async releaseReservation(tenantId: string, reservationId: string, actorUserId: string, db = prismaTarget) {
    const reservation = await db.inventoryReservation.findFirst({
      where: { id: reservationId, tenantId },
    });
    if (!reservation) throw new NotFoundError("Reservation not found");
    if (reservation.status !== "ACTIVE") {
      throw new ConflictError(`Cannot release reservation in '${reservation.status}' state`);
    }

    return db.$transaction(async (tx) => {
      const stock = (await tx.inventoryStock.findFirst({
        where: { tenantId, itemId: reservation.itemId, warehouseId: reservation.warehouseId },
      }))!;

      const newReserved = stock.reserved.sub(reservation.quantity);
      const newAvailable = stock.onHand.sub(newReserved);

      await tx.inventoryStock.update({
        where: { id: stock.id },
        data: { reserved: newReserved, available: newAvailable },
      });

      const updated = await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: "RELEASED" },
      });

      await tx.inventoryStockMovement.create({
        data: {
          tenantId,
          itemId: reservation.itemId,
          quantity: reservation.quantity,
          movementType: "RELEASE",
          referenceType: "INVENTORY_RESERVATION",
          referenceId: reservation.id,
          actorUserId,
          reason: "Reservation released",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actionCategory: "INVENTORY",
          action: "INVENTORY_RESERVATION_RELEASED",
          entityType: "InventoryReservation",
          entityId: reservation.id,
          diffJson: JSON.stringify({ status: "RELEASED" }),
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // REORDER RULES & VALUATION SNAPSHOTS
  // --------------------------------------------------------------------------

  async upsertReorderRule(input: UpsertReorderRuleInput, db = prismaTarget) {
    const [item, warehouse] = await Promise.all([
      db.inventoryItem.findFirst({ where: { id: input.itemId, tenantId: input.tenantId } }),
      db.inventoryWarehouse.findFirst({ where: { id: input.warehouseId, tenantId: input.tenantId } }),
    ]);

    if (!item || !warehouse) throw new NotFoundError("Item or warehouse not found in tenant");

    return db.inventoryReorderRule.upsert({
      where: {
        warehouseId_itemId: {
          warehouseId: input.warehouseId,
          itemId: input.itemId,
        },
      },
      create: {
        tenantId: input.tenantId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        reorderPoint: new Decimal(input.reorderPoint),
        reorderQuantity: new Decimal(input.reorderQuantity),
        preferredVendorId: input.preferredVendorId,
        leadTimeDays: input.leadTimeDays,
      },
      update: {
        reorderPoint: new Decimal(input.reorderPoint),
        reorderQuantity: new Decimal(input.reorderQuantity),
        preferredVendorId: input.preferredVendorId,
        leadTimeDays: input.leadTimeDays,
      },
    });
  }

  async getLowStockAlerts(tenantId: string, db = prismaTarget) {
    const rules = await db.inventoryReorderRule.findMany({
      where: { tenantId, active: true },
      include: { item: true, warehouse: true, preferredVendor: true },
    });

    const lowStockItems = [];

    for (const rule of rules) {
      const stock = await db.inventoryStock.findFirst({
        where: { tenantId, itemId: rule.itemId, warehouseId: rule.warehouseId },
      });

      const currentAvailable = stock ? stock.available : new Decimal(0);
      if (currentAvailable.lessThanOrEqualTo(rule.reorderPoint)) {
        lowStockItems.push({
          rule,
          currentStock: stock,
          available: currentAvailable,
          reorderPoint: rule.reorderPoint,
          reorderQuantity: rule.reorderQuantity,
        });
      }
    }

    return lowStockItems;
  }
}

export const inventoryService = new InventoryService();
