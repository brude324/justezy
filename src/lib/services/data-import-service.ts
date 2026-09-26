import { z } from "zod";
import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { ValidationError, ForbiddenError } from "@/lib/errors";

// Zod schemas for import payloads
export const importClassRowSchema = z.object({
  academicYearId: z.string().min(1, "Academic Year ID is required"),
  gradeId: z.string().min(1, "Grade ID is required"),
  sectionName: z.string().min(1, "Section Name is required").max(10),
  studentCapacity: z.number().int().positive().default(40),
  roomNumber: z.string().optional(),
});

export const importStaffRowSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required").max(50),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  designation: z.string().min(2, "Designation is required").max(100),
  department: z.string().optional(),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  dateOfJoining: z.coerce.date().default(() => new Date()),
});

export const importStudentRowSchema = z.object({
  admissionNumber: z.string().min(1, "Admission Number is required").max(50),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.coerce.date(),
  classId: z.string().min(1, "Class ID is required"),
  academicYearId: z.string().min(1, "Academic Year ID is required"),
  rollNumber: z.number().int().positive(),
  address: z.string().optional(),
});

export interface RowError {
  row: number;
  identifier?: string;
  field?: string;
  message: string;
}

export interface ImportResult<T = any> {
  success: boolean;
  dryRun: boolean;
  entityType: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: RowError[];
  preview?: T[];
  createdCount: number;
}

export interface ImportOptions {
  dryRun?: boolean;
  actorUserId?: string;
  actorEmail?: string;
}

export class DataImportService {
  /**
   * Imports academic classes with strict tenant isolation, dry-run validation, and duplicate detection.
   */
  async importClasses(
    tenantId: string,
    rows: Array<z.input<typeof importClassRowSchema>>,
    options: ImportOptions = {},
    db: any = prismaTarget
  ): Promise<ImportResult> {
    const { dryRun = false, actorUserId, actorEmail } = options;
    const errors: RowError[] = [];
    const validData: Array<z.infer<typeof importClassRowSchema>> = [];
    const seenSections = new Set<string>();

    // 1. Row-by-row syntactic and batch-duplicate validation
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const parseResult = importClassRowSchema.safeParse(rows[i]);
      if (!parseResult.success) {
        for (const err of parseResult.error.errors) {
          errors.push({
            row: rowNum,
            field: err.path.join("."),
            message: err.message,
          });
        }
        continue;
      }

      const item = parseResult.data;
      const compositeKey = `${item.academicYearId}:${item.gradeId}:${item.sectionName.toUpperCase()}`;
      if (seenSections.has(compositeKey)) {
        errors.push({
          row: rowNum,
          field: "sectionName",
          identifier: item.sectionName,
          message: `Duplicate class section '${item.sectionName}' for this grade and academic year in import batch`,
        });
        continue;
      }
      seenSections.add(compositeKey);
      validData.push(item);
    }

    // 2. Foreign-key and cross-tenant validation
    if (validData.length > 0) {
      const yearIds = Array.from(new Set(validData.map((d) => d.academicYearId)));
      const gradeIds = Array.from(new Set(validData.map((d) => d.gradeId)));

      const [existingYears, existingGrades] = await Promise.all([
        db.academicYear.findMany({
          where: { id: { in: yearIds }, tenantId },
          select: { id: true },
        }),
        db.grade.findMany({
          where: { id: { in: gradeIds }, tenantId },
          select: { id: true },
        }),
      ]);

      const validYearSet = new Set((existingYears || []).map((y: any) => y.id));
      const validGradeSet = new Set((existingGrades || []).map((g: any) => g.id));

      for (let i = 0; i < validData.length; i++) {
        const item = validData[i];
        const rowNum = i + 1;
        if (!validYearSet.has(item.academicYearId)) {
          errors.push({
            row: rowNum,
            field: "academicYearId",
            identifier: item.academicYearId,
            message: "Academic Year not found or belongs to another tenant",
          });
        }
        if (!validGradeSet.has(item.gradeId)) {
          errors.push({
            row: rowNum,
            field: "gradeId",
            identifier: item.gradeId,
            message: "Grade not found or belongs to another tenant",
          });
        }
      }
    }

    // If dry-run or errors exist, return report without DB mutations
    if (dryRun || errors.length > 0) {
      return {
        success: errors.length === 0,
        dryRun,
        entityType: "Class",
        totalRows: rows.length,
        validRows: validData.length - errors.length,
        invalidRows: errors.length,
        errors,
        preview: validData.slice(0, 10),
        createdCount: 0,
      };
    }

    // 3. Transactional persistence
    return await db.$transaction(async (tx: any) => {
      let createdCount = 0;
      for (const item of validData) {
        await tx.class.create({
          data: {
            tenantId,
            academicYearId: item.academicYearId,
            gradeId: item.gradeId,
            sectionName: item.sectionName,
            studentCapacity: item.studentCapacity,
            roomNumber: item.roomNumber || null,
          },
        });
        createdCount++;
      }

      if (tx.auditLog) {
        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: actorUserId || null,
            actorEmail: actorEmail || null,
            actionCategory: "ACADEMIC",
            action: "DATA_IMPORTED",
            entityType: "Class",
            entityId: `batch_${Date.now()}`,
            diffJson: JSON.stringify({ importedCount: createdCount }),
          },
        });
      }

      logger.info("Classes imported successfully", { tenantId, createdCount });

      return {
        success: true,
        dryRun: false,
        entityType: "Class",
        totalRows: rows.length,
        validRows: createdCount,
        invalidRows: 0,
        errors: [],
        createdCount,
      };
    });
  }

  /**
   * Imports students and their class enrollments with dry-run validation, duplicate checks, and cross-tenant foreign key protection.
   */
  async importStudents(
    tenantId: string,
    rows: Array<z.input<typeof importStudentRowSchema>>,
    options: ImportOptions = {},
    db: any = prismaTarget
  ): Promise<ImportResult> {
    const { dryRun = false, actorUserId, actorEmail } = options;
    const errors: RowError[] = [];
    const validData: Array<z.infer<typeof importStudentRowSchema>> = [];
    const seenAdmissions = new Set<string>();
    const seenRollNumbers = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const parseResult = importStudentRowSchema.safeParse(rows[i]);
      if (!parseResult.success) {
        for (const err of parseResult.error.errors) {
          errors.push({
            row: rowNum,
            field: err.path.join("."),
            message: err.message,
          });
        }
        continue;
      }

      const item = parseResult.data;
      const admKey = item.admissionNumber.toUpperCase();
      if (seenAdmissions.has(admKey)) {
        errors.push({
          row: rowNum,
          field: "admissionNumber",
          identifier: item.admissionNumber,
          message: `Duplicate admission number '${item.admissionNumber}' in import batch`,
        });
        continue;
      }
      seenAdmissions.add(admKey);

      const rollKey = `${item.classId}:${item.rollNumber}`;
      if (seenRollNumbers.has(rollKey)) {
        errors.push({
          row: rowNum,
          field: "rollNumber",
          identifier: String(item.rollNumber),
          message: `Duplicate roll number '${item.rollNumber}' in target class within batch`,
        });
        continue;
      }
      seenRollNumbers.add(rollKey);

      validData.push(item);
    }

    // Database duplicate and foreign key validation
    if (validData.length > 0) {
      const admissionNumbers = validData.map((d) => d.admissionNumber);
      const classIds = Array.from(new Set(validData.map((d) => d.classId)));

      const [existingStudents, existingClasses] = await Promise.all([
        db.studentProfile.findMany({
          where: {
            tenantId,
            admissionNumber: { in: admissionNumbers },
          },
          select: { admissionNumber: true },
        }),
        db.class.findMany({
          where: {
            id: { in: classIds },
            tenantId,
          },
          select: { id: true, studentCapacity: true },
        }),
      ]);

      const existingAdmSet = new Set((existingStudents || []).map((s: any) => s.admissionNumber.toUpperCase()));
      const validClassSet = new Set((existingClasses || []).map((c: any) => c.id));

      for (let i = 0; i < validData.length; i++) {
        const item = validData[i];
        const rowNum = i + 1;

        if (existingAdmSet.has(item.admissionNumber.toUpperCase())) {
          errors.push({
            row: rowNum,
            field: "admissionNumber",
            identifier: item.admissionNumber,
            message: `Student with admission number '${item.admissionNumber}' already exists in this institution`,
          });
        }

        if (!validClassSet.has(item.classId)) {
          errors.push({
            row: rowNum,
            field: "classId",
            identifier: item.classId,
            message: "Target class not found or belongs to another tenant",
          });
        }
      }
    }

    if (dryRun || errors.length > 0) {
      return {
        success: errors.length === 0,
        dryRun,
        entityType: "StudentProfile",
        totalRows: rows.length,
        validRows: validData.length - errors.length,
        invalidRows: errors.length,
        errors,
        preview: validData.slice(0, 10),
        createdCount: 0,
      };
    }

    // Transactional creation
    return await db.$transaction(async (tx: any) => {
      let createdCount = 0;
      for (const item of validData) {
        const student = await tx.studentProfile.create({
          data: {
            tenantId,
            admissionNumber: item.admissionNumber,
            fullName: item.fullName,
            gender: item.gender,
            dateOfBirth: item.dateOfBirth,
            address: item.address || null,
            status: "ACTIVE",
          },
        });

        await tx.studentEnrollment.create({
          data: {
            tenantId,
            studentId: student.id,
            academicYearId: item.academicYearId,
            classId: item.classId,
            rollNumber: item.rollNumber,
            status: "ACTIVE",
          },
        });

        createdCount++;
      }

      if (tx.auditLog) {
        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: actorUserId || null,
            actorEmail: actorEmail || null,
            actionCategory: "STUDENT",
            action: "DATA_IMPORTED",
            entityType: "StudentProfile",
            entityId: `batch_${Date.now()}`,
            diffJson: JSON.stringify({ importedCount: createdCount }),
          },
        });
      }

      logger.info("Students imported successfully", { tenantId, createdCount });

      return {
        success: true,
        dryRun: false,
        entityType: "StudentProfile",
        totalRows: rows.length,
        validRows: createdCount,
        invalidRows: 0,
        errors: [],
        createdCount,
      };
    });
  }

  /**
   * Imports staff profiles with dry-run validation, duplicate checks, and transaction safety.
   */
  async importStaff(
    tenantId: string,
    rows: Array<z.input<typeof importStaffRowSchema>>,
    options: ImportOptions = {},
    db: any = prismaTarget
  ): Promise<ImportResult> {
    const { dryRun = false, actorUserId, actorEmail } = options;
    const errors: RowError[] = [];
    const validData: Array<z.infer<typeof importStaffRowSchema>> = [];
    const seenEmployeeIds = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const parseResult = importStaffRowSchema.safeParse(rows[i]);
      if (!parseResult.success) {
        for (const err of parseResult.error.errors) {
          errors.push({
            row: rowNum,
            field: err.path.join("."),
            message: err.message,
          });
        }
        continue;
      }

      const item = parseResult.data;
      const empKey = item.employeeId.toUpperCase();
      if (seenEmployeeIds.has(empKey)) {
        errors.push({
          row: rowNum,
          field: "employeeId",
          identifier: item.employeeId,
          message: `Duplicate employee ID '${item.employeeId}' in import batch`,
        });
        continue;
      }
      seenEmployeeIds.add(empKey);
      validData.push(item);
    }

    if (validData.length > 0) {
      const employeeIds = validData.map((d) => d.employeeId);
      const existingStaff = await db.staffProfile.findMany({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
        },
        select: { employeeId: true },
      });

      const existingEmpSet = new Set((existingStaff || []).map((s: any) => s.employeeId.toUpperCase()));

      for (let i = 0; i < validData.length; i++) {
        const item = validData[i];
        const rowNum = i + 1;
        if (existingEmpSet.has(item.employeeId.toUpperCase())) {
          errors.push({
            row: rowNum,
            field: "employeeId",
            identifier: item.employeeId,
            message: `Staff with employee ID '${item.employeeId}' already exists in this institution`,
          });
        }
      }
    }

    if (dryRun || errors.length > 0) {
      return {
        success: errors.length === 0,
        dryRun,
        entityType: "StaffProfile",
        totalRows: rows.length,
        validRows: validData.length - errors.length,
        invalidRows: errors.length,
        errors,
        preview: validData.slice(0, 10),
        createdCount: 0,
      };
    }

    return await db.$transaction(async (tx: any) => {
      let createdCount = 0;

      // Find or create TEACHER role for staff binding
      let teacherRole = await tx.role.findFirst({
        where: { roleKey: "TEACHER", tenantId: null },
      });
      if (!teacherRole) {
        teacherRole = await tx.role.create({
          data: {
            roleKey: "TEACHER",
            name: "Teacher",
            description: "Academic educator",
            isSystemRole: true,
          },
        });
      }

      for (const item of validData) {
        // Create or find placeholder User for the staff member
        const syntheticClerkId = `import_${tenantId}_${item.employeeId}`.toLowerCase();
        const user = await tx.user.upsert({
          where: { clerkId: syntheticClerkId },
          create: {
            clerkId: syntheticClerkId,
            email: item.email.toLowerCase().trim(),
            firstName: item.fullName.split(" ")[0] || "Staff",
            lastName: item.fullName.split(" ").slice(1).join(" ") || "",
            displayName: item.fullName,
            isActive: true,
          },
          update: {
            email: item.email.toLowerCase().trim(),
            displayName: item.fullName,
          },
        });

        // Create TenantMembership
        const membership = await tx.tenantMembership.create({
          data: {
            tenantId,
            userId: user.id,
            roleId: teacherRole.id,
            status: "ACTIVE",
          },
        });

        // Create StaffProfile
        await tx.staffProfile.create({
          data: {
            tenantId,
            userId: user.id,
            membershipId: membership.id,
            employeeId: item.employeeId,
            fullName: item.fullName,
            gender: item.gender,
            designation: item.designation,
            department: item.department || null,
            dateOfJoining: item.dateOfJoining,
            status: "ACTIVE",
          },
        });

        createdCount++;
      }

      if (tx.auditLog) {
        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: actorUserId || null,
            actorEmail: actorEmail || null,
            actionCategory: "ACADEMIC",
            action: "DATA_IMPORTED",
            entityType: "StaffProfile",
            entityId: `batch_${Date.now()}`,
            diffJson: JSON.stringify({ importedCount: createdCount }),
          },
        });
      }

      logger.info("Staff profiles imported successfully", { tenantId, createdCount });

      return {
        success: true,
        dryRun: false,
        entityType: "StaffProfile",
        totalRows: rows.length,
        validRows: createdCount,
        invalidRows: 0,
        errors: [],
        createdCount,
      };
    });
  }
}

export const dataImportService = new DataImportService();
