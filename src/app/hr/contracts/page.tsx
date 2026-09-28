import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function HRContractsPage() {
  const reqHeaders = headers();
  const host = reqHeaders.get("host") || "";
  const tenantSlug = host.split(".")[0] || "demo";

  let tenant = null;
  try {
    tenant = await prismaTarget.tenant.findFirst({
      where: { OR: [{ slug: tenantSlug }, { id: tenantSlug }] },
    });
  } catch {
    // Dev fallback
  }

  const tenantId = tenant?.id || "demo";
  let contracts: any[] = [];

  try {
    contracts = await prismaTarget.hREmploymentContract.findMany({
      where: { tenantId },
      include: {
        employment: {
          include: {
            staffProfile: { include: { user: true } },
            department: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
      take: 50,
    });
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employment Contracts</h1>
          <p className="text-sm text-slate-500">
            Formal staff agreements, fixed-term appointments, probation covenants, and notice periods.
          </p>
        </div>
        <Link
          href="/hr"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
        >
          ← Back to HR
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Contract #</th>
                <th className="px-6 py-3.5 text-left">Employee</th>
                <th className="px-6 py-3.5 text-left">Type</th>
                <th className="px-6 py-3.5 text-left">Start Date</th>
                <th className="px-6 py-3.5 text-left">End Date</th>
                <th className="px-6 py-3.5 text-left">Probation (days)</th>
                <th className="px-6 py-3.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No employment contracts found.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => {
                  const emp = c.employment;
                  const name = emp?.staffProfile?.user
                    ? `${emp.staffProfile.user.firstName || ""} ${emp.staffProfile.user.lastName || ""}`.trim()
                    : "Staff Member";
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-indigo-700">{c.contractNumber}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <Link href={`/hr/employees/${emp?.id}`} className="hover:underline">
                          {name}
                        </Link>
                        <span className="block text-xs text-slate-400 font-mono">{emp?.employeeNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold">{c.employmentType}</td>
                      <td className="px-6 py-4 text-xs">{new Date(c.startDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-xs">
                        {c.endDate ? new Date(c.endDate).toLocaleDateString() : "Permanent / Indefinite"}
                      </td>
                      <td className="px-6 py-4 text-xs">{c.probationPeriodDays ?? "N/A"}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            c.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : c.status === "EXPIRED"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
