import { describe, it, expect, vi, beforeEach } from "vitest";
import { getScopedPrisma, isTenantScopedModel } from "@/lib/tenant/scoped-prisma";
import { CrossTenantAccessError } from "@/lib/errors";

describe("Tenant Isolation Invariants 1-8 (Step 4C)", () => {
  const activeTenantId = "tnt_isolated_school";
  const foreignTenantId = "tnt_hacker_victim_school";

  let mockRawQuery: any;
  let mockPrismaBase: any;
  let scopedDb: any;

  beforeEach(() => {
    mockRawQuery = vi.fn().mockImplementation((args) => Promise.resolve({ success: true, args }));

    // Create a mock base client that supports $extends
    mockPrismaBase = {
      $extends: vi.fn().mockImplementation((extension) => {
        // Build a mock extended client invoking extension query handlers
        const handlers = extension.query.$allModels;

        const makeModelProxy = (modelName: string) => ({
          findMany: (args: any) =>
            handlers.findMany({ model: modelName, args: args || {}, query: mockRawQuery }),
          findFirst: (args: any) =>
            handlers.findFirst({ model: modelName, args: args || {}, query: mockRawQuery }),
          count: (args: any) =>
            handlers.count({ model: modelName, args: args || {}, query: mockRawQuery }),
          create: (args: any) =>
            handlers.create({ model: modelName, args: args || {}, query: mockRawQuery }),
          createMany: (args: any) =>
            handlers.createMany({ model: modelName, args: args || {}, query: mockRawQuery }),
          update: (args: any) =>
            handlers.update({ model: modelName, args: args || {}, query: mockRawQuery }),
          updateMany: (args: any) =>
            handlers.updateMany({ model: modelName, args: args || {}, query: mockRawQuery }),
          delete: (args: any) =>
            handlers.delete({ model: modelName, args: args || {}, query: mockRawQuery }),
          deleteMany: (args: any) =>
            handlers.deleteMany({ model: modelName, args: args || {}, query: mockRawQuery }),
        });

        return {
          studentProfile: makeModelProxy("StudentProfile"),
          class: makeModelProxy("Class"),
          attendanceRecord: makeModelProxy("AttendanceRecord"),
          examResult: makeModelProxy("ExamResult"),
          user: makeModelProxy("User"),
          module: makeModelProxy("Module"),
          subscriptionPlan: makeModelProxy("SubscriptionPlan"),
        };
      }),
    };

    scopedDb = getScopedPrisma(activeTenantId, mockPrismaBase);
  });

  describe("INVARIANT 1: Automatic Tenant Scoping on Reads", () => {
    it("should automatically append where.tenantId on findMany queries", async () => {
      await scopedDb.studentProfile.findMany({
        where: { gender: "MALE" },
      });

      expect(mockRawQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            gender: "MALE",
            tenantId: activeTenantId,
          },
        })
      );
    });

    it("should automatically append where.tenantId on findFirst and count queries", async () => {
      await scopedDb.class.findFirst({ where: { sectionName: "10-A" } });
      expect(mockRawQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sectionName: "10-A", tenantId: activeTenantId },
        })
      );

      await scopedDb.attendanceRecord.count({ where: { status: "ABSENT" } });
      expect(mockRawQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "ABSENT", tenantId: activeTenantId },
        })
      );
    });
  });

  describe("INVARIANT 2 & 3: Safe Tenant Insertion & Foreign Tenant Creation Rejection", () => {
    it("should automatically inject active tenantId when creating a record without tenantId", async () => {
      await scopedDb.studentProfile.create({
        data: {
          admissionNumber: "2026-STU-001",
          fullName: "Rohan Varma",
        },
      });

      expect(mockRawQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            admissionNumber: "2026-STU-001",
            fullName: "Rohan Varma",
            tenantId: activeTenantId,
          },
        })
      );
    });

    it("should reject creation when caller explicitly provides a foreign tenantId (CrossTenantAccessError)", async () => {
      await expect(
        scopedDb.studentProfile.create({
          data: {
            admissionNumber: "2026-STU-002",
            fullName: "Sneha Rao",
            tenantId: foreignTenantId, // Cross-tenant injection attempt!
          },
        })
      ).rejects.toThrow(CrossTenantAccessError);

      expect(mockRawQuery).not.toHaveBeenCalled();
    });
  });

  describe("INVARIANT 4: Automatic Scoping on Updates & Reassignment Rejection", () => {
    it("should scope update queries to active tenantId", async () => {
      await scopedDb.class.update({
        where: { id: "cls_123" },
        data: { studentCapacity: 45 },
      });

      expect(mockRawQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cls_123", tenantId: activeTenantId },
          data: { studentCapacity: 45 },
        })
      );
    });

    it("should reject update attempting to reassign record to a foreign tenantId", async () => {
      await expect(
        scopedDb.class.update({
          where: { id: "cls_123" },
          data: { tenantId: foreignTenantId }, // Foreign reassignment attempt
        })
      ).rejects.toThrow(CrossTenantAccessError);

      expect(mockRawQuery).not.toHaveBeenCalled();
    });
  });

  describe("INVARIANT 5 & 6: Automatic Scoping on Deletions & Batch Operations", () => {
    it("should scope delete and deleteMany to active tenantId", async () => {
      await scopedDb.examResult.delete({
        where: { id: "res_99" },
      });

      expect(mockRawQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "res_99", tenantId: activeTenantId },
        })
      );

      await scopedDb.examResult.deleteMany({
        where: { gradeLetter: "F" },
      });

      expect(mockRawQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { gradeLetter: "F", tenantId: activeTenantId },
        })
      );
    });
  });

  describe("INVARIANT 7: Global / Platform Model Non-Interference", () => {
    it("should recognize global models and NOT inject tenantId into them", async () => {
      expect(isTenantScopedModel("User")).toBe(false);
      expect(isTenantScopedModel("Module")).toBe(false);
      expect(isTenantScopedModel("SubscriptionPlan")).toBe(false);

      await scopedDb.user.findMany({
        where: { email: "global@example.com" },
      });

      // Must NOT append tenantId: activeTenantId
      expect(mockRawQuery).toHaveBeenCalledWith({
        where: { email: "global@example.com" },
      });
    });
  });
});
