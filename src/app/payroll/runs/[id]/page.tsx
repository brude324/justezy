import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { payrollService } from "@/lib/services/payroll-service";

export default async function PayrollRunDetailPage({ params }: { params: { id: string } }) {
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

  let run: any = null;
  try {
    run = await payrollService.getPayrollRun(tenantId, params.id);
  } catch {
    //
  }

  if (!run) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/payroll/runs" className="hover:text-emerald-600">
          Payroll Runs
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Run {run.runNumber}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Run #{run.runNumber}</h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                run.status === "FINALIZED"
                  ? "bg-slate-100 text-slate-800"
                  : run.status === "APPROVED"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-teal-100 text-teal-800"
              }`}
            >
              {run.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Period: <span className="font-semibold text-slate-800">{run.period?.name}</span> • Effective {run.period?.startDate ? new Date(run.period.startDate).toLocaleDateString() : ""}
          </p>
        </div>

        <div className="flex gap-2">
          {run.status === "FINALIZED" ? (
            <Link
              href={`/payroll/payslips?periodId=${run.periodId}`}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
            >
              View Generated Payslips →
            </Link>
          ) : (
            <span className="text-xs text-slate-400 font-medium self-center">
              Lifecycle: Calculate → Review → Approve → Finalize
            </span>
          )}
        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Total Enrolled</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{run.totalEmployees} Staff</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Gross Earnings</p>
          <p className="text-2xl font-black text-teal-600 mt-1">₹{run.grossTotal.toString()}</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Total Deductions</p>
          <p className="text-2xl font-black text-rose-600 mt-1">₹{run.deductionsTotal.toString()}</p>
        </div>
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">Net Disbursable</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">₹{run.netTotal.toString()}</p>
        </div>
      </div>

      {/* Financial Accounting Posting Status */}
      {run.accountingPosting && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 font-bold text-sm">✓ Double-Entry GL Journal Posted</span>
            <span className="font-mono text-xs text-emerald-800">
              Journal #{run.accountingPosting.journalEntryId || run.accountingPosting.id}
            </span>
          </div>
          <p className="text-xs text-emerald-700">
            Balanced ledger instruction committed: Salary Expense (Debit ₹{run.grossTotal.toString()}), Accounts Payable (Credit ₹{run.netTotal.toString()}), and Statutory Payable (Credit ₹{run.deductionsTotal.toString()}).
          </p>
        </div>
      )}

      {/* Calculations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-800">Employee Calculations ({run.calculations?.length || 0})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Staff Member</th>
                <th className="px-6 py-3.5 text-center">Working / LOP</th>
                <th className="px-6 py-3.5 text-right">Gross</th>
                <th className="px-6 py-3.5 text-right">Deductions</th>
                <th className="px-6 py-3.5 text-right">Adjustments</th>
                <th className="px-6 py-3.5 text-right">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {run.calculations?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No calculations present in this run.
                  </td>
                </tr>
              ) : (
                run.calculations?.map((c: any) => {
                  const emp = c.employment;
                  const name = emp?.staffProfile?.user
                    ? `${emp.staffProfile.user.firstName || ""} ${emp.staffProfile.user.lastName || ""}`.trim()
                    : "Staff Member";
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {name}
                        <span className="block text-xs text-slate-400 font-mono">{emp?.employeeNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs">
                        {c.workingDays}d / <span className="text-rose-600">{c.lossOfPayDays.toString()}d LOP</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">₹{c.grossPay.toString()}</td>
                      <td className="px-6 py-4 text-right font-mono text-rose-600">₹{c.totalDeductions.toString()}</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-500">₹{c.adjustmentsTotal.toString()}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">₹{c.netPay.toString()}</td>
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
