import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { admissionsService } from "@/lib/services/admissions-service";

export default async function AdmissionsReportsPage() {
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
    // empty fallback
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admissions Operational Reports</h1>
          <p className="text-sm text-slate-500">
            Real-time pipeline metrics, lead source attribution, and conversion funnel analytics.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admissions"
            className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition"
          >
            &larr; Overview
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Enquiries by Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
            Enquiries by Status
          </h2>
          {funnel.enquiryBreakdown.byStatus.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No enquiry data recorded.</p>
          ) : (
            <div className="space-y-3">
              {funnel.enquiryBreakdown.byStatus.map((item: any) => (
                <div key={item.status} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{item.status}</span>
                  <span className="font-semibold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applications by Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
            Applications by Status
          </h2>
          {funnel.applicationBreakdown.byStatus.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No application data recorded.</p>
          ) : (
            <div className="space-y-3">
              {funnel.applicationBreakdown.byStatus.map((item: any) => (
                <div key={item.status} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{item.status}</span>
                  <span className="font-semibold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Funnel Conversion Rates */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
            Funnel Velocity
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Overall Conversion</span>
              <span className="text-2xl font-extrabold text-indigo-600">
                {funnel.overview.conversionRatePercent}%
              </span>
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Enquiries:</span>
                <span className="font-medium text-slate-800">{funnel.overview.totalEnquiries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Applications:</span>
                <span className="font-medium text-slate-800">{funnel.overview.totalApplications}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Students Enrolled:</span>
                <span className="font-bold text-emerald-600">{funnel.overview.totalAdmitted}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
