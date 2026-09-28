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

export interface CreateAssetCategoryInput {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  usefulLifeMonths?: number;
  residualValuePercent?: number | Decimal;
  depreciationMethod?: "STRAIGHT_LINE" | "WRITTEN_DOWN_VALUE" | "NONE";
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateAssetInput {
  tenantId: string;
  assetTag: string;
  serialNumber?: string;
  name: string;
  description?: string;
  categoryId: string;
  vendorId?: string;
  location?: string;
  condition?: "NEW" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
  status?: "DRAFT" | "ACTIVE" | "ASSIGNED" | "UNDER_MAINTENANCE" | "TRANSFERRED" | "LOST" | "DAMAGED" | "DISPOSED" | "RETIRED";
  acquisitionDate?: Date;
  acquisitionCost: number | Decimal;
  usefulLifeMonths?: number;
  residualValue?: number | Decimal;
  warrantyExpiry?: Date;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface AssignAssetInput {
  tenantId: string;
  assetId: string;
  assignedToType: "STAFF" | "DEPARTMENT" | "ROOM" | "STUDENT";
  assignedToId: string;
  expectedReturnDate?: Date;
  conditionOnAssign?: "NEW" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ReturnAssetInput {
  tenantId: string;
  assignmentId: string;
  condition: "NEW" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
  notes?: string;
  returnedByUserId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface TransferAssetInput {
  tenantId: string;
  assetId: string;
  toLocation?: string;
  toAssigneeId?: string;
  reason?: string;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateAssetMaintenanceInput {
  tenantId: string;
  assetId: string;
  maintenanceType?: "PREVENTIVE" | "CORRECTIVE" | "CALIBRATION" | "INSPECTION";
  status?: "REQUESTED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  scheduledDate?: Date;
  vendorName?: string;
  cost?: number | Decimal;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CompleteAssetMaintenanceInput {
  cost?: number | Decimal;
  notes?: string;
  nextScheduledDate?: Date;
  actorUserId?: string;
  actorEmail?: string;
}

export interface DisposeAssetInput {
  tenantId: string;
  assetId: string;
  disposalType?: "SALE" | "SCRAP" | "DONATION" | "WRITE_OFF";
  reason: string;
  proceedsAmount?: number | Decimal;
  buyerName?: string;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class AssetService {
  // --------------------------------------------------------------------------
  // ASSET CATEGORIES
  // --------------------------------------------------------------------------

  async createCategory(input: CreateAssetCategoryInput, db = prismaTarget) {
    const existing = await db.assetCategory.findFirst({
      where: { tenantId: input.tenantId, code: input.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictError(`Asset category code '${input.code}' already exists in tenant`);
    }

    return db.$transaction(async (tx) => {
      const category = await tx.assetCategory.create({
        data: {
          tenantId: input.tenantId,
          name: input.name.trim(),
          code: input.code.trim().toUpperCase(),
          description: input.description,
          usefulLifeMonths: input.usefulLifeMonths ?? 60,
          residualValuePercent: new Decimal(input.residualValuePercent ?? 5.0),
          depreciationMethod: input.depreciationMethod ?? "STRAIGHT_LINE",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ASSET",
          action: "ASSET_CATEGORY_CREATED",
          entityType: "AssetCategory",
          entityId: category.id,
          diffJson: JSON.stringify({ name: category.name, code: category.code }),
        },
      });

      return category;
    });
  }

  async listCategories(tenantId: string, db = prismaTarget) {
    return db.assetCategory.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // ASSET REGISTER
  // --------------------------------------------------------------------------

  async createAsset(input: CreateAssetInput, db = prismaTarget) {
    const existing = await db.asset.findFirst({
      where: { tenantId: input.tenantId, assetTag: input.assetTag.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictError(`Asset tag '${input.assetTag}' already exists in tenant`);
    }

    const category = await db.assetCategory.findFirst({
      where: { id: input.categoryId, tenantId: input.tenantId },
    });
    if (!category) throw new ValidationError("Asset category does not exist in tenant");

    const cost = new Decimal(input.acquisitionCost);
    if (cost.lessThan(0)) throw new ValidationError("Acquisition cost cannot be negative");

    const residual = new Decimal(input.residualValue ?? cost.mul(category.residualValuePercent).div(100));
    const usefulLifeMonths = input.usefulLifeMonths ?? category.usefulLifeMonths;

    return db.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          tenantId: input.tenantId,
          assetTag: input.assetTag.trim().toUpperCase(),
          serialNumber: input.serialNumber?.trim(),
          name: input.name.trim(),
          description: input.description,
          categoryId: input.categoryId,
          vendorId: input.vendorId,
          location: input.location,
          condition: input.condition ?? "GOOD",
          status: input.status ?? "ACTIVE",
          acquisitionDate: input.acquisitionDate ?? new Date(),
          acquisitionCost: cost,
          usefulLifeMonths,
          residualValue: residual,
          bookValue: cost, // initially book value equals acquisition cost
          warrantyExpiry: input.warrantyExpiry,
          notes: input.notes,
        },
        include: { category: true, vendor: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ASSET",
          action: "ASSET_REGISTERED",
          entityType: "Asset",
          entityId: asset.id,
          diffJson: JSON.stringify({ assetTag: asset.assetTag, name: asset.name, cost: cost.toString() }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.asset.created",
        aggregateType: "Asset",
        aggregateId: asset.id,
        payload: { assetId: asset.id, assetTag: asset.assetTag, name: asset.name },
      });

      return asset;
    });
  }

  async getAsset(tenantId: string, id: string, db = prismaTarget) {
    const asset = await db.asset.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        vendor: true,
        components: true,
        assignments: { orderBy: { createdAt: "desc" } },
        transfers: { orderBy: { createdAt: "desc" } },
        maintenances: { orderBy: { createdAt: "desc" } },
        disposals: true,
        depreciations: { orderBy: { calculationDate: "desc" } },
      },
    });
    if (!asset) throw new NotFoundError("Asset not found");
    return asset;
  }

  async listAssets(
    filter: {
      tenantId: string;
      categoryId?: string;
      status?: string;
      location?: string;
      search?: string;
      skip?: number;
      take?: number;
    },
    db = prismaTarget
  ) {
    const where: any = {
      tenantId: filter.tenantId,
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.status ? { status: filter.status as any } : {}),
      ...(filter.location ? { location: { contains: filter.location, mode: "insensitive" } } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: "insensitive" } },
              { assetTag: { contains: filter.search, mode: "insensitive" } },
              { serialNumber: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        include: { category: true, vendor: true },
        orderBy: { createdAt: "desc" },
        skip: filter.skip ?? 0,
        take: filter.take ?? 50,
      }),
      db.asset.count({ where }),
    ]);

    return { assets, total };
  }

  // --------------------------------------------------------------------------
  // ASSET ASSIGNMENTS
  // --------------------------------------------------------------------------

  async assignAsset(input: AssignAssetInput, db = prismaTarget) {
    const asset = await db.asset.findFirst({
      where: { id: input.assetId, tenantId: input.tenantId },
    });
    if (!asset) throw new NotFoundError("Asset not found in tenant");

    if (asset.status === "DISPOSED" || asset.status === "RETIRED") {
      throw new ConflictError(`Cannot assign asset in '${asset.status}' state`);
    }

    // Check if asset is already assigned
    const activeAssignment = await db.assetAssignment.findFirst({
      where: { assetId: input.assetId, tenantId: input.tenantId, status: "ACTIVE" },
    });
    if (activeAssignment) {
      throw new ConflictError(`Asset '${asset.assetTag}' is already assigned to ${activeAssignment.assignedToType}:${activeAssignment.assignedToId}`);
    }

    return db.$transaction(async (tx) => {
      const assignment = await tx.assetAssignment.create({
        data: {
          tenantId: input.tenantId,
          assetId: input.assetId,
          assignedToType: input.assignedToType,
          assignedToId: input.assignedToId,
          expectedReturnDate: input.expectedReturnDate,
          conditionOnAssign: input.conditionOnAssign ?? asset.condition,
          status: "ACTIVE",
          notes: input.notes,
        },
      });

      await tx.asset.update({
        where: { id: input.assetId },
        data: { status: "ASSIGNED" },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ASSET",
          action: "ASSET_ASSIGNED",
          entityType: "AssetAssignment",
          entityId: assignment.id,
          diffJson: JSON.stringify({
            assetTag: asset.assetTag,
            assignedToType: input.assignedToType,
            assignedToId: input.assignedToId,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.asset.assigned",
        aggregateType: "Asset",
        aggregateId: asset.id,
        payload: { assetId: asset.id, assignmentId: assignment.id, assignedTo: input.assignedToId },
      });

      return assignment;
    });
  }

  // --------------------------------------------------------------------------
  // ASSET RETURNS
  // --------------------------------------------------------------------------

  async returnAsset(input: ReturnAssetInput, db = prismaTarget) {
    const assignment = await db.assetAssignment.findFirst({
      where: { id: input.assignmentId, tenantId: input.tenantId },
      include: { asset: true },
    });
    if (!assignment) throw new NotFoundError("Asset assignment not found");
    if (assignment.status !== "ACTIVE") {
      throw new ConflictError("Asset assignment has already been returned");
    }

    return db.$transaction(async (tx) => {
      await tx.assetAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "RETURNED",
          returnDate: new Date(),
          conditionOnReturn: input.condition,
        },
      });

      const assetReturn = await tx.assetReturn.create({
        data: {
          tenantId: input.tenantId,
          assignmentId: assignment.id,
          assetId: assignment.assetId,
          condition: input.condition,
          notes: input.notes,
          returnedByUserId: input.returnedByUserId,
        },
      });

      // Restore asset status to ACTIVE and update condition
      await tx.asset.update({
        where: { id: assignment.assetId },
        data: {
          status: "ACTIVE",
          condition: input.condition,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ASSET",
          action: "ASSET_RETURNED",
          entityType: "AssetReturn",
          entityId: assetReturn.id,
          diffJson: JSON.stringify({
            assetTag: assignment.asset.assetTag,
            conditionOnReturn: input.condition,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.asset.returned",
        aggregateType: "Asset",
        aggregateId: assignment.assetId,
        payload: { assetId: assignment.assetId, returnId: assetReturn.id, condition: input.condition },
      });

      return assetReturn;
    });
  }

  // --------------------------------------------------------------------------
  // ASSET TRANSFERS
  // --------------------------------------------------------------------------

  async transferAsset(input: TransferAssetInput, db = prismaTarget) {
    const asset = await db.asset.findFirst({
      where: { id: input.assetId, tenantId: input.tenantId },
    });
    if (!asset) throw new NotFoundError("Asset not found in tenant");
    if (asset.status === "DISPOSED" || asset.status === "RETIRED") {
      throw new ConflictError(`Cannot transfer asset in '${asset.status}' state`);
    }

    return db.$transaction(async (tx) => {
      const transfer = await tx.assetTransfer.create({
        data: {
          tenantId: input.tenantId,
          assetId: input.assetId,
          fromLocation: asset.location,
          toLocation: input.toLocation,
          toAssigneeId: input.toAssigneeId,
          reason: input.reason,
          actorUserId: input.actorUserId,
          notes: input.notes,
        },
      });

      await tx.asset.update({
        where: { id: input.assetId },
        data: {
          location: input.toLocation ?? asset.location,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ASSET",
          action: "ASSET_TRANSFERRED",
          entityType: "AssetTransfer",
          entityId: transfer.id,
          diffJson: JSON.stringify({
            assetTag: asset.assetTag,
            fromLocation: asset.location,
            toLocation: input.toLocation,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.asset.transferred",
        aggregateType: "Asset",
        aggregateId: asset.id,
        payload: { assetId: asset.id, transferId: transfer.id, toLocation: input.toLocation },
      });

      return transfer;
    });
  }

  // --------------------------------------------------------------------------
  // ASSET MAINTENANCE
  // --------------------------------------------------------------------------

  async createMaintenance(input: CreateAssetMaintenanceInput, db = prismaTarget) {
    const asset = await db.asset.findFirst({
      where: { id: input.assetId, tenantId: input.tenantId },
    });
    if (!asset) throw new NotFoundError("Asset not found in tenant");

    return db.$transaction(async (tx) => {
      const maintenance = await tx.assetMaintenance.create({
        data: {
          tenantId: input.tenantId,
          assetId: input.assetId,
          maintenanceType: input.maintenanceType ?? "PREVENTIVE",
          status: input.status ?? "SCHEDULED",
          scheduledDate: input.scheduledDate,
          vendorName: input.vendorName,
          cost: new Decimal(input.cost ?? 0),
          notes: input.notes,
        },
      });

      // Update asset status if currently in progress
      if (input.status === "IN_PROGRESS") {
        await tx.asset.update({
          where: { id: input.assetId },
          data: { status: "UNDER_MAINTENANCE" },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ASSET",
          action: "ASSET_MAINTENANCE_CREATED",
          entityType: "AssetMaintenance",
          entityId: maintenance.id,
          diffJson: JSON.stringify({ assetTag: asset.assetTag, type: maintenance.maintenanceType }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.asset.maintenance.created",
        aggregateType: "Asset",
        aggregateId: asset.id,
        payload: { assetId: asset.id, maintenanceId: maintenance.id },
      });

      return maintenance;
    });
  }

  async completeMaintenance(
    tenantId: string,
    maintenanceId: string,
    input: CompleteAssetMaintenanceInput,
    db = prismaTarget
  ) {
    const maintenance = await db.assetMaintenance.findFirst({
      where: { id: maintenanceId, tenantId },
      include: { asset: true },
    });
    if (!maintenance) throw new NotFoundError("Maintenance record not found");

    return db.$transaction(async (tx) => {
      const updated = await tx.assetMaintenance.update({
        where: { id: maintenanceId },
        data: {
          status: "COMPLETED",
          completedDate: new Date(),
          cost: input.cost ? new Decimal(input.cost) : maintenance.cost,
          notes: input.notes ?? maintenance.notes,
          nextScheduledDate: input.nextScheduledDate,
        },
      });

      // Restore asset status to ACTIVE
      await tx.asset.update({
        where: { id: maintenance.assetId },
        data: { status: "ACTIVE" },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ASSET",
          action: "ASSET_MAINTENANCE_COMPLETED",
          entityType: "AssetMaintenance",
          entityId: maintenanceId,
          diffJson: JSON.stringify({ assetTag: maintenance.asset.assetTag, cost: updated.cost.toString() }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "inventory.asset.maintenance.completed",
        aggregateType: "Asset",
        aggregateId: maintenance.assetId,
        payload: { assetId: maintenance.assetId, maintenanceId },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // ASSET DISPOSAL
  // --------------------------------------------------------------------------

  async disposeAsset(input: DisposeAssetInput, db = prismaTarget) {
    const asset = await db.asset.findFirst({
      where: { id: input.assetId, tenantId: input.tenantId },
    });
    if (!asset) throw new NotFoundError("Asset not found in tenant");
    if (asset.status === "DISPOSED") {
      throw new ConflictError(`Asset '${asset.assetTag}' is already disposed`);
    }

    return db.$transaction(async (tx) => {
      const disposal = await tx.assetDisposal.create({
        data: {
          tenantId: input.tenantId,
          assetId: input.assetId,
          disposalType: input.disposalType ?? "SCRAP",
          status: "DISPOSED",
          disposalDate: new Date(),
          reason: input.reason,
          approvedByUserId: input.actorUserId,
          approvedAt: new Date(),
          proceedsAmount: new Decimal(input.proceedsAmount ?? 0),
          buyerName: input.buyerName,
          notes: input.notes,
        },
      });

      // Update asset status to DISPOSED, zero book value (preserves history, no physical deletion)
      await tx.asset.update({
        where: { id: input.assetId },
        data: {
          status: "DISPOSED",
          bookValue: new Decimal(0),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ASSET",
          action: "ASSET_DISPOSED",
          entityType: "AssetDisposal",
          entityId: disposal.id,
          diffJson: JSON.stringify({ assetTag: asset.assetTag, disposalType: disposal.disposalType, reason: disposal.reason }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "inventory.asset.disposed",
        aggregateType: "Asset",
        aggregateId: asset.id,
        payload: { assetId: asset.id, disposalId: disposal.id, disposalType: disposal.disposalType },
      });

      return disposal;
    });
  }

  // --------------------------------------------------------------------------
  // ASSET DEPRECIATION CALCULATION & METADATA
  // --------------------------------------------------------------------------

  async calculateDepreciation(
    tenantId: string,
    assetId: string,
    fiscalYear: string,
    periodNumber: number,
    actorUserId?: string,
    db = prismaTarget
  ) {
    const asset = await db.asset.findFirst({
      where: { id: assetId, tenantId },
      include: { category: true },
    });
    if (!asset) throw new NotFoundError("Asset not found");
    if (asset.status === "DISPOSED" || asset.status === "RETIRED") {
      throw new ConflictError("Cannot calculate depreciation on disposed or retired asset");
    }

    // Straight-line monthly depreciation: (AcquisitionCost - ResidualValue) / UsefulLifeMonths
    const depreciableBase = asset.acquisitionCost.sub(asset.residualValue);
    const monthlyDepreciation = depreciableBase.greaterThan(0)
      ? depreciableBase.div(new Decimal(asset.usefulLifeMonths))
      : new Decimal(0);

    const newBookValue = Decimal.max(asset.residualValue, asset.bookValue.sub(monthlyDepreciation));
    const accumulated = asset.acquisitionCost.sub(newBookValue);

    return db.$transaction(async (tx) => {
      const depreciation = await tx.assetDepreciation.upsert({
        where: {
          tenantId_assetId_fiscalYear_periodNumber: {
            tenantId,
            assetId,
            fiscalYear,
            periodNumber,
          },
        },
        create: {
          tenantId,
          assetId,
          fiscalYear,
          periodNumber,
          depreciationAmount: monthlyDepreciation,
          accumulatedDepreciation: accumulated,
          endingBookValue: newBookValue,
        },
        update: {
          depreciationAmount: monthlyDepreciation,
          accumulatedDepreciation: accumulated,
          endingBookValue: newBookValue,
          calculationDate: new Date(),
        },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: { bookValue: newBookValue },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actionCategory: "ASSET",
          action: "ASSET_DEPRECIATION_CALCULATED",
          entityType: "AssetDepreciation",
          entityId: depreciation.id,
          diffJson: JSON.stringify({
            assetTag: asset.assetTag,
            fiscalYear,
            periodNumber,
            depreciationAmount: monthlyDepreciation.toString(),
            endingBookValue: newBookValue.toString(),
          }),
        },
      });

      return depreciation;
    });
  }
}

export const assetService = new AssetService();
