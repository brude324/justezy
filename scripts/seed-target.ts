import { prismaTarget } from "../src/lib/prisma-target";
import { seedSystemFoundations, seedDemoFixtures } from "../src/lib/seeds/seed-runner";
import { logger } from "../src/lib/logger";

async function main() {
  logger.info("[Seed] Starting target database seeding...");

  const startTime = Date.now();

  // Tier 1: System Foundations
  const systemResults = await seedSystemFoundations(prismaTarget);
  logger.info("[Seed] Tier 1 System Foundations seeded successfully", {
    modules: systemResults.modulesSeeded,
    permissions: systemResults.permissionsSeeded,
    roles: systemResults.rolesSeeded,
    rolePermissions: systemResults.rolePermissionsBound,
    plans: systemResults.plansSeeded,
  });

  // Tier 2: Demo Fixtures (Non-production)
  if (process.env.NODE_ENV !== "production") {
    logger.info("[Seed] Seeding Tier 2 Development & Staging Demo Fixtures...");
    await seedDemoFixtures(prismaTarget);
    logger.info("[Seed] Tier 2 Demo Fixtures seeded successfully.");
  } else {
    logger.info("[Seed] Production environment detected; skipping Tier 2 demo fixtures.");
  }

  const durationMs = Date.now() - startTime;
  logger.info("[Seed] Seeding completed cleanly", { durationMs });
}

main()
  .catch((err) => {
    logger.error("[Seed Failure] An unhandled error occurred during database seeding", {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  })
  .finally(async () => {
    await prismaTarget.$disconnect();
  });
