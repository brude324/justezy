import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { hrService } from "@/lib/services/hr-service";

export default async function HRHolidaysPage() {
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
  let calendars: any[] = [];

  try {
    calendars = await hrService.listHolidayCalendars(tenantId);
  } catch {
    //
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Institutional Holiday Calendars</h1>
          <p className="text-sm text-slate-500">
            Tenant-configurable annual holiday calendars, public holidays, academic vacations, and restricted holidays.
          </p>
        </div>
        <Link
          href="/hr"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
        >
          ← Back to HR
        </Link>
      </div>

      <div className="space-y-6">
        {calendars.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400">
            No holiday calendars configured for this institution yet.
          </div>
        ) : (
          calendars.map((cal) => (
            <div key={cal.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-800">{cal.name}</h2>
                  <p className="text-xs text-slate-500">Year: {cal.year} • {cal.holidays?.length || 0} configured holidays</p>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded font-semibold ${cal.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                  {cal.active ? "Active Calendar" : "Archived"}
                </span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cal.holidays?.map((h: any) => (
                    <div key={h.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{h.name}</p>
                        <p className="text-xs text-slate-500">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-600">
                        {h.holidayType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
