import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";
import { TenantNotFoundError, TenantSuspendedError, ForbiddenError } from "@/lib/errors";

const PLATFORM_ROOT_DOMAINS = [
  "schoolyardsms.in",
  "schoolyard.in",
  "justezy.com",
  "localhost",
  "127.0.0.1",
];

export interface ResolveTenantOptions {
  platformDomains?: string[];
}

/**
 * Extracts a candidate tenant slug from a hostname.
 * Examples:
 * - "greenwood.schoolyard.in" -> "greenwood"
 * - "dps.localhost:3000" -> "dps"
 * - "localhost:3000" -> null
 * - "schoolyard.in" -> null
 */
export function extractSubdomainFromHost(
  host: string,
  platformDomains = PLATFORM_ROOT_DOMAINS
): string | null {
  if (!host) return null;

  // Strip port
  const hostname = host.split(":")[0].toLowerCase().trim();

  // Check if exactly a platform root domain
  if (platformDomains.includes(hostname)) {
    return null;
  }

  // Check if subdomain of a platform domain
  for (const root of platformDomains) {
    if (hostname.endsWith(`.${root}`)) {
      const sub = hostname.slice(0, -(root.length + 1));
      if (sub && !sub.includes(".")) {
        return sub;
      }
    }
  }

  return null;
}

export class TenantResolver {
  /**
   * Resolves the authoritative Tenant from the request hostname or verified custom domain.
   *
   * SECURITY INVARIANT:
   * Client-supplied parameters (like ?tenantId=... or header X-Tenant-ID) are NEVER trusted.
   */
  async resolveTenantFromHost(host: string, db = prismaTarget) {
    if (!host) {
      return null;
    }

    const cleanHost = host.split(":")[0].toLowerCase().trim();

    // 1. Try subdomain resolution
    const subdomain = extractSubdomainFromHost(cleanHost);
    if (subdomain) {
      const tenant = await db.tenant.findUnique({
        where: { slug: subdomain },
        include: {
          policy: true,
          branding: true,
        },
      });

      if (!tenant) {
        throw new TenantNotFoundError(`Institution with slug '${subdomain}' not found`);
      }

      if (tenant.status === "PROVISIONING") {
        throw new ForbiddenError(`Institution '${tenant.name}' is currently being provisioned`);
      }

      if (tenant.status === "SUSPENDED") {
        throw new TenantSuspendedError(`Institution '${tenant.name}' is currently suspended`);
      }

      if (tenant.status === "ARCHIVED") {
        // Mask archived institutions as Not Found for security & tenant enumeration prevention
        throw new TenantNotFoundError(`Institution with slug '${subdomain}' not found`);
      }

      return tenant;
    }

    // 2. Try verified custom apex domain lookup
    const customDomain = await db.tenantDomain.findUnique({
      where: { domainName: cleanHost },
      include: {
        tenant: {
          include: {
            policy: true,
            branding: true,
          },
        },
      },
    });

    if (customDomain && customDomain.isVerified && customDomain.tenant) {
      const tenant = customDomain.tenant;
      if (tenant.status === "PROVISIONING") {
        throw new ForbiddenError(`Institution '${tenant.name}' is currently being provisioned`);
      }
      if (tenant.status === "SUSPENDED") {
        throw new TenantSuspendedError(`Institution '${tenant.name}' is currently suspended`);
      }
      if (tenant.status === "ARCHIVED") {
        throw new TenantNotFoundError(`Domain '${cleanHost}' is not active`);
      }
      return tenant;
    }

    return null;
  }

  /**
   * Resolves tenant from request headers.
   */
  async resolveTenantFromRequest(
    req: { headers: { get: (name: string) => string | null } },
    db = prismaTarget
  ) {
    // Determine host strictly from host or x-forwarded-host
    const host =
      req.headers.get("x-forwarded-host") || req.headers.get("host") || "";

    return this.resolveTenantFromHost(host, db);
  }
}

export const tenantResolver = new TenantResolver();
