import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdmissionsService } from "@/lib/services/admissions-service";
import { ValidationError, NotFoundError } from "@/lib/errors";

describe("Student Conversion & Enrollment Boundary Tests", () => {
  let admissionsService: AdmissionsService;
  let mockDb: any;
  const tenantId = "tnt_dps_delhi";

  beforeEach(() => {
    admissionsService = new AdmissionsService();
    mockDb = {
      $transaction: vi.fn(async (cb) => cb(mockDb)),
      admissionApplication: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      applicant: {
        update: vi.fn(),
      },
      studentProfile: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(50),
        create: vi.fn(),
      },
      studentEnrollment: {
        findFirst: vi.fn(),
        count: vi.fn().mockResolvedValue(24),
        create: vi.fn(),
      },
      parentProfile: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      studentParentBinding: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_mock" }),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "outbox_mock" }),
      },
    };
  });

  it("should convert confirmed application to enrolled student, creating StudentProfile, Enrollment, and ParentBinding", async () => {
    const application = {
      id: "appl_conf",
      tenantId,
      status: "CONFIRMED",
      requestedClassId: "cls_10a",
      applicant: {
        id: "app_1",
        fullName: "Aryan Kapoor",
        gender: "MALE",
        dateOfBirth: new Date("2012-04-10"),
        bloodGroup: "O_POSITIVE",
        address: "New Delhi",
        guardianName: "Rajesh Kapoor",
        guardianPhone: "9876543210",
        guardianEmail: "rajesh@example.com",
        guardianRelationship: "FATHER",
      },
      session: {
        id: "ses_1",
        academicYearId: "ay_2026",
      },
      offers: [],
    };

    mockDb.admissionApplication.findFirst.mockResolvedValue(application);
    mockDb.studentProfile.findFirst.mockResolvedValue(null); // No existing student
    mockDb.studentProfile.create.mockResolvedValue({
      id: "stu_aryan",
      admissionNumber: "ADM-2026-00051",
      fullName: "Aryan Kapoor",
    });
    mockDb.studentEnrollment.findFirst.mockResolvedValue(null);
    mockDb.parentProfile.findUnique.mockResolvedValue(null); // No existing parent
    mockDb.parentProfile.create.mockResolvedValue({
      id: "par_rajesh",
      fullName: "Rajesh Kapoor",
      primaryPhone: "9876543210",
    });
    mockDb.studentParentBinding.findUnique.mockResolvedValue(null);
    mockDb.studentProfile.findUnique.mockResolvedValue({
      id: "stu_aryan",
      admissionNumber: "ADM-2026-00051",
      fullName: "Aryan Kapoor",
      enrollments: [{ id: "enr_1", classId: "cls_10a" }],
      guardians: [{ id: "bnd_1", parentId: "par_rajesh" }],
    });

    const enrolled = await admissionsService.admitStudent(
      {
        tenantId,
        applicationId: "appl_conf",
        actorUserId: "usr_admin",
      },
      mockDb
    );

    expect(enrolled?.admissionNumber).toBe("ADM-2026-00051");
    expect(mockDb.studentProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        fullName: "Aryan Kapoor",
        admissionNumber: "ADM-2026-00051",
      }),
    });
    expect(mockDb.studentEnrollment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        studentId: "stu_aryan",
        classId: "cls_10a",
        rollNumber: 25,
      }),
    });
    expect(mockDb.parentProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        primaryPhone: "9876543210",
      }),
    });
    expect(mockDb.studentParentBinding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "stu_aryan",
        parentId: "par_rajesh",
      }),
    });
    expect(mockDb.admissionApplication.update).toHaveBeenCalledWith({
      where: { id: "appl_conf" },
      data: expect.objectContaining({
        status: "ADMITTED",
        studentProfileId: "stu_aryan",
      }),
    });
    expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "admissions.student.admitted",
      }),
    });
  });

  it("should reuse existing ParentProfile when phone number matches", async () => {
    const application = {
      id: "appl_conf_2",
      tenantId,
      status: "CONFIRMED",
      requestedClassId: "cls_8b",
      applicant: {
        id: "app_2",
        fullName: "Pooja Kapoor",
        gender: "FEMALE",
        dateOfBirth: new Date("2014-06-12"),
        guardianName: "Rajesh Kapoor",
        guardianPhone: "9876543210", // Same parent phone as sibling
      },
      session: { academicYearId: "ay_2026" },
      offers: [],
    };

    mockDb.admissionApplication.findFirst.mockResolvedValue(application);
    mockDb.studentProfile.findFirst.mockResolvedValue(null);
    mockDb.studentProfile.create.mockResolvedValue({ id: "stu_pooja" });
    mockDb.studentEnrollment.findFirst.mockResolvedValue(null);
    // Parent ALREADY exists
    mockDb.parentProfile.findUnique.mockResolvedValue({
      id: "par_existing_rajesh",
      primaryPhone: "9876543210",
    });
    mockDb.studentParentBinding.findUnique.mockResolvedValue(null);
    mockDb.studentProfile.findUnique.mockResolvedValue({ id: "stu_pooja" });

    await admissionsService.admitStudent(
      {
        tenantId,
        applicationId: "appl_conf_2",
        actorUserId: "usr_admin",
      },
      mockDb
    );

    // ParentProfile.create should NOT be called
    expect(mockDb.parentProfile.create).not.toHaveBeenCalled();
    // But StudentParentBinding SHOULD be created linking new student to existing parent
    expect(mockDb.studentParentBinding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "stu_pooja",
        parentId: "par_existing_rajesh",
      }),
    });
  });

  it("should be completely idempotent when repeating admission on already admitted application", async () => {
    const application = {
      id: "appl_already_admitted",
      tenantId,
      status: "ADMITTED",
      studentProfileId: "stu_existing_id",
      session: { academicYearId: "ay_2026" },
      offers: [],
      applicant: { fullName: "Aryan Kapoor" },
    };

    mockDb.admissionApplication.findFirst.mockResolvedValue(application);
    const existingStudentProfile = {
      id: "stu_existing_id",
      admissionNumber: "ADM-2026-00051",
      fullName: "Aryan Kapoor",
      enrollments: [{ id: "enr_1" }],
    };
    mockDb.studentProfile.findUnique.mockResolvedValue(existingStudentProfile);

    const result = await admissionsService.admitStudent(
      {
        tenantId,
        applicationId: "appl_already_admitted",
        actorUserId: "usr_admin",
      },
      mockDb
    );

    // Must return existing student profile without creating any new records
    expect(result?.id).toBe("stu_existing_id");
    expect(mockDb.studentProfile.create).not.toHaveBeenCalled();
    expect(mockDb.studentEnrollment.create).not.toHaveBeenCalled();
    expect(mockDb.parentProfile.create).not.toHaveBeenCalled();
  });

  it("should reject student admission if application status is not CONFIRMED", async () => {
    mockDb.admissionApplication.findFirst.mockResolvedValue({
      id: "appl_approved_only",
      tenantId,
      status: "APPROVED", // Not yet confirmed
      offers: [],
      applicant: {},
    });

    await expect(
      admissionsService.admitStudent(
        {
          tenantId,
          applicationId: "appl_approved_only",
          actorUserId: "usr_admin",
        },
        mockDb
      )
    ).rejects.toThrow(ValidationError);
  });
});
