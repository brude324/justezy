import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { outboxService } from "./outbox-service";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreateFeeCategoryInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateFeeStructureItemInput {
  feeCategoryId: string;
  name: string;
  amount: number | string | Decimal;
  frequency?: "ONE_TIME" | "ANNUAL" | "SEMESTER" | "QUARTERLY" | "MONTHLY" | "OPTIONAL";
  dueDayOfMonth?: number;
  dueMonth?: number;
  isOptional?: boolean;
}

export interface CreateFeeStructureInput {
  tenantId: string;
  academicYearId: string;
  gradeId?: string;
  name: string;
  description?: string;
  items: CreateFeeStructureItemInput[];
  actorUserId?: string;
  actorEmail?: string;
}

export interface AssignStudentFeeInput {
  tenantId: string;
  studentId: string;
  academicYearId: string;
  feeStructureId: string;
  concessionAmount?: number | string | Decimal;
  discountReason?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface GenerateInvoiceItemInput {
  feeCategoryId: string;
  feeStructureItemId?: string;
  description: string;
  amount: number | string | Decimal;
}

export interface GenerateInvoiceInput {
  tenantId: string;
  studentId: string;
  academicYearId: string;
  classId?: string;
  dueDate: Date;
  items: GenerateInvoiceItemInput[];
  discountAmount?: number | string | Decimal;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export class FeeService {
  /**
   * Creates a new FeeCategory within the tenant.
   */
  async createFeeCategory(input: CreateFeeCategoryInput, db = prismaTarget) {
    const code = input.code.toUpperCase().trim();

    const existing = await db.feeCategory.findUnique({
      where: {
        tenantId_code: {
          tenantId: input.tenantId,
          code,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Fee category with code '${code}' already exists`);
    }

    return await db.$transaction(async (tx) => {
      const category = await tx.feeCategory.create({
        data: {
          tenantId: input.tenantId,
          code,
          name: input.name.trim(),
          description: input.description,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "FEES",
          action: "FEE_CATEGORY_CREATED",
          entityType: "FeeCategory",
          entityId: category.id,
          diffJson: JSON.stringify({ code: category.code, name: category.name }),
        },
      });

      logger.info("[FeeService] Fee category created", {
        tenantId: input.tenantId,
        categoryId: category.id,
        code,
      });

      return category;
    });
  }

  /**
   * Creates a multi-item FeeStructure for an academic year and optional grade level.
   */
  async createFeeStructure(input: CreateFeeStructureInput, db = prismaTarget) {
    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Fee structure must contain at least one fee component line item");
    }

    // Verify academic year belongs to tenant
    const academicYear = await db.academicYear.findFirst({
      where: { id: input.academicYearId, tenantId: input.tenantId },
    });
    if (!academicYear) {
      throw new NotFoundError("Academic year not found for this institution");
    }

    if (input.gradeId) {
      const grade = await db.grade.findFirst({
        where: { id: input.gradeId, tenantId: input.tenantId },
      });
      if (!grade) {
        throw new NotFoundError("Grade level not found for this institution");
      }
    }

    // Calculate total amount
    let total = new Decimal(0);
    for (const item of input.items) {
      const amt = new Decimal(item.amount.toString());
      if (amt.isNegative()) {
        throw new ValidationError("Fee component amount cannot be negative");
      }
      total = total.plus(amt);
    }

    return await db.$transaction(async (tx) => {
      const structure = await tx.feeStructure.create({
        data: {
          tenantId: input.tenantId,
          academicYearId: input.academicYearId,
          gradeId: input.gradeId,
          name: input.name.trim(),
          description: input.description,
          totalAmount: total,
          isActive: true,
          items: {
            create: input.items.map((it) => ({
              tenantId: input.tenantId,
              feeCategoryId: it.feeCategoryId,
              name: it.name.trim(),
              amount: new Decimal(it.amount.toString()),
              frequency: it.frequency || "ANNUAL",
              dueDayOfMonth: it.dueDayOfMonth || 10,
              dueMonth: it.dueMonth,
              isOptional: it.isOptional || false,
            })),
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "FEES",
          action: "FEE_STRUCTURE_CREATED",
          entityType: "FeeStructure",
          entityId: structure.id,
          diffJson: JSON.stringify({
            name: structure.name,
            totalAmount: structure.totalAmount.toString(),
            itemCount: structure.items?.length || input.items.length,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "fees.structure.created",
        aggregateType: "FeeStructure",
        aggregateId: structure.id,
        payload: {
          structureId: structure.id,
          name: structure.name,
          academicYearId: structure.academicYearId,
          totalAmount: structure.totalAmount.toString(),
        },
      });

      logger.info("[FeeService] Fee structure created", {
        tenantId: input.tenantId,
        structureId: structure.id,
        total: total.toString(),
      });

      return structure;
    });
  }

  /**
   * Assigns a fee structure to a student with optional concessions.
   * Enforces: netPayableAmount = baseAmount - concessionAmount >= 0.
   */
  async assignFeeToStudent(input: AssignStudentFeeInput, db = prismaTarget) {
    // 1. Verify student exists in tenant
    const student = await db.studentProfile.findFirst({
      where: { id: input.studentId, tenantId: input.tenantId },
    });
    if (!student) {
      throw new NotFoundError("Student profile not found for this institution");
    }

    // 2. Verify fee structure exists in tenant & academic year
    const structure = await db.feeStructure.findFirst({
      where: {
        id: input.feeStructureId,
        tenantId: input.tenantId,
        academicYearId: input.academicYearId,
      },
    });
    if (!structure) {
      throw new NotFoundError("Fee structure not found for this academic year and institution");
    }

    const baseAmount = new Decimal(structure.totalAmount.toString());
    const concession = new Decimal((input.concessionAmount || 0).toString());

    if (concession.isNegative()) {
      throw new ValidationError("Concession amount cannot be negative");
    }

    if (concession.greaterThan(baseAmount)) {
      throw new ValidationError("Concession amount cannot exceed base fee structure amount");
    }

    const netPayable = baseAmount.minus(concession);

    return await db.$transaction(async (tx) => {
      const assignment = await tx.studentFeeAssignment.upsert({
        where: {
          tenantId_academicYearId_studentId: {
            tenantId: input.tenantId,
            academicYearId: input.academicYearId,
            studentId: input.studentId,
          },
        },
        update: {
          feeStructureId: input.feeStructureId,
          baseAmount,
          concessionAmount: concession,
          netPayableAmount: netPayable,
          discountReason: input.discountReason,
          status: "ACTIVE",
        },
        create: {
          tenantId: input.tenantId,
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          feeStructureId: input.feeStructureId,
          baseAmount,
          concessionAmount: concession,
          netPayableAmount: netPayable,
          discountReason: input.discountReason,
          status: "ACTIVE",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "FEES",
          action: "STUDENT_FEE_ASSIGNED",
          entityType: "StudentFeeAssignment",
          entityId: assignment.id,
          diffJson: JSON.stringify({
            studentId: input.studentId,
            feeStructureId: input.feeStructureId,
            baseAmount: baseAmount.toString(),
            concession: concession.toString(),
            netPayable: netPayable.toString(),
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "fees.assignment.created",
        aggregateType: "StudentFeeAssignment",
        aggregateId: assignment.id,
        payload: {
          assignmentId: assignment.id,
          studentId: input.studentId,
          feeStructureId: input.feeStructureId,
          netAmount: netPayable.toString(),
        },
      });

      logger.info("[FeeService] Student fee assignment committed", {
        tenantId: input.tenantId,
        studentId: input.studentId,
        assignmentId: assignment.id,
        netPayable: netPayable.toString(),
      });

      return assignment;
    });
  }

  /**
   * Generates a formal FeeInvoice with line items and balance tracking.
   */
  async generateInvoice(input: GenerateInvoiceInput, db = prismaTarget) {
    if (!input.items || input.items.length === 0) {
      throw new ValidationError("Fee invoice must contain at least one charge item");
    }

    const student = await db.studentProfile.findFirst({
      where: { id: input.studentId, tenantId: input.tenantId },
    });
    if (!student) {
      throw new NotFoundError("Student profile not found for this institution");
    }

    let subtotal = new Decimal(0);
    for (const item of input.items) {
      const amt = new Decimal(item.amount.toString());
      if (amt.isNegative() || amt.isZero()) {
        throw new ValidationError("Invoice line item amount must be greater than zero");
      }
      subtotal = subtotal.plus(amt);
    }

    const discount = new Decimal((input.discountAmount || 0).toString());
    if (discount.isNegative()) {
      throw new ValidationError("Invoice discount cannot be negative");
    }
    if (discount.greaterThan(subtotal)) {
      throw new ValidationError("Invoice discount cannot exceed subtotal amount");
    }

    const balance = subtotal.minus(discount);

    return await db.$transaction(async (tx) => {
      // Deterministic invoice numbering: INV-<TIMESTAMP_SEQ>
      const count = await tx.feeInvoice.count({
        where: { tenantId: input.tenantId },
      });
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

      const invoice = await tx.feeInvoice.create({
        data: {
          tenantId: input.tenantId,
          invoiceNumber,
          studentId: input.studentId,
          academicYearId: input.academicYearId,
          classId: input.classId,
          dueDate: input.dueDate,
          subtotalAmount: subtotal,
          discountAmount: discount,
          paidAmount: new Decimal(0),
          balanceAmount: balance,
          status: "ISSUED",
          notes: input.notes,
          items: {
            create: input.items.map((it) => ({
              tenantId: input.tenantId,
              feeCategoryId: it.feeCategoryId,
              feeStructureItemId: it.feeStructureItemId,
              description: it.description.trim(),
              amount: new Decimal(it.amount.toString()),
              paidAmount: new Decimal(0),
            })),
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "FEES",
          action: "FEE_INVOICE_ISSUED",
          entityType: "FeeInvoice",
          entityId: invoice.id,
          diffJson: JSON.stringify({
            invoiceNumber: invoice.invoiceNumber,
            studentId: input.studentId,
            subtotal: subtotal.toString(),
            balance: balance.toString(),
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "fees.invoice.issued",
        aggregateType: "FeeInvoice",
        aggregateId: invoice.id,
        payload: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          studentId: input.studentId,
          dueDate: input.dueDate.toISOString(),
          balanceAmount: balance.toString(),
        },
      });

      logger.info("[FeeService] Fee invoice issued", {
        tenantId: input.tenantId,
        invoiceNumber,
        balance: balance.toString(),
      });

      return invoice;
    });
  }

  /**
   * Cancels/voids an invoice if no payments have been allocated to it.
   */
  async cancelInvoice(
    tenantId: string,
    invoiceId: string,
    reason: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const invoice = await db.feeInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundError("Fee invoice not found");
    }

    if (new Decimal(invoice.paidAmount.toString()).greaterThan(0)) {
      throw new ValidationError(
        "Cannot cancel an invoice with allocated payments. Process refunds/reversals first."
      );
    }

    if (invoice.status === "CANCELLED" || invoice.status === "VOID") {
      throw new ValidationError("Invoice is already cancelled or voided");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.feeInvoice.update({
        where: { id: invoiceId },
        data: {
          status: "CANCELLED",
          balanceAmount: new Decimal(0),
          notes: invoice.notes ? `${invoice.notes} | Cancelled: ${reason}` : `Cancelled: ${reason}`,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "FEES",
          action: "FEE_INVOICE_CANCELLED",
          entityType: "FeeInvoice",
          entityId: invoice.id,
          diffJson: JSON.stringify({
            invoiceNumber: invoice.invoiceNumber,
            previousStatus: invoice.status,
            reason,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "fees.invoice.voided",
        aggregateType: "FeeInvoice",
        aggregateId: invoice.id,
        payload: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          reason,
        },
      });

      return updated;
    });
  }

  /**
   * Retrieves tenant-isolated invoices for a student.
   */
  async getStudentInvoices(tenantId: string, studentId: string, db = prismaTarget) {
    return await db.feeInvoice.findMany({
      where: { tenantId, studentId },
      include: {
        items: true,
        allocations: {
          include: { payment: true },
        },
      },
      orderBy: { issueDate: "desc" },
    });
  }
}

export const feeService = new FeeService();
