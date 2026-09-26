-- DropForeignKey
ALTER TABLE "TenantPolicy" DROP CONSTRAINT "TenantPolicy_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantBranding" DROP CONSTRAINT "TenantBranding_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantDomain" DROP CONSTRAINT "TenantDomain_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantModuleEntitlement" DROP CONSTRAINT "TenantModuleEntitlement_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantModuleEntitlement" DROP CONSTRAINT "TenantModuleEntitlement_moduleKey_fkey";

-- DropForeignKey
ALTER TABLE "PlatformUser" DROP CONSTRAINT "PlatformUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "TenantMembership" DROP CONSTRAINT "TenantMembership_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantMembership" DROP CONSTRAINT "TenantMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "TenantMembership" DROP CONSTRAINT "TenantMembership_roleId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "TenantInvitation" DROP CONSTRAINT "TenantInvitation_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TenantInvitation" DROP CONSTRAINT "TenantInvitation_roleId_fkey";

-- DropForeignKey
ALTER TABLE "AcademicYear" DROP CONSTRAINT "AcademicYear_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Term" DROP CONSTRAINT "Term_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Term" DROP CONSTRAINT "Term_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_supervisorTeacherId_fkey";

-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ClassSubject" DROP CONSTRAINT "ClassSubject_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ClassSubject" DROP CONSTRAINT "ClassSubject_classId_fkey";

-- DropForeignKey
ALTER TABLE "ClassSubject" DROP CONSTRAINT "ClassSubject_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "ClassSubject" DROP CONSTRAINT "ClassSubject_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "StaffProfile" DROP CONSTRAINT "StaffProfile_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "StaffProfile" DROP CONSTRAINT "StaffProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "StaffProfile" DROP CONSTRAINT "StaffProfile_membershipId_fkey";

-- DropForeignKey
ALTER TABLE "StudentProfile" DROP CONSTRAINT "StudentProfile_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "StudentProfile" DROP CONSTRAINT "StudentProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "ParentProfile" DROP CONSTRAINT "ParentProfile_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ParentProfile" DROP CONSTRAINT "ParentProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "StudentParentBinding" DROP CONSTRAINT "StudentParentBinding_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "StudentParentBinding" DROP CONSTRAINT "StudentParentBinding_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentParentBinding" DROP CONSTRAINT "StudentParentBinding_parentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_classId_fkey";

-- DropForeignKey
ALTER TABLE "StudentAcademicHistory" DROP CONSTRAINT "StudentAcademicHistory_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "StudentAcademicHistory" DROP CONSTRAINT "StudentAcademicHistory_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentAcademicHistory" DROP CONSTRAINT "StudentAcademicHistory_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "TimetablePeriod" DROP CONSTRAINT "TimetablePeriod_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TimetableLesson" DROP CONSTRAINT "TimetableLesson_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TimetableLesson" DROP CONSTRAINT "TimetableLesson_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "TimetableLesson" DROP CONSTRAINT "TimetableLesson_classId_fkey";

-- DropForeignKey
ALTER TABLE "TimetableLesson" DROP CONSTRAINT "TimetableLesson_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "TimetableLesson" DROP CONSTRAINT "TimetableLesson_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "TimetableLesson" DROP CONSTRAINT "TimetableLesson_periodId_fkey";

-- DropForeignKey
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_classId_fkey";

-- DropForeignKey
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_studentId_fkey";

-- DropForeignKey
ALTER TABLE "AttendanceCorrection" DROP CONSTRAINT "AttendanceCorrection_attendanceRecordId_fkey";

-- DropForeignKey
ALTER TABLE "AttendanceDailySummary" DROP CONSTRAINT "AttendanceDailySummary_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AttendanceDailySummary" DROP CONSTRAINT "AttendanceDailySummary_classId_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_classId_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "AssignmentSubmission" DROP CONSTRAINT "AssignmentSubmission_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AssignmentSubmission" DROP CONSTRAINT "AssignmentSubmission_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "AssignmentSubmission" DROP CONSTRAINT "AssignmentSubmission_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_termId_fkey";

-- DropForeignKey
ALTER TABLE "ExamPaper" DROP CONSTRAINT "ExamPaper_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ExamPaper" DROP CONSTRAINT "ExamPaper_examId_fkey";

-- DropForeignKey
ALTER TABLE "ExamPaper" DROP CONSTRAINT "ExamPaper_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "ExamPaper" DROP CONSTRAINT "ExamPaper_classId_fkey";

-- DropForeignKey
ALTER TABLE "GradingScheme" DROP CONSTRAINT "GradingScheme_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ExamResult" DROP CONSTRAINT "ExamResult_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ExamResult" DROP CONSTRAINT "ExamResult_examPaperId_fkey";

-- DropForeignKey
ALTER TABLE "ExamResult" DROP CONSTRAINT "ExamResult_studentId_fkey";

-- DropForeignKey
ALTER TABLE "ReportCard" DROP CONSTRAINT "ReportCard_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ReportCard" DROP CONSTRAINT "ReportCard_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "ReportCard" DROP CONSTRAINT "ReportCard_termId_fkey";

-- DropForeignKey
ALTER TABLE "ReportCard" DROP CONSTRAINT "ReportCard_studentId_fkey";

-- DropForeignKey
ALTER TABLE "ReportCard" DROP CONSTRAINT "ReportCard_classId_fkey";

-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentReference" DROP CONSTRAINT "DocumentReference_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentReference" DROP CONSTRAINT "DocumentReference_uploadedByUserId_fkey";

-- DropTable
DROP TABLE "Tenant";

-- DropTable
DROP TABLE "TenantPolicy";

-- DropTable
DROP TABLE "TenantBranding";

-- DropTable
DROP TABLE "TenantDomain";

-- DropTable
DROP TABLE "SubscriptionPlan";

-- DropTable
DROP TABLE "Module";

-- DropTable
DROP TABLE "TenantModuleEntitlement";

-- DropTable
DROP TABLE "LeadInquiry";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "PlatformUser";

-- DropTable
DROP TABLE "UserPreference";

-- DropTable
DROP TABLE "TenantMembership";

-- DropTable
DROP TABLE "Role";

-- DropTable
DROP TABLE "Permission";

-- DropTable
DROP TABLE "RolePermission";

-- DropTable
DROP TABLE "TenantInvitation";

-- DropTable
DROP TABLE "AcademicYear";

-- DropTable
DROP TABLE "Term";

-- DropTable
DROP TABLE "Grade";

-- DropTable
DROP TABLE "Class";

-- DropTable
DROP TABLE "Subject";

-- DropTable
DROP TABLE "ClassSubject";

-- DropTable
DROP TABLE "StaffProfile";

-- DropTable
DROP TABLE "StudentProfile";

-- DropTable
DROP TABLE "ParentProfile";

-- DropTable
DROP TABLE "StudentParentBinding";

-- DropTable
DROP TABLE "StudentEnrollment";

-- DropTable
DROP TABLE "StudentAcademicHistory";

-- DropTable
DROP TABLE "TimetablePeriod";

-- DropTable
DROP TABLE "TimetableLesson";

-- DropTable
DROP TABLE "AttendanceRecord";

-- DropTable
DROP TABLE "AttendanceCorrection";

-- DropTable
DROP TABLE "AttendanceDailySummary";

-- DropTable
DROP TABLE "Assignment";

-- DropTable
DROP TABLE "AssignmentSubmission";

-- DropTable
DROP TABLE "Exam";

-- DropTable
DROP TABLE "ExamPaper";

-- DropTable
DROP TABLE "GradingScheme";

-- DropTable
DROP TABLE "ExamResult";

-- DropTable
DROP TABLE "ReportCard";

-- DropTable
DROP TABLE "Announcement";

-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "NotificationPreference";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "DocumentReference";

-- DropEnum
DROP TYPE "TenantStatus";

-- DropEnum
DROP TYPE "MembershipStatus";

-- DropEnum
DROP TYPE "PlatformRole";

-- DropEnum
DROP TYPE "AccessScope";

-- DropEnum
DROP TYPE "EntitlementSource";

-- DropEnum
DROP TYPE "AcademicSessionStatus";

-- DropEnum
DROP TYPE "Gender";

-- DropEnum
DROP TYPE "BloodGroup";

-- DropEnum
DROP TYPE "StudentStatus";

-- DropEnum
DROP TYPE "StaffStatus";

-- DropEnum
DROP TYPE "ParentRelationshipType";

-- DropEnum
DROP TYPE "SubjectType";

-- DropEnum
DROP TYPE "DayOfWeek";

-- DropEnum
DROP TYPE "AttendanceStatus";

-- DropEnum
DROP TYPE "ExamStatus";

-- DropEnum
DROP TYPE "AssignmentStatus";

-- DropEnum
DROP TYPE "SubmissionStatus";

-- DropEnum
DROP TYPE "ReportCardStatus";

-- DropEnum
DROP TYPE "PromotionDecision";

-- DropEnum
DROP TYPE "AnnouncementCategory";

-- DropEnum
DROP TYPE "AudienceScope";

-- DropEnum
DROP TYPE "EventType";

-- DropEnum
DROP TYPE "NotificationCategory";

-- DropEnum
DROP TYPE "StorageProvider";

-- DropEnum
DROP TYPE "FileAccessLevel";

-- DropEnum
DROP TYPE "AuditActionCategory";

-- DropEnum
DROP TYPE "LeadStatus";

