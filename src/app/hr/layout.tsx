import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { moduleGate } from "@/lib/authorization/module-gate";

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const reqHeaders = headers();
  const host = reqHeaders.get("host") || "";
  const tenantSlug = host.split(".")[0] || "demo";

  let isModuleEnabled = true;
  let tenantName = "Institution HR";

  try {
    const tenant = await prismaTarget.tenant.findFirst({
      where: {
        OR: [{ slug: tenantSlug }, { id: tenantSlug }],
      },
    });

    if (tenant) {
      tenantName = tenant.name;
      isModuleEnabled = await moduleGate.isModuleEnabled(tenant.id, "hr_module");
    }
  } catch {
    isModuleEnabled = true;
  }

  if (!isModuleEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            402
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Module Not Licensed</h1>
          <p className="text-sm text-gray-600 mb-6">
            The <strong>Human Resources</strong> module is not activated for {tenantName}.
            Institutional subscription upgrade or license enablement is required to access employee master, contracts, and leave administration.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Overview", href: "/hr" },
    { label: "Employees", href: "/hr/employees" },
    { label: "Departments", href: "/hr/departments" },
    { label: "Designations", href: "/hr/designations" },
    { label: "Contracts", href: "/hr/contracts" },
    { label: "Compensation", href: "/hr/compensation" },
    { label: "Leave", href: "/hr/leave" },
    { label: "Holidays", href: "/hr/holidays" },
    { label: "Attendance", href: "/hr/attendance" },
    { label: "Documents", href: "/hr/documents" },
    { label: "Reports", href: "/hr/reports" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
                Human Resources
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                V2 Wave 5
              </span>
            </div>
          </div>
          <nav className="flex space-x-6 overflow-x-auto py-2 scrollbar-none">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-blue-700 pb-2 border-b-2 border-transparent hover:border-blue-700 transition whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
