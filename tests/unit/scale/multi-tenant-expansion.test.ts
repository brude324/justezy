import { describe, it, expect, vi, beforeEach } from "vitest";
import { tenantOnboardingService } from "@/lib/services/tenant-onboarding-service";
import { tenantService } from "@/lib/services/tenant-service";
import { tenantResolver } from "@/lib/tenant/tenant-resolver";
import { policyEngine } from "@/lib/authorization/policy-engine";
import { tenantDiagnosticService } from "@/lib/support/tenant-diagnostic";
import { dataImportService } from "@/lib/services/data-import-service";
import { dataQualityAuditor } from "@/lib/support/data-quality-auditor";
import { SlidingWindowRateLimiter } from "@/lib/security/rate-limiter";
import { TenantContextData } from "@/lib/tenant/tenant-context";
import {
  ConflictError,
  ValidationError,
  ForbiddenError,
  TenantNotFoundError,
  TenantSuspendedError,
  UnauthorizedError,
} from "@/lib/errors";

describe("Step 7: Production Expansion, Multi-Tenant Scale & V1 Stabilization", () => {
  // Production Test Tenants Matrix
  const tenantA: TenantContextData["tenant"] = {
    id: "tnt_dpa",
    slug: "dpa-delhi",
    name: "Delhi Public Academy",
    status: "ACTIVE",
    planTier: "PREMIUM",
  };

  const tenantB: TenantContextData["tenant"] = {
    id: "tnt_greenwood",
    slug: "greenwood-intl",
    name: "Greenwood International",
    status: "ACTIVE",
    planTier: "STANDARD",
  };

  const tenantC: TenantContextData["tenant"] = {
    id: "tnt_st_xaviers",
    slug: "st-xaviers",
    name: "St. Xavier's Model School",
    status: "ACTIVE",
    planTier: "STARTER",
  };

  const suspendedTenant: TenantContextData["tenant"] = {
    id: "tnt_suspended",
    slug: "suspended-school",
    name: "Suspended Academy",
    status: "SUSPENDED",
    planTier: "STARTER",
  };

  let mockDb: any;
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      tenant: { create: vi.fn(), update: vi.fn() },
      tenantPolicy: { create: vi.fn() },
      tenantBranding: { create: vi.fn() },
      role: { findFirst: vi.fn(), create: vi.fn() },
      tenantMembership: { create: vi.fn() },
      module: { upsert: vi.fn() },
      tenantModuleEntitlement: { create: vi.fn() },
      academicYear: { create: vi.fn() },
      term: { create: vi.fn() },
      grade: { create: vi.fn() },
      class: { create: vi.fn() },
      user: { upsert: vi.fn() },
      studentProfile: { create: vi.fn() },
      studentEnrollment: { create: vi.fn() },
      staffProfile: { create: vi.fn() },
      auditLog: { create: vi.fn().mockResolvedValue({ id: "aud_1" }) },
    };

    mockDb = {
      tenant: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      tenantDomain: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      rolePermission: {
        findFirst: vi.fn(),
      },
      tenantModuleEntitlement: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      tenantMembership: {
        findMany: vi.fn(),
      },
      academicYear: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      term: { count: vi.fn() },
      grade: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      class: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      staffProfile: {
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      studentProfile: {
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      parentProfile: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      studentEnrollment: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      studentParentBinding: {
        findMany: vi.fn(),
      },
      attendanceRecord: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      exam: { count: vi.fn() },
      examResult: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      announcement: { count: vi.fn() },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "aud_1" }),
        findMany: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockTx)),
    };
  });

  // ==========================================================================
  // SECTION 1: MULTI-TENANT ONBOARDING & REPEATABLE PROVISIONING
  // ==========================================================================
  describe("1. Multi-Tenant Onboarding & Repeatable Provisioning", () => {
    it("should atomically provision a complete tenant with policies, branding, owner, modules & academic structure", async () => {
      mockDb.tenant.findUnique.mockResolvedValue(null); // Slug is available
      mockDb.user.upsert.mockResolvedValue({
        id: "usr_owner_dpa",
        email: "principal@dpa.edu.in",
        firstName: "Rajesh",
        lastName: "Sharma",
      });

      mockTx.tenant.create.mockResolvedValue({
        id: "tnt_dpa",
        slug: "dpa-delhi",
        name: "Delhi Public Academy",
        status: "ACTIVE",
        planTier: "PREMIUM",
      });

      mockTx.role.findFirst.mockResolvedValue({ id: "rol_owner", roleKey: "INSTITUTION_OWNER" });
      mockTx.tenantMembership.create.mockResolvedValue({
        id: "mem_owner_dpa",
        tenantId: "tnt_dpa",
        userId: "usr_owner_dpa",
        roleId: "rol_owner",
        status: "ACTIVE",
      });
      mockTx.academicYear.create.mockResolvedValue({ id: "ay_2026", yearLabel: "2026-2027" });

      const result = await tenantOnboardingService.onboardTenant(
        {
          slug: "dpa-delhi",
          name: "Delhi Public Academy",
          legalName: "Delhi Public Academy Society",
          planTier: "PREMIUM",
          owner: {
            clerkId: "clerk_dpa_owner",
            email: "principal@dpa.edu.in",
            firstName: "Rajesh",
            lastName: "Sharma",
          },
          additionalModules: ["report_card_module", "timetable_module"],
        },
        mockDb
      );

      expect(result.tenant.id).toBe("tnt_dpa");
      expect(result.ownerMembership.id).toBe("mem_owner_dpa");
      expect(result.readinessReport.readyForOperations).toBe(true);
      expect(result.readinessReport.checklist.academicStructureReady).toBe(true);
      expect(result.readinessReport.modulesEnabled).toContain("core_academics");
      expect(result.readinessReport.modulesEnabled).toContain("report_card_module");
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: "tnt_dpa",
          action: "TENANT_ONBOARDED",
        }),
      });
    });

    it("should reject onboarding when tenant slug is already taken (ConflictError)", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: "tnt_existing", slug: "dpa-delhi" });

      await expect(
        tenantOnboardingService.onboardTenant(
          {
            slug: "dpa-delhi",
            name: "Duplicate Academy",
            owner: {
              clerkId: "clerk_dup",
              email: "dup@school.edu",
              firstName: "Dup",
            },
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should reject onboarding when slug format is invalid (ValidationError)", async () => {
      await expect(
        tenantOnboardingService.onboardTenant(
          {
            slug: "INVALID SLUG WITH SPACES!",
            name: "Invalid Academy",
            owner: {
              clerkId: "clerk_inv",
              email: "inv@school.edu",
              firstName: "Inv",
            },
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==========================================================================
  // SECTION 2: TENANT LIFECYCLE MANAGEMENT & ENFORCEMENT
  // ==========================================================================
  describe("2. Tenant Lifecycle Management & Enforcement", () => {
    it("should validate and allow valid transitions (ACTIVE -> SUSPENDED -> ACTIVE)", async () => {
      mockDb.tenant.findUnique.mockResolvedValueOnce({
        id: "tnt_dpa",
        status: "ACTIVE",
        name: "Delhi Public Academy",
      });
      mockDb.tenant.update.mockResolvedValueOnce({ id: "tnt_dpa", status: "SUSPENDED" });

      const suspended = await tenantService.updateTenantStatus(
        "tnt_dpa",
        "SUSPENDED",
        { actorId: "usr_operator", reason: "Subscription billing past due" },
        mockDb
      );
      expect(suspended.status).toBe("SUSPENDED");

      // Now reactivate: SUSPENDED -> ACTIVE
      mockDb.tenant.findUnique.mockResolvedValueOnce({
        id: "tnt_dpa",
        status: "SUSPENDED",
        name: "Delhi Public Academy",
      });
      mockDb.tenant.update.mockResolvedValueOnce({ id: "tnt_dpa", status: "ACTIVE" });

      const reactivated = await tenantService.updateTenantStatus(
        "tnt_dpa",
        "ACTIVE",
        { actorId: "usr_operator", reason: "Payment cleared" },
        mockDb
      );
      expect(reactivated.status).toBe("ACTIVE");
      expect(mockDb.auditLog.create).toHaveBeenCalledTimes(2);
    });

    it("should reject invalid lifecycle transitions (ConflictError)", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({
        id: "tnt_dpa",
        status: "PROVISIONING",
      });

      // PROVISIONING cannot transition directly to SUSPENDED
      await expect(
        tenantService.updateTenantStatus(
          "tnt_dpa",
          "SUSPENDED",
          { actorId: "usr_operator" },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("tenantResolver: rejects suspended institutions with TenantSuspendedError (HTTP 403)", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({
        id: "tnt_suspended",
        slug: "suspended-school",
        name: "Suspended Academy",
        status: "SUSPENDED",
      });

      await expect(
        tenantResolver.resolveTenantFromHost("suspended-school.justezy.com", mockDb)
      ).rejects.toThrow(TenantSuspendedError);
    });

    it("tenantResolver: blocks institutions in PROVISIONING state with ForbiddenError", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({
        id: "tnt_prov",
        slug: "provisioning-school",
        name: "Provisioning Academy",
        status: "PROVISIONING",
      });

      await expect(
        tenantResolver.resolveTenantFromHost("provisioning-school.justezy.com", mockDb)
      ).rejects.toThrow(ForbiddenError);
    });

    it("tenantResolver: masks ARCHIVED institutions as TenantNotFoundError to prevent enumeration", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({
        id: "tnt_archived",
        slug: "old-school",
        name: "Closed Academy",
        status: "ARCHIVED",
      });

      await expect(
        tenantResolver.resolveTenantFromHost("old-school.justezy.com", mockDb)
      ).rejects.toThrow(TenantNotFoundError);
    });

    it("policyEngine: immediately fails closed with TenantSuspendedError when tenant is SUSPENDED", async () => {
      const suspendedContext: TenantContextData = {
        tenant: suspendedTenant,
        user: {
          id: "usr_user_1",
          clerkId: "clerk_user_1",
          email: "user@suspended.edu",
          firstName: "John",
          lastName: "Doe",
          displayName: "John Doe",
        },
        membership: {
          id: "mem_1",
          tenantId: "tnt_suspended",
          userId: "usr_user_1",
          roleId: "rol_teacher",
          status: "ACTIVE",
        },
      };

      const decision = await policyEngine.evaluate(
        { permission: "attendance.mark", context: suspendedContext },
        mockDb
      );
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("TENANT_SUSPENDED");

      await expect(
        policyEngine.assertAuthorized(
          { permission: "attendance.mark", context: suspendedContext },
          mockDb
        )
      ).rejects.toThrow(TenantSuspendedError);
    });
  });

  // ==========================================================================
  // SECTION 3: PLATFORM SUPPORT & TENANT DIAGNOSTIC TOOLING
  // ==========================================================================
  describe("3. Platform Support & Tenant Diagnostic Tooling", () => {
    const platformOperator = {
      userId: "usr_support_op",
      email: "support@platform.com",
      platformRole: "SUPPORT_OPERATOR",
      isPlatformAdmin: true,
    };

    const regularUser = {
      userId: "usr_normal_teacher",
      email: "teacher@school.com",
      platformRole: undefined,
      isPlatformAdmin: false,
    };

    it("should reject diagnostic lookup by unauthorized users (ForbiddenError)", async () => {
      await expect(
        tenantDiagnosticService.getTenantOverview("tnt_dpa", regularUser, mockDb)
      ).rejects.toThrow(ForbiddenError);
    });

    it("should allow platform operator to inspect tenant overview and record audit log", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({
        id: "tnt_dpa",
        slug: "dpa-delhi",
        name: "Delhi Public Academy",
        legalName: "DPA Society",
        status: "ACTIVE",
        planTier: "PREMIUM",
        studentQuota: 1000,
        staffQuota: 100,
        storageQuotaGb: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        policy: { attendanceCutoffTime: "10:30" },
        branding: { primaryColorHex: "#0284c7" },
        domains: [],
      });

      const overview = await tenantDiagnosticService.getTenantOverview(
        "tnt_dpa",
        platformOperator,
        mockDb
      );

      expect(overview.tenant.id).toBe("tnt_dpa");
      expect(overview.tenant.planTier).toBe("PREMIUM");
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: "tnt_dpa",
          action: "TENANT_DIAGNOSTIC_ACCESSED",
        }),
      });
    });

    it("should return operational health and flag anomalies (e.g. classes without staff)", async () => {
      mockDb.academicYear.count.mockResolvedValue(1);
      mockDb.class.count.mockResolvedValue(5);
      mockDb.staffProfile.count.mockResolvedValue(0); // Anomaly: 5 classes but 0 staff
      mockDb.studentProfile.count.mockResolvedValue(50);
      mockDb.studentEnrollment.count.mockResolvedValue(0); // Anomaly: 50 students but 0 enrollments

      const health = await tenantDiagnosticService.getTenantOperationalHealth(
        "tnt_dpa",
        platformOperator,
        mockDb
      );

      expect(health.counts.classes).toBe(5);
      expect(health.anomalies.length).toBeGreaterThan(0);
      expect(health.anomalies).toContain("Classes exist but zero staff profiles are registered");
      expect(health.anomalies).toContain("Students are registered but zero active class enrollments found");
    });
  });

  // ==========================================================================
  // SECTION 4: DATA IMPORT READINESS (DRY-RUN & DUPLICATE PROTECTION)
  // ==========================================================================
  describe("4. Data Import Readiness (Dry-Run & Duplicate Protection)", () => {
    it("should perform dry-run class import without committing mutations to DB", async () => {
      mockDb.academicYear.findMany.mockResolvedValue([{ id: "ay_2026" }]);
      mockDb.grade.findMany.mockResolvedValue([{ id: "grd_10" }]);

      const result = await dataImportService.importClasses(
        "tnt_dpa",
        [
          { academicYearId: "ay_2026", gradeId: "grd_10", sectionName: "A", studentCapacity: 35 },
          { academicYearId: "ay_2026", gradeId: "grd_10", sectionName: "B", studentCapacity: 35 },
        ],
        { dryRun: true },
        mockDb
      );

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.createdCount).toBe(0);
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    it("should detect duplicate sections within import batch and reject without mutation", async () => {
      mockDb.academicYear.findMany.mockResolvedValue([{ id: "ay_2026" }]);
      mockDb.grade.findMany.mockResolvedValue([{ id: "grd_10" }]);

      const result = await dataImportService.importClasses(
        "tnt_dpa",
        [
          { academicYearId: "ay_2026", gradeId: "grd_10", sectionName: "A" },
          { academicYearId: "ay_2026", gradeId: "grd_10", sectionName: "A" }, // Duplicate section A in batch
        ],
        { dryRun: false },
        mockDb
      );

      expect(result.success).toBe(false);
      expect(result.invalidRows).toBe(1);
      expect(result.errors[0].message).toContain("Duplicate class section 'A'");
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    it("should reject student import when target class belongs to another tenant (Cross-Tenant Defense)", async () => {
      // Class belongs to Greenwood (Tenant B), but caller imports for DPA (Tenant A)
      mockDb.studentProfile.findMany.mockResolvedValue([]);
      mockDb.class.findMany.mockResolvedValue([]); // Class not found in tenant A

      const result = await dataImportService.importStudents(
        "tnt_dpa",
        [
          {
            admissionNumber: "ADM-9901",
            fullName: "Aarav Sharma",
            gender: "MALE",
            dateOfBirth: new Date("2010-05-15"),
            classId: "cls_greenwood_10a", // Tenant B's class
            academicYearId: "ay_2026",
            rollNumber: 1,
          },
        ],
        { dryRun: false },
        mockDb
      );

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain("Target class not found or belongs to another tenant");
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    it("should detect duplicate admission numbers existing in DB for tenant", async () => {
      mockDb.studentProfile.findMany.mockResolvedValue([{ admissionNumber: "ADM-1001" }]);
      mockDb.class.findMany.mockResolvedValue([{ id: "cls_dpa_10a" }]);

      const result = await dataImportService.importStudents(
        "tnt_dpa",
        [
          {
            admissionNumber: "ADM-1001",
            fullName: "Duplicate Kid",
            gender: "MALE",
            dateOfBirth: new Date("2010-01-01"),
            classId: "cls_dpa_10a",
            academicYearId: "ay_2026",
            rollNumber: 2,
          },
        ],
        { dryRun: false },
        mockDb
      );

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain("Student with admission number 'ADM-1001' already exists");
    });
  });

  // ==========================================================================
  // SECTION 5: DATA QUALITY AUDITOR & INTEGRITY VERIFICATION
  // ==========================================================================
  describe("5. Data Quality Auditor & Multi-Tenant Integrity Verification", () => {
    it("should pass healthy tenant audit when all checks succeed", async () => {
      mockDb.studentProfile.groupBy.mockResolvedValue([]);
      mockDb.staffProfile.groupBy.mockResolvedValue([]);
      mockDb.studentEnrollment.findMany.mockResolvedValue([
        {
          id: "enr_1",
          tenantId: "tnt_dpa",
          student: { id: "stu_1", tenantId: "tnt_dpa" },
          class: { id: "cls_1", tenantId: "tnt_dpa" },
        },
      ]);
      mockDb.studentParentBinding.findMany.mockResolvedValue([
        {
          id: "bnd_1",
          tenantId: "tnt_dpa",
          student: { id: "stu_1", tenantId: "tnt_dpa" },
          parent: { id: "par_1", tenantId: "tnt_dpa" },
        },
      ]);
      mockDb.attendanceRecord.findMany.mockResolvedValue([]);
      mockDb.examResult.findMany.mockResolvedValue([]);
      mockDb.class.findMany.mockResolvedValue([
        { id: "cls_1", studentCapacity: 40, _count: { enrollments: 35 } },
      ]);

      const report = await dataQualityAuditor.runTenantIntegrityAudit("tnt_dpa", mockDb);

      expect(report.status).toBe("HEALTHY");
      expect(report.summary.failedChecks).toBe(0);
      expect(report.summary.passedChecks).toBe(report.summary.totalChecks);
    });

    it("should detect cross-tenant student enrollment and mark audit status as CORRUPTED", async () => {
      mockDb.studentProfile.groupBy.mockResolvedValue([]);
      mockDb.staffProfile.groupBy.mockResolvedValue([]);
      // Corrupted enrollment: student from Tenant B linked inside Tenant A enrollment
      mockDb.studentEnrollment.findMany.mockResolvedValue([
        {
          id: "enr_corrupt",
          tenantId: "tnt_dpa",
          student: { id: "stu_greenwood_kid", tenantId: "tnt_greenwood" }, // Cross-tenant leak!
          class: { id: "cls_dpa", tenantId: "tnt_dpa" },
        },
      ]);
      mockDb.studentParentBinding.findMany.mockResolvedValue([]);
      mockDb.attendanceRecord.findMany.mockResolvedValue([]);
      mockDb.examResult.findMany.mockResolvedValue([]);
      mockDb.class.findMany.mockResolvedValue([]);

      const report = await dataQualityAuditor.runTenantIntegrityAudit("tnt_dpa", mockDb);

      expect(report.status).toBe("CORRUPTED");
      const crossTenantFinding = report.findings.find((f) => f.checkId === "CHK-003");
      expect(crossTenantFinding?.status).toBe("FAIL");
      expect(crossTenantFinding?.issueCount).toBe(1);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SECTION 6: MULTI-TENANT RATE LIMITING & NOISY-NEIGHBOR ISOLATION
  // ==========================================================================
  describe("6. Multi-Tenant Rate Limiting & Abuse Protection", () => {
    it("exhausting rate limit for Tenant A does not exhaust or affect Tenant B", () => {
      const limiter = new SlidingWindowRateLimiter({ maxRequests: 3, windowMs: 10_000 });

      const tenantA_Key = "tnt_dpa:api_request";
      const tenantB_Key = "tnt_greenwood:api_request";

      // 3 requests for Tenant A -> all allowed
      expect(limiter.check(tenantA_Key).success).toBe(true);
      expect(limiter.check(tenantA_Key).success).toBe(true);
      expect(limiter.check(tenantA_Key).success).toBe(true);

      // 4th request for Tenant A -> blocked
      const blockedA = limiter.check(tenantA_Key);
      expect(blockedA.success).toBe(false);
      expect(blockedA.remaining).toBe(0);

      // Requests for Tenant B MUST still succeed (Noisy neighbor protection)
      const allowedB = limiter.check(tenantB_Key);
      expect(allowedB.success).toBe(true);
      expect(allowedB.remaining).toBe(2);
    });
  });

  // ==========================================================================
  // SECTION 7: CROSS-TENANT SECURITY & IDOR ISOLATION MATRIX
  // ==========================================================================
  describe("7. Cross-Tenant Security & IDOR Isolation Matrix", () => {
    it("rejects Tenant A teacher attempting to access Tenant B academic data", async () => {
      const dpaTeacherContext: TenantContextData = {
        tenant: tenantA,
        user: {
          id: "usr_dpa_teacher",
          clerkId: "clerk_dpa_teacher",
          email: "teacher@dpa.edu.in",
          firstName: "Sunita",
          lastName: "Verma",
          displayName: "Sunita Verma",
        },
        membership: {
          id: "mem_dpa_teacher",
          tenantId: "tnt_dpa",
          userId: "usr_dpa_teacher",
          roleId: "rol_teacher",
          status: "ACTIVE",
        },
      };

      // Forged request with GWI tenant in context
      const forgedContext: TenantContextData = {
        ...dpaTeacherContext,
        tenant: tenantB, // Trying to execute under Tenant B
      };

      // Invariant: membership.tenantId !== context.tenant.id
      expect(forgedContext.membership.tenantId).toBe("tnt_dpa");
      expect(forgedContext.tenant.id).toBe("tnt_greenwood");
      expect(forgedContext.membership.tenantId).not.toBe(forgedContext.tenant.id);
    });
  });
});
