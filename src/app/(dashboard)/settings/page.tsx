import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function SettingsPage() {
  const user = await currentUser();
  const role = (user?.publicMetadata?.role as string) || "user";

  const modules = [
    { name: "Core Academics", status: "Active", tier: "Base Platform", key: "core_academics" },
    { name: "Student Attendance", status: "Active", tier: "Base Platform", key: "attendance_module" },
    { name: "Communication & Notices", status: "Active", tier: "Base Platform", key: "communication_module" },
    { name: "Admissions CRM", status: "Active", tier: "V2 Wave 2", key: "admissions_module" },
    { name: "Library Management", status: "Active", tier: "V2 Wave 3", key: "library_module" },
    { name: "Transport Fleet & Logistics", status: "Active", tier: "V2 Wave 3", key: "transport_module" },
    { name: "Inventory & Purchasing", status: "Active", tier: "V2 Wave 4", key: "inventory_module" },
    { name: "Fixed Asset Management", status: "Active", tier: "V2 Wave 4", key: "assets_module" },
    { name: "Human Resources", status: "Active", tier: "V2 Wave 5", key: "hr_module" },
    { name: "Payroll & Compensation", status: "Active", tier: "V2 Wave 5", key: "payroll_module" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900">Institution & System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure institutional preferences, security parameters, and review active module licenses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Module Entitlements Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Module Entitlements & Licensing</h2>
            <div className="divide-y divide-slate-100">
              {modules.map((m) => (
                <div key={m.key} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{m.name}</span>
                    <span className="text-xs text-slate-400 block">{m.tier}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Regional & Academic Defaults */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Institutional Preferences</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Currency Default</span>
                <span className="font-semibold text-slate-800">INR (₹) - Indian Rupee</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Timezone</span>
                <span className="font-semibold text-slate-800">Asia/Kolkata (IST +5:30)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Date Format</span>
                <span className="font-semibold text-slate-800">DD/MM/YYYY</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Fiscal Year Cycle</span>
                <span className="font-semibold text-slate-800">April 1 – March 31</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Access */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Security Invariants</h2>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Server-Side RBAC Enforcement</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Cryptographic Tenant Scoping</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Four-Eye Financial Segregation</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Immutable Transaction Audit Log</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-bold text-slate-900 mb-2">Active Role</h2>
            <p className="text-xs text-slate-500 mb-4">
              Your session is operating under role <strong className="uppercase text-slate-800">{role}</strong>.
            </p>
            <Link
              href="/profile"
              className="block text-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              View Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
