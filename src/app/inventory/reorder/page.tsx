import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { inventoryService } from "@/lib/services/inventory-service";

export default async function InventoryReorderPage() {
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
  let lowStockAlerts: any[] = [];
  try {
    lowStockAlerts = await inventoryService.getLowStockAlerts(tenantId);
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reorder Rules & Low Stock Alerts</h1>
          <p className="text-sm text-slate-500">Automated replenishment thresholds and items below reorder point</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-rose-50 flex justify-between items-center">
          <h2 className="font-semibold text-rose-900">Items Requiring Immediate Replenishment ({lowStockAlerts.length})</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Warehouse</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Available Stock</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Reorder Point</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Reorder Qty</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Preferred Vendor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lowStockAlerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                  All items are sufficiently stocked above minimum reorder points.
                </td>
              </tr>
            ) : (
              lowStockAlerts.map((alert) => (
                <tr key={alert.rule.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 font-medium">
                    <Link href={`/inventory/items/${alert.rule.item.id}`}>{alert.rule.item.sku}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{alert.rule.item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{alert.rule.warehouse.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-rose-600">
                    {alert.available.toString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-slate-700">{alert.reorderPoint.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-indigo-600">{alert.reorderQuantity.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{alert.rule.preferredVendor?.name || "Unspecified"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
