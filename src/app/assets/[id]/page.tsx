import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { assetService } from "@/lib/services/asset-service";
import { notFound } from "next/navigation";

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
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

  let asset = null;
  try {
    asset = await assetService.getAsset(tenantId, params.id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/assets" className="text-sm text-amber-700 hover:underline mb-1 inline-block">
          ← Back to Asset Register
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{asset.name}</h1>
            <p className="text-sm font-mono text-slate-500">Asset Tag: {asset.assetTag} {asset.serialNumber ? `| S/N: ${asset.serialNumber}` : ""}</p>
          </div>
          <span className="px-3 py-1 text-sm font-semibold rounded-full bg-amber-100 text-amber-900">
            {asset.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Asset Specifications</h2>
          <div className="text-sm space-y-1 text-slate-600">
            <p><strong>Category:</strong> {asset.category.name}</p>
            <p><strong>Condition:</strong> {asset.condition}</p>
            <p><strong>Location:</strong> {asset.location || "Unassigned"}</p>
            <p><strong>Acquisition Date:</strong> {new Date(asset.acquisitionDate).toLocaleDateString()}</p>
            <p><strong>Acquisition Cost:</strong> ₹{asset.acquisitionCost.toString()}</p>
            <p><strong>Current Book Value:</strong> ₹{asset.bookValue.toString()}</p>
            <p><strong>Residual Value:</strong> ₹{asset.residualValue.toString()}</p>
            <p><strong>Useful Life:</strong> {asset.usefulLifeMonths} months</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 md:col-span-2 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Assignment History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase">
                  <th className="py-2 text-left">Assigned To</th>
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-left">Assigned Date</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Return Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asset.assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">No historical assignments</td>
                  </tr>
                ) : (
                  asset.assignments.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 font-mono font-medium text-slate-800">{a.assignedToId}</td>
                      <td className="py-2 text-slate-500">{a.assignedToType}</td>
                      <td className="py-2 text-slate-500">{new Date(a.assignedDate).toLocaleDateString()}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${a.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-500">{a.returnDate ? new Date(a.returnDate).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
