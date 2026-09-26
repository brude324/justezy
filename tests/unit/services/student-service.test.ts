import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudentService } from "@/lib/services/student-service";
import { ConflictError, NotFoundError } from "@/lib/errors";

describe("StudentService Domain Tests (Step 4E)", () => {
  let service: StudentService;
  let mockDb: any;

  const tenantA = "tnt_student_alpha";

  beforeEach(() => {
    service = new StudentService();
    mockDb = {
      studentProfile: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      studentEnrollment: {
        count: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      studentParentBinding: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockDb)),
    };
  });

  it("should enroll student and create enrollment and audit log", async () => {
    mockDb.studentProfile.findUnique.mockResolvedValue(null);
    mockDb.studentProfile.create.mockResolvedValue({
      id: "stu_1",
      tenantId: tenantA,
      admissionNumber: "ADM-1001",
      fullName: "Aarav Patel",
    });
    mockDb.studentEnrollment.count.mockResolvedValue(10);

    const student = await service.createStudent(
      {
        tenantId: tenantA,
        admissionNumber: "ADM-1001",
        fullName: "Aarav Patel",
        gender: "MALE",
        dateOfBirth: new Date("2012-05-15"),
        classId: "cls_5a",
        academicYearId: "ay_2026",
        actorUserId: "usr_admin",
      },
      mockDb
    );

    expect(student.id).toBe("stu_1");
    expect(mockDb.studentEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: tenantA,
          classId: "cls_5a",
          rollNumber: 11,
        }),
      })
    );
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "STUDENT_ENROLLED",
          actionCategory: "STUDENT",
        }),
      })
    );
  });

  it("should reject duplicate admission number within same tenant", async () => {
    mockDb.studentProfile.findUnique.mockResolvedValue({
      id: "stu_existing",
      tenantId: tenantA,
      admissionNumber: "ADM-1001",
    });

    await expect(
      service.createStudent(
        {
          tenantId: tenantA,
          admissionNumber: "ADM-1001",
          fullName: "Duplicate Student",
          gender: "FEMALE",
          dateOfBirth: new Date("2012-05-15"),
        },
        mockDb
      )
    ).rejects.toThrow(ConflictError);
  });

  it("should soft delete student (status WITHDRAWN) when academic history exists", async () => {
    mockDb.studentProfile.findFirst.mockResolvedValue({
      id: "stu_with_history",
      tenantId: tenantA,
      admissionNumber: "ADM-9999",
      _count: {
        attendanceRecords: 45, // Has critical attendance records!
        examResults: 6,
        submissions: 2,
      },
    });
    mockDb.studentProfile.update.mockResolvedValue({
      id: "stu_with_history",
      status: "WITHDRAWN",
    });

    const res = await service.deleteStudent("stu_with_history", tenantA, "usr_admin", "admin@school.edu", mockDb);
    expect(res.success).toBe(true);
    expect(res.softDeleted).toBe(true);
    expect(mockDb.studentProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "stu_with_history" },
        data: expect.objectContaining({ status: "WITHDRAWN" }),
      })
    );
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "STUDENT_WITHDRAWN",
        }),
      })
    );
  });
});
