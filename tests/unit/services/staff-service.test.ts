import { describe, it, expect, vi, beforeEach } from "vitest";
import { StaffService } from "@/lib/services/staff-service";
import { ConflictError, NotFoundError } from "@/lib/errors";

describe("StaffService Domain Tests (Step 4E)", () => {
  let service: StaffService;
  let mockDb: any;

  const tenantA = "tnt_staff_alpha";

  beforeEach(() => {
    service = new StaffService();
    mockDb = {
      staffProfile: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockDb)),
    };
  });

  it("should create staff profile and record audit log", async () => {
    mockDb.staffProfile.findUnique.mockResolvedValue(null);
    mockDb.staffProfile.create.mockResolvedValue({
      id: "stf_1",
      tenantId: tenantA,
      employeeId: "EMP-101",
      fullName: "Priya Sen",
    });

    const staff = await service.createStaff(
      {
        tenantId: tenantA,
        userId: "usr_priya",
        membershipId: "mem_priya",
        employeeId: "EMP-101",
        fullName: "Priya Sen",
        gender: "FEMALE",
        designation: "Senior Mathematics Teacher",
        actorUserId: "usr_admin",
      },
      mockDb
    );

    expect(staff.id).toBe("stf_1");
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "STAFF_ONBOARDED",
          actionCategory: "ACADEMIC",
        }),
      })
    );
  });

  it("should reject delete when staff has active class supervision", async () => {
    mockDb.staffProfile.findFirst.mockResolvedValue({
      id: "stf_sup",
      tenantId: tenantA,
      fullName: "Supervising Teacher",
      _count: {
        supervisedClasses: 1, // Active supervisor
        assignedSubjects: 0,
        scheduledLessons: 0,
      },
    });

    await expect(
      service.deleteStaff("stf_sup", tenantA, "usr_admin", "admin@school.edu", mockDb)
    ).rejects.toThrow(ConflictError);
  });
});
