import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { libraryService } from "@/lib/services/library-service";

export default async function LibraryCopiesPage({
  searchParams,
}: {
  searchParams?: { status?: string; search?: string };
}) {
  const reqHeaders = headers();
  const host = reqHeaders.get("host") || "";
  const tenantSlug = host.split(".")[0] || "demo";

  let tenant = null;
  try {
    tenant = await prismaTarget.tenant.findFirst({
      where: { OR: [{ slug: tenantSlug }, { id: tenantSlug }] },
    });
  } catch {}

  const tenantId = tenant?.id || "demo";
  const search = searchParams?.search;
  const status = searchParams?.status as any;

  let copies: any = { items: [], total: 0 };
  try {
    copies = await libraryService.listBookCopies({
      tenantId,
      status,
      search,
      pageSize: 50,
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Physical Copies & Inventory</h1>
          <p className="text-sm text-slate-500">Track barcodes, shelf locations, conditions, and copy availability.</p>
        </div>
        <Link
          href="/library/books"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          View Titles Catalog
        </Link>
      </div>

      {/* Copies Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Accession Number</th>
                <th className="px-6 py-3">Book Title</th>
                <th className="px-6 py-3">Barcode</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Condition</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {copies.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No physical copies found in inventory.
                  </td>
                </tr>
              ) : (
                copies.items.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {c.accessionNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <Link href={`/library/books/${c.bookId}`} className="hover:text-emerald-600">
                        {c.book?.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {c.barcode || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.location || "General Stacks"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.condition}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          c.status === "AVAILABLE"
                            ? "bg-emerald-100 text-emerald-800"
                            : c.status === "ISSUED"
                            ? "bg-indigo-100 text-indigo-800"
                            : c.status === "LOST"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
