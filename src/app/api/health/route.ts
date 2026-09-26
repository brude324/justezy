import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness Probe: /api/health
 *
 * Confirms the Next.js application server process is running and able to handle HTTP traffic.
 * Safe for public uptime monitors and container orchestrators (e.g. Kubernetes livenessProbe).
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
