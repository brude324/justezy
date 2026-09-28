import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { inventoryService } from "@/lib/services/inventory-service";

export default async function InventoryWarehousesPage() {
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
  let warehouses: any[] = [];
  try {
    warehouses = await inventoryService.listWarehouses(tenantId);
  } catch {
    warehouses = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouses & Stores</h1>
          <p className="text-sm text-slate-500">Central store, campus branches, and lab stockrooms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            No warehouses registered yet.
          </div>
        ) : (
          warehouses.map((w) => (
            <div key={w.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-600 uppercase">{w.code}</span>
                  <h2 className="text-lg font-bold text-slate-900">{w.name}</h2>
                </div>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <p><strong>Manager:</strong> {w.managerStaff?.fullName || "Unassigned"}</p>
                <p><strong>Locations/Bins:</strong> {w.locations.length} designated areas</p>
                <p><strong>Tracked Items:</strong> {w._count.stocks} items in stock</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Link href={`/inventory/warehouses/${w.id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                  View Warehouse Stock →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
