import { prismaTarget } from "../src/lib/prisma-target";
import { logger } from "../src/lib/logger";

export interface IdentityReconciliationReport {
  timestamp: string;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersWithMissingClerkId: number;
  unverifiedEmailUsers: number;
  totalMemberships: number;
  activeMemberships: number;
  suspendedMemberships: number;
  orphanedMemberships: number;
  issues: string[];
}

/**
 * Validates identity consistency between Clerk identities, application Users,
 * and TenantMemberships.
 */
export async function reconcileIdentities(db = prismaTarget): Promise<IdentityReconciliationReport> {
  const issues: string[] = [];

  const users = await db.user.findMany({
    include: {
      memberships: true,
    },
  });

  let usersWithMissingClerkId = 0;
  let activeUsers = 0;
  let inactiveUsers = 0;
  let unverifiedEmailUsers = 0;

  for (const u of users) {
    if (!u.clerkId || u.clerkId.trim() === "") {
      usersWithMissingClerkId++;
      issues.push(`User ${u.id} has empty or missing clerkId`);
    }

    if (u.isActive) {
      activeUsers++;
    } else {
      inactiveUsers++;
    }

    if (!u.isEmailVerified) {
      unverifiedEmailUsers++;
    }
  }

  const memberships = await db.tenantMembership.findMany({
    include: {
      user: true,
      tenant: true,
    },
  });

  let activeMemberships = 0;
  let suspendedMemberships = 0;
  let orphanedMemberships = 0;

  for (const m of memberships) {
    if (m.status === "ACTIVE") {
      activeMemberships++;
    } else {
      suspendedMemberships++;
    }

    if (!m.user) {
      orphanedMemberships++;
      issues.push(`Membership ${m.id} references missing user ${m.userId}`);
    }
    if (!m.tenant) {
      orphanedMemberships++;
      issues.push(`Membership ${m.id} references missing tenant ${m.tenantId}`);
    }
    if (m.user && !m.user.isActive && m.status === "ACTIVE") {
      issues.push(`Membership ${m.id} is ACTIVE but user ${m.user.id} is marked inactive`);
    }
  }

  const report: IdentityReconciliationReport = {
    timestamp: new Date().toISOString(),
    totalUsers: users.length,
    activeUsers,
    inactiveUsers,
    usersWithMissingClerkId,
    unverifiedEmailUsers,
    totalMemberships: memberships.length,
    activeMemberships,
    suspendedMemberships,
    orphanedMemberships,
    issues,
  };

  return report;
}

async function main() {
  console.log("=== Running Identity & Membership Reconciliation Audit ===");
  try {
    const report = await reconcileIdentities();
    console.log(JSON.stringify(report, null, 2));

    if (report.issues.length > 0) {
      console.warn(`[WARNING] Found ${report.issues.length} identity consistency issues`);
    } else {
      console.log("✔ Zero identity consistency issues found");
    }
  } catch (err) {
    console.error("Identity reconciliation failed:", err);
    process.exit(1);
  } finally {
    await prismaTarget.$disconnect();
  }
}

if (require.main === module) {
  main();
}
