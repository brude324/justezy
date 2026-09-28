import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { hrService } from "@/lib/services/hr-service";

export default async function HRLeavePage({
  searchParams,
}: {
  searchParams: { status?: string; employeeId?: string };
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
  const employeeId = searchParams.employeeId;

  let leaveRequests: any[] = [];
  let leaveTypes: any[] = [];

  try {
    const [requests, types] = await Promise.all([
      hrService.listLeaveRequests(tenantId, {
        status,
        employmentId: employeeId,
      }),
      hrService.listLeaveTypes(tenantId),
    ]);
    leaveRequests = requests;
    leaveTypes = types;
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management & Approvals</h1>
          <p className="text-sm text-slate-500">
            Staff leave applications, multi-tier approvals, policy validation, and balance tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hr/holidays"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            Holiday Calendar →
          </Link>
        </div>
      </div>

      {/* Leave Types Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {leaveTypes.map((t) => (
          <div key={t.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.name}</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{t.annualQuota} days/yr</p>
            <p className="text-xs text-slate-400 mt-1">
              {t.isPaid ? "Paid Leave" : "Unpaid / LOP"} • {t.carryForward ? "Carry-Forward" : "No Carry"}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <form method="GET" className="flex flex-wrap gap-3 w-full">
          <select
            name="status"
            defaultValue={status || ""}
            aria-label="Application Status"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Application Statuses</option>
            <option value="SUBMITTED">Pending Approval (SUBMITTED)</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Staff Member</th>
                <th className="px-6 py-3.5 text-left">Leave Type</th>
                <th className="px-6 py-3.5 text-left">Duration</th>
                <th className="px-6 py-3.5 text-left">Days</th>
                <th className="px-6 py-3.5 text-left">Reason</th>
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                leaveRequests.map((req) => {
                  const emp = req.employment;
                  const name = emp?.staffProfile?.user
                    ? `${emp.staffProfile.user.firstName || ""} ${emp.staffProfile.user.lastName || ""}`.trim()
                    : "Staff Member";
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <Link href={`/hr/employees/${emp?.id}`} className="hover:underline">
                          {name}
                        </Link>
                        <span className="block text-xs text-slate-400 font-mono">{emp?.employeeNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700">{req.leaveType?.name}</span>
                        <span className="block text-xs text-slate-400">
                          {req.leaveType?.isPaid ? "Paid" : "Loss of Pay"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {new Date(req.startDate).toLocaleDateString()} → {new Date(req.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{req.daysCount.toString()}</td>
                      <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">{req.reason}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            req.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : req.status === "SUBMITTED"
                              ? "bg-amber-100 text-amber-800"
                              : req.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/hr/leave/${req.id}`}
                          className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Review →
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
