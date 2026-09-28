import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";

export default async function LibraryReservationsPage() {
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
    reservations = await prismaTarget.libraryReservation.findMany({
      where: { tenantId },
      include: {
        member: { include: { studentProfile: true, user: true } },
        book: true,
      },
      orderBy: { requestedAt: "desc" },
      take: 50,
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Book Title Reservations</h1>
          <p className="text-sm text-slate-500">Hold requests and queue allocations for checked-out titles.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Book Title</th>
                <th className="px-6 py-3">Reserving Member</th>
                <th className="px-6 py-3">Requested At</th>
                <th className="px-6 py-3">Expiry At</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No active or historical reservations on file.
                  </td>
                </tr>
              ) : (
                reservations.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {r.book?.title}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">
                        {r.member?.studentProfile?.fullName || (r.member?.user ? `${r.member.user.firstName} ${r.member.user.lastName}` : "Member")}
                      </p>
                      <p className="text-xs font-mono text-slate-400">
                        {r.member?.memberCode}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {new Date(r.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {new Date(r.expiryAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          r.status === "FULFILLED"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
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
    </div>
  );
}
