import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { payrollService } from "@/lib/services/payroll-service";

export default async function PayrollSalaryStructuresPage() {
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
  let components: any[] = [];

  try {
    const [structs, comps] = await Promise.all([
      payrollService.listSalaryStructures(tenantId),
      payrollService.listSalaryComponents(tenantId),
    ]);
    structures = structs;
    components = comps;
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Salary Structures & Components Master</h1>
          <p className="text-sm text-slate-500">
            Define earnings, deductions, calculation formulas, and institutional pay scale packages.
          </p>
        </div>
        <Link
          href="/payroll"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
        >
          ← Back to Payroll
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Components Catalog */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800">Salary Components ({components.length})</h2>
          <div className="space-y-2">
            {components.length === 0 ? (
              <p className="text-sm text-slate-400">No components created yet.</p>
            ) : (
              components.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <span className="block text-xs font-mono text-slate-400">
                      {c.code} • {c.calculationType}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      c.type === "EARNING"
                        ? "bg-teal-100 text-teal-800"
                        : c.type === "DEDUCTION"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {c.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Salary Structures */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800">Standard Salary Structures ({structures.length})</h2>
          <div className="space-y-4">
            {structures.length === 0 ? (
              <p className="text-sm text-slate-400">No salary structures configured.</p>
            ) : (
              structures.map((s) => (
                <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-900">{s.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">Code: {s.code}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${s.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {s.active ? "Active" : "Archived"}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2">
                    <p className="text-xs uppercase font-semibold text-slate-400 mb-1.5">Configured Line Items</p>
                    <div className="flex flex-wrap gap-2">
                      {s.items?.map((item: any) => (
                        <span key={item.id} className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 font-medium">
                          {item.component?.name}: <span className="font-mono text-slate-900 font-bold">{item.amount?.toString() || `${item.percentage?.toString()}%`}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
