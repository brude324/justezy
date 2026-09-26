import { describe, it, expect } from "vitest";
import {
  SYSTEM_MODULES,
  SYSTEM_PERMISSIONS,
  SYSTEM_ROLES,
  SYSTEM_PLANS,
} from "@/lib/seeds/system-seed";
import {
  DEMO_TENANT,
  DEMO_ACADEMIC_YEAR,
  DEMO_GRADES,
  DEMO_CLASSES,
  DEMO_SUBJECTS,
} from "@/lib/seeds/demo-seed";

describe("Database Seed System Invariants", () => {
  describe("Tier 1: System Foundations", () => {
    it("should define exactly 7 core and optional feature modules", () => {
      expect(SYSTEM_MODULES).toHaveLength(7);
      const coreModules = SYSTEM_MODULES.filter((m) => m.isCore);
      const optionalModules = SYSTEM_MODULES.filter((m) => !m.isCore);
      expect(coreModules).toHaveLength(3);
      expect(optionalModules).toHaveLength(4);
    });

    it("should define audited atomic permissions across categories", () => {
      expect(SYSTEM_PERMISSIONS).toHaveLength(68);

      // Verify no duplicate keys
      const keys = SYSTEM_PERMISSIONS.map((p) => p.permissionKey);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(SYSTEM_PERMISSIONS.length);
    });

    it("should define 6 predefined system roles with required default scopes", () => {
      expect(SYSTEM_ROLES).toHaveLength(6);
      const roleKeys = SYSTEM_ROLES.map((r) => r.roleKey);
      expect(roleKeys).toContain("INSTITUTION_OWNER");
      expect(roleKeys).toContain("PRINCIPAL");
      expect(roleKeys).toContain("TEACHER");
      expect(roleKeys).toContain("STAFF");
      expect(roleKeys).toContain("STUDENT");
      expect(roleKeys).toContain("PARENT");

      const teacherRole = SYSTEM_ROLES.find((r) => r.roleKey === "TEACHER");
      expect(teacherRole?.defaultScope).toBe("ASSIGNED_ONLY");

      const studentRole = SYSTEM_ROLES.find((r) => r.roleKey === "STUDENT");
      expect(studentRole?.defaultScope).toBe("SELF_ONLY");

      const parentRole = SYSTEM_ROLES.find((r) => r.roleKey === "PARENT");
      expect(parentRole?.defaultScope).toBe("LINKED_CHILDREN");
    });

    it("should define 3 commercial subscription plans with tier-bound quotas", () => {
      expect(SYSTEM_PLANS).toHaveLength(3);
      const tiers = SYSTEM_PLANS.map((p) => p.planKey);
      expect(tiers).toEqual(["STARTER", "ACADEMIC_PRO", "ENTERPRISE"]);

      const starter = SYSTEM_PLANS.find((p) => p.planKey === "STARTER")!;
      expect(starter.includedModules).toEqual(["core_academics", "attendance_module", "communication_module"]);
      expect(starter.monthlyPricePerStudent).toBe(15.0);

      const enterprise = SYSTEM_PLANS.find((p) => p.planKey === "ENTERPRISE")!;
      expect(enterprise.monthlyPricePerStudent).toBe(60.0);
      expect(enterprise.includedModules).toContain("report_card_module");
    });
  });

  describe("Tier 2: Demo Fixtures Consistency", () => {
    it("should configure demo tenant with valid attributes", () => {
      expect(DEMO_TENANT.id).toBe("tnt_demo_greenwood");
      expect(DEMO_TENANT.slug).toBe("greenwood-academy");
      expect(DEMO_TENANT.currency).toBe("INR");
    });

    it("should bind demo academic entities to the demo tenant", () => {
      expect(DEMO_ACADEMIC_YEAR.tenantId).toBe(DEMO_TENANT.id);
      expect(DEMO_GRADES.every((g) => g.tenantId === DEMO_TENANT.id)).toBe(true);
      expect(DEMO_CLASSES.every((c) => c.tenantId === DEMO_TENANT.id)).toBe(true);
      expect(DEMO_SUBJECTS.every((s) => s.tenantId === DEMO_TENANT.id)).toBe(true);
    });
  });
});
