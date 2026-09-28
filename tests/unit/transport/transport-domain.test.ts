import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransportService } from "@/lib/services/transport-service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("Transport Domain Operations & Capacity Invariants", () => {
  let transportService: TransportService;
  let mockDb: any;
  let mockTx: any;

  const tenantAlpha = "tnt_alpha_school";
  const tenantBeta = "tnt_beta_academy";

  beforeEach(() => {
    transportService = new TransportService();

    mockTx = {
      transportRoute: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      transportStop: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      transportVehicle: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      transportDriver: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      transportAttendant: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      transportRouteAssignment: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      studentTransportAssignment: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
      transportPass: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      transportIncident: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      studentProfile: {
        findFirst: vi.fn(),
      },
      academicYear: {
        findFirst: vi.fn(),
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
      transportRoute: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      transportStop: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      transportVehicle: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      transportDriver: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      transportAttendant: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      transportRouteAssignment: {
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      studentTransportAssignment: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      transportPass: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      transportIncident: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      studentProfile: {
        findFirst: vi.fn(),
      },
      academicYear: {
        findFirst: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
    };
  });

  describe("Route & Stop Management", () => {
    it("should create route and reject duplicate route code within tenant", async () => {
      mockDb.transportRoute.findUnique.mockResolvedValue(null);
      mockTx.transportRoute.create.mockResolvedValue({
        id: "rt_1",
        tenantId: tenantAlpha,
        routeCode: "RT-01",
        name: "North Campus Express",
      });

      const route = await transportService.createRoute(
        {
          tenantId: tenantAlpha,
          routeCode: "rt-01",
          name: "North Campus Express",
          actorUserId: "usr_coord",
        },
        mockDb
      );

      expect(route.routeCode).toBe("RT-01");
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "TRANSPORT_ROUTE_CREATED" }),
        })
      );

      mockDb.transportRoute.findUnique.mockResolvedValue({ id: "rt_1", routeCode: "RT-01" });
      await expect(
        transportService.createRoute(
          {
            tenantId: tenantAlpha,
            routeCode: "RT-01",
            name: "Duplicate Route",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should create stop and enforce stop sequence uniqueness on route", async () => {
      mockDb.transportRoute.findFirst.mockResolvedValue({ id: "rt_1", tenantId: tenantAlpha });
      mockDb.transportStop.findUnique.mockResolvedValue(null);
      mockTx.transportStop.create.mockResolvedValue({
        id: "stp_1",
        routeId: "rt_1",
        stopName: "Green Park Main Gate",
        sequence: 1,
      });

      const stop = await transportService.createStop(
        {
          tenantId: tenantAlpha,
          routeId: "rt_1",
          stopName: "Green Park Main Gate",
          sequence: 1,
          pickupTime: "07:15",
          dropTime: "15:45",
        },
        mockDb
      );

      expect(stop.sequence).toBe(1);

      mockDb.transportStop.findUnique.mockResolvedValue({ id: "stp_1", sequence: 1 });
      await expect(
        transportService.createStop(
          {
            tenantId: tenantAlpha,
            routeId: "rt_1",
            stopName: "Conflicting Sequence Stop",
            sequence: 1,
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Vehicle Fleet & Route Fleet Assignment", () => {
    it("should create vehicle and reject duplicate registration numbers within tenant", async () => {
      mockDb.transportVehicle.findUnique.mockResolvedValue(null);
      mockTx.transportVehicle.create.mockResolvedValue({
        id: "veh_1",
        tenantId: tenantAlpha,
        registrationNumber: "DL-01-AB-1234",
        capacity: 40,
        status: "ACTIVE",
      });

      const vehicle = await transportService.createVehicle(
        {
          tenantId: tenantAlpha,
          registrationNumber: "dl-01-ab-1234",
          capacity: 40,
        },
        mockDb
      );

      expect(vehicle.registrationNumber).toBe("DL-01-AB-1234");

      mockDb.transportVehicle.findUnique.mockResolvedValue({ id: "veh_1", registrationNumber: "DL-01-AB-1234" });
      await expect(
        transportService.createVehicle(
          {
            tenantId: tenantAlpha,
            registrationNumber: "DL-01-AB-1234",
            capacity: 35,
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should reject vehicle assignment when vehicle is INACTIVE or RETIRED", async () => {
      mockTx.transportRoute.findFirst = vi.fn().mockResolvedValue({
        id: "rt_1",
        tenantId: tenantAlpha,
        active: true,
      });
      mockTx.transportVehicle.findFirst = vi.fn().mockResolvedValue({
        id: "veh_retired",
        tenantId: tenantAlpha,
        registrationNumber: "DL-01-OLD",
        status: "RETIRED",
      });

      await expect(
        transportService.assignRouteFleet(
          {
            tenantId: tenantAlpha,
            routeId: "rt_1",
            vehicleId: "veh_retired",
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Student Transport Assignment & Strict Capacity Enforcement", () => {
    it("should assign student to route, issue digital pass, and decrement remaining seats", async () => {
      mockTx.studentProfile.findFirst.mockResolvedValue({
        id: "stu_1",
        tenantId: tenantAlpha,
        fullName: "Aarav Sharma",
      });
      mockTx.academicYear.findFirst.mockResolvedValue({
        id: "ay_2026",
        tenantId: tenantAlpha,
        endDate: new Date("2027-03-31"),
      });
      mockTx.transportRoute.findFirst.mockResolvedValue({
        id: "rt_1",
        tenantId: tenantAlpha,
        routeCode: "RT-01",
        active: true,
        assignments: [
          {
            active: true,
            vehicle: { id: "veh_1", registrationNumber: "DL-01-BUS-1", capacity: 40 },
          },
        ],
      });
      mockTx.transportStop.findFirst
        .mockResolvedValueOnce({ id: "stp_pickup", routeId: "rt_1", stopName: "Sector 14" })
        .mockResolvedValueOnce({ id: "stp_drop", routeId: "rt_1", stopName: "Main School Gate" });

      mockTx.studentTransportAssignment.findFirst.mockResolvedValue(null); // No existing assignment
      mockTx.studentTransportAssignment.count.mockResolvedValue(25); // 25 currently enrolled out of 40

      mockTx.studentTransportAssignment.create.mockResolvedValue({
        id: "sta_1",
        studentId: "stu_1",
        routeId: "rt_1",
        passNumber: "TP-RT-01-123456",
        status: "ACTIVE",
      });
      mockTx.transportPass.create.mockResolvedValue({
        id: "pass_1",
        passNumber: "TP-RT-01-123456",
        status: "ACTIVE",
      });

      const result = await transportService.assignStudentTransport(
        {
          tenantId: tenantAlpha,
          studentId: "stu_1",
          routeId: "rt_1",
          pickupStopId: "stp_pickup",
          dropStopId: "stp_drop",
          academicYearId: "ay_2026",
          actorUserId: "usr_coord",
        },
        mockDb
      );

      expect(result.assignment.id).toBe("sta_1");
      expect(result.pass?.passNumber).toBe("TP-RT-01-123456");
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "STUDENT_TRANSPORT_ASSIGNED" }),
        })
      );
      expect(mockTx.tenantOutboxEvent.create).toHaveBeenCalled();
    });

    it("should reject student transport assignment when vehicle capacity is reached", async () => {
      mockTx.studentProfile.findFirst.mockResolvedValue({
        id: "stu_41",
        tenantId: tenantAlpha,
      });
      mockTx.academicYear.findFirst.mockResolvedValue({
        id: "ay_2026",
        tenantId: tenantAlpha,
      });
      mockTx.transportRoute.findFirst.mockResolvedValue({
        id: "rt_1",
        tenantId: tenantAlpha,
        routeCode: "RT-01",
        active: true,
        assignments: [
          {
            active: true,
            vehicle: { id: "veh_1", capacity: 40 },
          },
        ],
      });
      mockTx.transportStop.findFirst
        .mockResolvedValueOnce({ id: "stp_pickup", routeId: "rt_1" })
        .mockResolvedValueOnce({ id: "stp_drop", routeId: "rt_1" });

      mockTx.studentTransportAssignment.findFirst.mockResolvedValue(null);
      mockTx.studentTransportAssignment.count.mockResolvedValue(40); // FULL CAPACITY (40/40)!

      await expect(
        transportService.assignStudentTransport(
          {
            tenantId: tenantAlpha,
            studentId: "stu_41",
            routeId: "rt_1",
            pickupStopId: "stp_pickup",
            dropStopId: "stp_drop",
            academicYearId: "ay_2026",
            actorUserId: "usr_coord",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should reject assignment when pickup or drop stop does not belong to the route", async () => {
      mockTx.studentProfile.findFirst.mockResolvedValue({
        id: "stu_1",
        tenantId: tenantAlpha,
      });
      mockTx.academicYear.findFirst.mockResolvedValue({
        id: "ay_2026",
        tenantId: tenantAlpha,
      });
      mockTx.transportRoute.findFirst.mockResolvedValue({
        id: "rt_1",
        tenantId: tenantAlpha,
        routeCode: "RT-01",
        active: true,
        assignments: [{ active: true, vehicle: { capacity: 40 } }],
      });

      // Pickup stop belongs to different route!
      mockTx.transportStop.findFirst.mockResolvedValueOnce(null);

      await expect(
        transportService.assignStudentTransport(
          {
            tenantId: tenantAlpha,
            studentId: "stu_1",
            routeId: "rt_1",
            pickupStopId: "stp_alien_route",
            dropStopId: "stp_drop",
            academicYearId: "ay_2026",
            actorUserId: "usr_coord",
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should reject conflicting active assignment when student is already enrolled on a route", async () => {
      mockTx.studentProfile.findFirst.mockResolvedValue({ id: "stu_1", tenantId: tenantAlpha });
      mockTx.academicYear.findFirst.mockResolvedValue({ id: "ay_2026", tenantId: tenantAlpha });
      mockTx.transportRoute.findFirst.mockResolvedValue({
        id: "rt_2",
        tenantId: tenantAlpha,
        active: true,
        assignments: [{ active: true, vehicle: { capacity: 40 } }],
      });
      mockTx.transportStop.findFirst
        .mockResolvedValueOnce({ id: "stp_1", routeId: "rt_2" })
        .mockResolvedValueOnce({ id: "stp_2", routeId: "rt_2" });

      mockTx.studentTransportAssignment.findFirst.mockResolvedValue({
        id: "sta_active_other_route",
        status: "ACTIVE",
      });

      await expect(
        transportService.assignStudentTransport(
          {
            tenantId: tenantAlpha,
            studentId: "stu_1",
            routeId: "rt_2",
            pickupStopId: "stp_1",
            dropStopId: "stp_2",
            academicYearId: "ay_2026",
            actorUserId: "usr_coord",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should terminate student transport assignment and revoke passes", async () => {
      mockTx.studentTransportAssignment.findFirst.mockResolvedValue({
        id: "sta_1",
        tenantId: tenantAlpha,
        studentId: "stu_1",
        status: "ACTIVE",
        route: { routeCode: "RT-01" },
      });
      mockTx.studentTransportAssignment.update.mockResolvedValue({
        id: "sta_1",
        status: "TERMINATED",
      });

      const terminated = await transportService.terminateStudentAssignment(
        {
          tenantId: tenantAlpha,
          assignmentId: "sta_1",
          reason: "Student moved to self-commute",
          actorUserId: "usr_coord",
        },
        mockDb
      );

      expect(terminated.status).toBe("TERMINATED");
      expect(mockTx.transportPass.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignmentId: "sta_1", status: "ACTIVE" },
          data: { status: "REVOKED" },
        })
      );
      expect(mockTx.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: "transport.student.unassigned" }),
        })
      );
    });
  });

  describe("Transport Incidents", () => {
    it("should record operational incident and emit outbox event", async () => {
      mockDb.transportRoute.findFirst.mockResolvedValue({ id: "rt_1", tenantId: tenantAlpha });
      mockTx.transportIncident.create.mockResolvedValue({
        id: "inc_1",
        tenantId: tenantAlpha,
        severity: "HIGH",
        status: "OPEN",
        description: "Flat tire on Sector 22 bypass",
      });

      const incident = await transportService.recordIncident(
        {
          tenantId: tenantAlpha,
          routeId: "rt_1",
          severity: "HIGH",
          description: "Flat tire on Sector 22 bypass",
          actorUserId: "usr_driver",
        },
        mockDb
      );

      expect(incident.id).toBe("inc_1");
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "TRANSPORT_INCIDENT_RECORDED" }),
        })
      );
      expect(mockTx.tenantOutboxEvent.create).toHaveBeenCalled();
    });

    it("should resolve incident with notes and record audit", async () => {
      mockTx.transportIncident.findFirst.mockResolvedValue({
        id: "inc_1",
        tenantId: tenantAlpha,
        status: "OPEN",
      });
      mockTx.transportIncident.update.mockResolvedValue({
        id: "inc_1",
        status: "RESOLVED",
      });

      const resolved = await transportService.resolveIncident(
        {
          tenantId: tenantAlpha,
          incidentId: "inc_1",
          resolutionNotes: "Tire replaced by roadside assistance. Route resumed.",
          actorUserId: "usr_coord",
        },
        mockDb
      );

      expect(resolved.status).toBe("RESOLVED");
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "TRANSPORT_INCIDENT_RESOLVED" }),
        })
      );
    });
  });
});
