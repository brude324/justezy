import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransportService } from "@/lib/services/transport-service";
import { ConflictError } from "@/lib/errors";

describe("Transport Concurrency & Capacity Limit Invariants", () => {
  let transportService: TransportService;
  const tenantId = "tnt_trans_concurrency";

  beforeEach(() => {
    transportService = new TransportService();
  });

  it("Concurrency 1: Two users simultaneously assign students to the final seat -> capacity invariant strictly enforced", async () => {
    const vehicleCapacity = 40;
    let enrolledCount = 39; // Only 1 seat left!

    const createMockTx = () => ({
      studentProfile: {
        findFirst: vi.fn().mockImplementation(async ({ where }) => ({
          id: where.id,
          tenantId,
          fullName: "Student Candidate",
        })),
      },
      academicYear: {
        findFirst: vi.fn().mockResolvedValue({
          id: "ay_1",
          tenantId,
          endDate: new Date("2027-03-31"),
        }),
      },
      transportRoute: {
        findFirst: vi.fn().mockResolvedValue({
          id: "rt_cap",
          tenantId,
          routeCode: "RT-CAP",
          active: true,
          assignments: [
            {
              active: true,
              vehicle: { id: "veh_1", capacity: vehicleCapacity },
            },
          ],
        }),
      },
      transportStop: {
        findFirst: vi.fn().mockImplementation(async ({ where }) => ({
          id: where.id,
          routeId: "rt_cap",
          stopName: "Stop A",
        })),
      },
      studentTransportAssignment: {
        findFirst: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockImplementation(async () => enrolledCount),
        create: vi.fn().mockImplementation(async ({ data }) => {
          if (enrolledCount >= vehicleCapacity) {
            throw new ConflictError(
              `Vehicle capacity limit of ${vehicleCapacity} reached for route 'RT-CAP'`
            );
          }
          enrolledCount += 1;
          return { id: `sta_${Math.random()}`, ...data };
        }),
      },
      transportPass: {
        create: vi.fn().mockResolvedValue({ id: "pass_1", passNumber: "TP-1" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_1" }),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "obx_1" }),
      },
    });

    const mockDb1 = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(createMockTx())),
    };
    const mockDb2 = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(createMockTx())),
    };

    const req1 = transportService.assignStudentTransport(
      {
        tenantId,
        studentId: "stu_alice",
        routeId: "rt_cap",
        pickupStopId: "stp_1",
        dropStopId: "stp_2",
        academicYearId: "ay_1",
        actorUserId: "usr_coord_1",
      },
      mockDb1 as any
    );

    const req2 = transportService.assignStudentTransport(
      {
        tenantId,
        studentId: "stu_bob",
        routeId: "rt_cap",
        pickupStopId: "stp_1",
        dropStopId: "stp_2",
        academicYearId: "ay_1",
        actorUserId: "usr_coord_2",
      },
      mockDb2 as any
    );

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
    expect(enrolledCount).toBe(40); // exactly at capacity, not 41!
  });
});
