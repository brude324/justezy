import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdmissionsService } from "@/lib/services/admissions-service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("Admissions & Enquiry CRM Domain Lifecycle Tests", () => {
  let admissionsService: AdmissionsService;
  let mockDb: any;
  const tenantId = "tnt_dps_delhi";

  beforeEach(() => {
    admissionsService = new AdmissionsService();
    mockDb = {
      $transaction: vi.fn(async (cb) => cb(mockDb)),
      admissionSession: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      admissionSource: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      academicYear: {
        findFirst: vi.fn(),
      },
      grade: {
        findFirst: vi.fn(),
      },
      class: {
        findFirst: vi.fn(),
      },
      admissionEnquiry: {
        count: vi.fn().mockResolvedValue(5),
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      applicant: {
        count: vi.fn().mockResolvedValue(10),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      studentProfile: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        count: vi.fn().mockResolvedValue(100),
        create: vi.fn(),
        findUnique: vi.fn(),
      },
      admissionApplication: {
        count: vi.fn().mockResolvedValue(8),
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      documentReference: {
        findFirst: vi.fn(),
      },
      admissionApplicationDocument: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      admissionInterview: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      admissionTest: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      admissionDecision: {
        create: vi.fn(),
      },
      admissionOffer: {
        count: vi.fn().mockResolvedValue(2),
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      admissionConfirmation: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_mock" }),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "outbox_mock" }),
      },
    };
  });

  describe("Enquiry Lifecycle & CRM", () => {
    it("should successfully create a new prospective student enquiry and emit domain event", async () => {
      const createdEnquiry = {
        id: "enq_1",
        tenantId,
        enquiryNumber: "ENQ-2026-00006",
        prospectiveStudentName: "Aarav Sharma",
        primaryContactName: "Vikram Sharma",
        primaryContactPhone: "9876543210",
        status: "NEW",
      };
      mockDb.admissionEnquiry.create.mockResolvedValue(createdEnquiry);

      const result = await admissionsService.createEnquiry(
        {
          tenantId,
          prospectiveStudentName: "Aarav Sharma",
          primaryContactName: "Vikram Sharma",
          primaryContactPhone: "9876543210",
          actorUserId: "usr_counselor",
        },
        mockDb
      );

      expect(result.enquiryNumber).toBe("ENQ-2026-00006");
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          action: "ENQUIRY_CREATED",
          actionCategory: "ADMISSIONS",
        }),
      });
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          eventType: "admissions.enquiry.created",
        }),
      });
    });

    it("should assign counselor owner to an enquiry and log audit", async () => {
      mockDb.admissionEnquiry.findFirst.mockResolvedValue({
        id: "enq_1",
        tenantId,
        status: "NEW",
      });
      mockDb.admissionEnquiry.update.mockResolvedValue({
        id: "enq_1",
        ownerUserId: "usr_counselor_2",
      });

      const updated = await admissionsService.assignEnquiry(
        tenantId,
        "enq_1",
        "usr_counselor_2",
        "usr_admin",
        "admin@school.com",
        mockDb
      );

      expect(updated.ownerUserId).toBe("usr_counselor_2");
      expect(mockDb.auditLog.create).toHaveBeenCalled();
    });

    it("should transition enquiry status according to the CRM state machine", async () => {
      mockDb.admissionEnquiry.findFirst.mockResolvedValue({
        id: "enq_1",
        tenantId,
        status: "NEW",
      });
      mockDb.admissionEnquiry.update.mockResolvedValue({
        id: "enq_1",
        status: "CONTACTED",
      });

      const updated = await admissionsService.updateEnquiryStatus(
        tenantId,
        "enq_1",
        "CONTACTED",
        undefined,
        "usr_counselor",
        undefined,
        mockDb
      );

      expect(updated.status).toBe("CONTACTED");
    });

    it("should reject invalid enquiry transitions (e.g. CONVERTED to NEW)", async () => {
      mockDb.admissionEnquiry.findFirst.mockResolvedValue({
        id: "enq_1",
        tenantId,
        status: "CONVERTED",
      });

      await expect(
        admissionsService.updateEnquiryStatus(tenantId, "enq_1", "NEW", undefined, undefined, undefined, mockDb)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Deterministic Duplicate Detection", () => {
    it("should detect exact duplicate applicant by normalized name, DOB, and guardian phone", async () => {
      mockDb.applicant.findMany.mockResolvedValue([
        {
          id: "app_existing",
          fullName: "Rohan Verma",
          dateOfBirth: new Date("2015-05-15"),
          guardianPhone: "9876500000",
          applicantNumber: "APP-2026-00001",
        },
      ]);

      const dupCheck = await admissionsService.detectDuplicates(
        {
          tenantId,
          fullName: "  rohan   verma  ",
          dateOfBirth: new Date("2015-05-15"),
          guardianPhone: "+91 98765-00000",
        },
        mockDb
      );

      expect(dupCheck.matchLevel).toBe("EXACT_MATCH");
      expect(dupCheck.matches).toHaveLength(1);
      expect(dupCheck.matches[0].id).toBe("app_existing");
    });

    it("should detect exact match when applicant matches an already enrolled student", async () => {
      mockDb.applicant.findMany.mockResolvedValue([]);
      mockDb.studentProfile.findMany.mockResolvedValue([
        {
          id: "stu_existing",
          fullName: "Rohan Verma",
          dateOfBirth: new Date("2015-05-15"),
          admissionNumber: "ADM-2025-00042",
        },
      ]);

      const dupCheck = await admissionsService.detectDuplicates(
        {
          tenantId,
          fullName: "Rohan Verma",
          dateOfBirth: new Date("2015-05-15"),
          guardianPhone: "9999999999",
        },
        mockDb
      );

      expect(dupCheck.matchLevel).toBe("EXACT_MATCH");
      expect(dupCheck.matches[0].type).toBe("STUDENT");
    });

    it("should flag possible duplicate when name and DOB match but guardian phone differs", async () => {
      mockDb.applicant.findMany.mockResolvedValue([
        {
          id: "app_prev",
          fullName: "Ananya Sen",
          dateOfBirth: new Date("2016-08-20"),
          guardianPhone: "9111111111",
          applicantNumber: "APP-2026-00002",
        },
      ]);
      mockDb.studentProfile.findMany.mockResolvedValue([]);

      const dupCheck = await admissionsService.detectDuplicates(
        {
          tenantId,
          fullName: "Ananya Sen",
          dateOfBirth: new Date("2016-08-20"),
          guardianPhone: "9222222222",
        },
        mockDb
      );

      expect(dupCheck.matchLevel).toBe("POSSIBLE_MATCH");
    });

    it("should block creation when exact duplicate applicant exists", async () => {
      mockDb.applicant.findMany.mockResolvedValue([
        {
          id: "app_existing",
          fullName: "Kavya Patel",
          dateOfBirth: new Date("2017-03-10"),
          guardianPhone: "9888877777",
          applicantNumber: "APP-2026-00003",
        },
      ]);

      await expect(
        admissionsService.createApplicant(
          {
            tenantId,
            fullName: "Kavya Patel",
            gender: "FEMALE",
            dateOfBirth: new Date("2017-03-10"),
            primaryPhone: "9888877777",
            guardianName: "Sunil Patel",
            guardianPhone: "9888877777",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Application Management & Server-Side State Transitions", () => {
    it("should create application in DRAFT status for valid session, applicant, and grade", async () => {
      mockDb.admissionSession.findFirst.mockResolvedValue({
        id: "ses_1",
        tenantId,
        status: "OPEN",
      });
      mockDb.applicant.findFirst.mockResolvedValue({
        id: "app_1",
        tenantId,
      });
      mockDb.grade.findFirst.mockResolvedValue({
        id: "grd_1",
        tenantId,
      });

      const createdApp = {
        id: "appl_1",
        tenantId,
        applicationNumber: "APPL-2026-00009",
        status: "DRAFT",
      };
      mockDb.admissionApplication.create.mockResolvedValue(createdApp);

      const result = await admissionsService.createApplication(
        {
          tenantId,
          sessionId: "ses_1",
          applicantId: "app_1",
          gradeId: "grd_1",
        },
        mockDb
      );

      expect(result.applicationNumber).toBe("APPL-2026-00009");
      expect(result.status).toBe("DRAFT");
    });

    it("should submit draft application and transition to SUBMITTED", async () => {
      mockDb.admissionApplication.findFirst.mockResolvedValue({
        id: "appl_1",
        tenantId,
        applicationNumber: "APPL-2026-00009",
        status: "DRAFT",
      });
      mockDb.admissionApplication.update.mockResolvedValue({
        id: "appl_1",
        status: "SUBMITTED",
      });

      const submitted = await admissionsService.submitApplication(tenantId, "appl_1", "usr_1", undefined, mockDb);
      expect(submitted.status).toBe("SUBMITTED");
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "admissions.application.submitted",
        }),
      });
    });

    it("should prevent submission of already submitted application", async () => {
      mockDb.admissionApplication.findFirst.mockResolvedValue({
        id: "appl_1",
        tenantId,
        status: "SUBMITTED",
      });

      await expect(
        admissionsService.submitApplication(tenantId, "appl_1", "usr_1", undefined, mockDb)
      ).rejects.toThrow(ValidationError);
    });

    it("should reject arbitrary unauthorized status jumps (e.g. SUBMITTED to ADMITTED)", async () => {
      mockDb.admissionApplication.findFirst.mockResolvedValue({
        id: "appl_1",
        tenantId,
        status: "SUBMITTED",
      });

      await expect(
        admissionsService.transitionApplicationStatus(tenantId, "appl_1", "ADMITTED", undefined, undefined, undefined, mockDb)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Document Verification, Interviews, and Tests", () => {
    it("should verify document reference and record verifier user", async () => {
      mockDb.admissionApplicationDocument.findFirst.mockResolvedValue({
        id: "doc_1",
        tenantId,
        applicationId: "appl_1",
        documentType: "BIRTH_CERTIFICATE",
        verificationStatus: "PENDING",
      });
      mockDb.admissionApplicationDocument.update.mockResolvedValue({
        id: "doc_1",
        verificationStatus: "VERIFIED",
        verifiedByUserId: "usr_verifier",
      });

      const verified = await admissionsService.verifyDocument(
        tenantId,
        "doc_1",
        "usr_verifier",
        "verifier@school.com",
        mockDb
      );

      expect(verified.verificationStatus).toBe("VERIFIED");
      expect(mockDb.tenantOutboxEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "admissions.document.verified",
        }),
      });
    });

    it("should reject document with required rejection reason", async () => {
      mockDb.admissionApplicationDocument.findFirst.mockResolvedValue({
        id: "doc_1",
        tenantId,
        applicationId: "appl_1",
        documentType: "TRANSFER_CERTIFICATE",
      });

      await expect(
        admissionsService.rejectDocument(tenantId, "doc_1", "", "usr_verifier", undefined, mockDb)
      ).rejects.toThrow(ValidationError);

      mockDb.admissionApplicationDocument.update.mockResolvedValue({
        id: "doc_1",
        verificationStatus: "REJECTED",
        rejectionReason: "Illegible scan",
      });

      const rejected = await admissionsService.rejectDocument(
        tenantId,
        "doc_1",
        "Illegible scan",
        "usr_verifier",
        undefined,
        mockDb
      );
      expect(rejected.verificationStatus).toBe("REJECTED");
    });

    it("should schedule interview and record completed score and result", async () => {
      mockDb.admissionApplication.findFirst.mockResolvedValue({
        id: "appl_1",
        tenantId,
        status: "UNDER_REVIEW",
      });
      mockDb.admissionInterview.create.mockResolvedValue({
        id: "int_1",
        scheduledDateTime: new Date(),
        status: "SCHEDULED",
      });

      const interview = await admissionsService.scheduleInterview(
        {
          tenantId,
          applicationId: "appl_1",
          scheduledDateTime: new Date(),
          interviewerUserId: "usr_teacher",
        },
        mockDb
      );
      expect(interview.id).toBe("int_1");

      mockDb.admissionInterview.findFirst.mockResolvedValue({
        id: "int_1",
        tenantId,
        applicationId: "appl_1",
      });
      mockDb.admissionInterview.update.mockResolvedValue({
        id: "int_1",
        status: "COMPLETED",
        result: "RECOMMENDED",
        score: new Decimal(88.5),
      });

      const recorded = await admissionsService.recordInterviewResult(
        tenantId,
        "int_1",
        "RECOMMENDED",
        88.5,
        "Candidate showed strong aptitude",
        "usr_teacher",
        undefined,
        mockDb
      );

      expect(recorded.result).toBe("RECOMMENDED");
    });
  });

  describe("Decisions, Offers, and Confirmation", () => {
    it("should record decision and transition application status to APPROVED", async () => {
      mockDb.admissionApplication.findFirst.mockResolvedValue({
        id: "appl_1",
        tenantId,
        status: "UNDER_REVIEW",
      });
      mockDb.admissionDecision.create.mockResolvedValue({
        id: "dec_1",
        decision: "APPROVED",
      });

      const decision = await admissionsService.recordDecision(
        {
          tenantId,
          applicationId: "appl_1",
          decision: "APPROVED",
          actorUserId: "usr_principal",
        },
        mockDb
      );

      expect(decision.decision).toBe("APPROVED");
      expect(mockDb.admissionApplication.update).toHaveBeenCalledWith({
        where: { id: "appl_1" },
        data: expect.objectContaining({ status: "APPROVED" }),
      });
    });

    it("should issue offer with validity date and allow idempotent acceptance", async () => {
      mockDb.admissionApplication.findFirst.mockResolvedValue({
        id: "appl_1",
        tenantId,
        status: "APPROVED",
      });
      mockDb.grade.findFirst.mockResolvedValue({
        id: "grd_1",
        tenantId,
      });

      const futureDate = new Date(Date.now() + 7 * 24 * 3600 * 1000);
      mockDb.admissionOffer.create.mockResolvedValue({
        id: "ofr_1",
        offerNumber: "OFR-2026-00003",
        expiryDate: futureDate,
        status: "ISSUED",
      });

      const offer = await admissionsService.issueOffer(
        {
          tenantId,
          applicationId: "appl_1",
          offeredGradeId: "grd_1",
          expiryDate: futureDate,
        },
        mockDb
      );
      expect(offer.offerNumber).toBe("OFR-2026-00003");

      // Acceptance
      mockDb.admissionOffer.findFirst.mockResolvedValue({
        id: "ofr_1",
        tenantId,
        applicationId: "appl_1",
        status: "ISSUED",
        expiryDate: futureDate,
      });
      mockDb.admissionOffer.update.mockResolvedValue({
        id: "ofr_1",
        status: "ACCEPTED",
      });

      const accepted = await admissionsService.acceptOffer(tenantId, "ofr_1", "usr_parent", undefined, mockDb);
      expect(accepted.status).toBe("ACCEPTED");

      // Idempotent repeated acceptance
      mockDb.admissionOffer.findFirst.mockResolvedValue({
        id: "ofr_1",
        tenantId,
        status: "ACCEPTED",
        expiryDate: futureDate,
      });

      const repeated = await admissionsService.acceptOffer(tenantId, "ofr_1", "usr_parent", undefined, mockDb);
      expect(repeated.status).toBe("ACCEPTED");
    });

    it("should reject acceptance of expired admission offers", async () => {
      const pastDate = new Date(Date.now() - 24 * 3600 * 1000);
      mockDb.admissionOffer.findFirst.mockResolvedValue({
        id: "ofr_expired",
        tenantId,
        status: "ISSUED",
        expiryDate: pastDate,
      });

      await expect(
        admissionsService.acceptOffer(tenantId, "ofr_expired", "usr_parent", undefined, mockDb)
      ).rejects.toThrow(ValidationError);
    });

    it("should enforce confirmation prerequisites (verified documents & active accepted offer)", async () => {
      // Application with pending documents
      mockDb.admissionApplication.findFirst.mockResolvedValue({
        id: "appl_1",
        tenantId,
        status: "OFFERED",
        documents: [{ id: "d1", verificationStatus: "PENDING" }],
        offers: [{ id: "o1", status: "ACCEPTED", expiryDate: new Date(Date.now() + 100000) }],
        confirmations: [],
      });

      await expect(
        admissionsService.confirmAdmission(
          {
            tenantId,
            applicationId: "appl_1",
            actorUserId: "usr_admin",
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });
  });
});
