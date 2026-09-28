import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { inventoryService } from "@/lib/services/inventory-service";
import { notFound } from "next/navigation";

export default async function InventoryItemDetailPage({
  params,
}: {
  params: { id: string };
}) {
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

  let item = null;
  try {
    item = await inventoryService.getItem(tenantId, params.id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/inventory/items" className="text-sm text-indigo-600 hover:underline mb-1 inline-block">
            ← Back to Item Catalog
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
          <p className="text-sm font-mono text-slate-500">SKU: {item.sku} {item.barcode ? `| Barcode: ${item.barcode}` : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Catalog Specs</h2>
          <div className="text-sm space-y-1 text-slate-600">
            <p><strong>Category:</strong> {item.category?.name || "None"}</p>
            <p><strong>Unit:</strong> {item.unit.name} ({item.unit.code})</p>
            <p><strong>Valuation Method:</strong> {item.valuationMethod}</p>
            <p><strong>Unit Cost:</strong> ₹{item.unitCost.toString()}</p>
            <p><strong>Reorder Threshold:</strong> {item.reorderThreshold.toString()} {item.unit.code}</p>
            <p><strong>Reorder Quantity:</strong> {item.reorderQuantity.toString()} {item.unit.code}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 md:col-span-2 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Warehouse Stock Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase">
                  <th className="py-2 text-left">Warehouse</th>
                  <th className="py-2 text-left">Location / Bin</th>
                  <th className="py-2 text-right">On Hand</th>
                  <th className="py-2 text-right">Reserved</th>
                  <th className="py-2 text-right">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {item.stocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">No stock allocated to any warehouse</td>
                  </tr>
                ) : (
                  item.stocks.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 font-medium text-slate-800">{s.warehouse.name}</td>
                      <td className="py-2 text-slate-500">{s.location?.code || "Main"}</td>
                      <td className="py-2 text-right font-mono">{s.onHand.toString()}</td>
                      <td className="py-2 text-right font-mono text-amber-600">{s.reserved.toString()}</td>
                      <td className="py-2 text-right font-mono font-bold text-emerald-600">{s.available.toString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
