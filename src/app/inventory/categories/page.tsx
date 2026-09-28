import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { inventoryService } from "@/lib/services/inventory-service";

export default async function InventoryCategoriesPage() {
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
    categories = await inventoryService.listCategories(tenantId);
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Categories</h1>
          <p className="text-sm text-slate-500">Hierarchical category classification for stationery, lab equipment, and consumables</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Parent Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Subcategories</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                  No inventory categories configured yet.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600">{c.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{c.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.parent?.name || "Root"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.children.length} subcategories</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
