import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { admissionsService } from "@/lib/services/admissions-service";
import { notFound } from "next/navigation";

export default async function ApplicationDetailPage({
  params,
}: {
  params: { id: string };
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
  let application: any = null;

  try {
    application = await admissionsService.getApplicationById(tenantId, params.id);
  } catch {
    notFound();
  }

  if (!application) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{application.applicationNumber}</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {application.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Submitted for <strong>{application.grade?.name}</strong> &bull; Session:{" "}
            {application.session?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admissions/applications"
            className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition"
          >
            &larr; Back to Applications
          </Link>
        </div>
      </div>

      {/* Applicant & Guardian Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Applicant Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Full Name</span>
              <span className="font-semibold text-slate-900">{application.applicant?.fullName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Gender</span>
              <span className="font-medium text-slate-700">{application.applicant?.gender}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Date of Birth</span>
              <span className="font-medium text-slate-700">
                {new Date(application.applicant?.dateOfBirth).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Blood Group</span>
              <span className="font-medium text-slate-700">{application.applicant?.bloodGroup}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Guardian & Contact Details
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Guardian Name</span>
              <span className="font-semibold text-slate-900">{application.applicant?.guardianName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Relationship</span>
              <span className="font-medium text-slate-700">{application.applicant?.guardianRelationship}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Phone</span>
              <span className="font-medium text-slate-700">{application.applicant?.guardianPhone}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Email</span>
              <span className="font-medium text-slate-700">{application.applicant?.guardianEmail || "None"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Verification Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
          Document Verification ({application.documents?.length || 0})
        </h2>
        {application.documents?.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No verification documents attached yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {application.documents.map((doc: any) => (
              <div key={doc.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-slate-800">{doc.documentType}</span>
                  <span className="text-xs text-slate-400 block font-mono">
                    File: {doc.documentReference?.fileName || "Reference"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      doc.verificationStatus === "VERIFIED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : doc.verificationStatus === "REJECTED"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {doc.verificationStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision & Offers Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Admission Decision
          </h2>
          {application.decisions?.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Pending review and decision.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {application.decisions.map((dec: any) => (
                <div key={dec.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-800">{dec.decision}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(dec.decidedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {dec.reason && <p className="text-xs text-slate-600">Reason: {dec.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Offer & Enrollment State
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Offers Issued:</span>
              <span className="font-medium text-slate-800">{application.offers?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Admission Confirmed:</span>
              <span className="font-medium text-slate-800">
                {application.confirmations?.length > 0 ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Enrolled Student Profile:</span>
              <span className="font-semibold text-emerald-600">
                {application.studentProfile
                  ? application.studentProfile.admissionNumber
                  : "Not yet enrolled"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
