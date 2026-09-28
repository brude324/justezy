import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { payrollService } from "@/lib/services/payroll-service";

export default async function PayrollEmployeesPage({
  searchParams,
}: {
  searchParams: { search?: string };
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
  let assignments: any[] = [];

  try {
    assignments = await prismaTarget.employeeCompensation.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        ...(searchParams.search
          ? {
              employment: {
                OR: [
                  { employeeNumber: { contains: searchParams.search, mode: "insensitive" } },
                  { staffProfile: { user: { firstName: { contains: searchParams.search, mode: "insensitive" } } } },
                  { staffProfile: { user: { lastName: { contains: searchParams.search, mode: "insensitive" } } } },
                ],
              },
            }
          : {}),
      },
      include: {
        employment: {
          include: {
            staffProfile: { include: { user: true } },
            department: true,
            designation: true,
          },
        },
        salaryStructure: true,
        items: { include: { component: true } },
      },
      orderBy: { effectiveFrom: "desc" },
    });
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Compensation & Salary Bindings</h1>
          <p className="text-sm text-slate-500">
            Active employee salary structure assignments, base CTC, allowances, and statutory contributions.
          </p>
        </div>
        <Link
          href="/payroll/salary-structures"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          Salary Structures →
        </Link>
      </div>

      {/* Search */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <form method="GET" className="flex flex-wrap gap-3 w-full">
          <input
            type="text"
            name="search"
            defaultValue={searchParams.search}
            placeholder="Search employee name or code..."
            aria-label="Search employee name or code"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[240px]"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Staff Member</th>
                <th className="px-6 py-3.5 text-left">Designation</th>
                <th className="px-6 py-3.5 text-left">Assigned Structure</th>
                <th className="px-6 py-3.5 text-right">Gross Monthly CTC</th>
                <th className="px-6 py-3.5 text-left">Effective Date</th>
                <th className="px-6 py-3.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No active staff compensation assignments found.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => {
                  const emp = a.employment;
                  const name = emp?.staffProfile?.user
                    ? `${emp.staffProfile.user.firstName || ""} ${emp.staffProfile.user.lastName || ""}`.trim()
                    : "Staff Member";
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {name}
                        <span className="block text-xs text-slate-400 font-mono">{emp?.employeeNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-xs">{emp?.designation?.name || "—"}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{a.salaryStructure?.name}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        ₹{a.grossSalary.toString()}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {new Date(a.effectiveFrom).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">
                          {a.status}
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
