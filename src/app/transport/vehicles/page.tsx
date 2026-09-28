import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { transportService } from "@/lib/services/transport-service";

export default async function TransportVehiclesPage() {
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

  let vehicles: any[] = [];
  try {
    vehicles = await transportService.listVehicles(tenantId);
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Vehicle Fleet Inventory</h1>
          <p className="text-sm text-slate-500">Fleet capacity, vehicle registration numbers, and operational status.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Registration Number</th>
                <th className="px-6 py-3">Type & Make</th>
                <th className="px-6 py-3">Seating Capacity</th>
                <th className="px-6 py-3">Assigned Route</th>
                <th className="px-6 py-3">Insurance Expiry</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No fleet vehicles registered in tenant yet.
                  </td>
                </tr>
              ) : (
                vehicles.map((v: any) => {
                  const assignedRoute = v.routeAssignments[0]?.route;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {v.registrationNumber}
                      </td>
                      <td className="px-6 py-4 text-slate-800">
                        <p className="font-semibold">{v.vehicleType}</p>
                        <p className="text-xs text-slate-500">{v.make} {v.model}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {v.capacity} seats
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {assignedRoute ? (
                          <Link href={`/transport/routes/${assignedRoute.id}`} className="text-sky-600 hover:underline">
                            {assignedRoute.routeCode}
                          </Link>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            v.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : v.status === "MAINTENANCE"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {v.status}
                        </span>
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
