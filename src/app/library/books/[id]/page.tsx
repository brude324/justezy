import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { libraryService } from "@/lib/services/library-service";
import { notFound } from "next/navigation";

export default async function LibraryBookDetailPage({
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
  } catch {}

  const tenantId = tenant?.id || "demo";

  let book = null;
  try {
    book = await libraryService.getBook(tenantId, params.id);
  } catch {
    notFound();
  }

  if (!book) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/library/books" className="text-sm font-medium text-slate-500 hover:text-emerald-600">
          ← Back to Catalog
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-6">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wide">
            {book.category?.name || "Book"}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">{book.title}</h1>
          {book.subtitle && <p className="text-base text-slate-600">{book.subtitle}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs text-slate-500">
            <div>
              <span className="block font-medium text-slate-400">Author</span>
              <span className="text-slate-800 font-semibold">{book.author?.name || "—"}</span>
            </div>
            <div>
              <span className="block font-medium text-slate-400">Publisher</span>
              <span className="text-slate-800 font-semibold">{book.publisher?.name || "—"}</span>
            </div>
            <div>
              <span className="block font-medium text-slate-400">ISBN</span>
              <span className="text-slate-800 font-semibold">{book.isbn || "—"}</span>
            </div>
            <div>
              <span className="block font-medium text-slate-400">Edition / Year</span>
              <span className="text-slate-800 font-semibold">
                {book.edition || "1st"} ({book.publicationYear || "—"})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Copies Inventory Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">Physical Copies ({book.copies?.length || 0})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Accession #</th>
                <th className="px-6 py-3">Barcode</th>
                <th className="px-6 py-3">Location / Shelf</th>
                <th className="px-6 py-3">Condition</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {book.copies?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-500">
                    No physical copies accessioned yet for this title.
                  </td>
                </tr>
              ) : (
                book.copies.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">
                      {c.accessionNumber}
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
