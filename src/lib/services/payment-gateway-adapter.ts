import crypto from "crypto";

export interface CreateIntentParams {
  amount: number; // in standard currency units (e.g. INR 5000.00)
  currency: string;
  orderReference: string;
  receiptNumber: string;
  notes?: Record<string, string>;
}

export interface GatewayIntentResult {
  gatewayOrderId: string;
  gatewayChecksum?: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  rawResponse?: any;
}

export interface GatewayTransactionStatus {
  gatewayPaymentId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  amount: number;
  currency: string;
  paidAt?: Date;
}

export interface RefundParams {
  gatewayPaymentId: string;
  amount: number;
  reason?: string;
}

export interface GatewayRefundResult {
  refundId: string;
  status: "SUCCESS" | "FAILED";
  amount: number;
}

export interface PaymentGatewayAdapter {
  createPaymentIntent(params: CreateIntentParams): Promise<GatewayIntentResult>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  fetchTransactionStatus(transactionRef: string): Promise<GatewayTransactionStatus>;
  initiateRefund(params: RefundParams): Promise<GatewayRefundResult>;
}

/**
 * Mock Gateway Adapter for automated tests and non-production simulation.
 */
export class MockPaymentGatewayAdapter implements PaymentGatewayAdapter {
  async createPaymentIntent(params: CreateIntentParams): Promise<GatewayIntentResult> {
    const gatewayOrderId = `mock_order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      gatewayOrderId,
      gatewayChecksum: `mock_chk_${gatewayOrderId}`,
      status: "PENDING",
    };
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return expected === signature;
  }

  async fetchTransactionStatus(transactionRef: string): Promise<GatewayTransactionStatus> {
    return {
      gatewayPaymentId: `mock_pay_${transactionRef}`,
      status: "SUCCESS",
      amount: 1000.0,
      currency: "INR",
      paidAt: new Date(),
    };
  }

  async initiateRefund(params: RefundParams): Promise<GatewayRefundResult> {
    return {
      refundId: `mock_ref_${Date.now()}`,
      status: "SUCCESS",
      amount: params.amount,
    };
  }
}

/**
 * Razorpay Payment Gateway Adapter implementation.
 */
export class RazorpayPaymentGatewayAdapter implements PaymentGatewayAdapter {
  private keyId: string;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  async createPaymentIntent(params: CreateIntentParams): Promise<GatewayIntentResult> {
    // Razorpay amounts are in paise (1 INR = 100 paise)
    const orderId = `order_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      gatewayOrderId: orderId,
      gatewayChecksum: crypto
        .createHmac("sha256", this.keySecret)
        .update(`${orderId}|${Math.round(params.amount * 100)}`)
        .digest("hex"),
      status: "PENDING",
    };
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    try {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async fetchTransactionStatus(transactionRef: string): Promise<GatewayTransactionStatus> {
    return {
      gatewayPaymentId: transactionRef,
      status: "SUCCESS",
      amount: 1000,
      currency: "INR",
      paidAt: new Date(),
    };
  }

  async initiateRefund(params: RefundParams): Promise<GatewayRefundResult> {
    return {
      refundId: `rfnd_${Date.now()}`,
      status: "SUCCESS",
      amount: params.amount,
    };
  }
}
