import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function PayrollOverviewPage() {
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

  let activePeriodsCount = 0;
  let recentRunsCount = 0;
  let activeStructuresCount = 0;
  let assignedStaffCount = 0;
  let pendingReviewsCount = 0;
  let totalPayslipsCount = 0;

  try {
    const [periods, runs, structs, assigned, reviews, slips] = await Promise.all([
      prismaTarget.payrollPeriod.count({ where: { tenantId, status: { in: ["OPEN", "PROCESSING", "CALCULATED"] } } }),
      prismaTarget.payrollRun.count({ where: { tenantId } }),
      prismaTarget.salaryStructure.count({ where: { tenantId, active: true } }),
      prismaTarget.employeeCompensation.count({ where: { tenantId, status: "ACTIVE" } }),
      prismaTarget.payrollRun.count({ where: { tenantId, status: { in: ["CALCULATED", "UNDER_REVIEW"] } } }),
      prismaTarget.payslip.count({ where: { tenantId } }),
    ]);

    activePeriodsCount = periods;
    recentRunsCount = runs;
    activeStructuresCount = structs;
    assignedStaffCount = assigned;
    pendingReviewsCount = reviews;
    totalPayslipsCount = slips;
  } catch {
    // Fallback
  }

  const cards = [
    { title: "Active Periods", count: activePeriodsCount, href: "/payroll/periods", color: "border-teal-500 text-teal-600 bg-teal-50" },
    { title: "Payroll Runs", count: recentRunsCount, href: "/payroll/runs", color: "border-emerald-500 text-emerald-600 bg-emerald-50" },
    { title: "Under Review", count: pendingReviewsCount, href: "/payroll/runs", color: "border-amber-500 text-amber-600 bg-amber-50" },
    { title: "Salary Structures", count: activeStructuresCount, href: "/payroll/salary-structures", color: "border-indigo-500 text-indigo-600 bg-indigo-50" },
    { title: "Staff Enrolled", count: assignedStaffCount, href: "/payroll/employees", color: "border-blue-500 text-blue-600 bg-blue-50" },
    { title: "Issued Payslips", count: totalPayslipsCount, href: "/payroll/payslips", color: "border-purple-500 text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll & Compensation Engine</h1>
          <p className="text-sm text-slate-500">
            Multi-tenant salary structures, deterministic calculation engine, immutable payslips, and double-entry GL integration.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/payroll/runs"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            Manage Payroll Runs
          </Link>
          <Link
            href="/payroll/periods"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            Cycle Periods
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className={`p-5 rounded-xl border-l-4 shadow-sm bg-white hover:shadow-md transition flex justify-between items-center ${c.color}`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.title}</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{c.count}</p>
            </div>
            <span className="text-sm font-medium underline">Open</span>
          </Link>
        ))}
      </div>

      {/* Quick Action Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Payroll Execution & Approvals</h2>
          <p className="text-sm text-slate-500">
            Strict separation of duties: Calculation → Review → Approval → Finalization → General Ledger Posting.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link href="/payroll/runs" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              ⚙️ Calculate / Process Run
            </Link>
            <Link href="/payroll/adjustments" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              ⚖️ Payroll Adjustments
            </Link>
            <Link href="/payroll/payslips" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              🧾 Immutable Payslips
            </Link>
            <Link href="/payroll/reports" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              📑 Financial Reconciliation
            </Link>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Structures & Compensation</h2>
          <p className="text-sm text-slate-500">
            Institutional earnings and deduction components, salary rule definitions, and staff compensation bindings.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link href="/payroll/salary-structures" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              📐 Salary Components & Bands
            </Link>
            <Link href="/payroll/employees" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              👤 Staff Compensation Register
            </Link>
            <Link href="/payroll/periods" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              🗓️ Payroll Cycles
            </Link>
            <Link href="/hr/attendance" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              ⏱️ Verify Attendance Feeds
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
