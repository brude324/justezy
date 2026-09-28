import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function InterviewsListPage() {
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
  let interviews: any[] = [];

  try {
    interviews = await prismaTarget.admissionInterview.findMany({
      where: { tenantId },
      include: {
        application: {
          include: { applicant: true, grade: true },
        },
        interviewer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { scheduledDateTime: "desc" },
      take: 50,
    });
  } catch {
    // empty fallback
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interviews & Entrance Tests</h1>
          <p className="text-sm text-slate-500">
            Schedule candidate assessments, capture scores, and record evaluation notes.
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
        {interviews.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-700 mb-1">No interviews scheduled</p>
            <p className="text-sm text-slate-400">
              There are currently no interviews or tests scheduled for candidate applications.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Scheduled Date</th>
                  <th className="px-6 py-3">Applicant</th>
                  <th className="px-6 py-3">Grade</th>
                  <th className="px-6 py-3">Mode</th>
                  <th className="px-6 py-3">Interviewer</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interviews.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Date(item.scheduledDateTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {item.application?.applicant?.fullName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.application?.grade?.name}</td>
                    <td className="px-6 py-4 text-slate-500">{item.mode}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {item.interviewer
                        ? `${item.interviewer.firstName} ${item.interviewer.lastName}`
                        : "Unassigned"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{item.result}</td>
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
