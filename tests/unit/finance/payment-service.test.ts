import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentService } from "@/lib/services/payment-service";
import { MockPaymentGatewayAdapter } from "@/lib/services/payment-gateway-adapter";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("PaymentService Domain Tests — Wave 1 (Categories F, G, H, I, J, S, T)", () => {
  let service: PaymentService;
  let mockAdapter: MockPaymentGatewayAdapter;
  let mockDb: any;
  const tenantId = "tnt_test_school";

  beforeEach(() => {
    service = new PaymentService();
    mockAdapter = new MockPaymentGatewayAdapter();
    service.setAdapter(mockAdapter);

    mockDb = {
      studentProfile: {
        findFirst: vi.fn(),
      },
      paymentIntent: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
      },
      feeInvoice: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      paymentRefund: {
        create: vi.fn(),
        count: vi.fn(),
      },
      paymentWebhookEvent: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
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

  describe("Category F: Payment Intent & Initialization", () => {
    it("should initialize payment intent with unique gateway order id", async () => {
      mockDb.studentProfile.findFirst.mockResolvedValue({ id: "stu_1", tenantId });
      mockDb.paymentIntent.create.mockResolvedValue({
        id: "pi_1",
        tenantId,
        studentId: "stu_1",
        amount: new Decimal("15000.00"),
        gatewayOrderId: "mock_order_123",
        status: "PENDING",
      });

      const intent = await service.createPaymentIntent(
        {
          tenantId,
          studentId: "stu_1",
          amount: 15000,
          currency: "INR",
          provider: "RAZORPAY",
        },
        mockDb
      );

      expect(intent.id).toBe("pi_1");
      expect(mockDb.paymentIntent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            studentId: "stu_1",
            amount: new Decimal("15000.00"),
            currency: "INR",
            status: "PENDING",
          }),
        })
      );
    });

    it("should reject negative or zero payment intent amounts", async () => {
      mockDb.studentProfile.findFirst.mockResolvedValue({ id: "stu_1", tenantId });

      await expect(
        service.createPaymentIntent({ tenantId, studentId: "stu_1", amount: -100 }, mockDb)
      ).rejects.toThrow(ValidationError);

      await expect(
        service.createPaymentIntent({ tenantId, studentId: "stu_1", amount: 0 }, mockDb)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Category G: Payment Recording & Allocation (Invariants 7 & 8)", () => {
    it("should record payment, allocate to invoice, update balance, and issue receipt", async () => {
      mockDb.feeInvoice.findFirst.mockResolvedValue({
        id: "inv_1",
        tenantId,
        invoiceNumber: "INV-2026-00001",
        balanceAmount: new Decimal("10000.00"),
        paidAmount: new Decimal("0.00"),
      });

      mockDb.payment.count.mockResolvedValue(100);
      mockDb.payment.create.mockResolvedValue({
        id: "pay_1",
        tenantId,
        receiptNumber: "RCP-2026-00101",
        amount: new Decimal("10000.00"),
        status: "SUCCESS",
        paymentMode: "UPI_QR",
        allocations: [{ invoiceId: "inv_1", allocatedAmount: new Decimal("10000.00") }],
      });

      const payment = await service.recordPayment(
        {
          tenantId,
          studentId: "stu_1",
          amount: 10000,
          paymentMode: "UPI_QR",
          transactionReference: "UPI-REF-998877",
          allocations: [{ invoiceId: "inv_1", allocatedAmount: 10000 }],
        },
        mockDb
      );

      expect(payment.receiptNumber).toBe("RCP-2026-00101");
      // Verify Invariant 8: invoice balance updated to 0, status to PAID
      expect(mockDb.feeInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv_1" },
          data: expect.objectContaining({
            paidAmount: new Decimal("10000.00"),
            balanceAmount: new Decimal("0.00"),
            status: "PAID",
          }),
        })
      );
      // Verify audit & outbox
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "PAYMENT_COLLECTED",
            actionCategory: "FEES",
          }),
        })
      );
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "fees.payment.received",
          }),
        })
      );
    });

    it("should correctly update invoice status to PARTIALLY_PAID on partial payment", async () => {
      mockDb.feeInvoice.findFirst.mockResolvedValue({
        id: "inv_1",
        tenantId,
        invoiceNumber: "INV-2026-00001",
        balanceAmount: new Decimal("10000.00"),
        paidAmount: new Decimal("0.00"),
      });

      mockDb.payment.count.mockResolvedValue(101);
      mockDb.payment.create.mockResolvedValue({
        id: "pay_2",
        receiptNumber: "RCP-2026-00102",
      });

      await service.recordPayment(
        {
          tenantId,
          studentId: "stu_1",
          amount: 4000,
          paymentMode: "CASH",
          allocations: [{ invoiceId: "inv_1", allocatedAmount: 4000 }],
        },
        mockDb
      );

      expect(mockDb.feeInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv_1" },
          data: expect.objectContaining({
            paidAmount: new Decimal("4000.00"),
            balanceAmount: new Decimal("6000.00"),
            status: "PARTIALLY_PAID",
          }),
        })
      );
    });

    it("should enforce Invariant 7: reject if sum of allocations exceeds payment amount", async () => {
      await expect(
        service.recordPayment(
          {
            tenantId,
            studentId: "stu_1",
            amount: 5000,
            paymentMode: "CASH",
            allocations: [{ invoiceId: "inv_1", allocatedAmount: 6000 }], // 6000 > 5000!
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should enforce Invariant 8: reject if allocation exceeds outstanding invoice balance", async () => {
      mockDb.feeInvoice.findFirst.mockResolvedValue({
        id: "inv_1",
        tenantId,
        invoiceNumber: "INV-2026-00001",
        balanceAmount: new Decimal("3000.00"), // Only 3000 left
        paidAmount: new Decimal("7000.00"),
      });

      await expect(
        service.recordPayment(
          {
            tenantId,
            studentId: "stu_1",
            amount: 5000,
            paymentMode: "ONLINE_GATEWAY",
            allocations: [{ invoiceId: "inv_1", allocatedAmount: 4000 }], // 4000 > 3000!
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Category H: Refund Architecture (Invariant 9)", () => {
    it("should process refund, enforce non-over-refund, and re-balance invoice", async () => {
      mockDb.payment.findFirst.mockResolvedValue({
        id: "pay_1",
        tenantId,
        amount: new Decimal("10000.00"),
        refunds: [], // zero prior refunds
        allocations: [{ invoiceId: "inv_1", allocatedAmount: new Decimal("10000.00") }],
      });

      mockDb.paymentRefund.count.mockResolvedValue(5);
      mockDb.paymentRefund.create.mockResolvedValue({
        id: "ref_1",
        refundNumber: "REF-2026-00006",
        amount: new Decimal("5000.00"),
        status: "SUCCESS",
      });

      mockDb.feeInvoice.findUnique.mockResolvedValue({
        id: "inv_1",
        paidAmount: new Decimal("10000.00"),
        balanceAmount: new Decimal("0.00"),
      });

      const refund = await service.processRefund(
        {
          tenantId,
          paymentId: "pay_1",
          amount: 5000,
          reason: "Excess transport fee adjustment",
          actorUserId: "usr_admin",
        },
        mockDb
      );

      expect(refund.id).toBe("ref_1");
      // Payment status should transition to PARTIALLY_REFUNDED
      expect(mockDb.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay_1" },
          data: { status: "PARTIALLY_REFUNDED" },
        })
      );
      // Invoice balance should be re-increased
      expect(mockDb.feeInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv_1" },
          data: expect.objectContaining({
            paidAmount: new Decimal("5000.00"),
            balanceAmount: new Decimal("5000.00"),
            status: "PARTIALLY_PAID",
          }),
        })
      );
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "fees.refund.processed",
          }),
        })
      );
    });

    it("should enforce Invariant 9: reject refund amount exceeding available payment balance", async () => {
      mockDb.payment.findFirst.mockResolvedValue({
        id: "pay_1",
        tenantId,
        amount: new Decimal("5000.00"),
        refunds: [{ status: "SUCCESS", amount: new Decimal("4000.00") }], // 4000 already refunded
        allocations: [],
      });

      await expect(
        service.processRefund(
          {
            tenantId,
            paymentId: "pay_1",
            amount: 2000, // 2000 > (5000 - 4000 = 1000)
            reason: "Over refund attempt",
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Category I & J: Webhooks & Idempotency Defense (Invariants 10 & 11)", () => {
    it("should detect duplicate webhook event and return without repeating side effects", async () => {
      // Existing event in PaymentWebhookEvent table
      mockDb.paymentWebhookEvent.findUnique.mockResolvedValue({
        id: "evt_existing",
        eventId: "rzp_evt_repeat_123",
        isProcessed: true,
      });

      const result = await service.processWebhook(
        {
          provider: "RAZORPAY",
          eventId: "rzp_evt_repeat_123",
          eventType: "payment.captured",
          payloadString: JSON.stringify({ id: "pay_rzp_123" }),
        },
        mockDb
      );

      expect(result.duplicate).toBe(true);
      expect(result.processed).toBe(true);
      // Ensure no new webhook event was created
      expect(mockDb.paymentWebhookEvent.create).not.toHaveBeenCalled();
    });

    it("should process new webhook event atomically and record event log", async () => {
      mockDb.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockDb.paymentWebhookEvent.create.mockResolvedValue({
        id: "evt_new",
        eventId: "rzp_evt_first_time",
      });

      const result = await service.processWebhook(
        {
          provider: "RAZORPAY",
          eventId: "rzp_evt_first_time",
          eventType: "payment.captured",
          payloadString: JSON.stringify({ id: "pay_123", orderId: "ord_123" }),
        },
        mockDb
      );

      expect(result.duplicate).toBe(false);
      expect(result.processed).toBe(true);
      expect(mockDb.paymentWebhookEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: "rzp_evt_first_time",
            provider: "RAZORPAY",
            isProcessed: false,
          }),
        })
      );
      expect(mockDb.paymentWebhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "evt_new" },
          data: expect.objectContaining({
            isProcessed: true,
          }),
        })
      );
    });
  });
});
