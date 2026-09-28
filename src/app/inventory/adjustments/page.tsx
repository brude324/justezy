import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function InventoryAdjustmentsPage() {
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
  let adjustments: any[] = [];
  try {
    adjustments = await prismaTarget.inventoryAdjustment.findMany({
      where: { tenantId },
      include: {
        warehouse: true,
        items: { include: { item: true } },
      },
      orderBy: { adjustedAt: "desc" },
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Adjustments & Audits</h1>
          <p className="text-sm text-slate-500">Physical inventory count reconciliation, damages, and expired stock corrections</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Adjustment No</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Warehouse</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reason / Justification</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Lines Adjusted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {adjustments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  No inventory adjustments recorded.
                </td>
              </tr>
            ) : (
              adjustments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 font-medium">{a.adjustmentNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(a.adjustedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{a.warehouse.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{a.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{a.items.length} items</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
