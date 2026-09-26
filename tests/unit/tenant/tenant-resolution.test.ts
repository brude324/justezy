import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TenantResolver,
  extractSubdomainFromHost,
} from "@/lib/tenant/tenant-resolver";
import { TenantNotFoundError, TenantSuspendedError } from "@/lib/errors";

describe("Server-Side Tenant Resolution (Step 4C)", () => {
  let resolver: TenantResolver;
  let mockDb: any;

  beforeEach(() => {
    resolver = new TenantResolver();
    mockDb = {
      tenant: {
        findUnique: vi.fn(),
      },
      tenantDomain: {
        findUnique: vi.fn(),
      },
    };
  });

  describe("extractSubdomainFromHost", () => {
    it("should extract institutional slug from platform subdomains", () => {
      expect(extractSubdomainFromHost("greenwood.schoolyardsms.in")).toBe("greenwood");
      expect(extractSubdomainFromHost("dps.schoolyard.in")).toBe("dps");
      expect(extractSubdomainFromHost("test-academy.localhost:3000")).toBe("test-academy");
    });

    it("should return null for platform root domains", () => {
      expect(extractSubdomainFromHost("schoolyardsms.in")).toBeNull();
      expect(extractSubdomainFromHost("localhost:3000")).toBeNull();
      expect(extractSubdomainFromHost("127.0.0.1")).toBeNull();
    });

    it("should return null for multi-level or malformed subdomains", () => {
      expect(extractSubdomainFromHost("sub.inner.schoolyard.in")).toBeNull();
    });
  });

  describe("resolveTenantFromHost", () => {
    it("should resolve active tenant via valid subdomain", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({
        id: "tnt_greenwood",
        slug: "greenwood",
        name: "Greenwood High",
        status: "ACTIVE",
      });

      const tenant = await resolver.resolveTenantFromHost("greenwood.schoolyard.in", mockDb);

      expect(mockDb.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: "greenwood" },
        include: { policy: true, branding: true },
      });
      expect(tenant?.id).toBe("tnt_greenwood");
    });

    it("should resolve active tenant via verified custom apex domain", async () => {
      mockDb.tenantDomain.findUnique.mockResolvedValue({
        domainName: "portal.greenwoodhigh.edu",
        isVerified: true,
        tenant: {
          id: "tnt_greenwood",
          name: "Greenwood High",
          status: "ACTIVE",
        },
      });

      const tenant = await resolver.resolveTenantFromHost("portal.greenwoodhigh.edu", mockDb);

      expect(mockDb.tenantDomain.findUnique).toHaveBeenCalledWith({
        where: { domainName: "portal.greenwoodhigh.edu" },
        include: {
          tenant: {
            include: { policy: true, branding: true },
          },
        },
      });
      expect(tenant?.id).toBe("tnt_greenwood");
    });

    it("should throw TenantNotFoundError when slug does not exist", async () => {
      mockDb.tenant.findUnique.mockResolvedValue(null);

      await expect(
        resolver.resolveTenantFromHost("nonexistent.schoolyard.in", mockDb)
      ).rejects.toThrow(TenantNotFoundError);
    });

    it("should throw TenantSuspendedError when tenant is SUSPENDED", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({
        id: "tnt_bad",
        slug: "delinquent",
        name: "Delinquent School",
        status: "SUSPENDED",
      });

      await expect(
        resolver.resolveTenantFromHost("delinquent.schoolyard.in", mockDb)
      ).rejects.toThrow(TenantSuspendedError);
    });

    it("should throw TenantNotFoundError for ARCHIVED tenant to prevent tenant enumeration", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({
        id: "tnt_dead",
        slug: "closed-school",
        name: "Closed School",
        status: "ARCHIVED",
      });

      await expect(
        resolver.resolveTenantFromHost("closed-school.schoolyard.in", mockDb)
      ).rejects.toThrow(TenantNotFoundError);
    });

    it("should return null for platform root hostname (marketing page)", async () => {
      const result = await resolver.resolveTenantFromHost("schoolyard.in", mockDb);
      expect(result).toBeNull();
      expect(mockDb.tenant.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("Security Invariant: Untrusted Client Headers", () => {
    it("should derive tenant strictly from Host/X-Forwarded-Host, ignoring arbitrary headers", async () => {
      mockDb.tenant.findUnique.mockResolvedValue({
        id: "tnt_legit",
        slug: "legit-school",
        name: "Legit School",
        status: "ACTIVE",
      });

      const headersMap = new Map<string, string>([
        ["host", "legit-school.schoolyard.in"],
        ["x-tenant-id", "attacker_controlled_tenant_id"], // Malicious client header
        ["tenantid", "attacker_controlled_tenant_id"],
      ]);

      const mockReq = {
        headers: {
          get: (name: string) => headersMap.get(name.toLowerCase()) || null,
        },
      };

      const tenant = await resolver.resolveTenantFromRequest(mockReq, mockDb);

      // Must resolve based on host slug, NOT attacker's header
      expect(tenant?.slug).toBe("legit-school");
      expect(mockDb.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: "legit-school" },
        include: { policy: true, branding: true },
      });
    });
  });
});
