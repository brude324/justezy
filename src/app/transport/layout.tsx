import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { moduleGate } from "@/lib/authorization/module-gate";

export default async function TransportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const reqHeaders = headers();
  const host = reqHeaders.get("host") || "";
  const tenantSlug = host.split(".")[0] || "demo";

  let isModuleEnabled = true;
  let tenantName = "Institution Transport";

  try {
    const tenant = await prismaTarget.tenant.findFirst({
      where: {
        OR: [{ slug: tenantSlug }, { id: tenantSlug }],
      },
    });

    if (tenant) {
      tenantName = tenant.name;
      isModuleEnabled = await moduleGate.isModuleEnabled(tenant.id, "transport_module");
    }
  } catch {
    // Dev fallback
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
            The <strong>Transport Management</strong> module is not activated for {tenantName}.
            Institutional subscription upgrade or license enablement is required to access fleet routes and student transport allocations.
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
    { label: "Overview", href: "/transport" },
    { label: "Routes", href: "/transport/routes" },
    { label: "Stops", href: "/transport/stops" },
    { label: "Vehicles", href: "/transport/vehicles" },
    { label: "Drivers", href: "/transport/drivers" },
    { label: "Assignments", href: "/transport/assignments" },
    { label: "Incidents", href: "/transport/incidents" },
    { label: "Reports", href: "/transport/reports" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Transport Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <span className="text-lg font-bold text-sky-700">Justezy</span>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-slate-800">Transport & Fleet</span>
            </div>
            <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
