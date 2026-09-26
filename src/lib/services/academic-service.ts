import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateSubjectInput {
  tenantId: string;
  name: string;
  subjectCode: string;
  subjectType?: "THEORY" | "PRACTICAL" | "ELECTIVE" | "CO_CURRICULAR";
  maxMarks?: number;
  passMarks?: number;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateSubjectInput {
  id: string;
  tenantId: string;
  name?: string;
  subjectCode?: string;
  subjectType?: "THEORY" | "PRACTICAL" | "ELECTIVE" | "CO_CURRICULAR";
  maxMarks?: number;
  passMarks?: number;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateClassInput {
  tenantId: string;
  academicYearId: string;
  gradeId: string;
  sectionName: string;
  studentCapacity?: number;
  roomNumber?: string;
  supervisorTeacherId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateClassInput {
  id: string;
  tenantId: string;
  sectionName?: string;
  studentCapacity?: number;
  roomNumber?: string;
  supervisorTeacherId?: string | null;
  actorUserId?: string;
  actorEmail?: string;
}

export class AcademicService {
  // ==========================================
  // SUBJECT MANAGEMENT
  // ==========================================

  async createSubject(input: CreateSubjectInput, db = prismaTarget) {
    const existing = await db.subject.findUnique({
      where: {
        tenantId_subjectCode: {
          tenantId: input.tenantId,
          subjectCode: input.subjectCode.toUpperCase().trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Subject with code '${input.subjectCode}' already exists in this institution`
      );
    }

    return await db.$transaction(async (tx) => {
      const subject = await tx.subject.create({
        data: {
          tenantId: input.tenantId,
          name: input.name.trim(),
          subjectCode: input.subjectCode.toUpperCase().trim(),
          subjectType: input.subjectType || "THEORY",
          maxMarks: input.maxMarks ?? 100,
          passMarks: input.passMarks ?? 33,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ACADEMIC",
          action: "SUBJECT_CREATED",
          entityType: "Subject",
          entityId: subject.id,
          diffJson: JSON.stringify({ name: subject.name, code: subject.subjectCode }),
        },
      });

      logger.info("Subject created", {
        tenantId: input.tenantId,
        subjectId: subject.id,
        subjectCode: subject.subjectCode,
      });

      return subject;
    });
  }

  async updateSubject(input: UpdateSubjectInput, db = prismaTarget) {
    const subject = await db.subject.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });

    if (!subject) {
      throw new NotFoundError(`Subject with ID '${input.id}' not found in this institution`);
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.subject.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name.trim() }),
          ...(input.subjectCode && { subjectCode: input.subjectCode.toUpperCase().trim() }),
          ...(input.subjectType && { subjectType: input.subjectType }),
          ...(input.maxMarks !== undefined && { maxMarks: input.maxMarks }),
          ...(input.passMarks !== undefined && { passMarks: input.passMarks }),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ACADEMIC",
          action: "SUBJECT_UPDATED",
          entityType: "Subject",
          entityId: updated.id,
          diffJson: JSON.stringify({ before: subject, after: updated }),
        },
      });

      logger.info("Subject updated", {
        tenantId: input.tenantId,
        subjectId: updated.id,
      });

      return updated;
    });
  }

  async deleteSubject(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const subject = await db.subject.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            classSubjects: true,
            lessons: true,
            examPapers: true,
            assignments: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundError(`Subject with ID '${id}' not found in this institution`);
    }

    // Delete Safety Invariant: check dependent records
    if (
      subject._count.classSubjects > 0 ||
      subject._count.lessons > 0 ||
      subject._count.examPapers > 0 ||
      subject._count.assignments > 0
    ) {
      throw new ConflictError(
        `Cannot delete subject '${subject.name}' because it has active classes, lessons, exams, or assignments assigned to it.`
      );
    }

    return await db.$transaction(async (tx) => {
      await tx.subject.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ACADEMIC",
          action: "SUBJECT_DELETED",
          entityType: "Subject",
          entityId: id,
          diffJson: JSON.stringify({ deletedName: subject.name, deletedCode: subject.subjectCode }),
        },
      });

      logger.info("Subject safely deleted", { tenantId, subjectId: id });
      return { success: true };
    });
  }

  async listSubjects(tenantId: string, db = prismaTarget) {
    return await db.subject.findMany({
      where: { tenantId },
      include: {
        classSubjects: {
          include: {
            teacher: true,
            class: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  // ==========================================
  // CLASS MANAGEMENT
  // ==========================================

  async createClass(input: CreateClassInput, db = prismaTarget) {
    // Assert unique section in the grade and academic year
    const existing = await db.class.findFirst({
      where: {
        tenantId: input.tenantId,
        academicYearId: input.academicYearId,
        gradeId: input.gradeId,
        sectionName: input.sectionName.toUpperCase().trim(),
      },
    });

    if (existing) {
      throw new ConflictError(
        `Section '${input.sectionName}' already exists for this grade and academic year`
      );
    }

    return await db.$transaction(async (tx) => {
      const classRecord = await tx.class.create({
        data: {
          tenantId: input.tenantId,
          academicYearId: input.academicYearId,
          gradeId: input.gradeId,
          sectionName: input.sectionName.toUpperCase().trim(),
          studentCapacity: input.studentCapacity ?? 40,
          roomNumber: input.roomNumber,
          supervisorTeacherId: input.supervisorTeacherId,
        },
        include: {
          grade: true,
          supervisorTeacher: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ACADEMIC",
          action: "CLASS_CREATED",
          entityType: "Class",
          entityId: classRecord.id,
          diffJson: JSON.stringify({
            section: classRecord.sectionName,
            gradeId: classRecord.gradeId,
          }),
        },
      });

      logger.info("Class created", {
        tenantId: input.tenantId,
        classId: classRecord.id,
        section: classRecord.sectionName,
      });

      return classRecord;
    });
  }

  async updateClass(input: UpdateClassInput, db = prismaTarget) {
    const classRecord = await db.class.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });

    if (!classRecord) {
      throw new NotFoundError(`Class with ID '${input.id}' not found in this institution`);
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.class.update({
        where: { id: input.id },
        data: {
          ...(input.sectionName && { sectionName: input.sectionName.toUpperCase().trim() }),
          ...(input.studentCapacity !== undefined && { studentCapacity: input.studentCapacity }),
          ...(input.roomNumber !== undefined && { roomNumber: input.roomNumber }),
          ...(input.supervisorTeacherId !== undefined && { supervisorTeacherId: input.supervisorTeacherId }),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ACADEMIC",
          action: "CLASS_UPDATED",
          entityType: "Class",
          entityId: updated.id,
          diffJson: JSON.stringify({ before: classRecord, after: updated }),
        },
      });

      logger.info("Class updated", { tenantId: input.tenantId, classId: updated.id });
      return updated;
    });
  }

  async deleteClass(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const classRecord = await db.class.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            enrollments: true,
            lessons: true,
            attendanceRecords: true,
            assignments: true,
          },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundError(`Class with ID '${id}' not found in this institution`);
    }

    // Delete Safety Invariant: cannot delete class with enrolled students or records
    if (classRecord._count.enrollments > 0) {
      throw new ConflictError(
        `Cannot delete class section '${classRecord.sectionName}' because it has ${classRecord._count.enrollments} enrolled students.`
      );
    }
    if (classRecord._count.attendanceRecords > 0 || classRecord._count.lessons > 0) {
      throw new ConflictError(
        `Cannot delete class section '${classRecord.sectionName}' because active lessons or attendance records exist.`
      );
    }

    return await db.$transaction(async (tx) => {
      await tx.class.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ACADEMIC",
          action: "CLASS_DELETED",
          entityType: "Class",
          entityId: id,
          diffJson: JSON.stringify({ sectionName: classRecord.sectionName }),
        },
      });

      logger.info("Class safely deleted", { tenantId, classId: id });
      return { success: true };
    });
  }

  async listClasses(tenantId: string, db = prismaTarget) {
    return await db.class.findMany({
      where: { tenantId },
      include: {
        grade: true,
        supervisorTeacher: true,
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: [{ grade: { gradeLevel: "asc" } }, { sectionName: "asc" }],
    });
  }

  // ==========================================
  // TIMETABLE LESSON MANAGEMENT
  // ==========================================

  async deleteLesson(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const lesson = await db.timetableLesson.findFirst({
      where: { id, tenantId },
    });

    if (!lesson) {
      throw new NotFoundError(`Lesson with ID '${id}' not found in this institution`);
    }

    return await db.$transaction(async (tx) => {
      await tx.timetableLesson.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ACADEMIC",
          action: "LESSON_DELETED",
          entityType: "TimetableLesson",
          entityId: id,
          diffJson: JSON.stringify(lesson),
        },
      });

      logger.info("Timetable lesson deleted", { tenantId, lessonId: id });
      return { success: true };
    });
  }
}

export const academicService = new AcademicService();
