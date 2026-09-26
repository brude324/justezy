import { AsyncLocalStorage } from "node:async_hooks";
import { TenantContextMissingError, UnauthorizedError } from "@/lib/errors";

export interface TenantContextData {
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: string;
    planTier: string;
  };
  user: {
    id: string;
    clerkId: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
  };
  membership: {
    id: string;
    tenantId: string;
    userId: string;
    roleId: string;
    status: string;
    role?: {
      id: string;
      roleKey: string;
      name: string;
    } | null;
  };
  requestId?: string;
}

export interface PlatformContextData {
  user: {
    id: string;
    clerkId: string;
    email: string;
  };
  platformRole: string;
  isSuperAdmin: boolean;
  requestId?: string;
}

const tenantLocalStorage = new AsyncLocalStorage<TenantContextData>();
const platformLocalStorage = new AsyncLocalStorage<PlatformContextData>();

/**
 * Runs a function within the scope of a validated Tenant Context.
 */
export async function runWithTenantContext<T>(
  context: TenantContextData,
  fn: () => Promise<T> | T
): Promise<T> {
  return tenantLocalStorage.run(context, fn);
}

/**
 * Retrieves the current Tenant Context if active, or null.
 */
export function getTenantContext(): TenantContextData | null {
  return tenantLocalStorage.getStore() || null;
}

/**
 * Requires an active Tenant Context, throwing TenantContextMissingError if absent.
 */
export function requireTenantContext(): TenantContextData {
  const context = tenantLocalStorage.getStore();
  if (!context) {
    throw new TenantContextMissingError("Operation requires an active, verified institutional tenant context");
  }
  return context;
}

/**
 * Runs a function within the scope of a Platform Control Plane Context.
 */
export async function runWithPlatformContext<T>(
  context: PlatformContextData,
  fn: () => Promise<T> | T
): Promise<T> {
  return platformLocalStorage.run(context, fn);
}

/**
 * Retrieves the current Platform Context if active, or null.
 */
export function getPlatformContext(): PlatformContextData | null {
  return platformLocalStorage.getStore() || null;
}

/**
 * Requires an active Platform Context, throwing UnauthorizedError if absent.
 */
export function requirePlatformContext(): PlatformContextData {
  const context = platformLocalStorage.getStore();
  if (!context) {
    throw new UnauthorizedError("Operation requires an active platform administrative context");
  }
  return context;
}
