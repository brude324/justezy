import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { prismaTarget } from "@/lib/prisma-target";
import { inventoryService } from "@/lib/services/inventory-service";

export default async function InventoryOverviewPage() {
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

  let totalItems = 0;
  let totalWarehouses = 0;
  let totalVendors = 0;
  let totalValuation = "0.00";
  let lowStockCount = 0;
  let activePOs = 0;

  try {
    const [itemsCount, warehousesCount, vendorsCount, valuation, lowStock, poCount] = await Promise.all([
      prismaTarget.inventoryItem.count({ where: { tenantId, active: true } }),
      prismaTarget.inventoryWarehouse.count({ where: { tenantId, active: true } }),
      prismaTarget.inventoryVendor.count({ where: { tenantId, active: true } }),
      inventoryService.getStockValuation(tenantId),
      inventoryService.getLowStockAlerts(tenantId),
      prismaTarget.inventoryPurchaseOrder.count({ where: { tenantId, status: { in: ["ISSUED", "PARTIALLY_RECEIVED"] } } }),
    ]);

    totalItems = itemsCount;
    totalWarehouses = warehousesCount;
    totalVendors = vendorsCount;
    totalValuation = valuation.totalValuation.toString();
    lowStockCount = lowStock.length;
    activePOs = poCount;
  } catch {
    // Fallback
  }

  const cards = [
    { title: "Catalog Items", count: totalItems, href: "/inventory/items", color: "border-indigo-500 text-indigo-600 bg-indigo-50" },
    { title: "Stock Valuation", count: `₹${totalValuation}`, href: "/inventory/stock", color: "border-emerald-500 text-emerald-600 bg-emerald-50" },
    { title: "Active Warehouses", count: totalWarehouses, href: "/inventory/warehouses", color: "border-blue-500 text-blue-600 bg-blue-50" },
    { title: "Low Stock Alerts", count: lowStockCount, href: "/inventory/reorder", color: "border-rose-500 text-rose-600 bg-rose-50" },
    { title: "Approved Vendors", count: totalVendors, href: "/inventory/vendors", color: "border-teal-500 text-teal-600 bg-teal-50" },
    { title: "Active Purchase Orders", count: activePOs, href: "/inventory/purchase-orders", color: "border-amber-500 text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory & Store Management</h1>
          <p className="text-sm text-slate-500">
            Multi-tenant catalog curation, purchase orders, real-time stock levels, and store dispatches.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/inventory/receipts"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Receive Stock
          </Link>
          <Link
            href="/inventory/issues"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            Dispatch / Issue
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className={`p-5 rounded-xl border-l-4 shadow-sm bg-white hover:shadow-md transition flex justify-between items-center ${c.color}`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.title}</p>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">{c.count}</p>
            </div>
            <span className="text-sm font-medium underline">View</span>
          </Link>
        ))}
      </div>

      {/* Quick Action Workflows */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Operations & Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link href="/inventory/items" className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-center transition">
            <p className="text-xs font-semibold text-slate-700">Catalog</p>
            <p className="text-[11px] text-slate-500">Manage SKUs</p>
          </Link>
          <Link href="/inventory/stock" className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-center transition">
            <p className="text-xs font-semibold text-slate-700">Stock Levels</p>
            <p className="text-[11px] text-slate-500">Real-time ledger</p>
          </Link>
          <Link href="/inventory/purchase-requests" className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-center transition">
            <p className="text-xs font-semibold text-slate-700">Purchase Requests</p>
            <p className="text-[11px] text-slate-500">Department requisitions</p>
          </Link>
          <Link href="/inventory/purchase-orders" className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-center transition">
            <p className="text-xs font-semibold text-slate-700">Purchase Orders</p>
            <p className="text-[11px] text-slate-500">Vendor procurement</p>
          </Link>
          <Link href="/inventory/transfers" className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-center transition">
            <p className="text-xs font-semibold text-slate-700">Stock Transfers</p>
            <p className="text-[11px] text-slate-500">Inter-store transfer</p>
          </Link>
          <Link href="/inventory/adjustments" className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-center transition">
            <p className="text-xs font-semibold text-slate-700">Adjustments</p>
            <p className="text-[11px] text-slate-500">Count audit & write-off</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
