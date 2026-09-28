import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { transportService } from "@/lib/services/transport-service";
import { notFound } from "next/navigation";

export default async function TransportRouteDetailPage({
  params,
}: {
  params: { id: string };
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

  let route = null;
  try {
    route = await transportService.getRoute(tenantId, params.id);
  } catch {
    notFound();
  }

  if (!route) {
    notFound();
  }

  const activeVehicle = route.assignments[0]?.vehicle;
  const activeDriver = route.assignments[0]?.driver;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/transport/routes" className="text-sm font-medium text-slate-500 hover:text-sky-600">
          ← Back to Routes
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-6">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase tracking-wide">
            Route {route.routeCode}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">{route.name}</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs text-slate-500">
            <div>
              <span className="block font-medium text-slate-400">Direction</span>
              <span className="text-slate-800 font-semibold">{route.direction}</span>
            </div>
            <div>
              <span className="block font-medium text-slate-400">Operating Days</span>
              <span className="text-slate-800 font-semibold">{route.operatingDays}</span>
            </div>
            <div>
              <span className="block font-medium text-slate-400">Assigned Bus</span>
              <span className="text-slate-800 font-semibold font-mono">
                {activeVehicle?.registrationNumber || "Unassigned"} ({activeVehicle?.capacity || 0} seats)
              </span>
            </div>
            <div>
              <span className="block font-medium text-slate-400">Assigned Driver</span>
              <span className="text-slate-800 font-semibold">{activeDriver?.name || "Unassigned"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stops Sequence Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">Scheduled Stops ({route.stops?.length || 0})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Sequence</th>
                <th className="px-6 py-3">Stop Name</th>
                <th className="px-6 py-3">Landmark</th>
                <th className="px-6 py-3">Pickup Time</th>
                <th className="px-6 py-3">Drop Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {route.stops?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-500">
                    No scheduled stops defined for this route.
                  </td>
                </tr>
              ) : (
                route.stops.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
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

      {/* Enrolled Students Roster Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">
            Enrolled Students Roster ({route.studentAssignments?.length || 0} / {activeVehicle?.capacity || 0} seats)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">Admission #</th>
                <th className="px-6 py-3">Pickup Stop</th>
                <th className="px-6 py-3">Drop Stop</th>
                <th className="px-6 py-3">Pass Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {route.studentAssignments?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-500">
                    No students currently assigned to this transport route.
                  </td>
                </tr>
              ) : (
                route.studentAssignments.map((sa: any) => (
                  <tr key={sa.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {sa.student?.fullName}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {sa.student?.admissionNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {sa.pickupStop?.stopName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {sa.dropStop?.stopName}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-sky-600 font-semibold">
                      {sa.passNumber || "—"}
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
