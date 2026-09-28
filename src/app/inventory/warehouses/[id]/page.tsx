import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { inventoryService } from "@/lib/services/inventory-service";
import { notFound } from "next/navigation";

export default async function WarehouseDetailPage({
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

  let warehouse = null;
  try {
    warehouse = await inventoryService.getWarehouse(tenantId, params.id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory/warehouses" className="text-sm text-indigo-600 hover:underline mb-1 inline-block">
          ← Back to Warehouses
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{warehouse.name}</h1>
            <p className="text-sm font-mono text-slate-500">Store Code: {warehouse.code} | Manager: {warehouse.managerStaff?.fullName || "Unassigned"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Current Stock Inventory</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Location / Bin</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">On Hand</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Reserved</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Available</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {warehouse.stocks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  No stock items recorded in this warehouse.
                </td>
              </tr>
            ) : (
              warehouse.stocks.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600">
                    <Link href={`/inventory/items/${s.item.id}`}>{s.item.sku}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{s.item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{s.location?.code || "Default"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">{s.onHand.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-amber-600">{s.reserved.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-emerald-600">{s.available.toString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
