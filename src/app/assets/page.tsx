import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { assetService } from "@/lib/services/asset-service";

export default async function AssetsOverviewPage() {
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

  let totalAssets = 0;
  let activeAssigned = 0;
  let underMaintenance = 0;
  let disposedCount = 0;

  try {
    const [total, assigned, maintenance, disposed] = await Promise.all([
      prismaTarget.asset.count({ where: { tenantId } }),
      prismaTarget.asset.count({ where: { tenantId, status: "ASSIGNED" } }),
      prismaTarget.asset.count({ where: { tenantId, status: "UNDER_MAINTENANCE" } }),
      prismaTarget.asset.count({ where: { tenantId, status: "DISPOSED" } }),
    ]);
    totalAssets = total;
    activeAssigned = assigned;
    underMaintenance = maintenance;
    disposedCount = disposed;
  } catch {}

  let assets: any[] = [];
  try {
    const res = await assetService.listAssets({ tenantId, take: 10 });
    assets = res.assets;
  } catch {
    assets = [];
  }

  const cards = [
    { title: "Total Fixed Assets", count: totalAssets, href: "/assets", color: "border-amber-500 text-amber-600 bg-amber-50" },
    { title: "Currently Assigned", count: activeAssigned, href: "/assets/assignments", color: "border-indigo-500 text-indigo-600 bg-indigo-50" },
    { title: "Under Maintenance", count: underMaintenance, href: "/assets/maintenance", color: "border-rose-500 text-rose-600 bg-rose-50" },
    { title: "Disposed / Written-Off", count: disposedCount, href: "/assets/disposals", color: "border-slate-500 text-slate-600 bg-slate-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fixed Asset Register</h1>
          <p className="text-sm text-slate-500">
            Institutional durable equipment, IT hardware, laboratory instruments, and lifecycle tracking.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className={`p-5 rounded-xl border-l-4 shadow-sm bg-white hover:shadow-md transition flex justify-between items-center ${c.color}`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.title}</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{c.count}</p>
            </div>
            <span className="text-sm font-medium underline">View</span>
          </Link>
        ))}
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">Recent Registered Assets</h2>
          <Link href="/assets/reports" className="text-xs font-semibold text-amber-700 hover:underline">
            Asset Register Report →
          </Link>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Tag</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Asset Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Condition</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Book Value</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-500">
                  No assets found in register.
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-amber-700 font-medium">
                    <Link href={`/assets/${a.id}`}>{a.assetTag}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{a.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{a.category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{a.location || "Central Campus"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                      {a.condition}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${a.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : a.status === "ASSIGNED" ? "bg-indigo-100 text-indigo-800" : a.status === "UNDER_MAINTENANCE" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-medium text-slate-900">
                    ₹{a.bookValue.toString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link href={`/assets/${a.id}`} className="text-amber-700 hover:text-amber-900 font-medium">
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
