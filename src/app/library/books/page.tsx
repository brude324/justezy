import React from "react";
import Link from "next/link";
import { prismaTarget } from "@/lib/prisma-target";
import { headers } from "next/headers";
import { libraryService } from "@/lib/services/library-service";

export default async function LibraryBooksPage({
  searchParams,
}: {
  searchParams?: { search?: string; page?: string };
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
  const search = searchParams?.search || "";
  const page = parseInt(searchParams?.page || "1", 10);

  let bookList: any = { items: [], total: 0, page: 1, totalPages: 1 };
  try {
    bookList = await libraryService.listBooks({
      tenantId,
      search,
      page,
      pageSize: 20,
    });
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bibliographic Book Catalog</h1>
          <p className="text-sm text-slate-500">Titles, ISBNs, authors, and copy inventory.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/library/copies"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            Physical Copies
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form method="GET" className="flex gap-2">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by title, ISBN, or subject..."
            aria-label="Search by title, ISBN, or subject"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Title & Subtitle</th>
                <th className="px-6 py-3">ISBN</th>
                <th className="px-6 py-3">Author / Publisher</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Copies</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookList.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No catalog records found matching criteria.
                  </td>
                </tr>
              ) : (
                bookList.items.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <Link href={`/library/books/${b.id}`} className="font-semibold text-slate-900 hover:text-emerald-600">
                        {b.title}
                      </Link>
                      {b.subtitle && <p className="text-xs text-slate-500">{b.subtitle}</p>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {b.isbn || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <p>{b.author?.name || "—"}</p>
                      <p className="text-xs text-slate-400">{b.publisher?.name || ""}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {b.category?.name || "General"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        {b.copies?.length || 0} copies
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/library/books/${b.id}`}
                        className="text-emerald-600 hover:underline font-medium text-xs"
                      >
                        Details
                      </Link>
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
