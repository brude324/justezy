import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { payrollService } from "@/lib/services/payroll-service";

export default async function PayrollPayslipDetailPage({ params }: { params: { id: string } }) {
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

  let payslip = null;
  try {
    payslip = await payrollService.getPayslip(tenantId, params.id);
  } catch {
    //
  }

  if (!payslip) {
    notFound();
  }

  const emp = (payslip as any).employment;
  const staff = emp?.staffProfile;
  const user = staff?.user;
  const name =
    staff?.fullName ||
    (user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Staff Member");

  let snapshot: any = (payslip as any).snapshotData || {};
  if (!snapshot.earnings && (payslip as any).snapshotJson) {
    try {
      snapshot = JSON.parse((payslip as any).snapshotJson);
    } catch {
      //
    }
  }
  const earningsList = snapshot.earnings || [];
  const deductionsList = snapshot.deductions || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/payroll/payslips" className="hover:text-emerald-600">
          Payslips
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Voucher #{payslip.payslipNumber}</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">SALARY SLIP</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              VOUCHER: #{payslip.payslipNumber} • PERIOD: {payslip.period?.name}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
              CONFIDENTIAL / OFFICIAL
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Generated: {new Date(payslip.generatedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Employee Summary Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
          <div>
            <span className="text-slate-400 uppercase font-semibold">Employee Name</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">{name}</p>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-semibold">Employee ID</span>
            <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{emp?.employeeNumber}</p>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-semibold">Department</span>
            <p className="font-semibold text-slate-800 mt-0.5">{emp?.department?.name || "General"}</p>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-semibold">Designation</span>
            <p className="font-semibold text-slate-800 mt-0.5">{emp?.designation?.name || "Staff"}</p>
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Earnings */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-teal-800 border-b pb-2 mb-3">
              Earnings
            </h2>
            <div className="space-y-2 text-sm">
              {earningsList.map((e: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <span className="text-slate-600">{e.name}</span>
                  <span className="font-mono font-medium text-slate-900">₹{e.amount}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 border-t font-bold text-slate-900">
                <span>Total Gross Earnings</span>
                <span className="font-mono text-teal-700">₹{payslip.grossEarnings.toString()}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-800 border-b pb-2 mb-3">
              Deductions
            </h2>
            <div className="space-y-2 text-sm">
              {deductionsList.map((d: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <span className="text-slate-600">{d.name}</span>
                  <span className="font-mono font-medium text-rose-600">₹{d.amount}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 border-t font-bold text-slate-900">
                <span>Total Deductions</span>
                <span className="font-mono text-rose-700">₹{payslip.totalDeductions.toString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Box */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white flex justify-between items-center">
          <div>
            <span className="text-xs uppercase font-semibold text-emerald-200">Net Take-Home Salary</span>
            <p className="text-3xl font-black mt-1">₹{payslip.netPay.toString()}</p>
          </div>
          <div className="text-right text-xs text-emerald-100">
            <p>Sealed Calculation Engine v{payslip.calculationVersion}</p>
            <p>Non-repudiable financial voucher</p>
          </div>
        </div>
      </div>
    </div>
  );
}
