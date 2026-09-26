import prismaLegacy from "../src/lib/prisma";
import prismaTarget from "../src/lib/prisma-target";
import {
  transformAdmin,
  transformTeacher,
  transformStudent,
  transformParent,
  transformAttendance,
} from "../src/lib/migration/legacy-mapper";
import { seedSystemFoundations } from "../src/lib/seeds/seed-runner";
import { logger } from "../src/lib/logger";

export interface MigrationOptions {
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
  academicYearLabel?: string;
}

export async function runLegacyToTargetMigration(options: MigrationOptions = {}) {
  const tenantId = options.tenantId || "tnt_default_benchmark";
  const tenantSlug = options.tenantSlug || "default-academy";
  const tenantName = options.tenantName || "Default Academy";
  const yearLabel = options.academicYearLabel || "2026-2027";

  logger.info("[Migration ETL] Initializing Expand-and-Contract Migration ETL...", {
    tenantId,
    tenantSlug,
    tenantName,
  });

  const startTime = Date.now();

  // Step 1: Ensure Target Benchmark Tenant exists
  const tenant = await prismaTarget.tenant.upsert({
    where: { id: tenantId },
    update: { name: tenantName, slug: tenantSlug, status: "ACTIVE", planTier: "ACADEMIC_PRO" },
    create: {
      id: tenantId,
      slug: tenantSlug,
      name: tenantName,
      legalName: `${tenantName} Private Limited`,
      status: "ACTIVE",
      planTier: "ACADEMIC_PRO",
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
  });

  // Step 2: Seed System Foundations (Roles, Permissions, Modules)
  await seedSystemFoundations(prismaTarget);

  // Step 3: Ensure Default Academic Year exists
  const academicYear = await prismaTarget.academicYear.upsert({
    where: {
      tenantId_yearLabel: {
        tenantId: tenant.id,
        yearLabel,
      },
    },
    update: { status: "ACTIVE" },
    create: {
      tenantId: tenant.id,
      yearLabel,
      status: "ACTIVE",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2027-03-31T23:59:59.000Z"),
    },
  });

  // Helper: guarantee system role exists
  async function getRoleId(roleKey: string, roleName: string): Promise<string> {
    const existing = await prismaTarget.role.findFirst({
      where: { roleKey, tenantId: null },
    });
    if (existing) return existing.id;
    const created = await prismaTarget.role.create({
      data: {
        roleKey,
        name: roleName,
        isSystemRole: true,
      },
    });
    return created.id;
  }

  const ownerRoleId = await getRoleId("INSTITUTION_OWNER", "Institution Owner");
  const teacherRoleId = await getRoleId("TEACHER", "Teacher");
  const parentRoleId = await getRoleId("PARENT", "Parent / Legal Guardian");

  // Step 4: Migrate Admins
  const legacyAdmins = await prismaLegacy.admin.findMany();
  let migratedAdmins = 0;
  for (const admin of legacyAdmins) {
    const transformed = transformAdmin(admin, tenant.id);
    await prismaTarget.user.upsert({
      where: { id: transformed.user.id },
      update: {
        email: transformed.user.email,
        firstName: transformed.user.firstName,
        lastName: transformed.user.lastName,
        displayName: transformed.user.displayName,
        isActive: transformed.user.isActive,
      },
      create: {
        id: transformed.user.id,
        clerkId: transformed.user.clerkId,
        email: transformed.user.email,
        firstName: transformed.user.firstName,
        lastName: transformed.user.lastName,
        displayName: transformed.user.displayName,
        isActive: transformed.user.isActive,
      },
    });
    await prismaTarget.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: transformed.membership.tenantId,
          userId: transformed.membership.userId,
        },
      },
      update: { status: transformed.membership.status },
      create: {
        id: transformed.membership.id,
        tenantId: transformed.membership.tenantId,
        userId: transformed.membership.userId,
        roleId: ownerRoleId,
        status: transformed.membership.status,
      },
    });
    migratedAdmins++;
  }

  const primaryAdminId = legacyAdmins.length > 0 ? `usr_admin_${legacyAdmins[0].id}` : "usr_system";

  // Step 5: Migrate Teachers -> StaffProfile & User
  const legacyTeachers = await prismaLegacy.teacher.findMany();
  let migratedTeachers = 0;
  for (const teacher of legacyTeachers) {
    const transformed = transformTeacher(teacher, tenant.id);
    await prismaTarget.user.upsert({
      where: { id: transformed.user.id },
      update: {
        email: transformed.user.email,
        firstName: transformed.user.firstName,
        lastName: transformed.user.lastName,
        displayName: transformed.user.displayName,
        phone: transformed.user.phone,
        isActive: transformed.user.isActive,
      },
      create: {
        id: transformed.user.id,
        clerkId: transformed.user.clerkId,
        email: transformed.user.email,
        firstName: transformed.user.firstName,
        lastName: transformed.user.lastName,
        displayName: transformed.user.displayName,
        phone: transformed.user.phone,
        isActive: transformed.user.isActive,
      },
    });
    const membership = await prismaTarget.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: transformed.membership.tenantId,
          userId: transformed.membership.userId,
        },
      },
      update: { status: transformed.membership.status },
      create: {
        id: transformed.membership.id,
        tenantId: transformed.membership.tenantId,
        userId: transformed.membership.userId,
        roleId: teacherRoleId,
        status: transformed.membership.status,
      },
    });
    await prismaTarget.staffProfile.upsert({
      where: { id: transformed.staffProfile.id },
      update: {
        fullName: transformed.staffProfile.fullName,
        designation: transformed.staffProfile.designation,
        department: transformed.staffProfile.department,
        emergencyPhone: transformed.staffProfile.emergencyPhone,
        status: transformed.staffProfile.status,
      },
      create: {
        id: transformed.staffProfile.id,
        tenantId: transformed.staffProfile.tenantId,
        userId: transformed.staffProfile.userId,
        membershipId: membership.id,
        employeeId: transformed.staffProfile.employeeId,
        fullName: transformed.staffProfile.fullName,
        gender: transformed.staffProfile.gender,
        designation: transformed.staffProfile.designation,
        department: transformed.staffProfile.department,
        dateOfJoining: transformed.staffProfile.dateOfJoining,
        emergencyPhone: transformed.staffProfile.emergencyPhone,
        status: transformed.staffProfile.status,
      },
    });
    migratedTeachers++;
  }

  // Step 6: Migrate Grades
  const legacyGrades = await prismaLegacy.grade.findMany();
  let migratedGrades = 0;
  for (const grade of legacyGrades) {
    const gradeId = `grd_${grade.id}`;
    await prismaTarget.grade.upsert({
      where: { id: gradeId },
      update: { gradeLevel: grade.level, name: `Grade ${grade.level}` },
      create: {
        id: gradeId,
        tenantId: tenant.id,
        gradeLevel: grade.level,
        name: `Grade ${grade.level}`,
      },
    });
    migratedGrades++;
  }

  // Step 7: Migrate Classes
  const legacyClasses = await prismaLegacy.class.findMany();
  let migratedClasses = 0;
  for (const cls of legacyClasses) {
    const classId = `cls_${cls.id}`;
    const gradeId = `grd_${cls.gradeId}`;
    await prismaTarget.class.upsert({
      where: { id: classId },
      update: { sectionName: cls.name, studentCapacity: cls.capacity },
      create: {
        id: classId,
        tenantId: tenant.id,
        academicYearId: academicYear.id,
        gradeId,
        sectionName: cls.name,
        studentCapacity: cls.capacity,
      },
    });
    migratedClasses++;
  }

  // Step 8: Migrate Subjects
  const legacySubjects = await prismaLegacy.subject.findMany();
  let migratedSubjects = 0;
  for (const subject of legacySubjects) {
    const subjectId = `sub_${subject.id}`;
    const code = subject.name.substring(0, 4).toUpperCase();
    await prismaTarget.subject.upsert({
      where: { id: subjectId },
      update: { name: subject.name, subjectCode: code },
      create: {
        id: subjectId,
        tenantId: tenant.id,
        name: subject.name,
        subjectCode: code,
      },
    });
    migratedSubjects++;
  }

  // Step 9: Migrate Parents -> ParentProfile
  const legacyParents = await prismaLegacy.parent.findMany();
  let migratedParents = 0;
  for (const parent of legacyParents) {
    const transformed = transformParent(parent, tenant.id);
    await prismaTarget.user.upsert({
      where: { id: transformed.user.id },
      update: {
        email: transformed.user.email,
        firstName: transformed.user.firstName,
        lastName: transformed.user.lastName,
        displayName: transformed.user.displayName,
        phone: transformed.user.phone,
        isActive: transformed.user.isActive,
      },
      create: {
        id: transformed.user.id,
        clerkId: transformed.user.clerkId,
        email: transformed.user.email,
        firstName: transformed.user.firstName,
        lastName: transformed.user.lastName,
        displayName: transformed.user.displayName,
        phone: transformed.user.phone,
        isActive: transformed.user.isActive,
      },
    });
    await prismaTarget.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: transformed.membership.tenantId,
          userId: transformed.membership.userId,
        },
      },
      update: { status: transformed.membership.status },
      create: {
        id: transformed.membership.id,
        tenantId: transformed.membership.tenantId,
        userId: transformed.membership.userId,
        roleId: parentRoleId,
        status: transformed.membership.status,
      },
    });
    await prismaTarget.parentProfile.upsert({
      where: { id: transformed.parentProfile.id },
      update: {
        fullName: transformed.parentProfile.fullName,
        primaryPhone: transformed.parentProfile.primaryPhone,
        email: transformed.parentProfile.email,
        address: transformed.parentProfile.address,
      },
      create: {
        id: transformed.parentProfile.id,
        tenantId: transformed.parentProfile.tenantId,
        userId: transformed.parentProfile.userId,
        fullName: transformed.parentProfile.fullName,
        primaryPhone: transformed.parentProfile.primaryPhone,
        email: transformed.parentProfile.email,
        address: transformed.parentProfile.address,
      },
    });
    migratedParents++;
  }

  // Step 10: Migrate Students -> StudentProfile & Enrollment & ParentBinding
  const legacyStudents = await prismaLegacy.student.findMany();
  let migratedStudents = 0;
  const classRollMap = new Map<number, number>();

  for (const student of legacyStudents) {
    const currentRoll = (classRollMap.get(student.classId) || 0) + 1;
    classRollMap.set(student.classId, currentRoll);

    const targetClassId = `cls_${student.classId}`;
    const transformed = transformStudent(student, tenant.id, academicYear.id, targetClassId, currentRoll);

    await prismaTarget.studentProfile.upsert({
      where: { id: transformed.studentProfile.id },
      update: { fullName: transformed.studentProfile.fullName },
      create: transformed.studentProfile,
    });
    await prismaTarget.studentEnrollment.upsert({
      where: {
        tenantId_academicYearId_studentId: {
          tenantId: tenant.id,
          academicYearId: academicYear.id,
          studentId: student.id,
        },
      },
      update: { classId: transformed.enrollment.classId, rollNumber: currentRoll },
      create: transformed.enrollment,
    });
    await prismaTarget.studentParentBinding.upsert({
      where: {
        tenantId_studentId_parentId: {
          tenantId: tenant.id,
          studentId: student.id,
          parentId: student.parentId,
        },
      },
      update: {},
      create: transformed.parentBinding,
    });
    migratedStudents++;
  }

  // Step 11: Migrate Attendance Records
  const legacyAttendance = await prismaLegacy.attendance.findMany();
  let migratedAttendance = 0;
  const studentMap = new Map(legacyStudents.map((s) => [s.id, s.classId]));

  for (const att of legacyAttendance) {
    const classNumericId = studentMap.get(att.studentId) || 1;
    const targetClassId = `cls_${classNumericId}`;
    const transformed = transformAttendance(att, tenant.id, academicYear.id, targetClassId, primaryAdminId);
    await prismaTarget.attendanceRecord.upsert({
      where: { id: transformed.id },
      update: { status: transformed.status },
      create: transformed,
    });
    migratedAttendance++;
  }

  const durationMs = Date.now() - startTime;
  logger.info("[Migration ETL Complete] Legacy records migrated to target schema successfully", {
    migratedAdmins,
    migratedTeachers,
    migratedGrades,
    migratedClasses,
    migratedSubjects,
    migratedParents,
    migratedStudents,
    migratedAttendance,
    durationMs,
  });

  return {
    success: true,
    counts: {
      admins: migratedAdmins,
      teachers: migratedTeachers,
      grades: migratedGrades,
      classes: migratedClasses,
      subjects: migratedSubjects,
      parents: migratedParents,
      students: migratedStudents,
      attendance: migratedAttendance,
    },
    durationMs,
  };
}

if (require.main === module) {
  runLegacyToTargetMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error("[Migration Failure] Migration ETL failed", { error: String(err) });
      process.exit(1);
    });
}
