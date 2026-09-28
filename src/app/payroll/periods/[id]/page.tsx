import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function PayrollPeriodDetailPage({ params }: { params: { id: string } }) {
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

  let period = null;
  try {
    period = await prismaTarget.payrollPeriod.findFirst({
      where: { id: params.id, tenantId },
      include: {
        runs: true,
      },
    });
  } catch {
    //
  }

  if (!period) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/payroll/periods" className="hover:text-teal-600">
          Payroll Periods
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{period.name}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
              period.status === "FINALIZED" || period.status === "LOCKED"
                ? "bg-slate-100 text-slate-800"
                : "bg-teal-100 text-teal-800"
            }`}
          >
            {period.status}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">{period.name}</h1>
          <p className="text-sm text-slate-500">
            Period: <span className="font-mono text-slate-700">{period.name}</span> • Year {new Date(period.startDate).getFullYear()}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/payroll/runs?periodId=${period.id}`}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            Associated Runs ({period.runs.length})
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <p className="text-xs uppercase font-semibold text-slate-400">Date Range</p>
          <p className="text-lg font-bold text-slate-800">
            {new Date(period.startDate).toLocaleDateString()} → {new Date(period.endDate).toLocaleDateString()}
          </p>
          <p className="text-xs text-slate-500">Scheduled pay cycle window</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <p className="text-xs uppercase font-semibold text-slate-400">Total Calendar Days</p>
          <p className="text-3xl font-extrabold text-teal-600">
            {Math.round((new Date(period.endDate).getTime() - new Date(period.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days
          </p>
          <p className="text-xs text-slate-500">Basis for pro-rata & LOP deductions</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <p className="text-xs uppercase font-semibold text-slate-400">Associated Runs</p>
          <p className="text-3xl font-extrabold text-slate-800">{period.runs.length}</p>
          <p className="text-xs text-slate-500">Draft, Calculated or Finalized</p>
        </div>
      </div>
    </div>
  );
}
