import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { libraryService } from "@/lib/services/library-service";

export default async function LibraryReportsPage() {
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

  let report: any = {
    totalBooks: 0,
    totalCopies: 0,
    availableCopies: 0,
    issuedCopies: 0,
    lostCopies: 0,
    damagedCopies: 0,
    totalActiveMembers: 0,
    activeLoans: 0,
    overdueLoans: 0,
    pendingReservations: 0,
    fineStats: {
      unpaidAmount: "0.00",
      unpaidCount: 0,
      paidAmount: "0.00",
      paidCount: 0,
      waivedAmount: "0.00",
      waivedCount: 0,
    },
  };

  try {
    report = await libraryService.getCirculationReport(tenantId);
  } catch {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Library Circulation Analytics & Reports</h1>
        <p className="text-sm text-slate-500">Summary metrics of collection circulation, inventory health, and fee settlement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Circulation Metrics */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Circulation Metrics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Active Book Loans</span>
              <span className="font-bold text-indigo-600">{report.activeLoans}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Overdue Returns</span>
              <span className="font-bold text-rose-600">{report.overdueLoans}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Pending Title Reservations</span>
              <span className="font-bold text-amber-600">{report.pendingReservations}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Registered Borrowing Members</span>
              <span className="font-bold text-slate-900">{report.totalActiveMembers}</span>
            </div>
          </div>
        </div>

        {/* Financial Fine Reconciliation */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Fine Assessment & Settlement</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Settled / Collected Fines</span>
              <span className="font-bold text-emerald-600">₹{report.fineStats.paidAmount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Outstanding / Unpaid Fines</span>
              <span className="font-bold text-rose-600">₹{report.fineStats.unpaidAmount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Authorized Waived Fines</span>
              <span className="font-bold text-purple-600">₹{report.fineStats.waivedAmount}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Total Unsettled Invoices Count</span>
              <span className="font-bold text-slate-700">{report.fineStats.unpaidCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
