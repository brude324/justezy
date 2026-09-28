import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";

export default async function HRDocumentsPage() {
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
  let docs: any[] = [];

  try {
    docs = await prismaTarget.hREmployeeDocument.findMany({
      where: { tenantId },
      include: {
        employment: {
          include: {
            staffProfile: { include: { user: true } },
            department: true,
          },
        },
        documentReference: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Documents & Verification</h1>
          <p className="text-sm text-slate-500">
            Employment contracts, identity credentials, educational certificates, and relieving letters.
          </p>
        </div>
        <Link
          href="/hr"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
        >
          ← Back to HR
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Document Title</th>
                <th className="px-6 py-3.5 text-left">Staff Member</th>
                <th className="px-6 py-3.5 text-left">Type</th>
                <th className="px-6 py-3.5 text-left">File Name</th>
                <th className="px-6 py-3.5 text-left">Uploaded</th>
                <th className="px-6 py-3.5 text-left">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No employee documents registered yet.
                  </td>
                </tr>
              ) : (
                docs.map((doc) => {
                  const emp = doc.employment;
                  const name = emp?.staffProfile?.user
                    ? `${emp.staffProfile.user.firstName || ""} ${emp.staffProfile.user.lastName || ""}`.trim()
                    : "Staff Member";
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">{doc.title}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {name}
                        <span className="block text-xs text-slate-400 font-mono">{emp?.employeeNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-xs font-medium text-slate-700">
                          {doc.category || doc.title}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-indigo-600">
                        {doc.documentReference?.fileName || doc.title || "document.pdf"}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            doc.isVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {doc.isVerified ? "Verified" : "Pending Verification"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
