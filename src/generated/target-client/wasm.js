
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.19.1
 * Query Engine version: 69d742ee20b815d88e17e54db4a2a7a3b30324e3
 */
Prisma.prismaVersion = {
  client: "5.19.1",
  engine: "69d742ee20b815d88e17e54db4a2a7a3b30324e3"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  legalName: 'legalName',
  affiliationBoard: 'affiliationBoard',
  affiliationCode: 'affiliationCode',
  status: 'status',
  currency: 'currency',
  timezone: 'timezone',
  locale: 'locale',
  logoUrl: 'logoUrl',
  planTier: 'planTier',
  studentQuota: 'studentQuota',
  staffQuota: 'staffQuota',
  storageQuotaGb: 'storageQuotaGb',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.TenantPolicyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  attendanceCutoffTime: 'attendanceCutoffTime',
  attendanceWarningThresholdPercent: 'attendanceWarningThresholdPercent',
  autoSmsOnAbsence: 'autoSmsOnAbsence',
  defaultPassingPercentage: 'defaultPassingPercentage',
  allowParentPortalRegistration: 'allowParentPortalRegistration',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantBrandingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  crestLogoUrl: 'crestLogoUrl',
  primaryColorHex: 'primaryColorHex',
  principalSignatureUrl: 'principalSignatureUrl',
  reportCardHeaderHtml: 'reportCardHeaderHtml',
  reportCardFooterHtml: 'reportCardFooterHtml',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantDomainScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  domainName: 'domainName',
  isPrimary: 'isPrimary',
  isVerified: 'isVerified',
  sslStatus: 'sslStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionPlanScalarFieldEnum = {
  id: 'id',
  planKey: 'planKey',
  name: 'name',
  description: 'description',
  monthlyPricePerStudent: 'monthlyPricePerStudent',
  annualDiscountPercent: 'annualDiscountPercent',
  includedModulesJson: 'includedModulesJson',
  isPublic: 'isPublic',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ModuleScalarFieldEnum = {
  id: 'id',
  moduleKey: 'moduleKey',
  displayName: 'displayName',
  isCore: 'isCore',
  description: 'description'
};

exports.Prisma.TenantModuleEntitlementScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  moduleKey: 'moduleKey',
  isEnabled: 'isEnabled',
  source: 'source',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeadInquiryScalarFieldEnum = {
  id: 'id',
  schoolName: 'schoolName',
  contactPerson: 'contactPerson',
  email: 'email',
  phone: 'phone',
  institutionType: 'institutionType',
  studentStrength: 'studentStrength',
  city: 'city',
  state: 'state',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  clerkId: 'clerkId',
  email: 'email',
  phone: 'phone',
  firstName: 'firstName',
  lastName: 'lastName',
  displayName: 'displayName',
  avatarUrl: 'avatarUrl',
  isEmailVerified: 'isEmailVerified',
  isPhoneVerified: 'isPhoneVerified',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.PlatformUserScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  platformRole: 'platformRole',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserPreferenceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  preferredLanguage: 'preferredLanguage',
  theme: 'theme',
  lastActiveTenantId: 'lastActiveTenantId',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenantMembershipScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  roleId: 'roleId',
  status: 'status',
  joinedAt: 'joinedAt',
  invitedAt: 'invitedAt',
  terminatedAt: 'terminatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  roleKey: 'roleKey',
  name: 'name',
  description: 'description',
  isSystemRole: 'isSystemRole'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  permissionKey: 'permissionKey',
  moduleKey: 'moduleKey',
  verb: 'verb',
  description: 'description'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  id: 'id',
  roleId: 'roleId',
  permissionId: 'permissionId',
  accessScope: 'accessScope'
};

exports.Prisma.TenantInvitationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  email: 'email',
  phone: 'phone',
  roleId: 'roleId',
  invitationToken: 'invitationToken',
  expiresAt: 'expiresAt',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AcademicYearScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  yearLabel: 'yearLabel',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TermScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  termName: 'termName',
  termOrder: 'termOrder',
  startDate: 'startDate',
  endDate: 'endDate'
};

exports.Prisma.GradeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  gradeLevel: 'gradeLevel',
  name: 'name'
};

exports.Prisma.ClassScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  gradeId: 'gradeId',
  sectionName: 'sectionName',
  roomNumber: 'roomNumber',
  studentCapacity: 'studentCapacity',
  supervisorTeacherId: 'supervisorTeacherId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubjectScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  subjectCode: 'subjectCode',
  name: 'name',
  subjectType: 'subjectType',
  maxMarks: 'maxMarks',
  passMarks: 'passMarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClassSubjectScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  classId: 'classId',
  subjectId: 'subjectId',
  teacherId: 'teacherId'
};

exports.Prisma.StaffProfileScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  membershipId: 'membershipId',
  employeeId: 'employeeId',
  fullName: 'fullName',
  gender: 'gender',
  designation: 'designation',
  department: 'department',
  dateOfJoining: 'dateOfJoining',
  qualifications: 'qualifications',
  emergencyPhone: 'emergencyPhone',
  maskedNationalId: 'maskedNationalId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.StudentProfileScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  admissionNumber: 'admissionNumber',
  fullName: 'fullName',
  gender: 'gender',
  dateOfBirth: 'dateOfBirth',
  bloodGroup: 'bloodGroup',
  address: 'address',
  medicalNotes: 'medicalNotes',
  maskedNationalId: 'maskedNationalId',
  status: 'status',
  admissionDate: 'admissionDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ParentProfileScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  fullName: 'fullName',
  primaryPhone: 'primaryPhone',
  secondaryPhone: 'secondaryPhone',
  email: 'email',
  occupation: 'occupation',
  address: 'address',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentParentBindingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  parentId: 'parentId',
  relationshipType: 'relationshipType',
  isPrimaryContact: 'isPrimaryContact',
  isFeePayer: 'isFeePayer',
  isEmergencyContact: 'isEmergencyContact',
  createdAt: 'createdAt'
};

exports.Prisma.StudentEnrollmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  academicYearId: 'academicYearId',
  classId: 'classId',
  rollNumber: 'rollNumber',
  enrollmentDate: 'enrollmentDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentAcademicHistoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  academicYearId: 'academicYearId',
  classId: 'classId',
  promotedToClassId: 'promotedToClassId',
  finalAttendanceRate: 'finalAttendanceRate',
  aggregatePercentage: 'aggregatePercentage',
  cumulativeGpa: 'cumulativeGpa',
  promotionDecision: 'promotionDecision',
  decisionDate: 'decisionDate',
  finalRemarks: 'finalRemarks'
};

exports.Prisma.TimetablePeriodScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  periodNumber: 'periodNumber',
  name: 'name',
  startTime: 'startTime',
  endTime: 'endTime',
  isBreak: 'isBreak'
};

exports.Prisma.TimetableLessonScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  classId: 'classId',
  subjectId: 'subjectId',
  teacherId: 'teacherId',
  periodId: 'periodId',
  dayOfWeek: 'dayOfWeek',
  roomNumber: 'roomNumber',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttendanceRecordScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  classId: 'classId',
  studentId: 'studentId',
  date: 'date',
  status: 'status',
  remarks: 'remarks',
  markedByUserId: 'markedByUserId',
  markedAt: 'markedAt',
  isLocked: 'isLocked'
};

exports.Prisma.AttendanceCorrectionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  attendanceRecordId: 'attendanceRecordId',
  previousStatus: 'previousStatus',
  newStatus: 'newStatus',
  reason: 'reason',
  requestedByUserId: 'requestedByUserId',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt'
};

exports.Prisma.AttendanceDailySummaryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  classId: 'classId',
  date: 'date',
  totalEnrolled: 'totalEnrolled',
  totalPresent: 'totalPresent',
  totalAbsent: 'totalAbsent',
  totalLate: 'totalLate',
  attendancePercentage: 'attendancePercentage',
  submittedAt: 'submittedAt'
};

exports.Prisma.AssignmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  classId: 'classId',
  subjectId: 'subjectId',
  teacherId: 'teacherId',
  title: 'title',
  instructionsMarkdown: 'instructionsMarkdown',
  maxMarks: 'maxMarks',
  assignedDate: 'assignedDate',
  dueDate: 'dueDate',
  attachmentUrlsJson: 'attachmentUrlsJson',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssignmentSubmissionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assignmentId: 'assignmentId',
  studentId: 'studentId',
  submittedAt: 'submittedAt',
  submissionFileUrls: 'submissionFileUrls',
  studentNotes: 'studentNotes',
  marksAwarded: 'marksAwarded',
  teacherFeedback: 'teacherFeedback',
  gradedByUserId: 'gradedByUserId',
  gradedAt: 'gradedAt',
  status: 'status'
};

exports.Prisma.ExamScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  termId: 'termId',
  title: 'title',
  startDate: 'startDate',
  endDate: 'endDate',
  instructions: 'instructions',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExamPaperScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  examId: 'examId',
  subjectId: 'subjectId',
  classId: 'classId',
  examDate: 'examDate',
  startTime: 'startTime',
  endTime: 'endTime',
  maxMarks: 'maxMarks',
  passMarks: 'passMarks',
  roomNumber: 'roomNumber'
};

exports.Prisma.GradingSchemeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  schemeName: 'schemeName',
  isDefault: 'isDefault',
  rulesJson: 'rulesJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExamResultScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  examPaperId: 'examPaperId',
  studentId: 'studentId',
  theoryMarks: 'theoryMarks',
  practicalMarks: 'practicalMarks',
  totalMarks: 'totalMarks',
  isAbsent: 'isAbsent',
  percentage: 'percentage',
  gradeLetter: 'gradeLetter',
  gradePoint: 'gradePoint',
  remarks: 'remarks',
  enteredByUserId: 'enteredByUserId',
  isVerified: 'isVerified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReportCardScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  termId: 'termId',
  studentId: 'studentId',
  classId: 'classId',
  grandTotal: 'grandTotal',
  totalMaxMarks: 'totalMaxMarks',
  aggregatePercentage: 'aggregatePercentage',
  overallGrade: 'overallGrade',
  attendanceRatePercent: 'attendanceRatePercent',
  classRank: 'classRank',
  coScholasticJson: 'coScholasticJson',
  teacherRemarks: 'teacherRemarks',
  principalRemarks: 'principalRemarks',
  pdfSnapshotUrl: 'pdfSnapshotUrl',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  title: 'title',
  category: 'category',
  bodyMarkdown: 'bodyMarkdown',
  attachmentUrlsJson: 'attachmentUrlsJson',
  targetAudienceScope: 'targetAudienceScope',
  targetRolesJson: 'targetRolesJson',
  targetGradesJson: 'targetGradesJson',
  isUrgent: 'isUrgent',
  publishedAt: 'publishedAt',
  authorUserId: 'authorUserId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  title: 'title',
  eventType: 'eventType',
  startDateTime: 'startDateTime',
  endDateTime: 'endDateTime',
  allDay: 'allDay',
  isSchoolClosed: 'isSchoolClosed',
  location: 'location',
  targetAudienceJson: 'targetAudienceJson',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  eventType: 'eventType',
  title: 'title',
  message: 'message',
  deepLinkUrl: 'deepLinkUrl',
  isRead: 'isRead',
  readAt: 'readAt',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationPreferenceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  category: 'category',
  inAppEnabled: 'inAppEnabled',
  pushEnabled: 'pushEnabled',
  smsEnabled: 'smsEnabled',
  emailEnabled: 'emailEnabled'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  actorId: 'actorId',
  actorEmail: 'actorEmail',
  actionCategory: 'actionCategory',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  diffJson: 'diffJson',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.DocumentReferenceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  uploadedByUserId: 'uploadedByUserId',
  storageProvider: 'storageProvider',
  bucketName: 'bucketName',
  storageKey: 'storageKey',
  fileName: 'fileName',
  fileMimeType: 'fileMimeType',
  fileSizeBytes: 'fileSizeBytes',
  sha256Checksum: 'sha256Checksum',
  accessLevel: 'accessLevel',
  entityType: 'entityType',
  entityId: 'entityId',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.FeeCategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  code: 'code',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeStructureScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  gradeId: 'gradeId',
  name: 'name',
  description: 'description',
  totalAmount: 'totalAmount',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeStructureItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  feeStructureId: 'feeStructureId',
  feeCategoryId: 'feeCategoryId',
  name: 'name',
  amount: 'amount',
  frequency: 'frequency',
  dueDayOfMonth: 'dueDayOfMonth',
  dueMonth: 'dueMonth',
  isOptional: 'isOptional'
};

exports.Prisma.StudentFeeAssignmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  academicYearId: 'academicYearId',
  feeStructureId: 'feeStructureId',
  baseAmount: 'baseAmount',
  concessionAmount: 'concessionAmount',
  netPayableAmount: 'netPayableAmount',
  discountReason: 'discountReason',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeDiscountScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  discountType: 'discountType',
  percentageOrAmount: 'percentageOrAmount',
  reason: 'reason',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeInvoiceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  invoiceNumber: 'invoiceNumber',
  studentId: 'studentId',
  academicYearId: 'academicYearId',
  classId: 'classId',
  issueDate: 'issueDate',
  dueDate: 'dueDate',
  subtotalAmount: 'subtotalAmount',
  discountAmount: 'discountAmount',
  paidAmount: 'paidAmount',
  balanceAmount: 'balanceAmount',
  status: 'status',
  notes: 'notes',
  journalEntryId: 'journalEntryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeInvoiceItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  invoiceId: 'invoiceId',
  feeStructureItemId: 'feeStructureItemId',
  feeCategoryId: 'feeCategoryId',
  description: 'description',
  amount: 'amount',
  paidAmount: 'paidAmount'
};

exports.Prisma.PaymentGatewayConfigScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  provider: 'provider',
  keyId: 'keyId',
  keySecretHash: 'keySecretHash',
  webhookSecret: 'webhookSecret',
  isLive: 'isLive',
  isEnabled: 'isEnabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentIntentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  amount: 'amount',
  currency: 'currency',
  provider: 'provider',
  gatewayOrderId: 'gatewayOrderId',
  gatewayChecksum: 'gatewayChecksum',
  status: 'status',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  receiptNumber: 'receiptNumber',
  studentId: 'studentId',
  payerParentId: 'payerParentId',
  paymentIntentId: 'paymentIntentId',
  amount: 'amount',
  paymentMode: 'paymentMode',
  status: 'status',
  paymentDate: 'paymentDate',
  transactionReference: 'transactionReference',
  chequeNumber: 'chequeNumber',
  bankName: 'bankName',
  gatewayPaymentId: 'gatewayPaymentId',
  journalEntryId: 'journalEntryId',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentAllocationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  paymentId: 'paymentId',
  invoiceId: 'invoiceId',
  invoiceItemId: 'invoiceItemId',
  allocatedAmount: 'allocatedAmount',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentRefundScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  paymentId: 'paymentId',
  refundNumber: 'refundNumber',
  amount: 'amount',
  reason: 'reason',
  refundDate: 'refundDate',
  status: 'status',
  journalEntryId: 'journalEntryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentWebhookEventScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  provider: 'provider',
  eventId: 'eventId',
  eventType: 'eventType',
  payloadJson: 'payloadJson',
  isProcessed: 'isProcessed',
  processedAt: 'processedAt',
  errorMessage: 'errorMessage',
  createdAt: 'createdAt'
};

exports.Prisma.FiscalYearScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  yearLabel: 'yearLabel',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FinancialPeriodScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  fiscalYearId: 'fiscalYearId',
  periodNumber: 'periodNumber',
  periodName: 'periodName',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status'
};

exports.Prisma.ChartOfAccountScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accountCode: 'accountCode',
  accountName: 'accountName',
  accountType: 'accountType',
  accountSubtype: 'accountSubtype',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LedgerAccountScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  chartOfAccountId: 'chartOfAccountId',
  openingBalance: 'openingBalance',
  currentBalance: 'currentBalance',
  currency: 'currency',
  updatedAt: 'updatedAt'
};

exports.Prisma.JournalEntryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  periodId: 'periodId',
  entryNumber: 'entryNumber',
  entryDate: 'entryDate',
  postingDate: 'postingDate',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  referenceNumber: 'referenceNumber',
  narration: 'narration',
  status: 'status',
  totalDebit: 'totalDebit',
  totalCredit: 'totalCredit',
  postedByUserId: 'postedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JournalLineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  journalEntryId: 'journalEntryId',
  accountId: 'accountId',
  lineNumber: 'lineNumber',
  debitAmount: 'debitAmount',
  creditAmount: 'creditAmount',
  narration: 'narration'
};

exports.Prisma.TenantOutboxEventScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  eventType: 'eventType',
  eventVersion: 'eventVersion',
  aggregateType: 'aggregateType',
  aggregateId: 'aggregateId',
  payloadJson: 'payloadJson',
  correlationId: 'correlationId',
  occurredAt: 'occurredAt',
  isPublished: 'isPublished',
  publishedAt: 'publishedAt',
  retryCount: 'retryCount',
  lastError: 'lastError'
};

exports.Prisma.AdmissionSessionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  academicYearId: 'academicYearId',
  name: 'name',
  code: 'code',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionSourceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  sourceType: 'sourceType',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionEnquiryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  enquiryNumber: 'enquiryNumber',
  prospectiveStudentName: 'prospectiveStudentName',
  prospectiveGender: 'prospectiveGender',
  prospectiveDob: 'prospectiveDob',
  primaryContactName: 'primaryContactName',
  primaryContactPhone: 'primaryContactPhone',
  primaryContactEmail: 'primaryContactEmail',
  primaryContactRelation: 'primaryContactRelation',
  address: 'address',
  interestedGradeId: 'interestedGradeId',
  sourceId: 'sourceId',
  sessionId: 'sessionId',
  status: 'status',
  ownerUserId: 'ownerUserId',
  assignedAt: 'assignedAt',
  notes: 'notes',
  lostReason: 'lostReason',
  convertedAt: 'convertedAt',
  convertedApplicantId: 'convertedApplicantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApplicantScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  applicantNumber: 'applicantNumber',
  enquiryId: 'enquiryId',
  fullName: 'fullName',
  gender: 'gender',
  dateOfBirth: 'dateOfBirth',
  bloodGroup: 'bloodGroup',
  primaryPhone: 'primaryPhone',
  email: 'email',
  address: 'address',
  guardianName: 'guardianName',
  guardianPhone: 'guardianPhone',
  guardianEmail: 'guardianEmail',
  guardianRelationship: 'guardianRelationship',
  maskedNationalId: 'maskedNationalId',
  status: 'status',
  duplicateMatchId: 'duplicateMatchId',
  duplicateNotes: 'duplicateNotes',
  studentProfileId: 'studentProfileId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionApplicationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  applicationNumber: 'applicationNumber',
  sessionId: 'sessionId',
  applicantId: 'applicantId',
  gradeId: 'gradeId',
  requestedClassId: 'requestedClassId',
  status: 'status',
  reviewerUserId: 'reviewerUserId',
  submittedAt: 'submittedAt',
  verifiedAt: 'verifiedAt',
  decisionAt: 'decisionAt',
  notes: 'notes',
  rejectionReason: 'rejectionReason',
  cancellationReason: 'cancellationReason',
  feeInvoiceId: 'feeInvoiceId',
  studentProfileId: 'studentProfileId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionApplicationDocumentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  applicationId: 'applicationId',
  documentReferenceId: 'documentReferenceId',
  documentType: 'documentType',
  verificationStatus: 'verificationStatus',
  verifiedByUserId: 'verifiedByUserId',
  verifiedAt: 'verifiedAt',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionInterviewScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  applicationId: 'applicationId',
  scheduledDateTime: 'scheduledDateTime',
  interviewerUserId: 'interviewerUserId',
  mode: 'mode',
  location: 'location',
  status: 'status',
  result: 'result',
  notes: 'notes',
  score: 'score',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionTestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  applicationId: 'applicationId',
  testType: 'testType',
  scheduledDateTime: 'scheduledDateTime',
  maxScore: 'maxScore',
  passScore: 'passScore',
  score: 'score',
  evaluatorUserId: 'evaluatorUserId',
  status: 'status',
  result: 'result',
  remarks: 'remarks',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionDecisionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  applicationId: 'applicationId',
  decision: 'decision',
  reason: 'reason',
  decidedByUserId: 'decidedByUserId',
  decidedAt: 'decidedAt',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.AdmissionOfferScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  applicationId: 'applicationId',
  offerNumber: 'offerNumber',
  offeredGradeId: 'offeredGradeId',
  offeredClassId: 'offeredClassId',
  issuedDate: 'issuedDate',
  expiryDate: 'expiryDate',
  status: 'status',
  acceptedAt: 'acceptedAt',
  termsMetadataJson: 'termsMetadataJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionConfirmationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  applicationId: 'applicationId',
  confirmationNumber: 'confirmationNumber',
  confirmedAt: 'confirmedAt',
  confirmedByUserId: 'confirmedByUserId',
  financialReference: 'financialReference',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  code: 'code',
  description: 'description',
  active: 'active',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryCategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  code: 'code',
  description: 'description',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryAuthorScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  bio: 'bio',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryPublisherScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  address: 'address',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryBookScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  libraryId: 'libraryId',
  isbn: 'isbn',
  title: 'title',
  subtitle: 'subtitle',
  edition: 'edition',
  language: 'language',
  categoryId: 'categoryId',
  authorId: 'authorId',
  publisherId: 'publisherId',
  publicationYear: 'publicationYear',
  subject: 'subject',
  metadata: 'metadata',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryBookCopyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  libraryId: 'libraryId',
  bookId: 'bookId',
  accessionNumber: 'accessionNumber',
  barcode: 'barcode',
  condition: 'condition',
  status: 'status',
  acquisitionDate: 'acquisitionDate',
  location: 'location',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryMemberScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  libraryId: 'libraryId',
  memberType: 'memberType',
  memberCode: 'memberCode',
  studentProfileId: 'studentProfileId',
  userId: 'userId',
  status: 'status',
  joinedAt: 'joinedAt',
  expiresAt: 'expiresAt',
  maxLoansOverride: 'maxLoansOverride',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryLoanScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  memberId: 'memberId',
  bookCopyId: 'bookCopyId',
  issuedAt: 'issuedAt',
  dueAt: 'dueAt',
  returnedAt: 'returnedAt',
  status: 'status',
  issuedByUserId: 'issuedByUserId',
  returnedByUserId: 'returnedByUserId',
  renewalCount: 'renewalCount',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryReservationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  memberId: 'memberId',
  bookId: 'bookId',
  requestedAt: 'requestedAt',
  status: 'status',
  fulfilledAt: 'fulfilledAt',
  expiryAt: 'expiryAt',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryFineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  memberId: 'memberId',
  loanId: 'loanId',
  amount: 'amount',
  reason: 'reason',
  status: 'status',
  assessedAt: 'assessedAt',
  waivedAt: 'waivedAt',
  waivedByUserId: 'waivedByUserId',
  waiveReason: 'waiveReason',
  feeAssignmentId: 'feeAssignmentId',
  feePaymentId: 'feePaymentId',
  financialReference: 'financialReference',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryPolicyScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  libraryId: 'libraryId',
  name: 'name',
  defaultLoanPeriodDays: 'defaultLoanPeriodDays',
  maxActiveLoans: 'maxActiveLoans',
  renewalLimit: 'renewalLimit',
  finePerDayCents: 'finePerDayCents',
  gracePeriodDays: 'gracePeriodDays',
  reservationExpiryDays: 'reservationExpiryDays',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportFacilityScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  code: 'code',
  active: 'active',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportRouteScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  routeCode: 'routeCode',
  name: 'name',
  direction: 'direction',
  startPoint: 'startPoint',
  endPoint: 'endPoint',
  operatingDays: 'operatingDays',
  startTime: 'startTime',
  endTime: 'endTime',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportStopScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  routeId: 'routeId',
  stopName: 'stopName',
  sequence: 'sequence',
  latitude: 'latitude',
  longitude: 'longitude',
  pickupTime: 'pickupTime',
  dropTime: 'dropTime',
  landmark: 'landmark',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportVehicleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  registrationNumber: 'registrationNumber',
  vehicleType: 'vehicleType',
  capacity: 'capacity',
  status: 'status',
  make: 'make',
  model: 'model',
  year: 'year',
  insurancePolicy: 'insurancePolicy',
  insuranceExpiry: 'insuranceExpiry',
  fitnessExpiry: 'fitnessExpiry',
  permitExpiry: 'permitExpiry',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportDriverScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  name: 'name',
  phone: 'phone',
  licenseNumber: 'licenseNumber',
  licenseType: 'licenseType',
  licenseExpiry: 'licenseExpiry',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportAttendantScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  name: 'name',
  phone: 'phone',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportRouteAssignmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  routeId: 'routeId',
  vehicleId: 'vehicleId',
  driverId: 'driverId',
  attendantId: 'attendantId',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  shift: 'shift',
  active: 'active',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentTransportAssignmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  studentId: 'studentId',
  routeId: 'routeId',
  pickupStopId: 'pickupStopId',
  dropStopId: 'dropStopId',
  academicYearId: 'academicYearId',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  status: 'status',
  feeStructureId: 'feeStructureId',
  feeAssignmentId: 'feeAssignmentId',
  passNumber: 'passNumber',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportPassScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assignmentId: 'assignmentId',
  passNumber: 'passNumber',
  qrCodeReference: 'qrCodeReference',
  validFrom: 'validFrom',
  validTo: 'validTo',
  status: 'status',
  issuedAt: 'issuedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportIncidentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  routeId: 'routeId',
  vehicleId: 'vehicleId',
  incidentDate: 'incidentDate',
  incidentTime: 'incidentTime',
  reporterUserId: 'reporterUserId',
  severity: 'severity',
  description: 'description',
  status: 'status',
  resolutionNotes: 'resolutionNotes',
  resolvedAt: 'resolvedAt',
  resolvedByUserId: 'resolvedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryCategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  code: 'code',
  description: 'description',
  parentId: 'parentId',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryUnitScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  code: 'code',
  symbol: 'symbol',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryVendorScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  vendorCode: 'vendorCode',
  name: 'name',
  contactName: 'contactName',
  email: 'email',
  phone: 'phone',
  address: 'address',
  taxId: 'taxId',
  paymentTerms: 'paymentTerms',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryWarehouseScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  managerStaffId: 'managerStaffId',
  address: 'address',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryLocationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  warehouseId: 'warehouseId',
  code: 'code',
  aisle: 'aisle',
  rack: 'rack',
  shelf: 'shelf',
  bin: 'bin',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  sku: 'sku',
  internalCode: 'internalCode',
  barcode: 'barcode',
  name: 'name',
  description: 'description',
  categoryId: 'categoryId',
  unitId: 'unitId',
  reorderThreshold: 'reorderThreshold',
  reorderQuantity: 'reorderQuantity',
  minStock: 'minStock',
  maxStock: 'maxStock',
  active: 'active',
  trackLot: 'trackLot',
  trackExpiry: 'trackExpiry',
  valuationMethod: 'valuationMethod',
  unitCost: 'unitCost',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryStockScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  itemId: 'itemId',
  warehouseId: 'warehouseId',
  locationId: 'locationId',
  onHand: 'onHand',
  reserved: 'reserved',
  available: 'available',
  damaged: 'damaged',
  unitCost: 'unitCost',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryStockLotScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  itemId: 'itemId',
  lotNumber: 'lotNumber',
  manufacturingDate: 'manufacturingDate',
  expiryDate: 'expiryDate',
  quantity: 'quantity',
  unitCost: 'unitCost',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryStockMovementScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  itemId: 'itemId',
  sourceLocationId: 'sourceLocationId',
  destinationLocationId: 'destinationLocationId',
  quantity: 'quantity',
  movementType: 'movementType',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  actorUserId: 'actorUserId',
  reason: 'reason',
  timestamp: 'timestamp',
  createdAt: 'createdAt'
};

exports.Prisma.InventoryPurchaseRequestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  prNumber: 'prNumber',
  requesterUserId: 'requesterUserId',
  department: 'department',
  justification: 'justification',
  status: 'status',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryPurchaseRequestItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  purchaseRequestId: 'purchaseRequestId',
  itemId: 'itemId',
  quantity: 'quantity',
  estimatedUnitCost: 'estimatedUnitCost',
  createdAt: 'createdAt'
};

exports.Prisma.InventoryPurchaseOrderScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  poNumber: 'poNumber',
  vendorId: 'vendorId',
  status: 'status',
  orderDate: 'orderDate',
  expectedDeliveryDate: 'expectedDeliveryDate',
  subtotalAmount: 'subtotalAmount',
  taxAmount: 'taxAmount',
  totalAmount: 'totalAmount',
  notes: 'notes',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryPurchaseOrderItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  purchaseOrderId: 'purchaseOrderId',
  itemId: 'itemId',
  orderedQuantity: 'orderedQuantity',
  receivedQuantity: 'receivedQuantity',
  unitPrice: 'unitPrice',
  taxPercent: 'taxPercent',
  totalPrice: 'totalPrice'
};

exports.Prisma.InventoryReceiptScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  receiptNumber: 'receiptNumber',
  purchaseOrderId: 'purchaseOrderId',
  vendorId: 'vendorId',
  warehouseId: 'warehouseId',
  receivedByUserId: 'receivedByUserId',
  receivedAt: 'receivedAt',
  invoiceNumber: 'invoiceNumber',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryReceiptItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  receiptId: 'receiptId',
  purchaseOrderItemId: 'purchaseOrderItemId',
  itemId: 'itemId',
  quantityReceived: 'quantityReceived',
  unitCost: 'unitCost',
  lotNumber: 'lotNumber',
  expiryDate: 'expiryDate',
  createdAt: 'createdAt'
};

exports.Prisma.InventoryIssueScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  issueNumber: 'issueNumber',
  warehouseId: 'warehouseId',
  issuedToType: 'issuedToType',
  issuedToId: 'issuedToId',
  issuedByUserId: 'issuedByUserId',
  issuedAt: 'issuedAt',
  reason: 'reason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryIssueItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  issueId: 'issueId',
  itemId: 'itemId',
  quantity: 'quantity',
  unitCost: 'unitCost',
  createdAt: 'createdAt'
};

exports.Prisma.InventoryTransferScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  transferNumber: 'transferNumber',
  sourceWarehouseId: 'sourceWarehouseId',
  destinationWarehouseId: 'destinationWarehouseId',
  status: 'status',
  requestedByUserId: 'requestedByUserId',
  approvedByUserId: 'approvedByUserId',
  shippedAt: 'shippedAt',
  receivedAt: 'receivedAt',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryTransferItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  transferId: 'transferId',
  itemId: 'itemId',
  quantity: 'quantity',
  createdAt: 'createdAt'
};

exports.Prisma.InventoryAdjustmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  adjustmentNumber: 'adjustmentNumber',
  warehouseId: 'warehouseId',
  status: 'status',
  adjustedByUserId: 'adjustedByUserId',
  adjustedAt: 'adjustedAt',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.InventoryAdjustmentItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  adjustmentId: 'adjustmentId',
  itemId: 'itemId',
  quantity: 'quantity',
  direction: 'direction',
  unitCost: 'unitCost',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.InventoryReservationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  reservationNumber: 'reservationNumber',
  itemId: 'itemId',
  warehouseId: 'warehouseId',
  quantity: 'quantity',
  reservedForType: 'reservedForType',
  reservedForId: 'reservedForId',
  status: 'status',
  expiryDate: 'expiryDate',
  reservedByUserId: 'reservedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryReorderRuleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  itemId: 'itemId',
  warehouseId: 'warehouseId',
  reorderPoint: 'reorderPoint',
  reorderQuantity: 'reorderQuantity',
  preferredVendorId: 'preferredVendorId',
  leadTimeDays: 'leadTimeDays',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryValuationSnapshotScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  snapshotDate: 'snapshotDate',
  totalValuation: 'totalValuation',
  itemCount: 'itemCount',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.AssetCategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  code: 'code',
  description: 'description',
  usefulLifeMonths: 'usefulLifeMonths',
  residualValuePercent: 'residualValuePercent',
  depreciationMethod: 'depreciationMethod',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetTag: 'assetTag',
  serialNumber: 'serialNumber',
  name: 'name',
  description: 'description',
  categoryId: 'categoryId',
  vendorId: 'vendorId',
  location: 'location',
  condition: 'condition',
  status: 'status',
  acquisitionDate: 'acquisitionDate',
  acquisitionCost: 'acquisitionCost',
  usefulLifeMonths: 'usefulLifeMonths',
  residualValue: 'residualValue',
  bookValue: 'bookValue',
  warrantyExpiry: 'warrantyExpiry',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetComponentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  parentAssetId: 'parentAssetId',
  assetTag: 'assetTag',
  name: 'name',
  serialNumber: 'serialNumber',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetAssignmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetId: 'assetId',
  assignedToType: 'assignedToType',
  assignedToId: 'assignedToId',
  assignedDate: 'assignedDate',
  expectedReturnDate: 'expectedReturnDate',
  conditionOnAssign: 'conditionOnAssign',
  returnDate: 'returnDate',
  conditionOnReturn: 'conditionOnReturn',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetTransferScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetId: 'assetId',
  fromLocation: 'fromLocation',
  toLocation: 'toLocation',
  fromAssigneeId: 'fromAssigneeId',
  toAssigneeId: 'toAssigneeId',
  transferDate: 'transferDate',
  reason: 'reason',
  actorUserId: 'actorUserId',
  acknowledgedByUserId: 'acknowledgedByUserId',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.AssetReturnScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assignmentId: 'assignmentId',
  assetId: 'assetId',
  returnDate: 'returnDate',
  condition: 'condition',
  notes: 'notes',
  returnedByUserId: 'returnedByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.AssetMaintenanceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetId: 'assetId',
  maintenanceType: 'maintenanceType',
  status: 'status',
  requestedDate: 'requestedDate',
  scheduledDate: 'scheduledDate',
  completedDate: 'completedDate',
  vendorName: 'vendorName',
  cost: 'cost',
  notes: 'notes',
  nextScheduledDate: 'nextScheduledDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetDisposalScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetId: 'assetId',
  disposalType: 'disposalType',
  status: 'status',
  disposalDate: 'disposalDate',
  reason: 'reason',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  proceedsAmount: 'proceedsAmount',
  buyerName: 'buyerName',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetDepreciationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetId: 'assetId',
  fiscalYear: 'fiscalYear',
  periodNumber: 'periodNumber',
  depreciationAmount: 'depreciationAmount',
  accumulatedDepreciation: 'accumulatedDepreciation',
  endingBookValue: 'endingBookValue',
  calculationDate: 'calculationDate',
  createdAt: 'createdAt'
};

exports.Prisma.HRDepartmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  description: 'description',
  parentDepartmentId: 'parentDepartmentId',
  headStaffId: 'headStaffId',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRDesignationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  description: 'description',
  level: 'level',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRWorkLocationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  address: 'address',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HREmploymentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  staffProfileId: 'staffProfileId',
  employeeNumber: 'employeeNumber',
  status: 'status',
  employmentType: 'employmentType',
  departmentId: 'departmentId',
  designationId: 'designationId',
  workLocationId: 'workLocationId',
  reportingManagerStaffId: 'reportingManagerStaffId',
  joiningDate: 'joiningDate',
  confirmationDate: 'confirmationDate',
  exitDate: 'exitDate',
  exitReason: 'exitReason',
  emergencyContactJson: 'emergencyContactJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HREmploymentHistoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employmentId: 'employmentId',
  changeDate: 'changeDate',
  previousDepartmentId: 'previousDepartmentId',
  newDepartmentId: 'newDepartmentId',
  previousDesignationId: 'previousDesignationId',
  newDesignationId: 'newDesignationId',
  previousStatus: 'previousStatus',
  newStatus: 'newStatus',
  reason: 'reason',
  changedByUserId: 'changedByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.HREmploymentContractScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employmentId: 'employmentId',
  contractNumber: 'contractNumber',
  employmentType: 'employmentType',
  startDate: 'startDate',
  endDate: 'endDate',
  probationPeriodDays: 'probationPeriodDays',
  noticePeriodDays: 'noticePeriodDays',
  status: 'status',
  documentReferenceId: 'documentReferenceId',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRHolidayCalendarScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  academicYearId: 'academicYearId',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRHolidayScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  calendarId: 'calendarId',
  name: 'name',
  date: 'date',
  holidayType: 'holidayType',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRLeaveTypeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  description: 'description',
  daysAllowedPerYear: 'daysAllowedPerYear',
  isPaid: 'isPaid',
  carryForwardDays: 'carryForwardDays',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRLeaveBalanceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employmentId: 'employmentId',
  leaveTypeId: 'leaveTypeId',
  year: 'year',
  allocatedDays: 'allocatedDays',
  usedDays: 'usedDays',
  pendingDays: 'pendingDays',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRLeaveRequestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employmentId: 'employmentId',
  leaveTypeId: 'leaveTypeId',
  startDate: 'startDate',
  endDate: 'endDate',
  daysCount: 'daysCount',
  reason: 'reason',
  status: 'status',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRWorkScheduleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  code: 'code',
  workingDaysJson: 'workingDaysJson',
  expectedDailyHours: 'expectedDailyHours',
  shiftStart: 'shiftStart',
  shiftEnd: 'shiftEnd',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HREmployeeDocumentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employmentId: 'employmentId',
  documentReferenceId: 'documentReferenceId',
  category: 'category',
  title: 'title',
  expiryDate: 'expiryDate',
  isVerified: 'isVerified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalaryComponentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  description: 'description',
  type: 'type',
  calculationMethod: 'calculationMethod',
  defaultAmount: 'defaultAmount',
  percentage: 'percentage',
  isTaxable: 'isTaxable',
  isRecurring: 'isRecurring',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalaryStructureScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  code: 'code',
  name: 'name',
  description: 'description',
  active: 'active',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalaryStructureItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  structureId: 'structureId',
  componentId: 'componentId',
  amount: 'amount',
  percentage: 'percentage',
  createdAt: 'createdAt'
};

exports.Prisma.EmployeeCompensationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employmentId: 'employmentId',
  salaryStructureId: 'salaryStructureId',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  basicSalary: 'basicSalary',
  grossSalary: 'grossSalary',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeCompensationItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  compensationId: 'compensationId',
  componentId: 'componentId',
  amount: 'amount',
  calculationMethod: 'calculationMethod',
  createdAt: 'createdAt'
};

exports.Prisma.PayrollPeriodScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  fiscalYearId: 'fiscalYearId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollRunScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  periodId: 'periodId',
  runNumber: 'runNumber',
  status: 'status',
  calculationVersion: 'calculationVersion',
  totalEmployees: 'totalEmployees',
  totalGrossEarnings: 'totalGrossEarnings',
  totalEmployeeDeductions: 'totalEmployeeDeductions',
  totalEmployerContributions: 'totalEmployerContributions',
  totalNetPay: 'totalNetPay',
  createdByUserId: 'createdByUserId',
  calculatedAt: 'calculatedAt',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  finalizedByUserId: 'finalizedByUserId',
  finalizedAt: 'finalizedAt',
  journalEntryId: 'journalEntryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollCalculationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  payrollRunId: 'payrollRunId',
  employmentId: 'employmentId',
  workingDays: 'workingDays',
  presentDays: 'presentDays',
  absentDays: 'absentDays',
  unpaidLeaveDays: 'unpaidLeaveDays',
  grossEarnings: 'grossEarnings',
  totalDeductions: 'totalDeductions',
  employerContributions: 'employerContributions',
  netPay: 'netPay',
  taxableAmount: 'taxableAmount',
  lineItemsJson: 'lineItemsJson',
  createdAt: 'createdAt'
};

exports.Prisma.PayslipScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  payrollRunId: 'payrollRunId',
  employmentId: 'employmentId',
  periodId: 'periodId',
  payslipNumber: 'payslipNumber',
  employeeName: 'employeeName',
  employeeNumber: 'employeeNumber',
  departmentName: 'departmentName',
  designationName: 'designationName',
  bankAccountMasked: 'bankAccountMasked',
  grossEarnings: 'grossEarnings',
  totalDeductions: 'totalDeductions',
  netPay: 'netPay',
  calculationVersion: 'calculationVersion',
  snapshotJson: 'snapshotJson',
  isPublished: 'isPublished',
  generatedAt: 'generatedAt'
};

exports.Prisma.PayrollAdjustmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  employmentId: 'employmentId',
  periodId: 'periodId',
  adjustmentType: 'adjustmentType',
  amount: 'amount',
  reason: 'reason',
  status: 'status',
  requestedByUserId: 'requestedByUserId',
  approvedByUserId: 'approvedByUserId',
  appliedInPayrollRunId: 'appliedInPayrollRunId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollAccountingPostingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  payrollRunId: 'payrollRunId',
  journalEntryId: 'journalEntryId',
  totalExpense: 'totalExpense',
  totalPayable: 'totalPayable',
  postedAt: 'postedAt',
  postedByUserId: 'postedByUserId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.TenantStatus = exports.$Enums.TenantStatus = {
  PROVISIONING: 'PROVISIONING',
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  ARCHIVED: 'ARCHIVED'
};

exports.EntitlementSource = exports.$Enums.EntitlementSource = {
  PLAN_INCLUDED: 'PLAN_INCLUDED',
  ADDON_PURCHASE: 'ADDON_PURCHASE',
  PROMOTIONAL_OVERRIDE: 'PROMOTIONAL_OVERRIDE'
};

exports.LeadStatus = exports.$Enums.LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROVISIONED: 'PROVISIONED',
  CLOSED: 'CLOSED'
};

exports.PlatformRole = exports.$Enums.PlatformRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPPORT_OPERATOR: 'SUPPORT_OPERATOR',
  AUDITOR: 'AUDITOR'
};

exports.MembershipStatus = exports.$Enums.MembershipStatus = {
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED'
};

exports.AccessScope = exports.$Enums.AccessScope = {
  GLOBAL: 'GLOBAL',
  INSTITUTION_WIDE: 'INSTITUTION_WIDE',
  ASSIGNED_ONLY: 'ASSIGNED_ONLY',
  SELF_ONLY: 'SELF_ONLY',
  LINKED_CHILDREN: 'LINKED_CHILDREN'
};

exports.AcademicSessionStatus = exports.$Enums.AcademicSessionStatus = {
  UPCOMING: 'UPCOMING',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.SubjectType = exports.$Enums.SubjectType = {
  THEORY: 'THEORY',
  PRACTICAL: 'PRACTICAL',
  ELECTIVE: 'ELECTIVE',
  CO_CURRICULAR: 'CO_CURRICULAR'
};

exports.Gender = exports.$Enums.Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER'
};

exports.StaffStatus = exports.$Enums.StaffStatus = {
  ACTIVE: 'ACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  RESIGNED: 'RESIGNED',
  TERMINATED: 'TERMINATED',
  RETIRED: 'RETIRED'
};

exports.BloodGroup = exports.$Enums.BloodGroup = {
  A_POS: 'A_POS',
  A_NEG: 'A_NEG',
  B_POS: 'B_POS',
  B_NEG: 'B_NEG',
  O_POS: 'O_POS',
  O_NEG: 'O_NEG',
  AB_POS: 'AB_POS',
  AB_NEG: 'AB_NEG',
  UNKNOWN: 'UNKNOWN'
};

exports.StudentStatus = exports.$Enums.StudentStatus = {
  ENROLLED: 'ENROLLED',
  ACTIVE: 'ACTIVE',
  PROMOTED: 'PROMOTED',
  TRANSFERRED: 'TRANSFERRED',
  GRADUATED: 'GRADUATED',
  WITHDRAWN: 'WITHDRAWN'
};

exports.ParentRelationshipType = exports.$Enums.ParentRelationshipType = {
  FATHER: 'FATHER',
  MOTHER: 'MOTHER',
  LEGAL_GUARDIAN: 'LEGAL_GUARDIAN',
  STEP_PARENT: 'STEP_PARENT',
  RELATIVE: 'RELATIVE',
  OTHER: 'OTHER'
};

exports.PromotionDecision = exports.$Enums.PromotionDecision = {
  PROMOTED: 'PROMOTED',
  DETAINED: 'DETAINED',
  CONDITIONAL_PASS: 'CONDITIONAL_PASS',
  TRANSFERRED_OUT: 'TRANSFERRED_OUT'
};

exports.DayOfWeek = exports.$Enums.DayOfWeek = {
  MONDAY: 'MONDAY',
  TUESDAY: 'TUESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THURSDAY: 'THURSDAY',
  FRIDAY: 'FRIDAY',
  SATURDAY: 'SATURDAY',
  SUNDAY: 'SUNDAY'
};

exports.AttendanceStatus = exports.$Enums.AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  HALF_DAY: 'HALF_DAY',
  EXCUSED: 'EXCUSED'
};

exports.AssignmentStatus = exports.$Enums.AssignmentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED'
};

exports.SubmissionStatus = exports.$Enums.SubmissionStatus = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  SUBMITTED: 'SUBMITTED',
  GRADED: 'GRADED',
  RESUBMISSION_REQUESTED: 'RESUBMISSION_REQUESTED'
};

exports.ExamStatus = exports.$Enums.ExamStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  RESULTS_PUBLISHED: 'RESULTS_PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

exports.ReportCardStatus = exports.$Enums.ReportCardStatus = {
  DRAFT: 'DRAFT',
  GENERATED: 'GENERATED',
  SIGNED: 'SIGNED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

exports.AnnouncementCategory = exports.$Enums.AnnouncementCategory = {
  ACADEMIC: 'ACADEMIC',
  HOLIDAY: 'HOLIDAY',
  URGENT: 'URGENT',
  EVENT: 'EVENT',
  ADMINISTRATIVE: 'ADMINISTRATIVE',
  GENERAL: 'GENERAL'
};

exports.AudienceScope = exports.$Enums.AudienceScope = {
  ALL_SCHOOL: 'ALL_SCHOOL',
  ROLES: 'ROLES',
  GRADES: 'GRADES',
  SPECIFIC_CLASSES: 'SPECIFIC_CLASSES'
};

exports.EventType = exports.$Enums.EventType = {
  HOLIDAY: 'HOLIDAY',
  EXAMINATION: 'EXAMINATION',
  SPORTS: 'SPORTS',
  CULTURAL: 'CULTURAL',
  PTM: 'PTM',
  ACADEMIC: 'ACADEMIC',
  GENERAL: 'GENERAL'
};

exports.NotificationCategory = exports.$Enums.NotificationCategory = {
  ATTENDANCE_ALERT: 'ATTENDANCE_ALERT',
  HOMEWORK_ALERT: 'HOMEWORK_ALERT',
  EXAM_RESULT: 'EXAM_RESULT',
  CIRCULAR: 'CIRCULAR',
  GENERAL_REMINDER: 'GENERAL_REMINDER'
};

exports.AuditActionCategory = exports.$Enums.AuditActionCategory = {
  AUTH: 'AUTH',
  SECURITY: 'SECURITY',
  TENANT_MGMT: 'TENANT_MGMT',
  RBAC: 'RBAC',
  ACADEMIC: 'ACADEMIC',
  STUDENT: 'STUDENT',
  ATTENDANCE: 'ATTENDANCE',
  EVALUATION: 'EVALUATION',
  EXPORT: 'EXPORT',
  FEES: 'FEES',
  FINANCE: 'FINANCE',
  ADMISSIONS: 'ADMISSIONS',
  LIBRARY: 'LIBRARY',
  TRANSPORT: 'TRANSPORT',
  INVENTORY: 'INVENTORY',
  ASSET: 'ASSET',
  HR: 'HR',
  PAYROLL: 'PAYROLL'
};

exports.StorageProvider = exports.$Enums.StorageProvider = {
  S3_AWS: 'S3_AWS',
  CLOUDFLARE_R2: 'CLOUDFLARE_R2',
  LOCAL_MINIO: 'LOCAL_MINIO'
};

exports.FileAccessLevel = exports.$Enums.FileAccessLevel = {
  PUBLIC: 'PUBLIC',
  TENANT_RESTRICTED: 'TENANT_RESTRICTED',
  PRIVATE: 'PRIVATE'
};

exports.FeeFrequency = exports.$Enums.FeeFrequency = {
  ONE_TIME: 'ONE_TIME',
  ANNUAL: 'ANNUAL',
  SEMESTER: 'SEMESTER',
  QUARTERLY: 'QUARTERLY',
  MONTHLY: 'MONTHLY',
  OPTIONAL: 'OPTIONAL'
};

exports.DiscountType = exports.$Enums.DiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  FULL_SCHOLARSHIP: 'FULL_SCHOLARSHIP'
};

exports.InvoiceStatus = exports.$Enums.InvoiceStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  VOID: 'VOID',
  CANCELLED: 'CANCELLED'
};

exports.PaymentGatewayProvider = exports.$Enums.PaymentGatewayProvider = {
  RAZORPAY: 'RAZORPAY',
  CASHFREE: 'CASHFREE',
  STRIPE: 'STRIPE',
  MANUAL: 'MANUAL'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED'
};

exports.PaymentMode = exports.$Enums.PaymentMode = {
  ONLINE_GATEWAY: 'ONLINE_GATEWAY',
  CASH: 'CASH',
  CHEQUE: 'CHEQUE',
  BANK_TRANSFER: 'BANK_TRANSFER',
  POS_CARD: 'POS_CARD',
  UPI_QR: 'UPI_QR'
};

exports.PeriodStatus = exports.$Enums.PeriodStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  LOCKED: 'LOCKED'
};

exports.AccountType = exports.$Enums.AccountType = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  REVENUE: 'REVENUE',
  EXPENSE: 'EXPENSE'
};

exports.AccountSubtype = exports.$Enums.AccountSubtype = {
  CASH: 'CASH',
  BANK: 'BANK',
  ACCOUNTS_RECEIVABLE: 'ACCOUNTS_RECEIVABLE',
  ACCOUNTS_PAYABLE: 'ACCOUNTS_PAYABLE',
  TUITION_INCOME: 'TUITION_INCOME',
  TRANSPORT_INCOME: 'TRANSPORT_INCOME',
  LIBRARY_INCOME: 'LIBRARY_INCOME',
  OTHER_INCOME: 'OTHER_INCOME',
  SALARY_EXPENSE: 'SALARY_EXPENSE',
  OPERATING_EXPENSE: 'OPERATING_EXPENSE',
  DEPRECIATION_EXPENSE: 'DEPRECIATION_EXPENSE',
  ACCUMULATED_DEPRECIATION: 'ACCUMULATED_DEPRECIATION',
  TAX_PAYABLE: 'TAX_PAYABLE',
  EQUITY_RETAINED: 'EQUITY_RETAINED'
};

exports.JournalSourceType = exports.$Enums.JournalSourceType = {
  FEE_INVOICE: 'FEE_INVOICE',
  FEE_PAYMENT: 'FEE_PAYMENT',
  FEE_REFUND: 'FEE_REFUND',
  PAYROLL_RUN: 'PAYROLL_RUN',
  INVENTORY_PURCHASE: 'INVENTORY_PURCHASE',
  ASSET_PURCHASE: 'ASSET_PURCHASE',
  LIBRARY_FINE: 'LIBRARY_FINE',
  TRANSPORT_CHARGE: 'TRANSPORT_CHARGE',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT'
};

exports.JournalStatus = exports.$Enums.JournalStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  REVERSED: 'REVERSED'
};

exports.AdmissionSessionStatus = exports.$Enums.AdmissionSessionStatus = {
  UPCOMING: 'UPCOMING',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED'
};

exports.AdmissionSourceType = exports.$Enums.AdmissionSourceType = {
  WALK_IN: 'WALK_IN',
  WEBSITE: 'WEBSITE',
  REFERRAL: 'REFERRAL',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  EVENT: 'EVENT',
  EDUCATION_FAIR: 'EDUCATION_FAIR',
  CAMPAIGN: 'CAMPAIGN',
  OTHER: 'OTHER'
};

exports.EnquiryStatus = exports.$Enums.EnquiryStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
  CLOSED: 'CLOSED'
};

exports.ApplicantStatus = exports.$Enums.ApplicantStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  DUPLICATE_FLAGGED: 'DUPLICATE_FLAGGED',
  CONVERTED: 'CONVERTED'
};

exports.ApplicationStatus = exports.$Enums.ApplicationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  DOCUMENTS_PENDING: 'DOCUMENTS_PENDING',
  DOCUMENTS_VERIFIED: 'DOCUMENTS_VERIFIED',
  INTERVIEW_PENDING: 'INTERVIEW_PENDING',
  TEST_PENDING: 'TEST_PENDING',
  DECISION_PENDING: 'DECISION_PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  WAITLISTED: 'WAITLISTED',
  OFFERED: 'OFFERED',
  CONFIRMED: 'CONFIRMED',
  ADMITTED: 'ADMITTED',
  CANCELLED: 'CANCELLED'
};

exports.DocumentVerificationStatus = exports.$Enums.DocumentVerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.InterviewStatus = exports.$Enums.InterviewStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  RESCHEDULED: 'RESCHEDULED',
  NO_SHOW: 'NO_SHOW'
};

exports.InterviewResult = exports.$Enums.InterviewResult = {
  PENDING: 'PENDING',
  RECOMMENDED: 'RECOMMENDED',
  NOT_RECOMMENDED: 'NOT_RECOMMENDED',
  CONDITIONAL: 'CONDITIONAL'
};

exports.TestStatus = exports.$Enums.TestStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ABSENT: 'ABSENT'
};

exports.TestResult = exports.$Enums.TestResult = {
  PENDING: 'PENDING',
  PASSED: 'PASSED',
  FAILED: 'FAILED'
};

exports.ApplicationDecisionType = exports.$Enums.ApplicationDecisionType = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  WAITLISTED: 'WAITLISTED'
};

exports.OfferStatus = exports.$Enums.OfferStatus = {
  ISSUED: 'ISSUED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

exports.ConfirmationStatus = exports.$Enums.ConfirmationStatus = {
  CONFIRMED: 'CONFIRMED',
  REVERSED: 'REVERSED',
  CANCELLED: 'CANCELLED'
};

exports.BookCopyStatus = exports.$Enums.BookCopyStatus = {
  AVAILABLE: 'AVAILABLE',
  ISSUED: 'ISSUED',
  RESERVED: 'RESERVED',
  LOST: 'LOST',
  DAMAGED: 'DAMAGED',
  WITHDRAWN: 'WITHDRAWN'
};

exports.LibraryMemberType = exports.$Enums.LibraryMemberType = {
  STUDENT: 'STUDENT',
  STAFF: 'STAFF',
  PARENT: 'PARENT',
  OTHER: 'OTHER'
};

exports.LibraryMemberStatus = exports.$Enums.LibraryMemberStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED'
};

exports.LoanStatus = exports.$Enums.LoanStatus = {
  ISSUED: 'ISSUED',
  RETURNED: 'RETURNED',
  OVERDUE: 'OVERDUE',
  LOST: 'LOST',
  CANCELLED: 'CANCELLED'
};

exports.ReservationStatus = exports.$Enums.ReservationStatus = {
  PENDING: 'PENDING',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

exports.FineStatus = exports.$Enums.FineStatus = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
  WAIVED: 'WAIVED',
  CANCELLED: 'CANCELLED'
};

exports.RouteDirection = exports.$Enums.RouteDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
  BOTH: 'BOTH'
};

exports.VehicleType = exports.$Enums.VehicleType = {
  BUS: 'BUS',
  VAN: 'VAN',
  MINIBUS: 'MINIBUS',
  CAR: 'CAR',
  OTHER: 'OTHER'
};

exports.VehicleStatus = exports.$Enums.VehicleStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED'
};

exports.DriverStatus = exports.$Enums.DriverStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
};

exports.AttendantStatus = exports.$Enums.AttendantStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.RouteShift = exports.$Enums.RouteShift = {
  MORNING: 'MORNING',
  AFTERNOON: 'AFTERNOON',
  BOTH: 'BOTH'
};

exports.TransportAssignmentStatus = exports.$Enums.TransportAssignmentStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED'
};

exports.TransportPassStatus = exports.$Enums.TransportPassStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

exports.IncidentSeverity = exports.$Enums.IncidentSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.IncidentStatus = exports.$Enums.IncidentStatus = {
  OPEN: 'OPEN',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED'
};

exports.ValuationMethod = exports.$Enums.ValuationMethod = {
  FIFO: 'FIFO',
  LIFO: 'LIFO',
  WEIGHTED_AVERAGE: 'WEIGHTED_AVERAGE'
};

exports.MovementType = exports.$Enums.MovementType = {
  RECEIPT: 'RECEIPT',
  ISSUE: 'ISSUE',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
  RESERVATION: 'RESERVATION',
  RELEASE: 'RELEASE',
  RETURN: 'RETURN'
};

exports.PurchaseRequestStatus = exports.$Enums.PurchaseRequestStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  CONVERTED: 'CONVERTED'
};

exports.PurchaseOrderStatus = exports.$Enums.PurchaseOrderStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED'
};

exports.TransferStatus = exports.$Enums.TransferStatus = {
  DRAFT: 'DRAFT',
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED'
};

exports.AdjustmentDirection = exports.$Enums.AdjustmentDirection = {
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE'
};

exports.ReservationState = exports.$Enums.ReservationState = {
  ACTIVE: 'ACTIVE',
  FULFILLED: 'FULFILLED',
  RELEASED: 'RELEASED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

exports.AssetDepreciationMethod = exports.$Enums.AssetDepreciationMethod = {
  STRAIGHT_LINE: 'STRAIGHT_LINE',
  WRITTEN_DOWN_VALUE: 'WRITTEN_DOWN_VALUE',
  NONE: 'NONE'
};

exports.AssetCondition = exports.$Enums.AssetCondition = {
  NEW: 'NEW',
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  POOR: 'POOR',
  DAMAGED: 'DAMAGED'
};

exports.AssetStatus = exports.$Enums.AssetStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ASSIGNED: 'ASSIGNED',
  UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
  TRANSFERRED: 'TRANSFERRED',
  LOST: 'LOST',
  DAMAGED: 'DAMAGED',
  DISPOSED: 'DISPOSED',
  RETIRED: 'RETIRED'
};

exports.AssetAssignmentStatus = exports.$Enums.AssetAssignmentStatus = {
  ACTIVE: 'ACTIVE',
  RETURNED: 'RETURNED'
};

exports.AssetMaintenanceType = exports.$Enums.AssetMaintenanceType = {
  PREVENTIVE: 'PREVENTIVE',
  CORRECTIVE: 'CORRECTIVE',
  CALIBRATION: 'CALIBRATION',
  INSPECTION: 'INSPECTION'
};

exports.AssetMaintenanceStatus = exports.$Enums.AssetMaintenanceStatus = {
  REQUESTED: 'REQUESTED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.AssetDisposalType = exports.$Enums.AssetDisposalType = {
  SALE: 'SALE',
  SCRAP: 'SCRAP',
  DONATION: 'DONATION',
  WRITE_OFF: 'WRITE_OFF'
};

exports.AssetDisposalStatus = exports.$Enums.AssetDisposalStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  DISPOSED: 'DISPOSED'
};

exports.HREmploymentStatus = exports.$Enums.HREmploymentStatus = {
  ACTIVE: 'ACTIVE',
  PROBATION: 'PROBATION',
  ON_NOTICE: 'ON_NOTICE',
  ON_LEAVE: 'ON_LEAVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED',
  RESIGNED: 'RESIGNED',
  RETIRED: 'RETIRED'
};

exports.HREmploymentType = exports.$Enums.HREmploymentType = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACT',
  AD_HOC: 'AD_HOC',
  INTERN: 'INTERN',
  VISITING: 'VISITING'
};

exports.HRContractStatus = exports.$Enums.HRContractStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED',
  CANCELLED: 'CANCELLED'
};

exports.HRHolidayType = exports.$Enums.HRHolidayType = {
  NATIONAL: 'NATIONAL',
  REGIONAL: 'REGIONAL',
  INSTITUTIONAL: 'INSTITUTIONAL',
  RESTRICTED: 'RESTRICTED'
};

exports.HRLeaveStatus = exports.$Enums.HRLeaveStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

exports.HRDocumentCategory = exports.$Enums.HRDocumentCategory = {
  CONTRACT: 'CONTRACT',
  IDENTIFICATION: 'IDENTIFICATION',
  QUALIFICATION: 'QUALIFICATION',
  OFFER_LETTER: 'OFFER_LETTER',
  RELIEVING_LETTER: 'RELIEVING_LETTER',
  APPRAISAL: 'APPRAISAL',
  OTHER: 'OTHER'
};

exports.SalaryComponentType = exports.$Enums.SalaryComponentType = {
  EARNING: 'EARNING',
  DEDUCTION: 'DEDUCTION',
  EMPLOYER_CONTRIBUTION: 'EMPLOYER_CONTRIBUTION'
};

exports.SalaryCalculationMethod = exports.$Enums.SalaryCalculationMethod = {
  FIXED: 'FIXED',
  PERCENTAGE_OF_BASIC: 'PERCENTAGE_OF_BASIC',
  PERCENTAGE_OF_GROSS: 'PERCENTAGE_OF_GROSS',
  DAYS_BASED: 'DAYS_BASED',
  MANUAL: 'MANUAL'
};

exports.PayrollPeriodStatus = exports.$Enums.PayrollPeriodStatus = {
  OPEN: 'OPEN',
  PROCESSING: 'PROCESSING',
  CALCULATED: 'CALCULATED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  FINALIZED: 'FINALIZED',
  LOCKED: 'LOCKED'
};

exports.PayrollRunStatus = exports.$Enums.PayrollRunStatus = {
  DRAFT: 'DRAFT',
  PROCESSING: 'PROCESSING',
  CALCULATED: 'CALCULATED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  FINALIZED: 'FINALIZED',
  CANCELLED: 'CANCELLED'
};

exports.PayrollAdjustmentType = exports.$Enums.PayrollAdjustmentType = {
  ARREARS: 'ARREARS',
  BONUS: 'BONUS',
  REIMBURSEMENT: 'REIMBURSEMENT',
  DEDUCTION_CORRECTION: 'DEDUCTION_CORRECTION',
  UNPAID_LEAVE_DEDUCTION: 'UNPAID_LEAVE_DEDUCTION',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT'
};

exports.PayrollAdjustmentStatus = exports.$Enums.PayrollAdjustmentStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  APPLIED: 'APPLIED'
};

exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  TenantPolicy: 'TenantPolicy',
  TenantBranding: 'TenantBranding',
  TenantDomain: 'TenantDomain',
  SubscriptionPlan: 'SubscriptionPlan',
  Module: 'Module',
  TenantModuleEntitlement: 'TenantModuleEntitlement',
  LeadInquiry: 'LeadInquiry',
  User: 'User',
  PlatformUser: 'PlatformUser',
  UserPreference: 'UserPreference',
  TenantMembership: 'TenantMembership',
  Role: 'Role',
  Permission: 'Permission',
  RolePermission: 'RolePermission',
  TenantInvitation: 'TenantInvitation',
  AcademicYear: 'AcademicYear',
  Term: 'Term',
  Grade: 'Grade',
  Class: 'Class',
  Subject: 'Subject',
  ClassSubject: 'ClassSubject',
  StaffProfile: 'StaffProfile',
  StudentProfile: 'StudentProfile',
  ParentProfile: 'ParentProfile',
  StudentParentBinding: 'StudentParentBinding',
  StudentEnrollment: 'StudentEnrollment',
  StudentAcademicHistory: 'StudentAcademicHistory',
  TimetablePeriod: 'TimetablePeriod',
  TimetableLesson: 'TimetableLesson',
  AttendanceRecord: 'AttendanceRecord',
  AttendanceCorrection: 'AttendanceCorrection',
  AttendanceDailySummary: 'AttendanceDailySummary',
  Assignment: 'Assignment',
  AssignmentSubmission: 'AssignmentSubmission',
  Exam: 'Exam',
  ExamPaper: 'ExamPaper',
  GradingScheme: 'GradingScheme',
  ExamResult: 'ExamResult',
  ReportCard: 'ReportCard',
  Announcement: 'Announcement',
  Event: 'Event',
  Notification: 'Notification',
  NotificationPreference: 'NotificationPreference',
  AuditLog: 'AuditLog',
  DocumentReference: 'DocumentReference',
  FeeCategory: 'FeeCategory',
  FeeStructure: 'FeeStructure',
  FeeStructureItem: 'FeeStructureItem',
  StudentFeeAssignment: 'StudentFeeAssignment',
  FeeDiscount: 'FeeDiscount',
  FeeInvoice: 'FeeInvoice',
  FeeInvoiceItem: 'FeeInvoiceItem',
  PaymentGatewayConfig: 'PaymentGatewayConfig',
  PaymentIntent: 'PaymentIntent',
  Payment: 'Payment',
  PaymentAllocation: 'PaymentAllocation',
  PaymentRefund: 'PaymentRefund',
  PaymentWebhookEvent: 'PaymentWebhookEvent',
  FiscalYear: 'FiscalYear',
  FinancialPeriod: 'FinancialPeriod',
  ChartOfAccount: 'ChartOfAccount',
  LedgerAccount: 'LedgerAccount',
  JournalEntry: 'JournalEntry',
  JournalLine: 'JournalLine',
  TenantOutboxEvent: 'TenantOutboxEvent',
  AdmissionSession: 'AdmissionSession',
  AdmissionSource: 'AdmissionSource',
  AdmissionEnquiry: 'AdmissionEnquiry',
  Applicant: 'Applicant',
  AdmissionApplication: 'AdmissionApplication',
  AdmissionApplicationDocument: 'AdmissionApplicationDocument',
  AdmissionInterview: 'AdmissionInterview',
  AdmissionTest: 'AdmissionTest',
  AdmissionDecision: 'AdmissionDecision',
  AdmissionOffer: 'AdmissionOffer',
  AdmissionConfirmation: 'AdmissionConfirmation',
  Library: 'Library',
  LibraryCategory: 'LibraryCategory',
  LibraryAuthor: 'LibraryAuthor',
  LibraryPublisher: 'LibraryPublisher',
  LibraryBook: 'LibraryBook',
  LibraryBookCopy: 'LibraryBookCopy',
  LibraryMember: 'LibraryMember',
  LibraryLoan: 'LibraryLoan',
  LibraryReservation: 'LibraryReservation',
  LibraryFine: 'LibraryFine',
  LibraryPolicy: 'LibraryPolicy',
  TransportFacility: 'TransportFacility',
  TransportRoute: 'TransportRoute',
  TransportStop: 'TransportStop',
  TransportVehicle: 'TransportVehicle',
  TransportDriver: 'TransportDriver',
  TransportAttendant: 'TransportAttendant',
  TransportRouteAssignment: 'TransportRouteAssignment',
  StudentTransportAssignment: 'StudentTransportAssignment',
  TransportPass: 'TransportPass',
  TransportIncident: 'TransportIncident',
  InventoryCategory: 'InventoryCategory',
  InventoryUnit: 'InventoryUnit',
  InventoryVendor: 'InventoryVendor',
  InventoryWarehouse: 'InventoryWarehouse',
  InventoryLocation: 'InventoryLocation',
  InventoryItem: 'InventoryItem',
  InventoryStock: 'InventoryStock',
  InventoryStockLot: 'InventoryStockLot',
  InventoryStockMovement: 'InventoryStockMovement',
  InventoryPurchaseRequest: 'InventoryPurchaseRequest',
  InventoryPurchaseRequestItem: 'InventoryPurchaseRequestItem',
  InventoryPurchaseOrder: 'InventoryPurchaseOrder',
  InventoryPurchaseOrderItem: 'InventoryPurchaseOrderItem',
  InventoryReceipt: 'InventoryReceipt',
  InventoryReceiptItem: 'InventoryReceiptItem',
  InventoryIssue: 'InventoryIssue',
  InventoryIssueItem: 'InventoryIssueItem',
  InventoryTransfer: 'InventoryTransfer',
  InventoryTransferItem: 'InventoryTransferItem',
  InventoryAdjustment: 'InventoryAdjustment',
  InventoryAdjustmentItem: 'InventoryAdjustmentItem',
  InventoryReservation: 'InventoryReservation',
  InventoryReorderRule: 'InventoryReorderRule',
  InventoryValuationSnapshot: 'InventoryValuationSnapshot',
  AssetCategory: 'AssetCategory',
  Asset: 'Asset',
  AssetComponent: 'AssetComponent',
  AssetAssignment: 'AssetAssignment',
  AssetTransfer: 'AssetTransfer',
  AssetReturn: 'AssetReturn',
  AssetMaintenance: 'AssetMaintenance',
  AssetDisposal: 'AssetDisposal',
  AssetDepreciation: 'AssetDepreciation',
  HRDepartment: 'HRDepartment',
  HRDesignation: 'HRDesignation',
  HRWorkLocation: 'HRWorkLocation',
  HREmployment: 'HREmployment',
  HREmploymentHistory: 'HREmploymentHistory',
  HREmploymentContract: 'HREmploymentContract',
  HRHolidayCalendar: 'HRHolidayCalendar',
  HRHoliday: 'HRHoliday',
  HRLeaveType: 'HRLeaveType',
  HRLeaveBalance: 'HRLeaveBalance',
  HRLeaveRequest: 'HRLeaveRequest',
  HRWorkSchedule: 'HRWorkSchedule',
  HREmployeeDocument: 'HREmployeeDocument',
  SalaryComponent: 'SalaryComponent',
  SalaryStructure: 'SalaryStructure',
  SalaryStructureItem: 'SalaryStructureItem',
  EmployeeCompensation: 'EmployeeCompensation',
  EmployeeCompensationItem: 'EmployeeCompensationItem',
  PayrollPeriod: 'PayrollPeriod',
  PayrollRun: 'PayrollRun',
  PayrollCalculation: 'PayrollCalculation',
  Payslip: 'Payslip',
  PayrollAdjustment: 'PayrollAdjustment',
  PayrollAccountingPosting: 'PayrollAccountingPosting'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
