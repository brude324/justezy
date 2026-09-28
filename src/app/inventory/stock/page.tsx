import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { inventoryService } from "@/lib/services/inventory-service";

export default async function InventoryStockPage({
  searchParams,
}: {
  searchParams?: { warehouseId?: string; lowStock?: string };
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
  let stocks: any[] = [];
  try {
    stocks = await inventoryService.listStock({
      tenantId,
      warehouseId: searchParams?.warehouseId,
      belowReorderOnly: searchParams?.lowStock === "true",
    });
  } catch {
    stocks = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Real-time Stock Levels</h1>
          <p className="text-sm text-slate-500">Live authoritative onHand, reserved, and available quantities across all locations</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Warehouse</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">On Hand</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Reserved</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Available</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Unit Cost</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Valuation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {stocks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-500">
                  No stock balances found matching criteria.
                </td>
              </tr>
            ) : (
              stocks.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600">
                    <Link href={`/inventory/items/${s.item.id}`}>{s.item.sku}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{s.item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.warehouse.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">{s.onHand.toString()} {s.item.unit.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-amber-600">{s.reserved.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-emerald-600">{s.available.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-slate-600">₹{s.unitCost.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-semibold text-slate-900">
                    ₹{s.onHand.mul(s.unitCost).toFixed(2)}
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
