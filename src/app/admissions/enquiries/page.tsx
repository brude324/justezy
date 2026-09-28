import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { admissionsService } from "@/lib/services/admissions-service";

export default async function EnquiriesListPage({
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

  let enquiriesData = {
    items: [] as any[],
    pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
  };

  try {
    enquiriesData = await admissionsService.listEnquiries({
      tenantId,
      status,
      search,
      page,
      pageSize: 20,
    });
  } catch {
    // If table empty or unseeded
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "NEW":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "CONTACTED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "QUALIFIED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "CONVERTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "LOST":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enquiries CRM</h1>
          <p className="text-sm text-slate-500">
            Prospective student enquiries, follow-ups, and lead conversion.
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
        {["ALL", "NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"].map((tab) => {
          const isActive = (!status && tab === "ALL") || status === tab;
          return (
            <Link
              key={tab}
              href={tab === "ALL" ? "/admissions/enquiries" : `/admissions/enquiries?status=${tab}`}
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

      {/* List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {enquiriesData.items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-700 mb-1">No enquiries found</p>
            <p className="text-sm text-slate-400">
              There are no admissions enquiries matching the selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Enquiry #</th>
                  <th className="px-6 py-3">Student / Child</th>
                  <th className="px-6 py-3">Contact Person</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiriesData.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-medium text-indigo-600">
                      <Link href={`/admissions/enquiries/${item.id}`} className="hover:underline">
                        {item.enquiryNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {item.prospectiveStudentName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.primaryContactName}
                      {item.primaryContactRelation && (
                        <span className="text-xs text-slate-400 block">
                          ({item.primaryContactRelation})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.primaryContactPhone}</td>
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
                      {item.owner
                        ? `${item.owner.firstName} ${item.owner.lastName}`
                        : "Unassigned"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admissions/enquiries/${item.id}`}
                        className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View &rarr;
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
