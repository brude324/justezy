import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttendanceService } from "@/lib/services/attendance-service";
import { ConflictError, NotFoundError } from "@/lib/errors";

describe("AttendanceService Domain Tests (Step 4E)", () => {
  let service: AttendanceService;
  let mockDb: any;

  const tenantA = "tnt_att_alpha";

  beforeEach(() => {
    service = new AttendanceService();
    mockDb = {
      attendanceRecord: {
        upsert: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      attendanceCorrection: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockDb)),
    };
  });

  it("should mark attendance and record audit", async () => {
    mockDb.attendanceRecord.upsert.mockResolvedValue({
      id: "att_rec_1",
      studentId: "stu_1",
      status: "PRESENT",
      date: new Date("2026-09-26T00:00:00.000Z"),
    });

    const record = await service.markAttendance(
      {
        tenantId: tenantA,
        academicYearId: "ay_1",
        classId: "cls_10a",
        studentId: "stu_1",
        date: new Date("2026-09-26"),
        status: "PRESENT",
        markedByUserId: "usr_teacher",
      },
      mockDb
    );

    expect(record.id).toBe("att_rec_1");
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ATTENDANCE_MARKED",
          actionCategory: "ATTENDANCE",
        }),
      })
    );
  });

  it("should submit attendance correction and update record", async () => {
    mockDb.attendanceRecord.findFirst.mockResolvedValue({
      id: "att_rec_1",
      tenantId: tenantA,
      status: "ABSENT",
      isLocked: true,
    });
    mockDb.attendanceCorrection.create.mockResolvedValue({
      id: "cor_1",
      previousStatus: "ABSENT",
      newStatus: "PRESENT",
    });
    mockDb.attendanceRecord.update.mockResolvedValue({
      id: "att_rec_1",
      status: "PRESENT",
    });

    const res = await service.correctAttendance(
      {
        tenantId: tenantA,
        attendanceRecordId: "att_rec_1",
        newStatus: "PRESENT",
        reason: "Student arrived late with valid medical slip",
        requestedByUserId: "usr_teacher",
        approvedByUserId: "usr_principal",
      },
      mockDb
    );

    expect(res.record.status).toBe("PRESENT");
    expect(mockDb.attendanceCorrection.create).toHaveBeenCalled();
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ATTENDANCE_CORRECTED",
        }),
      })
    );
  });

  it("should reject direct deletion of locked attendance record", async () => {
    mockDb.attendanceRecord.findFirst.mockResolvedValue({
      id: "att_locked",
      tenantId: tenantA,
      isLocked: true,
    });

    await expect(
      service.deleteAttendance("att_locked", tenantA, "usr_teacher", "teacher@school.edu", mockDb)
    ).rejects.toThrow(ConflictError);
  });
});
