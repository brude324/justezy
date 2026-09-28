import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface MarkAttendanceInput {
  tenantId: string;
  academicYearId: string;
  classId: string;
  studentId: string;
  date: Date;
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "EXCUSED";
  remarks?: string;
  markedByUserId: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CorrectAttendanceInput {
  tenantId: string;
  attendanceRecordId: string;
  newStatus: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "EXCUSED";
  reason: string;
  requestedByUserId: string;
  approvedByUserId: string;
  actorUserId?: string;
  actorEmail?: string;
}

export class AttendanceService {
  async markAttendance(input: MarkAttendanceInput, db = prismaTarget) {
    // Normalize date to midnight UTC
    const normalizedDate = new Date(input.date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    return await db.$transaction(async (tx) => {
      const record = await tx.attendanceRecord.upsert({
        where: {
          tenantId_classId_date_studentId: {
            tenantId: input.tenantId,
            classId: input.classId,
            date: normalizedDate,
            studentId: input.studentId,
          },
        },
        create: {
          tenantId: input.tenantId,
          academicYearId: input.academicYearId,
          classId: input.classId,
          studentId: input.studentId,
          date: normalizedDate,
          status: input.status,
          remarks: input.remarks,
          markedByUserId: input.markedByUserId,
        },
        update: {
          status: input.status,
          remarks: input.remarks,
          markedByUserId: input.markedByUserId,
          markedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId || input.markedByUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ATTENDANCE",
          action: "ATTENDANCE_MARKED",
          entityType: "AttendanceRecord",
          entityId: record.id,
          diffJson: JSON.stringify({
            studentId: record.studentId,
            status: record.status,
            date: normalizedDate.toISOString(),
          }),
        },
      });

      logger.info("Attendance marked", {
        tenantId: input.tenantId,
        recordId: record.id,
        status: record.status,
      });

      return record;
    });
  }

  async correctAttendance(input: CorrectAttendanceInput, db = prismaTarget) {
    const record = await db.attendanceRecord.findFirst({
      where: { id: input.attendanceRecordId, tenantId: input.tenantId },
    });

    if (!record) {
      throw new NotFoundError(
        `Attendance record with ID '${input.attendanceRecordId}' not found in this institution`
      );
    }

    return await db.$transaction(async (tx) => {
      // 1. Create correction log and update status on record in parallel
      const [correction, updatedRecord] = await Promise.all([
        tx.attendanceCorrection.create({
          data: {
            tenantId: input.tenantId,
            attendanceRecordId: record.id,
            previousStatus: record.status,
            newStatus: input.newStatus,
            reason: input.reason.trim(),
            requestedByUserId: input.requestedByUserId,
            approvedByUserId: input.approvedByUserId,
          },
        }),
        tx.attendanceRecord.update({
          where: { id: record.id },
          data: {
            status: input.newStatus,
          },
        }),
      ]);

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId || input.approvedByUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ATTENDANCE",
          action: "ATTENDANCE_CORRECTED",
          entityType: "AttendanceRecord",
          entityId: record.id,
          diffJson: JSON.stringify({
            previousStatus: record.status,
            newStatus: input.newStatus,
            reason: input.reason,
            correctionId: correction.id,
          }),
        },
      });

      logger.info("Attendance corrected", {
        tenantId: input.tenantId,
        recordId: record.id,
        correctionId: correction.id,
      });

      return { record: updatedRecord, correction };
    });
  }

  async deleteAttendance(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const record = await db.attendanceRecord.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      throw new NotFoundError(`Attendance record with ID '${id}' not found in this institution`);
    }

    if (record.isLocked) {
      throw new ConflictError(
        "Cannot delete locked attendance record. Administrative correction is required."
      );
    }

    return await db.$transaction(async (tx) => {
      await tx.attendanceCorrection.deleteMany({ where: { attendanceRecordId: id } });
      await tx.attendanceRecord.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ATTENDANCE",
          action: "ATTENDANCE_DELETED",
          entityType: "AttendanceRecord",
          entityId: id,
          diffJson: JSON.stringify({ studentId: record.studentId, date: record.date }),
        },
      });

      logger.info("Attendance record deleted", { tenantId, recordId: id });
      return { success: true };
    });
  }

  async getAttendance(tenantId: string, classId: string, date: Date, db = prismaTarget) {
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    return await db.attendanceRecord.findMany({
      where: {
        tenantId,
        classId,
        date: normalizedDate,
      },
      include: {
        student: true,
      },
      orderBy: { student: { fullName: "asc" } },
    });
  }
}

export const attendanceService = new AttendanceService();
