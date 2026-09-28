import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { outboxService } from "./outbox-service";
import { PaymentGatewayAdapter, MockPaymentGatewayAdapter } from "./payment-gateway-adapter";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreatePaymentIntentInput {
  tenantId: string;
  studentId: string;
  amount: number | string | Decimal;
  currency?: string;
  provider?: "RAZORPAY" | "CASHFREE" | "STRIPE" | "MANUAL";
  actorUserId?: string;
  actorEmail?: string;
}

export interface PaymentAllocationItemInput {
  invoiceId: string;
  invoiceItemId?: string;
  allocatedAmount: number | string | Decimal;
}

export interface RecordPaymentInput {
  tenantId: string;
  studentId: string;
  payerParentId?: string;
  paymentIntentId?: string;
  amount: number | string | Decimal;
  paymentMode: "ONLINE_GATEWAY" | "CASH" | "CHEQUE" | "BANK_TRANSFER" | "POS_CARD" | "UPI_QR";
  transactionReference?: string;
  chequeNumber?: string;
  bankName?: string;
  gatewayPaymentId?: string;
  notes?: string;
  allocations: PaymentAllocationItemInput[];
  actorUserId?: string;
  actorEmail?: string;
}

export interface ProcessRefundInput {
  tenantId: string;
  paymentId: string;
  amount: number | string | Decimal;
  reason: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ProcessWebhookInput {
  tenantId?: string;
  provider: "RAZORPAY" | "CASHFREE" | "STRIPE" | "MANUAL";
  eventId: string;
  eventType: string;
  payloadString: string;
  signature?: string;
  webhookSecret?: string;
}

export class PaymentService {
  private defaultAdapter: PaymentGatewayAdapter = new MockPaymentGatewayAdapter();

  setAdapter(adapter: PaymentGatewayAdapter) {
    this.defaultAdapter = adapter;
  }

  /**
   * Initializes a PaymentIntent for an online fee payment session.
   */
  async createPaymentIntent(input: CreatePaymentIntentInput, db = prismaTarget) {
    const student = await db.studentProfile.findFirst({
      where: { id: input.studentId, tenantId: input.tenantId },
    });
    if (!student) {
      throw new NotFoundError("Student profile not found");
    }

    const amount = new Decimal(input.amount.toString());
    if (amount.isNegative() || amount.isZero()) {
      throw new ValidationError("Payment intent amount must be positive");
    }

    const currency = input.currency || "INR";
    const provider = input.provider || "RAZORPAY";

    // Request order from gateway adapter
    const intentResult = await this.defaultAdapter.createPaymentIntent({
      amount: amount.toNumber(),
      currency,
      orderReference: `order_${Date.now()}`,
      receiptNumber: `rcp_int_${Date.now()}`,
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour expiry

    const intent = await db.paymentIntent.create({
      data: {
        tenantId: input.tenantId,
        studentId: input.studentId,
        amount,
        currency,
        provider,
        gatewayOrderId: intentResult.gatewayOrderId,
        gatewayChecksum: intentResult.gatewayChecksum,
        status: "PENDING",
        expiresAt,
      },
    });

    logger.info("[PaymentService] PaymentIntent generated", {
      tenantId: input.tenantId,
      intentId: intent.id,
      gatewayOrderId: intent.gatewayOrderId,
      amount: amount.toString(),
    });

    return intent;
  }

  /**
   * Records a payment (online gateway or offline cash/cheque/UPI) and atomically
   * allocates it across outstanding fee invoices.
   *
   * Enforces:
   * Invariant 7: Total allocated <= Payment amount
   * Invariant 8: Invoice allocated <= Invoice balance
   */
  async recordPayment(input: RecordPaymentInput, db = prismaTarget) {
    const totalPayment = new Decimal(input.amount.toString());
    if (totalPayment.isNegative() || totalPayment.isZero()) {
      throw new ValidationError("Payment amount must be greater than zero");
    }

    if (!input.allocations || input.allocations.length === 0) {
      throw new ValidationError("Payment must have at least one invoice allocation");
    }

    // Verify Invariant 7: Total allocated cannot exceed payment amount
    let sumAllocated = new Decimal(0);
    for (const alloc of input.allocations) {
      const allocAmt = new Decimal(alloc.allocatedAmount.toString());
      if (allocAmt.isNegative() || allocAmt.isZero()) {
        throw new ValidationError("Allocation amount must be positive");
      }
      sumAllocated = sumAllocated.plus(allocAmt);
    }

    if (sumAllocated.greaterThan(totalPayment)) {
      throw new ValidationError(
        `Total allocated (${sumAllocated.toString()}) exceeds payment amount (${totalPayment.toString()})`
      );
    }

    return await db.$transaction(async (tx) => {
      // 1. Verify and update each invoice (Invariant 8)
      for (const alloc of input.allocations) {
        const invoice = await tx.feeInvoice.findFirst({
          where: { id: alloc.invoiceId, tenantId: input.tenantId },
        });

        if (!invoice) {
          throw new NotFoundError(`Fee invoice '${alloc.invoiceId}' not found`);
        }

        const allocAmt = new Decimal(alloc.allocatedAmount.toString());
        const currentBalance = new Decimal(invoice.balanceAmount.toString());

        if (allocAmt.greaterThan(currentBalance)) {
          throw new ValidationError(
            `Allocated amount (${allocAmt.toString()}) exceeds invoice '${invoice.invoiceNumber}' outstanding balance (${currentBalance.toString()})`
          );
        }

        const newPaid = new Decimal(invoice.paidAmount.toString()).plus(allocAmt);
        const newBalance = currentBalance.minus(allocAmt);
        const newStatus = newBalance.isZero() ? "PAID" : "PARTIALLY_PAID";

        await tx.feeInvoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaid,
            balanceAmount: newBalance,
            status: newStatus,
          },
        });
      }

      // 2. Generate unique receipt number
      const count = await tx.payment.count({
        where: { tenantId: input.tenantId },
      });
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

      // 3. Create Payment record
      const payment = await tx.payment.create({
        data: {
          tenantId: input.tenantId,
          receiptNumber,
          studentId: input.studentId,
          payerParentId: input.payerParentId,
          paymentIntentId: input.paymentIntentId,
          amount: totalPayment,
          paymentMode: input.paymentMode,
          status: "SUCCESS",
          transactionReference: input.transactionReference,
          chequeNumber: input.chequeNumber,
          bankName: input.bankName,
          gatewayPaymentId: input.gatewayPaymentId,
          notes: input.notes,
          allocations: {
            create: input.allocations.map((a) => ({
              tenantId: input.tenantId,
              invoiceId: a.invoiceId,
              invoiceItemId: a.invoiceItemId,
              allocatedAmount: new Decimal(a.allocatedAmount.toString()),
            })),
          },
        },
        include: { allocations: true },
      });

      // 4. Update PaymentIntent if linked
      if (input.paymentIntentId) {
        await tx.paymentIntent.update({
          where: { id: input.paymentIntentId },
          data: { status: "SUCCESS" },
        });
      }

      // 5. Transactional Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "FEES",
          action: "PAYMENT_COLLECTED",
          entityType: "Payment",
          entityId: payment.id,
          diffJson: JSON.stringify({
            receiptNumber,
            amount: totalPayment.toString(),
            mode: input.paymentMode,
            allocatedCount: input.allocations.length,
          }),
        },
      });

      // 6. Domain Outbox Events
      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "fees.payment.received",
        aggregateType: "Payment",
        aggregateId: payment.id,
        payload: {
          paymentId: payment.id,
          receiptNumber: payment.receiptNumber,
          studentId: input.studentId,
          amount: totalPayment.toString(),
          paymentMode: input.paymentMode,
        },
      });

      logger.info("[PaymentService] Payment recorded and allocated", {
        tenantId: input.tenantId,
        paymentId: payment.id,
        receiptNumber,
        amount: totalPayment.toString(),
      });

      return payment;
    });
  }

  /**
   * Processes a refund against a previous payment.
   *
   * Enforces:
   * Invariant 9: Refund amount <= Payment amount - already refunded
   */
  async processRefund(input: ProcessRefundInput, db = prismaTarget) {
    const refundAmt = new Decimal(input.amount.toString());
    if (refundAmt.isNegative() || refundAmt.isZero()) {
      throw new ValidationError("Refund amount must be positive");
    }

    const payment = await db.payment.findFirst({
      where: { id: input.paymentId, tenantId: input.tenantId },
      include: { refunds: true, allocations: true },
    });

    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    // Calculate previously refunded sum
    let priorRefunds = new Decimal(0);
    for (const ref of payment.refunds) {
      if (ref.status === "SUCCESS") {
        priorRefunds = priorRefunds.plus(new Decimal(ref.amount.toString()));
      }
    }

    const availableRefundable = new Decimal(payment.amount.toString()).minus(priorRefunds);

    if (refundAmt.greaterThan(availableRefundable)) {
      throw new ValidationError(
        `Refund amount (${refundAmt.toString()}) exceeds available refundable balance (${availableRefundable.toString()})`
      );
    }

    return await db.$transaction(async (tx) => {
      // 1. Generate refund number
      const count = await tx.paymentRefund.count({
        where: { tenantId: input.tenantId },
      });
      const refundNumber = `REF-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

      // 2. Create Refund record
      const refund = await tx.paymentRefund.create({
        data: {
          tenantId: input.tenantId,
          paymentId: input.paymentId,
          refundNumber,
          amount: refundAmt,
          reason: input.reason,
          status: "SUCCESS",
        },
      });

      // 3. Update payment status if fully refunded
      const totalRefundedNow = priorRefunds.plus(refundAmt);
      const isFullyRefunded = totalRefundedNow.equals(new Decimal(payment.amount.toString()));

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isFullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
        },
      });

      // 4. Adjust invoice balance back up by refunded amount
      if (payment.allocations.length > 0) {
        let remainingRefundToRebalance = refundAmt;
        for (const alloc of payment.allocations) {
          if (remainingRefundToRebalance.isZero()) break;
          const invoice = await tx.feeInvoice.findUnique({
            where: { id: alloc.invoiceId },
          });
          if (invoice) {
            const rebalanceAmt = Decimal.min(remainingRefundToRebalance, alloc.allocatedAmount);
            const newPaid = Decimal.max(new Decimal(0), new Decimal(invoice.paidAmount.toString()).minus(rebalanceAmt));
            const newBalance = new Decimal(invoice.balanceAmount.toString()).plus(rebalanceAmt);

            await tx.feeInvoice.update({
              where: { id: invoice.id },
              data: {
                paidAmount: newPaid,
                balanceAmount: newBalance,
                status: "PARTIALLY_PAID",
              },
            });
            remainingRefundToRebalance = remainingRefundToRebalance.minus(rebalanceAmt);
          }
        }
      }

      // 5. Transactional Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "FEES",
          action: "PAYMENT_REFUNDED",
          entityType: "PaymentRefund",
          entityId: refund.id,
          diffJson: JSON.stringify({
            refundNumber,
            paymentId: payment.id,
            amount: refundAmt.toString(),
            reason: input.reason,
          }),
        },
      });

      // 6. Outbox Event
      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "fees.refund.processed",
        aggregateType: "PaymentRefund",
        aggregateId: refund.id,
        payload: {
          refundId: refund.id,
          paymentId: payment.id,
          amount: refundAmt.toString(),
          reason: input.reason,
        },
      });

      logger.info("[PaymentService] Payment refunded", {
        tenantId: input.tenantId,
        refundNumber,
        amount: refundAmt.toString(),
      });

      return refund;
    });
  }

  /**
   * Processes inbound payment gateway webhooks with cryptographic verification and
   * strict idempotency defense (Invariants 10 & 11).
   */
  async processWebhook(input: ProcessWebhookInput, db = prismaTarget) {
    // 1. Verify Webhook Signature if secret provided
    if (input.webhookSecret && input.signature) {
      const isValid = this.defaultAdapter.verifyWebhookSignature(
        input.payloadString,
        input.signature,
        input.webhookSecret
      );
      if (!isValid) {
        logger.warn("[PaymentService] Webhook signature verification failed", {
          provider: input.provider,
          eventId: input.eventId,
        });
        throw new ValidationError("Invalid webhook cryptographic signature");
      }
    }

    // 2. Invariants 10 & 11: Idempotency check on (provider, eventId)
    const existing = await db.paymentWebhookEvent.findUnique({
      where: { eventId: input.eventId },
    });

    if (existing) {
      logger.info("[PaymentService] Duplicate webhook ignored (idempotent replay defense)", {
        provider: input.provider,
        eventId: input.eventId,
        previouslyProcessed: existing.isProcessed,
      });
      return { duplicate: true, processed: existing.isProcessed };
    }

    // 3. Atomically record webhook event log
    return await db.$transaction(async (tx) => {
      const webhookLog = await tx.paymentWebhookEvent.create({
        data: {
          tenantId: input.tenantId,
          provider: input.provider,
          eventId: input.eventId,
          eventType: input.eventType,
          payloadJson: input.payloadString,
          isProcessed: false,
        },
      });

      // Parse payload
      let payload: any = {};
      try {
        payload = JSON.parse(input.payloadString);
      } catch {
        payload = {};
      }

      // Handle successful payment capture / order fulfillment
      if (
        input.eventType === "payment.captured" ||
        input.eventType === "order.paid" ||
        input.eventType === "payment_intent.succeeded"
      ) {
        const gatewayOrderId = payload.gatewayOrderId || payload.orderId || payload.id;
        if (gatewayOrderId) {
          const intent = await tx.paymentIntent.findUnique({
            where: { gatewayOrderId },
          });

          if (intent && intent.status !== "SUCCESS") {
            await tx.paymentIntent.update({
              where: { id: intent.id },
              data: { status: "SUCCESS" },
            });
          }
        }
      }

      // Mark webhook as processed
      await tx.paymentWebhookEvent.update({
        where: { id: webhookLog.id },
        data: {
          isProcessed: true,
          processedAt: new Date(),
        },
      });

      logger.info("[PaymentService] Webhook successfully processed", {
        eventId: input.eventId,
        provider: input.provider,
        eventType: input.eventType,
      });

      return { duplicate: false, processed: true };
    });
  }
}

export const paymentService = new PaymentService();
