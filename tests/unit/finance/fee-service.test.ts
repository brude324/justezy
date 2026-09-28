import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeeService } from "@/lib/services/fee-service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("FeeService Domain Tests — Wave 1 (Categories A, B, C, D, E, S, T)", () => {
  let service: FeeService;
  let mockDb: any;
  const tenantId = "tnt_test_school";

  beforeEach(() => {
    service = new FeeService();
    mockDb = {
      feeCategory: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      academicYear: {
        findFirst: vi.fn(),
      },
      grade: {
        findFirst: vi.fn(),
      },
      feeStructure: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      studentProfile: {
        findFirst: vi.fn(),
      },
      studentFeeAssignment: {
        upsert: vi.fn(),
      },
      feeInvoice: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "outbox_mock_1" }),
      },
      $transaction: vi.fn(async (cb) => cb(mockDb)),
    };
  });

  describe("Category A: Fee Category & Structure Tests", () => {
    it("should create fee category with unique code per tenant", async () => {
      mockDb.feeCategory.findUnique.mockResolvedValue(null);
      mockDb.feeCategory.create.mockResolvedValue({
        id: "cat_tuition",
        tenantId,
        code: "TUITION",
        name: "Tuition Fee",
      });

      const cat = await service.createFeeCategory(
        {
          tenantId,
          code: "tuition",
          name: "Tuition Fee",
          description: "Core academic instruction fee",
          actorUserId: "usr_admin",
        },
        mockDb
      );

      expect(cat.id).toBe("cat_tuition");
      expect(mockDb.feeCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            code: "TUITION",
            name: "Tuition Fee",
          }),
        })
      );
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionCategory: "FEES",
            action: "FEE_CATEGORY_CREATED",
          }),
        })
      );
    });

    it("should reject duplicate fee category code within the same tenant", async () => {
      mockDb.feeCategory.findUnique.mockResolvedValue({ id: "cat_existing", code: "TUITION" });

      await expect(
        service.createFeeCategory({ tenantId, code: "TUITION", name: "Duplicate" }, mockDb)
      ).rejects.toThrow(ConflictError);
    });

    it("should create multi-item fee structure with calculated total", async () => {
      mockDb.academicYear.findFirst.mockResolvedValue({ id: "ay_2026", tenantId });
      mockDb.feeStructure.create.mockResolvedValue({
        id: "struct_primary",
        tenantId,
        name: "Primary Grade 1 Annual Fee",
        totalAmount: new Decimal("45000.00"),
        academicYearId: "ay_2026",
        items: [
          { id: "item_1", name: "Term 1 Tuition", amount: new Decimal("20000.00") },
          { id: "item_2", name: "Term 2 Tuition", amount: new Decimal("20000.00") },
          { id: "item_3", name: "Annual Lab & Activity", amount: new Decimal("5000.00") },
        ],
      });

      const structure = await service.createFeeStructure(
        {
          tenantId,
          academicYearId: "ay_2026",
          name: "Primary Grade 1 Annual Fee",
          items: [
            { feeCategoryId: "cat_t1", name: "Term 1 Tuition", amount: 20000 },
            { feeCategoryId: "cat_t2", name: "Term 2 Tuition", amount: 20000 },
            { feeCategoryId: "cat_lab", name: "Annual Lab & Activity", amount: 5000 },
          ],
        },
        mockDb
      );

      expect(structure.id).toBe("struct_primary");
      expect(mockDb.feeStructure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            totalAmount: new Decimal("45000.00"),
          }),
        })
      );
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "fees.structure.created",
          }),
        })
      );
    });

    it("should reject fee structure creation with negative line item amounts", async () => {
      mockDb.academicYear.findFirst.mockResolvedValue({ id: "ay_2026", tenantId });

      await expect(
        service.createFeeStructure(
          {
            tenantId,
            academicYearId: "ay_2026",
            name: "Invalid Fee",
            items: [{ feeCategoryId: "cat_1", name: "Bad Item", amount: -500 }],
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Category B & D: Student Fee Assignment & Concessions", () => {
    it("should assign fee structure to student and compute net payable after concession", async () => {
      mockDb.studentProfile.findFirst.mockResolvedValue({ id: "stu_101", tenantId });
      mockDb.feeStructure.findFirst.mockResolvedValue({
        id: "struct_1",
        tenantId,
        totalAmount: new Decimal("50000.00"),
      });

      mockDb.studentFeeAssignment.upsert.mockResolvedValue({
        id: "asgn_101",
        tenantId,
        studentId: "stu_101",
        baseAmount: new Decimal("50000.00"),
        concessionAmount: new Decimal("10000.00"),
        netPayableAmount: new Decimal("40000.00"),
        status: "ACTIVE",
      });

      const assignment = await service.assignFeeToStudent(
        {
          tenantId,
          studentId: "stu_101",
          academicYearId: "ay_2026",
          feeStructureId: "struct_1",
          concessionAmount: 10000,
          discountReason: "Merit Scholarship",
          actorUserId: "usr_admin",
        },
        mockDb
      );

      expect(assignment.id).toBe("asgn_101");
      expect(mockDb.studentFeeAssignment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            baseAmount: new Decimal("50000.00"),
            concessionAmount: new Decimal("10000.00"),
            netPayableAmount: new Decimal("40000.00"),
          }),
        })
      );
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "fees.assignment.created",
          }),
        })
      );
    });

    it("should reject assignment if concession amount exceeds base fee", async () => {
      mockDb.studentProfile.findFirst.mockResolvedValue({ id: "stu_101", tenantId });
      mockDb.feeStructure.findFirst.mockResolvedValue({
        id: "struct_1",
        tenantId,
        totalAmount: new Decimal("50000.00"),
      });

      await expect(
        service.assignFeeToStudent(
          {
            tenantId,
            studentId: "stu_101",
            academicYearId: "ay_2026",
            feeStructureId: "struct_1",
            concessionAmount: 60000, // Exceeds base 50,000
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should reject assignment if concession amount is negative", async () => {
      mockDb.studentProfile.findFirst.mockResolvedValue({ id: "stu_101", tenantId });
      mockDb.feeStructure.findFirst.mockResolvedValue({
        id: "struct_1",
        tenantId,
        totalAmount: new Decimal("50000.00"),
      });

      await expect(
        service.assignFeeToStudent(
          {
            tenantId,
            studentId: "stu_101",
            academicYearId: "ay_2026",
            feeStructureId: "struct_1",
            concessionAmount: -500,
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Category C: Fee Invoicing & Void Controls", () => {
    it("should generate fee invoice with balance equal to subtotal minus discount", async () => {
      mockDb.studentProfile.findFirst.mockResolvedValue({ id: "stu_101", tenantId });
      mockDb.feeInvoice.count.mockResolvedValue(42);
      mockDb.feeInvoice.create.mockResolvedValue({
        id: "inv_1",
        tenantId,
        invoiceNumber: "INV-2026-00043",
        subtotalAmount: new Decimal("20000.00"),
        discountAmount: new Decimal("2000.00"),
        paidAmount: new Decimal("0.00"),
        balanceAmount: new Decimal("18000.00"),
        status: "ISSUED",
      });

      const invoice = await service.generateInvoice(
        {
          tenantId,
          studentId: "stu_101",
          academicYearId: "ay_2026",
          dueDate: new Date("2026-06-30"),
          discountAmount: 2000,
          items: [
            { feeCategoryId: "cat_tuition", description: "Term 1 Tuition", amount: 15000 },
            { feeCategoryId: "cat_lab", description: "Computer Lab Fee", amount: 5000 },
          ],
        },
        mockDb
      );

      expect(invoice.invoiceNumber).toBe("INV-2026-00043");
      expect(mockDb.feeInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: "INV-2026-00043",
            subtotalAmount: new Decimal("20000.00"),
            discountAmount: new Decimal("2000.00"),
            paidAmount: new Decimal("0.00"),
            balanceAmount: new Decimal("18000.00"),
            status: "ISSUED",
          }),
        })
      );
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "fees.invoice.issued",
          }),
        })
      );
    });

    it("should safely cancel pristine fee invoice with zero payments", async () => {
      mockDb.feeInvoice.findFirst.mockResolvedValue({
        id: "inv_pristine",
        tenantId,
        invoiceNumber: "INV-2026-00001",
        paidAmount: new Decimal("0.00"),
        balanceAmount: new Decimal("10000.00"),
        status: "ISSUED",
      });
      mockDb.feeInvoice.update.mockResolvedValue({
        id: "inv_pristine",
        status: "CANCELLED",
        balanceAmount: new Decimal("0.00"),
      });

      const cancelled = await service.cancelInvoice(
        tenantId,
        "inv_pristine",
        "Student changed stream before commencement",
        "usr_admin",
        undefined,
        mockDb
      );

      expect(cancelled.status).toBe("CANCELLED");
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "fees.invoice.voided",
          }),
        })
      );
    });

    it("should reject cancellation of invoice that already has collected payments", async () => {
      mockDb.feeInvoice.findFirst.mockResolvedValue({
        id: "inv_paid",
        tenantId,
        invoiceNumber: "INV-2026-00002",
        paidAmount: new Decimal("5000.00"), // Already has payments!
        balanceAmount: new Decimal("5000.00"),
        status: "PARTIALLY_PAID",
      });

      await expect(
        service.cancelInvoice(tenantId, "inv_paid", "Cancel attempt", "usr_admin", undefined, mockDb)
      ).rejects.toThrow(ValidationError);
    });
  });
});
