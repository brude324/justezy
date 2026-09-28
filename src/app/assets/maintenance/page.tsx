import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function AssetMaintenancePage() {
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
  let maintenances: any[] = [];
  try {
    maintenances = await prismaTarget.assetMaintenance.findMany({
      where: { tenantId },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Maintenance & Servicing</h1>
          <p className="text-sm text-slate-500">Preventive inspections, repairs, calibration, and vendor servicing schedules</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Tag</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Maintenance Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Next Scheduled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {maintenances.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                  No maintenance records found.
                </td>
              </tr>
            ) : (
              maintenances.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-700 font-medium">{m.asset.assetTag}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{m.asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {m.maintenanceType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${m.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : m.status === "IN_PROGRESS" ? "bg-indigo-100 text-indigo-800" : "bg-amber-100 text-amber-800"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{m.vendorName || "In-house"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-medium text-slate-900">₹{m.cost.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {m.nextScheduledDate ? new Date(m.nextScheduledDate).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
