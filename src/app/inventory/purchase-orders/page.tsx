import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function InventoryPurchaseOrdersPage() {
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
  let pos: any[] = [];
  try {
    pos = await prismaTarget.inventoryPurchaseOrder.findMany({
      where: { tenantId },
      include: { vendor: true, items: { include: { item: true } } },
      orderBy: { orderDate: "desc" },
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders (PO)</h1>
          <p className="text-sm text-slate-500">Vendor procurement orders, pricing, and fulfillment status</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">PO Number</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Order Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fulfillment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {pos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              pos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 font-medium">{p.poNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(p.orderDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{p.vendor.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${p.status === "RECEIVED" ? "bg-emerald-100 text-emerald-800" : p.status === "PARTIALLY_RECEIVED" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-slate-900">
                    ₹{p.totalAmount.toString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{p.items.length} items ordered</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
