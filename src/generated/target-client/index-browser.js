
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
  EXPORT: 'EXPORT'
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
  DocumentReference: 'DocumentReference'
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
