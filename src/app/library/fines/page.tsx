import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";

export default async function LibraryFinesPage() {
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

  let fines: any[] = [];
  try {
    fines = await prismaTarget.libraryFine.findMany({
      where: { tenantId },
      include: {
        member: { include: { studentProfile: true, user: true } },
        loan: { include: { bookCopy: { include: { book: true } } } },
      },
      orderBy: { assessedAt: "desc" },
      take: 50,
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Library Fines & Financial Settlement</h1>
          <p className="text-sm text-slate-500">Track assessed overdue and damaged copy fines and financial settlements.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Reason / Book</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Assessed At</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Financial Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No fines assessed on file.
                  </td>
                </tr>
              ) : (
                fines.map((f: any) => (
                  <tr key={f.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {f.member?.studentProfile?.fullName || (f.member?.user ? `${f.member.user.firstName} ${f.member.user.lastName}` : "Member")}
                      </p>
                      <p className="text-xs font-mono text-slate-400">
                        {f.member?.memberCode}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-800">{f.reason}</p>
                      {f.loan?.bookCopy?.book && (
                        <p className="text-xs text-slate-500">{f.loan.bookCopy.book.title}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      ₹{f.amount.toString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {new Date(f.assessedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          f.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : f.status === "WAIVED"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {f.financialReference || "—"}
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
