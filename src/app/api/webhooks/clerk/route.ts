import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { userService } from "@/lib/services/user-service";
import { logger } from "@/lib/logger";
import { webhookRateLimiter, SlidingWindowRateLimiter } from "@/lib/security/rate-limiter";

interface WebhookEvent {
  type: string;
  data: any;
}

/**
 * Clerk Identity Webhook Handler
 * Endpoint: POST /api/webhooks/clerk
 *
 * Verifies cryptographic signature using Svix and updates the authoritative
 * application User record idempotently.
 */
export async function POST(req: Request) {
  // Apply rate limiting defense against webhook flooding
  const clientIp = req.headers.get("x-forwarded-for") || "webhook_client";
  const rateLimitResult = webhookRateLimiter.check(clientIp);
  if (!rateLimitResult.success) {
    logger.warn("Clerk webhook rate limit exceeded", { clientIp });
    return NextResponse.json(
      { error: "Too many requests. Webhook rate limit exceeded." },
      {
        status: 429,
        headers: SlidingWindowRateLimiter.getHeaders(rateLimitResult),
      }
    );
  }

  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn("Clerk webhook received missing Svix verification headers", {
      hasId: Boolean(svixId),
      hasTimestamp: Boolean(svixTimestamp),
      hasSignature: Boolean(svixSignature),
    });
    return NextResponse.json(
      { error: "Missing required Svix verification headers" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("CLERK_WEBHOOK_SECRET is not configured on the server");
    return NextResponse.json(
      { error: "Server webhook configuration error" },
      { status: 500 }
    );
  }

  const payload = await req.text();

  let evt: WebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
    evt = JSON.parse(payload) as WebhookEvent;
  } catch (err) {
    logger.warn("Clerk webhook signature verification failed", {
      svixId,
      error: err instanceof Error ? err.message : "Invalid signature",
    });
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  const eventType = evt.type;
  logger.info("Processing verified Clerk webhook event", {
    eventType,
    clerkUserId: evt.data?.id,
  });

  try {
    switch (eventType) {
      case "user.created":
      case "user.updated":
        await userService.syncClerkUser(evt.data);
        break;

      case "user.deleted":
        if (evt.data?.id) {
          await userService.deactivateUser(evt.data.id);
        }
        break;

      default:
        logger.info("Ignoring unhandled Clerk webhook event type", { eventType });
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("Error executing Clerk webhook identity synchronization", {
      eventType,
      clerkUserId: evt.data?.id,
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Internal identity synchronization failure" },
      { status: 500 }
    );
  }
}
