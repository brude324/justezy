import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function InventoryReceiptsPage() {
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
  let receipts: any[] = [];
  try {
    receipts = await prismaTarget.inventoryReceipt.findMany({
      where: { tenantId },
      include: {
        warehouse: true,
        vendor: true,
        purchaseOrder: true,
        items: { include: { item: true } },
      },
      orderBy: { receivedAt: "desc" },
    });
  } catch {
    receipts = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Receipts</h1>
          <p className="text-sm text-slate-500">Vendor delivery receipts, invoice tracking, and GRN history</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Receipt No</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Warehouse</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">PO Ref</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Items Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  No stock receipt transactions recorded.
                </td>
              </tr>
            ) : (
              receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 font-medium">{r.receiptNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(r.receivedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{r.warehouse.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{r.vendor?.name || "Direct Supplier"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">{r.purchaseOrder?.poNumber || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{r.items.length} line items</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
