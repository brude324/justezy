"use server";

import { revalidatePath } from "next/cache";
import {
  ClassSchema,
  ExamSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { prismaTarget } from "@/lib/prisma-target";
import { clerkClient } from "@clerk/nextjs/server";
import { executeGuardedAction } from "@/lib/authorization/action-guard";
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

export type CurrentState = { success: boolean; error: boolean; message?: string };

// ==========================================
// SUBJECT ACTIONS
// ==========================================

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
): Promise<CurrentState> => {
  const result = await executeGuardedAction(
    "subject.create",
    async (context) => {
      const subjectCode = `SUB-${data.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8)}`;
      const subject = await academicService.createSubject({
        tenantId: context.tenant.id,
        name: data.name,
        subjectCode,
        actorUserId: context.user.id,
        actorEmail: context.user.email,
      });

      // Compatibility mirror to legacy prototype table if possible
      try {
        await prisma.subject.create({
          data: {
            name: data.name,
            teachers: {
              connect: data.teachers?.map((teacherId) => ({ id: teacherId })) || [],
            },
          },
        });
      } catch (e) {
        // Non-blocking legacy compatibility
      }

      return subject;
    }
  );

  if (result.success) {
    revalidatePath("/list/subjects");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true, message: "Missing Subject ID" };
  }

  const result = await executeGuardedAction(
    "subject.update",
    async (context) => {
      const updated = await academicService.updateSubject({
        id: String(data.id),
        tenantId: context.tenant.id,
        name: data.name,
        actorUserId: context.user.id,
        actorEmail: context.user.email,
      });

      try {
        await prisma.subject.update({
          where: { id: data.id },
          data: {
            name: data.name,
            teachers: {
              set: data.teachers?.map((teacherId) => ({ id: teacherId })) || [],
            },
          },
        });
      } catch (e) {
        // Non-blocking legacy compatibility
      }

      return updated;
    }
  );

  if (result.success) {
    revalidatePath("/list/subjects");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Subject ID" };
  }

  const result = await executeGuardedAction(
    "subject.delete",
    async (context) => {
      // 1. Target domain deletion with safety constraints
      await academicService.deleteSubject(
        id,
        context.tenant.id,
        context.user.id,
        context.user.email
      );

      // 2. Legacy table cleanup
      try {
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          await prisma.subject.delete({ where: { id: numId } });
        }
      } catch (e) {
        // Non-blocking legacy compatibility
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/subjects");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

// ==========================================
// CLASS ACTIONS
// ==========================================

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
): Promise<CurrentState> => {
  const result = await executeGuardedAction(
    "class.create",
    async (context) => {
      // Ensure target academic year and grade exist
      let academicYear = await prismaTarget.academicYear.findFirst({
        where: { tenantId: context.tenant.id, status: "ACTIVE" },
      });
      if (!academicYear) {
        academicYear = await prismaTarget.academicYear.create({
          data: {
            tenantId: context.tenant.id,
            yearLabel: "2026-2027",
            startDate: new Date("2026-04-01"),
            endDate: new Date("2027-03-31"),
            status: "ACTIVE",
          },
        });
      }

      let grade = await prismaTarget.grade.findFirst({
        where: { tenantId: context.tenant.id, gradeLevel: data.gradeId },
      });
      if (!grade) {
        grade = await prismaTarget.grade.create({
          data: {
            tenantId: context.tenant.id,
            gradeLevel: data.gradeId,
            name: `Grade ${data.gradeId}`,
          },
        });
      }

      const classRecord = await academicService.createClass({
        tenantId: context.tenant.id,
        academicYearId: academicYear.id,
        gradeId: grade.id,
        sectionName: data.name,
        studentCapacity: data.capacity,
        supervisorTeacherId: data.supervisorId,
        actorUserId: context.user.id,
        actorEmail: context.user.email,
      });

      try {
        await prisma.class.create({ data });
      } catch (e) {
        // Non-blocking legacy compatibility
      }

      return classRecord;
    }
  );

  if (result.success) {
    revalidatePath("/list/classes");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true, message: "Missing Class ID" };
  }

  const result = await executeGuardedAction(
    "class.update",
    async (context) => {
      const updated = await academicService.updateClass({
        id: String(data.id),
        tenantId: context.tenant.id,
        sectionName: data.name,
        studentCapacity: data.capacity,
        supervisorTeacherId: data.supervisorId || null,
        actorUserId: context.user.id,
        actorEmail: context.user.email,
      });

      try {
        await prisma.class.update({
          where: { id: data.id },
          data,
        });
      } catch (e) {
        // Non-blocking legacy compatibility
      }

      return updated;
    }
  );

  if (result.success) {
    revalidatePath("/list/classes");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Class ID" };
  }

  const result = await executeGuardedAction(
    "class.delete",
    async (context) => {
      await academicService.deleteClass(
        id,
        context.tenant.id,
        context.user.id,
        context.user.email
      );

      try {
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          await prisma.class.delete({ where: { id: numId } });
        }
      } catch (e) {
        // Non-blocking legacy compatibility
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/classes");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

// ==========================================
// TEACHER / STAFF ACTIONS
// ==========================================

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
): Promise<CurrentState> => {
  const result = await executeGuardedAction(
    "teacher.create",
    async (context) => {
      // 1. Create Clerk user account
      let clerkUserId = `user_${Date.now()}`;
      try {
        const user = await clerkClient.users.createUser({
          username: data.username,
          password: data.password || "TempTeacherPassword123!",
          firstName: data.name,
          lastName: data.surname,
          publicMetadata: { role: "teacher" },
        });
        clerkUserId = user.id;
      } catch (e) {
        // If Clerk fails or mock mode, keep generated id
      }

      // 2. Ensure application user and membership exist
      const [appUser, existingTeacherRole] = await Promise.all([
        prismaTarget.user.upsert({
          where: { clerkId: clerkUserId },
          create: {
            clerkId: clerkUserId,
            email: data.email || `${data.username}@institution.edu`,
            firstName: data.name,
            lastName: data.surname,
            displayName: `${data.name} ${data.surname}`,
          },
          update: {},
        }),
        prismaTarget.role.findFirst({
          where: {
            OR: [
              { tenantId: context.tenant.id, roleKey: "TEACHER" },
              { tenantId: null, roleKey: "TEACHER" },
            ],
          },
        }),
      ]);

      let teacherRole = existingTeacherRole;
      if (!teacherRole) {
        teacherRole = await prismaTarget.role.create({
          data: {
            roleKey: "TEACHER",
            name: "Teacher",
            isSystemRole: true,
          },
        });
      }

      const membership = await prismaTarget.tenantMembership.upsert({
        where: {
          tenantId_userId: {
            tenantId: context.tenant.id,
            userId: appUser.id,
          },
        },
        create: {
          tenantId: context.tenant.id,
          userId: appUser.id,
          roleId: teacherRole.id,
          status: "ACTIVE",
        },
        update: {},
      });

      // 3. Create StaffProfile
      const staff = await staffService.createStaff({
        tenantId: context.tenant.id,
        userId: appUser.id,
        membershipId: membership.id,
        employeeId: data.username.toUpperCase(),
        fullName: `${data.name} ${data.surname}`,
        gender: data.sex,
        designation: "Teacher",
        emergencyPhone: data.phone,
        actorUserId: context.user.id,
        actorEmail: context.user.email,
      });

      // 4. Legacy mirror
      try {
        await prisma.teacher.create({
          data: {
            id: clerkUserId,
            username: data.username,
            name: data.name,
            surname: data.surname,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address,
            img: data.img || null,
            bloodType: data.bloodType,
            sex: data.sex,
            birthday: data.birthday,
            subjects: {
              connect: data.subjects?.map((subjectId: string) => ({
                id: parseInt(subjectId),
              })) || [],
            },
          },
        });
      } catch (e) {
        // Non-blocking legacy compatibility
      }

      return staff;
    }
  );

  if (result.success) {
    revalidatePath("/list/teachers");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true, message: "Missing Teacher ID" };
  }

  const result = await executeGuardedAction(
    "teacher.update",
    async (context) => {
      // 1. Clerk update
      try {
        await clerkClient.users.updateUser(data.id!, {
          username: data.username,
          ...(data.password !== "" && { password: data.password }),
          firstName: data.name,
          lastName: data.surname,
        });
      } catch (e) {
        // Non-blocking Clerk error
      }

      // 2. Target staff profile update
      await staffService.updateStaff({
        id: data.id!,
        tenantId: context.tenant.id,
        fullName: `${data.name} ${data.surname}`,
        gender: data.sex,
        emergencyPhone: data.phone,
        actorUserId: context.user.id,
        actorEmail: context.user.email,
      });

      // 3. Legacy table update
      try {
        await prisma.teacher.update({
          where: { id: data.id },
          data: {
            username: data.username,
            name: data.name,
            surname: data.surname,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address,
            img: data.img || null,
            bloodType: data.bloodType,
            sex: data.sex,
            birthday: data.birthday,
            subjects: {
              set: data.subjects?.map((subjectId: string) => ({
                id: parseInt(subjectId),
              })) || [],
            },
          },
        });
      } catch (e) {
        // Non-blocking legacy compatibility
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/teachers");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Teacher ID" };
  }

  const result = await executeGuardedAction(
    "teacher.delete",
    async (context) => {
      // 1. Safe domain deletion
      await staffService.deleteStaff(
        id,
        context.tenant.id,
        context.user.id,
        context.user.email
      );

      // 2. Clerk account deletion
      try {
        await clerkClient.users.deleteUser(id);
      } catch (e) {
        // Non-blocking
      }

      // 3. Legacy table cleanup
      try {
        await prisma.teacher.delete({ where: { id } });
      } catch (e) {
        // Non-blocking
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/teachers");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

// ==========================================
// STUDENT ACTIONS
// ==========================================

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
): Promise<CurrentState> => {
  const result = await executeGuardedAction(
    "student.create",
    async (context) => {
      // 1. Target academic year resolution
      let academicYear = await prismaTarget.academicYear.findFirst({
        where: { tenantId: context.tenant.id, status: "ACTIVE" },
      });
      if (!academicYear) {
        academicYear = await prismaTarget.academicYear.create({
          data: {
            tenantId: context.tenant.id,
            yearLabel: "2026-2027",
            startDate: new Date("2026-04-01"),
            endDate: new Date("2027-03-31"),
            status: "ACTIVE",
          },
        });
      }

      // 2. Target Student Profile creation
      const student = await studentService.createStudent({
        tenantId: context.tenant.id,
        admissionNumber: data.username.toUpperCase(),
        fullName: `${data.name} ${data.surname}`,
        gender: data.sex,
        dateOfBirth: data.birthday,
        bloodGroup: data.bloodType,
        address: data.address,
        classId: String(data.classId),
        academicYearId: academicYear.id,
        parentId: data.parentId,
        actorUserId: context.user.id,
        actorEmail: context.user.email,
      });

      // 3. Legacy prototype creation
      try {
        let clerkUserId = `user_${Date.now()}`;
        try {
          const user = await clerkClient.users.createUser({
            username: data.username,
            password: data.password || "TempStudentPass123!",
            firstName: data.name,
            lastName: data.surname,
            publicMetadata: { role: "student" },
          });
          clerkUserId = user.id;
        } catch (e) {
          // Mock mode fallback
        }

        await prisma.student.create({
          data: {
            id: clerkUserId,
            username: data.username,
            name: data.name,
            surname: data.surname,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address,
            img: data.img || null,
            bloodType: data.bloodType,
            sex: data.sex,
            birthday: data.birthday,
            gradeId: data.gradeId,
            classId: data.classId,
            parentId: data.parentId,
          },
        });
      } catch (e) {
        // Non-blocking legacy compatibility
      }

      return student;
    }
  );

  if (result.success) {
    revalidatePath("/list/students");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true, message: "Missing Student ID" };
  }

  const result = await executeGuardedAction(
    "student.update",
    async (context) => {
      // 1. Target student profile update
      await studentService.updateStudent({
        id: data.id!,
        tenantId: context.tenant.id,
        fullName: `${data.name} ${data.surname}`,
        gender: data.sex,
        dateOfBirth: data.birthday,
        bloodGroup: data.bloodType,
        address: data.address,
        actorUserId: context.user.id,
        actorEmail: context.user.email,
      });

      // 2. Legacy table update
      try {
        await prisma.student.update({
          where: { id: data.id },
          data: {
            username: data.username,
            name: data.name,
            surname: data.surname,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address,
            img: data.img || null,
            bloodType: data.bloodType,
            sex: data.sex,
            birthday: data.birthday,
            gradeId: data.gradeId,
            classId: data.classId,
            parentId: data.parentId,
          },
        });
      } catch (e) {
        // Non-blocking legacy compatibility
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/students");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Student ID" };
  }

  const result = await executeGuardedAction(
    "student.delete",
    async (context) => {
      await studentService.deleteStudent(
        id,
        context.tenant.id,
        context.user.id,
        context.user.email
      );

      try {
        await clerkClient.users.deleteUser(id);
      } catch (e) {
        // Non-blocking
      }

      try {
        await prisma.student.delete({ where: { id } });
      } catch (e) {
        // Non-blocking
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/students");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

// ==========================================
// EXAM ACTIONS
// ==========================================

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
): Promise<CurrentState> => {
  const result = await executeGuardedAction(
    "exam.create",
    async (context) => {
      let academicYear = await prismaTarget.academicYear.findFirst({
        where: { tenantId: context.tenant.id, status: "ACTIVE" },
      });
      if (!academicYear) {
        academicYear = await prismaTarget.academicYear.create({
          data: {
            tenantId: context.tenant.id,
            yearLabel: "2026-2027",
            startDate: new Date("2026-04-01"),
            endDate: new Date("2027-03-31"),
            status: "ACTIVE",
          },
        });
      }

      let term = await prismaTarget.term.findFirst({
        where: { tenantId: context.tenant.id, academicYearId: academicYear.id },
      });
      if (!term) {
        term = await prismaTarget.term.create({
          data: {
            tenantId: context.tenant.id,
            academicYearId: academicYear.id,
            termName: "Term 1",
            termOrder: 1,
            startDate: new Date("2026-04-01"),
            endDate: new Date("2026-09-30"),
          },
        });
      }

      const exam = await assessmentService.createExam({
        tenantId: context.tenant.id,
        academicYearId: academicYear.id,
        termId: term.id,
        title: data.title,
        startDate: data.startTime,
        endDate: data.endTime,
        actorUserId: context.user.id,
        actorEmail: context.user.email,
      });

      try {
        await prisma.exam.create({
          data: {
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            lessonId: data.lessonId,
          },
        });
      } catch (e) {
        // Non-blocking legacy compatibility
      }

      return exam;
    }
  );

  if (result.success) {
    revalidatePath("/list/exams");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
): Promise<CurrentState> => {
  if (!data.id) {
    return { success: false, error: true, message: "Missing Exam ID" };
  }

  const result = await executeGuardedAction(
    "exam.update",
    async (context) => {
      await assessmentService.updateExam({
        id: String(data.id),
        tenantId: context.tenant.id,
        title: data.title,
        startDate: data.startTime,
        endDate: data.endTime,
        actorUserId: context.user.id,
        actorEmail: context.user.email,
      });

      try {
        await prisma.exam.update({
          where: { id: data.id },
          data: {
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            lessonId: data.lessonId,
          },
        });
      } catch (e) {
        // Non-blocking legacy compatibility
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/exams");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Exam ID" };
  }

  const result = await executeGuardedAction(
    "exam.update",
    async (context) => {
      await assessmentService.deleteExam(
        id,
        context.tenant.id,
        context.user.id,
        context.user.email
      );

      try {
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          await prisma.exam.delete({ where: { id: numId } });
        }
      } catch (e) {
        // Non-blocking legacy compatibility
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/exams");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

// ============================================================================
// FORMMODAL SECURITY FIX: EXPLICIT, TYPE-SAFE DELETION ACTIONS
// (Replaces the dangerous legacy mapping where 7 entities deleted subjects)
// ============================================================================

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Parent ID" };
  }

  const result = await executeGuardedAction(
    "parent.update",
    async (context) => {
      await parentService.deleteParent(id, context.tenant.id, context.user.id, context.user.email);
      try {
        await prisma.parent.delete({ where: { id } });
      } catch (e) {
        // Non-blocking
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/parents");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Lesson ID" };
  }

  const result = await executeGuardedAction(
    "timetable.manage",
    async (context) => {
      await academicService.deleteLesson(id, context.tenant.id, context.user.id, context.user.email);
      try {
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          await prisma.lesson.delete({ where: { id: numId } });
        }
      } catch (e) {
        // Non-blocking
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/lessons");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteAssignment = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Assignment ID" };
  }

  const result = await executeGuardedAction(
    "assignment.delete",
    async (context) => {
      await assignmentService.deleteAssignment(id, context.tenant.id, context.user.id, context.user.email);
      try {
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          await prisma.assignment.delete({ where: { id: numId } });
        }
      } catch (e) {
        // Non-blocking
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/assignments");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Result ID" };
  }

  const result = await executeGuardedAction(
    "result.update",
    async (context) => {
      await assessmentService.deleteResult(id, context.tenant.id, context.user.id, context.user.email);
      try {
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          await prisma.result.delete({ where: { id: numId } });
        }
      } catch (e) {
        // Non-blocking
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/results");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteAttendance = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Attendance ID" };
  }

  const result = await executeGuardedAction(
    "attendance.correct",
    async (context) => {
      await attendanceService.deleteAttendance(id, context.tenant.id, context.user.id, context.user.email);
      try {
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          await prisma.attendance.delete({ where: { id: numId } });
        }
      } catch (e) {
        // Non-blocking
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/attendance");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Event ID" };
  }

  const result = await executeGuardedAction(
    "event.delete",
    async (context) => {
      await communicationService.deleteEvent(id, context.tenant.id, context.user.id, context.user.email);
      try {
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          await prisma.event.delete({ where: { id: numId } });
        }
      } catch (e) {
        // Non-blocking
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/events");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData
): Promise<CurrentState> => {
  const id = data.get("id") as string;
  if (!id) {
    return { success: false, error: true, message: "Missing Announcement ID" };
  }

  const result = await executeGuardedAction(
    "announcement.delete",
    async (context) => {
      await communicationService.deleteAnnouncement(id, context.tenant.id, context.user.id, context.user.email);
      try {
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          await prisma.announcement.delete({ where: { id: numId } });
        }
      } catch (e) {
        // Non-blocking
      }
    }
  );

  if (result.success) {
    revalidatePath("/list/announcements");
    return { success: true, error: false };
  }
  return { success: false, error: true, message: result.message };
};
