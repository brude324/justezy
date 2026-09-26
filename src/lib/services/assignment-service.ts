import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateAssignmentInput {
  tenantId: string;
  academicYearId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  instructionsMarkdown: string;
  dueDate: Date;
  maxMarks?: number;
  attachmentUrlsJson?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateAssignmentInput {
  id: string;
  tenantId: string;
  title?: string;
  instructionsMarkdown?: string;
  dueDate?: Date;
  maxMarks?: number;
  status?: any;
  actorUserId?: string;
  actorEmail?: string;
}

export class AssignmentService {
  async createAssignment(input: CreateAssignmentInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: {
          tenantId: input.tenantId,
          academicYearId: input.academicYearId,
          classId: input.classId,
          subjectId: input.subjectId,
          teacherId: input.teacherId,
          title: input.title.trim(),
          instructionsMarkdown: input.instructionsMarkdown.trim(),
          dueDate: input.dueDate,
          maxMarks: input.maxMarks ?? 100,
          attachmentUrlsJson: input.attachmentUrlsJson,
          status: "PUBLISHED",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ACADEMIC",
          action: "ASSIGNMENT_CREATED",
          entityType: "Assignment",
          entityId: assignment.id,
          diffJson: JSON.stringify({ title: assignment.title, classId: assignment.classId }),
        },
      });

      logger.info("Assignment created", { tenantId: input.tenantId, assignmentId: assignment.id });
      return assignment;
    });
  }

  async updateAssignment(input: UpdateAssignmentInput, db = prismaTarget) {
    const assignment = await db.assignment.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });

    if (!assignment) {
      throw new NotFoundError(`Assignment with ID '${input.id}' not found in this institution`);
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.assignment.update({
        where: { id: input.id },
        data: {
          ...(input.title && { title: input.title.trim() }),
          ...(input.instructionsMarkdown && { instructionsMarkdown: input.instructionsMarkdown.trim() }),
          ...(input.dueDate && { dueDate: input.dueDate }),
          ...(input.maxMarks !== undefined && { maxMarks: input.maxMarks }),
          ...(input.status && { status: input.status }),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ACADEMIC",
          action: "ASSIGNMENT_UPDATED",
          entityType: "Assignment",
          entityId: updated.id,
          diffJson: JSON.stringify({ before: assignment, after: updated }),
        },
      });

      logger.info("Assignment updated", { tenantId: input.tenantId, assignmentId: updated.id });
      return updated;
    });
  }

  async deleteAssignment(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const assignment = await db.assignment.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundError(`Assignment with ID '${id}' not found in this institution`);
    }

    // Delete Safety Invariant: Check if graded submissions exist
    if (assignment._count.submissions > 0) {
      const gradedCount = await db.assignmentSubmission.count({
        where: {
          assignmentId: id,
          tenantId,
          status: "GRADED",
        },
      });

      if (gradedCount > 0) {
        throw new ConflictError(
          `Cannot delete assignment '${assignment.title}' because it has ${gradedCount} graded student submissions.`
        );
      }
    }

    return await db.$transaction(async (tx) => {
      await tx.assignmentSubmission.deleteMany({ where: { assignmentId: id } });
      await tx.assignment.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ACADEMIC",
          action: "ASSIGNMENT_DELETED",
          entityType: "Assignment",
          entityId: id,
          diffJson: JSON.stringify({ title: assignment.title }),
        },
      });

      logger.info("Assignment deleted", { tenantId, assignmentId: id });
      return { success: true };
    });
  }

  async listAssignments(tenantId: string, filter?: { classId?: string; teacherId?: string }, db = prismaTarget) {
    return await db.assignment.findMany({
      where: {
        tenantId,
        ...(filter?.classId && { classId: filter.classId }),
        ...(filter?.teacherId && { teacherId: filter.teacherId }),
      },
      include: {
        class: true,
        subject: true,
        teacher: true,
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { dueDate: "desc" },
    });
  }
}

export const assignmentService = new AssignmentService();
