import { describe, it, expect, vi, beforeEach } from "vitest";
import { LibraryService } from "@/lib/services/library-service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("Library Domain Operations & Circulation Invariants", () => {
  let libraryService: LibraryService;
  let mockDb: any;
  let mockTx: any;

  const tenantAlpha = "tnt_alpha_school";
  const tenantBeta = "tnt_beta_academy";

  beforeEach(() => {
    libraryService = new LibraryService();

    mockTx = {
      libraryPolicy: {
        findFirst: vi.fn().mockResolvedValue({
          tenantId: tenantAlpha,
          maxActiveLoans: 3,
          renewalLimit: 2,
          finePerDayCents: new Decimal(5.0),
          gracePeriodDays: 0,
          defaultLoanPeriodDays: 14,
        }),
        create: vi.fn(),
        update: vi.fn(),
      },
      libraryCategory: {
        create: vi.fn(),
      },
      libraryAuthor: {
        create: vi.fn(),
      },
      libraryPublisher: {
        create: vi.fn(),
      },
      libraryBook: {
        create: vi.fn(),
        update: vi.fn(),
      },
      libraryBookCopy: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
      libraryMember: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      libraryLoan: {
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
      },
      libraryReservation: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
      libraryFine: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_1" }),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "obx_1" }),
      },
    };

    mockDb = {
      $transaction: vi.fn().mockImplementation((cb) => cb(mockTx)),
      libraryPolicy: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      libraryCategory: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      libraryAuthor: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      libraryPublisher: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      libraryBook: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      libraryBookCopy: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      libraryMember: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      libraryLoan: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      libraryReservation: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      libraryFine: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        groupBy: vi.fn(),
      },
      studentProfile: {
        findFirst: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
    };
  });

  describe("Catalog Management", () => {
    it("should create category and reject duplicate category code in tenant", async () => {
      mockDb.libraryCategory.findUnique.mockResolvedValue(null);
      mockDb.libraryCategory.create.mockResolvedValue({
        id: "cat_1",
        tenantId: tenantAlpha,
        code: "TEXTBOOK",
        name: "Academic Textbooks",
      });

      const cat = await libraryService.createCategory(
        {
          tenantId: tenantAlpha,
          code: "textbook",
          name: "Academic Textbooks",
        },
        mockDb
      );
      expect(cat.code).toBe("TEXTBOOK");

      mockDb.libraryCategory.findUnique.mockResolvedValue({ id: "cat_1", code: "TEXTBOOK" });
      await expect(
        libraryService.createCategory(
          {
            tenantId: tenantAlpha,
            code: "TEXTBOOK",
            name: "Duplicate",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should create book bibliographic title with audit log and outbox event", async () => {
      mockTx.libraryBook.create.mockResolvedValue({
        id: "bk_1",
        tenantId: tenantAlpha,
        title: "Clean Code",
        isbn: "978-0132350884",
        active: true,
      });

      const book = await libraryService.createBook(
        {
          tenantId: tenantAlpha,
          title: "Clean Code",
          isbn: "978-0132350884",
          actorUserId: "usr_librarian",
        },
        mockDb
      );

      expect(book.id).toBe("bk_1");
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionCategory: "LIBRARY",
            action: "LIBRARY_BOOK_CREATED",
          }),
        })
      );
      expect(mockTx.tenantOutboxEvent.create).toHaveBeenCalled();
    });

    it("should reject creating book copy when accession number already exists in tenant", async () => {
      mockDb.libraryBook.findFirst.mockResolvedValue({ id: "bk_1", tenantId: tenantAlpha });
      mockDb.libraryBookCopy.findUnique.mockResolvedValue({
        id: "cp_existing",
        accessionNumber: "ACC-101",
      });

      await expect(
        libraryService.createBookCopy(
          {
            tenantId: tenantAlpha,
            bookId: "bk_1",
            accessionNumber: "ACC-101",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Member Registration & Scoping", () => {
    it("should register library member referencing existing student profile", async () => {
      mockDb.libraryMember.findUnique.mockResolvedValue(null);
      mockDb.studentProfile.findFirst.mockResolvedValue({
        id: "stu_1",
        tenantId: tenantAlpha,
        fullName: "Rahul Verma",
      });
      mockTx.libraryMember.create.mockResolvedValue({
        id: "mem_1",
        tenantId: tenantAlpha,
        memberCode: "LIB-STU-001",
        memberType: "STUDENT",
        studentProfileId: "stu_1",
        status: "ACTIVE",
      });

      const member = await libraryService.registerMember(
        {
          tenantId: tenantAlpha,
          memberCode: "LIB-STU-001",
          memberType: "STUDENT",
          studentProfileId: "stu_1",
          actorUserId: "usr_librarian",
        },
        mockDb
      );

      expect(member.memberCode).toBe("LIB-STU-001");
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "LIBRARY_MEMBER_REGISTERED",
          }),
        })
      );
    });

    it("should reject member registration if referenced student belongs to another tenant", async () => {
      mockDb.libraryMember.findUnique.mockResolvedValue(null);
      mockDb.studentProfile.findFirst.mockResolvedValue(null); // cross-tenant lookup fails

      await expect(
        libraryService.registerMember(
          {
            tenantId: tenantAlpha,
            memberCode: "LIB-CROSS",
            studentProfileId: "stu_foreign_beta",
          },
          mockDb
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Circulation: Issue Book", () => {
    it("should successfully issue book copy, change status to ISSUED, and emit audit & outbox", async () => {
      mockTx.libraryMember.findFirst.mockResolvedValue({
        id: "mem_1",
        tenantId: tenantAlpha,
        status: "ACTIVE",
      });
      mockDb.libraryPolicy.findFirst.mockResolvedValue({
        tenantId: tenantAlpha,
        defaultLoanPeriodDays: 14,
        maxActiveLoans: 3,
        finePerDayCents: new Decimal(5.0),
      });
      mockTx.libraryLoan.count.mockResolvedValue(1); // 1 active loan out of 3
      mockTx.libraryBookCopy.findFirst.mockResolvedValue({
        id: "cp_1",
        bookId: "bk_1",
        accessionNumber: "ACC-101",
        status: "AVAILABLE",
        book: { title: "Clean Code" },
      });
      mockTx.libraryLoan.create.mockResolvedValue({
        id: "loan_1",
        memberId: "mem_1",
        bookCopyId: "cp_1",
        status: "ISSUED",
      });
      mockTx.libraryReservation.findFirst.mockResolvedValue(null);

      const loan = await libraryService.issueBook(
        {
          tenantId: tenantAlpha,
          memberId: "mem_1",
          bookCopyId: "cp_1",
          actorUserId: "usr_librarian",
        },
        mockDb
      );

      expect(loan.id).toBe("loan_1");
      expect(mockTx.libraryBookCopy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cp_1" },
          data: { status: "ISSUED" },
        })
      );
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "LIBRARY_BOOK_ISSUED" }),
        })
      );
      expect(mockTx.tenantOutboxEvent.create).toHaveBeenCalled();
    });

    it("should reject issuing when member has reached maximum active loans limit", async () => {
      mockTx.libraryMember.findFirst.mockResolvedValue({
        id: "mem_1",
        tenantId: tenantAlpha,
        status: "ACTIVE",
      });
      mockDb.libraryPolicy.findFirst.mockResolvedValue({
        tenantId: tenantAlpha,
        defaultLoanPeriodDays: 14,
        maxActiveLoans: 3,
      });
      mockTx.libraryLoan.count.mockResolvedValue(3); // already 3 active loans

      await expect(
        libraryService.issueBook(
          {
            tenantId: tenantAlpha,
            memberId: "mem_1",
            bookCopyId: "cp_1",
            actorUserId: "usr_librarian",
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should reject issuing when book copy is already ISSUED or LOST", async () => {
      mockTx.libraryMember.findFirst.mockResolvedValue({
        id: "mem_1",
        tenantId: tenantAlpha,
        status: "ACTIVE",
      });
      mockDb.libraryPolicy.findFirst.mockResolvedValue({
        tenantId: tenantAlpha,
        defaultLoanPeriodDays: 14,
        maxActiveLoans: 3,
      });
      mockTx.libraryLoan.count.mockResolvedValue(0);
      mockTx.libraryBookCopy.findFirst.mockResolvedValue({
        id: "cp_1",
        status: "ISSUED", // Already issued!
        accessionNumber: "ACC-101",
        book: { title: "Clean Code" },
      });

      await expect(
        libraryService.issueBook(
          {
            tenantId: tenantAlpha,
            memberId: "mem_1",
            bookCopyId: "cp_1",
            actorUserId: "usr_librarian",
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Circulation: Return Book & Overdue Fine Calculation", () => {
    it("should return book on time without assessing overdue fine", async () => {
      const now = new Date();
      const futureDueAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      mockTx.libraryLoan.findFirst.mockResolvedValue({
        id: "loan_1",
        tenantId: tenantAlpha,
        status: "ISSUED",
        dueAt: futureDueAt,
        bookCopyId: "cp_1",
        bookCopy: { id: "cp_1", condition: "GOOD", book: { title: "Title" } },
      });
      mockDb.libraryPolicy.findFirst.mockResolvedValue({
        tenantId: tenantAlpha,
        finePerDayCents: new Decimal(5.0),
        gracePeriodDays: 0,
      });
      mockTx.libraryLoan.update.mockResolvedValue({ id: "loan_1", status: "RETURNED" });

      const result = await libraryService.returnBook(
        {
          tenantId: tenantAlpha,
          loanId: "loan_1",
          actorUserId: "usr_librarian",
        },
        mockDb
      );

      expect(result.loan.status).toBe("RETURNED");
      expect(result.fine).toBeNull();
      expect(mockTx.libraryBookCopy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cp_1" },
          data: { status: "AVAILABLE", condition: "GOOD" },
        })
      );
    });

    it("should calculate deterministic fine and create LibraryFine when book is returned overdue", async () => {
      const now = new Date();
      // 4 days late (offset slightly to avoid millisecond boundary Math.ceil rollover to 5)
      const pastDueAt = new Date(now.getTime() - (4 * 24 * 60 * 60 * 1000 - 60000));

      mockTx.libraryLoan.findFirst.mockResolvedValue({
        id: "loan_overdue",
        tenantId: tenantAlpha,
        memberId: "mem_1",
        status: "ISSUED",
        dueAt: pastDueAt,
        bookCopyId: "cp_1",
        bookCopy: { id: "cp_1", condition: "GOOD", book: { title: "Title" } },
      });
      mockTx.libraryPolicy.findFirst.mockResolvedValue({
        tenantId: tenantAlpha,
        finePerDayCents: new Decimal(10.0), // ₹10 per day
        gracePeriodDays: 1, // 1 day grace -> 3 billable days
        defaultLoanPeriodDays: 14,
        maxActiveLoans: 3,
        renewalLimit: 2,
      });
      mockTx.libraryLoan.update.mockResolvedValue({ id: "loan_overdue", status: "RETURNED" });
      mockTx.libraryFine.create.mockResolvedValue({
        id: "fine_1",
        tenantId: tenantAlpha,
        memberId: "mem_1",
        amount: new Decimal(30.0), // 3 days * 10 = 30
        status: "UNPAID",
      });

      const result = await libraryService.returnBook(
        {
          tenantId: tenantAlpha,
          loanId: "loan_overdue",
          actorUserId: "usr_librarian",
        },
        mockDb
      );

      expect(result.fine).toBeDefined();
      expect(mockTx.libraryFine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            memberId: "mem_1",
            amount: new Decimal(30.0),
            status: "UNPAID",
          }),
        })
      );
      expect(mockTx.tenantOutboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "library.fine.assessed",
          }),
        })
      );
    });
  });

  describe("Circulation: Renewal, Reservation & Fines Settlement", () => {
    it("should renew book and increment renewal count within configured renewal limit", async () => {
      const now = new Date();
      mockTx.libraryLoan.findFirst.mockResolvedValue({
        id: "loan_renew",
        tenantId: tenantAlpha,
        memberId: "mem_1",
        status: "ISSUED",
        renewalCount: 1,
        dueAt: now,
        bookCopy: { bookId: "bk_1" },
      });
      mockDb.libraryPolicy.findFirst.mockResolvedValue({
        tenantId: tenantAlpha,
        renewalLimit: 2,
        defaultLoanPeriodDays: 14,
      });
      mockTx.libraryReservation.findFirst.mockResolvedValue(null);
      mockTx.libraryLoan.update.mockResolvedValue({
        id: "loan_renew",
        renewalCount: 2,
      });

      const renewed = await libraryService.renewBook(
        {
          tenantId: tenantAlpha,
          loanId: "loan_renew",
          actorUserId: "usr_librarian",
        },
        mockDb
      );

      expect(renewed.renewalCount).toBe(2);
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "LIBRARY_BOOK_RENEWED" }),
        })
      );
    });

    it("should reject renewal when renewal limit has been reached", async () => {
      mockTx.libraryLoan.findFirst.mockResolvedValue({
        id: "loan_max_renew",
        tenantId: tenantAlpha,
        status: "ISSUED",
        renewalCount: 2,
        dueAt: new Date(),
        bookCopy: { bookId: "bk_1" },
      });
      mockDb.libraryPolicy.findFirst.mockResolvedValue({
        tenantId: tenantAlpha,
        renewalLimit: 2,
      });

      await expect(
        libraryService.renewBook(
          {
            tenantId: tenantAlpha,
            loanId: "loan_max_renew",
            actorUserId: "usr_librarian",
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should settle fine idempotently and record financial reference", async () => {
      mockTx.libraryFine.findFirst.mockResolvedValue({
        id: "fine_1",
        tenantId: tenantAlpha,
        status: "UNPAID",
        amount: new Decimal(50.0),
      });
      mockTx.libraryFine.update.mockResolvedValue({
        id: "fine_1",
        status: "PAID",
        financialReference: "REC-LIB-12345",
      });

      const settled = await libraryService.settleFine(
        {
          tenantId: tenantAlpha,
          fineId: "fine_1",
          financialReference: "REC-LIB-12345",
          actorUserId: "usr_cashier",
        },
        mockDb
      );

      expect(settled.status).toBe("PAID");
      expect(settled.financialReference).toBe("REC-LIB-12345");
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "LIBRARY_FINE_SETTLED" }),
        })
      );
    });

    it("should waive fine with authorized reason and audit log", async () => {
      mockTx.libraryFine.findFirst.mockResolvedValue({
        id: "fine_waive",
        tenantId: tenantAlpha,
        status: "UNPAID",
      });
      mockTx.libraryFine.update.mockResolvedValue({
        id: "fine_waive",
        status: "WAIVED",
      });

      const waived = await libraryService.waiveFine(
        {
          tenantId: tenantAlpha,
          fineId: "fine_waive",
          waiveReason: "Medical absence approved by Principal",
          actorUserId: "usr_principal",
        },
        mockDb
      );

      expect(waived.status).toBe("WAIVED");
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: "LIBRARY_FINE_WAIVED" }),
        })
      );
    });
  });
});
