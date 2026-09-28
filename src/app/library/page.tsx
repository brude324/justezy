import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { libraryService } from "@/lib/services/library-service";

export default async function LibraryOverviewPage() {
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
  } catch {
    // DB or dev fallback
  }

  const cards = [
    { title: "Catalog Titles", count: report.totalBooks, href: "/library/books", color: "border-emerald-500 text-emerald-600 bg-emerald-50" },
    { title: "Physical Copies", count: report.totalCopies, href: "/library/copies", color: "border-blue-500 text-blue-600 bg-blue-50" },
    { title: "Active Loans", count: report.activeLoans, href: "/library/loans", color: "border-indigo-500 text-indigo-600 bg-indigo-50" },
    { title: "Overdue Books", count: report.overdueLoans, href: "/library/loans?status=OVERDUE", color: "border-rose-500 text-rose-600 bg-rose-50" },
    { title: "Active Members", count: report.totalActiveMembers, href: "/library/members", color: "border-teal-500 text-teal-600 bg-teal-50" },
    { title: "Unpaid Fines", count: `₹${report.fineStats.unpaidAmount}`, href: "/library/fines", color: "border-amber-500 text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Library & Circulation Management</h1>
          <p className="text-sm text-slate-500">
            Multi-tenant catalog curation, inventory accession, circulation, and fine settlement.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/library/books"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            Manage Catalog
          </Link>
          <Link
            href="/library/loans"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            Circulation Desk
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
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{c.count}</p>
            </div>
            <span className="text-sm font-medium underline">View</span>
          </Link>
        ))}
      </div>

      {/* Quick Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4">Circulation Quick Links</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/library/loans"
              className="p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition flex flex-col"
            >
              <span className="text-sm font-semibold text-slate-800">Issue & Returns</span>
              <span className="text-xs text-slate-500">Circulation loan desk</span>
            </Link>
            <Link
              href="/library/reservations"
              className="p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition flex flex-col"
            >
              <span className="text-sm font-semibold text-slate-800">Reservations</span>
              <span className="text-xs text-slate-500">Hold queues & requests</span>
            </Link>
            <Link
              href="/library/fines"
              className="p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition flex flex-col"
            >
              <span className="text-sm font-semibold text-slate-800">Fines Desk</span>
              <span className="text-xs text-slate-500">Overdue assessment & waivers</span>
            </Link>
            <Link
              href="/library/members"
              className="p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition flex flex-col"
            >
              <span className="text-sm font-semibold text-slate-800">Member Directory</span>
              <span className="text-xs text-slate-500">Student & staff cards</span>
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4">Inventory Health</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
              <span className="text-slate-600">Available on Shelf</span>
              <span className="font-semibold text-emerald-600">{report.availableCopies}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
              <span className="text-slate-600">Currently Issued</span>
              <span className="font-semibold text-indigo-600">{report.issuedCopies}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
              <span className="text-slate-600">Marked Lost</span>
              <span className="font-semibold text-rose-600">{report.lostCopies}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1">
              <span className="text-slate-600">Marked Damaged / Maintenance</span>
              <span className="font-semibold text-amber-600">{report.damagedCopies}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
