import { describe, it, expect, vi, beforeEach } from "vitest";
import { AcademicService } from "@/lib/services/academic-service";
import { ConflictError, NotFoundError } from "@/lib/errors";

describe("AcademicService Domain Tests (Step 4E)", () => {
  let service: AcademicService;
  let mockDb: any;

  const tenantA = "tnt_academic_alpha";
  const tenantB = "tnt_academic_beta";

  beforeEach(() => {
    service = new AcademicService();
    mockDb = {
      subject: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      class: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      timetableLesson: {
        findFirst: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockDb)),
    };
  });

  describe("Subject Management", () => {
    it("should create subject and write audit log", async () => {
      mockDb.subject.findUnique.mockResolvedValue(null);
      mockDb.subject.create.mockResolvedValue({
        id: "sub_math_1",
        tenantId: tenantA,
        name: "Mathematics",
        subjectCode: "MATH-10",
      });

      const subject = await service.createSubject(
        {
          tenantId: tenantA,
          name: "Mathematics",
          subjectCode: "MATH-10",
          actorUserId: "usr_admin",
        },
        mockDb
      );

      expect(subject.id).toBe("sub_math_1");
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "SUBJECT_CREATED",
            entityType: "Subject",
            tenantId: tenantA,
          }),
        })
      );
    });

    it("should reject duplicate subject code within same tenant", async () => {
      mockDb.subject.findUnique.mockResolvedValue({
        id: "sub_existing",
        tenantId: tenantA,
        subjectCode: "MATH-10",
      });

      await expect(
        service.createSubject(
          {
            tenantId: tenantA,
            name: "Mathematics 2",
            subjectCode: "MATH-10",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should enforce delete safety: reject deleting subject with active classes or lessons", async () => {
      mockDb.subject.findFirst.mockResolvedValue({
        id: "sub_math_1",
        tenantId: tenantA,
        name: "Mathematics",
        _count: {
          classSubjects: 2, // Active classes
          lessons: 0,
          examPapers: 0,
          assignments: 0,
        },
      });

      await expect(
        service.deleteSubject("sub_math_1", tenantA, "usr_admin", "admin@school.edu", mockDb)
      ).rejects.toThrow(ConflictError);
    });

    it("should safely delete pristine subject and record audit", async () => {
      mockDb.subject.findFirst.mockResolvedValue({
        id: "sub_french",
        tenantId: tenantA,
        name: "French",
        subjectCode: "FR-01",
        _count: { classSubjects: 0, lessons: 0, examPapers: 0, assignments: 0 },
      });

      const res = await service.deleteSubject("sub_french", tenantA, "usr_admin", "admin@school.edu", mockDb);
      expect(res.success).toBe(true);
      expect(mockDb.subject.delete).toHaveBeenCalledWith({ where: { id: "sub_french" } });
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "SUBJECT_DELETED",
            tenantId: tenantA,
          }),
        })
      );
    });

    it("should reject cross-tenant subject access", async () => {
      // Trying to delete Subject of Tenant B while operating in Tenant A
      mockDb.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteSubject("sub_tenant_b", tenantA, "usr_admin", "admin@school.edu", mockDb)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Class Section Management", () => {
    it("should reject creating duplicate class section in same grade and year", async () => {
      mockDb.class.findFirst.mockResolvedValue({
        id: "cls_10a",
        tenantId: tenantA,
        sectionName: "A",
      });

      await expect(
        service.createClass(
          {
            tenantId: tenantA,
            academicYearId: "ay_2026",
            gradeId: "grd_10",
            sectionName: "A",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should reject deleting class with enrolled students", async () => {
      mockDb.class.findFirst.mockResolvedValue({
        id: "cls_10a",
        tenantId: tenantA,
        sectionName: "A",
        _count: { enrollments: 35, lessons: 0, attendanceRecords: 0, assignments: 0 },
      });

      await expect(
        service.deleteClass("cls_10a", tenantA, "usr_admin", "admin@school.edu", mockDb)
      ).rejects.toThrow(ConflictError);
    });
  });
});
