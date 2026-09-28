# STEP 15: V2 Wave 4 — Inventory & Assets Architecture & Specification

## 1. Architecture Overview

V2 Wave 4 introduces the **Inventory & Assets** bounded context to SchoolyardSMS / Justezy. Designed as an institutional resource and durable equipment tracking system for educational campuses, it strictly preserves the platform's foundational multi-tenant identity and authorization stack:

```
Clerk Session (Identity / Authentication only)
  ↓
Application User (PostgreSQL)
  ↓
TenantMembership (Active institutional binding)
  ↓
RBAC (Role + Atomic Permission Catalog)
  ↓
Module Entitlement (inventory_module — default disabled, HTTP 402 on failure)
  ↓
AccessScope Engine (INSTITUTION_WIDE, ASSIGNED_ONLY, SELF_ONLY)
  ↓
Tenant-Scoped Domain Service (InventoryService, AssetService)
  ↓
Target Prisma Client (Composite tenantId-scoped operations)
  ↓
PostgreSQL Database
```

### Bounded Context Boundaries

1. **Inventory**: Consumable and stocked educational goods, lab supplies, chemicals, stationery, uniforms, books-as-stock, and maintenance items. Covers cataloging, vendor management, multi-warehouse storage, bin locations, purchase requisitions, purchase orders, partial/full stock receipts, stock issues, inter-warehouse transfers, physical adjustments, reservations, and reorder policies.
2. **Fixed Assets**: Durable capital goods, IT equipment (laptops, projectors, smart boards), science apparatus, furniture, and campus machinery. Covers asset tagging, serial tracking, single-active-custodian assignments, location transfers, custody returns, scheduled maintenance, straight-line depreciation calculations, and controlled disposals without physical deletion.
3. **Financial Boundary**: Integrates with Wave 1 double-entry financial services (`FeeService`, `PaymentService`, `LedgerService`) for vendor liabilities and asset capitalization without creating parallel subledgers or direct unauthorized general ledger writes.

---

## 2. Database Models (Target Schema Planes 17 & 18)

Extended `prisma/schema.target.prisma` additively with 24 Inventory models and 9 Asset models.

### Plane 17: Inventory Management
- `InventoryCategory`: Hierarchical item categorization (`name`, `code`, `parentId`, `tenantId`).
- `InventoryUnit`: Units of measure (`piece`, `box`, `packet`, `litre`, `kilogram`, `metre`, `set`).
- `InventoryVendor`: Suppliers and contractors (`vendorCode`, `name`, `taxId`, `contactEmail`, `paymentTerms`).
- `InventoryWarehouse`: Institutional storage sites with manager binding (`name`, `code`, `managerStaffId`).
- `InventoryLocation`: Bins, aisles, and shelves within a warehouse (`warehouseId`, `code`, `name`).
- `InventoryItem`: Authoritative catalog (`sku`, `barcode`, `name`, `valuationMethod`, `reorderPoint`, `reorderQty`, `trackLot`, `trackExpiry`).
- `InventoryStock`: Authoritative warehouse/location balance (`onHand`, `reserved`, `available`, `unitCost`).
- `InventoryStockLot`: Lot/batch and expiry tracking (`lotNumber`, `expiryDate`, `quantity`).
- `InventoryStockMovement`: Immutable transactional ledger of stock movements (`RECEIPT`, `ISSUE`, `TRANSFER_OUT`, `TRANSFER_IN`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `RESERVATION`, `RELEASE`, `RETURN`).
- `InventoryPurchaseRequest` & `InventoryPurchaseRequestItem`: Internal requisition workflow (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`, `CONVERTED`).
- `InventoryPurchaseOrder` & `InventoryPurchaseOrderItem`: External procurement orders (`DRAFT`, `ISSUED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`).
- `InventoryReceipt` & `InventoryReceiptItem`: Receiving dock records incrementing stock.
- `InventoryIssue` & `InventoryIssueItem`: Issuing stock to departments, classes, or staff.
- `InventoryTransfer` & `InventoryTransferItem`: Multi-phase inter-warehouse transfers (`DRAFT`, `REQUESTED`, `APPROVED`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED`).
- `InventoryAdjustment` & `InventoryAdjustmentItem`: Audited physical discrepancy adjustments (`INCREASE`, `DECREASE`).
- `InventoryReservation`: Holding stock for planned educational use (`ACTIVE`, `FULFILLED`, `RELEASED`, `EXPIRED`, `CANCELLED`).
- `InventoryReorderRule`: Per-item/warehouse automated threshold monitoring.
- `InventoryValuationSnapshot`: Periodic stock valuation rollups (FIFO, LIFO, WEIGHTED_AVERAGE, STANDARD).

### Plane 18: Fixed Asset Management
- `AssetCategory`: Classification with default useful life and depreciation parameters.
- `Asset`: Authoritative register (`assetTag`, `serialNumber`, `cost`, `bookValue`, `condition`, `status`).
- `AssetComponent`: Sub-assemblies or attached peripherals.
- `AssetAssignment`: Custody tracking to staff, departments, or rooms (`ACTIVE`, `RETURNED`, `TRANSFERRED`).
- `AssetTransfer`: Custody transfer history between assignees and locations.
- `AssetReturn`: Custody check-in with condition verification.
- `AssetMaintenance`: Maintenance events and service history (`REQUESTED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- `AssetDisposal`: Controlled asset retirement records (`SCRAPPED`, `SOLD`, `DONATED`, `LOST`, `DESTROYED`).
- `AssetDepreciation`: Straight-line depreciation schedules and monthly book value rollups.

---

## 3. Inventory Lifecycle

```
[Purchase Requisition]
  DRAFT -> SUBMITTED -> APPROVED -> CONVERTED (to PO)
                              \-> REJECTED / CANCELLED

[Purchase Order]
  DRAFT -> ISSUED -> PARTIALLY_RECEIVED -> RECEIVED
                \-> CANCELLED

[Stock Receiving]
  PO Line Checked -> Receipt Line Recorded -> onHand & available Incremented -> StockMovement Created -> Outbox Emitted

[Stock Issue]
  Availability Check (available >= requested) -> onHand & available Decremented -> StockMovement Created -> Outbox Emitted

[Stock Transfer]
  Warehouse A (onHand & available Decremented) -> IN_TRANSIT -> Warehouse B (onHand & available Incremented)

[Stock Reservation]
  Availability Check -> reserved Incremented, available Decremented -> Invariant Maintained (available = onHand - reserved)
```

---

## 4. Asset Lifecycle

```
[Asset Register]
  DRAFT -> ACTIVE -> ASSIGNED <-> ACTIVE (Returned)
               |        |
               +-> UNDER_MAINTENANCE -> ACTIVE
               |        |
               +-> TRANSFERRED
               |        |
               +-> LOST / DAMAGED
               |
               v
            DISPOSED / RETIRED (Immutable historical record; soft retention)
```

Invariant: An asset may have at most **ONE** active `AssetAssignment` at any given point in time.

---

## 5. Authorization & Permissions

### System Permissions (Plane 17 & Plane 18)
- `inventory.read`, `inventory.create`, `inventory.update`, `inventory.manage`
- `inventory.purchase_request`, `inventory.purchase_approve`, `inventory.purchase_order`
- `inventory.receive`, `inventory.issue`, `inventory.transfer`, `inventory.adjust`
- `inventory.reserve`, `inventory.reorder`, `inventory.export`
- `asset.read`, `asset.create`, `asset.update`, `asset.manage`
- `asset.assign`, `asset.transfer`, `asset.return`, `asset.maintenance`
- `asset.dispose`, `asset.depreciation`, `asset.export`

### System Roles
- `INVENTORY_MANAGER`: Full institutional control over inventory catalog, purchase orders, receipts, transfers, and adjustments.
- `STORE_KEEPER`: Operational warehouse keeper scoped to assigned warehouses (`ASSIGNED_ONLY`).
- `PROCUREMENT_OFFICER`: Requisition approval and vendor purchase order issuance.
- `ASSET_MANAGER`: Asset registration, assignment, maintenance scheduling, and disposal control.

---

## 6. Access Scope

- `INSTITUTION_WIDE`: `INVENTORY_MANAGER`, `ASSET_MANAGER`, `ADMIN`, `PRINCIPAL`.
- `ASSIGNED_ONLY`: `STORE_KEEPER` (restricted to managed warehouses via `warehouse.managerStaffId`).
- `SELF_ONLY`: `STAFF`, `TEACHER` (viewing assets currently assigned to self).

---

## 7. Module Entitlement

- Module Key: `inventory_module`
- Commercial Status: Optional non-core module (default disabled).
- Enforcement: Gated at layout and service layers. When disabled for a tenant, requests fail closed with HTTP 402.

---

## 8. Financial Boundaries

Wave 4 strictly adheres to the architectural invariant that no parallel general ledger or unauthorized journal entries are created:
- Vendor invoices and payments connect via Wave 1 `PaymentService` / `FeeService` or remain documented liabilities.
- Disposals involving cash proceeds are recorded with metadata and route through approved financial payment channels.
- Asset depreciation amounts are calculated and stored as book value metadata without unilateral, non-audited writes to the double-entry `JournalEntry` table.

---

## 9. Audit Events

Auditing uses `AuditActionCategory.INVENTORY` and `AuditActionCategory.ASSET`:
- `inventory.item.created`, `inventory.item.updated`
- `inventory.warehouse.created`
- `inventory.purchase_request.created`, `inventory.purchase_request.approved`
- `inventory.purchase_order.created`
- `inventory.stock.received`, `inventory.stock.issued`, `inventory.stock.transferred`, `inventory.stock.adjusted`, `inventory.stock.reserved`
- `asset.created`, `asset.assigned`, `asset.transferred`, `asset.returned`, `asset.maintenance.created`, `asset.maintenance.completed`, `asset.disposed`

---

## 10. Outbox Events

Committed inside the same database transaction as domain state mutations:
- `inventory.item.created`
- `inventory.purchase.request.created`, `inventory.purchase.request.approved`
- `inventory.purchase.order.created`
- `inventory.stock.received`, `inventory.stock.issued`, `inventory.stock.transferred`, `inventory.stock.adjusted`, `inventory.stock.reserved`
- `inventory.asset.created`, `inventory.asset.assigned`, `inventory.asset.transferred`, `inventory.asset.returned`, `inventory.asset.maintenance.created`, `inventory.asset.maintenance.completed`, `inventory.asset.disposed`

---

## 11. Concurrency Controls & Stock Invariants

1. **Available Stock Invariant**:
   `available = onHand - reserved`
   `available >= 0` (negative available stock strictly prohibited).
2. **Reservation Invariant**:
   `reserved <= onHand`
3. **Atomic Mutual Exclusion**:
   - Stock issues check available quantity inside transaction.
   - Asset assignments reject creation if an active assignment already exists for the asset.
   - Stock transfers decrement source and increment destination atomically.
   - Duplicate receipt completions and double disposals are rejected at the service layer.

---

## 12. Tenant Isolation

All models enforce composite foreign keys containing `tenantId`:
- Multi-tenant cross-referencing between Tenant A and Tenant B entities (e.g. Tenant A item in Tenant B warehouse, Tenant A asset assigned to Tenant B staff) is rejected by tenant verification and database relational integrity.

---

## 13. UI Routes

Module-gated routes under `/inventory` and `/assets` with server-side layout protection:

### Inventory
- `/inventory`
- `/inventory/items`, `/inventory/items/[id]`
- `/inventory/categories`
- `/inventory/vendors`
- `/inventory/warehouses`, `/inventory/warehouses/[id]`
- `/inventory/stock`
- `/inventory/receipts`
- `/inventory/issues`
- `/inventory/transfers`
- `/inventory/adjustments`
- `/inventory/reservations`
- `/inventory/purchase-requests`
- `/inventory/purchase-orders`
- `/inventory/reorder`
- `/inventory/reports`

### Assets
- `/assets`, `/assets/[id]`
- `/assets/categories`
- `/assets/assignments`
- `/assets/transfers`
- `/assets/returns`
- `/assets/maintenance`
- `/assets/disposals`
- `/assets/reports`

---

## 14. Operational Reports

- Stock On Hand & Valuation (FIFO / Weighted Average)
- Low Stock & Reorder Alert Report
- Stock Movement & Consumption Ledger
- Purchase Order Fulfillment Tracking
- Fixed Asset Register & Custody Status
- Asset Maintenance Schedule & Due Dates
- Asset Disposal & Scrapped Equipment Summary
- Straight-Line Depreciation Schedule & Net Book Value
