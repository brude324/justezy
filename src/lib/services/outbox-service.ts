import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";

export interface OutboxEventInput<T = any> {
  tenantId: string;
  eventType: string;
  eventVersion?: string;
  aggregateType: string;
  aggregateId: string;
  payload: T;
  correlationId?: string;
}

export class OutboxService {
  /**
   * Atomically emits a domain event into the TenantOutboxEvent table within a database transaction.
   */
  async emit<T = any>(input: OutboxEventInput<T>, tx: any = prismaTarget) {
    return this.emitEvent(tx, input);
  }

  async emitEvent<T = any>(
    tx: any,
    input: OutboxEventInput<T>
  ) {
    const correlationId = input.correlationId || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const eventVersion = input.eventVersion || "1.0";

    const outboxRecord = await tx.tenantOutboxEvent.create({
      data: {
        tenantId: input.tenantId,
        eventType: input.eventType,
        eventVersion,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payloadJson: JSON.stringify(input.payload),
        correlationId,
        isPublished: false,
      },
    });

    logger.debug("[Outbox] Domain event emitted into outbox", {
      tenantId: input.tenantId,
      eventType: input.eventType,
      aggregateId: input.aggregateId,
      outboxId: outboxRecord?.id || "outbox_mock",
    });

    return outboxRecord || { id: "outbox_mock" };
  }

  /**
   * Retrieves pending unpublished outbox events for background worker dispatch.
   */
  async getPendingEvents(limit = 50, db = prismaTarget) {
    return await db.tenantOutboxEvent.findMany({
      where: { isPublished: false },
      orderBy: { occurredAt: "asc" },
      take: limit,
    });
  }

  /**
   * Marks an outbox event as successfully published.
   */
  async markAsPublished(eventId: string, db = prismaTarget) {
    return await db.tenantOutboxEvent.update({
      where: { id: eventId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }
}

export const outboxService = new OutboxService();
