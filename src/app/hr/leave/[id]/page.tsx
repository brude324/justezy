import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function HRLeaveDetailPage({ params }: { params: { id: string } }) {
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

  let leaveRequest = null;
  try {
    leaveRequest = await prismaTarget.hRLeaveRequest.findFirst({
      where: { id: params.id, tenantId },
      include: {
        employment: {
          include: {
            staffProfile: { include: { user: true } },
            department: true,
            designation: true,
          },
        },
        leaveType: true,
      },
    });
  } catch {
    //
  }

  if (!leaveRequest) {
    notFound();
  }

  const emp = leaveRequest.employment;
  const user = emp?.staffProfile?.user;
  const name = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    : "Staff Member";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/hr/leave" className="hover:text-indigo-600">
          Leave Management
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Leave Request</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                leaveRequest.status === "APPROVED"
                  ? "bg-emerald-100 text-emerald-800"
                  : leaveRequest.status === "SUBMITTED"
                  ? "bg-amber-100 text-amber-800"
                  : leaveRequest.status === "REJECTED"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {leaveRequest.status}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2">
              {leaveRequest.leaveType.name} Application
            </h1>
            <p className="text-sm text-slate-500">
              Submitted on {new Date(leaveRequest.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-indigo-600">
              {leaveRequest.daysCount.toString()}
            </span>
            <span className="text-xs text-slate-500 block uppercase font-medium">Days Requested</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Applicant</p>
            <p className="font-semibold text-slate-800 mt-0.5">{name}</p>
            <p className="text-xs text-slate-500">
              {emp?.designation?.name} • {emp?.department?.name}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Employee Code</p>
            <p className="font-mono text-slate-800 font-medium mt-0.5">{emp?.employeeNumber}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Start Date</p>
            <p className="font-medium text-slate-800 mt-0.5">
              {new Date(leaveRequest.startDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">End Date</p>
            <p className="font-medium text-slate-800 mt-0.5">
              {new Date(leaveRequest.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase">Reason for Leave</p>
          <div className="mt-1 p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800">
            {leaveRequest.reason || "No explicit reason specified."}
          </div>
        </div>

        {leaveRequest.rejectionReason && (
          <div>
            <p className="text-xs text-rose-500 font-semibold uppercase">Rejection Reason</p>
            <div className="mt-1 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800">
              {leaveRequest.rejectionReason}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <Link
            href="/hr/leave"
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            ← Back to Requests
          </Link>
          <div className="text-xs text-slate-400">
            Self-approval is strictly forbidden by policy.
          </div>
        </div>
      </div>
    </div>
  );
}
