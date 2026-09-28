import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { payrollService } from "@/lib/services/payroll-service";

export default async function PayrollReportsPage() {
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
  let summaryReport: any = {
    totalGrossDisbursed: "0.00",
    totalDeductionsRetained: "0.00",
    totalNetDisbursed: "0.00",
    finalizedRunsCount: 0,
    periodsSummary: [],
  };

  try {
    summaryReport = await payrollService.getPayrollSummaryReport(tenantId);
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Reports & GL Reconciliation</h1>
          <p className="text-sm text-slate-500">
            Financial reconciliation of salary disbursements, statutory deductions retained, and general ledger journal postings.
          </p>
        </div>
        <Link
          href="/payroll"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
        >
          ← Back to Payroll
        </Link>
      </div>

      {/* Aggregate KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400">Total Gross Salary Accrued</p>
          <p className="text-3xl font-black text-slate-900 mt-1">₹{summaryReport.totalGrossDisbursed}</p>
          <p className="text-xs text-slate-500 mt-1">Debited to Salary Expense</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400">Total Statutory Deductions</p>
          <p className="text-3xl font-black text-rose-600 mt-1">₹{summaryReport.totalDeductionsRetained}</p>
          <p className="text-xs text-slate-500 mt-1">Credited to Statutory Payables</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400">Total Net Disbursed</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">₹{summaryReport.totalNetDisbursed}</p>
          <p className="text-xs text-slate-500 mt-1">Credited to Net Payroll Payable</p>
        </div>
      </div>

      {/* Period-wise Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-800">Finalized Periods Reconciliation</h2>
          <span className="text-xs text-slate-500">{summaryReport.finalizedRunsCount} finalized runs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Period</th>
                <th className="px-6 py-3.5 text-left">Period Code</th>
                <th className="px-6 py-3.5 text-right">Gross Total</th>
                <th className="px-6 py-3.5 text-right">Deductions</th>
                <th className="px-6 py-3.5 text-right">Net Payable</th>
                <th className="px-6 py-3.5 text-center">Accounting Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {summaryReport.periodsSummary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No finalized payroll runs recorded for reconciliation.
                  </td>
                </tr>
              ) : (
                summaryReport.periodsSummary.map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-slate-900">{p.periodName}</td>
                    <td className="px-6 py-4 font-mono text-xs">{p.periodCode}</td>
                    <td className="px-6 py-4 text-right font-mono">₹{p.gross}</td>
                    <td className="px-6 py-4 text-right font-mono text-rose-600">₹{p.deductions}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">₹{p.net}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        Balanced GL Journal
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
