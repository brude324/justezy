import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentService } from "@/lib/services/assessment-service";
import { AssignmentService } from "@/lib/services/assignment-service";
import { CommunicationService } from "@/lib/services/communication-service";
import { ParentService } from "@/lib/services/parent-service";
import { ConflictError, NotFoundError } from "@/lib/errors";

describe("Assessment, Assignment, Parent & Communication Domain Tests (Step 4E)", () => {
  let assessmentService: AssessmentService;
  let assignmentService: AssignmentService;
  let parentService: ParentService;
  let communicationService: CommunicationService;
  let mockDb: any;

  const tenantA = "tnt_assessment_alpha";

  beforeEach(() => {
    assessmentService = new AssessmentService();
    assignmentService = new AssignmentService();
    parentService = new ParentService();
    communicationService = new CommunicationService();

    mockDb = {
      exam: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      examPaper: {
        deleteMany: vi.fn(),
      },
      examResult: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      assignment: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      assignmentSubmission: {
        count: vi.fn(),
        deleteMany: vi.fn(),
      },
      parentProfile: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      announcement: {
        findFirst: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      event: {
        findFirst: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockDb)),
    };
  });

  describe("Exam & Result Management", () => {
    it("should reject deleting exam if student results exist", async () => {
      mockDb.exam.findFirst.mockResolvedValue({
        id: "ex_1",
        tenantId: tenantA,
        title: "Mid-Term Exam",
        papers: [
          { id: "ep_1", _count: { results: 25 } }, // Has 25 recorded results!
        ],
      });

      await expect(
        assessmentService.deleteExam("ex_1", tenantA, "usr_admin", "admin@school.edu", mockDb)
      ).rejects.toThrow(ConflictError);
    });

    it("should reject deleting verified exam result", async () => {
      mockDb.examResult.findFirst.mockResolvedValue({
        id: "res_1",
        tenantId: tenantA,
        isVerified: true, // Verified ledger entry cannot be casually deleted
      });

      await expect(
        assessmentService.deleteResult("res_1", tenantA, "usr_admin", "admin@school.edu", mockDb)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Assignment Management", () => {
    it("should reject deleting assignment if graded student submissions exist", async () => {
      mockDb.assignment.findFirst.mockResolvedValue({
        id: "asg_math_1",
        tenantId: tenantA,
        title: "Calculus Homework",
        _count: { submissions: 15 },
      });
      mockDb.assignmentSubmission.count.mockResolvedValue(10); // 10 graded submissions!

      await expect(
        assignmentService.deleteAssignment("asg_math_1", tenantA, "usr_teacher", "teacher@school.edu", mockDb)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Parent Management", () => {
    it("should reject deleting parent if active student bindings exist", async () => {
      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "par_1",
        tenantId: tenantA,
        fullName: "Rajesh Kumar",
        _count: { children: 2 }, // Has 2 linked children
      });

      await expect(
        parentService.deleteParent("par_1", tenantA, "usr_admin", "admin@school.edu", mockDb)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Communication & Announcements", () => {
    it("should create announcement and write audit log", async () => {
      mockDb.announcement.create.mockResolvedValue({
        id: "ann_1",
        tenantId: tenantA,
        title: "Annual Sports Day",
        isUrgent: false,
      });

      const ann = await communicationService.createAnnouncement(
        {
          tenantId: tenantA,
          title: "Annual Sports Day",
          bodyMarkdown: "Sports day on Friday",
          authorUserId: "usr_principal",
        },
        mockDb
      );

      expect(ann.id).toBe("ann_1");
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "ANNOUNCEMENT_PUBLISHED",
            actionCategory: "ACADEMIC",
          }),
        })
      );
    });
  });
});
