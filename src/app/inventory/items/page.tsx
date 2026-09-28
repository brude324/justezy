import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { inventoryService } from "@/lib/services/inventory-service";

export default async function InventoryItemsPage({
  searchParams,
}: {
  searchParams?: { search?: string; categoryId?: string };
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
  let items: any[] = [];
  let total = 0;
  try {
    const res = await inventoryService.listItems({
      tenantId,
      search: searchParams?.search,
      categoryId: searchParams?.categoryId,
    });
    items = res.items;
    total = res.total;
  } catch {
    items = [];
    total = 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Items Catalog</h1>
          <p className="text-sm text-slate-500">Manage institutional item SKUs, units, categories, and stock rules ({total} items)</p>
        </div>
        <Link
          href="/inventory"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          Add New Item
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reorder Level</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Cost</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                  No items found in catalog. Add items to begin tracking inventory.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-indigo-600">
                    <Link href={`/inventory/items/${item.id}`}>{item.sku}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.category?.name || "General"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.unit.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.reorderThreshold.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">₹{item.unitCost.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link href={`/inventory/items/${item.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                      Details
                    </Link>
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
