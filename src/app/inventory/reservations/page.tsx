import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function InventoryReservationsPage() {
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
  let reservations: any[] = [];
  try {
    reservations = await prismaTarget.inventoryReservation.findMany({
      where: { tenantId },
      include: { item: true, warehouse: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Reservations</h1>
          <p className="text-sm text-slate-500">Reserved stock allocations for scheduled practical labs, exams, or projects</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reservation No</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Warehouse</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Qty Reserved</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reserved For</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                  No active stock reservations.
                </td>
              </tr>
            ) : (
              reservations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 font-medium">{r.reservationNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{r.item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{r.warehouse.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-amber-600">{r.quantity.toString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{r.reservedForType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${r.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {r.status}
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
