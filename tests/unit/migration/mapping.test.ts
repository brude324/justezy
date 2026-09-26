import { describe, it, expect } from "vitest";
import {
  transformAdmin,
  transformTeacher,
  transformStudent,
  transformParent,
  transformAttendance,
  transformResult,
  LegacyAdmin,
  LegacyTeacher,
  LegacyStudent,
  LegacyParent,
  LegacyAttendance,
  LegacyResult,
} from "@/lib/migration/legacy-mapper";

describe("Legacy to Target Transformation Ledger", () => {
  const tenantId = "tnt_test_benchmark";

  it("transformAdmin: should decompose Admin into User and TenantMembership with INSTITUTION_OWNER role", () => {
    const legacyAdmin: LegacyAdmin = {
      id: "admin1",
      username: "super_admin",
    };

    const result = transformAdmin(legacyAdmin, tenantId);

    expect(result.user.id).toBe("usr_admin_admin1");
    expect(result.user.clerkId).toBe("clerk_migrated_admin_admin1");
    expect(result.user.email).toBe("super_admin@institution.internal");
    expect(result.user.fullName).toBe("super_admin");
    expect(result.membership.roleKey).toBe("INSTITUTION_OWNER");
    expect(result.membership.tenantId).toBe(tenantId);
    expect(result.membership.status).toBe("ACTIVE");
    // Verify password is NOT present anywhere in target structure
    expect("password" in result.user).toBe(false);
  });

  it("transformTeacher: should decompose Teacher into User, TenantMembership, and StaffProfile", () => {
    const legacyTeacher: LegacyTeacher = {
      id: "tch_1",
      username: "rsharma",
      name: "Rajesh",
      surname: "Sharma",
      email: "r.sharma@school.edu",
      phone: "+91 98765 43210",
      address: "123 Academic Way",
      bloodType: "O+",
      sex: "MALE",
      birthday: new Date("1985-06-15"),
    };

    const result = transformTeacher(legacyTeacher, tenantId);

    expect(result.user.id).toBe("usr_tch_tch_1");
    expect(result.user.fullName).toBe("Rajesh Sharma");
    expect(result.user.email).toBe("r.sharma@school.edu");
    expect(result.membership.roleKey).toBe("TEACHER");

    expect(result.staffProfile.id).toBe("tch_1");
    expect(result.staffProfile.tenantId).toBe(tenantId);
    expect(result.staffProfile.employeeId).toBe("EMP-TCH_1");
    expect(result.staffProfile.bloodGroup).toBe("O_POS");
    expect(result.staffProfile.gender).toBe("MALE");
    expect(result.staffProfile.dateOfBirth).toEqual(new Date("1985-06-15"));
    expect("password" in result.user).toBe(false);
  });

  it("transformStudent: should transform Student into StudentProfile, StudentEnrollment, and StudentParentBinding", () => {
    const legacyStudent: LegacyStudent = {
      id: "stu_101",
      username: "2024STU101",
      name: "Aarav",
      surname: "Mehta",
      email: null,
      phone: "+91 91234 56789",
      address: "45 Palm Grove",
      bloodType: "B+",
      sex: "MALE",
      birthday: new Date("2010-08-20"),
      parentId: "prt_50",
      classId: 5,
      gradeId: 10,
    };

    const result = transformStudent(legacyStudent, tenantId, "ay_2026_2027", "cls_5", 1);

    expect(result.studentProfile.id).toBe("stu_101");
    expect(result.studentProfile.admissionNumber).toBe("2024STU101");
    expect(result.studentProfile.fullName).toBe("Aarav Mehta");
    expect(result.studentProfile.tenantId).toBe(tenantId);
    expect(result.studentProfile.gender).toBe("MALE");
    expect(result.studentProfile.bloodGroup).toBe("B_POS");

    expect(result.enrollment.classId).toBe("cls_5");
    expect(result.enrollment.academicYearId).toBe("ay_2026_2027");
    expect(result.enrollment.studentId).toBe("stu_101");
    expect(result.enrollment.rollNumber).toBe(1);

    expect(result.parentBinding.parentId).toBe("prt_50");
    expect(result.parentBinding.studentId).toBe("stu_101");
    expect(result.parentBinding.relationshipType).toBe("LEGAL_GUARDIAN");
    expect(result.parentBinding.isPrimaryContact).toBe(true);
  });

  it("transformParent: should decompose Parent into User, TenantMembership, and ParentProfile", () => {
    const legacyParent: LegacyParent = {
      id: "prt_50",
      username: "vikram_mehta",
      name: "Vikram",
      surname: "Mehta",
      email: "vikram@mehta.com",
      phone: "+91 98888 77777",
      address: "45 Palm Grove",
    };

    const result = transformParent(legacyParent, tenantId);

    expect(result.user.id).toBe("usr_prt_prt_50");
    expect(result.user.fullName).toBe("Vikram Mehta");
    expect(result.membership.roleKey).toBe("PARENT");
    expect(result.parentProfile.id).toBe("prt_50");
    expect(result.parentProfile.primaryPhone).toBe("+91 98888 77777");
  });

  it("transformAttendance: should map boolean present to rich AttendanceStatus enum", () => {
    const presentAtt: LegacyAttendance = {
      id: 1,
      date: new Date("2026-09-01"),
      present: true,
      studentId: "stu_101",
      lessonId: 10,
    };
    const absentAtt: LegacyAttendance = {
      id: 2,
      date: new Date("2026-09-02"),
      present: false,
      studentId: "stu_101",
      lessonId: 10,
    };

    const result1 = transformAttendance(presentAtt, tenantId, "ay_2026_2027", "cls_5", "usr_admin");
    const result2 = transformAttendance(absentAtt, tenantId, "ay_2026_2027", "cls_5", "usr_admin");

    expect(result1.status).toBe("PRESENT");
    expect(result1.tenantId).toBe(tenantId);
    expect(result1.classId).toBe("cls_5");
    expect(result1.academicYearId).toBe("ay_2026_2027");

    expect(result2.status).toBe("ABSENT");
  });

  it("transformResult: should calculate letter grades from score", () => {
    const highResult: LegacyResult = { id: 1, score: 95, examId: 12, assignmentId: null, studentId: "stu_101" };
    const midResult: LegacyResult = { id: 2, score: 75, examId: 12, assignmentId: null, studentId: "stu_101" };
    const lowResult: LegacyResult = { id: 3, score: 45, examId: 12, assignmentId: null, studentId: "stu_101" };

    expect(transformResult(highResult, tenantId, "ep_12").gradeLetter).toBe("A+");
    expect(transformResult(midResult, tenantId, "ep_12").gradeLetter).toBe("B");
    expect(transformResult(lowResult, tenantId, "ep_12").gradeLetter).toBe("F");
  });
});
