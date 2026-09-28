import { describe, it, expect, beforeEach } from "vitest";
import { InventoryService } from "@/lib/services/inventory-service";
import { AssetService } from "@/lib/services/asset-service";
import { ModuleGate } from "@/lib/authorization/module-gate";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ModuleDisabledError,
} from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

function cleanUpdateData(data: any) {
  const clean: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
}

// ============================================================================
// STATEFUL IN-MEMORY CONTROLLED PILOT DATABASE ENGINE (STEP 16)
// ============================================================================

function createWave4PilotDatabaseStore() {
  const state = {
    // Inventory Models (Plane 17)
    inventoryCategories: new Map<string, any>(),
    inventoryUnits: new Map<string, any>(),
    inventoryVendors: new Map<string, any>(),
    inventoryWarehouses: new Map<string, any>(),
    inventoryLocations: new Map<string, any>(),
    inventoryItems: new Map<string, any>(),
    inventoryStocks: new Map<string, any>(),
    inventoryStockLots: new Map<string, any>(),
    inventoryStockMovements: new Map<string, any>(),
    inventoryPurchaseRequests: new Map<string, any>(),
    inventoryPurchaseRequestItems: new Map<string, any>(),
    inventoryPurchaseOrders: new Map<string, any>(),
    inventoryPurchaseOrderItems: new Map<string, any>(),
    inventoryReceipts: new Map<string, any>(),
    inventoryReceiptItems: new Map<string, any>(),
    inventoryIssues: new Map<string, any>(),
    inventoryIssueItems: new Map<string, any>(),
    inventoryTransfers: new Map<string, any>(),
    inventoryTransferItems: new Map<string, any>(),
    inventoryAdjustments: new Map<string, any>(),
    inventoryAdjustmentItems: new Map<string, any>(),
    inventoryReservations: new Map<string, any>(),
    inventoryReorderRules: new Map<string, any>(),
    inventoryValuationSnapshots: new Map<string, any>(),

    // Asset Models (Plane 18)
    assetCategories: new Map<string, any>(),
    assets: new Map<string, any>(),
    assetComponents: new Map<string, any>(),
    assetAssignments: new Map<string, any>(),
    assetTransfers: new Map<string, any>(),
    assetReturns: new Map<string, any>(),
    assetMaintenances: new Map<string, any>(),
    assetDisposals: new Map<string, any>(),
    assetDepreciations: new Map<string, any>(),

    // Platform Identity & Foundation Models
    tenants: new Map<string, any>(),
    users: new Map<string, any>(),
    tenantMemberships: new Map<string, any>(),
    tenantModuleEntitlements: new Map<string, any>(),
    staffProfiles: new Map<string, any>(),

    // Audit & Outbox
    auditLogs: [] as any[],
    tenantOutboxEvents: [] as any[],

    // Wave 1 Financial Foundations
    feeInvoices: new Map<string, any>(),
    payments: new Map<string, any>(),
    journalEntries: new Map<string, any>(),
    journalLines: new Map<string, any>(),
  };

  let idCounter = 1000;
  const genId = (prefix: string) => `${prefix}_${idCounter++}`;

  let txQueue = Promise.resolve();

  const mockDb: any = {
    _state: state,

    $transaction: async (cb: (tx: any) => Promise<any>) => {
      let release: () => void;
      const nextLock = new Promise<void>((resolve) => {
        release = resolve;
      });
      const currentLock = txQueue;
      txQueue = txQueue.then(() => nextLock);
      await currentLock;
      try {
        return await cb(mockDb);
      } finally {
        release!();
      }
    },

    // Identity & Tenant
    tenant: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.tenants.get(where.id) || null;
        return null;
      },
    },

    tenantMembership: {
      findFirst: async ({ where }: any) => {
        for (const m of Array.from(state.tenantMemberships.values())) {
          let match = true;
          if (where.tenantId && m.tenantId !== where.tenantId) match = false;
          if (where.userId && m.userId !== where.userId) match = false;
          if (where.status && m.status !== where.status) match = false;
          if (match) return m;
        }
        return null;
      },
    },

    tenantModuleEntitlement: {
      findUnique: async ({ where }: any) => {
        const tId = where?.tenantId_moduleKey?.tenantId || where?.tenantId;
        const mKey = where?.tenantId_moduleKey?.moduleKey || where?.moduleKey;
        for (const e of Array.from(state.tenantModuleEntitlements.values())) {
          if (e.tenantId === tId && e.moduleKey === mKey) return e;
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const e of Array.from(state.tenantModuleEntitlements.values())) {
          let match = true;
          if (where.tenantId && e.tenantId !== where.tenantId) match = false;
          if (where.moduleKey && e.moduleKey !== where.moduleKey) match = false;
          if (match) return e;
        }
        return null;
      },
    },

    staffProfile: {
      findFirst: async ({ where }: any) => {
        for (const s of Array.from(state.staffProfiles.values())) {
          let match = true;
          if (where.id && s.id !== where.id) match = false;
          if (where.tenantId && s.tenantId !== where.tenantId) match = false;
          if (where.userId && s.userId !== where.userId) match = false;
          if (match) return s;
        }
        return null;
      },
    },

    // Audit & Outbox
    auditLog: {
      create: async ({ data }: any) => {
        const id = genId("aud");
        const log = { id, ...data, timestamp: new Date() };
        state.auditLogs.push(log);
        return log;
      },
      findMany: async ({ where }: any) => {
        return state.auditLogs.filter((l) => {
          if (where?.tenantId && l.tenantId !== where.tenantId) return false;
          if (where?.action && l.action !== where.action) return false;
          if (where?.entityType && l.entityType !== where.entityType) return false;
          if (where?.entityId && l.entityId !== where.entityId) return false;
          return true;
        });
      },
    },

    tenantOutboxEvent: {
      create: async ({ data }: any) => {
        const id = genId("obx");
        const ev = { id, ...data, createdAt: new Date() };
        state.tenantOutboxEvents.push(ev);
        return ev;
      },
      findMany: async ({ where }: any) => {
        return state.tenantOutboxEvents.filter((e) => {
          if (where?.tenantId && e.tenantId !== where.tenantId) return false;
          if (where?.eventType && e.eventType !== where.eventType) return false;
          if (where?.aggregateId && e.aggregateId !== where.aggregateId) return false;
          return true;
        });
      },
    },

    // ------------------------------------------------------------------------
    // INVENTORY MODELS
    // ------------------------------------------------------------------------
    inventoryCategory: {
      findFirst: async ({ where }: any) => {
        for (const c of Array.from(state.inventoryCategories.values())) {
          let match = true;
          if (where.id && c.id !== where.id) match = false;
          if (where.tenantId && c.tenantId !== where.tenantId) match = false;
          if (where.code && c.code !== where.code) match = false;
          if (match) return c;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("cat");
        const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        state.inventoryCategories.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryCategories.values()).filter((c) => {
          if (where?.tenantId && c.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    inventoryUnit: {
      findFirst: async ({ where }: any) => {
        for (const u of Array.from(state.inventoryUnits.values())) {
          let match = true;
          if (where.id && u.id !== where.id) match = false;
          if (where.tenantId && u.tenantId !== where.tenantId) match = false;
          if (where.code && u.code !== where.code) match = false;
          if (match) return u;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("unt");
        const rec = { id, ...data, createdAt: new Date() };
        state.inventoryUnits.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryUnits.values()).filter((u) => {
          if (where?.tenantId && u.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    inventoryVendor: {
      findFirst: async ({ where }: any) => {
        for (const v of Array.from(state.inventoryVendors.values())) {
          let match = true;
          if (where.id && v.id !== where.id) match = false;
          if (where.tenantId && v.tenantId !== where.tenantId) match = false;
          if (where.vendorCode && v.vendorCode !== where.vendorCode) match = false;
          if (match) return v;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("ven");
        const rec = { id, ...data, isActive: data.isActive ?? true, createdAt: new Date(), updatedAt: new Date() };
        state.inventoryVendors.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryVendors.values()).filter((v) => {
          if (where?.tenantId && v.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    inventoryWarehouse: {
      findFirst: async ({ where }: any) => {
        for (const w of Array.from(state.inventoryWarehouses.values())) {
          let match = true;
          if (where.id && w.id !== where.id) match = false;
          if (where.tenantId && w.tenantId !== where.tenantId) match = false;
          if (where.code && w.code !== where.code) match = false;
          if (where.managerStaffId && w.managerStaffId !== where.managerStaffId) match = false;
          if (match) return w;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("wh");
        const rec = { id, ...data, isActive: data.isActive ?? true, createdAt: new Date(), updatedAt: new Date() };
        state.inventoryWarehouses.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryWarehouses.values()).filter((w) => {
          if (where?.tenantId && w.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    inventoryLocation: {
      findFirst: async ({ where }: any) => {
        for (const l of Array.from(state.inventoryLocations.values())) {
          let match = true;
          if (where.id && l.id !== where.id) match = false;
          if (where.tenantId && l.tenantId !== where.tenantId) match = false;
          if (where.warehouseId && l.warehouseId !== where.warehouseId) match = false;
          if (where.code && l.code !== where.code) match = false;
          if (match) return l;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("loc");
        const rec = { id, ...data, isActive: data.isActive ?? true, createdAt: new Date(), updatedAt: new Date() };
        state.inventoryLocations.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryLocations.values()).filter((l) => {
          if (where?.tenantId && l.tenantId !== where.tenantId) return false;
          if (where?.warehouseId && l.warehouseId !== where.warehouseId) return false;
          return true;
        });
      },
    },

    inventoryItem: {
      findFirst: async ({ where }: any) => {
        for (const item of Array.from(state.inventoryItems.values())) {
          let match = true;
          if (where.id && item.id !== where.id) match = false;
          if (where.tenantId && item.tenantId !== where.tenantId) match = false;
          if (where.sku && item.sku !== where.sku) match = false;
          if (where.barcode && item.barcode !== where.barcode) match = false;
          if (where.internalCode && item.internalCode !== where.internalCode) match = false;
          if (match) return item;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("item");
        const rec = { id, ...data, isActive: data.isActive ?? true, createdAt: new Date(), updatedAt: new Date() };
        state.inventoryItems.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const item = state.inventoryItems.get(where.id);
        if (!item) throw new NotFoundError("InventoryItem not found");
        const updated = { ...item, ...cleanUpdateData(data), updatedAt: new Date() };
        state.inventoryItems.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryItems.values()).filter((i) => {
          if (where?.tenantId && i.tenantId !== where.tenantId) return false;
          if (where?.isActive !== undefined && i.isActive !== where.isActive) return false;
          return true;
        });
      },
      count: async ({ where }: any) => {
        return Array.from(state.inventoryItems.values()).filter((i) => {
          if (where?.tenantId && i.tenantId !== where.tenantId) return false;
          return true;
        }).length;
      },
    },

    inventoryStock: {
      findFirst: async ({ where }: any) => {
        for (const s of Array.from(state.inventoryStocks.values())) {
          let match = true;
          if (where.id && s.id !== where.id) match = false;
          if (where.tenantId && s.tenantId !== where.tenantId) match = false;
          if (where.itemId && s.itemId !== where.itemId) match = false;
          if (where.warehouseId && s.warehouseId !== where.warehouseId) match = false;
          if (where.locationId && s.locationId !== where.locationId) match = false;
          if (match) return s;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("stk");
        const rec = {
          id,
          ...data,
          onHand: new Decimal(data.onHand ?? 0),
          reserved: new Decimal(data.reserved ?? 0),
          available: new Decimal(data.available ?? data.onHand ?? 0),
          unitCost: new Decimal(data.unitCost ?? 0),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.inventoryStocks.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const stk = state.inventoryStocks.get(where.id);
        if (!stk) throw new NotFoundError("InventoryStock not found");
        const updated = {
          ...stk,
          ...cleanUpdateData(data),
          onHand: data.onHand !== undefined ? new Decimal(data.onHand) : stk.onHand,
          reserved: data.reserved !== undefined ? new Decimal(data.reserved) : stk.reserved,
          available: data.available !== undefined ? new Decimal(data.available) : stk.available,
          unitCost: data.unitCost !== undefined ? new Decimal(data.unitCost) : stk.unitCost,
          updatedAt: new Date(),
        };
        state.inventoryStocks.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryStocks.values()).filter((s) => {
          if (where?.tenantId && s.tenantId !== where.tenantId) return false;
          if (where?.warehouseId && s.warehouseId !== where.warehouseId) return false;
          if (where?.itemId && s.itemId !== where.itemId) return false;
          return true;
        });
      },
    },

    inventoryStockLot: {
      findFirst: async () => null,
      create: async ({ data }: any) => ({ id: genId("lot"), ...data }),
      update: async ({ data }: any) => ({ ...data }),
    },

    inventoryStockMovement: {
      create: async ({ data }: any) => {
        const id = genId("mvt");
        const rec = { id, ...data, timestamp: new Date() };
        state.inventoryStockMovements.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryStockMovements.values()).filter((m) => {
          if (where?.tenantId && m.tenantId !== where.tenantId) return false;
          if (where?.itemId && m.itemId !== where.itemId) return false;
          return true;
        });
      },
    },

    inventoryPurchaseRequest: {
      findFirst: async ({ where }: any) => {
        for (const pr of Array.from(state.inventoryPurchaseRequests.values())) {
          let match = true;
          if (where.id && pr.id !== where.id) match = false;
          if (where.tenantId && pr.tenantId !== where.tenantId) match = false;
          if (where.status && pr.status !== where.status) match = false;
          if (match) return pr;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("pr");
        const rec = { id, ...data, status: data.status || "SUBMITTED", createdAt: new Date(), updatedAt: new Date() };
        state.inventoryPurchaseRequests.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const pr = state.inventoryPurchaseRequests.get(where.id);
        if (!pr) throw new NotFoundError("PurchaseRequest not found");
        const updated = { ...pr, ...cleanUpdateData(data), updatedAt: new Date() };
        state.inventoryPurchaseRequests.set(where.id, updated);
        return updated;
      },
    },

    inventoryPurchaseRequestItem: {
      create: async ({ data }: any) => {
        const id = genId("pri");
        const rec = { id, ...data, createdAt: new Date() };
        state.inventoryPurchaseRequestItems.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryPurchaseRequestItems.values()).filter((i) => {
          if (where?.requestId && i.requestId !== where.requestId) return false;
          return true;
        });
      },
    },

    inventoryPurchaseOrder: {
      findFirst: async ({ where }: any) => {
        for (const po of Array.from(state.inventoryPurchaseOrders.values())) {
          let match = true;
          if (where.id && po.id !== where.id) match = false;
          if (where.tenantId && po.tenantId !== where.tenantId) match = false;
          if (match) {
            const items = Array.from(state.inventoryPurchaseOrderItems.values()).filter(
              (i) => i.purchaseOrderId === po.id || i.orderId === po.id
            );
            return { ...po, items };
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("po");
        const items = data.items?.create
          ? data.items.create.map((i: any) => {
              const poiId = genId("poi");
              const rec = {
                id: poiId,
                ...i,
                purchaseOrderId: id,
                receivedQuantity: new Decimal(0),
                orderedQuantity: new Decimal(i.orderedQuantity),
                createdAt: new Date(),
              };
              state.inventoryPurchaseOrderItems.set(poiId, rec);
              return rec;
            })
          : [];
        const rec = { id, ...data, items, status: data.status || "ISSUED", createdAt: new Date(), updatedAt: new Date() };
        state.inventoryPurchaseOrders.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const po = state.inventoryPurchaseOrders.get(where.id);
        if (!po) throw new NotFoundError("PurchaseOrder not found");
        const updated = { ...po, ...cleanUpdateData(data), updatedAt: new Date() };
        state.inventoryPurchaseOrders.set(where.id, updated);
        return updated;
      },
    },

    inventoryPurchaseOrderItem: {
      findFirst: async ({ where }: any) => {
        for (const poi of Array.from(state.inventoryPurchaseOrderItems.values())) {
          let match = true;
          if (where.id && poi.id !== where.id) match = false;
          if (where.orderId && poi.orderId !== where.orderId && poi.purchaseOrderId !== where.orderId) match = false;
          if (where.purchaseOrderId && poi.purchaseOrderId !== where.purchaseOrderId) match = false;
          if (where.itemId && poi.itemId !== where.itemId) match = false;
          if (match) return poi;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("poi");
        const rec = {
          id,
          ...data,
          purchaseOrderId: data.purchaseOrderId || data.orderId,
          receivedQuantity: new Decimal(0),
          orderedQuantity: new Decimal(data.orderedQuantity),
          createdAt: new Date(),
        };
        state.inventoryPurchaseOrderItems.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const poi = state.inventoryPurchaseOrderItems.get(where.id);
        if (!poi) return null;
        const updated = {
          ...poi,
          ...cleanUpdateData(data),
          receivedQuantity: data.receivedQuantity !== undefined ? new Decimal(data.receivedQuantity) : poi.receivedQuantity,
        };
        state.inventoryPurchaseOrderItems.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryPurchaseOrderItems.values()).filter((i) => {
          if (where?.purchaseOrderId && i.purchaseOrderId !== where.purchaseOrderId && i.orderId !== where.purchaseOrderId)
            return false;
          if (where?.orderId && i.orderId !== where.orderId && i.purchaseOrderId !== where.orderId) return false;
          return true;
        });
      },
    },

    inventoryReceipt: {
      findFirst: async ({ where }: any) => {
        for (const r of Array.from(state.inventoryReceipts.values())) {
          let match = true;
          if (where.id && r.id !== where.id) match = false;
          if (where.tenantId && r.tenantId !== where.tenantId) match = false;
          if (match) return r;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("rcv");
        const rec = { id, ...data, createdAt: new Date() };
        state.inventoryReceipts.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryReceipts.values()).filter((r) => {
          if (where?.tenantId && r.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    inventoryReceiptItem: {
      create: async ({ data }: any) => {
        const id = genId("rcvi");
        const rec = { id, ...data };
        state.inventoryReceiptItems.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryReceiptItems.values()).filter((i) => {
          if (where?.receiptId && i.receiptId !== where.receiptId) return false;
          return true;
        });
      },
    },

    inventoryIssue: {
      create: async ({ data }: any) => {
        const id = genId("iss");
        const rec = { id, ...data, createdAt: new Date() };
        state.inventoryIssues.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryIssues.values()).filter((i) => {
          if (where?.tenantId && i.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    inventoryIssueItem: {
      create: async ({ data }: any) => {
        const id = genId("issi");
        const rec = { id, ...data };
        state.inventoryIssueItems.set(id, rec);
        return rec;
      },
    },

    inventoryTransfer: {
      findFirst: async ({ where }: any) => {
        for (const t of Array.from(state.inventoryTransfers.values())) {
          let match = true;
          if (where.id && t.id !== where.id) match = false;
          if (where.tenantId && t.tenantId !== where.tenantId) match = false;
          if (match) {
            const items = Array.from(state.inventoryTransferItems.values()).filter(
              (i) => i.transferId === t.id
            );
            const destinationWarehouse = state.inventoryWarehouses.get(t.destinationWarehouseId) || null;
            const sourceWarehouse = state.inventoryWarehouses.get(t.sourceWarehouseId) || null;
            return { ...t, items, destinationWarehouse, sourceWarehouse };
          }
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryTransfers.values()).filter((t) => {
          if (where?.tenantId && t.tenantId !== where.tenantId) return false;
          return true;
        }).map((t) => ({
          ...t,
          items: Array.from(state.inventoryTransferItems.values()).filter((i) => i.transferId === t.id),
        }));
      },
      create: async ({ data }: any) => {
        const id = genId("trf");
        const items = data.items?.create
          ? data.items.create.map((i: any) => {
              const trfiId = genId("trfi");
              const rec = {
                id: trfiId,
                ...i,
                transferId: id,
                createdAt: new Date(),
              };
              state.inventoryTransferItems.set(trfiId, rec);
              return rec;
            })
          : [];
        const rec = { id, ...data, items, status: data.status || "IN_TRANSIT", createdAt: new Date(), updatedAt: new Date() };
        state.inventoryTransfers.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const t = state.inventoryTransfers.get(where.id);
        if (!t) throw new NotFoundError("Transfer not found");
        const updated = { ...t, ...cleanUpdateData(data), updatedAt: new Date() };
        state.inventoryTransfers.set(where.id, updated);
        return updated;
      },
    },

    inventoryTransferItem: {
      create: async ({ data }: any) => {
        const id = genId("trfi");
        const rec = { id, ...data };
        state.inventoryTransferItems.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryTransferItems.values()).filter((i) => {
          if (where?.transferId && i.transferId !== where.transferId) return false;
          return true;
        });
      },
    },

    inventoryAdjustment: {
      create: async ({ data }: any) => {
        const id = genId("adj");
        const rec = { id, ...data, createdAt: new Date() };
        state.inventoryAdjustments.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryAdjustments.values()).filter((a) => {
          if (where?.tenantId && a.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    inventoryAdjustmentItem: {
      create: async ({ data }: any) => {
        const id = genId("adji");
        const rec = { id, ...data };
        state.inventoryAdjustmentItems.set(id, rec);
        return rec;
      },
    },

    inventoryReservation: {
      findFirst: async ({ where }: any) => {
        for (const r of Array.from(state.inventoryReservations.values())) {
          let match = true;
          if (where.id && r.id !== where.id) match = false;
          if (where.tenantId && r.tenantId !== where.tenantId) match = false;
          if (where.status && r.status !== where.status) match = false;
          if (match) return r;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("res");
        const rec = { id, ...data, status: data.status || "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
        state.inventoryReservations.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const r = state.inventoryReservations.get(where.id);
        if (!r) throw new NotFoundError("Reservation not found");
        const updated = { ...r, ...cleanUpdateData(data), updatedAt: new Date() };
        state.inventoryReservations.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryReservations.values()).filter((r) => {
          if (where?.tenantId && r.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    inventoryReorderRule: {
      findFirst: async ({ where }: any) => {
        for (const r of Array.from(state.inventoryReorderRules.values())) {
          let match = true;
          if (where.id && r.id !== where.id) match = false;
          if (where.tenantId && r.tenantId !== where.tenantId) match = false;
          if (where.itemId && r.itemId !== where.itemId) match = false;
          if (where.warehouseId && r.warehouseId !== where.warehouseId) match = false;
          if (match) return r;
        }
        return null;
      },
      upsert: async ({ where, create, update }: any) => {
        let existing = null;
        for (const r of Array.from(state.inventoryReorderRules.values())) {
          if (r.warehouseId === where.warehouseId_itemId.warehouseId && r.itemId === where.warehouseId_itemId.itemId) {
            existing = r;
            break;
          }
        }
        if (existing) {
          const updated = { ...existing, ...update };
          state.inventoryReorderRules.set(existing.id, updated);
          return updated;
        } else {
          const id = genId("ror");
          const rec = { id, ...create, active: true, createdAt: new Date() };
          state.inventoryReorderRules.set(id, rec);
          return rec;
        }
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.inventoryReorderRules.values()).filter((r) => {
          if (where?.tenantId && r.tenantId !== where.tenantId) return false;
          if (where?.active !== undefined && r.active !== where.active) return false;
          return true;
        });
      },
    },

    // ------------------------------------------------------------------------
    // FIXED ASSET MODELS
    // ------------------------------------------------------------------------
    assetCategory: {
      findFirst: async ({ where }: any) => {
        for (const c of Array.from(state.assetCategories.values())) {
          let match = true;
          if (where.id && c.id !== where.id) match = false;
          if (where.tenantId && c.tenantId !== where.tenantId) match = false;
          if (where.code && c.code !== where.code) match = false;
          if (match) return c;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("astcat");
        const rec = {
          id,
          ...data,
          residualValuePercent: new Decimal(data.residualValuePercent ?? 5),
          usefulLifeMonths: data.usefulLifeMonths ?? 36,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.assetCategories.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.assetCategories.values()).filter((c) => {
          if (where?.tenantId && c.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    asset: {
      findFirst: async ({ where }: any) => {
        for (const a of Array.from(state.assets.values())) {
          let match = true;
          if (where.id && a.id !== where.id) match = false;
          if (where.tenantId && a.tenantId !== where.tenantId) match = false;
          if (where.assetTag && a.assetTag !== where.assetTag) match = false;
          if (where.serialNumber && a.serialNumber !== where.serialNumber) match = false;
          if (where.status && a.status !== where.status) match = false;
          if (match) return a;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("ast");
        const rec = {
          id,
          ...data,
          acquisitionCost: new Decimal(data.acquisitionCost),
          bookValue: new Decimal(data.bookValue ?? data.acquisitionCost),
          residualValue: new Decimal(data.residualValue ?? 0),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.assets.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const a = state.assets.get(where.id);
        if (!a) throw new NotFoundError("Asset not found");
        const updated = {
          ...a,
          ...cleanUpdateData(data),
          bookValue: data.bookValue !== undefined ? new Decimal(data.bookValue) : a.bookValue,
          updatedAt: new Date(),
        };
        state.assets.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.assets.values()).filter((a) => {
          if (where?.tenantId && a.tenantId !== where.tenantId) return false;
          if (where?.status && a.status !== where.status) return false;
          return true;
        });
      },
      count: async ({ where }: any) => {
        return Array.from(state.assets.values()).filter((a) => {
          if (where?.tenantId && a.tenantId !== where.tenantId) return false;
          return true;
        }).length;
      },
    },

    assetAssignment: {
      findFirst: async ({ where }: any) => {
        for (const asgn of Array.from(state.assetAssignments.values())) {
          let match = true;
          if (where.id && asgn.id !== where.id) match = false;
          if (where.tenantId && asgn.tenantId !== where.tenantId) match = false;
          if (where.assetId && asgn.assetId !== where.assetId) match = false;
          if (where.status && asgn.status !== where.status) match = false;
          if (where.assignedToId && asgn.assignedToId !== where.assignedToId) match = false;
          if (match) {
            const asset = state.assets.get(asgn.assetId);
            return { ...asgn, asset };
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("asgn");
        const rec = { id, ...data, status: data.status || "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
        state.assetAssignments.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const asgn = state.assetAssignments.get(where.id);
        if (!asgn) throw new NotFoundError("AssetAssignment not found");
        const updated = { ...asgn, ...cleanUpdateData(data), updatedAt: new Date() };
        state.assetAssignments.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.assetAssignments.values()).filter((asgn) => {
          if (where?.tenantId && asgn.tenantId !== where.tenantId) return false;
          if (where?.assetId && asgn.assetId !== where.assetId) return false;
          if (where?.status && asgn.status !== where.status) return false;
          return true;
        });
      },
    },

    assetReturn: {
      create: async ({ data }: any) => {
        const id = genId("ret");
        const rec = { id, ...data, createdAt: new Date() };
        state.assetReturns.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.assetReturns.values()).filter((r) => {
          if (where?.tenantId && r.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    assetTransfer: {
      create: async ({ data }: any) => {
        const id = genId("asttrf");
        const rec = { id, ...data, createdAt: new Date() };
        state.assetTransfers.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.assetTransfers.values()).filter((t) => {
          if (where?.tenantId && t.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    assetMaintenance: {
      findFirst: async ({ where }: any) => {
        for (const m of Array.from(state.assetMaintenances.values())) {
          let match = true;
          if (where.id && m.id !== where.id) match = false;
          if (where.tenantId && m.tenantId !== where.tenantId) match = false;
          if (where.assetId && m.assetId !== where.assetId) match = false;
          if (where.status && m.status !== where.status) match = false;
          if (match) {
            const asset = state.assets.get(m.assetId);
            return { ...m, asset };
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("maint");
        const rec = { id, ...data, status: data.status || "SCHEDULED", createdAt: new Date(), updatedAt: new Date() };
        state.assetMaintenances.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const m = state.assetMaintenances.get(where.id);
        if (!m) throw new NotFoundError("AssetMaintenance not found");
        const updated = { ...m, ...cleanUpdateData(data), updatedAt: new Date() };
        state.assetMaintenances.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.assetMaintenances.values()).filter((m) => {
          if (where?.tenantId && m.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    assetDisposal: {
      create: async ({ data }: any) => {
        const id = genId("disp");
        const rec = { id, ...data, createdAt: new Date() };
        state.assetDisposals.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.assetDisposals.values()).filter((d) => {
          if (where?.tenantId && d.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    assetDepreciation: {
      findFirst: async ({ where }: any) => {
        for (const d of Array.from(state.assetDepreciations.values())) {
          let match = true;
          if (where.id && d.id !== where.id) match = false;
          if (where.tenantId && d.tenantId !== where.tenantId) match = false;
          if (where.assetId && d.assetId !== where.assetId) match = false;
          if (match) return d;
        }
        return null;
      },
      upsert: async ({ where, create, update }: any) => {
        let existing = null;
        for (const d of Array.from(state.assetDepreciations.values())) {
          if (
            d.assetId === where.tenantId_assetId_fiscalYear_periodNumber?.assetId &&
            d.fiscalYear === where.tenantId_assetId_fiscalYear_periodNumber?.fiscalYear &&
            d.periodNumber === where.tenantId_assetId_fiscalYear_periodNumber?.periodNumber
          ) {
            existing = d;
            break;
          }
        }
        if (existing) {
          const updated = { ...existing, ...update };
          state.assetDepreciations.set(existing.id, updated);
          return updated;
        } else {
          const id = genId("dep");
          const rec = { id, ...create, createdAt: new Date() };
          state.assetDepreciations.set(id, rec);
          return rec;
        }
      },
      create: async ({ data }: any) => {
        const id = genId("dep");
        const rec = {
          id,
          ...data,
          depreciationAmount: new Decimal(data.depreciationAmount),
          accumulatedDepreciation: new Decimal(data.accumulatedDepreciation),
          endingBookValue: new Decimal(data.endingBookValue),
          createdAt: new Date(),
        };
        state.assetDepreciations.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.assetDepreciations.values()).filter((d) => {
          if (where?.tenantId && d.tenantId !== where.tenantId) return false;
          if (where?.assetId && d.assetId !== where.assetId) return false;
          return true;
        });
      },
    },
  };

  return mockDb;
}

// ============================================================================
// STEP 16: CONTROLLED PILOT TEST SUITE
// ============================================================================

describe("STEP 16 — V2 Wave 4 Controlled Production Pilot: Inventory & Assets", () => {
  let db: any;
  let inventoryService: InventoryService;
  let assetService: AssetService;
  let moduleGate: ModuleGate;
  let scopeEvaluator: ScopeEvaluator;

  // Institutional Tenants
  const tenantPilot = "tnt_pilot_dps"; // Delhi Public Academy (Pilot Institution)
  const tenantControl = "tnt_control_dav"; // DAV Centenary Academy (Control Institution)

  // Personas
  const userAdmin = { id: "usr_admin", email: "admin@dps.edu" };
  const userInventoryMgr = { id: "usr_inv_mgr", email: "inv.mgr@dps.edu" };
  const userStoreKeeper = { id: "usr_storekeeper", email: "store@dps.edu" };
  const userProcurement = { id: "usr_procurement", email: "procure@dps.edu" };
  const userAssetMgr = { id: "usr_asset_mgr", email: "asset.mgr@dps.edu" };
  const userTeacher = { id: "usr_teacher", email: "teacher@dps.edu" };

  beforeEach(() => {
    db = createWave4PilotDatabaseStore();
    inventoryService = new InventoryService();
    assetService = new AssetService();
    moduleGate = new ModuleGate();
    scopeEvaluator = new ScopeEvaluator();

    // 1. Seed Tenants
    db._state.tenants.set(tenantPilot, {
      id: tenantPilot,
      slug: "delhi-public-academy",
      name: "Delhi Public Academy",
      status: "ACTIVE",
    });
    db._state.tenants.set(tenantControl, {
      id: tenantControl,
      slug: "dav-centenary-academy",
      name: "DAV Centenary Academy",
      status: "ACTIVE",
    });

    // 2. Seed Module Entitlements: Pilot enabled, Control disabled
    db._state.tenantModuleEntitlements.set(`${tenantPilot}_inventory_module`, {
      tenantId: tenantPilot,
      moduleKey: "inventory_module",
      isEnabled: true,
    });
    db._state.tenantModuleEntitlements.set(`${tenantControl}_inventory_module`, {
      tenantId: tenantControl,
      moduleKey: "inventory_module",
      isEnabled: false,
    });

    // 3. Seed Memberships for Personas
    db._state.tenantMemberships.set(`mem_${userAdmin.id}`, {
      id: `mem_${userAdmin.id}`,
      tenantId: tenantPilot,
      userId: userAdmin.id,
      role: "ADMIN",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userInventoryMgr.id}`, {
      id: `mem_${userInventoryMgr.id}`,
      tenantId: tenantPilot,
      userId: userInventoryMgr.id,
      role: "INVENTORY_MANAGER",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userStoreKeeper.id}`, {
      id: `mem_${userStoreKeeper.id}`,
      tenantId: tenantPilot,
      userId: userStoreKeeper.id,
      role: "STORE_KEEPER",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userProcurement.id}`, {
      id: `mem_${userProcurement.id}`,
      tenantId: tenantPilot,
      userId: userProcurement.id,
      role: "PROCUREMENT_OFFICER",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userAssetMgr.id}`, {
      id: `mem_${userAssetMgr.id}`,
      tenantId: tenantPilot,
      userId: userAssetMgr.id,
      role: "ASSET_MANAGER",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userTeacher.id}`, {
      id: `mem_${userTeacher.id}`,
      tenantId: tenantPilot,
      userId: userTeacher.id,
      role: "TEACHER",
      status: "ACTIVE",
    });

    // 4. Seed Staff Profiles
    db._state.staffProfiles.set("stf_storekeeper", {
      id: "stf_storekeeper",
      tenantId: tenantPilot,
      userId: userStoreKeeper.id,
      employeeId: "EMP-STK-01",
    });
    db._state.staffProfiles.set("stf_teacher", {
      id: "stf_teacher",
      tenantId: tenantPilot,
      userId: userTeacher.id,
      employeeId: "EMP-TCH-01",
    });
  });

  // ==========================================================================
  // SECTION 1: MODULE ENTITLEMENT & 4-LAYER AUTHORIZATION
  // ==========================================================================
  describe("Section 1: Module Entitlement & 4-Layer Authorization", () => {
    it("should allow Pilot tenant when inventory_module is enabled", async () => {
      const isEnabled = await moduleGate.isModuleEnabled(tenantPilot, "inventory_module", db);
      expect(isEnabled).toBe(true);
      await expect(moduleGate.assertModuleEnabled(tenantPilot, "inventory_module", db)).resolves.toBeUndefined();
    });

    it("should fail closed with HTTP 402 ModuleDisabledError for Control tenant", async () => {
      const isEnabled = await moduleGate.isModuleEnabled(tenantControl, "inventory_module", db);
      expect(isEnabled).toBe(false);
      await expect(
        moduleGate.assertModuleEnabled(tenantControl, "inventory_module", db)
      ).rejects.toBeInstanceOf(ModuleDisabledError);
    });

    it("should immediately fail closed when entitlement is disabled for Pilot tenant", async () => {
      db._state.tenantModuleEntitlements.set(`${tenantPilot}_inventory_module`, {
        tenantId: tenantPilot,
        moduleKey: "inventory_module",
        isEnabled: false,
      });

      await expect(
        moduleGate.assertModuleEnabled(tenantPilot, "inventory_module", db)
      ).rejects.toBeInstanceOf(ModuleDisabledError);
    });

    it("should enforce AccessScope for STORE_KEEPER (ASSIGNED_ONLY) vs INVENTORY_MANAGER (INSTITUTION_WIDE)", async () => {
      const whManaged = await db.inventoryWarehouse.create({
        data: {
          tenantId: tenantPilot,
          code: "WH-STORE",
          name: "Stationery Store",
          managerStaffId: "stf_storekeeper",
        },
      });

      const assignedScope = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        { permission: "inventory.stock.manage", targetWarehouseId: whManaged.id } as any,
        { tenant: { id: tenantPilot } as any, user: { id: userStoreKeeper.id } as any } as any,
        db
      );
      expect(assignedScope).toBe(true);

      // STORE_KEEPER rejected for unassigned warehouse
      const unassignedScope = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        { permission: "inventory.stock.manage", targetWarehouseId: "wh_unassigned" } as any,
        { tenant: { id: tenantPilot } as any, user: { id: userStoreKeeper.id } as any } as any,
        db
      );
      expect(unassignedScope).toBe(false);
    });
  });

  // ==========================================================================
  // SECTION 2: INVENTORY CATALOG PILOT
  // ==========================================================================
  describe("Section 2: Inventory Catalog Pilot Operations", () => {
    let catStationery: any;
    let catLab: any;
    let catFurniture: any;
    let unitPiece: any;
    let unitBox: any;
    let unitLitre: any;
    let vendorOxford: any;
    let vendorSigma: any;
    let whMain: any;
    let whLab: any;
    let locMainA1: any;

    beforeEach(async () => {
      // 3+ Categories
      catStationery = await inventoryService.createCategory(
        { tenantId: tenantPilot, name: "Stationery", code: "CAT-STAT" },
        db
      );
      catLab = await inventoryService.createCategory(
        { tenantId: tenantPilot, name: "Lab Equipment & Chemicals", code: "CAT-LAB" },
        db
      );
      catFurniture = await inventoryService.createCategory(
        { tenantId: tenantPilot, name: "Furniture", code: "CAT-FURN" },
        db
      );

      // 2+ Units
      unitPiece = await inventoryService.createUnit({ tenantId: tenantPilot, name: "Piece", code: "PCS" }, db);
      unitBox = await inventoryService.createUnit({ tenantId: tenantPilot, name: "Box of 50", code: "BOX-50" }, db);
      unitLitre = await inventoryService.createUnit({ tenantId: tenantPilot, name: "Litre", code: "LTR" }, db);

      // 2+ Vendors
      vendorOxford = await inventoryService.createVendor(
        {
          tenantId: tenantPilot,
          name: "Oxford Stationery Supplies Ltd",
          vendorCode: "VEN-OXFORD",
          email: "sales@oxford.com",
          taxId: "GSTIN-07AAAAA0000A1Z5",
        },
        db
      );
      vendorSigma = await inventoryService.createVendor(
        {
          tenantId: tenantPilot,
          name: "Sigma Science Lab Chemicals",
          vendorCode: "VEN-SIGMA",
          email: "orders@sigmalabs.com",
          taxId: "GSTIN-07BBBBB1111B1Z6",
        },
        db
      );

      // 2+ Warehouses
      whMain = await inventoryService.createWarehouse(
        {
          tenantId: tenantPilot,
          name: "Central School Depot",
          code: "WH-CENTRAL",
          managerStaffId: "stf_storekeeper",
        },
        db
      );
      whLab = await inventoryService.createWarehouse(
        { tenantId: tenantPilot, name: "Science Block Store", code: "WH-SCIENCE" },
        db
      );

      // Locations
      locMainA1 = await inventoryService.createLocation(
        {
          tenantId: tenantPilot,
          warehouseId: whMain.id,
          code: "LOC-A1",
          aisle: "Aisle 1",
          rack: "Bay A",
        },
        db
      );
    });

    it("should create 5+ catalog items with tenant-local uniqueness for SKU and barcode", async () => {
      const itemPens = await inventoryService.createItem(
        {
          tenantId: tenantPilot,
          name: "Blue Ballpoint Pens",
          sku: "SKU-PEN-BLU",
          barcode: "8901234567890",
          categoryId: catStationery.id,
          unitId: unitBox.id,
          reorderThreshold: 10,
          reorderQuantity: 50,
        },
        db
      );

      const itemNotebooks = await inventoryService.createItem(
        {
          tenantId: tenantPilot,
          name: "Ruled Notebooks 200 Pages",
          sku: "SKU-NOTEBOOK-200",
          barcode: "8901234567891",
          categoryId: catStationery.id,
          unitId: unitPiece.id,
          reorderThreshold: 25,
          reorderQuantity: 100,
        },
        db
      );

      const itemFlask = await inventoryService.createItem(
        {
          tenantId: tenantPilot,
          name: "Conical Flask 250ml",
          sku: "SKU-FLASK-250",
          barcode: "8901234567892",
          categoryId: catLab.id,
          unitId: unitPiece.id,
          reorderThreshold: 5,
          reorderQuantity: 20,
        },
        db
      );

      const itemAcid = await inventoryService.createItem(
        {
          tenantId: tenantPilot,
          name: "Hydrochloric Acid 1M",
          sku: "SKU-HCL-1M",
          barcode: "8901234567893",
          categoryId: catLab.id,
          unitId: unitLitre.id,
          trackExpiry: true,
          reorderThreshold: 4,
          reorderQuantity: 10,
        },
        db
      );

      const itemDesk = await inventoryService.createItem(
        {
          tenantId: tenantPilot,
          name: "Dual Study Desk Wooden",
          sku: "SKU-DESK-WOOD",
          barcode: "8901234567894",
          categoryId: catFurniture.id,
          unitId: unitPiece.id,
          reorderThreshold: 2,
          reorderQuantity: 10,
        },
        db
      );

      expect(itemPens.id).toBeDefined();
      expect(itemNotebooks.id).toBeDefined();
      expect(itemFlask.id).toBeDefined();
      expect(itemAcid.id).toBeDefined();
      expect(itemDesk.id).toBeDefined();

      // Negative: Duplicate SKU in same tenant fails with ConflictError
      await expect(
        inventoryService.createItem(
          {
            tenantId: tenantPilot,
            name: "Duplicate Pen",
            sku: "SKU-PEN-BLU",
            categoryId: catStationery.id,
            unitId: unitBox.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);

      // Negative: Duplicate Barcode in same tenant fails with ConflictError
      await expect(
        inventoryService.createItem(
          {
            tenantId: tenantPilot,
            name: "Duplicate Barcode Item",
            sku: "SKU-DIFF-PEN",
            barcode: "8901234567890",
            categoryId: catStationery.id,
            unitId: unitBox.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);

      // Tenant-Local Isolation: Control tenant CAN use the same SKU without collision
      const catControl = await inventoryService.createCategory(
        { tenantId: tenantControl, name: "Control Cat", code: "CAT-CTRL" },
        db
      );
      const unitControl = await inventoryService.createUnit(
        { tenantId: tenantControl, name: "Control Unit", code: "UNT-CTRL" },
        db
      );
      const controlItem = await inventoryService.createItem(
        {
          tenantId: tenantControl,
          name: "Blue Pens for DAV",
          sku: "SKU-PEN-BLU",
          categoryId: catControl.id,
          unitId: unitControl.id,
        },
        db
      );
      expect(controlItem.tenantId).toBe(tenantControl);
      expect(controlItem.sku).toBe("SKU-PEN-BLU");
    });

    it("should prevent creating a location in an invalid warehouse or cross-tenant warehouse", async () => {
      await expect(
        inventoryService.createLocation(
          {
            tenantId: tenantControl,
            warehouseId: whMain.id, // belongs to tenantPilot!
            code: "LOC-EVIL",
            aisle: "Malicious Aisle",
          },
          db
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ==========================================================================
  // SECTION 3: PROCUREMENT LIFECYCLE & STOCK RECEIPT
  // ==========================================================================
  describe("Section 3: Procurement & Stock Receiving Invariants", () => {
    let item: any;
    let wh: any;
    let loc: any;
    let vendor: any;

    beforeEach(async () => {
      wh = await inventoryService.createWarehouse({ tenantId: tenantPilot, name: "Central", code: "WH-C" }, db);
      loc = await inventoryService.createLocation({ tenantId: tenantPilot, warehouseId: wh.id, code: "LOC-S1", shelf: "Shelf 1" }, db);
      const cat = await inventoryService.createCategory({ tenantId: tenantPilot, name: "Papers", code: "CAT-P" }, db);
      const unit = await inventoryService.createUnit({ tenantId: tenantPilot, name: "Ream", code: "RM" }, db);
      item = await inventoryService.createItem({ tenantId: tenantPilot, name: "Exam Sheets", sku: "SKU-EXAM-SHT", categoryId: cat.id, unitId: unit.id }, db);
      vendor = await inventoryService.createVendor({ tenantId: tenantPilot, name: "Exam Paper Mart", vendorCode: "VEN-EXAM" }, db);
    });

    it("should execute full requisition -> PO -> Receipt -> Stock Increase flow", async () => {
      // 1. Purchase Request
      const pr = await inventoryService.createPurchaseRequest(
        {
          tenantId: tenantPilot,
          requesterUserId: userTeacher.id,
          department: "Examination Department",
          justification: "Annual Board Examination stock",
          items: [{ itemId: item.id, quantity: 100 }],
        },
        db
      );
      expect(pr.status).toBe("SUBMITTED");

      // 2. Approve Purchase Request
      const approvedPr = await inventoryService.approvePurchaseRequest(tenantPilot, pr.id, userAdmin.id, db);
      expect(approvedPr.status).toBe("APPROVED");

      // 3. Purchase Order
      const po = await inventoryService.createPurchaseOrder(
        {
          tenantId: tenantPilot,
          vendorId: vendor.id,
          notes: `Created from PR: ${pr.id}`,
          items: [{ itemId: item.id, orderedQuantity: 100, unitPrice: 2.5 }],
        },
        db
      );
      expect(po.status).toBe("ISSUED");
      expect(Number(po.totalAmount)).toBe(250.0);

      // 4. Partial Stock Receipt (40 units received)
      const rcvPartial = await inventoryService.receiveStock(
        {
          tenantId: tenantPilot,
          purchaseOrderId: po.id,
          warehouseId: wh.id,
          receivedByUserId: userStoreKeeper.id,
          items: [{ itemId: item.id, purchaseOrderItemId: po.items[0].id, quantityReceived: 40, unitCost: 2.5, locationId: loc.id }],
        },
        db
      );
      expect(rcvPartial.receiptNumber).toBeDefined();

      // Check stock after partial receipt: onHand = 40, available = 40, reserved = 0
      const stockPartial = await inventoryService.getStock(tenantPilot, item.id, wh.id, db);
      expect(Number(stockPartial!.onHand)).toBe(40);
      expect(Number(stockPartial!.available)).toBe(40);
      expect(Number(stockPartial!.reserved)).toBe(0);

      // PO should be PARTIALLY_RECEIVED
      const poAfterPartial = await db.inventoryPurchaseOrder.findFirst({ where: { id: po.id } });
      expect(poAfterPartial.status).toBe("PARTIALLY_RECEIVED");

      // 5. Complete Stock Receipt (remaining 60 units received)
      await inventoryService.receiveStock(
        {
          tenantId: tenantPilot,
          purchaseOrderId: po.id,
          warehouseId: wh.id,
          receivedByUserId: userStoreKeeper.id,
          items: [{ itemId: item.id, purchaseOrderItemId: po.items[0].id, quantityReceived: 60, unitCost: 2.5, locationId: loc.id }],
        },
        db
      );

      const stockFinal = await inventoryService.getStock(tenantPilot, item.id, wh.id, db);
      expect(Number(stockFinal!.onHand)).toBe(100);
      expect(Number(stockFinal!.available)).toBe(100);

      // PO should now be fully RECEIVED
      const poFinal = await db.inventoryPurchaseOrder.findFirst({ where: { id: po.id } });
      expect(poFinal.status).toBe("RECEIVED");

      // Verify outbox domain events were transactionally committed
      const outboxEvents = await db.tenantOutboxEvent.findMany({ where: { tenantId: tenantPilot } });
      expect(outboxEvents.map((e: any) => e.eventType)).toContain("inventory.purchase.request.created");
      expect(outboxEvents.map((e: any) => e.eventType)).toContain("inventory.purchase.request.approved");
      expect(outboxEvents.map((e: any) => e.eventType)).toContain("inventory.purchase.order.created");
      expect(outboxEvents.map((e: any) => e.eventType)).toContain("inventory.stock.received");
    });

    it("should reject negative or zero receipt quantities", async () => {
      await expect(
        inventoryService.receiveStock(
          {
            tenantId: tenantPilot,
            warehouseId: wh.id,
            receivedByUserId: userStoreKeeper.id,
            items: [{ itemId: item.id, quantityReceived: -10, unitCost: 2.5, locationId: loc.id }],
          },
          db
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  // ==========================================================================
  // SECTION 4: STOCK INVARIANTS, ISSUES & CONCURRENCY
  // ==========================================================================
  describe("Section 4: Stock Invariants & Issue Invariants", () => {
    let item: any;
    let wh: any;
    let loc: any;

    beforeEach(async () => {
      wh = await inventoryService.createWarehouse({ tenantId: tenantPilot, name: "Central", code: "WH-C" }, db);
      loc = await inventoryService.createLocation({ tenantId: tenantPilot, warehouseId: wh.id, code: "LOC-S1", shelf: "Shelf 1" }, db);
      const cat = await inventoryService.createCategory({ tenantId: tenantPilot, name: "Stationery", code: "CAT-STAT" }, db);
      const unit = await inventoryService.createUnit({ tenantId: tenantPilot, name: "Piece", code: "PCS" }, db);
      item = await inventoryService.createItem({ tenantId: tenantPilot, name: "Permanent Markers", sku: "SKU-MARKER-BLK", categoryId: cat.id, unitId: unit.id }, db);

      // Receive 20 units
      await inventoryService.receiveStock(
        {
          tenantId: tenantPilot,
          warehouseId: wh.id,
          receivedByUserId: userStoreKeeper.id,
          items: [{ itemId: item.id, quantityReceived: 20, unitCost: 10, locationId: loc.id }],
        },
        db
      );
    });

    it("should maintain available = onHand - reserved invariant", async () => {
      const stock = await inventoryService.getStock(tenantPilot, item.id, wh.id, db);
      expect(Number(stock!.available)).toBe(Number(stock!.onHand) - Number(stock!.reserved));
      expect(Number(stock!.onHand)).toBe(20);
      expect(Number(stock!.available)).toBe(20);
    });

    it("should issue stock successfully when available quantity is sufficient", async () => {
      const issue = await inventoryService.issueStock(
        {
          tenantId: tenantPilot,
          warehouseId: wh.id,
          issuedToType: "DEPARTMENT",
          issuedToId: "Science Department",
          issuedByUserId: userStoreKeeper.id,
          items: [{ itemId: item.id, quantity: 5, locationId: loc.id }],
        },
        db
      );

      expect(issue.issueNumber).toBeDefined();

      const stock = await inventoryService.getStock(tenantPilot, item.id, wh.id, db);
      expect(Number(stock!.onHand)).toBe(15);
      expect(Number(stock!.available)).toBe(15);
      expect(Number(stock!.reserved)).toBe(0);

      // Verify immutable movement record was created
      const movements = await db.inventoryStockMovement.findMany({ where: { tenantId: tenantPilot, itemId: item.id } });
      expect(movements.some((m: any) => m.movementType === "ISSUE" && Number(m.quantity) === 5)).toBe(true);
    });

    it("should reject stock issue exceeding available stock and prevent negative stock", async () => {
      await expect(
        inventoryService.issueStock(
          {
            tenantId: tenantPilot,
            warehouseId: wh.id,
            issuedToType: "STAFF",
            issuedToId: "stf_teacher",
            issuedByUserId: userStoreKeeper.id,
            items: [{ itemId: item.id, quantity: 25, locationId: loc.id }], // 25 > 20 available!
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);

      // Verify stock was NOT decremented
      const stock = await inventoryService.getStock(tenantPilot, item.id, wh.id, db);
      expect(Number(stock!.onHand)).toBe(20);
      expect(Number(stock!.available)).toBe(20);
    });

    it("Concurrency Invariant: two simultaneous issues competing for the final available stock", async () => {
      // Available = 20. Two concurrent issues requesting 15 each.
      const issuePromise1 = inventoryService.issueStock(
        {
          tenantId: tenantPilot,
          warehouseId: wh.id,
          issuedToType: "STAFF",
          issuedToId: "stf_teacher",
          issuedByUserId: userStoreKeeper.id,
          items: [{ itemId: item.id, quantity: 15, locationId: loc.id }],
        },
        db
      );

      const issuePromise2 = inventoryService.issueStock(
        {
          tenantId: tenantPilot,
          warehouseId: wh.id,
          issuedToType: "STAFF",
          issuedToId: "stf_teacher",
          issuedByUserId: userStoreKeeper.id,
          items: [{ itemId: item.id, quantity: 15, locationId: loc.id }],
        },
        db
      );

      const results = await Promise.allSettled([issuePromise1, issuePromise2]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // Exactly ONE must succeed and exactly ONE must fail
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Final stock must be 5 (20 - 15) and never negative
      const stock = await inventoryService.getStock(tenantPilot, item.id, wh.id, db);
      expect(Number(stock!.onHand)).toBe(5);
      expect(Number(stock!.available)).toBe(5);
      expect(Number(stock!.available)).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // SECTION 5: STOCK TRANSFERS & ADJUSTMENTS
  // ==========================================================================
  describe("Section 5: Stock Transfers & Adjustments", () => {
    let item: any;
    let whSource: any;
    let whDest: any;
    let locSource: any;
    let locDest: any;

    beforeEach(async () => {
      whSource = await inventoryService.createWarehouse({ tenantId: tenantPilot, name: "Warehouse A", code: "WH-A" }, db);
      whDest = await inventoryService.createWarehouse({ tenantId: tenantPilot, name: "Warehouse B", code: "WH-B" }, db);
      locSource = await inventoryService.createLocation({ tenantId: tenantPilot, warehouseId: whSource.id, code: "LOC-A", aisle: "Bay 1" }, db);
      locDest = await inventoryService.createLocation({ tenantId: tenantPilot, warehouseId: whDest.id, code: "LOC-B", aisle: "Bay 2" }, db);
      const cat = await inventoryService.createCategory({ tenantId: tenantPilot, name: "Stationery", code: "CAT-STAT" }, db);
      const unit = await inventoryService.createUnit({ tenantId: tenantPilot, name: "Ream", code: "RM" }, db);
      item = await inventoryService.createItem({ tenantId: tenantPilot, name: "A4 Printing Paper", sku: "SKU-PAPER-A4", categoryId: cat.id, unitId: unit.id }, db);

      // Receive 50 units at Warehouse A
      await inventoryService.receiveStock(
        {
          tenantId: tenantPilot,
          warehouseId: whSource.id,
          receivedByUserId: userStoreKeeper.id,
          items: [{ itemId: item.id, quantityReceived: 50, unitCost: 5, locationId: locSource.id }],
        },
        db
      );
    });

    it("should transfer stock between warehouses atomically without duplicating or losing stock", async () => {
      const transfer = await inventoryService.requestTransfer(
        {
          tenantId: tenantPilot,
          sourceWarehouseId: whSource.id,
          destinationWarehouseId: whDest.id,
          requestedByUserId: userStoreKeeper.id,
          items: [{ itemId: item.id, quantity: 30 }],
        },
        db
      );

      expect(transfer.status).toBe("IN_TRANSIT");

      // Source stock: 50 - 30 = 20
      const sourceStock = await inventoryService.getStock(tenantPilot, item.id, whSource.id, db);
      expect(Number(sourceStock!.onHand)).toBe(20);
      expect(Number(sourceStock!.available)).toBe(20);

      // Complete the transfer at destination warehouse
      const receivedTransfer = await inventoryService.receiveTransfer(tenantPilot, transfer.id, userStoreKeeper.id, db);
      expect(receivedTransfer.status).toBe("RECEIVED");

      // Destination stock: 30
      const destStock = await inventoryService.getStock(tenantPilot, item.id, whDest.id, db);
      expect(Number(destStock!.onHand)).toBe(30);
      expect(Number(destStock!.available)).toBe(30);

      // Invariant: Total stock across campus remains 50
      expect(Number(sourceStock!.onHand) + Number(destStock!.onHand)).toBe(50);
    });

    it("should adjust stock with full audit metadata and direction", async () => {
      const adj = await inventoryService.adjustStock(
        {
          tenantId: tenantPilot,
          warehouseId: whSource.id,
          adjustedByUserId: userStoreKeeper.id,
          reason: "Water damage during roof inspection",
          items: [{ itemId: item.id, quantity: 2, direction: "DECREASE", locationId: locSource.id, reason: "Water damage" }],
        },
        db
      );

      expect(adj.adjustmentNumber).toBeDefined();

      const stockAfterAdj = await inventoryService.getStock(tenantPilot, item.id, whSource.id, db);
      expect(Number(stockAfterAdj!.onHand)).toBe(48);
      expect(Number(stockAfterAdj!.available)).toBe(48);

      // Audit log must record action
      const audit = await db.auditLog.findMany({ where: { tenantId: tenantPilot, action: "INVENTORY_STOCK_ADJUSTED" } });
      expect(audit.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SECTION 6: STOCK RESERVATIONS & REORDER RULES
  // ==========================================================================
  describe("Section 6: Stock Reservations & Reorder Rules", () => {
    let item: any;
    let wh: any;
    let loc: any;

    beforeEach(async () => {
      wh = await inventoryService.createWarehouse({ tenantId: tenantPilot, name: "Main", code: "WH-M" }, db);
      loc = await inventoryService.createLocation({ tenantId: tenantPilot, warehouseId: wh.id, code: "LOC-S", shelf: "Shelf" }, db);
      const cat = await inventoryService.createCategory({ tenantId: tenantPilot, name: "Uniforms", code: "CAT-UNI" }, db);
      const unit = await inventoryService.createUnit({ tenantId: tenantPilot, name: "Piece", code: "PCS" }, db);
      item = await inventoryService.createItem(
        {
          tenantId: tenantPilot,
          name: "Graduation Gowns",
          sku: "SKU-GOWN-GRD",
          categoryId: cat.id,
          unitId: unit.id,
          reorderThreshold: 15,
          reorderQuantity: 30,
        },
        db
      );

      // Stock 10 units
      await inventoryService.receiveStock(
        {
          tenantId: tenantPilot,
          warehouseId: wh.id,
          receivedByUserId: userStoreKeeper.id,
          items: [{ itemId: item.id, quantityReceived: 10, unitCost: 20, locationId: loc.id }],
        },
        db
      );

      // Configure reorder rule
      await inventoryService.upsertReorderRule(
        {
          tenantId: tenantPilot,
          warehouseId: wh.id,
          itemId: item.id,
          reorderPoint: 15,
          reorderQuantity: 30,
        },
        db
      );
    });

    it("should hold reservation: increase reserved, decrease available, and release safely", async () => {
      const res = await inventoryService.reserveStock(
        {
          tenantId: tenantPilot,
          warehouseId: wh.id,
          itemId: item.id,
          quantity: 4,
          reservedForType: "EVENT",
          reservedForId: "Convocation 2026",
          reservedByUserId: userTeacher.id,
        },
        db
      );

      expect(res.status).toBe("ACTIVE");

      const stock = await inventoryService.getStock(tenantPilot, item.id, wh.id, db);
      expect(Number(stock!.onHand)).toBe(10);
      expect(Number(stock!.reserved)).toBe(4);
      expect(Number(stock!.available)).toBe(6); // 10 - 4 = 6

      // Release reservation
      const released = await inventoryService.releaseReservation(tenantPilot, res.id, userTeacher.id, db);
      expect(released.status).toBe("RELEASED");

      const stockAfterRelease = await inventoryService.getStock(tenantPilot, item.id, wh.id, db);
      expect(Number(stockAfterRelease!.onHand)).toBe(10);
      expect(Number(stockAfterRelease!.reserved)).toBe(0);
      expect(Number(stockAfterRelease!.available)).toBe(10);
    });

    it("should detect low stock below reorder threshold", async () => {
      const lowStockAlerts = await inventoryService.getLowStockAlerts(tenantPilot, db);
      expect(lowStockAlerts.some((a: any) => a.rule.itemId === item.id)).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION 7: ASSET REGISTER & LIFECYCLE
  // ==========================================================================
  describe("Section 7: Fixed Asset Register & Lifecycle Invariants", () => {
    let catIT: any;
    let catLabApparatus: any;

    beforeEach(async () => {
      catIT = await assetService.createCategory(
        {
          tenantId: tenantPilot,
          name: "Information Technology",
          code: "AST-IT",
          usefulLifeMonths: 36,
          depreciationMethod: "STRAIGHT_LINE",
        },
        db
      );
      catLabApparatus = await assetService.createCategory(
        {
          tenantId: tenantPilot,
          name: "Laboratory Apparatus",
          code: "AST-LAB",
          usefulLifeMonths: 60,
        },
        db
      );
    });

    it("should register 5+ assets with unique asset tags and serial numbers", async () => {
      const laptop = await assetService.createAsset(
        {
          tenantId: tenantPilot,
          assetTag: "AST-DPS-001",
          name: "Dell Latitude 5420 Laptop",
          serialNumber: "SN-DELL-98712",
          categoryId: catIT.id,
          acquisitionCost: 65000.0,
          acquisitionDate: new Date("2026-01-10"),
          condition: "EXCELLENT",
          location: "IT Department - Rack A",
        },
        db
      );

      const projector = await assetService.createAsset(
        {
          tenantId: tenantPilot,
          assetTag: "AST-DPS-002",
          name: "Epson Laser Projector 4K",
          serialNumber: "SN-EPSON-44112",
          categoryId: catIT.id,
          acquisitionCost: 45000.0,
          acquisitionDate: new Date("2026-02-15"),
          condition: "GOOD",
          location: "Audiovisual Room 1",
        },
        db
      );

      const microscope = await assetService.createAsset(
        {
          tenantId: tenantPilot,
          assetTag: "AST-DPS-003",
          name: "Olympus Binocular Microscope",
          serialNumber: "SN-OLYMPUS-0101",
          categoryId: catLabApparatus.id,
          acquisitionCost: 32000.0,
          acquisitionDate: new Date("2026-03-01"),
          condition: "EXCELLENT",
          location: "Biology Lab",
        },
        db
      );

      const smartBoard = await assetService.createAsset(
        {
          tenantId: tenantPilot,
          assetTag: "AST-DPS-004",
          name: "Promethean 75 Interactive Smart Board",
          serialNumber: "SN-PROM-7722",
          categoryId: catIT.id,
          acquisitionCost: 120000.0,
          acquisitionDate: new Date("2026-03-10"),
          condition: "EXCELLENT",
          location: "Classroom 10-A",
        },
        db
      );

      const server = await assetService.createAsset(
        {
          tenantId: tenantPilot,
          assetTag: "AST-DPS-005",
          name: "HP ProLiant Server DL380",
          serialNumber: "SN-HP-DL380-99",
          categoryId: catIT.id,
          acquisitionCost: 250000.0,
          acquisitionDate: new Date("2026-01-05"),
          condition: "EXCELLENT",
          location: "Server Room",
        },
        db
      );

      expect(laptop.status).toBe("ACTIVE");
      expect(projector.status).toBe("ACTIVE");
      expect(microscope.status).toBe("ACTIVE");
      expect(smartBoard.status).toBe("ACTIVE");
      expect(server.status).toBe("ACTIVE");

      // Negative: Duplicate asset tag in same tenant rejected with ConflictError
      await expect(
        assetService.createAsset(
          {
            tenantId: tenantPilot,
            assetTag: "AST-DPS-001",
            name: "Duplicate Tag Laptop",
            categoryId: catIT.id,
            acquisitionCost: 50000.0,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);

      // Tenant-Local Isolation: Control tenant CAN use the same asset tag without collision
      const catControl = await assetService.createCategory(
        { tenantId: tenantControl, name: "DAV Category", code: "AST-DAV-IT" },
        db
      );
      const controlAsset = await assetService.createAsset(
        {
          tenantId: tenantControl,
          assetTag: "AST-DPS-001",
          name: "DAV Laptop with same tag",
          categoryId: catControl.id,
          acquisitionCost: 50000.0,
        },
        db
      );
      expect(controlAsset.tenantId).toBe(tenantControl);
      expect(controlAsset.assetTag).toBe("AST-DPS-001");
    });
  });

  // ==========================================================================
  // SECTION 8: ASSET ASSIGNMENT, RETURN, MAINTENANCE & DISPOSAL
  // ==========================================================================
  describe("Section 8: Asset Custodianship Invariants (Assignment, Return, Maintenance, Disposal)", () => {
    let asset: any;

    beforeEach(async () => {
      const cat = await assetService.createCategory(
        { tenantId: tenantPilot, name: "IT", code: "AST-IT-E" },
        db
      );
      asset = await assetService.createAsset(
        {
          tenantId: tenantPilot,
          assetTag: "AST-EXP-001",
          name: "MacBook Pro M2",
          acquisitionCost: 150000.0,
          categoryId: cat.id,
          condition: "EXCELLENT",
        },
        db
      );
    });

    it("Single Active Custodian Invariant: an asset cannot have two simultaneous active assignments", async () => {
      // 1. Assign to teacher
      const asgn1 = await assetService.assignAsset(
        {
          tenantId: tenantPilot,
          assetId: asset.id,
          assignedToType: "STAFF",
          assignedToId: "stf_teacher",
          conditionOnAssign: "EXCELLENT",
        },
        db
      );
      expect(asgn1.status).toBe("ACTIVE");

      // Verify asset status transitioned to ASSIGNED
      const updatedAsset = await assetService.getAsset(tenantPilot, asset.id, db);
      expect(updatedAsset.status).toBe("ASSIGNED");

      // 2. Second simultaneous assignment attempt must fail with ConflictError
      await expect(
        assetService.assignAsset(
          {
            tenantId: tenantPilot,
            assetId: asset.id,
            assignedToType: "STAFF",
            assignedToId: "stf_storekeeper",
            conditionOnAssign: "EXCELLENT",
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should process return, update assignment to RETURNED, and restore asset status to ACTIVE", async () => {
      // Assign
      const asgn = await assetService.assignAsset(
        {
          tenantId: tenantPilot,
          assetId: asset.id,
          assignedToType: "STAFF",
          assignedToId: "stf_teacher",
        },
        db
      );

      // Return
      const ret = await assetService.returnAsset(
        {
          tenantId: tenantPilot,
          assignmentId: asgn.id,
          condition: "GOOD",
          notes: "End of academic term return",
        },
        db
      );
      expect(ret.id).toBeDefined();

      const restoredAsset = await assetService.getAsset(tenantPilot, asset.id, db);
      expect(restoredAsset.status).toBe("ACTIVE");
      expect(restoredAsset.condition).toBe("GOOD");

      // Active assignment no longer exists
      const activeAsgn = await db.assetAssignment.findFirst({
        where: { tenantId: tenantPilot, assetId: asset.id, status: "ACTIVE" },
      });
      expect(activeAsgn).toBeNull();
    });

    it("should transition asset through maintenance lifecycle", async () => {
      const maint = await assetService.createMaintenance(
        {
          tenantId: tenantPilot,
          assetId: asset.id,
          maintenanceType: "CORRECTIVE",
          status: "IN_PROGRESS",
          notes: "Screen flickering repair",
          vendorName: "Dell Authorized Service Center",
          cost: 3500.0,
          scheduledDate: new Date(),
        },
        db
      );
      expect(maint.status).toBe("IN_PROGRESS");

      const maintAsset = await assetService.getAsset(tenantPilot, asset.id, db);
      expect(maintAsset.status).toBe("UNDER_MAINTENANCE");

      // Complete maintenance
      const completed = await assetService.completeMaintenance(
        tenantPilot,
        maint.id,
        {
          cost: 3200.0,
          notes: "Display cable replaced",
        },
        db
      );
      expect(completed.status).toBe("COMPLETED");

      const activeAgainAsset = await assetService.getAsset(tenantPilot, asset.id, db);
      expect(activeAgainAsset.status).toBe("ACTIVE");
    });

    it("should perform soft disposal without physical deletion and set bookValue to 0", async () => {
      const disp = await assetService.disposeAsset(
        {
          tenantId: tenantPilot,
          assetId: asset.id,
          disposalType: "SCRAP",
          reason: "Severe liquid spill motherboard failure",
          actorUserId: userAdmin.id,
          proceedsAmount: 0,
        },
        db
      );

      expect(disp.id).toBeDefined();

      const disposedAsset = await assetService.getAsset(tenantPilot, asset.id, db);
      expect(disposedAsset.status).toBe("DISPOSED");
      expect(Number(disposedAsset.bookValue)).toBe(0);

      // Asset record MUST still exist in database
      const rawAsset = await db.asset.findFirst({ where: { id: asset.id } });
      expect(rawAsset).not.toBeNull();

      // Negative: Attempting to dispose an already disposed asset fails
      await expect(
        assetService.disposeAsset(
          {
            tenantId: tenantPilot,
            assetId: asset.id,
            disposalType: "SALE",
            reason: "Attempt second disposal",
            actorUserId: userAdmin.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  // ==========================================================================
  // SECTION 9: STRAIGHT-LINE DEPRECIATION CALCULATION
  // ==========================================================================
  describe("Section 9: Straight-Line Depreciation Calculation", () => {
    it("should deterministically calculate monthly depreciation and update book value", async () => {
      const cat = await assetService.createCategory(
        { tenantId: tenantPilot, name: "Depreciation Cat", code: "AST-DEP" },
        db
      );

      // Cost: 60,000, Residual: 0, Useful Life: 60 months -> Monthly = 1,000
      const asset = await assetService.createAsset(
        {
          tenantId: tenantPilot,
          assetTag: "AST-DEP-001",
          name: "Computer Lab Workstation",
          acquisitionCost: 60000.0,
          residualValue: 0,
          usefulLifeMonths: 60,
          categoryId: cat.id,
        },
        db
      );

      const depResult = await assetService.calculateDepreciation(
        tenantPilot,
        asset.id,
        "2026-2027",
        1,
        userAdmin.id,
        db
      );

      expect(Number(depResult.depreciationAmount)).toBe(1000.0);
      expect(Number(depResult.accumulatedDepreciation)).toBe(1000.0);
      expect(Number(depResult.endingBookValue)).toBe(59000.0);

      const updatedAsset = await assetService.getAsset(tenantPilot, asset.id, db);
      expect(Number(updatedAsset.bookValue)).toBe(59000.0);
    });
  });

  // ==========================================================================
  // SECTION 10: CROSS-TENANT IDOR & RELATIONAL INTEGRATION BOUNDARIES
  // ==========================================================================
  describe("Section 10: Cross-Tenant IDOR & Relational Security", () => {
    it("should prevent Tenant A from accessing or mutating Tenant B's inventory and asset records", async () => {
      const cat = await inventoryService.createCategory(
        { tenantId: tenantPilot, name: "Pilot Cat", code: "CAT-P1" },
        db
      );
      const unit = await inventoryService.createUnit(
        { tenantId: tenantPilot, name: "Pilot Unit", code: "UNT-P1" },
        db
      );
      const pilotItem = await inventoryService.createItem(
        {
          tenantId: tenantPilot,
          name: "Confidential Pilot Item",
          sku: "SKU-PILOT-CONF",
          categoryId: cat.id,
          unitId: unit.id,
        },
        db
      );

      // Control tenant attempts to fetch Pilot item -> NotFoundError
      await expect(
        inventoryService.getItem(tenantControl, pilotItem.id, db)
      ).rejects.toBeInstanceOf(NotFoundError);

      // Control tenant attempts to issue Pilot item -> ValidationError / NotFoundError
      await expect(
        inventoryService.issueStock(
          {
            tenantId: tenantControl,
            warehouseId: "wh_control",
            issuedToType: "DEPARTMENT",
            issuedByUserId: "usr_ctrl",
            items: [{ itemId: pilotItem.id, quantity: 1 }],
          },
          db
        )
      ).rejects.toThrow();

      const astCat = await assetService.createCategory(
        { tenantId: tenantPilot, name: "Pilot Ast Cat", code: "AST-P1" },
        db
      );
      const pilotAsset = await assetService.createAsset(
        {
          tenantId: tenantPilot,
          assetTag: "AST-PILOT-SECRET",
          name: "Pilot Server",
          acquisitionCost: 100000.0,
          categoryId: astCat.id,
        },
        db
      );

      // Control tenant attempts to fetch Pilot asset -> NotFoundError
      await expect(
        assetService.getAsset(tenantControl, pilotAsset.id, db)
      ).rejects.toBeInstanceOf(NotFoundError);

      // Control tenant attempts to dispose Pilot asset -> NotFoundError
      await expect(
        assetService.disposeAsset(
          {
            tenantId: tenantControl,
            assetId: pilotAsset.id,
            disposalType: "SCRAP",
            reason: "IDOR Attempt",
            actorUserId: "usr_attacker",
          },
          db
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ==========================================================================
  // SECTION 11: RECONCILIATION & AUDIT VERIFICATION
  // ==========================================================================
  describe("Section 11: Pilot Reconciliation & Audit Integrity", () => {
    it("should reconcile stock movements, non-negative balances, and audit outbox records", async () => {
      // Trigger some inventory and asset actions to ensure logs exist
      const cat = await inventoryService.createCategory(
        { tenantId: tenantPilot, name: "Recon Cat", code: "CAT-RECON" },
        db
      );
      const unit = await inventoryService.createUnit(
        { tenantId: tenantPilot, name: "Recon Unit", code: "UNT-RECON" },
        db
      );
      await inventoryService.createItem(
        {
          tenantId: tenantPilot,
          name: "Recon Item",
          sku: "SKU-RECON",
          categoryId: cat.id,
          unitId: unit.id,
        },
        db
      );

      // Verify all inventory audit logs have tenantId set and no leaks
      const invAudit = await db.auditLog.findMany({ where: { tenantId: tenantPilot } });
      expect(invAudit.length).toBeGreaterThan(0);
      expect(invAudit.every((a: any) => a.tenantId === tenantPilot)).toBe(true);

      // Verify all outbox events have matching tenantId
      const outbox = await db.tenantOutboxEvent.findMany({ where: { tenantId: tenantPilot } });
      expect(outbox.length).toBeGreaterThan(0);
      expect(outbox.every((e: any) => e.tenantId === tenantPilot)).toBe(true);

      // Verify no stock exists where available < 0 or reserved > onHand
      for (const stock of Array.from(db._state.inventoryStocks.values()) as any[]) {
        expect(Number(stock.available)).toBeGreaterThanOrEqual(0);
        expect(Number(stock.reserved)).toBeLessThanOrEqual(Number(stock.onHand));
        expect(Number(stock.available)).toBe(Number(stock.onHand) - Number(stock.reserved));
      }
    });
  });
});
