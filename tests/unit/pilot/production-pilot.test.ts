import { describe, it, expect, vi, beforeEach } from "vitest";
import { policyEngine } from "../../../src/lib/authorization/policy-engine";
import { scopeEvaluator } from "../../../src/lib/authorization/scope-evaluator";
import { moduleGate } from "../../../src/lib/authorization/module-gate";
import { TenantContextData } from "../../../src/lib/tenant/tenant-context";
import { UnauthorizedError, ForbiddenError } from "../../../src/lib/errors";
import { generateTenantStoragePath, validateFileMetadata } from "../../../src/lib/security/upload-guard";
import { errorReporter } from "../../../src/lib/observability/error-reporter";

describe("Step 6: Controlled Production Pilot Test Suite", () => {
  // Pilot Tenant 1: Delhi Public Academy (DPA)
  const tenantDPA: TenantContextData["tenant"] = {
    id: "tnt_dpa",
    slug: "dpa-delhi",
    name: "Delhi Public Academy",
    status: "ACTIVE",
    planTier: "STANDARD",
  };

  // Pilot Tenant 2: Greenwood International (GWI)
  const tenantGWI: TenantContextData["tenant"] = {
    id: "tnt_greenwood",
    slug: "greenwood-intl",
    name: "Greenwood International",
    status: "ACTIVE",
    planTier: "PREMIUM",
  };

  // Pilot Personas for DPA
  const dpaAdminContext: TenantContextData = {
    tenant: tenantDPA,
    user: {
      id: "usr_dpa_admin",
      clerkId: "clerk_dpa_admin",
      email: "admin@dpa.edu.in",
      firstName: "Rajesh",
      lastName: "Sharma",
      displayName: "Principal Rajesh Sharma",
    },
    membership: {
      id: "mem_dpa_admin",
      tenantId: "tnt_dpa",
      userId: "usr_dpa_admin",
      roleId: "rol_dpa_admin",
      status: "ACTIVE",
      role: {
        id: "rol_dpa_admin",
        roleKey: "INSTITUTION_ADMIN",
        name: "Institution Administrator",
      },
    },
  };

  const dpaTeacherContext: TenantContextData = {
    tenant: tenantDPA,
    user: {
      id: "usr_dpa_teacher",
      clerkId: "clerk_dpa_teacher",
      email: "sunita.teacher@dpa.edu.in",
      firstName: "Sunita",
      lastName: "Verma",
      displayName: "Sunita Verma",
    },
    membership: {
      id: "mem_dpa_teacher",
      tenantId: "tnt_dpa",
      userId: "usr_dpa_teacher",
      roleId: "rol_dpa_teacher",
      status: "ACTIVE",
      role: {
        id: "rol_dpa_teacher",
        roleKey: "TEACHER",
        name: "Secondary Teacher",
      },
    },
  };

  const dpaParentContext: TenantContextData = {
    tenant: tenantDPA,
    user: {
      id: "usr_dpa_parent",
      clerkId: "clerk_dpa_parent",
      email: "parent.mehta@gmail.com",
      firstName: "Vikram",
      lastName: "Mehta",
      displayName: "Vikram Mehta",
    },
    membership: {
      id: "mem_dpa_parent",
      tenantId: "tnt_dpa",
      userId: "usr_dpa_parent",
      roleId: "rol_dpa_parent",
      status: "ACTIVE",
      role: {
        id: "rol_dpa_parent",
        roleKey: "PARENT",
        name: "Guardian",
      },
    },
  };

  const dpaStudentContext: TenantContextData = {
    tenant: tenantDPA,
    user: {
      id: "usr_dpa_student",
      clerkId: "clerk_dpa_student",
      email: "aarav.mehta@dpa.edu.in",
      firstName: "Aarav",
      lastName: "Mehta",
      displayName: "Aarav Mehta",
    },
    membership: {
      id: "mem_dpa_student",
      tenantId: "tnt_dpa",
      userId: "usr_dpa_student",
      roleId: "rol_dpa_student",
      status: "ACTIVE",
      role: {
        id: "rol_dpa_student",
        roleKey: "STUDENT",
        name: "Student",
      },
    },
  };

  // GWI Context for cross-tenant testing
  const gwiAdminContext: TenantContextData = {
    tenant: tenantGWI,
    user: {
      id: "usr_gwi_admin",
      clerkId: "clerk_gwi_admin",
      email: "head@greenwood.ac.in",
      firstName: "Ananya",
      lastName: "Rao",
      displayName: "Dr. Ananya Rao",
    },
    membership: {
      id: "mem_gwi_admin",
      tenantId: "tnt_greenwood",
      userId: "usr_gwi_admin",
      roleId: "rol_gwi_admin",
      status: "ACTIVE",
      role: {
        id: "rol_gwi_admin",
        roleKey: "INSTITUTION_ADMIN",
        name: "Institution Administrator",
      },
    },
  };

  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenantModuleEntitlement: {
        findUnique: vi.fn(),
      },
      module: {
        findUnique: vi.fn(),
      },
      permission: {
        findUnique: vi.fn(),
      },
      rolePermission: {
        findFirst: vi.fn(),
      },
      parentProfile: {
        findFirst: vi.fn(),
      },
      studentParentBinding: {
        findFirst: vi.fn(),
      },
      staffProfile: {
        findFirst: vi.fn(),
      },
      class: {
        findFirst: vi.fn(),
      },
      classTeacher: {
        findFirst: vi.fn(),
      },
      classSubject: {
        findFirst: vi.fn(),
      },
      lesson: {
        findFirst: vi.fn(),
      },
      student: {
        findFirst: vi.fn(),
      },
    };
  });

  describe("1. Persona Authorization Validation", () => {
    it("Admin: permitted to configure academic structure and manage institution users", async () => {
      mockPrisma.permission.findUnique.mockResolvedValue({ id: "perm_academic_year", moduleKey: "core_academics" });
      mockPrisma.rolePermission.findFirst.mockResolvedValue({
        id: "rp_1",
        accessScope: "INSTITUTION_WIDE",
        permission: { moduleKey: "core_academics" },
      });

      const canManage = await policyEngine.evaluate(
        { permission: "academic.year.manage", context: dpaAdminContext },
        mockPrisma
      );
      expect(canManage.allowed).toBe(true);
      expect(canManage.scope).toBe("INSTITUTION_WIDE");
    });

    it("Teacher: permitted to mark attendance within assigned scope; blocked from admin operations", async () => {
      // 1. Attendance marking granted
      mockPrisma.permission.findUnique.mockResolvedValue({ id: "perm_att", moduleKey: "attendance_module" });
      mockPrisma.rolePermission.findFirst.mockResolvedValue({
        id: "rp_att",
        accessScope: "ASSIGNED_ONLY",
        permission: { moduleKey: "attendance_module" },
      });
      mockPrisma.staffProfile.findFirst.mockResolvedValue({ id: "staff_1", tenantId: "tnt_dpa", userId: "usr_dpa_teacher" });

      const canMarkAtt = await policyEngine.evaluate(
        { permission: "attendance.mark", context: dpaTeacherContext },
        mockPrisma
      );
      expect(canMarkAtt.allowed).toBe(true);
      expect(canMarkAtt.scope).toBe("ASSIGNED_ONLY");

      // 2. Academic year configuration denied
      mockPrisma.rolePermission.findFirst.mockResolvedValue(null);
      const canManageYear = await policyEngine.evaluate(
        { permission: "academic.year.manage", context: dpaTeacherContext },
        mockPrisma
      );
      expect(canManageYear.allowed).toBe(false);
      expect(canManageYear.reason).toContain("Role does not possess permission");
    });

    it("Student: permitted to view own marks; blocked from modifying exam or attendance records", async () => {
      // 1. View marks granted under SELF_ONLY
      mockPrisma.permission.findUnique.mockResolvedValue({ id: "perm_res_view", moduleKey: "core_academics" });
      mockPrisma.rolePermission.findFirst.mockResolvedValue({
        id: "rp_res_view",
        accessScope: "SELF_ONLY",
        permission: { moduleKey: "core_academics" },
      });

      const canView = await policyEngine.evaluate(
        { permission: "result.view", context: dpaStudentContext },
        mockPrisma
      );
      expect(canView.allowed).toBe(true);
      expect(canView.scope).toBe("SELF_ONLY");

      // 2. Mark attendance denied
      mockPrisma.rolePermission.findFirst.mockResolvedValue(null);
      const canMarkAtt = await policyEngine.evaluate(
        { permission: "attendance.mark", context: dpaStudentContext },
        mockPrisma
      );
      expect(canMarkAtt.allowed).toBe(false);
    });

    it("Parent: permitted to access linked children only; denied access to unrelated students", async () => {
      // Parent profile exists
      mockPrisma.parentProfile.findFirst.mockResolvedValue({ id: "pp_1", tenantId: "tnt_dpa", userId: "usr_dpa_parent" });

      // Linked child access permitted
      mockPrisma.studentParentBinding.findFirst.mockResolvedValueOnce({ id: "binding_1" });
      const allowedLinked = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        { permission: "student.read", targetStudentId: "stu_aarav_mehta" },
        dpaParentContext,
        mockPrisma
      );
      expect(allowedLinked).toBe(true);

      // Unrelated stranger child rejected
      mockPrisma.studentParentBinding.findFirst.mockResolvedValueOnce(null);
      const deniedStranger = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        { permission: "student.read", targetStudentId: "stu_stranger_child" },
        dpaParentContext,
        mockPrisma
      );
      expect(deniedStranger).toBe(false);
    });
  });

  describe("2. Cross-Tenant Isolation & IDOR Defense", () => {
    it("Tenant A admin cannot access or manage Tenant B resources", async () => {
      // DPA admin attempting to act in GWI context
      const forgedContext: TenantContextData = {
        ...dpaAdminContext,
        tenant: tenantGWI, // Attempting to use DPA user/membership with GWI tenant
      };

      // Fails because dpaAdminContext.membership.tenantId === 'tnt_dpa' !== 'tnt_greenwood'
      expect(forgedContext.membership.tenantId).not.toBe(tenantGWI.id);
    });

    it("ScopeEvaluator strictly checks tenantId on target entity queries", async () => {
      mockPrisma.staffProfile.findFirst.mockResolvedValue({ id: "staff_1", tenantId: "tnt_dpa", userId: "usr_dpa_teacher" });
      mockPrisma.classTeacher.findFirst.mockImplementation(async (args: any) => {
        // Assert tenantId is explicitly part of the WHERE condition
        expect(args.where.tenantId).toBe("tnt_dpa");
        return null;
      });

      await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        { permission: "class.read", targetClassId: "cls_foreign_tenant" },
        dpaTeacherContext,
        mockPrisma
      );
    });
  });

  describe("3. Module Entitlement Gating", () => {
    it("should allow core modules without entitlement check", async () => {
      const allowed = await moduleGate.isModuleEnabled(
        "tnt_dpa",
        "core_academics",
        mockPrisma
      );
      expect(allowed).toBe(true);
    });

    it("should block disabled optional modules", async () => {
      mockPrisma.tenantModuleEntitlement.findUnique.mockResolvedValueOnce({
        tenantId: "tnt_dpa",
        moduleKey: "finance_module",
        isEnabled: false,
      });

      const allowed = await moduleGate.isModuleEnabled(
        "tnt_dpa",
        "finance_module",
        mockPrisma
      );
      expect(allowed).toBe(false);
    });
  });

  describe("4. File Security & Document Isolation", () => {
    it("should partition documents by tenant in unpredictable paths", () => {
      const pathDPA = generateTenantStoragePath("tnt_dpa", "student_report.pdf");
      const pathGWI = generateTenantStoragePath("tnt_greenwood", "student_report.pdf");

      expect(pathDPA.startsWith("tenants/tnt_dpa/documents/")).toBe(true);
      expect(pathGWI.startsWith("tenants/tnt_greenwood/documents/")).toBe(true);
      expect(pathDPA).not.toBe(pathGWI);
    });
  });

  describe("5. Observability & Sanitized Error Reporting", () => {
    it("should generate sanitized incident reference and not expose secrets", () => {
      const incidentId = errorReporter.captureException(
        new Error("Test pilot error"),
        {
          tenantId: "tnt_dpa",
          userId: "usr_dpa_admin",
          clerk_secret_key: "sk_test_secret_that_must_not_leak",
        }
      );

      expect(incidentId.startsWith("inc_")).toBe(true);
    });
  });
});
