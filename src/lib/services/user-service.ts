import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";

export interface ClerkWebhookUserData {
  id: string;
  email_addresses?: Array<{
    id: string;
    email_address: string;
    verification?: { status?: string };
  }>;
  primary_email_address_id?: string;
  phone_numbers?: Array<{
    id: string;
    phone_number: string;
    verification?: { status?: string };
  }>;
  primary_phone_number_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
}

/**
 * Service for managing Application User lifecycle and Clerk identity synchronization.
 * Follows ADR-014 and docs/architecture/03-identity-authentication-authorization.md
 */
export class UserService {
  /**
   * Idempotently synchronizes a Clerk user payload into an application User record.
   * Safe for repeated webhook invocations and out-of-order delivery.
   */
  async syncClerkUser(data: ClerkWebhookUserData, db = prismaTarget) {
    if (!data.id) {
      throw new Error("Missing required clerkId in user synchronization payload");
    }

    // Resolve primary email address
    let email = `${data.id.toLowerCase()}@institution.internal`;
    let isEmailVerified = false;
    if (data.email_addresses && data.email_addresses.length > 0) {
      const primary = data.email_addresses.find(
        (e) => e.id === data.primary_email_address_id
      ) || data.email_addresses[0];
      email = primary.email_address;
      isEmailVerified = primary.verification?.status === "verified";
    }

    // Resolve primary phone number
    let phone: string | undefined = undefined;
    let isPhoneVerified = false;
    if (data.phone_numbers && data.phone_numbers.length > 0) {
      const primaryPhone = data.phone_numbers.find(
        (p) => p.id === data.primary_phone_number_id
      ) || data.phone_numbers[0];
      phone = primaryPhone.phone_number;
      isPhoneVerified = primaryPhone.verification?.status === "verified";
    }

    const firstName = data.first_name?.trim() || "User";
    const lastName = data.last_name?.trim() || "";
    const displayName = `${firstName} ${lastName}`.trim();
    const avatarUrl = data.image_url || undefined;

    const user = await db.user.upsert({
      where: { clerkId: data.id },
      create: {
        clerkId: data.id,
        email,
        phone,
        firstName,
        lastName,
        displayName,
        avatarUrl,
        isEmailVerified,
        isPhoneVerified,
        isActive: true,
      },
      update: {
        email,
        phone,
        firstName,
        lastName,
        displayName,
        avatarUrl,
        isEmailVerified,
        isPhoneVerified,
        isActive: true,
      },
    });

    logger.info("Clerk identity synchronized to application User", {
      clerkId: data.id,
      userId: user.id,
      isEmailVerified,
    });

    return user;
  }

  /**
   * Deactivates a user upon Clerk user.deleted event.
   */
  async deactivateUser(clerkId: string, db = prismaTarget) {
    if (!clerkId) {
      throw new Error("Missing required clerkId for user deactivation");
    }

    const existing = await db.user.findUnique({
      where: { clerkId },
    });

    if (!existing) {
      logger.warn("User deactivation requested for non-existent Clerk ID", { clerkId });
      return null;
    }

    const updated = await db.user.update({
      where: { clerkId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    logger.info("Application User deactivated via Clerk event", {
      clerkId,
      userId: updated.id,
    });

    return updated;
  }

  /**
   * Looks up an application User by their Clerk identity ID.
   */
  async findUserByClerkId(clerkId: string, db = prismaTarget) {
    return db.user.findUnique({
      where: { clerkId },
    });
  }

  /**
   * Looks up an application User by their canonical primary key.
   */
  async findUserById(userId: string, db = prismaTarget) {
    return db.user.findUnique({
      where: { id: userId },
    });
  }
}

export const userService = new UserService();
