import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { hrService } from "@/lib/services/hr-service";

export default async function HREmployeesPage({
  searchParams,
}: {
  searchParams: { page?: string; departmentId?: string; status?: string; search?: string };
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
  const page = parseInt(searchParams.page || "1", 10);
  const departmentId = searchParams.departmentId;
  const status = searchParams.status;
  const search = searchParams.search;

  let employees: any[] = [];
  let total = 0;
  let departments: any[] = [];

  try {
    const [result, depts] = await Promise.all([
      hrService.listEmployees(tenantId, {
        page,
        limit: 15,
        departmentId,
        status,
      }),
      hrService.listDepartments(tenantId),
    ]);
    employees = result.items || [];
    total = result.total;
    departments = depts;
  } catch {
    // Fallback
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff & Employee Directory</h1>
          <p className="text-sm text-slate-500">
            Authoritative institutional employee master records linked to staff identities.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hr/reports"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            Export Directory
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <form method="GET" className="flex flex-wrap gap-3 w-full">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search employee name or code..."
            aria-label="Search employee name or code"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px]"
          />
          <select
            name="departmentId"
            defaultValue={departmentId || ""}
            aria-label="Department"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status || ""}
            aria-label="Employment Status"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="ON_NOTICE">On Notice</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TERMINATED">Terminated</option>
            <option value="RESIGNED">Resigned</option>
            <option value="RETIRED">Retired</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Employee</th>
                <th className="px-6 py-3.5 text-left">Code</th>
                <th className="px-6 py-3.5 text-left">Department</th>
                <th className="px-6 py-3.5 text-left">Designation</th>
                <th className="px-6 py-3.5 text-left">Type</th>
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-left">Joined</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No employee records found matching the criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const name = emp.staffProfile?.user
                    ? `${emp.staffProfile.user.firstName || ""} ${emp.staffProfile.user.lastName || ""}`.trim() || emp.staffProfile.user.email
                    : "Staff Member";
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <Link href={`/hr/employees/${emp.id}`} className="hover:text-indigo-600">
                          {name}
                        </Link>
                        <p className="text-xs text-slate-400">{emp.staffProfile?.user?.email}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{emp.employeeNumber}</td>
                      <td className="px-6 py-4">{emp.department?.name || "—"}</td>
                      <td className="px-6 py-4">{emp.designation?.name || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-medium">
                          {emp.employmentType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            emp.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : emp.status === "PROBATION"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/hr/employees/${emp.id}`}
                          className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          View Profile →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
          <span>Showing {employees.length} of {total} employees</span>
        </div>
      </div>
    </div>
  );
}
