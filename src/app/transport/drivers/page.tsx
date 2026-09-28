import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { transportService } from "@/lib/services/transport-service";

export default async function TransportDriversPage() {
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

  let drivers: any[] = [];
  let attendants: any[] = [];
  try {
    [drivers, attendants] = await Promise.all([
      transportService.listDrivers(tenantId),
      transportService.listAttendants(tenantId),
    ]);
  } catch {}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Drivers & Attendants Directory</h1>
        <p className="text-sm text-slate-500">Commercial driver license numbers, contact credentials, and staff allocations.</p>
      </div>

      {/* Drivers Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Licensed Drivers ({drivers.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Driver Name</th>
                <th className="px-6 py-3">Contact Phone</th>
                <th className="px-6 py-3">License Number</th>
                <th className="px-6 py-3">License Expiry</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-500">
                    No transport drivers registered.
                  </td>
                </tr>
              ) : (
                drivers.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{d.name}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">{d.phone}</td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-800">
                      {d.licenseNumber}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendants Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Bus Attendants ({attendants.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Attendant Name</th>
                <th className="px-6 py-3">Contact Phone</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendants.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-6 text-center text-slate-500">
                    No bus attendants registered.
                  </td>
                </tr>
              ) : (
                attendants.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">{a.name}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">{a.phone}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
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
    </div>
  );
}
