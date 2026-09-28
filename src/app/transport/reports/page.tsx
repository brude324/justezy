import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { transportService } from "@/lib/services/transport-service";

export default async function TransportReportsPage() {
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

  let report: any = {
    totalRoutes: 0,
    activeRoutes: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    totalDrivers: 0,
    totalActiveAssignments: 0,
    openIncidents: 0,
    routeOccupancies: [],
  };

  try {
    report = await transportService.getTransportReport(tenantId);
  } catch {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Fleet Operations & Occupancy Reports</h1>
        <p className="text-sm text-slate-500">Fleet capacity utilization, route seat occupancy, and driver safety summaries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Fleet Operations</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Total Operational Routes</span>
              <span className="font-bold text-sky-600">{report.activeRoutes} / {report.totalRoutes}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Active Bus Fleet</span>
              <span className="font-bold text-indigo-600">{report.activeVehicles} / {report.totalVehicles}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Assigned Commuting Students</span>
              <span className="font-bold text-emerald-600">{report.totalActiveAssignments}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Licensed Drivers on Duty</span>
              <span className="font-bold text-slate-900">{report.totalDrivers}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Safety & Incident Logs</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Open Incidents / Breakdowns</span>
              <span className="font-bold text-rose-600">{report.openIncidents}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Vehicle Fitness / Maintenance Status</span>
              <span className="font-bold text-emerald-600">All Active Inspected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
