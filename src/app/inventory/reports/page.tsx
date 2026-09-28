import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { inventoryService } from "@/lib/services/inventory-service";

export default async function InventoryReportsPage() {
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
  let valuation: any = { totalValuation: 0, itemCount: 0 };
  let recentMovements: any[] = [];
  try {
    valuation = await inventoryService.getStockValuation(tenantId);
    recentMovements = await prismaTarget.inventoryStockMovement.findMany({
      where: { tenantId },
      include: { item: true },
      orderBy: { timestamp: "desc" },
      take: 20,
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Operational Reports</h1>
          <p className="text-sm text-slate-500">Valuation snapshots, stock movement audit trail, and consumption analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
          <p className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Total Inventory Value</p>
          <p className="text-3xl font-extrabold text-emerald-600">₹{valuation.totalValuation.toString()}</p>
          <p className="text-sm text-slate-600">Across {valuation.itemCount} distinct tracked stock allocations</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Recent Stock Movements Audit Trail</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Movement Type</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reference / Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {recentMovements.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  No stock movements recorded yet.
                </td>
              </tr>
            ) : (
              recentMovements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(m.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{m.item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono">
                      {m.movementType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-slate-900">{m.quantity.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{m.reason || m.referenceType || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
