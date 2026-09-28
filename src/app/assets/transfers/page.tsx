import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function AssetTransfersPage() {
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
  let transfers: any[] = [];
  try {
    transfers = await prismaTarget.assetTransfer.findMany({
      where: { tenantId },
      include: { asset: true },
      orderBy: { transferDate: "desc" },
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Transfers</h1>
          <p className="text-sm text-slate-500">Relocation and custodian change history</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Tag</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">From Location</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">To Location</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Transfer Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  No asset transfer records found.
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-700 font-medium">{t.asset.assetTag}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{t.asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{t.fromLocation || "Central Storage"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{t.toLocation || "New Location"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(t.transferDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{t.reason || "Department Reassignment"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
