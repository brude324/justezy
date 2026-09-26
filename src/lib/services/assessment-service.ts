import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateExamInput {
  tenantId: string;
  academicYearId: string;
  termId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  instructions?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateExamInput {
  id: string;
  tenantId: string;
  title?: string;
  startDate?: Date;
  endDate?: Date;
  instructions?: string;
  status?: any;
  actorUserId?: string;
  actorEmail?: string;
}

export interface RecordExamResultInput {
  tenantId: string;
  examPaperId: string;
  studentId: string;
  theoryMarks: number;
  practicalMarks?: number;
  totalMarks: number;
  isAbsent?: boolean;
  remarks?: string;
  enteredByUserId: string;
  actorUserId?: string;
  actorEmail?: string;
}

export class AssessmentService {
  async createExam(input: CreateExamInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          tenantId: input.tenantId,
          academicYearId: input.academicYearId,
          termId: input.termId,
          title: input.title.trim(),
          startDate: input.startDate,
          endDate: input.endDate,
          instructions: input.instructions,
          status: "DRAFT",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "EVALUATION",
          action: "EXAM_CREATED",
          entityType: "Exam",
          entityId: exam.id,
          diffJson: JSON.stringify({ title: exam.title, status: exam.status }),
        },
      });

      logger.info("Exam session created", { tenantId: input.tenantId, examId: exam.id });
      return exam;
    });
  }

  async updateExam(input: UpdateExamInput, db = prismaTarget) {
    const exam = await db.exam.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });

    if (!exam) {
      throw new NotFoundError(`Exam with ID '${input.id}' not found in this institution`);
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.exam.update({
        where: { id: input.id },
        data: {
          ...(input.title && { title: input.title.trim() }),
          ...(input.startDate && { startDate: input.startDate }),
          ...(input.endDate && { endDate: input.endDate }),
          ...(input.instructions !== undefined && { instructions: input.instructions }),
          ...(input.status && { status: input.status }),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "EVALUATION",
          action: "EXAM_UPDATED",
          entityType: "Exam",
          entityId: updated.id,
          diffJson: JSON.stringify({ before: exam, after: updated }),
        },
      });

      logger.info("Exam updated", { tenantId: input.tenantId, examId: updated.id });
      return updated;
    });
  }

  async deleteExam(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const exam = await db.exam.findFirst({
      where: { id, tenantId },
      include: {
        papers: {
          include: {
            _count: { select: { results: true } },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundError(`Exam with ID '${id}' not found in this institution`);
    }

    // Delete Safety Invariant: Check if exam has papers with recorded results
    const totalResults = exam.papers.reduce((sum, p) => sum + p._count.results, 0);
    if (totalResults > 0) {
      throw new ConflictError(
        `Cannot delete exam '${exam.title}' because it has ${totalResults} recorded student results.`
      );
    }

    return await db.$transaction(async (tx) => {
      await tx.examPaper.deleteMany({ where: { examId: id } });
      await tx.exam.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "EVALUATION",
          action: "EXAM_DELETED",
          entityType: "Exam",
          entityId: id,
          diffJson: JSON.stringify({ title: exam.title }),
        },
      });

      logger.info("Exam safely deleted", { tenantId, examId: id });
      return { success: true };
    });
  }

  async recordExamResult(input: RecordExamResultInput, db = prismaTarget) {
    const percentage = (input.totalMarks / 100) * 100; // Normalized percentage

    return await db.$transaction(async (tx) => {
      const result = await tx.examResult.upsert({
        where: {
          tenantId_examPaperId_studentId: {
            tenantId: input.tenantId,
            examPaperId: input.examPaperId,
            studentId: input.studentId,
          },
        },
        create: {
          tenantId: input.tenantId,
          examPaperId: input.examPaperId,
          studentId: input.studentId,
          theoryMarks: input.theoryMarks,
          practicalMarks: input.practicalMarks,
          totalMarks: input.totalMarks,
          isAbsent: input.isAbsent ?? false,
          percentage,
          remarks: input.remarks,
          enteredByUserId: input.enteredByUserId,
        },
        update: {
          theoryMarks: input.theoryMarks,
          practicalMarks: input.practicalMarks,
          totalMarks: input.totalMarks,
          isAbsent: input.isAbsent ?? false,
          percentage,
          remarks: input.remarks,
          enteredByUserId: input.enteredByUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId || input.enteredByUserId,
          actorEmail: input.actorEmail,
          actionCategory: "EVALUATION",
          action: "RESULT_ENTERED",
          entityType: "ExamResult",
          entityId: result.id,
          diffJson: JSON.stringify({
            studentId: result.studentId,
            totalMarks: result.totalMarks,
          }),
        },
      });

      logger.info("Exam result recorded", { tenantId: input.tenantId, resultId: result.id });
      return result;
    });
  }

  async deleteResult(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const result = await db.examResult.findFirst({
      where: { id, tenantId },
    });

    if (!result) {
      throw new NotFoundError(`Exam result with ID '${id}' not found in this institution`);
    }

    if (result.isVerified) {
      throw new ConflictError("Cannot delete verified exam result record.");
    }

    return await db.$transaction(async (tx) => {
      await tx.examResult.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "EVALUATION",
          action: "RESULT_DELETED",
          entityType: "ExamResult",
          entityId: id,
          diffJson: JSON.stringify({ studentId: result.studentId }),
        },
      });

      logger.info("Exam result deleted", { tenantId, resultId: id });
      return { success: true };
    });
  }

  async listExams(tenantId: string, db = prismaTarget) {
    return await db.exam.findMany({
      where: { tenantId },
      include: {
        academicYear: true,
        term: true,
        papers: {
          include: {
            subject: true,
            class: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });
  }
}

export const assessmentService = new AssessmentService();
