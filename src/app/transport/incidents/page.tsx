import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { transportService } from "@/lib/services/transport-service";

export default async function TransportIncidentsPage({
  searchParams,
}: {
  searchParams?: { status?: string };
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
  const status = searchParams?.status as any;

  let incidents: any[] = [];
  try {
    incidents = await transportService.listIncidents(tenantId, status);
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Transport & Safety Incidents</h1>
          <p className="text-sm text-slate-500">Record vehicle breakdowns, route delays, safety alerts, and resolutions.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Route / Vehicle</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No transport incidents recorded.
                  </td>
                </tr>
              ) : (
                incidents.map((i: any) => (
                  <tr key={i.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <p className="font-semibold text-slate-900">
                        {new Date(i.incidentDate).toLocaleDateString()}
                      </p>
                      <p>{i.incidentTime || ""}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          i.severity === "CRITICAL"
                            ? "bg-rose-100 text-rose-800"
                            : i.severity === "HIGH"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {i.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {i.route && (
                        <p className="font-semibold text-slate-900">{i.route.routeCode}</p>
                      )}
                      {i.vehicle && (
                        <p className="font-mono text-slate-500">{i.vehicle.registrationNumber}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-800 max-w-xs truncate">
                      {i.description}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          i.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {i.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {i.resolutionNotes || "—"}
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
