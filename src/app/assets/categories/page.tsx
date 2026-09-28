import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { assetService } from "@/lib/services/asset-service";

export default async function AssetCategoriesPage() {
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
  let categories: any[] = [];
  try {
    categories = await assetService.listCategories(tenantId);
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Categories</h1>
          <p className="text-sm text-slate-500">Asset classification, depreciation methods, and useful life rules</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Depreciation Method</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Useful Life</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Residual Value %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  No asset categories configured yet.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-700">{c.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{c.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{c.depreciationMethod}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-700">{c.usefulLifeMonths} months</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-slate-700">{c.residualValuePercent.toString()}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
