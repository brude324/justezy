import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { admissionsService } from "@/lib/services/admissions-service";

export default async function AdmissionsOverviewPage() {
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
  let funnel: any = {
    overview: {
      totalEnquiries: 0,
      totalApplications: 0,
      totalOffers: 0,
      totalConfirmations: 0,
      totalAdmitted: 0,
      conversionRatePercent: 0,
    },
    enquiryBreakdown: { byStatus: [], bySource: [] },
    applicationBreakdown: { byStatus: [], byGrade: [] },
  };

  try {
    funnel = await admissionsService.getAdmissionsFunnel(tenantId);
  } catch {
    // If db empty or running without migrations
  }

  const cards = [
    { title: "Enquiries", count: funnel.overview.totalEnquiries, href: "/admissions/enquiries", color: "border-blue-500 text-blue-600 bg-blue-50" },
    { title: "Applications", count: funnel.overview.totalApplications, href: "/admissions/applications", color: "border-amber-500 text-amber-600 bg-amber-50" },
    { title: "Offers Issued", count: funnel.overview.totalOffers, href: "/admissions/offers", color: "border-purple-500 text-purple-600 bg-purple-50" },
    { title: "Admissions Confirmed", count: funnel.overview.totalConfirmations, href: "/admissions/applications?status=CONFIRMED", color: "border-indigo-500 text-indigo-600 bg-indigo-50" },
    { title: "Students Enrolled", count: funnel.overview.totalAdmitted, href: "/admissions/applications?status=ADMITTED", color: "border-emerald-500 text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admissions & Enquiry CRM</h1>
          <p className="text-sm text-slate-500">
            End-to-end prospective student pipeline from enquiry to enrollment.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admissions/enquiries"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            + New Enquiry
          </Link>
          <Link
            href="/admissions/applications"
            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
          >
            View Applications
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col justify-between"
          >
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {card.title}
            </span>
            <div className="my-2">
              <span className="text-3xl font-extrabold text-slate-900">{card.count}</span>
            </div>
            <span className="text-xs text-indigo-600 font-medium hover:underline">
              View records &rarr;
            </span>
          </Link>
        ))}
      </div>

      {/* Funnel Progress & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Admissions Conversion Funnel</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1 font-medium">
                <span className="text-slate-600">Enquiries to Admitted Conversion Rate</span>
                <span className="text-indigo-600 font-bold">{funnel.overview.conversionRatePercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, funnel.overview.conversionRatePercent)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Enquiries</span>
                <span className="font-semibold text-slate-700">{funnel.overview.totalEnquiries}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Applications</span>
                <span className="font-semibold text-slate-700">{funnel.overview.totalApplications}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Offers Issued</span>
                <span className="font-semibold text-slate-700">{funnel.overview.totalOffers}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Enrolled Students</span>
                <span className="font-semibold text-emerald-600">{funnel.overview.totalAdmitted}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Quick CRM Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/admissions/enquiries"
              className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-left transition"
            >
              <h3 className="font-semibold text-sm text-slate-900">Enquiry CRM</h3>
              <p className="text-xs text-slate-500 mt-1">Track walk-ins, calls, follow-ups, and conversions.</p>
            </Link>
            <Link
              href="/admissions/applications"
              className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-left transition"
            >
              <h3 className="font-semibold text-sm text-slate-900">Review Applications</h3>
              <p className="text-xs text-slate-500 mt-1">Review documents, scores, decisions, and offers.</p>
            </Link>
            <Link
              href="/admissions/interviews"
              className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-left transition"
            >
              <h3 className="font-semibold text-sm text-slate-900">Interviews & Tests</h3>
              <p className="text-xs text-slate-500 mt-1">Schedule entrance tests and record interview remarks.</p>
            </Link>
            <Link
              href="/admissions/reports"
              className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-left transition"
            >
              <h3 className="font-semibold text-sm text-slate-900">Admissions Reports</h3>
              <p className="text-xs text-slate-500 mt-1">Funnel analytics, grade-wise demand, and source attribution.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
