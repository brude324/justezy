import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
  ScopeAccessDeniedError,
} from "@/lib/errors";
import { outboxService } from "./outbox-service";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreateSessionInput {
  tenantId: string;
  academicYearId: string;
  name: string;
  code: string;
  startDate: Date;
  endDate: Date;
  metadataJson?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateSourceInput {
  tenantId: string;
  name: string;
  sourceType?:
    | "WALK_IN"
    | "WEBSITE"
    | "REFERRAL"
    | "SOCIAL_MEDIA"
    | "EVENT"
    | "EDUCATION_FAIR"
    | "CAMPAIGN"
    | "OTHER";
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateEnquiryInput {
  tenantId: string;
  prospectiveStudentName: string;
  prospectiveGender?: "MALE" | "FEMALE" | "OTHER";
  prospectiveDob?: Date;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail?: string;
  primaryContactRelation?: string;
  address?: string;
  interestedGradeId?: string;
  sourceId?: string;
  sessionId?: string;
  notes?: string;
  ownerUserId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateEnquiryInput {
  id: string;
  tenantId: string;
  prospectiveStudentName?: string;
  prospectiveGender?: "MALE" | "FEMALE" | "OTHER";
  prospectiveDob?: Date;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  primaryContactRelation?: string;
  address?: string;
  interestedGradeId?: string;
  sourceId?: string;
  sessionId?: string;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ListEnquiriesFilter {
  tenantId: string;
  status?: "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST" | "CLOSED";
  sessionId?: string;
  sourceId?: string;
  ownerUserId?: string;
  interestedGradeId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DetectDuplicatesInput {
  tenantId: string;
  fullName: string;
  dateOfBirth: Date;
  guardianPhone: string;
  maskedNationalId?: string;
}

export interface DuplicateDetectionResult {
  matchLevel: "EXACT_MATCH" | "POSSIBLE_MATCH" | "NO_MATCH";
  reason?: string;
  matches: Array<{
    id: string;
    type: "APPLICANT" | "STUDENT";
    fullName: string;
    dateOfBirth: Date;
    guardianPhone?: string;
    admissionNumber?: string;
  }>;
}

export interface CreateApplicantInput {
  tenantId: string;
  enquiryId?: string;
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: Date;
  bloodGroup?: any;
  primaryPhone: string;
  email?: string;
  address?: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  guardianRelationship?: any;
  maskedNationalId?: string;
  forceCreateIfDuplicate?: boolean;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateApplicationInput {
  tenantId: string;
  sessionId: string;
  applicantId: string;
  gradeId: string;
  requestedClassId?: string;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ListApplicationsFilter {
  tenantId: string;
  sessionId?: string;
  gradeId?: string;
  status?:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "DOCUMENTS_PENDING"
    | "DOCUMENTS_VERIFIED"
    | "INTERVIEW_PENDING"
    | "TEST_PENDING"
    | "DECISION_PENDING"
    | "APPROVED"
    | "REJECTED"
    | "WAITLISTED"
    | "OFFERED"
    | "CONFIRMED"
    | "ADMITTED"
    | "CANCELLED";
  reviewerUserId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AttachDocumentInput {
  tenantId: string;
  applicationId: string;
  documentReferenceId: string;
  documentType: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ScheduleInterviewInput {
  tenantId: string;
  applicationId: string;
  scheduledDateTime: Date;
  interviewerUserId?: string;
  mode?: string;
  location?: string;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ScheduleTestInput {
  tenantId: string;
  applicationId: string;
  testType: string;
  scheduledDateTime: Date;
  maxScore?: number | string | Decimal;
  passScore?: number | string | Decimal;
  evaluatorUserId?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface RecordDecisionInput {
  tenantId: string;
  applicationId: string;
  decision: "APPROVED" | "REJECTED" | "WAITLISTED";
  reason?: string;
  notes?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface IssueOfferInput {
  tenantId: string;
  applicationId: string;
  offeredGradeId: string;
  offeredClassId?: string;
  expiryDate: Date;
  termsMetadataJson?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ConfirmAdmissionInput {
  tenantId: string;
  applicationId: string;
  financialReference?: string;
  notes?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface AdmitStudentInput {
  tenantId: string;
  applicationId: string;
  classId?: string;
  rollNumber?: number;
  actorUserId: string;
  actorEmail?: string;
}

// ============================================================================
// ADMISSIONS DOMAIN SERVICE
// ============================================================================

export class AdmissionsService {
  // --------------------------------------------------------------------------
  // SESSIONS & SOURCES
  // --------------------------------------------------------------------------

  async createSession(input: CreateSessionInput, db = prismaTarget) {
    const code = input.code.toUpperCase().trim();

    const existing = await db.admissionSession.findUnique({
      where: {
        tenantId_code: {
          tenantId: input.tenantId,
          code,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Admission session with code '${code}' already exists`);
    }

    // Verify academic year belongs to tenant
    const academicYear = await db.academicYear.findFirst({
      where: { id: input.academicYearId, tenantId: input.tenantId },
    });
    if (!academicYear) {
      throw new NotFoundError("Academic year not found in this institution");
    }

    return await db.$transaction(async (tx) => {
      const session = await tx.admissionSession.create({
        data: {
          tenantId: input.tenantId,
          academicYearId: input.academicYearId,
          name: input.name.trim(),
          code,
          startDate: input.startDate,
          endDate: input.endDate,
          status: "OPEN",
          metadataJson: input.metadataJson,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ADMISSIONS",
          action: "ADMISSION_SESSION_CREATED",
          entityType: "AdmissionSession",
          entityId: session.id,
          diffJson: JSON.stringify({ code: session.code, name: session.name }),
        },
      });

      return session;
    });
  }

  async createSource(input: CreateSourceInput, db = prismaTarget) {
    const name = input.name.trim();

    const existing = await db.admissionSource.findUnique({
      where: {
        tenantId_name: {
          tenantId: input.tenantId,
          name,
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Admission source with name '${name}' already exists`);
    }

    return await db.admissionSource.create({
      data: {
        tenantId: input.tenantId,
        name,
        sourceType: input.sourceType || "WALK_IN",
        isActive: true,
      },
    });
  }

  // --------------------------------------------------------------------------
  // ENQUIRY CRM
  // --------------------------------------------------------------------------

  async createEnquiry(input: CreateEnquiryInput, db = prismaTarget) {
    const year = new Date().getFullYear();
    const count = await db.admissionEnquiry.count({
      where: { tenantId: input.tenantId },
    });
    const enquiryNumber = `ENQ-${year}-${String(count + 1).padStart(5, "0")}`;

    return await db.$transaction(async (tx) => {
      const enquiry = await tx.admissionEnquiry.create({
        data: {
          tenantId: input.tenantId,
          enquiryNumber,
          prospectiveStudentName: input.prospectiveStudentName.trim(),
          prospectiveGender: input.prospectiveGender,
          prospectiveDob: input.prospectiveDob,
          primaryContactName: input.primaryContactName.trim(),
          primaryContactPhone: input.primaryContactPhone.trim(),
          primaryContactEmail: input.primaryContactEmail?.trim().toLowerCase(),
          primaryContactRelation: input.primaryContactRelation,
          address: input.address,
          interestedGradeId: input.interestedGradeId,
          sourceId: input.sourceId,
          sessionId: input.sessionId,
          notes: input.notes,
          ownerUserId: input.ownerUserId,
          assignedAt: input.ownerUserId ? new Date() : undefined,
          status: "NEW",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ADMISSIONS",
          action: "ENQUIRY_CREATED",
          entityType: "AdmissionEnquiry",
          entityId: enquiry.id,
          diffJson: JSON.stringify({
            enquiryNumber: enquiry.enquiryNumber,
            prospectiveStudentName: enquiry.prospectiveStudentName,
            contactPhone: enquiry.primaryContactPhone,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "admissions.enquiry.created",
        aggregateType: "AdmissionEnquiry",
        aggregateId: enquiry.id,
        payload: {
          enquiryId: enquiry.id,
          enquiryNumber: enquiry.enquiryNumber,
          prospectiveStudentName: enquiry.prospectiveStudentName,
        },
      });

      return enquiry;
    });
  }

  async updateEnquiry(input: UpdateEnquiryInput, db = prismaTarget) {
    const enquiry = await db.admissionEnquiry.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });
    if (!enquiry) {
      throw new NotFoundError("Admission enquiry not found in this institution");
    }

    if (enquiry.status === "CLOSED" || enquiry.status === "CONVERTED") {
      throw new ValidationError(`Cannot update enquiry in ${enquiry.status} state`);
    }

    return await db.admissionEnquiry.update({
      where: { id: input.id },
      data: {
        prospectiveStudentName: input.prospectiveStudentName?.trim(),
        prospectiveGender: input.prospectiveGender,
        prospectiveDob: input.prospectiveDob,
        primaryContactName: input.primaryContactName?.trim(),
        primaryContactPhone: input.primaryContactPhone?.trim(),
        primaryContactEmail: input.primaryContactEmail?.trim().toLowerCase(),
        primaryContactRelation: input.primaryContactRelation,
        address: input.address,
        interestedGradeId: input.interestedGradeId,
        sourceId: input.sourceId,
        sessionId: input.sessionId,
        notes: input.notes,
      },
    });
  }

  async assignEnquiry(
    tenantId: string,
    enquiryId: string,
    ownerUserId: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const enquiry = await db.admissionEnquiry.findFirst({
      where: { id: enquiryId, tenantId },
    });
    if (!enquiry) {
      throw new NotFoundError("Admission enquiry not found in this institution");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.admissionEnquiry.update({
        where: { id: enquiryId },
        data: {
          ownerUserId,
          assignedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "ENQUIRY_ASSIGNED",
          entityType: "AdmissionEnquiry",
          entityId: enquiryId,
          diffJson: JSON.stringify({ ownerUserId }),
        },
      });

      return updated;
    });
  }

  async updateEnquiryStatus(
    tenantId: string,
    enquiryId: string,
    status: "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST" | "CLOSED",
    lostReason?: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const enquiry = await db.admissionEnquiry.findFirst({
      where: { id: enquiryId, tenantId },
    });
    if (!enquiry) {
      throw new NotFoundError("Admission enquiry not found in this institution");
    }

    if (enquiry.status === "CONVERTED" && status !== "CONVERTED") {
      throw new ValidationError("Converted enquiry cannot be transitioned to another status");
    }

    // State machine check
    const allowedTransitions: Record<string, string[]> = {
      NEW: ["CONTACTED", "QUALIFIED", "LOST", "CLOSED"],
      CONTACTED: ["QUALIFIED", "CONVERTED", "LOST", "CLOSED"],
      QUALIFIED: ["CONVERTED", "LOST", "CLOSED"],
      LOST: ["CONTACTED", "QUALIFIED", "CLOSED"],
      CLOSED: ["NEW", "CONTACTED"],
    };

    if (enquiry.status !== status && !allowedTransitions[enquiry.status]?.includes(status)) {
      throw new ValidationError(
        `Invalid enquiry state transition from '${enquiry.status}' to '${status}'`
      );
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.admissionEnquiry.update({
        where: { id: enquiryId },
        data: {
          status,
          lostReason: status === "LOST" ? lostReason : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "ENQUIRY_STATUS_UPDATED",
          entityType: "AdmissionEnquiry",
          entityId: enquiryId,
          diffJson: JSON.stringify({ oldStatus: enquiry.status, newStatus: status, lostReason }),
        },
      });

      return updated;
    });
  }

  async listEnquiries(filter: ListEnquiriesFilter, db = prismaTarget) {
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: filter.tenantId,
    };

    if (filter.status) where.status = filter.status;
    if (filter.sessionId) where.sessionId = filter.sessionId;
    if (filter.sourceId) where.sourceId = filter.sourceId;
    if (filter.ownerUserId) where.ownerUserId = filter.ownerUserId;
    if (filter.interestedGradeId) where.interestedGradeId = filter.interestedGradeId;

    if (filter.search) {
      where.OR = [
        { enquiryNumber: { contains: filter.search, mode: "insensitive" } },
        { prospectiveStudentName: { contains: filter.search, mode: "insensitive" } },
        { primaryContactPhone: { contains: filter.search } },
      ];
    }

    const [items, totalCount] = await Promise.all([
      db.admissionEnquiry.findMany({
        where,
        include: {
          source: true,
          session: true,
          interestedGrade: true,
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.admissionEnquiry.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  async getEnquiryById(tenantId: string, enquiryId: string, db = prismaTarget) {
    const enquiry = await db.admissionEnquiry.findFirst({
      where: { id: enquiryId, tenantId },
      include: {
        source: true,
        session: true,
        interestedGrade: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        applicants: true,
      },
    });
    if (!enquiry) {
      throw new NotFoundError("Admission enquiry not found in this institution");
    }
    return enquiry;
  }

  // --------------------------------------------------------------------------
  // DUPLICATE DETECTION & APPLICANT MANAGEMENT
  // --------------------------------------------------------------------------

  async detectDuplicates(input: DetectDuplicatesInput, db = prismaTarget): Promise<DuplicateDetectionResult> {
    const normalizedName = input.fullName.toLowerCase().trim().replace(/\s+/g, " ");
    const cleanPhone = (p: string) => {
      const digits = (p || "").replace(/\D/g, "");
      return digits.length > 10 ? digits.slice(-10) : digits;
    };
    const guardianPhoneClean = cleanPhone(input.guardianPhone);

    // 1. Check existing applicants in this tenant
    const applicants = await db.applicant.findMany({
      where: { tenantId: input.tenantId },
    });

    const matchingApplicants = applicants.filter((app) => {
      const appName = app.fullName.toLowerCase().trim().replace(/\s+/g, " ");
      const appPhone = cleanPhone(app.guardianPhone);
      const appDob = app.dateOfBirth.toISOString().split("T")[0];
      const inputDob = input.dateOfBirth.toISOString().split("T")[0];

      // Exact match: Name + DOB + GuardianPhone OR matching national ID
      if (input.maskedNationalId && app.maskedNationalId === input.maskedNationalId) {
        return true;
      }
      if (appName === normalizedName && appDob === inputDob && appPhone === guardianPhoneClean) {
        return true;
      }
      return false;
    });

    if (matchingApplicants.length > 0) {
      return {
        matchLevel: "EXACT_MATCH",
        reason: `Exact duplicate applicant found matching name, date of birth, and guardian phone (${matchingApplicants[0].applicantNumber})`,
        matches: matchingApplicants.map((m) => ({
          id: m.id,
          type: "APPLICANT",
          fullName: m.fullName,
          dateOfBirth: m.dateOfBirth,
          guardianPhone: m.guardianPhone,
          admissionNumber: m.applicantNumber,
        })),
      };
    }

    // Check existing enrolled students in this tenant
    const students = await db.studentProfile.findMany({
      where: { tenantId: input.tenantId },
    });

    const matchingStudents = students.filter((stu) => {
      const stuName = stu.fullName.toLowerCase().trim().replace(/\s+/g, " ");
      const stuDob = stu.dateOfBirth.toISOString().split("T")[0];
      const inputDob = input.dateOfBirth.toISOString().split("T")[0];

      return stuName === normalizedName && stuDob === inputDob;
    });

    if (matchingStudents.length > 0) {
      return {
        matchLevel: "EXACT_MATCH",
        reason: `Exact match found with currently enrolled student (${matchingStudents[0].admissionNumber})`,
        matches: matchingStudents.map((s) => ({
          id: s.id,
          type: "STUDENT",
          fullName: s.fullName,
          dateOfBirth: s.dateOfBirth,
          admissionNumber: s.admissionNumber,
        })),
      };
    }

    // Check possible duplicates (Name + DOB only, or Name + Guardian Phone only)
    const possibleApplicants = applicants.filter((app) => {
      const appName = app.fullName.toLowerCase().trim().replace(/\s+/g, " ");
      const appPhone = app.guardianPhone.replace(/\D/g, "");
      const appDob = app.dateOfBirth.toISOString().split("T")[0];
      const inputDob = input.dateOfBirth.toISOString().split("T")[0];

      return (
        (appName === normalizedName && appDob === inputDob) ||
        (appName === normalizedName && appPhone === guardianPhoneClean)
      );
    });

    if (possibleApplicants.length > 0) {
      return {
        matchLevel: "POSSIBLE_MATCH",
        reason: `Possible duplicate applicant with matching name and partial contact details (${possibleApplicants[0].applicantNumber})`,
        matches: possibleApplicants.map((m) => ({
          id: m.id,
          type: "APPLICANT",
          fullName: m.fullName,
          dateOfBirth: m.dateOfBirth,
          guardianPhone: m.guardianPhone,
          admissionNumber: m.applicantNumber,
        })),
      };
    }

    return {
      matchLevel: "NO_MATCH",
      matches: [],
    };
  }

  async createApplicant(input: CreateApplicantInput, db = prismaTarget) {
    const dupCheck = await this.detectDuplicates(
      {
        tenantId: input.tenantId,
        fullName: input.fullName,
        dateOfBirth: input.dateOfBirth,
        guardianPhone: input.guardianPhone,
        maskedNationalId: input.maskedNationalId,
      },
      db
    );

    if (dupCheck.matchLevel === "EXACT_MATCH") {
      throw new ConflictError(dupCheck.reason || "Exact duplicate applicant already exists");
    }

    let status: "ACTIVE" | "DUPLICATE_FLAGGED" = "ACTIVE";
    let duplicateMatchId: string | undefined = undefined;
    let duplicateNotes: string | undefined = undefined;

    if (dupCheck.matchLevel === "POSSIBLE_MATCH") {
      if (!input.forceCreateIfDuplicate) {
        status = "DUPLICATE_FLAGGED";
        duplicateMatchId = dupCheck.matches[0]?.id;
        duplicateNotes = dupCheck.reason;
      }
    }

    const year = new Date().getFullYear();
    const count = await db.applicant.count({
      where: { tenantId: input.tenantId },
    });
    const applicantNumber = `APP-${year}-${String(count + 1).padStart(5, "0")}`;

    return await db.$transaction(async (tx) => {
      const applicant = await tx.applicant.create({
        data: {
          tenantId: input.tenantId,
          applicantNumber,
          enquiryId: input.enquiryId,
          fullName: input.fullName.trim(),
          gender: input.gender,
          dateOfBirth: input.dateOfBirth,
          bloodGroup: input.bloodGroup || "UNKNOWN",
          primaryPhone: input.primaryPhone.trim(),
          email: input.email?.trim().toLowerCase(),
          address: input.address,
          guardianName: input.guardianName.trim(),
          guardianPhone: input.guardianPhone.trim(),
          guardianEmail: input.guardianEmail?.trim().toLowerCase(),
          guardianRelationship: input.guardianRelationship || "LEGAL_GUARDIAN",
          maskedNationalId: input.maskedNationalId,
          status,
          duplicateMatchId,
          duplicateNotes,
        },
      });

      // If enquiry provided, mark it as CONVERTED and link applicant
      if (input.enquiryId) {
        await tx.admissionEnquiry.update({
          where: { id: input.enquiryId },
          data: {
            status: "CONVERTED",
            convertedAt: new Date(),
            convertedApplicantId: applicant.id,
          },
        });

        await outboxService.emitEvent(tx, {
          tenantId: input.tenantId,
          eventType: "admissions.enquiry.converted",
          aggregateType: "AdmissionEnquiry",
          aggregateId: input.enquiryId,
          payload: {
            enquiryId: input.enquiryId,
            applicantId: applicant.id,
            applicantNumber: applicant.applicantNumber,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ADMISSIONS",
          action: "APPLICANT_CREATED",
          entityType: "Applicant",
          entityId: applicant.id,
          diffJson: JSON.stringify({
            applicantNumber: applicant.applicantNumber,
            fullName: applicant.fullName,
            status: applicant.status,
          }),
        },
      });

      return applicant;
    });
  }

  // --------------------------------------------------------------------------
  // APPLICATION MANAGEMENT & STATE MACHINE
  // --------------------------------------------------------------------------

  async createApplication(input: CreateApplicationInput, db = prismaTarget) {
    // 1. Verify session
    const session = await db.admissionSession.findFirst({
      where: { id: input.sessionId, tenantId: input.tenantId },
    });
    if (!session) {
      throw new NotFoundError("Admission session not found in this institution");
    }
    if (session.status !== "OPEN") {
      throw new ValidationError(`Admission session is ${session.status.toLowerCase()} and cannot accept applications`);
    }

    // 2. Verify applicant
    const applicant = await db.applicant.findFirst({
      where: { id: input.applicantId, tenantId: input.tenantId },
    });
    if (!applicant) {
      throw new NotFoundError("Applicant not found in this institution");
    }

    // 3. Verify grade
    const grade = await db.grade.findFirst({
      where: { id: input.gradeId, tenantId: input.tenantId },
    });
    if (!grade) {
      throw new NotFoundError("Grade not found in this institution");
    }

    // 4. Verify class if requested
    if (input.requestedClassId) {
      const cls = await db.class.findFirst({
        where: { id: input.requestedClassId, tenantId: input.tenantId, gradeId: input.gradeId },
      });
      if (!cls) {
        throw new NotFoundError("Requested class does not belong to the selected grade in this institution");
      }
    }

    const year = new Date().getFullYear();
    const count = await db.admissionApplication.count({
      where: { tenantId: input.tenantId },
    });
    const applicationNumber = `APPL-${year}-${String(count + 1).padStart(5, "0")}`;

    return await db.$transaction(async (tx) => {
      const application = await tx.admissionApplication.create({
        data: {
          tenantId: input.tenantId,
          applicationNumber,
          sessionId: input.sessionId,
          applicantId: input.applicantId,
          gradeId: input.gradeId,
          requestedClassId: input.requestedClassId,
          notes: input.notes,
          status: "DRAFT",
        },
        include: {
          applicant: true,
          grade: true,
          session: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ADMISSIONS",
          action: "APPLICATION_CREATED",
          entityType: "AdmissionApplication",
          entityId: application.id,
          diffJson: JSON.stringify({
            applicationNumber: application.applicationNumber,
            applicantId: application.applicantId,
            gradeId: application.gradeId,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "admissions.application.created",
        aggregateType: "AdmissionApplication",
        aggregateId: application.id,
        payload: {
          applicationId: application.id,
          applicationNumber: application.applicationNumber,
          applicantId: application.applicantId,
        },
      });

      return application;
    });
  }

  async submitApplication(
    tenantId: string,
    applicationId: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const application = await db.admissionApplication.findFirst({
      where: { id: applicationId, tenantId },
    });
    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    if (application.status !== "DRAFT") {
      throw new ValidationError(`Cannot submit application in '${application.status}' state`);
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.admissionApplication.update({
        where: { id: applicationId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "APPLICATION_SUBMITTED",
          entityType: "AdmissionApplication",
          entityId: applicationId,
          diffJson: JSON.stringify({ status: "SUBMITTED" }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "admissions.application.submitted",
        aggregateType: "AdmissionApplication",
        aggregateId: applicationId,
        payload: {
          applicationId,
          applicationNumber: application.applicationNumber,
        },
      });

      return updated;
    });
  }

  async assignReviewer(
    tenantId: string,
    applicationId: string,
    reviewerUserId: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const application = await db.admissionApplication.findFirst({
      where: { id: applicationId, tenantId },
    });
    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.admissionApplication.update({
        where: { id: applicationId },
        data: {
          reviewerUserId,
          status: application.status === "SUBMITTED" ? "UNDER_REVIEW" : application.status,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "APPLICATION_REVIEWER_ASSIGNED",
          entityType: "AdmissionApplication",
          entityId: applicationId,
          diffJson: JSON.stringify({ reviewerUserId }),
        },
      });

      return updated;
    });
  }

  async transitionApplicationStatus(
    tenantId: string,
    applicationId: string,
    targetStatus:
      | "DRAFT"
      | "SUBMITTED"
      | "UNDER_REVIEW"
      | "DOCUMENTS_PENDING"
      | "DOCUMENTS_VERIFIED"
      | "INTERVIEW_PENDING"
      | "TEST_PENDING"
      | "DECISION_PENDING"
      | "APPROVED"
      | "REJECTED"
      | "WAITLISTED"
      | "OFFERED"
      | "CONFIRMED"
      | "ADMITTED"
      | "CANCELLED",
    reason?: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const application = await db.admissionApplication.findFirst({
      where: { id: applicationId, tenantId },
    });
    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    // Allowed transition matrix
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ["SUBMITTED", "CANCELLED"],
      SUBMITTED: ["UNDER_REVIEW", "DOCUMENTS_PENDING", "CANCELLED"],
      UNDER_REVIEW: [
        "DOCUMENTS_PENDING",
        "DOCUMENTS_VERIFIED",
        "INTERVIEW_PENDING",
        "TEST_PENDING",
        "DECISION_PENDING",
        "CANCELLED",
      ],
      DOCUMENTS_PENDING: ["DOCUMENTS_VERIFIED", "CANCELLED"],
      DOCUMENTS_VERIFIED: ["INTERVIEW_PENDING", "TEST_PENDING", "DECISION_PENDING", "CANCELLED"],
      INTERVIEW_PENDING: ["DECISION_PENDING", "CANCELLED"],
      TEST_PENDING: ["DECISION_PENDING", "CANCELLED"],
      DECISION_PENDING: ["APPROVED", "REJECTED", "WAITLISTED", "CANCELLED"],
      WAITLISTED: ["APPROVED", "REJECTED", "CANCELLED"],
      APPROVED: ["OFFERED", "CONFIRMED", "CANCELLED"],
      OFFERED: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["ADMITTED", "CANCELLED"],
      ADMITTED: [], // Terminal
      REJECTED: [], // Terminal
      CANCELLED: [], // Terminal
    };

    if (
      application.status !== targetStatus &&
      !allowedTransitions[application.status]?.includes(targetStatus)
    ) {
      throw new ValidationError(
        `Invalid application state transition from '${application.status}' to '${targetStatus}'`
      );
    }

    return await db.$transaction(async (tx) => {
      const updateData: any = { status: targetStatus };
      if (targetStatus === "REJECTED") updateData.rejectionReason = reason;
      if (targetStatus === "CANCELLED") updateData.cancellationReason = reason;

      const updated = await tx.admissionApplication.update({
        where: { id: applicationId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "APPLICATION_STATUS_TRANSITIONED",
          entityType: "AdmissionApplication",
          entityId: applicationId,
          diffJson: JSON.stringify({
            oldStatus: application.status,
            newStatus: targetStatus,
            reason,
          }),
        },
      });

      return updated;
    });
  }

  async listApplications(filter: ListApplicationsFilter, db = prismaTarget) {
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: filter.tenantId,
    };

    if (filter.status) where.status = filter.status;
    if (filter.sessionId) where.sessionId = filter.sessionId;
    if (filter.gradeId) where.gradeId = filter.gradeId;
    if (filter.reviewerUserId) where.reviewerUserId = filter.reviewerUserId;

    if (filter.search) {
      where.OR = [
        { applicationNumber: { contains: filter.search, mode: "insensitive" } },
        { applicant: { fullName: { contains: filter.search, mode: "insensitive" } } },
        { applicant: { guardianPhone: { contains: filter.search } } },
      ];
    }

    const [items, totalCount] = await Promise.all([
      db.admissionApplication.findMany({
        where,
        include: {
          applicant: true,
          grade: true,
          requestedClass: true,
          session: true,
          reviewer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          documents: true,
          interviews: true,
          tests: true,
          decisions: true,
          offers: true,
          confirmations: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.admissionApplication.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  async getApplicationById(tenantId: string, applicationId: string, db = prismaTarget) {
    const application = await db.admissionApplication.findFirst({
      where: { id: applicationId, tenantId },
      include: {
        applicant: true,
        grade: true,
        requestedClass: true,
        session: true,
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        documents: {
          include: {
            documentReference: true,
            verifiedByUser: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        interviews: {
          include: {
            interviewer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tests: {
          include: {
            evaluator: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        decisions: {
          include: {
            decidedByUser: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        offers: {
          include: {
            offeredGrade: true,
            offeredClass: true,
          },
        },
        confirmations: {
          include: {
            confirmedByUser: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        studentProfile: true,
      },
    });

    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    return application;
  }

  // --------------------------------------------------------------------------
  // DOCUMENT VERIFICATION
  // --------------------------------------------------------------------------

  async attachDocument(input: AttachDocumentInput, db = prismaTarget) {
    // Verify application
    const application = await db.admissionApplication.findFirst({
      where: { id: input.applicationId, tenantId: input.tenantId },
    });
    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    // Verify documentReference belongs to tenant
    const docRef = await db.documentReference.findFirst({
      where: { id: input.documentReferenceId, tenantId: input.tenantId },
    });
    if (!docRef) {
      throw new NotFoundError("Document reference not found in this institution");
    }

    return await db.admissionApplicationDocument.create({
      data: {
        tenantId: input.tenantId,
        applicationId: input.applicationId,
        documentReferenceId: input.documentReferenceId,
        documentType: input.documentType,
        verificationStatus: "PENDING",
      },
    });
  }

  async verifyDocument(
    tenantId: string,
    applicationDocumentId: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const doc = await db.admissionApplicationDocument.findFirst({
      where: { id: applicationDocumentId, tenantId },
    });
    if (!doc) {
      throw new NotFoundError("Application document not found in this institution");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.admissionApplicationDocument.update({
        where: { id: applicationDocumentId },
        data: {
          verificationStatus: "VERIFIED",
          verifiedByUserId: actorUserId,
          verifiedAt: new Date(),
          rejectionReason: null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "DOCUMENT_VERIFIED",
          entityType: "AdmissionApplicationDocument",
          entityId: applicationDocumentId,
          diffJson: JSON.stringify({ verificationStatus: "VERIFIED" }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "admissions.document.verified",
        aggregateType: "AdmissionApplicationDocument",
        aggregateId: applicationDocumentId,
        payload: {
          documentId: applicationDocumentId,
          applicationId: doc.applicationId,
          documentType: doc.documentType,
        },
      });

      return updated;
    });
  }

  async rejectDocument(
    tenantId: string,
    applicationDocumentId: string,
    rejectionReason: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new ValidationError("Rejection reason is required when rejecting a document");
    }

    const doc = await db.admissionApplicationDocument.findFirst({
      where: { id: applicationDocumentId, tenantId },
    });
    if (!doc) {
      throw new NotFoundError("Application document not found in this institution");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.admissionApplicationDocument.update({
        where: { id: applicationDocumentId },
        data: {
          verificationStatus: "REJECTED",
          verifiedByUserId: actorUserId,
          verifiedAt: new Date(),
          rejectionReason: rejectionReason.trim(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "DOCUMENT_REJECTED",
          entityType: "AdmissionApplicationDocument",
          entityId: applicationDocumentId,
          diffJson: JSON.stringify({
            verificationStatus: "REJECTED",
            rejectionReason: rejectionReason.trim(),
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "admissions.document.rejected",
        aggregateType: "AdmissionApplicationDocument",
        aggregateId: applicationDocumentId,
        payload: {
          documentId: applicationDocumentId,
          applicationId: doc.applicationId,
          rejectionReason: rejectionReason.trim(),
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // INTERVIEWS & TESTS
  // --------------------------------------------------------------------------

  async scheduleInterview(input: ScheduleInterviewInput, db = prismaTarget) {
    const application = await db.admissionApplication.findFirst({
      where: { id: input.applicationId, tenantId: input.tenantId },
    });
    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    return await db.$transaction(async (tx) => {
      const interview = await tx.admissionInterview.create({
        data: {
          tenantId: input.tenantId,
          applicationId: input.applicationId,
          scheduledDateTime: input.scheduledDateTime,
          interviewerUserId: input.interviewerUserId,
          mode: input.mode || "IN_PERSON",
          location: input.location,
          notes: input.notes,
          status: "SCHEDULED",
          result: "PENDING",
        },
      });

      // Update application status to INTERVIEW_PENDING if currently under review
      if (application.status === "UNDER_REVIEW" || application.status === "DOCUMENTS_VERIFIED") {
        await tx.admissionApplication.update({
          where: { id: input.applicationId },
          data: { status: "INTERVIEW_PENDING" },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ADMISSIONS",
          action: "INTERVIEW_SCHEDULED",
          entityType: "AdmissionInterview",
          entityId: interview.id,
          diffJson: JSON.stringify({
            scheduledDateTime: interview.scheduledDateTime,
            interviewerUserId: interview.interviewerUserId,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "admissions.interview.scheduled",
        aggregateType: "AdmissionInterview",
        aggregateId: interview.id,
        payload: {
          interviewId: interview.id,
          applicationId: input.applicationId,
          scheduledDateTime: interview.scheduledDateTime,
        },
      });

      return interview;
    });
  }

  async recordInterviewResult(
    tenantId: string,
    interviewId: string,
    result: "RECOMMENDED" | "NOT_RECOMMENDED" | "CONDITIONAL",
    score?: number | string | Decimal,
    notes?: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const interview = await db.admissionInterview.findFirst({
      where: { id: interviewId, tenantId },
    });
    if (!interview) {
      throw new NotFoundError("Admission interview not found in this institution");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.admissionInterview.update({
        where: { id: interviewId },
        data: {
          status: "COMPLETED",
          result,
          score: score !== undefined ? new Decimal(score) : undefined,
          notes: notes || interview.notes,
          completedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "INTERVIEW_RESULT_RECORDED",
          entityType: "AdmissionInterview",
          entityId: interviewId,
          diffJson: JSON.stringify({ result, score }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "admissions.interview.completed",
        aggregateType: "AdmissionInterview",
        aggregateId: interviewId,
        payload: {
          interviewId,
          applicationId: interview.applicationId,
          result,
          score,
        },
      });

      return updated;
    });
  }

  async scheduleTest(input: ScheduleTestInput, db = prismaTarget) {
    const application = await db.admissionApplication.findFirst({
      where: { id: input.applicationId, tenantId: input.tenantId },
    });
    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    return await db.$transaction(async (tx) => {
      const test = await tx.admissionTest.create({
        data: {
          tenantId: input.tenantId,
          applicationId: input.applicationId,
          testType: input.testType,
          scheduledDateTime: input.scheduledDateTime,
          maxScore: input.maxScore !== undefined ? new Decimal(input.maxScore) : new Decimal(100.0),
          passScore: input.passScore !== undefined ? new Decimal(input.passScore) : new Decimal(40.0),
          evaluatorUserId: input.evaluatorUserId,
          status: "SCHEDULED",
          result: "PENDING",
        },
      });

      if (application.status === "UNDER_REVIEW" || application.status === "DOCUMENTS_VERIFIED") {
        await tx.admissionApplication.update({
          where: { id: input.applicationId },
          data: { status: "TEST_PENDING" },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ADMISSIONS",
          action: "TEST_SCHEDULED",
          entityType: "AdmissionTest",
          entityId: test.id,
          diffJson: JSON.stringify({
            testType: test.testType,
            scheduledDateTime: test.scheduledDateTime,
          }),
        },
      });

      return test;
    });
  }

  async recordTestResult(
    tenantId: string,
    testId: string,
    score: number | string | Decimal,
    remarks?: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const test = await db.admissionTest.findFirst({
      where: { id: testId, tenantId },
    });
    if (!test) {
      throw new NotFoundError("Admission test not found in this institution");
    }

    const scoreDec = new Decimal(score);
    const result: "PASSED" | "FAILED" = scoreDec.greaterThanOrEqualTo(test.passScore)
      ? "PASSED"
      : "FAILED";

    return await db.$transaction(async (tx) => {
      const updated = await tx.admissionTest.update({
        where: { id: testId },
        data: {
          status: "COMPLETED",
          result,
          score: scoreDec,
          remarks,
          completedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "TEST_RESULT_RECORDED",
          entityType: "AdmissionTest",
          entityId: testId,
          diffJson: JSON.stringify({ score: scoreDec.toString(), result }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "admissions.test.completed",
        aggregateType: "AdmissionTest",
        aggregateId: testId,
        payload: {
          testId,
          applicationId: test.applicationId,
          score: scoreDec.toString(),
          result,
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // DECISION & OFFER
  // --------------------------------------------------------------------------

  async recordDecision(input: RecordDecisionInput, db = prismaTarget) {
    const application = await db.admissionApplication.findFirst({
      where: { id: input.applicationId, tenantId: input.tenantId },
    });
    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    const eligibleStates = [
      "DECISION_PENDING",
      "UNDER_REVIEW",
      "DOCUMENTS_VERIFIED",
      "WAITLISTED",
      "SUBMITTED",
    ];
    if (!eligibleStates.includes(application.status)) {
      throw new ValidationError(
        `Cannot make admission decision on application in '${application.status}' state`
      );
    }

    return await db.$transaction(async (tx) => {
      const decision = await tx.admissionDecision.create({
        data: {
          tenantId: input.tenantId,
          applicationId: input.applicationId,
          decision: input.decision,
          reason: input.reason,
          notes: input.notes,
          decidedByUserId: input.actorUserId,
          decidedAt: new Date(),
        },
      });

      await tx.admissionApplication.update({
        where: { id: input.applicationId },
        data: {
          status: input.decision,
          decisionAt: new Date(),
          rejectionReason: input.decision === "REJECTED" ? input.reason : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ADMISSIONS",
          action: "ADMISSION_DECISION_RECORDED",
          entityType: "AdmissionDecision",
          entityId: decision.id,
          diffJson: JSON.stringify({ decision: input.decision, reason: input.reason }),
        },
      });

      const eventType =
        input.decision === "APPROVED"
          ? "admissions.application.approved"
          : input.decision === "REJECTED"
          ? "admissions.application.rejected"
          : "admissions.application.waitlisted";

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType,
        aggregateType: "AdmissionApplication",
        aggregateId: input.applicationId,
        payload: {
          applicationId: input.applicationId,
          decision: input.decision,
          reason: input.reason,
        },
      });

      return decision;
    });
  }

  async issueOffer(input: IssueOfferInput, db = prismaTarget) {
    const application = await db.admissionApplication.findFirst({
      where: { id: input.applicationId, tenantId: input.tenantId },
    });
    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    if (application.status !== "APPROVED" && application.status !== "OFFERED") {
      throw new ValidationError(
        `Cannot issue offer to application in '${application.status}' state. Must be 'APPROVED'.`
      );
    }

    // Verify offered grade
    const grade = await db.grade.findFirst({
      where: { id: input.offeredGradeId, tenantId: input.tenantId },
    });
    if (!grade) {
      throw new NotFoundError("Offered grade not found in this institution");
    }

    // Verify offered class if provided
    if (input.offeredClassId) {
      const cls = await db.class.findFirst({
        where: {
          id: input.offeredClassId,
          tenantId: input.tenantId,
          gradeId: input.offeredGradeId,
        },
      });
      if (!cls) {
        throw new NotFoundError("Offered class does not belong to the offered grade in this institution");
      }
    }

    const year = new Date().getFullYear();
    const count = await db.admissionOffer.count({
      where: { tenantId: input.tenantId },
    });
    const offerNumber = `OFR-${year}-${String(count + 1).padStart(5, "0")}`;

    return await db.$transaction(async (tx) => {
      const offer = await tx.admissionOffer.create({
        data: {
          tenantId: input.tenantId,
          applicationId: input.applicationId,
          offerNumber,
          offeredGradeId: input.offeredGradeId,
          offeredClassId: input.offeredClassId,
          issuedDate: new Date(),
          expiryDate: input.expiryDate,
          status: "ISSUED",
          termsMetadataJson: input.termsMetadataJson,
        },
      });

      await tx.admissionApplication.update({
        where: { id: input.applicationId },
        data: { status: "OFFERED" },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ADMISSIONS",
          action: "OFFER_ISSUED",
          entityType: "AdmissionOffer",
          entityId: offer.id,
          diffJson: JSON.stringify({
            offerNumber: offer.offerNumber,
            offeredGradeId: offer.offeredGradeId,
            expiryDate: offer.expiryDate,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "admissions.offer.issued",
        aggregateType: "AdmissionOffer",
        aggregateId: offer.id,
        payload: {
          offerId: offer.id,
          offerNumber: offer.offerNumber,
          applicationId: input.applicationId,
          expiryDate: offer.expiryDate,
        },
      });

      return offer;
    });
  }

  async acceptOffer(
    tenantId: string,
    offerId: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const offer = await db.admissionOffer.findFirst({
      where: { id: offerId, tenantId },
    });
    if (!offer) {
      throw new NotFoundError("Admission offer not found in this institution");
    }

    // Idempotency: if already accepted, return it
    if (offer.status === "ACCEPTED") {
      return offer;
    }

    if (offer.status === "REJECTED" || offer.status === "REVOKED") {
      throw new ValidationError(`Cannot accept offer in '${offer.status}' state`);
    }

    // Check expiration
    if (offer.expiryDate < new Date()) {
      throw new ValidationError("Admission offer has expired and cannot be accepted without being reissued");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.admissionOffer.update({
        where: { id: offerId },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "OFFER_ACCEPTED",
          entityType: "AdmissionOffer",
          entityId: offerId,
          diffJson: JSON.stringify({ status: "ACCEPTED" }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId,
        eventType: "admissions.offer.accepted",
        aggregateType: "AdmissionOffer",
        aggregateId: offerId,
        payload: {
          offerId,
          offerNumber: offer.offerNumber,
          applicationId: offer.applicationId,
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // ADMISSION CONFIRMATION
  // --------------------------------------------------------------------------

  async confirmAdmission(input: ConfirmAdmissionInput, db = prismaTarget) {
    const application = await db.admissionApplication.findFirst({
      where: { id: input.applicationId, tenantId: input.tenantId },
      include: {
        documents: true,
        offers: true,
        confirmations: true,
      },
    });
    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    // Idempotency check: if confirmation already exists for this application
    if (application.confirmations.length > 0) {
      const activeConf = application.confirmations.find((c) => c.status === "CONFIRMED");
      if (activeConf) {
        return activeConf;
      }
    }

    // Prerequisite 1: Application approved or offered
    if (application.status !== "APPROVED" && application.status !== "OFFERED") {
      throw new ValidationError(
        `Cannot confirm admission for application in '${application.status}' status. Must be APPROVED or OFFERED.`
      );
    }

    // Prerequisite 2: If offers exist, at least one must be ACCEPTED and not expired
    if (application.offers.length > 0) {
      const hasValidAcceptedOffer = application.offers.some(
        (o) => o.status === "ACCEPTED" && o.expiryDate >= new Date()
      );
      if (!hasValidAcceptedOffer) {
        throw new ValidationError("An active, accepted admission offer is required to confirm admission");
      }
    }

    // Prerequisite 3: All attached documents must be VERIFIED
    const pendingOrRejectedDocs = application.documents.filter(
      (d) => d.verificationStatus !== "VERIFIED"
    );
    if (pendingOrRejectedDocs.length > 0) {
      throw new ValidationError(
        `Cannot confirm admission: ${pendingOrRejectedDocs.length} required document(s) are pending verification or rejected`
      );
    }

    const year = new Date().getFullYear();
    const count = await db.admissionConfirmation.count({
      where: { tenantId: input.tenantId },
    });
    const confirmationNumber = `CONF-${year}-${String(count + 1).padStart(5, "0")}`;

    return await db.$transaction(async (tx) => {
      const confirmation = await tx.admissionConfirmation.create({
        data: {
          tenantId: input.tenantId,
          applicationId: input.applicationId,
          confirmationNumber,
          confirmedAt: new Date(),
          confirmedByUserId: input.actorUserId,
          financialReference: input.financialReference,
          status: "CONFIRMED",
          notes: input.notes,
        },
      });

      await tx.admissionApplication.update({
        where: { id: input.applicationId },
        data: { status: "CONFIRMED" },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ADMISSIONS",
          action: "ADMISSION_CONFIRMED",
          entityType: "AdmissionConfirmation",
          entityId: confirmation.id,
          diffJson: JSON.stringify({
            confirmationNumber: confirmation.confirmationNumber,
            financialReference: input.financialReference,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "admissions.confirmation.completed",
        aggregateType: "AdmissionConfirmation",
        aggregateId: confirmation.id,
        payload: {
          confirmationId: confirmation.id,
          confirmationNumber: confirmation.confirmationNumber,
          applicationId: input.applicationId,
        },
      });

      return confirmation;
    });
  }

  // --------------------------------------------------------------------------
  // STUDENT CONVERSION (CRITICAL BOUNDARY)
  // --------------------------------------------------------------------------

  async admitStudent(input: AdmitStudentInput, db = prismaTarget) {
    const application = await db.admissionApplication.findFirst({
      where: { id: input.applicationId, tenantId: input.tenantId },
      include: {
        applicant: true,
        session: true,
        offers: true,
        studentProfile: true,
      },
    });

    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    // Idempotency: If already admitted, return existing student profile and enrollment
    if (application.status === "ADMITTED" && application.studentProfileId) {
      const existingStudent = await db.studentProfile.findUnique({
        where: { id: application.studentProfileId },
        include: {
          enrollments: true,
          guardians: { include: { parent: true } },
        },
      });
      if (existingStudent) {
        logger.info("AdmitStudent idempotent call: returning existing student profile", {
          tenantId: input.tenantId,
          applicationId: input.applicationId,
          studentId: existingStudent.id,
        });
        return existingStudent;
      }
    }

    if (application.status !== "CONFIRMED") {
      throw new ValidationError(
        `Cannot enroll student: Application is in '${application.status}' status. Admission must be CONFIRMED first.`
      );
    }

    // Determine target class
    const targetClassId =
      input.classId ||
      application.requestedClassId ||
      application.offers.find((o) => o.status === "ACCEPTED")?.offeredClassId;

    return await db.$transaction(async (tx) => {
      const applicant = application.applicant;

      // 1. Check for duplicate or existing student profile
      let student = await tx.studentProfile.findFirst({
        where: {
          tenantId: input.tenantId,
          fullName: applicant.fullName,
          dateOfBirth: applicant.dateOfBirth,
        },
      });

      if (!student) {
        const year = new Date().getFullYear();
        const studentCount = await tx.studentProfile.count({
          where: { tenantId: input.tenantId },
        });
        const admissionNumber = `ADM-${year}-${String(studentCount + 1).padStart(5, "0")}`;

        student = await tx.studentProfile.create({
          data: {
            tenantId: input.tenantId,
            admissionNumber,
            fullName: applicant.fullName,
            gender: applicant.gender,
            dateOfBirth: applicant.dateOfBirth,
            bloodGroup: applicant.bloodGroup,
            address: applicant.address,
            maskedNationalId: applicant.maskedNationalId,
            status: "ACTIVE",
            admissionDate: new Date(),
          },
        });
      }

      // 2. Student Enrollment
      if (targetClassId) {
        const existingEnrollment = await tx.studentEnrollment.findFirst({
          where: {
            tenantId: input.tenantId,
            studentId: student.id,
            academicYearId: application.session.academicYearId,
          },
        });

        if (!existingEnrollment) {
          let rollNumber = input.rollNumber;
          if (!rollNumber) {
            const count = await tx.studentEnrollment.count({
              where: {
                tenantId: input.tenantId,
                classId: targetClassId,
              },
            });
            rollNumber = count + 1;
          }

          await tx.studentEnrollment.create({
            data: {
              tenantId: input.tenantId,
              studentId: student.id,
              classId: targetClassId,
              academicYearId: application.session.academicYearId,
              rollNumber,
              status: "ACTIVE",
            },
          });
        }
      }

      // 3. Parent / Guardian handling: Reuse existing or create
      let parent = await tx.parentProfile.findUnique({
        where: {
          tenantId_primaryPhone: {
            tenantId: input.tenantId,
            primaryPhone: applicant.guardianPhone,
          },
        },
      });

      if (!parent) {
        parent = await tx.parentProfile.create({
          data: {
            tenantId: input.tenantId,
            fullName: applicant.guardianName,
            primaryPhone: applicant.guardianPhone,
            email: applicant.guardianEmail,
            address: applicant.address,
            isActive: true,
          },
        });
      }

      // 4. StudentParentBinding: Check existing binding
      const existingBinding = await tx.studentParentBinding.findUnique({
        where: {
          tenantId_studentId_parentId: {
            tenantId: input.tenantId,
            studentId: student.id,
            parentId: parent.id,
          },
        },
      });

      if (!existingBinding) {
        await tx.studentParentBinding.create({
          data: {
            tenantId: input.tenantId,
            studentId: student.id,
            parentId: parent.id,
            relationshipType: applicant.guardianRelationship || "LEGAL_GUARDIAN",
            isPrimaryContact: true,
            isFeePayer: true,
          },
        });
      }

      // 5. Update Applicant and Application
      await tx.applicant.update({
        where: { id: applicant.id },
        data: {
          studentProfileId: student.id,
          status: "CONVERTED",
        },
      });

      await tx.admissionApplication.update({
        where: { id: application.id },
        data: {
          studentProfileId: student.id,
          status: "ADMITTED",
        },
      });

      // 6. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "ADMISSIONS",
          action: "STUDENT_ADMITTED",
          entityType: "StudentProfile",
          entityId: student.id,
          diffJson: JSON.stringify({
            applicationId: application.id,
            admissionNumber: student.admissionNumber,
            fullName: student.fullName,
            classId: targetClassId,
          }),
        },
      });

      // 7. Domain Outbox Event
      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "admissions.student.admitted",
        aggregateType: "StudentProfile",
        aggregateId: student.id,
        payload: {
          studentId: student.id,
          admissionNumber: student.admissionNumber,
          applicationId: application.id,
          academicYearId: application.session.academicYearId,
          classId: targetClassId,
        },
      });

      logger.info("[Admissions] Applicant successfully converted to enrolled student", {
        tenantId: input.tenantId,
        applicationId: application.id,
        studentId: student.id,
        admissionNumber: student.admissionNumber,
      });

      return await tx.studentProfile.findUnique({
        where: { id: student.id },
        include: {
          enrollments: true,
          guardians: { include: { parent: true } },
        },
      });
    });
  }

  // --------------------------------------------------------------------------
  // FINANCIAL INTEGRATION VIA WAVE 1 BOUNDARY
  // --------------------------------------------------------------------------

  async attachFeeInvoice(
    tenantId: string,
    applicationId: string,
    feeInvoiceId: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const application = await db.admissionApplication.findFirst({
      where: { id: applicationId, tenantId },
    });
    if (!application) {
      throw new NotFoundError("Admission application not found in this institution");
    }

    // Verify invoice belongs to tenant
    const invoice = await db.feeInvoice.findFirst({
      where: { id: feeInvoiceId, tenantId },
    });
    if (!invoice) {
      throw new NotFoundError("Fee invoice not found in this institution");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.admissionApplication.update({
        where: { id: applicationId },
        data: { feeInvoiceId },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "ADMISSIONS",
          action: "APPLICATION_FEE_INVOICE_ATTACHED",
          entityType: "AdmissionApplication",
          entityId: applicationId,
          diffJson: JSON.stringify({ feeInvoiceId }),
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------------
  // OPERATIONAL CRM & FUNNEL REPORTING
  // --------------------------------------------------------------------------

  async getAdmissionsFunnel(tenantId: string, sessionId?: string, db = prismaTarget) {
    const whereEnquiry: any = { tenantId };
    const whereApp: any = { tenantId };
    if (sessionId) {
      whereEnquiry.sessionId = sessionId;
      whereApp.sessionId = sessionId;
    }

    const [
      totalEnquiries,
      enquiriesByStatus,
      enquiriesBySource,
      totalApplications,
      applicationsByStatus,
      applicationsByGrade,
      totalOffers,
      totalConfirmations,
      totalAdmitted,
    ] = await Promise.all([
      db.admissionEnquiry.count({ where: whereEnquiry }),
      db.admissionEnquiry.groupBy({
        by: ["status"],
        where: whereEnquiry,
        _count: { id: true },
      }),
      db.admissionEnquiry.groupBy({
        by: ["sourceId"],
        where: whereEnquiry,
        _count: { id: true },
      }),
      db.admissionApplication.count({ where: whereApp }),
      db.admissionApplication.groupBy({
        by: ["status"],
        where: whereApp,
        _count: { id: true },
      }),
      db.admissionApplication.groupBy({
        by: ["gradeId"],
        where: whereApp,
        _count: { id: true },
      }),
      db.admissionOffer.count({
        where: { tenantId, status: "ISSUED" },
      }),
      db.admissionConfirmation.count({
        where: { tenantId, status: "CONFIRMED" },
      }),
      db.admissionApplication.count({
        where: { ...whereApp, status: "ADMITTED" },
      }),
    ]);

    return {
      overview: {
        totalEnquiries,
        totalApplications,
        totalOffers,
        totalConfirmations,
        totalAdmitted,
        conversionRatePercent:
          totalEnquiries > 0
            ? Number(((totalAdmitted / totalEnquiries) * 100).toFixed(2))
            : 0,
      },
      enquiryBreakdown: {
        byStatus: enquiriesByStatus.map((s) => ({ status: s.status, count: s._count.id })),
        bySource: enquiriesBySource.map((s) => ({ sourceId: s.sourceId, count: s._count.id })),
      },
      applicationBreakdown: {
        byStatus: applicationsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
        byGrade: applicationsByGrade.map((g) => ({ gradeId: g.gradeId, count: g._count.id })),
      },
    };
  }
}

export const admissionsService = new AdmissionsService();
