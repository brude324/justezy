import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function AssetAssignmentsPage() {
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
  let assignments: any[] = [];
  try {
    assignments = await prismaTarget.assetAssignment.findMany({
      where: { tenantId },
      include: { asset: true },
      orderBy: { assignedDate: "desc" },
    });
  } catch {
    assignments = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Assignments & Custody</h1>
          <p className="text-sm text-slate-500">Equipment allocated to staff members, departments, labs, and students</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Tag</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Assigned Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Condition</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                  No active asset assignments recorded.
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-700 font-medium">
                    <Link href={`/assets/${a.asset.id}`}>{a.asset.assetTag}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{a.asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-700">{a.assignedToId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{a.assignedToType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(a.assignedDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                      {a.conditionOnAssign}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${a.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {a.status}
                    </span>
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
