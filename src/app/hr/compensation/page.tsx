import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function HRCompensationPage() {
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
  let structures: any[] = [];
  let assignments: any[] = [];

  try {
    const [structs, assigns] = await Promise.all([
      prismaTarget.salaryStructure.findMany({
        where: { tenantId },
        include: { items: { include: { component: true } } },
      }),
      prismaTarget.employeeCompensation.findMany({
        where: { tenantId, status: "ACTIVE" },
        include: {
          employment: {
            include: {
              staffProfile: { include: { user: true } },
              department: true,
            },
          },
          salaryStructure: true,
        },
        take: 30,
      }),
    ]);
    structures = structs;
    assignments = assigns;
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compensation Structures & Pay Bands</h1>
          <p className="text-sm text-slate-500">
            Institutional salary templates, pay grades, allowances, and employee compensation packages.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/payroll/salary-structures"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Manage Payroll Structures →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Salary Structures */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Standard Salary Structures ({structures.length})</h2>
          <div className="space-y-3">
            {structures.length === 0 ? (
              <p className="text-sm text-slate-400">No salary structures configured yet.</p>
            ) : (
              structures.map((s) => (
                <div key={s.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-500 font-mono">Code: {s.code} • Components: {s.items?.length || 0}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {s.active ? "Active" : "Archived"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Active Assignments */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Active Staff Compensation ({assignments.length})</h2>
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-400">No staff salary assignments recorded.</p>
            ) : (
              assignments.map((a) => {
                const name = a.employment?.staffProfile?.user
                  ? `${a.employment.staffProfile.user.firstName || ""} ${a.employment.staffProfile.user.lastName || ""}`.trim()
                  : "Staff Member";
                return (
                  <div key={a.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{name}</p>
                      <p className="text-xs text-slate-500">
                        {a.salaryStructure?.name || "Custom"} • Base CTC: ₹{a.grossSalary.toString()}
                      </p>
                    </div>
                    <span className="text-xs text-indigo-600 font-medium">
                      Eff: {new Date(a.effectiveFrom).toLocaleDateString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
