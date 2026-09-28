import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function AssetDisposalsPage() {
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
  let disposals: any[] = [];
  try {
    disposals = await prismaTarget.assetDisposal.findMany({
      where: { tenantId },
      include: { asset: true },
      orderBy: { disposalDate: "desc" },
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Disposals & Write-Offs</h1>
          <p className="text-sm text-slate-500">Decommissioned equipment, scrap sales, donations, and salvage records</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Tag</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Disposal Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Disposal Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Proceeds</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {disposals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  No disposed or written-off assets recorded.
                </td>
              </tr>
            ) : (
              disposals.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-700 font-medium">{d.asset.assetTag}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{d.asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {d.disposalType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {d.disposalDate ? new Date(d.disposalDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 max-w-xs truncate">{d.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-medium text-emerald-600">
                    ₹{d.proceedsAmount.toString()}
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
