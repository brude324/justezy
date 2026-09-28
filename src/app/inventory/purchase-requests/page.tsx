import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function InventoryPurchaseRequestsPage() {
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
  let prs: any[] = [];
  try {
    prs = await prismaTarget.inventoryPurchaseRequest.findMany({
      where: { tenantId },
      include: { items: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Requests (PR)</h1>
          <p className="text-sm text-slate-500">Internal department requisitions, approvals, and procurement workflows</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">PR Number</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Submitted Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Justification</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {prs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  No purchase requests found.
                </td>
              </tr>
            ) : (
              prs.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 font-medium">{p.prNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{p.department || "General"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${p.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : p.status === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 max-w-xs truncate">{p.justification || "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{p.items.length} items</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
