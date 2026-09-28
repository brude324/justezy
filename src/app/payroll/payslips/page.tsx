import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { payrollService } from "@/lib/services/payroll-service";

export default async function PayrollPayslipsPage({
  searchParams,
}: {
  searchParams: { periodId?: string; search?: string };
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
  const periodId = searchParams.periodId;

  let payslips: any[] = [];
  try {
    const res = await payrollService.listPayslips(tenantId, {
      periodId,
    });
    payslips = res.items;
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Immutable Staff Payslips</h1>
          <p className="text-sm text-slate-500">
            Cryptographically sealed and finalized salary vouchers with full audit history.
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
                <th className="px-6 py-3.5 text-left">Payslip #</th>
                <th className="px-6 py-3.5 text-left">Staff Member</th>
                <th className="px-6 py-3.5 text-left">Period</th>
                <th className="px-6 py-3.5 text-right">Gross Pay</th>
                <th className="px-6 py-3.5 text-right">Deductions</th>
                <th className="px-6 py-3.5 text-right">Net Salary</th>
                <th className="px-6 py-3.5 text-right">Generated</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No finalized payslips generated. Finalize a payroll run to generate official payslips.
                  </td>
                </tr>
              ) : (
                payslips.map((p) => {
                  const emp = p.employment;
                  const name = emp?.staffProfile?.user
                    ? `${emp.staffProfile.user.firstName || ""} ${emp.staffProfile.user.lastName || ""}`.trim()
                    : "Staff Member";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-emerald-700">{p.payslipNumber}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {name}
                        <span className="block text-xs text-slate-400 font-mono">{emp?.employeeNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold">{p.period?.name}</td>
                      <td className="px-6 py-4 text-right font-mono">₹{p.grossEarnings.toString()}</td>
                      <td className="px-6 py-4 text-right font-mono text-rose-600">₹{p.totalDeductions.toString()}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        ₹{p.netPay.toString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-right text-slate-400">
                        {new Date(p.generatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/payroll/payslips/${p.id}`}
                          className="text-xs text-emerald-600 hover:text-emerald-900 font-medium"
                        >
                          View Voucher →
                        </Link>
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
