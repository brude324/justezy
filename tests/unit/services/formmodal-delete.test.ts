import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deleteSubject,
  deleteClass,
  deleteTeacher,
  deleteStudent,
  deleteExam,
  deleteParent,
  deleteLesson,
  deleteAssignment,
  deleteResult,
  deleteAttendance,
  deleteEvent,
  deleteAnnouncement,
} from "@/lib/actions";
import {
  academicService,
  studentService,
  staffService,
  parentService,
  attendanceService,
  assessmentService,
  assignmentService,
  communicationService,
} from "@/lib/services";
import * as actionGuard from "@/lib/authorization/action-guard";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("FormModal Security Fix & Explicit Delete Actions (Step 4E)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deleteEvent must NOT route to deleteSubject and must call communicationService.deleteEvent", async () => {
    const subjectDeleteSpy = vi.spyOn(academicService, "deleteSubject").mockResolvedValue({ success: true } as any);
    const eventDeleteSpy = vi.spyOn(communicationService, "deleteEvent").mockResolvedValue({ success: true } as any);

    // Mock executeGuardedAction to execute handler
    vi.spyOn(actionGuard, "executeGuardedAction").mockImplementation(
      async (permissionKey, handler) => {
        expect(permissionKey).toBe("event.delete");
        await handler({
          tenant: { id: "tnt_1", slug: "school", name: "School", status: "ACTIVE", planTier: "STARTER" },
          user: { id: "usr_1", clerkId: "c_1", email: "adm@school.edu", firstName: "A", lastName: "B", displayName: "A B" },
          membership: { id: "mem_1", tenantId: "tnt_1", userId: "usr_1", roleId: "rol_admin", status: "ACTIVE" },
        });
        return { success: true, error: false };
      }
    );

    const formData = new FormData();
    formData.append("id", "evt_123");

    const res = await deleteEvent({ success: false, error: false }, formData);

    expect(res.success).toBe(true);
    // CRITICAL SECURITY INVARIANT: Event deletion must NEVER call deleteSubject
    expect(subjectDeleteSpy).not.toHaveBeenCalled();
    expect(eventDeleteSpy).toHaveBeenCalledWith("evt_123", "tnt_1", "usr_1", "adm@school.edu");
  });

  it("deleteAssignment must call assignmentService.deleteAssignment with assignment.delete permission", async () => {
    const assignDeleteSpy = vi.spyOn(assignmentService, "deleteAssignment").mockResolvedValue({ success: true } as any);

    vi.spyOn(actionGuard, "executeGuardedAction").mockImplementation(
      async (permissionKey, handler) => {
        expect(permissionKey).toBe("assignment.delete");
        await handler({
          tenant: { id: "tnt_1", slug: "school", name: "School", status: "ACTIVE", planTier: "STARTER" },
          user: { id: "usr_1", clerkId: "c_1", email: "adm@school.edu", firstName: "A", lastName: "B", displayName: "A B" },
          membership: { id: "mem_1", tenantId: "tnt_1", userId: "usr_1", roleId: "rol_admin", status: "ACTIVE" },
        });
        return { success: true, error: false };
      }
    );

    const formData = new FormData();
    formData.append("id", "asg_456");

    const res = await deleteAssignment({ success: false, error: false }, formData);
    expect(res.success).toBe(true);
    expect(assignDeleteSpy).toHaveBeenCalledWith("asg_456", "tnt_1", "usr_1", "adm@school.edu");
  });

  it("deleteAnnouncement must call communicationService.deleteAnnouncement with announcement.delete permission", async () => {
    const annDeleteSpy = vi.spyOn(communicationService, "deleteAnnouncement").mockResolvedValue({ success: true } as any);

    vi.spyOn(actionGuard, "executeGuardedAction").mockImplementation(
      async (permissionKey, handler) => {
        expect(permissionKey).toBe("announcement.delete");
        await handler({
          tenant: { id: "tnt_1", slug: "school", name: "School", status: "ACTIVE", planTier: "STARTER" },
          user: { id: "usr_1", clerkId: "c_1", email: "adm@school.edu", firstName: "A", lastName: "B", displayName: "A B" },
          membership: { id: "mem_1", tenantId: "tnt_1", userId: "usr_1", roleId: "rol_admin", status: "ACTIVE" },
        });
        return { success: true, error: false };
      }
    );

    const formData = new FormData();
    formData.append("id", "ann_789");

    const res = await deleteAnnouncement({ success: false, error: false }, formData);
    expect(res.success).toBe(true);
    expect(annDeleteSpy).toHaveBeenCalledWith("ann_789", "tnt_1", "usr_1", "adm@school.edu");
  });

  it("should reject deletion when permission check fails in executeGuardedAction", async () => {
    vi.spyOn(actionGuard, "executeGuardedAction").mockResolvedValue({
      success: false,
      error: true,
      message: "Forbidden: Access denied",
    });

    const formData = new FormData();
    formData.append("id", "cls_forbidden");

    const res = await deleteClass({ success: false, error: false }, formData);
    expect(res.success).toBe(false);
    expect(res.error).toBe(true);
    expect(res.message).toContain("Forbidden");
  });
});
