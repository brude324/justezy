import { describe, it, expect } from "vitest";
import { Webhook } from "svix";

describe("Clerk Webhook Security & Verification (Step 4C)", () => {
  const testSecret = "whsec_MfKQ9r8GKYdaOpWjdvgMm4Pfqd8H7dBv";

  it("should generate and verify a valid Svix webhook signature", () => {
    const wh = new Webhook(testSecret);
    const payload = JSON.stringify({
      type: "user.created",
      data: {
        id: "user_test_999",
        first_name: "Test",
        last_name: "User",
      },
    });

    const svixId = "msg_test_123";
    const now = new Date();
    const svixTimestamp = Math.floor(now.getTime() / 1000).toString();

    // Generate valid signature using Svix API: wh.sign(msgId, timestamp, payload)
    const signature = wh.sign(svixId, now, payload);

    // Verification must pass without throwing
    expect(() => {
      wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": signature,
      });
    }).not.toThrow();

    const parsed = JSON.parse(payload);
    expect(parsed.type).toBe("user.created");
    expect(parsed.data.id).toBe("user_test_999");
  });

  it("should reject tampered payload with invalid signature error", () => {
    const wh = new Webhook(testSecret);
    const payload = JSON.stringify({ type: "user.created", data: { id: "user_test_999" } });
    const tamperedPayload = JSON.stringify({ type: "user.created", data: { id: "user_hacked_attacker" } });

    const svixId = "msg_test_123";
    const now = new Date();
    const svixTimestamp = Math.floor(now.getTime() / 1000).toString();

    const signature = wh.sign(svixId, now, payload);

    // Verify tampered payload with original signature -> MUST throw
    expect(() => {
      wh.verify(tamperedPayload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": signature,
      });
    }).toThrow();
  });

  it("should reject expired timestamp signatures to prevent replay attacks", () => {
    const wh = new Webhook(testSecret);
    const payload = JSON.stringify({ type: "user.created", data: { id: "user_test_old" } });

    const svixId = "msg_test_old";
    // 10 minutes in the past (Svix default tolerance is 5 minutes = 300s)
    const oldTimestamp = new Date(Date.now() - 600 * 1000);
    const svixTimestamp = Math.floor(oldTimestamp.getTime() / 1000).toString();

    const signature = wh.sign(svixId, oldTimestamp, payload);

    expect(() => {
      wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": signature,
      });
    }).toThrow();
  });
});
