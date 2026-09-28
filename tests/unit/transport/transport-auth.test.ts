import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModuleGate } from "@/lib/authorization/module-gate";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";
import { ModuleDisabledError, ScopeAccessDeniedError } from "@/lib/errors";

describe("Transport Authorization, Module Entitlement & AccessScope Tests", () => {
  let moduleGate: ModuleGate;
  let scopeEvaluator: ScopeEvaluator;
  let mockDb: any;

  const tenantAlpha = "tnt_alpha_school";
  const tenantBeta = "tnt_beta_academy";

  beforeEach(() => {
    moduleGate = new ModuleGate();
    scopeEvaluator = new ScopeEvaluator();
    mockDb = {
      tenantModuleEntitlement: {
        findUnique: vi.fn(),
      },
      transportDriver: {
        findFirst: vi.fn(),
      },
      transportAttendant: {
        findFirst: vi.fn(),
      },
      transportRouteAssignment: {
        findFirst: vi.fn(),
      },
      studentProfile: {
        findUnique: vi.fn(),
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
    };
  });

  describe("Module Entitlement Gating (transport_module)", () => {
    it("should allow transport operations when transport_module is enabled", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
        tenantId: tenantAlpha,
        moduleKey: "transport_module",
        isEnabled: true,
      });

      const isEnabled = await moduleGate.isModuleEnabled(tenantAlpha, "transport_module", mockDb);
      expect(isEnabled).toBe(true);
    });

    it("should reject operations with HTTP 402 ModuleDisabledError when transport_module is disabled", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue({
        tenantId: tenantAlpha,
        moduleKey: "transport_module",
        isEnabled: false,
      });

      await expect(
        moduleGate.assertModuleEnabled(tenantAlpha, "transport_module", mockDb)
      ).rejects.toThrow(ModuleDisabledError);
    });

    it("should reject operations with HTTP 402 when transport_module entitlement is missing", async () => {
      mockDb.tenantModuleEntitlement.findUnique.mockResolvedValue(null);

      await expect(
        moduleGate.assertModuleEnabled(tenantAlpha, "transport_module", mockDb)
      ).rejects.toThrow(ModuleDisabledError);
    });
  });

  describe("AccessScope Boundaries for Transport", () => {
    const mockContext = {
      tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
      user: { id: "usr_transport_coord", email: "transport@alpha.org" } as any,
      membership: { id: "mem_trans_1", status: "ACTIVE" } as any,
      role: { roleKey: "TRANSPORT_COORDINATOR" } as any,
      permissions: new Set(["transport.read", "transport.route_manage", "transport.vehicle_manage"]),
      scope: "INSTITUTION_WIDE" as any,
    };

    it("INSTITUTION_WIDE: Transport coordinator has full access across all routes and fleet", async () => {
      const allowed = await scopeEvaluator.evaluateScope(
        "INSTITUTION_WIDE",
        {
          permission: "transport.read",
          targetRouteId: "route_north_1",
        },
        mockContext,
        mockDb
      );
      expect(allowed).toBe(true);
    });

    it("ASSIGNED_ONLY: Driver has access to their assigned transport route roster", async () => {
      const driverContext = {
        tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
        user: { id: "usr_driver_ramesh", email: "ramesh@alpha.org" } as any,
        membership: { id: "mem_drv_1", status: "ACTIVE" } as any,
        role: { roleKey: "STAFF" } as any,
        permissions: new Set(["transport.read"]),
        scope: "ASSIGNED_ONLY" as any,
      };

      mockDb.transportDriver.findFirst.mockResolvedValue({
        id: "drv_ramesh",
        userId: "usr_driver_ramesh",
        tenantId: tenantAlpha,
      });
      mockDb.transportAttendant.findFirst.mockResolvedValue(null);
      mockDb.transportRouteAssignment.findFirst.mockResolvedValue({
        id: "rta_1",
        routeId: "route_north_1",
        driverId: "drv_ramesh",
        active: true,
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        {
          permission: "transport.read",
          targetRouteId: "route_north_1",
        },
        driverContext,
        mockDb
      );
      expect(allowed).toBe(true);
    });

    it("ASSIGNED_ONLY: Driver is rejected when attempting to access an unassigned route", async () => {
      const driverContext = {
        tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
        user: { id: "usr_driver_ramesh", email: "ramesh@alpha.org" } as any,
        membership: { id: "mem_drv_1", status: "ACTIVE" } as any,
        role: { roleKey: "STAFF" } as any,
        permissions: new Set(["transport.read"]),
        scope: "ASSIGNED_ONLY" as any,
      };

      mockDb.transportDriver.findFirst.mockResolvedValue({
        id: "drv_ramesh",
        userId: "usr_driver_ramesh",
        tenantId: tenantAlpha,
      });
      mockDb.transportAttendant.findFirst.mockResolvedValue(null);
      mockDb.transportRouteAssignment.findFirst.mockResolvedValue(null); // not assigned to south route

      const allowed = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        {
          permission: "transport.read",
          targetRouteId: "route_south_unassigned",
        },
        driverContext,
        mockDb
      );
      expect(allowed).toBe(false);
    });

    it("SELF_ONLY: Student can access own transport assignment", async () => {
      const studentContext = {
        tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
        user: { id: "usr_student_alice", email: "alice@alpha.org" } as any,
        membership: { id: "mem_stu_1", status: "ACTIVE" } as any,
        role: { roleKey: "STUDENT" } as any,
        permissions: new Set(["transport.read"]),
        scope: "SELF_ONLY" as any,
      };

      mockDb.studentProfile.findUnique.mockResolvedValue({
        id: "stu_alice_1",
        userId: "usr_student_alice",
        tenantId: tenantAlpha,
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        {
          permission: "transport.read",
          targetStudentId: "stu_alice_1",
        },
        studentContext,
        mockDb
      );
      expect(allowed).toBe(true);
    });

    it("LINKED_CHILDREN: Parent can access linked child's transport route and pass", async () => {
      const parentContext = {
        tenant: { id: tenantAlpha, status: "ACTIVE" } as any,
        user: { id: "usr_parent_carol", email: "carol@example.com" } as any,
        membership: { id: "mem_par_1", status: "ACTIVE" } as any,
        role: { roleKey: "PARENT" } as any,
        permissions: new Set(["transport.read"]),
        scope: "LINKED_CHILDREN" as any,
      };

      mockDb.parentProfile.findFirst.mockResolvedValue({
        id: "parent_1",
        userId: "usr_parent_carol",
        tenantId: tenantAlpha,
      });
      mockDb.studentParentBinding.findFirst.mockResolvedValue({
        id: "bind_1",
        parentId: "parent_1",
        studentId: "stu_alice_1",
        tenantId: tenantAlpha,
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        {
          permission: "transport.read",
          targetStudentId: "stu_alice_1",
        },
        parentContext,
        mockDb
      );
      expect(allowed).toBe(true);
    });
  });
});
