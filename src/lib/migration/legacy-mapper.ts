/**
 * Legacy-to-Target Data Transformation Engine
 * Derived from docs/database/16-legacy-to-target-model-mapping.md
 * 
 * Contains pure, deterministic mapping functions that transform Step 0 single-tenant
 * records into target multi-tenant SaaS structures.
 */

export interface LegacyAdmin {
  id: string;
  username: string;
}

export interface LegacyTeacher {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  bloodType: string;
  sex: "MALE" | "FEMALE";
  birthday: Date;
}

export interface LegacyStudent {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  address: string;
  bloodType: string;
  sex: "MALE" | "FEMALE";
  birthday: Date;
  parentId: string;
  classId: number;
  gradeId: number;
}

export interface LegacyParent {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string;
  address: string;
}

export interface LegacyAttendance {
  id: number;
  date: Date;
  present: boolean;
  studentId: string;
  lessonId: number;
}

export interface LegacyResult {
  id: number;
  score: number;
  examId: number | null;
  assignmentId: number | null;
  studentId: string;
}

export type BloodGroupEnum =
  | "A_POS"
  | "A_NEG"
  | "B_POS"
  | "B_NEG"
  | "O_POS"
  | "O_NEG"
  | "AB_POS"
  | "AB_NEG"
  | "UNKNOWN";

export function normalizeBloodGroup(raw: string): BloodGroupEnum {
  const clean = raw.trim().toUpperCase();
  switch (clean) {
    case "A+":
    case "A_POS":
      return "A_POS";
    case "A-":
    case "A_NEG":
      return "A_NEG";
    case "B+":
    case "B_POS":
      return "B_POS";
    case "B-":
    case "B_NEG":
      return "B_NEG";
    case "O+":
    case "O_POS":
      return "O_POS";
    case "O-":
    case "O_NEG":
      return "O_NEG";
    case "AB+":
    case "AB_POS":
      return "AB_POS";
    case "AB-":
    case "AB_NEG":
      return "AB_NEG";
    default:
      return "UNKNOWN";
  }
}

export function transformAdmin(admin: LegacyAdmin, tenantId: string) {
  const userId = `usr_admin_${admin.id}`;
  const sanitizedUsername = admin.username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return {
    user: {
      id: userId,
      clerkId: `clerk_migrated_admin_${admin.id}`,
      email: `${sanitizedUsername}@institution.internal`,
      firstName: admin.username,
      lastName: "Admin",
      displayName: admin.username,
      fullName: admin.username,
      isActive: true,
    },
    membership: {
      id: `mem_admin_${admin.id}`,
      tenantId,
      userId,
      roleKey: "INSTITUTION_OWNER",
      status: "ACTIVE" as const,
    },
  };
}

export function transformTeacher(teacher: LegacyTeacher, tenantId: string) {
  const userId = `usr_tch_${teacher.id}`;
  const fullName = `${teacher.name} ${teacher.surname}`.trim();
  const fallbackEmail = `teacher_${teacher.username.toLowerCase()}@institution.internal`;
  const membershipId = `mem_tch_${teacher.id}`;

  return {
    user: {
      id: userId,
      clerkId: `clerk_migrated_tch_${teacher.id}`,
      email: teacher.email || fallbackEmail,
      firstName: teacher.name,
      lastName: teacher.surname,
      displayName: fullName,
      fullName,
      phone: teacher.phone || undefined,
      isActive: true,
    },
    membership: {
      id: membershipId,
      tenantId,
      userId,
      roleKey: "TEACHER",
      status: "ACTIVE" as const,
    },
    staffProfile: {
      id: teacher.id,
      tenantId,
      userId,
      membershipId,
      employeeId: `EMP-${teacher.id.toUpperCase()}`,
      fullName,
      gender: teacher.sex === "MALE" ? ("MALE" as const) : ("FEMALE" as const),
      designation: "Subject Teacher",
      department: "Academic",
      dateOfJoining: new Date("2026-04-01T00:00:00.000Z"),
      emergencyPhone: teacher.phone || undefined,
      status: "ACTIVE" as const,
      bloodGroup: normalizeBloodGroup(teacher.bloodType),
      dateOfBirth: teacher.birthday,
    },
  };
}

export function transformStudent(
  student: LegacyStudent,
  tenantId: string,
  academicYearId: string,
  targetClassId: string,
  rollNumber: number
) {
  const fullName = `${student.name} ${student.surname}`.trim();

  return {
    studentProfile: {
      id: student.id,
      tenantId,
      admissionNumber: student.username,
      fullName,
      dateOfBirth: student.birthday,
      gender: student.sex === "MALE" ? ("MALE" as const) : ("FEMALE" as const),
      bloodGroup: normalizeBloodGroup(student.bloodType),
      address: student.address,
      emergencyContactPhone: student.phone || "+91 00000 00000",
    },
    enrollment: {
      tenantId,
      studentId: student.id,
      classId: targetClassId,
      academicYearId,
      rollNumber,
      status: "ACTIVE" as const,
    },
    parentBinding: {
      tenantId,
      studentId: student.id,
      parentId: student.parentId,
      relationshipType: "LEGAL_GUARDIAN" as const,
      isPrimaryContact: true,
      canPickup: true,
    },
  };
}

export function transformParent(parent: LegacyParent, tenantId: string) {
  const userId = `usr_prt_${parent.id}`;
  const fullName = `${parent.name} ${parent.surname}`.trim();
  const fallbackEmail = `parent_${parent.username.toLowerCase()}@institution.internal`;
  const membershipId = `mem_prt_${parent.id}`;

  return {
    user: {
      id: userId,
      clerkId: `clerk_migrated_prt_${parent.id}`,
      email: parent.email || fallbackEmail,
      firstName: parent.name,
      lastName: parent.surname,
      displayName: fullName,
      fullName,
      phone: parent.phone,
      isActive: true,
    },
    membership: {
      id: membershipId,
      tenantId,
      userId,
      roleKey: "PARENT",
      status: "ACTIVE" as const,
    },
    parentProfile: {
      id: parent.id,
      tenantId,
      userId,
      fullName,
      primaryPhone: parent.phone,
      email: parent.email || fallbackEmail,
      address: parent.address,
      isActive: true,
    },
  };
}

export function transformAttendance(
  attendance: LegacyAttendance,
  tenantId: string,
  academicYearId: string,
  classId: string,
  markedByUserId: string
) {
  return {
    id: `att_${attendance.id}`,
    tenantId,
    academicYearId,
    classId,
    studentId: attendance.studentId,
    date: attendance.date,
    status: attendance.present ? ("PRESENT" as const) : ("ABSENT" as const),
    markedByUserId,
  };
}

export function transformResult(
  result: LegacyResult,
  tenantId: string,
  examPaperId: string
) {
  const score = result.score;
  let gradeLetter = "F";
  if (score >= 90) gradeLetter = "A+";
  else if (score >= 80) gradeLetter = "A";
  else if (score >= 70) gradeLetter = "B";
  else if (score >= 60) gradeLetter = "C";
  else if (score >= 50) gradeLetter = "D";

  return {
    id: `res_${result.id}`,
    tenantId,
    examPaperId,
    studentId: result.studentId,
    totalMarks: result.score,
    gradeLetter,
  };
}
