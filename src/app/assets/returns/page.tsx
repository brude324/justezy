import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function AssetReturnsPage() {
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
  let returns: any[] = [];
  try {
    returns = await prismaTarget.assetReturn.findMany({
      where: { tenantId },
      include: { asset: true, assignment: true },
      orderBy: { returnDate: "desc" },
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Returns</h1>
          <p className="text-sm text-slate-500">De-allocation history, returned condition assessment, and custody releases</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Tag</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Return Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Condition on Return</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {returns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  No asset return records found.
                </td>
              </tr>
            ) : (
              returns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-700 font-medium">{r.asset.assetTag}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{r.asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(r.returnDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                      {r.condition}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{r.notes || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
