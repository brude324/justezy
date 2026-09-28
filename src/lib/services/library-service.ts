import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "@/lib/errors";
import { outboxService } from "./outbox-service";
import { feeService } from "./fee-service";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface UpsertPolicyInput {
  tenantId: string;
  libraryId?: string;
  name?: string;
  defaultLoanPeriodDays?: number;
  maxActiveLoans?: number;
  renewalLimit?: number;
  finePerDayCents?: number | string | Decimal;
  gracePeriodDays?: number;
  reservationExpiryDays?: number;
  isDefault?: boolean;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateCategoryInput {
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateAuthorInput {
  tenantId: string;
  name: string;
  bio?: string;
  metadata?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreatePublisherInput {
  tenantId: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface CreateBookInput {
  tenantId: string;
  libraryId?: string;
  isbn?: string;
  title: string;
  subtitle?: string;
  edition?: string;
  language?: string;
  categoryId?: string;
  authorId?: string;
  publisherId?: string;
  publicationYear?: number;
  subject?: string;
  metadata?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface UpdateBookInput {
  id: string;
  tenantId: string;
  libraryId?: string;
  isbn?: string;
  title?: string;
  subtitle?: string;
  edition?: string;
  language?: string;
  categoryId?: string;
  authorId?: string;
  publisherId?: string;
  publicationYear?: number;
  subject?: string;
  metadata?: string;
  active?: boolean;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ListBooksFilter {
  tenantId: string;
  libraryId?: string;
  categoryId?: string;
  authorId?: string;
  publisherId?: string;
  search?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateBookCopyInput {
  tenantId: string;
  libraryId?: string;
  bookId: string;
  accessionNumber: string;
  barcode?: string;
  condition?: string;
  location?: string;
  notes?: string;
  acquisitionDate?: Date;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ListCopiesFilter {
  tenantId: string;
  bookId?: string;
  status?: "AVAILABLE" | "ISSUED" | "RESERVED" | "LOST" | "DAMAGED" | "WITHDRAWN";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface RegisterMemberInput {
  tenantId: string;
  libraryId?: string;
  memberType?: "STUDENT" | "STAFF" | "PARENT" | "OTHER";
  memberCode: string;
  studentProfileId?: string;
  userId?: string;
  expiresAt?: Date;
  maxLoansOverride?: number;
  notes?: string;
  actorUserId?: string;
  actorEmail?: string;
}

export interface ListMembersFilter {
  tenantId: string;
  memberType?: "STUDENT" | "STAFF" | "PARENT" | "OTHER";
  status?: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface IssueBookInput {
  tenantId: string;
  memberId: string;
  bookCopyId: string;
  dueAt?: Date;
  notes?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface ReturnBookInput {
  tenantId: string;
  loanId: string;
  notes?: string;
  condition?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface RenewBookInput {
  tenantId: string;
  loanId: string;
  notes?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface ReserveBookInput {
  tenantId: string;
  memberId: string;
  bookId: string;
  notes?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface AssessFineInput {
  tenantId: string;
  memberId: string;
  loanId?: string;
  amount: number | string | Decimal;
  reason: string;
  notes?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface WaiveFineInput {
  tenantId: string;
  fineId: string;
  waiveReason: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface SettleFineInput {
  tenantId: string;
  fineId: string;
  financialReference?: string;
  feeAssignmentId?: string;
  feePaymentId?: string;
  notes?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface MarkLostInput {
  tenantId: string;
  copyId: string;
  lostFineAmount?: number | string | Decimal;
  notes?: string;
  actorUserId: string;
  actorEmail?: string;
}

export interface MarkDamagedInput {
  tenantId: string;
  copyId: string;
  damageFineAmount?: number | string | Decimal;
  notes?: string;
  actorUserId: string;
  actorEmail?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class LibraryService {
  /**
   * Resolves or gets active Library Policy for the tenant.
   */
  async getPolicy(tenantId: string, libraryId?: string, db = prismaTarget) {
    let policy = await db.libraryPolicy.findFirst({
      where: {
        tenantId,
        ...(libraryId ? { libraryId } : { isDefault: true }),
      },
    });

    if (!policy) {
      // Create default tenant policy
      policy = await db.libraryPolicy.create({
        data: {
          tenantId,
          libraryId,
          name: "Standard Institution Circulation Policy",
          defaultLoanPeriodDays: 14,
          maxActiveLoans: 3,
          renewalLimit: 2,
          finePerDayCents: new Decimal(5.0),
          gracePeriodDays: 0,
          reservationExpiryDays: 3,
          isDefault: true,
        },
      });
    }

    return policy;
  }

  /**
   * Configures or updates institutional Library Policy.
   */
  async upsertPolicy(input: UpsertPolicyInput, db = prismaTarget) {
    const existing = await db.libraryPolicy.findFirst({
      where: {
        tenantId: input.tenantId,
        ...(input.libraryId ? { libraryId: input.libraryId } : { isDefault: true }),
      },
    });

    return await db.$transaction(async (tx) => {
      let policy;
      if (existing) {
        policy = await tx.libraryPolicy.update({
          where: { id: existing.id },
          data: {
            name: input.name ?? existing.name,
            defaultLoanPeriodDays: input.defaultLoanPeriodDays ?? existing.defaultLoanPeriodDays,
            maxActiveLoans: input.maxActiveLoans ?? existing.maxActiveLoans,
            renewalLimit: input.renewalLimit ?? existing.renewalLimit,
            finePerDayCents: input.finePerDayCents !== undefined
              ? new Decimal(input.finePerDayCents.toString())
              : existing.finePerDayCents,
            gracePeriodDays: input.gracePeriodDays ?? existing.gracePeriodDays,
            reservationExpiryDays: input.reservationExpiryDays ?? existing.reservationExpiryDays,
            isDefault: input.isDefault ?? existing.isDefault,
          },
        });
      } else {
        policy = await tx.libraryPolicy.create({
          data: {
            tenantId: input.tenantId,
            libraryId: input.libraryId,
            name: input.name ?? "Standard Institution Circulation Policy",
            defaultLoanPeriodDays: input.defaultLoanPeriodDays ?? 14,
            maxActiveLoans: input.maxActiveLoans ?? 3,
            renewalLimit: input.renewalLimit ?? 2,
            finePerDayCents: input.finePerDayCents !== undefined
              ? new Decimal(input.finePerDayCents.toString())
              : new Decimal(5.0),
            gracePeriodDays: input.gracePeriodDays ?? 0,
            reservationExpiryDays: input.reservationExpiryDays ?? 3,
            isDefault: input.isDefault ?? true,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_POLICY_UPDATED",
          entityType: "LibraryPolicy",
          entityId: policy.id,
          diffJson: JSON.stringify({
            policyId: policy.id,
            maxActiveLoans: policy.maxActiveLoans,
            loanPeriodDays: policy.defaultLoanPeriodDays,
            finePerDay: policy.finePerDayCents.toString(),
          }),
        },
      });

      return policy;
    });
  }

  // --------------------------------------------------------------------------
  // CATALOG: CATEGORIES, AUTHORS, PUBLISHERS
  // --------------------------------------------------------------------------

  async createCategory(input: CreateCategoryInput, db = prismaTarget) {
    const code = input.code.trim().toUpperCase();
    const existing = await db.libraryCategory.findUnique({
      where: { tenantId_code: { tenantId: input.tenantId, code } },
    });
    if (existing) {
      throw new ConflictError(`Library category with code '${code}' already exists`);
    }

    return await db.libraryCategory.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.name.trim(),
        description: input.description,
        active: true,
      },
    });
  }

  async listCategories(tenantId: string, db = prismaTarget) {
    return await db.libraryCategory.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async createAuthor(input: CreateAuthorInput, db = prismaTarget) {
    return await db.libraryAuthor.create({
      data: {
        tenantId: input.tenantId,
        name: input.name.trim(),
        bio: input.bio,
        metadata: input.metadata,
      },
    });
  }

  async listAuthors(tenantId: string, search?: string, db = prismaTarget) {
    return await db.libraryAuthor.findMany({
      where: {
        tenantId,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async createPublisher(input: CreatePublisherInput, db = prismaTarget) {
    return await db.libraryPublisher.create({
      data: {
        tenantId: input.tenantId,
        name: input.name.trim(),
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        address: input.address,
      },
    });
  }

  async listPublishers(tenantId: string, db = prismaTarget) {
    return await db.libraryPublisher.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  }

  // --------------------------------------------------------------------------
  // BOOKS (BIBLIOGRAPHIC TITLES)
  // --------------------------------------------------------------------------

  async createBook(input: CreateBookInput, db = prismaTarget) {
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError("Book title is required");
    }

    // Verify category/author/publisher belong to tenant if provided
    if (input.categoryId) {
      const cat = await db.libraryCategory.findFirst({
        where: { id: input.categoryId, tenantId: input.tenantId },
      });
      if (!cat) throw new NotFoundError("Library category not found in tenant");
    }
    if (input.authorId) {
      const auth = await db.libraryAuthor.findFirst({
        where: { id: input.authorId, tenantId: input.tenantId },
      });
      if (!auth) throw new NotFoundError("Library author not found in tenant");
    }
    if (input.publisherId) {
      const pub = await db.libraryPublisher.findFirst({
        where: { id: input.publisherId, tenantId: input.tenantId },
      });
      if (!pub) throw new NotFoundError("Library publisher not found in tenant");
    }

    return await db.$transaction(async (tx) => {
      const book = await tx.libraryBook.create({
        data: {
          tenantId: input.tenantId,
          libraryId: input.libraryId,
          isbn: input.isbn?.trim(),
          title: input.title.trim(),
          subtitle: input.subtitle?.trim(),
          edition: input.edition?.trim(),
          language: input.language ?? "English",
          categoryId: input.categoryId,
          authorId: input.authorId,
          publisherId: input.publisherId,
          publicationYear: input.publicationYear,
          subject: input.subject?.trim(),
          metadata: input.metadata,
          active: true,
        },
        include: {
          category: true,
          author: true,
          publisher: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_BOOK_CREATED",
          entityType: "LibraryBook",
          entityId: book.id,
          diffJson: JSON.stringify({
            title: book.title,
            isbn: book.isbn,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "library.book.created",
        aggregateType: "LibraryBook",
        aggregateId: book.id,
        payload: {
          bookId: book.id,
          title: book.title,
          isbn: book.isbn,
        },
      });

      return book;
    });
  }

  async updateBook(input: UpdateBookInput, db = prismaTarget) {
    const existing = await db.libraryBook.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
    });
    if (!existing) {
      throw new NotFoundError("Library book not found");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.libraryBook.update({
        where: { id: input.id },
        data: {
          title: input.title?.trim() ?? existing.title,
          subtitle: input.subtitle !== undefined ? input.subtitle?.trim() : existing.subtitle,
          isbn: input.isbn !== undefined ? input.isbn?.trim() : existing.isbn,
          edition: input.edition !== undefined ? input.edition?.trim() : existing.edition,
          language: input.language ?? existing.language,
          categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
          authorId: input.authorId !== undefined ? input.authorId : existing.authorId,
          publisherId: input.publisherId !== undefined ? input.publisherId : existing.publisherId,
          publicationYear: input.publicationYear !== undefined ? input.publicationYear : existing.publicationYear,
          subject: input.subject !== undefined ? input.subject?.trim() : existing.subject,
          metadata: input.metadata !== undefined ? input.metadata : existing.metadata,
          active: input.active !== undefined ? input.active : existing.active,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_BOOK_UPDATED",
          entityType: "LibraryBook",
          entityId: updated.id,
          diffJson: JSON.stringify({
            bookId: updated.id,
            title: updated.title,
          }),
        },
      });

      return updated;
    });
  }

  async getBook(tenantId: string, bookId: string, db = prismaTarget) {
    const book = await db.libraryBook.findFirst({
      where: { id: bookId, tenantId },
      include: {
        category: true,
        author: true,
        publisher: true,
        copies: true,
        reservations: {
          where: { status: "PENDING" },
          include: { member: true },
        },
      },
    });

    if (!book) {
      throw new NotFoundError("Book not found in tenant");
    }

    return book;
  }

  async listBooks(filter: ListBooksFilter, db = prismaTarget) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      tenantId: filter.tenantId,
      ...(filter.active !== undefined ? { active: filter.active } : {}),
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.authorId ? { authorId: filter.authorId } : {}),
      ...(filter.publisherId ? { publisherId: filter.publisherId } : {}),
    };

    if (filter.search) {
      whereClause.OR = [
        { title: { contains: filter.search, mode: "insensitive" } },
        { isbn: { contains: filter.search, mode: "insensitive" } },
        { subject: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      db.libraryBook.count({ where: whereClause }),
      db.libraryBook.findMany({
        where: whereClause,
        include: {
          category: true,
          author: true,
          publisher: true,
          copies: {
            select: { id: true, status: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { title: "asc" },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // --------------------------------------------------------------------------
  // PHYSICAL BOOK COPIES / INVENTORY
  // --------------------------------------------------------------------------

  async createBookCopy(input: CreateBookCopyInput, db = prismaTarget) {
    const accessionNumber = input.accessionNumber.trim().toUpperCase();

    // Verify book belongs to tenant
    const book = await db.libraryBook.findFirst({
      where: { id: input.bookId, tenantId: input.tenantId },
    });
    if (!book) {
      throw new NotFoundError("Book not found in tenant");
    }

    // Check duplicate accession number within tenant
    const existing = await db.libraryBookCopy.findUnique({
      where: {
        tenantId_accessionNumber: {
          tenantId: input.tenantId,
          accessionNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictError(
        `Book copy with accession number '${accessionNumber}' already exists in tenant`
      );
    }

    return await db.$transaction(async (tx) => {
      const copy = await tx.libraryBookCopy.create({
        data: {
          tenantId: input.tenantId,
          libraryId: input.libraryId ?? book.libraryId,
          bookId: input.bookId,
          accessionNumber,
          barcode: input.barcode?.trim(),
          condition: input.condition ?? "GOOD",
          status: "AVAILABLE",
          location: input.location?.trim(),
          notes: input.notes,
          acquisitionDate: input.acquisitionDate ?? new Date(),
        },
        include: { book: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_COPY_CREATED",
          entityType: "LibraryBookCopy",
          entityId: copy.id,
          diffJson: JSON.stringify({
            copyId: copy.id,
            bookId: copy.bookId,
            accessionNumber: copy.accessionNumber,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "library.copy.created",
        aggregateType: "LibraryBookCopy",
        aggregateId: copy.id,
        payload: {
          copyId: copy.id,
          bookId: copy.bookId,
          accessionNumber: copy.accessionNumber,
        },
      });

      return copy;
    });
  }

  async getBookCopy(tenantId: string, copyId: string, db = prismaTarget) {
    const copy = await db.libraryBookCopy.findFirst({
      where: { id: copyId, tenantId },
      include: {
        book: {
          include: { category: true, author: true, publisher: true },
        },
        loans: {
          take: 5,
          orderBy: { issuedAt: "desc" },
          include: { member: true },
        },
      },
    });

    if (!copy) {
      throw new NotFoundError("Book copy not found in tenant");
    }

    return copy;
  }

  async listBookCopies(filter: ListCopiesFilter, db = prismaTarget) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      tenantId: filter.tenantId,
      ...(filter.bookId ? { bookId: filter.bookId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    if (filter.search) {
      whereClause.OR = [
        { accessionNumber: { contains: filter.search, mode: "insensitive" } },
        { barcode: { contains: filter.search, mode: "insensitive" } },
        { location: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      db.libraryBookCopy.count({ where: whereClause }),
      db.libraryBookCopy.findMany({
        where: whereClause,
        include: { book: true },
        skip,
        take: pageSize,
        orderBy: { accessionNumber: "asc" },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // --------------------------------------------------------------------------
  // MEMBERS (REUSING STUDENTPROFILE & USER IDENTITIES)
  // --------------------------------------------------------------------------

  async registerMember(input: RegisterMemberInput, db = prismaTarget) {
    const memberCode = input.memberCode.trim().toUpperCase();

    // Ensure memberCode is unique in tenant
    const existing = await db.libraryMember.findUnique({
      where: {
        tenantId_memberCode: {
          tenantId: input.tenantId,
          memberCode,
        },
      },
    });
    if (existing) {
      throw new ConflictError(
        `Library member with code '${memberCode}' already exists in tenant`
      );
    }

    // Verify student or user belongs to tenant if specified
    if (input.studentProfileId) {
      const student = await db.studentProfile.findFirst({
        where: { id: input.studentProfileId, tenantId: input.tenantId },
      });
      if (!student) throw new NotFoundError("Student profile not found in tenant");

      const existingMember = await db.libraryMember.findFirst({
        where: { studentProfileId: input.studentProfileId, tenantId: input.tenantId },
      });
      if (existingMember) {
        throw new ConflictError("A library member is already registered for this student");
      }
    }

    if (input.userId) {
      const user = await db.user.findFirst({
        where: { id: input.userId },
      });
      if (!user) throw new NotFoundError("User account not found");
    }

    return await db.$transaction(async (tx) => {
      const member = await tx.libraryMember.create({
        data: {
          tenantId: input.tenantId,
          libraryId: input.libraryId,
          memberType: input.memberType ?? "STUDENT",
          memberCode,
          studentProfileId: input.studentProfileId,
          userId: input.userId,
          status: "ACTIVE",
          expiresAt: input.expiresAt,
          maxLoansOverride: input.maxLoansOverride,
          notes: input.notes,
        },
        include: {
          studentProfile: true,
          user: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_MEMBER_REGISTERED",
          entityType: "LibraryMember",
          entityId: member.id,
          diffJson: JSON.stringify({
            memberCode: member.memberCode,
            memberType: member.memberType,
          }),
        },
      });

      return member;
    });
  }

  async getMember(tenantId: string, memberId: string, db = prismaTarget) {
    const member = await db.libraryMember.findFirst({
      where: { id: memberId, tenantId },
      include: {
        studentProfile: true,
        user: true,
        loans: {
          where: { status: { in: ["ISSUED", "OVERDUE"] } },
          include: { bookCopy: { include: { book: true } } },
        },
        fines: {
          where: { status: "UNPAID" },
        },
      },
    });

    if (!member) {
      throw new NotFoundError("Library member not found in tenant");
    }

    return member;
  }

  async listMembers(filter: ListMembersFilter, db = prismaTarget) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      tenantId: filter.tenantId,
      ...(filter.memberType ? { memberType: filter.memberType } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    if (filter.search) {
      whereClause.OR = [
        { memberCode: { contains: filter.search, mode: "insensitive" } },
        { studentProfile: { fullName: { contains: filter.search, mode: "insensitive" } } },
        { user: { firstName: { contains: filter.search, mode: "insensitive" } } },
        { user: { lastName: { contains: filter.search, mode: "insensitive" } } },
      ];
    }

    const [total, items] = await Promise.all([
      db.libraryMember.count({ where: whereClause }),
      db.libraryMember.findMany({
        where: whereClause,
        include: {
          studentProfile: true,
          user: true,
          _count: {
            select: {
              loans: { where: { status: { in: ["ISSUED", "OVERDUE"] } } },
              fines: { where: { status: "UNPAID" } },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { memberCode: "asc" },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // --------------------------------------------------------------------------
  // CIRCULATION: ISSUE, RETURN, RENEW, RESERVE
  // --------------------------------------------------------------------------

  /**
   * Issues a physical book copy to an active library member.
   * Concurrency Safe: Uses transaction and re-validates copy status.
   */
  async issueBook(input: IssueBookInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      // 1. Fetch and validate member
      const member = await tx.libraryMember.findFirst({
        where: { id: input.memberId, tenantId: input.tenantId },
      });
      if (!member) {
        throw new NotFoundError("Library member not found in tenant");
      }
      if (member.status !== "ACTIVE") {
        throw new ValidationError(`Member is ${member.status} and cannot be issued books`);
      }
      if (member.expiresAt && member.expiresAt < new Date()) {
        throw new ValidationError("Member library registration has expired");
      }

      // 2. Fetch policy to verify max active loans
      const policy = await this.getPolicy(input.tenantId, member.libraryId ?? undefined, tx as any);
      const maxAllowedLoans = member.maxLoansOverride ?? policy.maxActiveLoans;

      const currentActiveLoansCount = await tx.libraryLoan.count({
        where: {
          tenantId: input.tenantId,
          memberId: member.id,
          status: { in: ["ISSUED", "OVERDUE"] },
        },
      });

      if (currentActiveLoansCount >= maxAllowedLoans) {
        throw new ValidationError(
          `Member has reached maximum allowed active loans (${maxAllowedLoans})`
        );
      }

      // 3. Fetch and validate book copy
      const copy = await tx.libraryBookCopy.findFirst({
        where: { id: input.bookCopyId, tenantId: input.tenantId },
        include: { book: true },
      });
      if (!copy) {
        throw new NotFoundError("Book copy not found in tenant");
      }

      // Strict Invariant: Copy must be AVAILABLE
      if (copy.status !== "AVAILABLE") {
        throw new ConflictError(
          `Book copy '${copy.accessionNumber}' is not available (Current status: ${copy.status})`
        );
      }

      // 4. Calculate due date
      const issuedAt = new Date();
      let dueAt = input.dueAt;
      if (!dueAt) {
        dueAt = new Date(issuedAt.getTime() + policy.defaultLoanPeriodDays * 24 * 60 * 60 * 1000);
      }

      // 5. Create loan and mark copy as ISSUED
      const loan = await tx.libraryLoan.create({
        data: {
          tenantId: input.tenantId,
          memberId: member.id,
          bookCopyId: copy.id,
          issuedAt,
          dueAt,
          status: "ISSUED",
          issuedByUserId: input.actorUserId,
          renewalCount: 0,
          notes: input.notes,
        },
      });

      await tx.libraryBookCopy.update({
        where: { id: copy.id },
        data: { status: "ISSUED" },
      });

      // 6. Check if member had a pending reservation for this book title and fulfill it
      const reservation = await tx.libraryReservation.findFirst({
        where: {
          tenantId: input.tenantId,
          memberId: member.id,
          bookId: copy.bookId,
          status: "PENDING",
        },
      });
      if (reservation) {
        await tx.libraryReservation.update({
          where: { id: reservation.id },
          data: { status: "FULFILLED", fulfilledAt: issuedAt },
        });
      }

      // 7. Audit log & outbox event
      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_BOOK_ISSUED",
          entityType: "LibraryLoan",
          entityId: loan.id,
          diffJson: JSON.stringify({
            loanId: loan.id,
            memberId: member.id,
            bookCopyId: copy.id,
            bookTitle: copy.book.title,
            dueAt: dueAt.toISOString(),
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "library.book.issued",
        aggregateType: "LibraryLoan",
        aggregateId: loan.id,
        payload: {
          loanId: loan.id,
          memberId: member.id,
          bookCopyId: copy.id,
          dueAt: dueAt.toISOString(),
        },
      });

      logger.info("[LibraryService] Book copy issued", {
        tenantId: input.tenantId,
        loanId: loan.id,
        accessionNumber: copy.accessionNumber,
      });

      return loan;
    });
  }

  /**
   * Returns an issued book copy and calculates deterministic overdue fine if applicable.
   * Concurrency Safe: Validates active loan status.
   */
  async returnBook(input: ReturnBookInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const loan = await tx.libraryLoan.findFirst({
        where: { id: input.loanId, tenantId: input.tenantId },
        include: {
          bookCopy: { include: { book: true } },
          member: true,
        },
      });

      if (!loan) {
        throw new NotFoundError("Library loan not found in tenant");
      }

      if (loan.status === "RETURNED" || loan.status === "CANCELLED") {
        throw new ValidationError(`Loan is already ${loan.status}`);
      }

      const returnedAt = new Date();
      const policy = await this.getPolicy(input.tenantId, undefined, tx as any);

      // Check if overdue
      let fineAmount = new Decimal(0);
      let overdueDays = 0;

      if (returnedAt > loan.dueAt) {
        const diffMs = returnedAt.getTime() - loan.dueAt.getTime();
        const rawOverdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        overdueDays = Math.max(0, rawOverdueDays - policy.gracePeriodDays);

        if (overdueDays > 0) {
          fineAmount = new Decimal(overdueDays).times(policy.finePerDayCents);
        }
      }

      // Update loan status
      const updatedLoan = await tx.libraryLoan.update({
        where: { id: loan.id },
        data: {
          status: "RETURNED",
          returnedAt,
          returnedByUserId: input.actorUserId,
          notes: input.notes ? `${loan.notes ?? ""} | ${input.notes}`.trim() : loan.notes,
        },
      });

      // Update copy status
      const copyCondition = input.condition ?? loan.bookCopy.condition;
      const copyStatus = copyCondition === "DAMAGED" ? "DAMAGED" : "AVAILABLE";

      await tx.libraryBookCopy.update({
        where: { id: loan.bookCopyId },
        data: {
          status: copyStatus,
          condition: copyCondition,
        },
      });

      // If fine assessed, create LibraryFine
      let fineRecord = null;
      if (fineAmount.greaterThan(0)) {
        fineRecord = await tx.libraryFine.create({
          data: {
            tenantId: input.tenantId,
            memberId: loan.memberId,
            loanId: loan.id,
            amount: fineAmount,
            reason: `Overdue fine: ${overdueDays} day(s) late`,
            status: "UNPAID",
            assessedAt: returnedAt,
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: input.tenantId,
            actorId: input.actorUserId,
            actorEmail: input.actorEmail,
            actionCategory: "LIBRARY",
            action: "LIBRARY_FINE_ASSESSED",
            entityType: "LibraryFine",
            entityId: fineRecord.id,
            diffJson: JSON.stringify({
              fineId: fineRecord.id,
              amount: fineAmount.toString(),
              overdueDays,
            }),
          },
        });

        await outboxService.emitEvent(tx, {
          tenantId: input.tenantId,
          eventType: "library.fine.assessed",
          aggregateType: "LibraryFine",
          aggregateId: fineRecord.id,
          payload: {
            fineId: fineRecord.id,
            memberId: loan.memberId,
            amount: fineAmount.toString(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_BOOK_RETURNED",
          entityType: "LibraryLoan",
          entityId: loan.id,
          diffJson: JSON.stringify({
            loanId: loan.id,
            returnedAt: returnedAt.toISOString(),
            fineAssessed: fineAmount.toString(),
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "library.book.returned",
        aggregateType: "LibraryLoan",
        aggregateId: loan.id,
        payload: {
          loanId: loan.id,
          bookCopyId: loan.bookCopyId,
          returnedAt: returnedAt.toISOString(),
          fineAssessed: fineAmount.toString(),
        },
      });

      return {
        loan: updatedLoan,
        fine: fineRecord,
      };
    });
  }

  /**
   * Renews an active book loan, extending due date and verifying renewal limits.
   * Concurrency Safe: Enforces renewalLimit inside transaction.
   */
  async renewBook(input: RenewBookInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const loan = await tx.libraryLoan.findFirst({
        where: { id: input.loanId, tenantId: input.tenantId },
        include: { bookCopy: true },
      });

      if (!loan) {
        throw new NotFoundError("Library loan not found in tenant");
      }

      if (loan.status !== "ISSUED" && loan.status !== "OVERDUE") {
        throw new ValidationError(`Cannot renew loan with status '${loan.status}'`);
      }

      const policy = await this.getPolicy(input.tenantId, undefined, tx as any);

      // Invariant: Cannot exceed configured renewal limit
      if (loan.renewalCount >= policy.renewalLimit) {
        throw new ValidationError(
          `Renewal limit reached (${policy.renewalLimit}). Loan cannot be renewed further.`
        );
      }

      // Check if title has active reservations by other members
      const activeReservation = await tx.libraryReservation.findFirst({
        where: {
          tenantId: input.tenantId,
          bookId: loan.bookCopy.bookId,
          status: "PENDING",
          memberId: { not: loan.memberId },
        },
      });
      if (activeReservation) {
        throw new ConflictError(
          "Cannot renew this book because another member has reserved it"
        );
      }

      const newDueAt = new Date(
        loan.dueAt.getTime() + policy.defaultLoanPeriodDays * 24 * 60 * 60 * 1000
      );

      const renewed = await tx.libraryLoan.update({
        where: { id: loan.id },
        data: {
          dueAt: newDueAt,
          renewalCount: loan.renewalCount + 1,
          status: "ISSUED", // reset from OVERDUE if renewed
          notes: input.notes ? `${loan.notes ?? ""} | ${input.notes}`.trim() : loan.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_BOOK_RENEWED",
          entityType: "LibraryLoan",
          entityId: renewed.id,
          diffJson: JSON.stringify({
            loanId: renewed.id,
            renewalCount: renewed.renewalCount,
            newDueAt: newDueAt.toISOString(),
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "library.book.renewed",
        aggregateType: "LibraryLoan",
        aggregateId: renewed.id,
        payload: {
          loanId: renewed.id,
          renewalCount: renewed.renewalCount,
          newDueAt: newDueAt.toISOString(),
        },
      });

      return renewed;
    });
  }

  /**
   * Places a reservation for a book title.
   */
  async reserveBook(input: ReserveBookInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const member = await tx.libraryMember.findFirst({
        where: { id: input.memberId, tenantId: input.tenantId },
      });
      if (!member) throw new NotFoundError("Library member not found");
      if (member.status !== "ACTIVE") {
        throw new ValidationError("Inactive member cannot reserve books");
      }

      const book = await tx.libraryBook.findFirst({
        where: { id: input.bookId, tenantId: input.tenantId },
      });
      if (!book) throw new NotFoundError("Book title not found");

      // Check if member already has an active pending reservation for this title
      const existing = await tx.libraryReservation.findFirst({
        where: {
          tenantId: input.tenantId,
          memberId: member.id,
          bookId: book.id,
          status: "PENDING",
        },
      });
      if (existing) {
        throw new ConflictError("Member already has a pending reservation for this book");
      }

      const policy = await this.getPolicy(input.tenantId, undefined, tx as any);
      const requestedAt = new Date();
      const expiryAt = new Date(
        requestedAt.getTime() + policy.reservationExpiryDays * 24 * 60 * 60 * 1000
      );

      const reservation = await tx.libraryReservation.create({
        data: {
          tenantId: input.tenantId,
          memberId: member.id,
          bookId: book.id,
          requestedAt,
          expiryAt,
          status: "PENDING",
          notes: input.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_RESERVATION_CREATED",
          entityType: "LibraryReservation",
          entityId: reservation.id,
          diffJson: JSON.stringify({
            reservationId: reservation.id,
            bookId: book.id,
            memberId: member.id,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "library.reservation.created",
        aggregateType: "LibraryReservation",
        aggregateId: reservation.id,
        payload: {
          reservationId: reservation.id,
          bookId: book.id,
          memberId: member.id,
          expiryAt: expiryAt.toISOString(),
        },
      });

      return reservation;
    });
  }

  async cancelReservation(
    tenantId: string,
    reservationId: string,
    actorUserId?: string,
    actorEmail?: string,
    db = prismaTarget
  ) {
    const reservation = await db.libraryReservation.findFirst({
      where: { id: reservationId, tenantId },
    });
    if (!reservation) {
      throw new NotFoundError("Library reservation not found");
    }
    if (reservation.status !== "PENDING") {
      throw new ValidationError(`Reservation is already ${reservation.status}`);
    }

    return await db.$transaction(async (tx) => {
      const cancelled = await tx.libraryReservation.update({
        where: { id: reservationId },
        data: { status: "CANCELLED" },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorUserId,
          actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_RESERVATION_CANCELLED",
          entityType: "LibraryReservation",
          entityId: reservationId,
        },
      });

      return cancelled;
    });
  }

  // --------------------------------------------------------------------------
  // LOST & DAMAGED COPIES
  // --------------------------------------------------------------------------

  async markCopyLost(input: MarkLostInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const copy = await tx.libraryBookCopy.findFirst({
        where: { id: input.copyId, tenantId: input.tenantId },
        include: {
          loans: {
            where: { status: { in: ["ISSUED", "OVERDUE"] } },
            take: 1,
          },
        },
      });
      if (!copy) throw new NotFoundError("Book copy not found");

      await tx.libraryBookCopy.update({
        where: { id: copy.id },
        data: { status: "LOST", notes: input.notes },
      });

      const activeLoan = copy.loans[0];
      if (activeLoan) {
        await tx.libraryLoan.update({
          where: { id: activeLoan.id },
          data: { status: "LOST" },
        });
      }

      let fine = null;
      if (input.lostFineAmount !== undefined && new Decimal(input.lostFineAmount.toString()).greaterThan(0)) {
        if (!activeLoan) {
          throw new ValidationError("Cannot assess lost copy fine without an active loan");
        }
        fine = await tx.libraryFine.create({
          data: {
            tenantId: input.tenantId,
            memberId: activeLoan.memberId,
            loanId: activeLoan.id,
            amount: new Decimal(input.lostFineAmount.toString()),
            reason: `Lost book copy fine for accession #${copy.accessionNumber}`,
            status: "UNPAID",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_COPY_LOST",
          entityType: "LibraryBookCopy",
          entityId: copy.id,
          diffJson: JSON.stringify({ copyId: copy.id, accessionNumber: copy.accessionNumber }),
        },
      });

      return { copy, fine };
    });
  }

  async markCopyDamaged(input: MarkDamagedInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const copy = await tx.libraryBookCopy.findFirst({
        where: { id: input.copyId, tenantId: input.tenantId },
        include: {
          loans: {
            where: { status: { in: ["ISSUED", "OVERDUE"] } },
            take: 1,
          },
        },
      });
      if (!copy) throw new NotFoundError("Book copy not found");

      await tx.libraryBookCopy.update({
        where: { id: copy.id },
        data: { status: "DAMAGED", condition: "POOR", notes: input.notes },
      });

      let fine = null;
      const activeLoan = copy.loans[0];
      if (input.damageFineAmount !== undefined && new Decimal(input.damageFineAmount.toString()).greaterThan(0)) {
        if (activeLoan) {
          fine = await tx.libraryFine.create({
            data: {
              tenantId: input.tenantId,
              memberId: activeLoan.memberId,
              loanId: activeLoan.id,
              amount: new Decimal(input.damageFineAmount.toString()),
              reason: `Damaged book copy fine for accession #${copy.accessionNumber}`,
              status: "UNPAID",
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_COPY_DAMAGED",
          entityType: "LibraryBookCopy",
          entityId: copy.id,
          diffJson: JSON.stringify({ copyId: copy.id, accessionNumber: copy.accessionNumber }),
        },
      });

      return { copy, fine };
    });
  }

  // --------------------------------------------------------------------------
  // FINES & FINANCIAL SETTLEMENT
  // --------------------------------------------------------------------------

  async assessFine(input: AssessFineInput, db = prismaTarget) {
    const amount = new Decimal(input.amount.toString());
    if (amount.lessThan(0)) {
      throw new ValidationError("Fine amount cannot be negative");
    }

    return await db.$transaction(async (tx) => {
      const fine = await tx.libraryFine.create({
        data: {
          tenantId: input.tenantId,
          memberId: input.memberId,
          loanId: input.loanId,
          amount,
          reason: input.reason.trim(),
          status: "UNPAID",
          notes: input.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_FINE_ASSESSED",
          entityType: "LibraryFine",
          entityId: fine.id,
          diffJson: JSON.stringify({
            fineId: fine.id,
            amount: amount.toString(),
            reason: fine.reason,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "library.fine.assessed",
        aggregateType: "LibraryFine",
        aggregateId: fine.id,
        payload: {
          fineId: fine.id,
          memberId: input.memberId,
          amount: amount.toString(),
        },
      });

      return fine;
    });
  }

  async waiveFine(input: WaiveFineInput, db = prismaTarget) {
    if (!input.waiveReason || input.waiveReason.trim().length === 0) {
      throw new ValidationError("Waive reason is required");
    }

    return await db.$transaction(async (tx) => {
      const fine = await tx.libraryFine.findFirst({
        where: { id: input.fineId, tenantId: input.tenantId },
      });
      if (!fine) throw new NotFoundError("Library fine not found");

      if (fine.status !== "UNPAID") {
        throw new ValidationError(`Cannot waive fine with status '${fine.status}'`);
      }

      const waived = await tx.libraryFine.update({
        where: { id: fine.id },
        data: {
          status: "WAIVED",
          waivedAt: new Date(),
          waivedByUserId: input.actorUserId,
          waiveReason: input.waiveReason.trim(),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_FINE_WAIVED",
          entityType: "LibraryFine",
          entityId: fine.id,
          diffJson: JSON.stringify({
            fineId: fine.id,
            reason: input.waiveReason,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "library.fine.waived",
        aggregateType: "LibraryFine",
        aggregateId: fine.id,
        payload: { fineId: fine.id, waivedBy: input.actorUserId },
      });

      return waived;
    });
  }

  /**
   * Settles a library fine through the Wave 1 financial boundary or operational settlement.
   * Concurrency Safe: Enforces idempotency (rejects if already PAID or WAIVED).
   */
  async settleFine(input: SettleFineInput, db = prismaTarget) {
    return await db.$transaction(async (tx) => {
      const fine = await tx.libraryFine.findFirst({
        where: { id: input.fineId, tenantId: input.tenantId },
        include: { member: true },
      });
      if (!fine) throw new NotFoundError("Library fine not found");

      if (fine.status === "PAID") {
        throw new ConflictError("Fine has already been paid and settled");
      }
      if (fine.status === "WAIVED") {
        throw new ValidationError("Cannot settle a waived fine");
      }
      if (fine.status === "CANCELLED") {
        throw new ValidationError("Cannot settle a cancelled fine");
      }

      const financialReference =
        input.financialReference ?? `FIN-LIB-${fine.id}-${Date.now()}`;

      const settled = await tx.libraryFine.update({
        where: { id: fine.id },
        data: {
          status: "PAID",
          financialReference,
          feeAssignmentId: input.feeAssignmentId ?? fine.feeAssignmentId,
          feePaymentId: input.feePaymentId ?? fine.feePaymentId,
          notes: input.notes ? `${fine.notes ?? ""} | ${input.notes}`.trim() : fine.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorUserId,
          actorEmail: input.actorEmail,
          actionCategory: "LIBRARY",
          action: "LIBRARY_FINE_SETTLED",
          entityType: "LibraryFine",
          entityId: fine.id,
          diffJson: JSON.stringify({
            fineId: fine.id,
            amount: fine.amount.toString(),
            financialReference,
          }),
        },
      });

      await outboxService.emitEvent(tx, {
        tenantId: input.tenantId,
        eventType: "library.fine.settled",
        aggregateType: "LibraryFine",
        aggregateId: fine.id,
        payload: {
          fineId: fine.id,
          amount: fine.amount.toString(),
          financialReference,
        },
      });

      return settled;
    });
  }

  // --------------------------------------------------------------------------
  // OPERATIONAL CIRCULATION REPORTS
  // --------------------------------------------------------------------------

  async getCirculationReport(tenantId: string, db = prismaTarget) {
    const [
      totalBooks,
      totalCopies,
      availableCopies,
      issuedCopies,
      lostCopies,
      damagedCopies,
      totalActiveMembers,
      activeLoans,
      overdueLoans,
      pendingReservations,
      finesAgg,
    ] = await Promise.all([
      db.libraryBook.count({ where: { tenantId, active: true } }),
      db.libraryBookCopy.count({ where: { tenantId } }),
      db.libraryBookCopy.count({ where: { tenantId, status: "AVAILABLE" } }),
      db.libraryBookCopy.count({ where: { tenantId, status: "ISSUED" } }),
      db.libraryBookCopy.count({ where: { tenantId, status: "LOST" } }),
      db.libraryBookCopy.count({ where: { tenantId, status: "DAMAGED" } }),
      db.libraryMember.count({ where: { tenantId, status: "ACTIVE" } }),
      db.libraryLoan.count({ where: { tenantId, status: "ISSUED" } }),
      db.libraryLoan.count({
        where: {
          tenantId,
          status: "ISSUED",
          dueAt: { lt: new Date() },
        },
      }),
      db.libraryReservation.count({ where: { tenantId, status: "PENDING" } }),
      db.libraryFine.groupBy({
        by: ["status"],
        where: { tenantId },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const fineStats = {
      unpaidAmount: "0.00",
      unpaidCount: 0,
      paidAmount: "0.00",
      paidCount: 0,
      waivedAmount: "0.00",
      waivedCount: 0,
    };

    for (const group of finesAgg) {
      const sum = group._sum.amount ? group._sum.amount.toString() : "0.00";
      if (group.status === "UNPAID") {
        fineStats.unpaidAmount = sum;
        fineStats.unpaidCount = group._count;
      } else if (group.status === "PAID") {
        fineStats.paidAmount = sum;
        fineStats.paidCount = group._count;
      } else if (group.status === "WAIVED") {
        fineStats.waivedAmount = sum;
        fineStats.waivedCount = group._count;
      }
    }

    return {
      totalBooks,
      totalCopies,
      availableCopies,
      issuedCopies,
      lostCopies,
      damagedCopies,
      totalActiveMembers,
      activeLoans,
      overdueLoans,
      pendingReservations,
      fineStats,
    };
  }
}

export const libraryService = new LibraryService();
