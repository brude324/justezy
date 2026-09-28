import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { transportService } from "@/lib/services/transport-service";

export default async function TransportRoutesPage({
  searchParams,
}: {
  searchParams?: { search?: string };
}) {
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
  const search = searchParams?.search;

  let routes: any = { items: [], total: 0 };
  try {
    routes = await transportService.listRoutes({
      tenantId,
      search,
      pageSize: 50,
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Transport Routes & Fleet Allocations</h1>
          <p className="text-sm text-slate-500">Route paths, scheduled stops, and assigned vehicles.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Route Code & Name</th>
                <th className="px-6 py-3">Direction</th>
                <th className="px-6 py-3">Operating Days & Time</th>
                <th className="px-6 py-3">Assigned Vehicle</th>
                <th className="px-6 py-3">Enrolled Students</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No transport routes defined yet.
                  </td>
                </tr>
              ) : (
                routes.items.map((r: any) => {
                  const vehicle = r.assignments[0]?.vehicle;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <Link href={`/transport/routes/${r.id}`} className="font-semibold text-slate-900 hover:text-sky-600">
                          {r.routeCode}
                        </Link>
                        <p className="text-xs text-slate-500">{r.name}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {r.direction}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        <p>{r.operatingDays}</p>
                        <p className="text-slate-400">{r.startTime || "07:30"} - {r.endTime || "16:00"}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-700">
                        {vehicle ? `${vehicle.registrationNumber} (${vehicle.capacity} seats)` : "None"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800">
                          {r._count?.studentAssignments || 0} students
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/transport/routes/${r.id}`}
                          className="text-sky-600 hover:underline font-medium text-xs"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
