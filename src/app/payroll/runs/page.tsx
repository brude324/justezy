import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { payrollService } from "@/lib/services/payroll-service";

export default async function PayrollRunsPage({
  searchParams,
}: {
  searchParams: { status?: string; periodId?: string };
}) {
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
  const status = searchParams.status;
  const periodId = searchParams.periodId;

  let runs: any[] = [];
  try {
    runs = await payrollService.listPayrollRuns(tenantId, {
      status,
      periodId,
    });
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Institutional Payroll Runs</h1>
          <p className="text-sm text-slate-500">
            Batch payroll calculations, reviews, four-eye approvals, and immutable finalization.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/payroll/periods"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            Payroll Periods
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <form method="GET" className="flex flex-wrap gap-3 w-full">
          <select
            name="status"
            defaultValue={status || ""}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Run Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CALCULATED">Calculated</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="FINALIZED">Finalized</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            Filter
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Run #</th>
                <th className="px-6 py-3.5 text-left">Period</th>
                <th className="px-6 py-3.5 text-center">Staff Count</th>
                <th className="px-6 py-3.5 text-right">Gross Pay</th>
                <th className="px-6 py-3.5 text-right">Deductions</th>
                <th className="px-6 py-3.5 text-right">Net Payable</th>
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No payroll runs recorded.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-emerald-700">{r.runNumber}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{r.period?.name}</td>
                    <td className="px-6 py-4 text-center font-bold font-mono">{r.totalEmployees}</td>
                    <td className="px-6 py-4 text-right font-mono">₹{r.grossTotal.toString()}</td>
                    <td className="px-6 py-4 text-right font-mono text-rose-600">₹{r.deductionsTotal.toString()}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">₹{r.netTotal.toString()}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          r.status === "FINALIZED"
                            ? "bg-slate-100 text-slate-800 font-bold"
                            : r.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 font-semibold"
                            : r.status === "CALCULATED"
                            ? "bg-teal-100 text-teal-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/payroll/runs/${r.id}`}
                        className="text-xs text-emerald-600 hover:text-emerald-900 font-medium"
                      >
                        Manage →
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
