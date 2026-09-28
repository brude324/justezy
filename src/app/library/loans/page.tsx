import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";

export default async function LibraryLoansPage({
  searchParams,
}: {
  searchParams?: { status?: string };
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
  const statusFilter = searchParams?.status;

  let loans: any[] = [];
  try {
    loans = await prismaTarget.libraryLoan.findMany({
      where: {
        tenantId,
        ...(statusFilter ? { status: statusFilter as any } : {}),
      },
      include: {
        member: {
          include: { studentProfile: true, user: true },
        },
        bookCopy: {
          include: { book: true },
        },
      },
      orderBy: { issuedAt: "desc" },
      take: 50,
    });
  } catch {}

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Circulation Loans & Returns</h1>
          <p className="text-sm text-slate-500">Track active book issues, due dates, and returned circulation logs.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/library/reservations"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            Reservations Queue
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Link
          href="/library/loans"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            !statusFilter ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All
        </Link>
        <Link
          href="/library/loans?status=ISSUED"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            statusFilter === "ISSUED" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Active Issues
        </Link>
        <Link
          href="/library/loans?status=RETURNED"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            statusFilter === "RETURNED" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Returned
        </Link>
        <Link
          href="/library/loans?status=OVERDUE"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            statusFilter === "OVERDUE" ? "bg-rose-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Overdue
        </Link>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Book Title / Copy</th>
                <th className="px-6 py-3">Borrower Member</th>
                <th className="px-6 py-3">Issued Date</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Renewals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No circulation loan transactions found.
                  </td>
                </tr>
              ) : (
                loans.map((l: any) => {
                  const isLate = l.status === "ISSUED" && new Date(l.dueAt) < now;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{l.bookCopy?.book?.title}</p>
                        <p className="text-xs font-mono text-slate-500">
                          Acc #{l.bookCopy?.accessionNumber}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">
                          {l.member?.studentProfile?.fullName || (l.member?.user ? `${l.member.user.firstName} ${l.member.user.lastName}` : "Member")}
                        </p>
                        <p className="text-xs font-mono text-slate-400">
                          {l.member?.memberCode}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {new Date(l.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className={isLate ? "font-bold text-rose-600" : "text-slate-600"}>
                          {new Date(l.dueAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            l.status === "RETURNED"
                              ? "bg-slate-100 text-slate-700"
                              : isLate || l.status === "OVERDUE"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {isLate ? "OVERDUE" : l.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {l.renewalCount}
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
