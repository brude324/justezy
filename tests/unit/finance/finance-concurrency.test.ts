import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "@/lib/services/payment-service";
import { LedgerService } from "@/lib/services/ledger-service";
import { FeeService } from "@/lib/services/fee-service";
import { MockPaymentGatewayAdapter } from "@/lib/services/payment-gateway-adapter";
import { ValidationError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("Finance Concurrency & End-to-End Workflow Tests (Categories U, V, W)", () => {
  let feeService: FeeService;
  let paymentService: PaymentService;
  let ledgerService: LedgerService;
  let mockAdapter: MockPaymentGatewayAdapter;
  let mockDb: any;
  const tenantId = "tnt_concurrency_test";

  beforeEach(() => {
    feeService = new FeeService();
    paymentService = new PaymentService();
    ledgerService = new LedgerService();
    mockAdapter = new MockPaymentGatewayAdapter();
    paymentService.setAdapter(mockAdapter);

    mockDb = {
      feeCategory: { findUnique: vi.fn(), create: vi.fn() },
      academicYear: { findFirst: vi.fn() },
      grade: { findFirst: vi.fn() },
      feeStructure: { findFirst: vi.fn(), create: vi.fn() },
      studentProfile: { findFirst: vi.fn(), findUnique: vi.fn() },
      studentFeeAssignment: { upsert: vi.fn() },
      feeInvoice: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      paymentIntent: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
      payment: { create: vi.fn(), update: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
      paymentAllocation: { create: vi.fn() },
      paymentRefund: { create: vi.fn(), count: vi.fn() },
      paymentWebhookEvent: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      financialPeriod: { findFirst: vi.fn() },
      chartOfAccount: { findUnique: vi.fn() },
      ledgerAccount: { update: vi.fn() },
      journalEntry: { create: vi.fn(), count: vi.fn() },
      auditLog: { create: vi.fn() },
      tenantOutboxEvent: { create: vi.fn().mockResolvedValue({ id: "outbox_1" }) },
      $transaction: vi.fn(async (cb) => cb(mockDb)),
    };
  });

  describe("Category U: Concurrency & Double Allocation Defenses", () => {
    it("should prevent duplicate webhook submissions from double-capturing orders", async () => {
      // First webhook arrives
      mockDb.paymentWebhookEvent.findUnique.mockResolvedValueOnce(null);
      mockDb.paymentWebhookEvent.create.mockResolvedValueOnce({ id: "wh_1", isProcessed: false });

      const res1 = await paymentService.processWebhook(
        {
          provider: "RAZORPAY",
          eventId: "evt_concur_1",
          eventType: "payment.captured",
          payloadString: JSON.stringify({ id: "pay_1", gatewayOrderId: "ord_1" }),
        },
        mockDb
      );
      expect(res1.duplicate).toBe(false);

      // Second identical webhook arrives simultaneously
      mockDb.paymentWebhookEvent.findUnique.mockResolvedValueOnce({
        id: "wh_1",
        eventId: "evt_concur_1",
        isProcessed: true,
      });

      const res2 = await paymentService.processWebhook(
        {
          provider: "RAZORPAY",
          eventId: "evt_concur_1",
          eventType: "payment.captured",
          payloadString: JSON.stringify({ id: "pay_1", gatewayOrderId: "ord_1" }),
        },
        mockDb
      );
      expect(res2.duplicate).toBe(true);
      // Ensure transaction logic was not executed twice
      expect(mockDb.paymentIntent.update).toHaveBeenCalledTimes(0);
    });

    it("should reject concurrent over-allocation when remaining balance is insufficient", async () => {
      // Invoice outstanding balance is only 1,000
      mockDb.feeInvoice.findFirst.mockResolvedValue({
        id: "inv_1",
        tenantId,
        invoiceNumber: "INV-2026-0001",
        balanceAmount: new Decimal("1000.00"),
        paidAmount: new Decimal("9000.00"),
      });

      // Attempting to allocate 1,500 must fail
      await expect(
        paymentService.recordPayment(
          {
            tenantId,
            studentId: "stu_1",
            amount: 1500,
            paymentMode: "CASH",
            allocations: [{ invoiceId: "inv_1", allocatedAmount: 1500 }],
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Category W: Complete End-to-End Financial Chain Workflow", () => {
    it("should execute complete financial chain from structure to balanced journal entry", async () => {
      // 1. Fee Structure Created
      mockDb.academicYear.findFirst.mockResolvedValue({ id: "ay_2026", tenantId });
      mockDb.feeStructure.create.mockResolvedValue({
        id: "struct_stem",
        tenantId,
        name: "STEM Annual Fee",
        totalAmount: new Decimal("60000.00"),
        academicYearId: "ay_2026",
      });

      const structure = await feeService.createFeeStructure(
        {
          tenantId,
          academicYearId: "ay_2026",
          name: "STEM Annual Fee",
          items: [
            { feeCategoryId: "cat_tuition", name: "Tuition", amount: 50000 },
            { feeCategoryId: "cat_lab", name: "Robotics Lab", amount: 10000 },
          ],
        },
        mockDb
      );
      expect(structure.id).toBe("struct_stem");

      // 2. Student Assigned Fee with 10,000 Concession (Net = 50,000)
      mockDb.studentProfile.findFirst.mockResolvedValue({ id: "stu_stem_1", tenantId });
      mockDb.feeStructure.findFirst.mockResolvedValue({
        id: "struct_stem",
        tenantId,
        totalAmount: new Decimal("60000.00"),
      });
      mockDb.studentFeeAssignment.upsert.mockResolvedValue({
        id: "asgn_1",
        netPayableAmount: new Decimal("50000.00"),
      });

      const asgn = await feeService.assignFeeToStudent(
        {
          tenantId,
          studentId: "stu_stem_1",
          academicYearId: "ay_2026",
          feeStructureId: "struct_stem",
          concessionAmount: 10000,
        },
        mockDb
      );
      expect(asgn.netPayableAmount).toEqual(new Decimal("50000.00"));

      // 3. Fee Invoice Issued for Term 1 (Amount = 25,000)
      mockDb.feeInvoice.count.mockResolvedValue(0);
      mockDb.feeInvoice.create.mockResolvedValue({
        id: "inv_t1",
        tenantId,
        invoiceNumber: "INV-2026-00001",
        subtotalAmount: new Decimal("25000.00"),
        discountAmount: new Decimal("0.00"),
        paidAmount: new Decimal("0.00"),
        balanceAmount: new Decimal("25000.00"),
        status: "ISSUED",
      });

      const invoice = await feeService.generateInvoice(
        {
          tenantId,
          studentId: "stu_stem_1",
          academicYearId: "ay_2026",
          dueDate: new Date("2026-07-15"),
          items: [{ feeCategoryId: "cat_tuition", description: "Term 1 Tuition", amount: 25000 }],
        },
        mockDb
      );
      expect(invoice.balanceAmount).toEqual(new Decimal("25000.00"));

      // 4. Online Payment Intent Generated
      mockDb.paymentIntent.create.mockResolvedValue({
        id: "pi_gateway",
        tenantId,
        studentId: "stu_stem_1",
        amount: new Decimal("25000.00"),
        gatewayOrderId: "order_mock_999",
        status: "PENDING",
      });

      const intent = await paymentService.createPaymentIntent(
        {
          tenantId,
          studentId: "stu_stem_1",
          amount: 25000,
        },
        mockDb
      );
      expect(intent.gatewayOrderId).toBe("order_mock_999");

      // 5. Payment Recorded & Allocated
      mockDb.feeInvoice.findFirst.mockResolvedValue({
        id: "inv_t1",
        tenantId,
        invoiceNumber: "INV-2026-00001",
        balanceAmount: new Decimal("25000.00"),
        paidAmount: new Decimal("0.00"),
      });
      mockDb.payment.count.mockResolvedValue(0);
      mockDb.payment.create.mockResolvedValue({
        id: "pay_t1",
        tenantId,
        receiptNumber: "RCP-2026-00001",
        amount: new Decimal("25000.00"),
        status: "SUCCESS",
        paymentMode: "ONLINE_GATEWAY",
        allocations: [{ invoiceId: "inv_t1", allocatedAmount: new Decimal("25000.00") }],
      });

      const payment = await paymentService.recordPayment(
        {
          tenantId,
          studentId: "stu_stem_1",
          amount: 25000,
          paymentMode: "ONLINE_GATEWAY",
          paymentIntentId: "pi_gateway",
          allocations: [{ invoiceId: "inv_t1", allocatedAmount: 25000 }],
        },
        mockDb
      );
      expect(payment.receiptNumber).toBe("RCP-2026-00001");
      expect(mockDb.feeInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv_t1" },
          data: expect.objectContaining({
            balanceAmount: new Decimal("0.00"),
            status: "PAID",
          }),
        })
      );

      // 6. Post Payment to General Ledger: DR Bank (1020), CR Accounts Receivable (1200)
      mockDb.financialPeriod.findFirst.mockResolvedValue({
        id: "period_1",
        tenantId,
        status: "OPEN",
      });
      mockDb.journalEntry.count.mockResolvedValue(10);
      mockDb.journalEntry.create.mockResolvedValue({
        id: "jrn_pay_1",
        entryNumber: "JRN-2026-00011",
        totalDebit: new Decimal("25000.00"),
        totalCredit: new Decimal("25000.00"),
        status: "POSTED",
      });

      mockDb.chartOfAccount.findUnique
        .mockResolvedValueOnce({
          id: "acc_bank",
          accountType: "ASSET",
          ledgerAccount: { id: "la_bank", currentBalance: new Decimal("50000.00") },
        })
        .mockResolvedValueOnce({
          id: "acc_ar",
          accountType: "ASSET",
          ledgerAccount: { id: "la_ar", currentBalance: new Decimal("25000.00") },
        });

      const journal = await ledgerService.postJournalEntry(
        {
          tenantId,
          periodId: "period_1",
          entryDate: new Date(),
          sourceType: "FEE_PAYMENT",
          sourceId: payment.id,
          narration: `Payment collected against invoice ${invoice.invoiceNumber}`,
          lines: [
            { accountId: "acc_bank", lineNumber: 1, debitAmount: 25000, creditAmount: 0 },
            { accountId: "acc_ar", lineNumber: 2, debitAmount: 0, creditAmount: 25000 },
          ],
        },
        mockDb
      );

      // Verify General Ledger balanced invariant
      expect(journal.totalDebit).toEqual(journal.totalCredit);
      expect(journal.entryNumber).toBe("JRN-2026-00011");
    });
  });
});
