import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { hrService } from "@/lib/services/hr-service";

export default async function HREmployeeDetailPage({ params }: { params: { id: string } }) {
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

  let employee = null;
  try {
    employee = await hrService.getEmployee(tenantId, params.id);
  } catch {
    //
  }

  if (!employee) {
    notFound();
  }

  const user = employee.staffProfile?.user;
  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    : "Staff Member";

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/hr/employees" className="hover:text-indigo-600">
          Staff Directory
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{fullName}</span>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xl flex items-center justify-center">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  employee.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {employee.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {employee.designation?.name || "Staff"} • {employee.department?.name || "Unassigned"} • Employee No:{" "}
              <span className="font-mono text-slate-700">{employee.employeeNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/payroll/employees?search=${employee.employeeNumber}`}
            className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
          >
            Compensation & Payroll
          </Link>
          <Link
            href={`/hr/leave?employeeId=${employee.id}`}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            Leave History
          </Link>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Employment Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">Employment Information</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Employment Type</p>
              <p className="font-medium text-slate-800">{employee.employmentType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Joining Date</p>
              <p className="font-medium text-slate-800">
                {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Confirmation Date</p>
              <p className="font-medium text-slate-800">
                {employee.confirmationDate ? new Date(employee.confirmationDate).toLocaleDateString() : "Pending"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Work Location</p>
              <p className="font-medium text-slate-800">{employee.workLocation?.name || "Main Campus"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Reporting Manager</p>
              <p className="font-medium text-slate-800">
                {employee.reportingManagerStaffId ? `Staff ID: ${employee.reportingManagerStaffId}` : "None"}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">Contact & Personal</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Official Email</p>
              <p className="font-medium text-slate-800">{user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Phone Number</p>
              <p className="font-medium text-slate-800">{user?.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Clerk Identity Bound</p>
              <p className="font-medium font-mono text-xs text-slate-600">{user?.id || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Staff Profile Id</p>
              <p className="font-medium font-mono text-xs text-slate-600">{employee.staffProfileId}</p>
            </div>
          </div>
        </div>

        {/* Contracts & Documents */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b pb-2">Contracts & Docs</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Active Contracts</p>
              <p className="font-medium text-slate-800">{employee.contracts?.length || 0} registered</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">HR Documents</p>
              <p className="font-medium text-slate-800">{(employee as any).documents?.length || 0} attached</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Lifecycle Audits</p>
              <p className="font-medium text-slate-800">{(employee as any).histories?.length || 0} historical changes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Append-Only Employment History */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800">Append-Only Employment Timeline</h2>
        {!(employee as any).histories?.length ? (
          <p className="text-sm text-slate-400">No historical department or designation changes recorded.</p>
        ) : (
          <div className="space-y-4 border-l-2 border-indigo-200 pl-4">
            {(employee as any).histories?.map((hist: any) => (
              <div key={hist.id} className="relative">
                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                <p className="text-xs font-semibold text-slate-500">
                  {new Date(hist.changeDate || hist.createdAt).toLocaleDateString()} • {hist.newStatus || "UPDATE"}
                </p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{hist.reason || "Lifecycle transition"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
