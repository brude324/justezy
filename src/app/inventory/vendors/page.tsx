import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { inventoryService } from "@/lib/services/inventory-service";

export default async function InventoryVendorsPage() {
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
  let vendors: any[] = [];
  try {
    vendors = await inventoryService.listVendors(tenantId);
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approved Vendors Directory</h1>
          <p className="text-sm text-slate-500">Procurement suppliers, contact metadata, and payment terms</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Vendor Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Vendor Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Contact Person</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Phone & Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">GST / Tax ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  No registered vendors found.
                </td>
              </tr>
            ) : (
              vendors.map((v) => (
                <tr key={v.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600">{v.vendorCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{v.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{v.contactName || "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{v.phone || v.email || "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{v.taxId || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
