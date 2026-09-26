import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateStudentInput {
  tenantId: string;
  admissionNumber: string;
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: Date;
  bloodGroup?: any;
  address?: string;
  classId?: string;
  academicYearId?: string;
  rollNumber?: number;
  parentId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateStudentInput {
  id: string;
  tenantId: string;
  fullName?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: Date;
  bloodGroup?: any;
  address?: string;
  classId?: string;
  status?: any;
  actorUserId?: string;
  actorEmail?: string;
}

export class StudentService {
  async createStudent(input: CreateStudentInput, db = prismaTarget) {
    const admissionNumber = input.admissionNumber.toUpperCase().trim();

    // Check unique admission number within the institution
    const existing = await db.studentProfile.findUnique({
      where: {
        tenantId_admissionNumber: {
          tenantId: input.tenantId,
          admissionNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Student with admission number '${admissionNumber}' already exists in this institution`
      );
    }

    return await db.$transaction(async (tx) => {
      // 1. Create Student Profile
      const student = await tx.studentProfile.create({
        data: {
          tenantId: input.tenantId,
          admissionNumber,
          fullName: input.fullName.trim(),
          gender: input.gender,
          dateOfBirth: input.dateOfBirth,
          bloodGroup: input.bloodGroup || "UNKNOWN",
          address: input.address,
          status: "ACTIVE",
        },
      });

      // 2. If classId and academicYearId provided, create StudentEnrollment
      if (input.classId && input.academicYearId) {
        // Compute roll number if not provided
        let rollNumber = input.rollNumber;
        if (!rollNumber) {
          const count = await tx.studentEnrollment.count({
            where: {
              tenantId: input.tenantId,
              classId: input.classId,
            },
          });
          rollNumber = count + 1;
        }

        await tx.studentEnrollment.create({
          data: {
            tenantId: input.tenantId,
            studentId: student.id,
            classId: input.classId,
            academicYearId: input.academicYearId,
            rollNumber,
            status: "ACTIVE",
          },
        });
      }

      // 3. If parentId provided, create StudentParentBinding
      if (input.parentId) {
        await tx.studentParentBinding.create({
          data: {
            tenantId: input.tenantId,
            studentId: student.id,
            parentId: input.parentId,
            relationshipType: "LEGAL_GUARDIAN",
            isPrimaryContact: true,
          },
        });
      }

      // 4. Transactional Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "STUDENT",
          action: "STUDENT_ENROLLED",
          entityType: "StudentProfile",
          entityId: student.id,
          diffJson: JSON.stringify({
            admissionNumber: student.admissionNumber,
            fullName: student.fullName,
          }),
        },
      });

      logger.info("Student profile created", {
        tenantId: input.tenantId,
        studentId: student.id,
        admissionNumber: student.admissionNumber,
      });

      return student;
    });
  }

  async updateStudent(input: UpdateStudentInput, db = prismaTarget) {
    const student = await db.studentProfile.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${input.id}' not found in this institution`);
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.studentProfile.update({
        where: { id: input.id },
        data: {
          ...(input.fullName && { fullName: input.fullName.trim() }),
          ...(input.gender && { gender: input.gender }),
          ...(input.dateOfBirth && { dateOfBirth: input.dateOfBirth }),
          ...(input.bloodGroup && { bloodGroup: input.bloodGroup }),
          ...(input.address !== undefined && { address: input.address }),
          ...(input.status && { status: input.status }),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "STUDENT",
          action: "STUDENT_UPDATED",
          entityType: "StudentProfile",
          entityId: updated.id,
          diffJson: JSON.stringify({ before: student, after: updated }),
        },
      });

      logger.info("Student profile updated", {
        tenantId: input.tenantId,
        studentId: updated.id,
      });

      return updated;
    });
  }

  async deleteStudent(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const student = await db.studentProfile.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            attendanceRecords: true,
            examResults: true,
            submissions: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${id}' not found in this institution`);
    }

    // Delete Safety Invariant:
    // If student has critical academic history (attendance, exam results), do not hard-delete;
    // mark status as WITHDRAWN and set deletedAt timestamp.
    if (student._count.attendanceRecords > 0 || student._count.examResults > 0) {
      return await db.$transaction(async (tx) => {
        const withdrawn = await tx.studentProfile.update({
          where: { id },
          data: {
            status: "WITHDRAWN",
            deletedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: actorUserId,
            actorEmail,
            actionCategory: "STUDENT",
            action: "STUDENT_WITHDRAWN",
            entityType: "StudentProfile",
            entityId: id,
            diffJson: JSON.stringify({ reason: "Preserved academic history, status set to WITHDRAWN" }),
          },
        });

        logger.info("Student withdrawn (soft delete)", { tenantId, studentId: id });
        return { success: true, softDeleted: true };
      });
    }

    // Pristine student record without academic history can be deleted along with enrollments and bindings
    return await db.$transaction(async (tx) => {
      await tx.studentEnrollment.deleteMany({ where: { studentId: id, tenantId } });
      await tx.studentParentBinding.deleteMany({ where: { studentId: id, tenantId } });
      await tx.studentProfile.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "STUDENT",
          action: "STUDENT_DELETED",
          entityType: "StudentProfile",
          entityId: id,
          diffJson: JSON.stringify({ admissionNumber: student.admissionNumber }),
        },
      });

      logger.info("Student record deleted", { tenantId, studentId: id });
      return { success: true, softDeleted: false };
    });
  }

  async listStudents(tenantId: string, filter?: { classId?: string }, db = prismaTarget) {
    return await db.studentProfile.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filter?.classId && {
          enrollments: {
            some: {
              classId: filter.classId,
              status: "ACTIVE",
            },
          },
        }),
      },
      include: {
        enrollments: {
          include: {
            class: {
              include: { grade: true },
            },
          },
        },
        guardians: {
          include: { parent: true },
        },
      },
      orderBy: { fullName: "asc" },
    });
  }

  async getStudent(id: string, tenantId: string, db = prismaTarget) {
    const student = await db.studentProfile.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        enrollments: {
          include: {
            class: { include: { grade: true } },
            academicYear: true,
          },
        },
        guardians: {
          include: { parent: true },
        },
      },
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${id}' not found in this institution`);
    }

    return student;
  }
}

export const studentService = new StudentService();
