import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";
import { outboxService } from "./outbox-service";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateRouteInput {
  tenantId: string;
  routeCode: string;
  name: string;
  direction?: "INBOUND" | "OUTBOUND" | "BOTH";
  startPoint?: string;
  endPoint?: string;
  operatingDays?: string;
  startTime?: string;
  endTime?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateRouteInput {
  id: string;
  tenantId: string;
  name?: string;
  direction?: "INBOUND" | "OUTBOUND" | "BOTH";
  startPoint?: string;
  endPoint?: string;
  operatingDays?: string;
  startTime?: string;
  endTime?: string;
  active?: boolean;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ListRoutesFilter {
  tenantId: string;
  active?: boolean;
  direction?: "INBOUND" | "OUTBOUND" | "BOTH";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateStopInput {
  tenantId: string;
  routeId: string;
  stopName: string;
  sequence: number;
  latitude?: number | string | Decimal;
  longitude?: number | string | Decimal;
  pickupTime?: string;
  dropTime?: string;
  landmark?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateStopInput {
  id: string;
  tenantId: string;
  stopName?: string;
  sequence?: number;
  latitude?: number | string | Decimal;
  longitude?: number | string | Decimal;
  pickupTime?: string;
  dropTime?: string;
  landmark?: string;
  active?: boolean;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateVehicleInput {
  tenantId: string;
  registrationNumber: string;
  vehicleType?: "BUS" | "VAN" | "MINIBUS" | "CAR" | "OTHER";
  capacity: number;
  status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "RETIRED";
  make?: string;
  model?: string;
  year?: number;
  insurancePolicy?: string;
  insuranceExpiry?: Date;
  fitnessExpiry?: Date;
  permitExpiry?: Date;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateVehicleInput {
  id: string;
  tenantId: string;
  capacity?: number;
  status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "RETIRED";
  make?: string;
  model?: string;
  year?: number;
  insurancePolicy?: string;
  insuranceExpiry?: Date;
  fitnessExpiry?: Date;
  permitExpiry?: Date;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface RegisterDriverInput {
  tenantId: string;
  userId?: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseType?: string;
  licenseExpiry?: Date;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface RegisterAttendantInput {
  tenantId: string;
  userId?: string;
  name: string;
  phone: string;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface AssignRouteFleetInput {
  tenantId: string;
  routeId: string;
  vehicleId: string;
  driverId?: string;
  attendantId?: string;
  shift?: "MORNING" | "AFTERNOON" | "BOTH";
  effectiveFrom?: Date;
  effectiveTo?: Date;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface AssignStudentTransportInput {
  tenantId: string;
  studentId: string;
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
  academicYearId: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  feeStructureId?: string;
  feeAssignmentId?: string;
  issuePass?: boolean;
  actorUserId: string;
  actorEmail?: string;
}

export interface TerminateStudentAssignmentInput {
  tenantId: string;
  assignmentId: string;
  reason?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface IssueTransportPassInput {
  tenantId: string;
  assignmentId: string;
  validFrom?: Date;
  validTo?: Date;
  actorUserId: string;
  actorEmail?: string;
}

export interface RecordIncidentInput {
  tenantId: string;
  routeId?: string;
  vehicleId?: string;
  incidentDate?: Date;
  incidentTime?: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ResolveIncidentInput {
  tenantId: string;
  incidentId: string;
  resolutionNotes: string;
  actorUserId: string;
  actorEmail?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class TransportService {
  // --------------------------------------------------------------------------
  // ROUTES MANAGEMENT
  // --------------------------------------------------------------------------

  async createRoute(input: CreateRouteInput, db = prismaTarget) {
    const routeCode = input.routeCode.trim().toUpperCase();

    const existing = await db.transportRoute.findUnique({
      where: {
        tenantId_routeCode: {
          tenantId: input.tenantId,
          routeCode,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Transport route with code '${routeCode}' already exists in tenant`);
    }

    return await db.$transaction(async (tx) => {
      const route = await tx.transportRoute.create({
        data: {
          tenantId: input.tenantId,
          routeCode,
          name: input.name.trim(),
          direction: input.direction ?? "BOTH",
          startPoint: input.startPoint?.trim(),
          endPoint: input.endPoint?.trim(),
          operatingDays: input.operatingDays ?? "MON,TUE,WED,THU,FRI",
          startTime: input.startTime,
          endTime: input.endTime,
          active: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_ROUTE_CREATED",
          entityType: "TransportRoute",
          entityId: route.id,
          diffJson: JSON.stringify({ routeCode: route.routeCode, name: route.name }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "transport.route.created",
        aggregateType: "TransportRoute",
        aggregateId: route.id,
        payload: {
          routeId: route.id,
          routeCode: route.routeCode,
          name: route.name,
        },
      });

      return route;
    });
  }

  async updateRoute(input: UpdateRouteInput, db = prismaTarget) {
    const route = await db.transportRoute.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });
    if (!route) {
      throw new NotFoundError("Transport route not found in tenant");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.transportRoute.update({
        where: { id: input.id },
        data: {
          name: input.name?.trim() ?? route.name,
          direction: input.direction ?? route.direction,
          startPoint: input.startPoint !== undefined ? input.startPoint?.trim() : route.startPoint,
          endPoint: input.endPoint !== undefined ? input.endPoint?.trim() : route.endPoint,
          operatingDays: input.operatingDays ?? route.operatingDays,
          startTime: input.startTime !== undefined ? input.startTime : route.startTime,
          endTime: input.endTime !== undefined ? input.endTime : route.endTime,
          active: input.active !== undefined ? input.active : route.active,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: input.active === false ? "TRANSPORT_ROUTE_DEACTIVATED" : "TRANSPORT_ROUTE_UPDATED",
          entityType: "TransportRoute",
          entityId: updated.id,
          diffJson: JSON.stringify({
            routeId: updated.id,
            active: updated.active,
          }),
        },
      });

      return updated;
    });
  }

  async getRoute(tenantId: string, routeId: string, db = prismaTarget) {
    const route = await db.transportRoute.findFirst({
      where: { id: routeId, tenantId },
      include: {
        stops: {
          where: { active: true },
          orderBy: { sequence: "asc" },
        },
        assignments: {
          where: { active: true },
          include: {
            vehicle: true,
            driver: true,
            attendant: true,
          },
        },
        studentAssignments: {
          where: { status: "ACTIVE" },
          include: {
            student: true,
            pickupStop: true,
            dropStop: true,
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundError("Transport route not found in tenant");
    }

    return route;
  }

  async listRoutes(filter: ListRoutesFilter, db = prismaTarget) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      tenantId: filter.tenantId,
      ...(filter.active !== undefined ? { active: filter.active } : {}),
      ...(filter.direction ? { direction: filter.direction } : {}),
    };

    if (filter.search) {
      whereClause.OR = [
        { routeCode: { contains: filter.search, mode: "insensitive" } },
        { name: { contains: filter.search, mode: "insensitive" } },
        { startPoint: { contains: filter.search, mode: "insensitive" } },
        { endPoint: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      db.transportRoute.count({ where: whereClause }),
      db.transportRoute.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              stops: { where: { active: true } },
              studentAssignments: { where: { status: "ACTIVE" } },
            },
          },
          assignments: {
            where: { active: true },
            include: { vehicle: true, driver: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { routeCode: "asc" },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // --------------------------------------------------------------------------
  // STOPS MANAGEMENT
  // --------------------------------------------------------------------------

  async createStop(input: CreateStopInput, db = prismaTarget) {
    // Verify route belongs to tenant
    const route = await db.transportRoute.findFirst({
      where: { id: input.routeId, tenantId: input.tenantId },
    });
    if (!route) {
      throw new NotFoundError("Transport route not found in tenant");
    }

    // Check sequence uniqueness for route
    const existing = await db.transportStop.findUnique({
      where: {
        routeId_sequence: {
          routeId: input.routeId,
          sequence: input.sequence,
        },
      },
    });
    if (existing) {
      throw new ConflictError(
        `Stop with sequence ${input.sequence} already exists on this route`
      );
    }

    return await db.$transaction(async (tx) => {
      const stop = await tx.transportStop.create({
        data: {
          tenantId: input.tenantId,
          routeId: input.routeId,
          stopName: input.stopName.trim(),
          sequence: input.sequence,
          latitude: input.latitude !== undefined ? new Decimal(input.latitude.toString()) : null,
          longitude: input.longitude !== undefined ? new Decimal(input.longitude.toString()) : null,
          pickupTime: input.pickupTime,
          dropTime: input.dropTime,
          landmark: input.landmark?.trim(),
          active: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_STOP_CREATED",
          entityType: "TransportStop",
          entityId: stop.id,
          diffJson: JSON.stringify({
            stopId: stop.id,
            routeId: stop.routeId,
            stopName: stop.stopName,
            sequence: stop.sequence,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "transport.stop.created",
        aggregateType: "TransportStop",
        aggregateId: stop.id,
        payload: {
          stopId: stop.id,
          routeId: stop.routeId,
          stopName: stop.stopName,
        },
      });

      return stop;
    });
  }

  async listStops(tenantId: string, routeId: string, db = prismaTarget) {
    const route = await db.transportRoute.findFirst({
      where: { id: routeId, tenantId },
    });
    if (!route) throw new NotFoundError("Transport route not found in tenant");

    return await db.transportStop.findMany({
      where: { tenantId, routeId, active: true },
      orderBy: { sequence: "asc" },
    });
  }

  async reorderStops(
    tenantId: string,
    routeId: string,
    stopSequences: { stopId: string; sequence: number }[],
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const route = await db.transportRoute.findFirst({
      where: { id: routeId, tenantId },
    });
    if (!route) throw new NotFoundError("Route not found in tenant");

    return await db.$transaction(async (tx) => {
      // First assign temporary sequences to avoid unique constraint collision
      for (let i = 0; i < stopSequences.length; i++) {
        await tx.transportStop.update({
          where: { id: stopSequences[i].stopId },
          data: { sequence: 10000 + i },
        });
      }

      // Then assign final sequences
      for (const item of stopSequences) {
        await tx.transportStop.update({
          where: { id: item.stopId },
          data: { sequence: item.sequence },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_STOPS_REORDERED",
          entityType: "TransportRoute",
          entityId: routeId,
        },
      });

      return await tx.transportStop.findMany({
        where: { routeId, active: true },
        orderBy: { sequence: "asc" },
      });
    });
  }

  // --------------------------------------------------------------------------
  // VEHICLE FLEET MANAGEMENT
  // --------------------------------------------------------------------------

  async createVehicle(input: CreateVehicleInput, db = prismaTarget) {
    const registrationNumber = input.registrationNumber.trim().toUpperCase();

    const existing = await db.transportVehicle.findUnique({
      where: {
        tenantId_registrationNumber: {
          tenantId: input.tenantId,
          registrationNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Vehicle with registration number '${registrationNumber}' already exists in tenant`
      );
    }

    if (input.capacity <= 0) {
      throw new ValidationError("Vehicle capacity must be greater than zero");
    }

    return await db.$transaction(async (tx) => {
      const vehicle = await tx.transportVehicle.create({
        data: {
          tenantId: input.tenantId,
          registrationNumber,
          vehicleType: input.vehicleType ?? "BUS",
          capacity: input.capacity,
          status: input.status ?? "ACTIVE",
          make: input.make?.trim(),
          model: input.model?.trim(),
          year: input.year,
          insurancePolicy: input.insurancePolicy?.trim(),
          insuranceExpiry: input.insuranceExpiry,
          fitnessExpiry: input.fitnessExpiry,
          permitExpiry: input.permitExpiry,
          notes: input.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_VEHICLE_CREATED",
          entityType: "TransportVehicle",
          entityId: vehicle.id,
          diffJson: JSON.stringify({
            registrationNumber: vehicle.registrationNumber,
            capacity: vehicle.capacity,
          }),
        },
      });

      return vehicle;
    });
  }

  async updateVehicle(input: UpdateVehicleInput, db = prismaTarget) {
    const vehicle = await db.transportVehicle.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });
    if (!vehicle) {
      throw new NotFoundError("Vehicle not found in tenant");
    }

    if (input.capacity !== undefined && input.capacity <= 0) {
      throw new ValidationError("Vehicle capacity must be greater than zero");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.transportVehicle.update({
        where: { id: input.id },
        data: {
          capacity: input.capacity ?? vehicle.capacity,
          status: input.status ?? vehicle.status,
          make: input.make !== undefined ? input.make?.trim() : vehicle.make,
          model: input.model !== undefined ? input.model?.trim() : vehicle.model,
          year: input.year !== undefined ? input.year : vehicle.year,
          insurancePolicy: input.insurancePolicy !== undefined ? input.insurancePolicy?.trim() : vehicle.insurancePolicy,
          insuranceExpiry: input.insuranceExpiry !== undefined ? input.insuranceExpiry : vehicle.insuranceExpiry,
          fitnessExpiry: input.fitnessExpiry !== undefined ? input.fitnessExpiry : vehicle.fitnessExpiry,
          permitExpiry: input.permitExpiry !== undefined ? input.permitExpiry : vehicle.permitExpiry,
          notes: input.notes !== undefined ? input.notes : vehicle.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_VEHICLE_UPDATED",
          entityType: "TransportVehicle",
          entityId: updated.id,
          diffJson: JSON.stringify({
            vehicleId: updated.id,
            status: updated.status,
            capacity: updated.capacity,
          }),
        },
      });

      return updated;
    });
  }

  async getVehicle(tenantId: string, vehicleId: string, db = prismaTarget) {
    const vehicle = await db.transportVehicle.findFirst({
      where: { id: vehicleId, tenantId },
      include: {
        routeAssignments: {
          where: { active: true },
          include: { route: true, driver: true },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundError("Vehicle not found in tenant");
    }

    return vehicle;
  }

  async listVehicles(tenantId: string, status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "RETIRED", db = prismaTarget) {
    return await db.transportVehicle.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        routeAssignments: {
          where: { active: true },
          include: { route: true },
        },
      },
      orderBy: { registrationNumber: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // DRIVERS & ATTENDANTS
  // --------------------------------------------------------------------------

  async registerDriver(input: RegisterDriverInput, db = prismaTarget) {
    const licenseNumber = input.licenseNumber.trim().toUpperCase();

    const existing = await db.transportDriver.findUnique({
      where: {
        tenantId_licenseNumber: {
          tenantId: input.tenantId,
          licenseNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictError(`Driver with license number '${licenseNumber}' already exists in tenant`);
    }

    // Verify user if provided
    if (input.userId) {
      const user = await db.user.findFirst({ where: { id: input.userId } });
      if (!user) throw new NotFoundError("User account not found");
    }

    return await db.$transaction(async (tx) => {
      const driver = await tx.transportDriver.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          name: input.name.trim(),
          phone: input.phone.trim(),
          licenseNumber,
          licenseType: input.licenseType?.trim(),
          licenseExpiry: input.licenseExpiry,
          status: "ACTIVE",
          notes: input.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_DRIVER_REGISTERED",
          entityType: "TransportDriver",
          entityId: driver.id,
          diffJson: JSON.stringify({ driverId: driver.id, licenseNumber }),
        },
      });

      return driver;
    });
  }

  async listDrivers(tenantId: string, db = prismaTarget) {
    return await db.transportDriver.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }

  async registerAttendant(input: RegisterAttendantInput, db = prismaTarget) {
    if (input.userId) {
      const user = await db.user.findFirst({ where: { id: input.userId } });
      if (!user) throw new NotFoundError("User account not found");
    }

    return await db.$transaction(async (tx) => {
      const attendant = await tx.transportAttendant.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          name: input.name.trim(),
          phone: input.phone.trim(),
          status: "ACTIVE",
          notes: input.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_ATTENDANT_REGISTERED",
          entityType: "TransportAttendant",
          entityId: attendant.id,
        },
      });

      return attendant;
    });
  }

  async listAttendants(tenantId: string, db = prismaTarget) {
    return await db.transportAttendant.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // ROUTE ASSIGNMENTS (ROUTE <-> VEHICLE <-> DRIVER <-> ATTENDANT)
  // --------------------------------------------------------------------------

  async assignRouteFleet(input: AssignRouteFleetInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      // 1. Verify route belongs to tenant
      const route = await tx.transportRoute.findFirst({
        where: { id: input.routeId, tenantId: input.tenantId },
      });
      if (!route) throw new NotFoundError("Route not found in tenant");
      if (!route.active) throw new ValidationError("Cannot assign fleet to an inactive route");

      // 2. Verify vehicle belongs to tenant
      const vehicle = await tx.transportVehicle.findFirst({
        where: { id: input.vehicleId, tenantId: input.tenantId },
      });
      if (!vehicle) throw new NotFoundError("Vehicle not found in tenant");

      // Invariant: Inactive/retired vehicles cannot receive new active assignments
      if (vehicle.status !== "ACTIVE") {
        throw new ValidationError(
          `Vehicle '${vehicle.registrationNumber}' is ${vehicle.status} and cannot be assigned`
        );
      }

      // 3. Verify driver if specified
      if (input.driverId) {
        const driver = await tx.transportDriver.findFirst({
          where: { id: input.driverId, tenantId: input.tenantId },
        });
        if (!driver) throw new NotFoundError("Driver not found in tenant");
        if (driver.status !== "ACTIVE") {
          throw new ValidationError(`Driver '${driver.name}' is ${driver.status}`);
        }
      }

      // 4. Verify attendant if specified
      if (input.attendantId) {
        const attendant = await tx.transportAttendant.findFirst({
          where: { id: input.attendantId, tenantId: input.tenantId },
        });
        if (!attendant) throw new NotFoundError("Attendant not found in tenant");
        if (attendant.status !== "ACTIVE") {
          throw new ValidationError(`Attendant '${attendant.name}' is ${attendant.status}`);
        }
      }

      // Deactivate previous active assignment for this route and shift if any
      await tx.transportRouteAssignment.updateMany({
        where: {
          tenantId: input.tenantId,
          routeId: input.routeId,
          shift: input.shift ?? "BOTH",
          active: true,
        },
        data: { active: false, effectiveTo: new Date() },
      });

      const assignment = await tx.transportRouteAssignment.create({
        data: {
          tenantId: input.tenantId,
          routeId: input.routeId,
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          attendantId: input.attendantId,
          shift: input.shift ?? "BOTH",
          effectiveFrom: input.effectiveFrom ?? new Date(),
          effectiveTo: input.effectiveTo,
          active: true,
          notes: input.notes,
        },
        include: {
          route: true,
          vehicle: true,
          driver: true,
          attendant: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_ROUTE_FLEET_ASSIGNED",
          entityType: "TransportRouteAssignment",
          entityId: assignment.id,
          diffJson: JSON.stringify({
            routeCode: route.routeCode,
            vehicle: vehicle.registrationNumber,
            driverId: input.driverId,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "transport.vehicle.assigned",
        aggregateType: "TransportRouteAssignment",
        aggregateId: assignment.id,
        payload: {
          assignmentId: assignment.id,
          routeId: route.id,
          vehicleId: vehicle.id,
        },
      });

      return assignment;
    });
  }

  // --------------------------------------------------------------------------
  // STUDENT TRANSPORT ASSIGNMENT & CAPACITY ENFORCEMENT
  // --------------------------------------------------------------------------

  /**
   * Assigns student to transport route with strict capacity checking.
   * Concurrency Safe: Enforces capacity inside transactional lock.
   */
  async assignStudentTransport(input: AssignStudentTransportInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      // 1. Verify student profile belongs to tenant
      const student = await tx.studentProfile.findFirst({
        where: { id: input.studentId, tenantId: input.tenantId },
      });
      if (!student) throw new NotFoundError("Student profile not found in tenant");

      // 2. Verify academic year belongs to tenant
      const academicYear = await tx.academicYear.findFirst({
        where: { id: input.academicYearId, tenantId: input.tenantId },
      });
      if (!academicYear) throw new NotFoundError("Academic year not found in tenant");

      // 3. Verify route belongs to tenant and is active
      const route = await tx.transportRoute.findFirst({
        where: { id: input.routeId, tenantId: input.tenantId },
        include: {
          assignments: {
            where: { active: true },
            include: { vehicle: true },
          },
        },
      });
      if (!route) throw new NotFoundError("Transport route not found in tenant");
      if (!route.active) throw new ValidationError("Cannot assign student to an inactive route");

      // 4. Verify pickup and drop stops belong to the assigned route!
      const pickupStop = await tx.transportStop.findFirst({
        where: { id: input.pickupStopId, routeId: input.routeId, tenantId: input.tenantId },
      });
      if (!pickupStop) {
        throw new ValidationError("Pickup stop does not belong to the selected route");
      }

      const dropStop = await tx.transportStop.findFirst({
        where: { id: input.dropStopId, routeId: input.routeId, tenantId: input.tenantId },
      });
      if (!dropStop) {
        throw new ValidationError("Drop stop does not belong to the selected route");
      }

      // 5. Invariant: Student cannot have conflicting active transport assignments for same academic year
      const existingAssignment = await tx.studentTransportAssignment.findFirst({
        where: {
          tenantId: input.tenantId,
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          status: "ACTIVE",
        },
      });
      if (existingAssignment) {
        throw new ConflictError(
          "Student already has an active transport assignment for this academic year. Terminate or modify existing assignment first."
        );
      }

      // 6. Invariant: VEHICLE CAPACITY ENFORCEMENT
      // Active route assignment vehicle determines capacity limit
      const activeFleetAssignment = route.assignments[0];
      if (!activeFleetAssignment || !activeFleetAssignment.vehicle) {
        throw new ValidationError(
          `Route '${route.routeCode}' has no active vehicle assigned. Assign a vehicle before enrolling students.`
        );
      }

      const vehicleCapacity = activeFleetAssignment.vehicle.capacity;

      // Count current active assignments on this route and academic year
      const currentEnrolledCount = await tx.studentTransportAssignment.count({
        where: {
          tenantId: input.tenantId,
          routeId: input.routeId,
          academicYearId: input.academicYearId,
          status: "ACTIVE",
        },
      });

      if (currentEnrolledCount >= vehicleCapacity) {
        throw new ConflictError(
          `Vehicle capacity limit of ${vehicleCapacity} reached for route '${route.routeCode}' (Current active: ${currentEnrolledCount})`
        );
      }

      // 7. Create assignment
      const passNumber = `TP-${route.routeCode}-${Date.now().toString().slice(-6)}`;

      const assignment = await tx.studentTransportAssignment.create({
        data: {
          tenantId: input.tenantId,
          studentId: input.studentId,
          routeId: input.routeId,
          pickupStopId: input.pickupStopId,
          dropStopId: input.dropStopId,
          academicYearId: input.academicYearId,
          effectiveFrom: input.effectiveFrom ?? new Date(),
          effectiveTo: input.effectiveTo,
          status: "ACTIVE",
          feeStructureId: input.feeStructureId,
          feeAssignmentId: input.feeAssignmentId,
          passNumber,
        },
        include: {
          student: true,
          route: true,
          pickupStop: true,
          dropStop: true,
        },
      });

      // 8. Optionally issue digital Transport Pass
      let pass = null;
      if (input.issuePass !== false) {
        pass = await tx.transportPass.create({
          data: {
            tenantId: input.tenantId,
            assignmentId: assignment.id,
            passNumber,
            qrCodeReference: `QR-${passNumber}`,
            validFrom: assignment.effectiveFrom,
            validTo: assignment.effectiveTo ?? academicYear.endDate,
            status: "ACTIVE",
          },
        });
      }

      // 9. Audit & Outbox
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "STUDENT_TRANSPORT_ASSIGNED",
          entityType: "StudentTransportAssignment",
          entityId: assignment.id,
          diffJson: JSON.stringify({
            studentId: input.studentId,
            routeCode: route.routeCode,
            pickupStop: pickupStop.stopName,
            dropStop: dropStop.stopName,
            capacityRemaining: vehicleCapacity - (currentEnrolledCount + 1),
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "transport.student.assigned",
        aggregateType: "StudentTransportAssignment",
        aggregateId: assignment.id,
        payload: {
          assignmentId: assignment.id,
          studentId: input.studentId,
          routeId: input.routeId,
          passNumber,
        },
      });

      logger.info("[TransportService] Student assigned to transport route", {
        tenantId: input.tenantId,
        studentId: input.studentId,
        routeCode: route.routeCode,
        passNumber,
      });

      return { assignment, pass };
    });
  }

  async terminateStudentAssignment(input: TerminateStudentAssignmentInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const assignment = await tx.studentTransportAssignment.findFirst({
        where: { id: input.assignmentId, tenantId: input.tenantId },
        include: { route: true },
      });
      if (!assignment) {
        throw new NotFoundError("Student transport assignment not found in tenant");
      }

      if (assignment.status === "TERMINATED") {
        throw new ValidationError("Assignment is already terminated");
      }

      const updated = await tx.studentTransportAssignment.update({
        where: { id: input.assignmentId },
        data: {
          status: "TERMINATED",
          effectiveTo: new Date(),
        },
      });

      // Revoke associated passes
      await tx.transportPass.updateMany({
        where: { assignmentId: input.assignmentId, status: "ACTIVE" },
        data: { status: "REVOKED" },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "STUDENT_TRANSPORT_TERMINATED",
          entityType: "StudentTransportAssignment",
          entityId: assignment.id,
          diffJson: JSON.stringify({
            studentId: assignment.studentId,
            routeCode: assignment.route.routeCode,
            reason: input.reason,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "transport.student.unassigned",
        aggregateType: "StudentTransportAssignment",
        aggregateId: assignment.id,
        payload: {
          assignmentId: assignment.id,
          studentId: assignment.studentId,
          routeId: assignment.routeId,
        },
      });

      return updated;
    });
  }

  async issueTransportPass(input: IssueTransportPassInput, db = prismaTarget) {
    const assignment = await db.studentTransportAssignment.findFirst({
      where: { id: input.assignmentId, tenantId: input.tenantId },
      include: { academicYear: true },
    });
    if (!assignment) {
      throw new NotFoundError("Transport assignment not found in tenant");
    }
    if (assignment.status !== "ACTIVE") {
      throw new ValidationError("Cannot issue pass for an inactive or terminated transport assignment");
    }

    const passNumber = `TP-${Date.now().toString().slice(-8)}`;

    return await db.$transaction(async (tx) => {
      const pass = await tx.transportPass.create({
        data: {
          tenantId: input.tenantId,
          assignmentId: assignment.id,
          passNumber,
          qrCodeReference: `QR-${passNumber}`,
          validFrom: input.validFrom ?? assignment.effectiveFrom,
          validTo: input.validTo ?? assignment.effectiveTo ?? assignment.academicYear.endDate,
          status: "ACTIVE",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_PASS_ISSUED",
          entityType: "TransportPass",
          entityId: pass.id,
          diffJson: JSON.stringify({ passNumber, assignmentId: assignment.id }),
        },
      });

      return pass;
    });
  }

  // --------------------------------------------------------------------------
  // TRANSPORT INCIDENTS
  // --------------------------------------------------------------------------

  async recordIncident(input: RecordIncidentInput, db = prismaTarget) {
    if (!input.description || input.description.trim().length === 0) {
      throw new ValidationError("Incident description is required");
    }

    if (input.routeId) {
      const route = await db.transportRoute.findFirst({
        where: { id: input.routeId, tenantId: input.tenantId },
      });
      if (!route) throw new NotFoundError("Route not found in tenant");
    }

    if (input.vehicleId) {
      const vehicle = await db.transportVehicle.findFirst({
        where: { id: input.vehicleId, tenantId: input.tenantId },
      });
      if (!vehicle) throw new NotFoundError("Vehicle not found in tenant");
    }

    return await db.$transaction(async (tx) => {
      const incident = await tx.transportIncident.create({
        data: {
          tenantId: input.tenantId,
          routeId: input.routeId,
          vehicleId: input.vehicleId,
          incidentDate: input.incidentDate ?? new Date(),
          incidentTime: input.incidentTime,
          reporterUserId: input.actorUserId,
          severity: input.severity ?? "LOW",
          description: input.description.trim(),
          status: "OPEN",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_INCIDENT_RECORDED",
          entityType: "TransportIncident",
          entityId: incident.id,
          diffJson: JSON.stringify({
            incidentId: incident.id,
            severity: incident.severity,
            routeId: incident.routeId,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "transport.incident.created",
        aggregateType: "TransportIncident",
        aggregateId: incident.id,
        payload: {
          incidentId: incident.id,
          severity: incident.severity,
          routeId: incident.routeId,
        },
      });

      return incident;
    });
  }

  async resolveIncident(input: ResolveIncidentInput, db = prismaTarget) {
    if (!input.resolutionNotes || input.resolutionNotes.trim().length === 0) {
      throw new ValidationError("Resolution notes are required");
    }

    return await db.$transaction(async (tx) => {
      const incident = await tx.transportIncident.findFirst({
        where: { id: input.incidentId, tenantId: input.tenantId },
      });
      if (!incident) throw new NotFoundError("Transport incident not found");

      if (incident.status === "RESOLVED") {
        throw new ValidationError("Incident is already marked as resolved");
      }

      const resolved = await tx.transportIncident.update({
        where: { id: incident.id },
        data: {
          status: "RESOLVED",
          resolutionNotes: input.resolutionNotes.trim(),
          resolvedAt: new Date(),
          resolvedByUserId: input.actorUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "TRANSPORT",
          action: "TRANSPORT_INCIDENT_RESOLVED",
          entityType: "TransportIncident",
          entityId: incident.id,
          diffJson: JSON.stringify({ incidentId: incident.id }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "transport.incident.resolved",
        aggregateType: "TransportIncident",
        aggregateId: incident.id,
        payload: { incidentId: incident.id, resolvedBy: input.actorUserId },
      });

      return resolved;
    });
  }

  async listIncidents(tenantId: string, status?: "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED", db = prismaTarget) {
    return await db.transportIncident.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        route: true,
        vehicle: true,
        reporterUser: true,
        resolvedByUser: true,
      },
      orderBy: { incidentDate: "desc" },
    });
  }

  // --------------------------------------------------------------------------
  // TRANSPORT REPORTING
  // --------------------------------------------------------------------------

  async getTransportReport(tenantId: string, db = prismaTarget) {
    const [
      totalRoutes,
      activeRoutes,
      totalVehicles,
      activeVehicles,
      totalDrivers,
      totalActiveAssignments,
      openIncidents,
      routesWithStats,
    ] = await Promise.all([
      db.transportRoute.count({ where: { tenantId } }),
      db.transportRoute.count({ where: { tenantId, active: true } }),
      db.transportVehicle.count({ where: { tenantId } }),
      db.transportVehicle.count({ where: { tenantId, status: "ACTIVE" } }),
      db.transportDriver.count({ where: { tenantId, status: "ACTIVE" } }),
      db.studentTransportAssignment.count({ where: { tenantId, status: "ACTIVE" } }),
      db.transportIncident.count({ where: { tenantId, status: "OPEN" } }),
      db.transportRoute.findMany({
        where: { tenantId, active: true },
        include: {
          assignments: {
            where: { active: true },
            include: { vehicle: true },
          },
          _count: {
            select: {
              studentAssignments: { where: { status: "ACTIVE" } },
              stops: { where: { active: true } },
            },
          },
        },
      }),
    ]);

    const routeOccupancies = routesWithStats.map((r) => {
      const activeVehicle = r.assignments[0]?.vehicle;
      const capacity = activeVehicle?.capacity ?? 0;
      const enrolled = r._count.studentAssignments;
      const occupancyPercent = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;
      return {
        routeId: r.id,
        routeCode: r.routeCode,
        routeName: r.name,
        vehicleNumber: activeVehicle?.registrationNumber ?? "UNASSIGNED",
        capacity,
        enrolled,
        occupancyPercent,
        stopCount: r._count.stops,
      };
    });

    return {
      totalRoutes,
      activeRoutes,
      totalVehicles,
      activeVehicles,
      totalDrivers,
      totalActiveAssignments,
      openIncidents,
      routeOccupancies,
    };
  }
}

export const transportService = new TransportService();
