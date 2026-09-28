import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { admissionsService } from "@/lib/services/admissions-service";

export default async function ApplicationsListPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
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
  const status = searchParams.status as any;
  const search = searchParams.search;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  let applicationsData = {
    items: [] as any[],
    pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
  };

  try {
    applicationsData = await admissionsService.listApplications({
      tenantId,
      status,
      search,
      page,
      pageSize: 20,
    });
  } catch {
    // If empty
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "SUBMITTED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "UNDER_REVIEW":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DOCUMENTS_VERIFIED":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "APPROVED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "OFFERED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "CONFIRMED":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "ADMITTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REJECTED":
        return "bg-red-50 text-red-700 border-red-200";
      case "CANCELLED":
        return "bg-gray-100 text-gray-500 border-gray-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admission Applications</h1>
          <p className="text-sm text-slate-500">
            Track student applications through review, decision, offer, and enrollment.
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          "ALL",
          "DRAFT",
          "SUBMITTED",
          "UNDER_REVIEW",
          "APPROVED",
          "OFFERED",
          "CONFIRMED",
          "ADMITTED",
          "REJECTED",
        ].map((tab) => {
          const isActive = (!status && tab === "ALL") || status === tab;
          return (
            <Link
              key={tab}
              href={
                tab === "ALL"
                  ? "/admissions/applications"
                  : `/admissions/applications?status=${tab}`
              }
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab}
            </Link>
          );
        })}
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {applicationsData.items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-700 mb-1">No applications found</p>
            <p className="text-sm text-slate-400">
              There are no admission applications matching the selected criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Application #</th>
                  <th className="px-6 py-3">Applicant Name</th>
                  <th className="px-6 py-3">Grade</th>
                  <th className="px-6 py-3">Session</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Reviewer</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicationsData.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-medium text-indigo-600">
                      <Link
                        href={`/admissions/applications/${item.id}`}
                        className="hover:underline"
                      >
                        {item.applicationNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {item.applicant?.fullName}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{item.grade?.name}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{item.session?.name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {item.reviewer
                        ? `${item.reviewer.firstName} ${item.reviewer.lastName}`
                        : "Unassigned"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admissions/applications/${item.id}`}
                        className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Review &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
