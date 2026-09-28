import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function OffersListPage() {
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
  let offers: any[] = [];

  try {
    offers = await prismaTarget.admissionOffer.findMany({
      where: { tenantId },
      include: {
        application: {
          include: { applicant: true },
        },
        offeredGrade: true,
        offeredClass: true,
      },
      orderBy: { issuedDate: "desc" },
      take: 50,
    });
  } catch {
    // empty fallback
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admission Offers & Confirmations</h1>
          <p className="text-sm text-slate-500">
            Track official admission offers, expiry dates, and parent acceptance.
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {offers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-700 mb-1">No offers issued</p>
            <p className="text-sm text-slate-400">
              There are currently no admission offers issued to prospective applicants.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Offer #</th>
                  <th className="px-6 py-3">Applicant Name</th>
                  <th className="px-6 py-3">Offered Grade</th>
                  <th className="px-6 py-3">Issued Date</th>
                  <th className="px-6 py-3">Expiry Date</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-mono font-medium text-indigo-600">
                      {item.offerNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {item.application?.applicant?.fullName}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{item.offeredGrade?.name}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(item.issuedDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(item.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          item.status === "ACCEPTED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "EXPIRED"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}
                      >
                        {item.status}
                      </span>
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
