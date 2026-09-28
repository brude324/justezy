import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function HROverviewPage() {
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

  let totalEmployees = 0;
  let activeDepartments = 0;
  let activeDesignations = 0;
  let pendingLeaves = 0;
  let activeContracts = 0;
  let upcomingHolidays = 0;

  try {
    const [empCount, deptCount, desigCount, leaveCount, contractCount, holidayCount] = await Promise.all([
      prismaTarget.hREmployment.count({ where: { tenantId, status: "ACTIVE" } }),
      prismaTarget.hRDepartment.count({ where: { tenantId, active: true } }),
      prismaTarget.hRDesignation.count({ where: { tenantId, active: true } }),
      prismaTarget.hRLeaveRequest.count({ where: { tenantId, status: "SUBMITTED" } }),
      prismaTarget.hREmploymentContract.count({ where: { tenantId, status: "ACTIVE" } }),
      prismaTarget.hRHoliday.count({
        where: {
          calendar: { tenantId, active: true },
          date: { gte: new Date() },
        },
      }),
    ]);

    totalEmployees = empCount;
    activeDepartments = deptCount;
    activeDesignations = desigCount;
    pendingLeaves = leaveCount;
    activeContracts = contractCount;
    upcomingHolidays = holidayCount;
  } catch {
    // Fallback
  }

  const cards = [
    { title: "Active Staff", count: totalEmployees, href: "/hr/employees", color: "border-indigo-500 text-indigo-600 bg-indigo-50" },
    { title: "Departments", count: activeDepartments, href: "/hr/departments", color: "border-sky-500 text-sky-600 bg-sky-50" },
    { title: "Designations", count: activeDesignations, href: "/hr/designations", color: "border-purple-500 text-purple-600 bg-purple-50" },
    { title: "Pending Leaves", count: pendingLeaves, href: "/hr/leave", color: "border-amber-500 text-amber-600 bg-amber-50" },
    { title: "Active Contracts", count: activeContracts, href: "/hr/contracts", color: "border-emerald-500 text-emerald-600 bg-emerald-50" },
    { title: "Upcoming Holidays", count: upcomingHolidays, href: "/hr/holidays", color: "border-rose-500 text-rose-600 bg-rose-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Human Resources & Staff Lifecycle</h1>
          <p className="text-sm text-slate-500">
            Multi-tenant staff master, employment contracts, leave workflow, departments, and holiday calendars.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hr/leave"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Review Leaves ({pendingLeaves})
          </Link>
          <Link
            href="/hr/employees"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            Staff Directory
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
            <span className="text-sm font-medium underline">Manage</span>
          </Link>
        ))}
      </div>

      {/* Quick Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800">HR Operations</h2>
          <p className="text-sm text-slate-500">
            Maintain organizational hierarchy, work schedules, designations, and employee documents.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link href="/hr/departments" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              🏢 Departments & Hierarchy
            </Link>
            <Link href="/hr/designations" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              🏷️ Designations & Grades
            </Link>
            <Link href="/hr/contracts" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              📑 Employment Contracts
            </Link>
            <Link href="/hr/documents" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              📁 Employee Documents
            </Link>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Time, Attendance & Leave</h2>
          <p className="text-sm text-slate-500">
            Leave balance tracking, multi-tier approvals, holiday calendars, and payroll attendance summaries.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link href="/hr/leave" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              🏖️ Leave Applications
            </Link>
            <Link href="/hr/holidays" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              📅 Holiday Calendars
            </Link>
            <Link href="/hr/attendance" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              ⏱️ Attendance Feeds
            </Link>
            <Link href="/hr/reports" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition block">
              📊 HR Analytics & Headcount
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
