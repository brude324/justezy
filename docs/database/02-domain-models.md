# 02 — Conceptual Domain Models & Entity Catalog

## 1. Overview & Architectural Policy

**Status**: TARGET / SPECIFICATION  
**Scope**: Complete Entity Inventory for the Target Multi-Tenant SaaS Platform.

This document specifies the conceptual entities, purposes, core attributes, and foreign relationships for each of the 20 domain clusters defined in `01-conceptual-model.md`.

In accordance with Step 3 design rules:
- **Conceptual Specification**: Details entity responsibilities, business attributes, and logical associations without fixing physical Prisma syntax or raw SQL data types.
- **Tenant Context**: All institutional entities declare tenant ownership explicitly.
- **Auditability**: All state-bearing entities include standardized lifecycle fields.

---

## 2. Complete Domain Model Catalog

### Cluster A: Platform / SaaS Administration
1. **`Tenant`**: Sovereign institutional container (school, college, academy).
   - *Attributes*: `id`, `name`, `slug` (unique), `legalName`, `affiliationBoard`, `affiliationCode`, `status` (`PROVISIONING`, `TRIAL`, `ACTIVE`, `SUSPENDED`, `ARCHIVED`), `currency`, `timezone`, `locale`, `logoUrl`, `planTier`, `studentQuota`, `staffQuota`, `createdAt`, `updatedAt`, `deletedAt`.
2. **`SubscriptionPlan`**: Commercial monetization tier (Starter, Academic Pro, Enterprise).
   - *Attributes*: `id`, `planKey` (unique), `name`, `monthlyPricePerStudent`, `annualDiscountPercent`, `includedModules`, `isPublic`, `status`.
3. **`PlatformUser`**: SaaS administrative operators.
   - *Attributes*: `id`, `userId`, `platformRole` (`SUPER_ADMIN`, `SUPPORT_OPERATOR`, `AUDITOR`), `status`.
4. **`LeadInquiry`**: Prospect lead captured from public marketing portal.
   - *Attributes*: `id`, `schoolName`, `contactPerson`, `email`, `phone`, `institutionType`, `studentStrength`, `city`, `state`, `status` (`NEW`, `CONTACTED`, `QUALIFIED`, `CLOSED`).

### Cluster B: Identity
1. **`User`**: Global human individual across the platform (1:1 with Clerk authentication).
   - *Attributes*: `id`, `clerkId` (unique global), `email` (unique global), `phone`, `firstName`, `lastName`, `displayName`, `avatarUrl`, `isEmailVerified`, `isPhoneVerified`, `status` (`ACTIVE`, `SUSPENDED`), `createdAt`, `updatedAt`.
2. **`UserPreference`**: Universal user settings.
   - *Attributes*: `id`, `userId`, `preferredLanguage`, `theme` (`LIGHT`, `DARK`, `SYSTEM`), `lastActiveTenantId`.

### Cluster C: Tenant / Institution
1. **`TenantPolicy`**: Institutional governance configurations.
   - *Attributes*: `id`, `tenantId`, `attendanceCutoffTime`, `attendanceWarningThresholdPercent` (e.g., 75%), `autoSmsOnAbsence`, `defaultPassingPercentage`, `allowParentPortalRegistration`.
2. **`TenantBranding`**: Visual presentation tokens and official signatures.
   - *Attributes*: `id`, `tenantId`, `crestLogoUrl`, `primaryColorHex`, `principalSignatureUrl`, `reportCardHeaderHtml`, `reportCardFooterHtml`.
3. **`TenantDomain`**: Custom domains and subdomains.
   - *Attributes*: `id`, `tenantId`, `domainName` (unique FQDN), `isPrimary`, `isVerified`, `sslStatus`.

### Cluster D: Membership & RBAC
1. **`TenantMembership`**: Binding of a `User` to a specific `Tenant`.
   - *Attributes*: `id`, `tenantId`, `userId`, `roleId`, `status` (`INVITED`, `ACTIVE`, `SUSPENDED`, `TERMINATED`), `joinedAt`, `invitedAt`, `terminatedAt`.
2. **`Role`**: Institutional role definition.
   - *Attributes*: `id`, `tenantId` (nullable: null for system predefined roles, non-null for custom tenant roles), `roleKey` (unique per tenant), `name`, `description`, `isSystemRole`.
3. **`Permission`**: Atomic capability string.
   - *Attributes*: `id`, `permissionKey` (unique global: e.g., `attendance.mark`), `moduleKey`, `verb`, `description`.
4. **`RolePermission`**: Relational junction connecting roles to permissions.
   - *Attributes*: `id`, `roleId`, `permissionId`, `accessScope` (`INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN`).
5. **`TenantInvitation`**: Pending invitation token for staff or parents.
   - *Attributes*: `id`, `tenantId`, `email`, `phone`, `roleId`, `invitationToken` (unique), `expiresAt`, `status` (`PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`).

### Cluster E: Module Entitlements
1. **`Module`**: Catalog of functional SaaS capabilities.
   - *Attributes*: `id`, `moduleKey` (unique: e.g., `attendance_module`, `exam_module`, `report_card_module`), `displayName`, `isCore`, `description`.
2. **`TenantModuleEntitlement`**: Active feature licenses per tenant.
   - *Attributes*: `id`, `tenantId`, `moduleKey`, `isEnabled`, `source` (`PLAN_INCLUDED`, `ADDON_PURCHASE`, `PROMOTIONAL_OVERRIDE`), `expiresAt`.

### Cluster F: Academic Structure
1. **`AcademicYear`**: Academic calendar session (e.g., 2026-2027).
   - *Attributes*: `id`, `tenantId`, `yearLabel` (e.g., "2026-2027"), `startDate`, `endDate`, `status` (`UPCOMING`, `ACTIVE`, `ARCHIVED`).
2. **`Term`**: Grading periods / semesters within an academic year.
   - *Attributes*: `id`, `tenantId`, `academicYearId`, `termName` (e.g., "Term 1"), `termOrder` (1, 2, 3), `startDate`, `endDate`.
3. **`Grade`**: Institutional grade level / standard (e.g., Grade 10).
   - *Attributes*: `id`, `tenantId`, `gradeLevel` (integer 1..12 or string for Pre-K), `name` (e.g., "Grade 10").
4. **`Class`**: Classroom group within a grade and session (e.g., Grade 10-A).
   - *Attributes*: `id`, `tenantId`, `academicYearId`, `gradeId`, `sectionName` (e.g., "A"), `roomNumber`, `studentCapacity`, `supervisorTeacherId` (`StaffProfile`).
5. **`Subject`**: Curricular course offering (e.g., Mathematics).
   - *Attributes*: `id`, `tenantId`, `subjectCode` (unique in tenant: e.g., `MATH-10`), `name`, `subjectType` (`THEORY`, `PRACTICAL`, `ELECTIVE`), `maxMarks`, `passMarks`.
6. **`ClassSubject`**: Relational junction assigning subjects and teachers to classes.
   - *Attributes*: `id`, `tenantId`, `classId`, `subjectId`, `teacherId` (`StaffProfile`).

### Cluster G: People & Profiles
1. **`StaffProfile`**: Employment record of teachers and administrative personnel.
   - *Attributes*: `id`, `tenantId`, `userId`, `membershipId`, `employeeId` (unique in tenant), `fullName`, `gender`, `designation`, `department`, `dateOfJoining`, `qualifications`, `emergencyPhone`, `maskedNationalId`, `status` (`ACTIVE`, `ON_LEAVE`, `ARCHIVED`).
2. **`StudentProfile`**: Bio and identity record of an enrolled learner.
   - *Attributes*: `id`, `tenantId`, `userId` (nullable: null if student has no portal login), `admissionNumber` (unique in tenant), `fullName`, `gender`, `dateOfBirth`, `bloodGroup`, `address`, `medicalNotes`, `maskedNationalId`, `status` (`ENROLLED`, `ACTIVE`, `PROMOTED`, `TRANSFERRED`, `GRADUATED`, `WITHDRAWN`).
3. **`ParentProfile`**: Guardian contact record.
   - *Attributes*: `id`, `tenantId`, `userId` (nullable if parent has not activated portal), `fullName`, `phone` (primary contact), `email`, `occupation`, `address`, `status`.
4. **`StudentParentBinding`**: Relational junction connecting parents to students.
   - *Attributes*: `id`, `tenantId`, `studentId`, `parentId`, `relationshipType` (`FATHER`, `MOTHER`, `LEGAL_GUARDIAN`, `OTHER`), `isPrimaryContact`, `isFeePayer`, `isEmergencyContact`.

### Cluster H: Student Lifecycle & Enrollment
1. **`StudentEnrollment`**: Class and section placement for a specific academic year.
   - *Attributes*: `id`, `tenantId`, `studentId`, `academicYearId`, `classId`, `rollNumber` (unique in class-year), `enrollmentDate`, `status` (`ACTIVE`, `PROMOTED`, `TRANSFERRED`, `WITHDRAWN`).
2. **`StudentAcademicHistory`**: Archival transcript snapshot upon year promotion.
   - *Attributes*: `id`, `tenantId`, `studentId`, `academicYearId`, `classId`, `promotedToClassId`, `attendancePercentage`, `cumulativeGpa`, `promotionStatus` (`PROMOTED`, `DETAINED`, `CONDITIONAL`).

### Cluster I: Timetable & Scheduling
1. **`TimetablePeriod`**: Master time slots in the school day.
   - *Attributes*: `id`, `tenantId`, `periodNumber` (1..8), `name` (e.g., "Period 1", "Lunch Break"), `startTime` (time-of-day), `endTime` (time-of-day), `isBreak`.
2. **`TimetableLesson`**: Scheduled instruction slot on a weekday.
   - *Attributes*: `id`, `tenantId`, `academicYearId`, `classId`, `subjectId`, `teacherId` (`StaffProfile`), `periodId`, `dayOfWeek` (`MONDAY`..`SATURDAY`), `roomNumber`.

### Cluster J: Attendance
1. **`AttendanceRecord`**: Individual student presence entry for a specific day.
   - *Attributes*: `id`, `tenantId`, `academicYearId`, `classId`, `studentId`, `date` (calendar date), `status` (`PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `EXCUSED`), `remarks`, `markedByUserId`, `markedAt`, `isLocked`.
2. **`AttendanceCorrection`**: Formal audit record of retroactive attendance changes.
   - *Attributes*: `id`, `tenantId`, `attendanceRecordId`, `previousStatus`, `newStatus`, `reason`, `requestedByUserId`, `approvedByUserId`, `approvedAt`.

### Cluster K: Assignments & Coursework
1. **`Assignment`**: Coursework posted by teacher.
   - *Attributes*: `id`, `tenantId`, `academicYearId`, `classId`, `subjectId`, `teacherId` (`StaffProfile`), `title`, `instructionsMarkdown`, `maxMarks`, `assignedDate`, `dueDate`, `attachmentUrls`, `status` (`DRAFT`, `PUBLISHED`, `CLOSED`).
2. **`AssignmentSubmission`**: Student digital homework submission.
   - *Attributes*: `id`, `tenantId`, `assignmentId`, `studentId`, `submittedAt`, `submissionFileUrls`, `studentNotes`, `marksAwarded`, `teacherFeedback`, `gradedByUserId`, `gradedAt`, `status` (`SUBMITTED`, `GRADED`, `RESUBMISSION_REQUESTED`).

### Cluster L: Examinations
1. **`Exam`**: Institutional assessment milestone (e.g., Mid-Term Assessment 2026).
   - *Attributes*: `id`, `tenantId`, `academicYearId`, `termId`, `title`, `startDate`, `endDate`, `instructions`, `status` (`DRAFT`, `SCHEDULED`, `ONGOING`, `COMPLETED`, `RESULTS_PUBLISHED`).
2. **`ExamPaper`**: Individual subject assessment paper within an exam session.
   - *Attributes*: `id`, `tenantId`, `examId`, `subjectId`, `classId`, `examDate`, `startTime`, `endTime`, `maxMarks`, `passMarks`, `roomNumber`.

### Cluster M: Results & Grading
1. **`ExamResult`**: Recorded score for a student on an exam paper.
   - *Attributes*: `id`, `tenantId`, `examPaperId`, `studentId`, `theoryMarks`, `practicalMarks`, `totalMarks`, `isAbsent`, `percentage`, `gradeLetter`, `gradePoint`, `remarks`, `enteredByUserId`, `isVerified`.
2. **`GradingScheme`**: Configurable grading scale (e.g., CBSE 9-Point Scale, Percentage Pass/Fail).
   - *Attributes*: `id`, `tenantId`, `schemeName`, `isDefault`, `rulesJson` (array of ranges: e.g., 91-100 = A1, 81-90 = A2).

### Cluster N: Report Cards
1. **`ReportCard`**: Official term academic transcript document.
   - *Attributes*: `id`, `tenantId`, `academicYearId`, `termId`, `studentId`, `classId`, `grandTotal`, `totalMaxMarks`, `aggregatePercentage`, `overallGrade`, `attendanceRatePercent`, `classRank`, `coScholasticScoresJson`, `teacherRemarks`, `principalRemarks`, `pdfUrl`, `status` (`DRAFT`, `GENERATED`, `PUBLISHED`).

### Cluster O: Communications
1. **`Announcement`**: Official circular or administrative notice.
   - *Attributes*: `id`, `tenantId`, `title`, `category` (`ACADEMIC`, `HOLIDAY`, `URGENT`, `EVENT`, `GENERAL`), `bodyMarkdown`, `attachmentUrls`, `targetAudienceScope` (`ALL_SCHOOL`, `ROLES`, `GRADES`), `targetRolesJson`, `targetGradesJson`, `isUrgent`, `publishedAt`, `authorUserId`, `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
2. **`Event`**: Institutional calendar event.
   - *Attributes*: `id`, `tenantId`, `academicYearId`, `title`, `eventType` (`HOLIDAY`, `EXAM`, `SPORTS`, `PTM`, `ACADEMIC`, `GENERAL`), `startDateTime`, `endDateTime`, `isSchoolClosed`, `location`, `targetAudienceJson`, `description`.

### Cluster P: Notifications
1. **`Notification`**: User-specific notification inbox item.
   - *Attributes*: `id`, `tenantId`, `userId`, `eventType`, `title`, `message`, `deepLinkUrl`, `isRead`, `readAt`, `createdAt`.
2. **`NotificationPreference`**: User delivery channel switches.
   - *Attributes*: `id`, `userId`, `category`, `inAppEnabled`, `smsEnabled`, `emailEnabled`, `pushEnabled`.

### Cluster Q: Audit Logging
1. **`AuditLog`**: Tamper-evident, append-only system and security log.
   - *Attributes*: `id`, `tenantId`, `actorId`, `actorEmail`, `actionCategory` (`AUTH`, `SECURITY`, `TENANT_MGMT`, `RBAC`, `ACADEMIC`, `EXPORT`), `action`, `entityType`, `entityId`, `ipAddress`, `userAgent`, `diffJson` (`oldValues`, `newValues`), `createdAt`.

### Cluster R: Files & Documents
1. **`DocumentReference`**: Cloud object storage metadata.
   - *Attributes*: `id`, `tenantId`, `storageProvider` (`S3`, `R2`), `bucketName`, `storageKey`, `fileName`, `fileMimeType`, `fileSizeBytes`, `uploadedByUserId`, `entityType`, `entityId`, `createdAt`.
