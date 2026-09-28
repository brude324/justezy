import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { hrService } from "@/lib/services/hr-service";

export default async function HRReportsPage() {
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
  let reportData: any = {
    totalEmployees: 0,
    byDepartment: [],
    byDesignation: [],
    byStatus: [],
  };

  try {
    reportData = await hrService.getHeadcountReport(tenantId);
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">HR Analytics & Headcount Reports</h1>
          <p className="text-sm text-slate-500">
            Institutional employee distribution, departmental allocations, designation density, and status metrics.
          </p>
        </div>
        <Link
          href="/hr"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
        >
          ← Back to HR
        </Link>
      </div>

      {/* Headcount Stat */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-2xl p-6 text-white shadow-md flex justify-between items-center">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-indigo-200">Total Active Staff Strength</p>
          <p className="text-4xl font-black mt-1">{reportData.totalEmployees}</p>
          <p className="text-xs text-indigo-200 mt-2">Active records across all institutional departments</p>
        </div>
        <div className="text-right">
          <Link
            href="/hr/employees"
            className="px-4 py-2 bg-white text-indigo-900 rounded-lg font-bold text-sm shadow hover:bg-indigo-50 transition"
          >
            View Active Roster →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Department */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800">Headcount by Department</h2>
          <div className="space-y-3">
            {reportData.byDepartment.length === 0 ? (
              <p className="text-sm text-slate-400">No departmental data available.</p>
            ) : (
              reportData.byDepartment.map((d: any) => (
                <div key={d.name} className="flex justify-between items-center text-sm py-2 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-700">{d.name}</span>
                  <span className="font-bold font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {d.count} staff
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* By Designation */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800">Headcount by Designation</h2>
          <div className="space-y-3">
            {reportData.byDesignation.length === 0 ? (
              <p className="text-sm text-slate-400">No designation data available.</p>
            ) : (
              reportData.byDesignation.map((desig: any) => (
                <div key={desig.name} className="flex justify-between items-center text-sm py-2 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-700">{desig.name}</span>
                  <span className="font-bold font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                    {desig.count} staff
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
