import { NextResponse } from "next/server";
import { prismaTarget } from "@/lib/prisma-target";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Readiness Probe: /api/health/ready
 *
 * Confirms that critical infrastructure dependencies (specifically PostgreSQL connectivity)
 * are healthy and ready to serve live tenant requests.
 *
 * Security Invariant: Never exposes database credentials, hostnames, or schema details in response.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Validate database connectivity using a safe, minimal query
    await prismaTarget.$queryRaw`SELECT 1 as ping`;

    return NextResponse.json(
      {
        status: "ready",
        database: "connected",
        timestamp,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err) {
    logger.error("Database readiness check failed", {
      errorName: err instanceof Error ? err.name : "Unknown",
      message: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        timestamp,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
