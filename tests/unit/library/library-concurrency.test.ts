import { describe, it, expect, vi, beforeEach } from "vitest";
import { LibraryService } from "@/lib/services/library-service";
import { ConflictError, ValidationError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

describe("Library Concurrency & Idempotency Invariants", () => {
  let libraryService: LibraryService;
  const tenantId = "tnt_concurrency_school";

  beforeEach(() => {
    libraryService = new LibraryService();
  });

  it("Concurrency 1: Two users simultaneously issue the same book copy -> exactly one succeeds", async () => {
    let copyStatus = "AVAILABLE";

    const createMockTx = () => ({
      libraryPolicy: {
        findFirst: vi.fn().mockResolvedValue({
          tenantId,
          maxActiveLoans: 3,
          defaultLoanPeriodDays: 14,
        }),
      },
      libraryMember: {
        findFirst: vi.fn().mockResolvedValue({
          id: "mem_1",
          tenantId,
          status: "ACTIVE",
        }),
      },
      libraryLoan: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: `loan_${Math.random()}`,
          ...data,
        })),
      },
      libraryBookCopy: {
        findFirst: vi.fn().mockImplementation(async () => {
          return {
            id: "cp_hot",
            tenantId,
            status: copyStatus,
            accessionNumber: "ACC-HOT-1",
            book: { title: "Concurrent Systems" },
          };
        }),
        update: vi.fn().mockImplementation(async () => {
          if (copyStatus !== "AVAILABLE") {
            throw new ConflictError("Book copy is not available");
          }
          copyStatus = "ISSUED";
          return { id: "cp_hot", status: "ISSUED" };
        }),
      },
      libraryReservation: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_1" }),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "obx_1" }),
      },
    });

    const mockDb1 = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(createMockTx())),
      libraryPolicy: {
        findFirst: vi.fn().mockResolvedValue({
          tenantId,
          maxActiveLoans: 3,
          defaultLoanPeriodDays: 14,
        }),
      },
    };

    const mockDb2 = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(createMockTx())),
      libraryPolicy: {
        findFirst: vi.fn().mockResolvedValue({
          tenantId,
          maxActiveLoans: 3,
          defaultLoanPeriodDays: 14,
        }),
      },
    };

    const req1 = libraryService.issueBook(
      { tenantId, memberId: "mem_1", bookCopyId: "cp_hot", actorUserId: "usr_alice" },
      mockDb1 as any
    );

    const req2 = libraryService.issueBook(
      { tenantId, memberId: "mem_2", bookCopyId: "cp_hot", actorUserId: "usr_bob" },
      mockDb2 as any
    );

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
  });

  it("Concurrency 2: Two users simultaneously return the same loan -> exactly one authoritative return", async () => {
    let loanStatus = "ISSUED";

    const createMockTx = () => ({
      libraryPolicy: {
        findFirst: vi.fn().mockResolvedValue({
          tenantId,
          finePerDayCents: new Decimal(5.0),
          gracePeriodDays: 0,
        }),
      },
      libraryLoan: {
        findFirst: vi.fn().mockImplementation(async () => ({
          id: "loan_concurrent_ret",
          tenantId,
          status: loanStatus,
          dueAt: new Date(Date.now() + 1000000),
          bookCopyId: "cp_1",
          bookCopy: { id: "cp_1", condition: "GOOD", book: { title: "Title" } },
        })),
        update: vi.fn().mockImplementation(async () => {
          if (loanStatus === "RETURNED") {
            throw new ValidationError("Loan is already RETURNED");
          }
          loanStatus = "RETURNED";
          return { id: "loan_concurrent_ret", status: "RETURNED" };
        }),
      },
      libraryBookCopy: {
        update: vi.fn().mockResolvedValue({ id: "cp_1", status: "AVAILABLE" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_1" }),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "obx_1" }),
      },
    });

    const mockDb1 = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(createMockTx())),
      libraryPolicy: {
        findFirst: vi.fn().mockResolvedValue({ tenantId, finePerDayCents: new Decimal(5.0), gracePeriodDays: 0 }),
      },
    };

    const mockDb2 = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(createMockTx())),
      libraryPolicy: {
        findFirst: vi.fn().mockResolvedValue({ tenantId, finePerDayCents: new Decimal(5.0), gracePeriodDays: 0 }),
      },
    };

    const req1 = libraryService.returnBook(
      { tenantId, loanId: "loan_concurrent_ret", actorUserId: "usr_alice" },
      mockDb1 as any
    );

    const req2 = libraryService.returnBook(
      { tenantId, loanId: "loan_concurrent_ret", actorUserId: "usr_bob" },
      mockDb2 as any
    );

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ValidationError);
  });

  it("Concurrency 3: Duplicate fine settlement -> exactly one succeeds, second rejected with ConflictError", async () => {
    let fineStatus = "UNPAID";

    const createMockTx = () => ({
      libraryFine: {
        findFirst: vi.fn().mockImplementation(async () => ({
          id: "fine_dup_settle",
          tenantId,
          status: fineStatus,
          amount: new Decimal(25.0),
        })),
        update: vi.fn().mockImplementation(async () => {
          if (fineStatus === "PAID") {
            throw new ConflictError("Fine has already been paid and settled");
          }
          fineStatus = "PAID";
          return { id: "fine_dup_settle", status: "PAID" };
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_1" }),
      },
      tenantOutboxEvent: {
        create: vi.fn().mockResolvedValue({ id: "obx_1" }),
      },
    });

    const mockDb1 = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(createMockTx())),
    };
    const mockDb2 = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(createMockTx())),
    };

    const req1 = libraryService.settleFine(
      { tenantId, fineId: "fine_dup_settle", actorUserId: "usr_1" },
      mockDb1 as any
    );
    const req2 = libraryService.settleFine(
      { tenantId, fineId: "fine_dup_settle", actorUserId: "usr_2" },
      mockDb2 as any
    );

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
  });
});
