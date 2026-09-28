import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { admissionsService } from "@/lib/services/admissions-service";
import { notFound } from "next/navigation";

export default async function EnquiryDetailPage({
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
  let enquiry: any = null;

  try {
    enquiry = await admissionsService.getEnquiryById(tenantId, params.id);
  } catch {
    notFound();
  }

  if (!enquiry) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{enquiry.enquiryNumber}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {enquiry.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Registered on {new Date(enquiry.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admissions/enquiries"
            className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition"
          >
            &larr; Back to Enquiries
          </Link>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Prospective Student Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Full Name</span>
              <span className="font-medium text-slate-800">{enquiry.prospectiveStudentName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Gender</span>
              <span className="font-medium text-slate-800">{enquiry.prospectiveGender || "Not specified"}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Date of Birth</span>
              <span className="font-medium text-slate-800">
                {enquiry.prospectiveDob
                  ? new Date(enquiry.prospectiveDob).toLocaleDateString()
                  : "Not provided"}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Interested Grade</span>
              <span className="font-medium text-slate-800">
                {enquiry.interestedGrade?.name || "Any / General"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Primary Guardian Contact
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Contact Name</span>
              <span className="font-medium text-slate-800">{enquiry.primaryContactName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Relationship</span>
              <span className="font-medium text-slate-800">
                {enquiry.primaryContactRelation || "Guardian"}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Phone</span>
              <span className="font-medium text-slate-800">{enquiry.primaryContactPhone}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Email</span>
              <span className="font-medium text-slate-800">
                {enquiry.primaryContactEmail || "Not provided"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CRM Notes & Attribution */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
          CRM Notes & Lead Source
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-xs text-slate-400 block">Lead Source</span>
            <span className="font-medium text-slate-800">{enquiry.source?.name || "Direct / Walk-In"}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Assigned Counselor</span>
            <span className="font-medium text-slate-800">
              {enquiry.owner
                ? `${enquiry.owner.firstName} ${enquiry.owner.lastName}`
                : "Unassigned"}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Conversion State</span>
            <span className="font-medium text-slate-800">
              {enquiry.convertedApplicantId ? "Converted to Applicant" : "In Pipeline"}
            </span>
          </div>
        </div>
        {enquiry.notes && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
            <span className="text-xs text-slate-400 block mb-1">Counselor Notes</span>
            {enquiry.notes}
          </div>
        )}
      </div>
    </div>
  );
}
