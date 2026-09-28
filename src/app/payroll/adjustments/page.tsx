import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function PayrollAdjustmentsPage() {
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
  let adjustments: any[] = [];

  try {
    adjustments = await prismaTarget.payrollAdjustment.findMany({
      where: { tenantId },
      include: {
        employment: {
          include: {
            staffProfile: { include: { user: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Adjustments & Arrears</h1>
          <p className="text-sm text-slate-500">
            One-time bonuses, expense reimbursements, deduction corrections, and arrears with audit logs.
          </p>
        </div>
        <Link
          href="/payroll"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
        >
          ← Back to Payroll
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Staff Member</th>
                <th className="px-6 py-3.5 text-left">Period</th>
                <th className="px-6 py-3.5 text-left">Adjustment Type</th>
                <th className="px-6 py-3.5 text-left">Reason / Remarks</th>
                <th className="px-6 py-3.5 text-right">Amount</th>
                <th className="px-6 py-3.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No payroll adjustments recorded.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => {
                  const emp = adj.employment;
                  const name = emp?.staffProfile?.user
                    ? `${emp.staffProfile.user.firstName || ""} ${emp.staffProfile.user.lastName || ""}`.trim()
                    : "Staff Member";
                  return (
                    <tr key={adj.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {name}
                        <span className="block text-xs text-slate-400 font-mono">{emp?.employeeNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {adj.periodId ? `Period: ${adj.periodId}` : "Immediate / General"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-700">
                          {adj.adjustmentType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">{adj.reason}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        ₹{adj.amount.toString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            adj.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : adj.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {adj.status}
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
