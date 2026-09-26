import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService, ClerkWebhookUserData } from "@/lib/services/user-service";

describe("Identity Lifecycle & User Synchronization (Step 4C)", () => {
  let userService: UserService;
  let mockDb: any;

  beforeEach(() => {
    userService = new UserService();
    mockDb = {
      user: {
        upsert: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
    };
  });

  it("should synchronize a new Clerk user into an application User with primary email", async () => {
    const payload: ClerkWebhookUserData = {
      id: "user_clerk_123",
      first_name: "Aarav",
      last_name: "Sharma",
      email_addresses: [
        { id: "email_1", email_address: "aarav.sharma@example.com", verification: { status: "verified" } },
        { id: "email_2", email_address: "secondary@example.com", verification: { status: "unverified" } },
      ],
      primary_email_address_id: "email_1",
      phone_numbers: [
        { id: "phone_1", phone_number: "+91 98765 43210", verification: { status: "verified" } },
      ],
      primary_phone_number_id: "phone_1",
      image_url: "https://clerk.img/avatar.png",
    };

    mockDb.user.upsert.mockResolvedValue({
      id: "usr_app_1",
      clerkId: "user_clerk_123",
      email: "aarav.sharma@example.com",
      firstName: "Aarav",
      lastName: "Sharma",
      displayName: "Aarav Sharma",
      phone: "+91 98765 43210",
      avatarUrl: "https://clerk.img/avatar.png",
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    });

    const user = await userService.syncClerkUser(payload, mockDb);

    expect(mockDb.user.upsert).toHaveBeenCalledWith({
      where: { clerkId: "user_clerk_123" },
      create: {
        clerkId: "user_clerk_123",
        email: "aarav.sharma@example.com",
        phone: "+91 98765 43210",
        firstName: "Aarav",
        lastName: "Sharma",
        displayName: "Aarav Sharma",
        avatarUrl: "https://clerk.img/avatar.png",
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      },
      update: {
        email: "aarav.sharma@example.com",
        phone: "+91 98765 43210",
        firstName: "Aarav",
        lastName: "Sharma",
        displayName: "Aarav Sharma",
        avatarUrl: "https://clerk.img/avatar.png",
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      },
    });

    expect(user.id).toBe("usr_app_1");
    expect(user.displayName).toBe("Aarav Sharma");
  });

  it("should be idempotent when receiving duplicate Clerk webhook events", async () => {
    const payload: ClerkWebhookUserData = {
      id: "user_clerk_repeat",
      first_name: "Priya",
      last_name: "Patel",
      email_addresses: [
        { id: "e1", email_address: "priya@example.com", verification: { status: "verified" } },
      ],
    };

    mockDb.user.upsert.mockResolvedValue({
      id: "usr_priya",
      clerkId: "user_clerk_repeat",
      email: "priya@example.com",
      firstName: "Priya",
      lastName: "Patel",
      isActive: true,
    });

    // Execute twice simulating duplicate webhook delivery
    const run1 = await userService.syncClerkUser(payload, mockDb);
    const run2 = await userService.syncClerkUser(payload, mockDb);

    expect(mockDb.user.upsert).toHaveBeenCalledTimes(2);
    expect(run1.id).toBe(run2.id);
  });

  it("should deactivate user when Clerk user.deleted event arrives", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "usr_to_delete",
      clerkId: "user_clerk_del",
      isActive: true,
    });

    mockDb.user.update.mockResolvedValue({
      id: "usr_to_delete",
      clerkId: "user_clerk_del",
      isActive: false,
      deletedAt: new Date(),
    });

    const result = await userService.deactivateUser("user_clerk_del", mockDb);

    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { clerkId: "user_clerk_del" },
      data: expect.objectContaining({
        isActive: false,
      }),
    });
    expect(result?.isActive).toBe(false);
  });

  it("should reject sync when clerkId is empty", async () => {
    await expect(
      userService.syncClerkUser({ id: "" }, mockDb)
    ).rejects.toThrow("Missing required clerkId");
  });
});
