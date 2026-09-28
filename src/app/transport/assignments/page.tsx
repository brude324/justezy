import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";

export default async function TransportAssignmentsPage({
  searchParams,
}: {
  searchParams?: { routeId?: string; status?: string };
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
  const routeId = searchParams?.routeId;
  const status = searchParams?.status;

  let assignments: any[] = [];
  try {
    assignments = await prismaTarget.studentTransportAssignment.findMany({
      where: {
        tenantId,
        ...(routeId ? { routeId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        student: true,
        route: {
          include: {
            assignments: { where: { active: true }, include: { vehicle: true } },
          },
        },
        pickupStop: true,
        dropStop: true,
        passes: { where: { status: "ACTIVE" }, take: 1 },
      },
      orderBy: { effectiveFrom: "desc" },
      take: 50,
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Transport Allocations</h1>
          <p className="text-sm text-slate-500">Route seat occupancy, pickup and drop stops, and digital passes.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Assigned Route</th>
                <th className="px-6 py-3">Pickup Stop</th>
                <th className="px-6 py-3">Drop Stop</th>
                <th className="px-6 py-3">Digital Pass</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No student transport assignments recorded.
                  </td>
                </tr>
              ) : (
                assignments.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{a.student?.fullName}</p>
                      <p className="text-xs font-mono text-slate-400">{a.student?.admissionNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/transport/routes/${a.routeId}`} className="font-semibold text-sky-600 hover:underline">
                        {a.route?.routeCode}
                      </Link>
                      <p className="text-xs text-slate-500">{a.route?.name}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {a.pickupStop?.stopName}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {a.dropStop?.stopName}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-sky-700">
                      {a.passes[0]?.passNumber || a.passNumber || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          a.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
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
