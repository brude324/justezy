import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { hrService } from "@/lib/services/hr-service";

export default async function HRDepartmentsPage() {
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
  let departments: any[] = [];

  try {
    departments = await hrService.listDepartments(tenantId);
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments & Academic Wings</h1>
          <p className="text-sm text-slate-500">
            Hierarchical departments, academic wings, administrative divisions, and department heads.
          </p>
        </div>
        <Link
          href="/hr"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
        >
          ← Back to HR
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Code</th>
                <th className="px-6 py-3.5 text-left">Department Name</th>
                <th className="px-6 py-3.5 text-left">Parent Division</th>
                <th className="px-6 py-3.5 text-left">Department Head</th>
                <th className="px-6 py-3.5 text-left">Staff Assigned</th>
                <th className="px-6 py-3.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No departments configured for this tenant institution.
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-xs text-indigo-700">{dept.code}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{dept.name}</td>
                    <td className="px-6 py-4 text-xs">{dept.parentDepartment?.name || "Root / Top Level"}</td>
                    <td className="px-6 py-4 text-xs">
                      {dept.headStaff?.user
                        ? `${dept.headStaff.user.firstName || ""} ${dept.headStaff.user.lastName || ""}`.trim() || dept.headStaff.user.email
                        : "Unassigned"}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                      {dept._count?.employments ?? 0} staff members
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          dept.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {dept.active ? "Active" : "Archived"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
