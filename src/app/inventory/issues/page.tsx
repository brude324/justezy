import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function InventoryIssuesPage() {
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
  let issues: any[] = [];
  try {
    issues = await prismaTarget.inventoryIssue.findMany({
      where: { tenantId },
      include: {
        warehouse: true,
        items: { include: { item: true } },
      },
      orderBy: { issuedAt: "desc" },
    });
  } catch {
    issues = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Issues & Dispatches</h1>
          <p className="text-sm text-slate-500">Material requisition fulfillment to departments, classrooms, and staff</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Issue No</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Issue Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Warehouse</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Issued To</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {issues.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  No stock issue transactions recorded.
                </td>
              </tr>
            ) : (
              issues.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 font-medium">{i.issueNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(i.issuedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{i.warehouse.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">{i.issuedToType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{i.reason || "Operational Use"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{i.items.length} items</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
