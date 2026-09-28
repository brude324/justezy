import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { libraryService } from "@/lib/services/library-service";

export default async function LibraryMembersPage({
  searchParams,
}: {
  searchParams?: { search?: string; type?: string };
}) {
  const reqHeaders = headers();
  const host = reqHeaders.get("host") || "";
  const tenantSlug = host.split(".")[0] || "demo";

  let tenant = null;
  try {
    tenant = await prismaTarget.tenant.findFirst({
      where: { OR: [{ slug: tenantSlug }, { id: tenantSlug }] },
    });
  } catch {}

  const tenantId = tenant?.id || "demo";
  const search = searchParams?.search;
  const memberType = searchParams?.type as any;

  let members: any = { items: [], total: 0 };
  try {
    members = await libraryService.listMembers({
      tenantId,
      memberType,
      search,
      pageSize: 50,
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Registered Library Members</h1>
          <p className="text-sm text-slate-500">Student and staff library borrowing cards and loan limits.</p>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Member Code</th>
                <th className="px-6 py-3">Name & Type</th>
                <th className="px-6 py-3">Linked Identity</th>
                <th className="px-6 py-3">Active Loans</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No library members registered yet.
                  </td>
                </tr>
              ) : (
                members.items.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {m.memberCode}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">
                        {m.studentProfile?.fullName || (m.user ? `${m.user.firstName} ${m.user.lastName}` : "Member")}
                      </p>
                      <span className="text-xs text-slate-500 uppercase">{m.memberType}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-mono">
                      {m.studentProfile?.admissionNumber || m.user?.email || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                        {m._count?.loans || 0} active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                        {m.status}
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
