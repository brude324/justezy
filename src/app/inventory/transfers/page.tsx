import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function InventoryTransfersPage() {
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
  let transfers: any[] = [];
  try {
    transfers = await prismaTarget.inventoryTransfer.findMany({
      where: { tenantId },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        items: { include: { item: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inter-Warehouse Transfers</h1>
          <p className="text-sm text-slate-500">Stock movements between main warehouses, branch stores, and labs</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Transfer No</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">From Store</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">To Store</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Shipped Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  No inter-warehouse transfers recorded.
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 font-medium">{t.transferNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{t.sourceWarehouse.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{t.destinationWarehouse.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${t.status === "RECEIVED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {t.shippedAt ? new Date(t.shippedAt).toLocaleDateString() : "Pending"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{t.items.length} items</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
