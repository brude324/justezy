import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { transportService } from "@/lib/services/transport-service";

export default async function TransportOverviewPage() {
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

  const cards = [
    { title: "Active Routes", count: report.activeRoutes, href: "/transport/routes", color: "border-sky-500 text-sky-600 bg-sky-50" },
    { title: "Active Fleet Vehicles", count: report.activeVehicles, href: "/transport/vehicles", color: "border-blue-500 text-blue-600 bg-blue-50" },
    { title: "Enrolled Students", count: report.totalActiveAssignments, href: "/transport/assignments", color: "border-emerald-500 text-emerald-600 bg-emerald-50" },
    { title: "Licensed Drivers", count: report.totalDrivers, href: "/transport/drivers", color: "border-teal-500 text-teal-600 bg-teal-50" },
    { title: "Open Incidents", count: report.openIncidents, href: "/transport/incidents", color: "border-rose-500 text-rose-600 bg-rose-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transport & Fleet Management</h1>
          <p className="text-sm text-slate-500">
            Multi-tenant route scheduling, fleet capacity enforcement, driver allocations, and student transport passes.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/transport/routes"
            className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition"
          >
            Manage Routes
          </Link>
          <Link
            href="/transport/assignments"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            Assign Students
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className={`p-5 rounded-xl border-l-4 shadow-sm bg-white hover:shadow-md transition flex justify-between items-center ${c.color}`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.title}</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{c.count}</p>
            </div>
            <span className="text-sm font-medium underline">View</span>
          </Link>
        ))}
      </div>

      {/* Fleet Utilization Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">Route Occupancy & Capacity Utilization</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Route Code & Name</th>
                <th className="px-6 py-3">Assigned Vehicle</th>
                <th className="px-6 py-3">Stops</th>
                <th className="px-6 py-3">Enrolled / Capacity</th>
                <th className="px-6 py-3">Occupancy</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.routeOccupancies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No active transport routes configured yet.
                  </td>
                </tr>
              ) : (
                report.routeOccupancies.map((ro: any) => (
                  <tr key={ro.routeId} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <Link href={`/transport/routes/${ro.routeId}`} className="font-semibold text-slate-900 hover:text-sky-600">
                        {ro.routeCode}
                      </Link>
                      <p className="text-xs text-slate-500">{ro.routeName}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {ro.vehicleNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {ro.stopCount} stops
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {ro.enrolled} / {ro.capacity} seats
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              ro.occupancyPercent >= 100
                                ? "bg-rose-500"
                                : ro.occupancyPercent >= 80
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, ro.occupancyPercent)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {ro.occupancyPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/transport/routes/${ro.routeId}`}
                        className="text-sky-600 hover:underline font-medium text-xs"
                      >
                        Roster
                      </Link>
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
