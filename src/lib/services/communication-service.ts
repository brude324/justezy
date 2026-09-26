import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { NotFoundError } from "@/lib/errors";

export interface CreateAnnouncementInput {
  tenantId: string;
  title: string;
  category?: any;
  bodyMarkdown: string;
  targetAudienceScope?: any;
  isUrgent?: boolean;
  authorUserId: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateEventInput {
  tenantId: string;
  academicYearId: string;
  title: string;
  eventType?: any;
  startDateTime: Date;
  endDateTime: Date;
  allDay?: boolean;
  isSchoolClosed?: boolean;
  location?: string;
  description?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export class CommunicationService {
  // ==========================================
  // ANNOUNCEMENTS
  // ==========================================

  async createAnnouncement(input: CreateAnnouncementInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const announcement = await tx.announcement.create({
        data: {
          tenantId: input.tenantId,
          title: input.title.trim(),
          category: input.category || "GENERAL",
          bodyMarkdown: input.bodyMarkdown.trim(),
          targetAudienceScope: input.targetAudienceScope || "ALL_SCHOOL",
          isUrgent: input.isUrgent ?? false,
          authorUserId: input.authorUserId,
          status: "PUBLISHED",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId || input.authorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ACADEMIC",
          action: "ANNOUNCEMENT_PUBLISHED",
          entityType: "Announcement",
          entityId: announcement.id,
          diffJson: JSON.stringify({ title: announcement.title, isUrgent: announcement.isUrgent }),
        },
      });

      logger.info("Announcement published", { tenantId: input.tenantId, announcementId: announcement.id });
      return announcement;
    });
  }

  async deleteAnnouncement(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const announcement = await db.announcement.findFirst({
      where: { id, tenantId },
    });

    if (!announcement) {
      throw new NotFoundError(`Announcement with ID '${id}' not found in this institution`);
    }

    return await db.$transaction(async (tx) => {
      await tx.announcement.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ACADEMIC",
          action: "ANNOUNCEMENT_DELETED",
          entityType: "Announcement",
          entityId: id,
          diffJson: JSON.stringify({ title: announcement.title }),
        },
      });

      logger.info("Announcement deleted", { tenantId, announcementId: id });
      return { success: true };
    });
  }

  async listAnnouncements(tenantId: string, db = prismaTarget) {
    return await db.announcement.findMany({
      where: { tenantId },
      orderBy: [{ isUrgent: "desc" }, { publishedAt: "desc" }],
    });
  }

  // ==========================================
  // EVENTS
  // ==========================================

  async createEvent(input: CreateEventInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          tenantId: input.tenantId,
          academicYearId: input.academicYearId,
          title: input.title.trim(),
          eventType: input.eventType || "GENERAL",
          startDateTime: input.startDateTime,
          endDateTime: input.endDateTime,
          allDay: input.allDay ?? false,
          isSchoolClosed: input.isSchoolClosed ?? false,
          location: input.location,
          description: input.description,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ACADEMIC",
          action: "EVENT_CREATED",
          entityType: "Event",
          entityId: event.id,
          diffJson: JSON.stringify({ title: event.title, start: event.startDateTime }),
        },
      });

      logger.info("Event scheduled", { tenantId: input.tenantId, eventId: event.id });
      return event;
    });
  }

  async deleteEvent(id: string, tenantId: string, actorUserId?: string, actorEmail?: string, db = prismaTarget) {
    const event = await db.event.findFirst({
      where: { id, tenantId },
    });

    if (!event) {
      throw new NotFoundError(`Event with ID '${id}' not found in this institution`);
    }

    return await db.$transaction(async (tx) => {
      await tx.event.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ACADEMIC",
          action: "EVENT_DELETED",
          entityType: "Event",
          entityId: id,
          diffJson: JSON.stringify({ title: event.title }),
        },
      });

      logger.info("Event deleted", { tenantId, eventId: id });
      return { success: true };
    });
  }

  async listEvents(tenantId: string, db = prismaTarget) {
    return await db.event.findMany({
      where: { tenantId },
      orderBy: { startDateTime: "asc" },
    });
  }
}

export const communicationService = new CommunicationService();
