import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { payrollService } from "@/lib/services/payroll-service";

export default async function PayrollPeriodsPage() {
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
  let periods: any[] = [];

  try {
    periods = await payrollService.listPayrollPeriods(tenantId);
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Periods & Cycles</h1>
          <p className="text-sm text-slate-500">
            Institutional monthly and bi-weekly pay cycles with state-machine locks.
          </p>
        </div>
        <Link
          href="/payroll/runs"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          View Runs →
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Code</th>
                <th className="px-6 py-3.5 text-left">Period Name</th>
                <th className="px-6 py-3.5 text-left">Year / Month</th>
                <th className="px-6 py-3.5 text-left">Date Range</th>
                <th className="px-6 py-3.5 text-left">Working Days</th>
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No payroll periods created yet.
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-teal-700">{p.code}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                    <td className="px-6 py-4 text-xs font-mono">{p.year} / {p.month.toString().padStart(2, '0')}</td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(p.startDate).toLocaleDateString()} → {new Date(p.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-800">{p.workingDays} days</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          p.status === "FINALIZED" || p.status === "LOCKED"
                            ? "bg-slate-100 text-slate-800 font-semibold"
                            : p.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 font-semibold"
                            : p.status === "OPEN"
                            ? "bg-teal-100 text-teal-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/payroll/periods/${p.id}`}
                        className="text-xs text-teal-600 hover:text-teal-900 font-medium"
                      >
                        Details →
                      </Link>
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
