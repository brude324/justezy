import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function AssetReportsPage() {
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
  let assets: any[] = [];
  try {
    assets = await prismaTarget.asset.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: { acquisitionDate: "desc" },
    });
  } catch {}

  let totalAcquisitionCost = 0;
  let totalBookValue = 0;

  for (const a of assets) {
    totalAcquisitionCost += a.acquisitionCost.toNumber();
    totalBookValue += a.bookValue.toNumber();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Depreciation & Register Reports</h1>
          <p className="text-sm text-slate-500">Capitalized value, book value, and accumulated depreciation schedules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
          <p className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Total Capitalized Cost</p>
          <p className="text-3xl font-extrabold text-slate-900">₹{totalAcquisitionCost.toFixed(2)}</p>
          <p className="text-sm text-slate-500">Original historical asset acquisition total</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
          <p className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Current Net Book Value</p>
          <p className="text-3xl font-extrabold text-amber-700">₹{totalBookValue.toFixed(2)}</p>
          <p className="text-sm text-slate-500">After accounting for accumulated depreciation</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Fixed Asset Register Audit Snapshot</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tag</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Acquisition Cost</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Residual Value</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Net Book Value</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                  No assets in register.
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-700 font-medium">
                    <Link href={`/assets/${a.id}`}>{a.assetTag}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{a.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{a.category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">₹{a.acquisitionCost.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-slate-500">₹{a.residualValue.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-slate-900">₹{a.bookValue.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${a.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                      {a.status}
                    </span>
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
