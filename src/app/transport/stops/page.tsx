import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";

export default async function TransportStopsPage() {
  const reqHeaders = headers();
  const host = reqHeaders.get("host") || "";
  const tenantSlug = host.split(".")[0] || "demo";

  let tenant = null;
  try {
    tenant = await prismaTarget.tenant.findFirst({
      where: { OR: [{ slug: tenantSlug }, { id: tenantSlug }] },
    });
  } catch {}

  const tenantId = tenant?.id || "demo";

  let stops: any[] = [];
  try {
    stops = await prismaTarget.transportStop.findMany({
      where: { tenantId, active: true },
      include: { route: true },
      orderBy: [{ routeId: "asc" }, { sequence: "asc" }],
      take: 100,
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Scheduled Transport Stops</h1>
          <p className="text-sm text-slate-500">Pick-up and drop-off points, landmarks, and arrival timings.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Route</th>
                <th className="px-6 py-3">Seq #</th>
                <th className="px-6 py-3">Stop Name</th>
                <th className="px-6 py-3">Landmark</th>
                <th className="px-6 py-3">Pickup Time</th>
                <th className="px-6 py-3">Drop Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No transport stops configured on any route yet.
                  </td>
                </tr>
              ) : (
                stops.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <Link href={`/transport/routes/${s.routeId}`} className="hover:text-sky-600">
                        {s.route?.routeCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-700">
                      #{s.sequence}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {s.stopName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {s.landmark || "—"}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">
                      {s.pickupTime || "—"}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">
                      {s.dropTime || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
