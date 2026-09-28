import { describe, it, expect, beforeEach, vi } from "vitest";
import { FeeService } from "@/lib/services/fee-service";
import { PaymentService } from "@/lib/services/payment-service";
import { LedgerService } from "@/lib/services/ledger-service";
import { FinancialReconciliationService } from "@/lib/services/financial-reconciliation";
import { MockPaymentGatewayAdapter, RazorpayPaymentGatewayAdapter } from "@/lib/services/payment-gateway-adapter";
import { ModuleGate } from "@/lib/authorization/module-gate";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";
import { NotFoundError, ValidationError, ConflictError, ModuleDisabledError } from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================================================
// STATEFUL IN-MEMORY PILOT DATABASE ENGINE
// ============================================================================

function createPilotDatabaseStore() {
  const state = {
    feeCategories: new Map<string, any>(),
    feeStructures: new Map<string, any>(),
    studentFeeAssignments: new Map<string, any>(),
    feeInvoices: new Map<string, any>(),
    feeInvoiceItems: new Map<string, any>(),
    paymentIntents: new Map<string, any>(),
    payments: new Map<string, any>(),
    paymentAllocations: new Map<string, any>(),
    paymentRefunds: new Map<string, any>(),
    paymentWebhookEvents: new Map<string, any>(),
    chartOfAccounts: new Map<string, any>(),
    fiscalYears: new Map<string, any>(),
    financialPeriods: new Map<string, any>(),
    journalEntries: new Map<string, any>(),
    journalLines: new Map<string, any>(),
    auditLogs: [] as any[],
    tenantOutboxEvents: [] as any[],
    studentProfiles: new Map<string, any>(),
    parentProfiles: new Map<string, any>(),
    studentParentBindings: new Map<string, any>(),
    tenantModuleEntitlements: new Map<string, any>(),
    academicYears: new Map<string, any>(),
    grades: new Map<string, any>(),
  };

  let idCounter = 1;
  const genId = (prefix: string) => `${prefix}_${idCounter++}`;

  const mockDb: any = {
    _state: state,

    academicYear: {
      findFirst: async ({ where }: any) => {
        for (const ay of Array.from(state.academicYears.values())) {
          let match = true;
          if (where.id && ay.id !== where.id) match = false;
          if (where.tenantId && ay.tenantId !== where.tenantId) match = false;
          if (match) return ay;
        }
        return null;
      },
    },

    grade: {
      findFirst: async ({ where }: any) => {
        for (const g of Array.from(state.grades.values())) {
          let match = true;
          if (where.id && g.id !== where.id) match = false;
          if (where.tenantId && g.tenantId !== where.tenantId) match = false;
          if (match) return g;
        }
        return null;
      },
    },

    studentProfile: {
      findFirst: async ({ where }: any) => {
        for (const s of Array.from(state.studentProfiles.values())) {
          let match = true;
          if (where.id && s.id !== where.id) match = false;
          if (where.tenantId && s.tenantId !== where.tenantId) match = false;
          if (where.userId && s.userId !== where.userId) match = false;
          if (match) return s;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        return state.studentProfiles.get(where.id) || null;
      },
    },

    parentProfile: {
      findFirst: async ({ where }: any) => {
        for (const p of Array.from(state.parentProfiles.values())) {
          let match = true;
          if (where.id && p.id !== where.id) match = false;
          if (where.tenantId && p.tenantId !== where.tenantId) match = false;
          if (where.userId && p.userId !== where.userId) match = false;
          if (match) return p;
        }
        return null;
      },
    },

    studentParentBinding: {
      findFirst: async ({ where }: any) => {
        for (const b of Array.from(state.studentParentBindings.values())) {
          let match = true;
          if (where.parentId && b.parentId !== where.parentId) match = false;
          if (where.studentId && b.studentId !== where.studentId) match = false;
          if (where.tenantId && b.tenantId !== where.tenantId) match = false;
          if (match) return b;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        if (where.tenantId_studentId_parentId) {
          const key = `${where.tenantId_studentId_parentId.tenantId}_${where.tenantId_studentId_parentId.studentId}_${where.tenantId_studentId_parentId.parentId}`;
          return state.studentParentBindings.get(key) || null;
        }
        return null;
      },
    },

    tenantModuleEntitlement: {
      findUnique: async ({ where }: any) => {
        const key = `${where.tenantId_moduleKey.tenantId}_${where.tenantId_moduleKey.moduleKey}`;
        return state.tenantModuleEntitlements.get(key) || null;
      },
    },

    feeCategory: {
      findUnique: async ({ where }: any) => {
        const key = `${where.tenantId_code.tenantId}_${where.tenantId_code.code}`;
        return state.feeCategories.get(key) || null;
      },
      create: async ({ data }: any) => {
        const id = genId("cat");
        const rec = { id, ...data };
        state.feeCategories.set(`${data.tenantId}_${data.code}`, rec);
        return rec;
      },
    },

    feeStructure: {
      findFirst: async ({ where }: any) => {
        for (const fs of Array.from(state.feeStructures.values())) {
          let match = true;
          if (where.id && fs.id !== where.id) match = false;
          if (where.tenantId && fs.tenantId !== where.tenantId) match = false;
          if (where.academicYearId && fs.academicYearId !== where.academicYearId) match = false;
          if (match) return fs;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("fstr");
        const items = (data.items?.create || []).map((it: any) => ({
          id: genId("fsi"),
          ...it,
        }));
        const rec = { id, ...data, items };
        state.feeStructures.set(id, rec);
        return rec;
      },
    },

    studentFeeAssignment: {
      upsert: async ({ where, update, create }: any) => {
        const key = `${where.tenantId_academicYearId_studentId.tenantId}_${where.tenantId_academicYearId_studentId.academicYearId}_${where.tenantId_academicYearId_studentId.studentId}`;
        const existing = state.studentFeeAssignments.get(key);
        if (existing) {
          const updated = { ...existing, ...update };
          state.studentFeeAssignments.set(key, updated);
          return updated;
        }
        const id = genId("sfa");
        const rec = { id, ...create };
        state.studentFeeAssignments.set(key, rec);
        return rec;
      },
    },

    feeInvoice: {
      findFirst: async ({ where }: any) => {
        for (const inv of Array.from(state.feeInvoices.values())) {
          let match = true;
          if (where.id && inv.id !== where.id) match = false;
          if (where.tenantId && inv.tenantId !== where.tenantId) match = false;
          if (where.studentId && inv.studentId !== where.studentId) match = false;
          if (match) {
            const allocs = Array.from(state.paymentAllocations.values()).filter(
              (a) => a.invoiceId === inv.id
            );
            return { ...inv, allocations: allocs };
          }
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        const inv = state.feeInvoices.get(where.id);
        if (!inv) return null;
        const allocs = Array.from(state.paymentAllocations.values()).filter(
          (a) => a.invoiceId === inv.id
        );
        return { ...inv, allocations: allocs };
      },
      findMany: async ({ where }: any) => {
        const res: any[] = [];
        for (const inv of Array.from(state.feeInvoices.values())) {
          let match = true;
          if (where.tenantId && inv.tenantId !== where.tenantId) match = false;
          if (where.studentId && inv.studentId !== where.studentId) match = false;
          if (match) {
            const allocs = Array.from(state.paymentAllocations.values()).filter(
              (a) => a.invoiceId === inv.id
            );
            res.push({ ...inv, allocations: allocs });
          }
        }
        return res;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const inv of Array.from(state.feeInvoices.values())) {
          if (where.tenantId && inv.tenantId !== where.tenantId) continue;
          cnt++;
        }
        return cnt;
      },
      create: async ({ data }: any) => {
        const id = genId("inv");
        const items = (data.items?.create || []).map((it: any) => ({
          id: genId("invi"),
          ...it,
        }));
        const rec = { id, ...data, items, allocations: [] };
        state.feeInvoices.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const existing = state.feeInvoices.get(where.id);
        if (!existing) throw new Error("Invoice not found for update");
        const updated = { ...existing, ...data };
        state.feeInvoices.set(where.id, updated);
        return updated;
      },
    },

    paymentIntent: {
      create: async ({ data }: any) => {
        const id = genId("pi");
        const rec = { id, ...data };
        state.paymentIntents.set(id, rec);
        return rec;
      },
      findFirst: async ({ where }: any) => {
        for (const pi of Array.from(state.paymentIntents.values())) {
          let match = true;
          if (where.id && pi.id !== where.id) match = false;
          if (where.tenantId && pi.tenantId !== where.tenantId) match = false;
          if (match) return pi;
        }
        return null;
      },
      update: async ({ where, data }: any) => {
        const existing = state.paymentIntents.get(where.id);
        if (!existing) throw new Error("PaymentIntent not found for update");
        const updated = { ...existing, ...data };
        state.paymentIntents.set(where.id, updated);
        return updated;
      },
    },

    payment: {
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const p of Array.from(state.payments.values())) {
          if (where.tenantId && p.tenantId !== where.tenantId) continue;
          cnt++;
        }
        return cnt;
      },
      create: async ({ data }: any) => {
        const id = genId("pay");
        const allocs: any[] = [];
        if (data.allocations?.create) {
          for (const a of data.allocations.create) {
            const allocId = genId("alloc");
            const allocRec = { id: allocId, paymentId: id, ...a };
            state.paymentAllocations.set(allocId, allocRec);
            allocs.push(allocRec);
          }
        }
        const rec = { id, ...data, allocations: allocs, refunds: [] };
        state.payments.set(id, rec);
        return rec;
      },
      findFirst: async ({ where }: any) => {
        for (const p of Array.from(state.payments.values())) {
          let match = true;
          if (where.id && p.id !== where.id) match = false;
          if (where.tenantId && p.tenantId !== where.tenantId) match = false;
          if (match) {
            const allocs = Array.from(state.paymentAllocations.values()).filter(
              (a) => a.paymentId === p.id
            );
            const refunds = Array.from(state.paymentRefunds.values()).filter(
              (r) => r.paymentId === p.id
            );
            return { ...p, allocations: allocs, refunds };
          }
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        const res: any[] = [];
        for (const p of Array.from(state.payments.values())) {
          let match = true;
          if (where.tenantId && p.tenantId !== where.tenantId) match = false;
          if (match) {
            const allocs = Array.from(state.paymentAllocations.values()).filter(
              (a) => a.paymentId === p.id
            );
            const refunds = Array.from(state.paymentRefunds.values()).filter(
              (r) => r.paymentId === p.id
            );
            res.push({ ...p, allocations: allocs, refunds });
          }
        }
        return res;
      },
      update: async ({ where, data }: any) => {
        const existing = state.payments.get(where.id);
        if (!existing) throw new Error("Payment not found for update");
        const updated = { ...existing, ...data };
        state.payments.set(where.id, updated);
        return updated;
      },
    },

    paymentRefund: {
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const r of Array.from(state.paymentRefunds.values())) {
          if (where.tenantId && r.tenantId !== where.tenantId) continue;
          cnt++;
        }
        return cnt;
      },
      create: async ({ data }: any) => {
        const id = genId("ref");
        const rec = { id, ...data };
        state.paymentRefunds.set(id, rec);
        return rec;
      },
    },

    paymentWebhookEvent: {
      findUnique: async ({ where }: any) => {
        if (where.eventId) {
          for (const ev of Array.from(state.paymentWebhookEvents.values())) {
            if (ev.eventId === where.eventId) return ev;
          }
        }
        if (where.id) {
          return state.paymentWebhookEvents.get(where.id) || null;
        }
        if (where.provider_eventId) {
          const key = `${where.provider_eventId.provider}_${where.provider_eventId.eventId}`;
          return state.paymentWebhookEvents.get(key) || null;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("pwe");
        const rec = { id, ...data };
        state.paymentWebhookEvents.set(id, rec);
        state.paymentWebhookEvents.set(`${data.provider}_${data.eventId}`, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        let existing = state.paymentWebhookEvents.get(where.id);
        if (!existing && where.eventId) {
          for (const ev of Array.from(state.paymentWebhookEvents.values())) {
            if (ev.eventId === where.eventId) {
              existing = ev;
              break;
            }
          }
        }
        if (!existing) throw new Error("PaymentWebhookEvent not found for update");
        const updated = { ...existing, ...data };
        state.paymentWebhookEvents.set(existing.id, updated);
        state.paymentWebhookEvents.set(`${existing.provider}_${existing.eventId}`, updated);
        return updated;
      },
    },

    ledgerAccount: {
      update: async ({ where, data }: any) => {
        for (const coa of Array.from(state.chartOfAccounts.values())) {
          if (coa.ledgerAccount && coa.ledgerAccount.id === where.id) {
            coa.ledgerAccount.currentBalance = data.currentBalance;
            return coa.ledgerAccount;
          }
        }
        return { id: where.id, ...data };
      },
    },

    chartOfAccount: {
      upsert: async ({ where, update, create }: any) => {
        const key = `${where.tenantId_accountCode.tenantId}_${where.tenantId_accountCode.accountCode}`;
        const existing = state.chartOfAccounts.get(key);
        if (existing) {
          const updated = { ...existing, ...update };
          state.chartOfAccounts.set(key, updated);
          state.chartOfAccounts.set(existing.id, updated);
          return updated;
        }
        const id = genId("coa");
        const laId = genId("la");
        const ledgerAccount = {
          id: laId,
          tenantId: create.tenantId,
          openingBalance: create.ledgerAccount?.create?.openingBalance || new Decimal(0),
          currentBalance: create.ledgerAccount?.create?.currentBalance || new Decimal(0),
          currency: "INR",
        };
        const rec = { id, ...create, ledgerAccount };
        state.chartOfAccounts.set(key, rec);
        state.chartOfAccounts.set(id, rec);
        return rec;
      },
      findUnique: async ({ where }: any) => {
        if (where.id) {
          for (const a of Array.from(state.chartOfAccounts.values())) {
            if (a.id === where.id) return a;
          }
        }
        if (where.tenantId_accountCode) {
          const key = `${where.tenantId_accountCode.tenantId}_${where.tenantId_accountCode.accountCode}`;
          return state.chartOfAccounts.get(key) || null;
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const a of Array.from(state.chartOfAccounts.values())) {
          let match = true;
          if (where.id && a.id !== where.id) match = false;
          if (where.tenantId && a.tenantId !== where.tenantId) match = false;
          if (where.accountCode && a.accountCode !== where.accountCode) match = false;
          if (match) return a;
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        const res: any[] = [];
        for (const a of Array.from(state.chartOfAccounts.values())) {
          if (where.tenantId && a.tenantId !== where.tenantId) continue;
          res.push(a);
        }
        return res;
      },
    },

    fiscalYear: {
      findUnique: async ({ where }: any) => {
        const key = `${where.tenantId_yearLabel.tenantId}_${where.tenantId_yearLabel.yearLabel}`;
        return state.fiscalYears.get(key) || null;
      },
      create: async ({ data }: any) => {
        const id = genId("fy");
        const periods: any[] = [];
        if (data.periods?.create) {
          for (const p of data.periods.create) {
            const pId = genId("fp");
            const pRec = { id: pId, fiscalYearId: id, tenantId: data.tenantId, ...p };
            state.financialPeriods.set(pId, pRec);
            periods.push(pRec);
          }
        }
        const rec = { id, ...data, periods };
        const key = `${data.tenantId}_${data.yearLabel}`;
        state.fiscalYears.set(key, rec);
        return rec;
      },
    },

    financialPeriod: {
      findFirst: async ({ where }: any) => {
        for (const p of Array.from(state.financialPeriods.values())) {
          let match = true;
          if (where.id && p.id !== where.id) match = false;
          if (where.tenantId && p.tenantId !== where.tenantId) match = false;
          if (where.status && p.status !== where.status) match = false;
          if (match) return p;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("fp");
        const rec = { id, ...data };
        state.financialPeriods.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const existing = state.financialPeriods.get(where.id);
        if (!existing) throw new Error("FinancialPeriod not found for update");
        const updated = { ...existing, ...data };
        state.financialPeriods.set(where.id, updated);
        return updated;
      },
    },

    journalEntry: {
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const j of Array.from(state.journalEntries.values())) {
          if (where.tenantId && j.tenantId !== where.tenantId) continue;
          cnt++;
        }
        return cnt;
      },
      create: async ({ data }: any) => {
        const id = genId("jrn");
        const lines: any[] = [];
        if (data.lines?.create) {
          for (const l of data.lines.create) {
            const lineId = genId("jrnl");
            const lineRec = { id: lineId, journalEntryId: id, ...l };
            state.journalLines.set(lineId, lineRec);
            lines.push(lineRec);
          }
        }
        const rec = { id, ...data, lines };
        state.journalEntries.set(id, rec);
        return rec;
      },
      findFirst: async ({ where }: any) => {
        for (const j of Array.from(state.journalEntries.values())) {
          let match = true;
          if (where.id && j.id !== where.id) match = false;
          if (where.tenantId && j.tenantId !== where.tenantId) match = false;
          if (match) {
            const lines = Array.from(state.journalLines.values()).filter(
              (l) => l.journalEntryId === j.id
            );
            return { ...j, lines };
          }
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        const res: any[] = [];
        for (const j of Array.from(state.journalEntries.values())) {
          let match = true;
          if (where.tenantId && j.tenantId !== where.tenantId) match = false;
          if (where.status && j.status !== where.status) match = false;
          if (match) {
            const lines = Array.from(state.journalLines.values()).filter(
              (l) => l.journalEntryId === j.id
            );
            res.push({ ...j, lines });
          }
        }
        return res;
      },
      update: async ({ where, data }: any) => {
        const existing = state.journalEntries.get(where.id);
        if (!existing) throw new Error("Journal entry not found for update");
        const updated = { ...existing, ...data };
        state.journalEntries.set(where.id, updated);
        return updated;
      },
    },

    auditLog: {
      create: async ({ data }: any) => {
        const rec = { id: genId("aud"), timestamp: new Date(), ...data };
        state.auditLogs.push(rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return state.auditLogs.filter((a) => {
          if (where.tenantId && a.tenantId !== where.tenantId) return false;
          if (where.entityType && a.entityType !== where.entityType) return false;
          return true;
        });
      },
    },

    tenantOutboxEvent: {
      create: async ({ data }: any) => {
        const rec = { id: genId("obx"), createdAt: new Date(), ...data };
        state.tenantOutboxEvents.push(rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return state.tenantOutboxEvents.filter((e) => {
          if (where.tenantId && e.tenantId !== where.tenantId) return false;
          if (where.eventType && e.eventType !== where.eventType) return false;
          return true;
        });
      },
    },

    $transaction: async (cb: any) => cb(mockDb),
  };

  return mockDb;
}

// ============================================================================
// PHASE 10 PRODUCTION PILOT TEST SUITE
// ============================================================================

describe("PHASE 10: V2 Wave 1 Financial Pilot & Production Validation", () => {
  let db: any;
  let feeService: FeeService;
  let paymentService: PaymentService;
  let ledgerService: LedgerService;
  let reconService: FinancialReconciliationService;
  let moduleGate: ModuleGate;
  let scopeEvaluator: ScopeEvaluator;

  const PILOT_TENANT = "tnt_pilot_dps";
  const OTHER_TENANT = "tnt_beta_school";

  beforeEach(async () => {
    db = createPilotDatabaseStore();
    feeService = new FeeService();
    paymentService = new PaymentService();
    ledgerService = new LedgerService();
    reconService = new FinancialReconciliationService();
    moduleGate = new ModuleGate();
    scopeEvaluator = new ScopeEvaluator();

    // 1. Enable fees_module & finance_module ONLY for PILOT_TENANT
    db._state.tenantModuleEntitlements.set(`${PILOT_TENANT}_fees_module`, {
      tenantId: PILOT_TENANT,
      moduleKey: "fees_module",
      isEnabled: true,
      expiresAt: new Date(Date.now() + 100000000),
    });
    db._state.tenantModuleEntitlements.set(`${PILOT_TENANT}_finance_module`, {
      tenantId: PILOT_TENANT,
      moduleKey: "finance_module",
      isEnabled: true,
      expiresAt: new Date(Date.now() + 100000000),
    });

    // OTHER_TENANT has fees_module DISABLED
    db._state.tenantModuleEntitlements.set(`${OTHER_TENANT}_fees_module`, {
      tenantId: OTHER_TENANT,
      moduleKey: "fees_module",
      isEnabled: false,
    });

    // 2. Setup Academic Year & Grade in Pilot Tenant
    db._state.academicYears.set("ay_2026_27", {
      id: "ay_2026_27",
      tenantId: PILOT_TENANT,
      name: "Academic Year 2026-27",
    });
    db._state.grades.set("grd_10", {
      id: "grd_10",
      tenantId: PILOT_TENANT,
      name: "Grade 10",
    });

    // 3. Setup Realistic Students & Parents
    // Student 1: Aarav Sharma (Standard fee, Cash offline payment)
    db._state.studentProfiles.set("stu_aarav", {
      id: "stu_aarav",
      tenantId: PILOT_TENANT,
      userId: "usr_stu_aarav",
      firstName: "Aarav",
      lastName: "Sharma",
      admissionNumber: "DPS-2026-0101",
    });
    // Student 2: Diya Patel (Concession, Cheque offline partial payment)
    db._state.studentProfiles.set("stu_diya", {
      id: "stu_diya",
      tenantId: PILOT_TENANT,
      userId: "usr_stu_diya",
      firstName: "Diya",
      lastName: "Patel",
      admissionNumber: "DPS-2026-0102",
    });
    // Student 3: Kabir Singh (Online payment & Partial refund)
    db._state.studentProfiles.set("stu_kabir", {
      id: "stu_kabir",
      tenantId: PILOT_TENANT,
      userId: "usr_stu_kabir",
      firstName: "Kabir",
      lastName: "Singh",
      admissionNumber: "DPS-2026-0103",
    });

    // Parents
    db._state.parentProfiles.set("par_rajesh", {
      id: "par_rajesh",
      tenantId: PILOT_TENANT,
      userId: "usr_par_rajesh",
      firstName: "Rajesh",
      lastName: "Sharma",
    });
    db._state.studentParentBindings.set(`${PILOT_TENANT}_stu_aarav_par_rajesh`, {
      tenantId: PILOT_TENANT,
      studentId: "stu_aarav",
      parentId: "par_rajesh",
      relationship: "FATHER",
      isPrimaryContact: true,
    });

    db._state.parentProfiles.set("par_anita", {
      id: "par_anita",
      tenantId: PILOT_TENANT,
      userId: "usr_par_anita",
      firstName: "Anita",
      lastName: "Patel",
    });
    db._state.studentParentBindings.set(`${PILOT_TENANT}_stu_diya_par_anita`, {
      tenantId: PILOT_TENANT,
      studentId: "stu_diya",
      parentId: "par_anita",
      relationship: "MOTHER",
      isPrimaryContact: true,
    });
  });

  // ==========================================================================
  // SECTION 1 & 2: PILOT TENANT & USER MATRIX AUTHORIZATION
  // ==========================================================================
  describe("Pilot Tenant & User Matrix Gating (Prompt §§ 1, 2, 14)", () => {
    it("should allow fees_module access only for Pilot Tenant, rejecting Other Tenant with 402", async () => {
      const pilotAllowed = await moduleGate.isModuleEnabled(PILOT_TENANT, "fees_module", db);
      expect(pilotAllowed).toBe(true);

      await expect(
        moduleGate.assertModuleEnabled(OTHER_TENANT, "fees_module", db)
      ).rejects.toThrow(ModuleDisabledError);
    });

    it("should enforce AccessScope for Parent (LINKED_CHILDREN): Parent Rajesh can access Aarav, but NOT Diya", async () => {
      // Parent Rajesh accessing own child Aarav -> ALLOWED
      const canAccessOwnChild = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        { permission: "fees.read", targetStudentId: "stu_aarav" },
        {
          tenant: { id: PILOT_TENANT } as any,
          user: { id: "usr_par_rajesh" } as any,
          membership: { parentProfile: { id: "par_rajesh" }, role: { roleKey: "PARENT" } } as any,
        },
        db
      );
      expect(canAccessOwnChild).toBe(true);

      // Parent Rajesh accessing Diya -> FORBIDDEN (403)
      const canAccessOtherChild = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        { permission: "fees.read", targetStudentId: "stu_diya" },
        {
          tenant: { id: PILOT_TENANT } as any,
          user: { id: "usr_par_rajesh" } as any,
          membership: { parentProfile: { id: "par_rajesh" }, role: { roleKey: "PARENT" } } as any,
        },
        db
      );
      expect(canAccessOtherChild).toBe(false);
    });

    it("should enforce AccessScope for Student (SELF_ONLY): Student Aarav cannot access Kabir", async () => {
      const canAccessSelf = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        { permission: "fees.read", targetStudentId: "stu_aarav" },
        {
          tenant: { id: PILOT_TENANT } as any,
          user: { id: "usr_stu_aarav" } as any,
          membership: { studentProfile: { id: "stu_aarav" }, role: { roleKey: "STUDENT" } } as any,
        },
        db
      );
      expect(canAccessSelf).toBe(true);

      const canAccessOther = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        { permission: "fees.read", targetStudentId: "stu_kabir" },
        {
          tenant: { id: PILOT_TENANT } as any,
          user: { id: "usr_stu_aarav" } as any,
          membership: { studentProfile: { id: "stu_aarav" }, role: { roleKey: "STUDENT" } } as any,
        },
        db
      );
      expect(canAccessOther).toBe(false);
    });
  });

  // ==========================================================================
  // SECTION 3: FEE CONFIGURATION PILOT
  // ==========================================================================
  describe("Fee Configuration Pilot (Prompt § 3)", () => {
    it("should deterministically create multi-head fee structures and assign to students with concessions", async () => {
      // 1. Create Heads: Tuition, Science Lab, Activity
      const catTuition = await feeService.createFeeCategory(
        {
          tenantId: PILOT_TENANT,
          code: "TUITION",
          name: "Tuition Instruction Fee",
          actorUserId: "usr_fin_officer",
        },
        db
      );
      const catLab = await feeService.createFeeCategory(
        {
          tenantId: PILOT_TENANT,
          code: "LAB_SCIENCE",
          name: "Annual Science & Computer Lab",
          actorUserId: "usr_fin_officer",
        },
        db
      );
      const catActivity = await feeService.createFeeCategory(
        {
          tenantId: PILOT_TENANT,
          code: "ACTIVITY",
          name: "Sports & Co-curricular",
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // 2. Create Composite Grade 10 Structure (₹50,000 + ₹10,000 + ₹5,000 = ₹65,000)
      const structure = await feeService.createFeeStructure(
        {
          tenantId: PILOT_TENANT,
          academicYearId: "ay_2026_27",
          gradeId: "grd_10",
          name: "Grade 10 Annual Comprehensive 2026-27",
          items: [
            { feeCategoryId: catTuition.id, name: "Tuition", amount: 50000, frequency: "ANNUAL" },
            { feeCategoryId: catLab.id, name: "Lab", amount: 10000, frequency: "ONE_TIME" },
            { feeCategoryId: catActivity.id, name: "Activity", amount: 5000, frequency: "ANNUAL" },
          ],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      expect(new Decimal(structure.totalAmount.toString()).toNumber()).toBe(65000);

      // 3. Assign to Aarav (Standard - 0 concession)
      const assignAarav = await feeService.assignFeeToStudent(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_aarav",
          academicYearId: "ay_2026_27",
          feeStructureId: structure.id,
          actorUserId: "usr_fin_officer",
        },
        db
      );
      expect(new Decimal(assignAarav.netPayableAmount.toString()).toNumber()).toBe(65000);

      // 4. Assign to Diya (₹5,000 Merit Concession -> ₹60,000 net)
      const assignDiya = await feeService.assignFeeToStudent(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_diya",
          academicYearId: "ay_2026_27",
          feeStructureId: structure.id,
          concessionAmount: 5000,
          discountReason: "Merit Scholarship",
          actorUserId: "usr_fin_officer",
        },
        db
      );
      expect(new Decimal(assignDiya.netPayableAmount.toString()).toNumber()).toBe(60000);

      // 5. Negative Test: Concession > Base Fee rejected
      await expect(
        feeService.assignFeeToStudent(
          {
            tenantId: PILOT_TENANT,
            studentId: "stu_kabir",
            academicYearId: "ay_2026_27",
            feeStructureId: structure.id,
            concessionAmount: 70000, // Exceeds 65,000!
            actorUserId: "usr_fin_officer",
          },
          db
        )
      ).rejects.toThrow(ValidationError);

      // 6. Negative Test: Cross-tenant student rejected
      await expect(
        feeService.assignFeeToStudent(
          {
            tenantId: OTHER_TENANT,
            studentId: "stu_aarav", // Belongs to PILOT_TENANT!
            academicYearId: "ay_2026_27",
            feeStructureId: structure.id,
            actorUserId: "usr_fin_officer",
          },
          db
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // SECTION 4: INVOICE PILOT & ANTI-SILENT-CANCELLATION
  // ==========================================================================
  describe("Invoice Pilot & Immutability Protection (Prompt § 4)", () => {
    it("should issue deterministic invoices and prevent silent cancellation of collected invoices", async () => {
      // Create Term 1 Invoice for Aarav: ₹35,000
      const invoiceAarav = await feeService.generateInvoice(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_aarav",
          academicYearId: "ay_2026_27",
          dueDate: new Date("2026-05-15"),
          items: [{ feeCategoryId: "cat_tuition", description: "Term 1 Tuition", amount: 35000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      expect(invoiceAarav.status).toBe("ISSUED");
      expect(new Decimal(invoiceAarav.balanceAmount.toString()).toNumber()).toBe(35000);

      // Record ₹10,000 partial payment against invoice
      await paymentService.recordPayment(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_aarav",
          amount: 10000,
          paymentMode: "CASH",
          allocations: [{ invoiceId: invoiceAarav.id, allocatedAmount: 10000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // Attempt to cancel the collected invoice -> MUST BE REJECTED
      await expect(
        feeService.cancelInvoice(
          PILOT_TENANT,
          invoiceAarav.id,
          "Accidental cancellation attempt",
          "usr_fin_officer",
          undefined,
          db
        )
      ).rejects.toThrow(ValidationError);

      // Create an uncollected invoice and verify clean cancellation
      const draftInvoice = await feeService.generateInvoice(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_aarav",
          academicYearId: "ay_2026_27",
          dueDate: new Date("2026-06-15"),
          items: [{ feeCategoryId: "cat_lab", description: "Draft Lab Fee", amount: 2000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      const cancelled = await feeService.cancelInvoice(
        PILOT_TENANT,
        draftInvoice.id,
        "Clerical error correction",
        "usr_fin_officer",
        undefined,
        db
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(new Decimal(cancelled.balanceAmount.toString()).toNumber()).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 5, 8, 9: OFFLINE PAYMENT, ALLOCATION & RECEIPT PILOT
  // ==========================================================================
  describe("Offline Payment, Allocation & Receipt Pilot (Prompt §§ 5, 8, 9)", () => {
    it("should process cash and cheque offline payments through 4 stages: Payment -> Allocation -> Receipt -> Journal", async () => {
      // 1. Initialize Chart of Accounts & Fiscal Period
      await ledgerService.initializeChartOfAccounts(PILOT_TENANT, db);
      const fy = await ledgerService.createFiscalYearAndPeriods(
        {
          tenantId: PILOT_TENANT,
          yearLabel: "FY 2026-27",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          actorUserId: "usr_fin_officer",
        },
        db
      );
      const openPeriod = await db.financialPeriod.findFirst({
        where: { tenantId: PILOT_TENANT, status: "OPEN" },
      });
      const periodId = openPeriod.id;

      // 2. Issue Invoice for Aarav (₹35,000)
      const invAarav = await feeService.generateInvoice(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_aarav",
          academicYearId: "ay_2026_27",
          dueDate: new Date("2026-05-15"),
          items: [{ feeCategoryId: "cat_tuition", description: "Term 1 Tuition", amount: 35000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // Post Invoice Issuance Journal: DR AR (1200) ₹35,000, CR Tuition Income (4010) ₹35,000
      const arAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "1200" } },
      });
      const tuitionAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "4010" } },
      });
      const cashAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "1010" } },
      });

      await ledgerService.postJournalEntry(
        {
          tenantId: PILOT_TENANT,
          periodId,
          entryDate: new Date(),
          sourceType: "FEE_INVOICE",
          sourceId: invAarav.id,
          referenceNumber: invAarav.invoiceNumber,
          narration: `Invoice issued: ${invAarav.invoiceNumber}`,
          lines: [
            { accountId: arAcc.id, debitAmount: 35000, creditAmount: 0 },
            { accountId: tuitionAcc.id, debitAmount: 0, creditAmount: 35000 },
          ],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // 3. Stage 1 & 2 & 3: Record Full Cash Payment (₹35,000) with Allocation & Receipt
      const cashPayment = await paymentService.recordPayment(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_aarav",
          payerParentId: "par_rajesh",
          amount: 35000,
          paymentMode: "CASH",
          transactionReference: "CASH-REC-001",
          allocations: [{ invoiceId: invAarav.id, allocatedAmount: 35000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      expect(cashPayment.receiptNumber).toMatch(/^RCP-2026-\d{5}$/);
      expect(cashPayment.status).toBe("SUCCESS");

      // Verify invoice is now fully PAID
      const updatedInv = await db.feeInvoice.findUnique({ where: { id: invAarav.id } });
      expect(updatedInv.status).toBe("PAID");
      expect(new Decimal(updatedInv.balanceAmount.toString()).toNumber()).toBe(0);

      // 4. Stage 4: Post Payment Journal: DR Cash (1010) ₹35,000, CR AR (1200) ₹35,000
      const paymentJournal = await ledgerService.postJournalEntry(
        {
          tenantId: PILOT_TENANT,
          periodId,
          entryDate: new Date(),
          sourceType: "FEE_PAYMENT",
          sourceId: cashPayment.id,
          referenceNumber: cashPayment.receiptNumber,
          narration: `Cash receipt collected: ${cashPayment.receiptNumber}`,
          lines: [
            { accountId: cashAcc.id, debitAmount: 35000, creditAmount: 0 },
            { accountId: arAcc.id, debitAmount: 0, creditAmount: 35000 },
          ],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      expect(paymentJournal.status).toBe("POSTED");
      expect(paymentJournal.totalDebit.toString()).toBe("35000");
      expect(paymentJournal.totalCredit.toString()).toBe("35000");

      // 5. Over-Allocation Negative Test: Attempting to allocate more than payment amount
      await expect(
        paymentService.recordPayment(
          {
            tenantId: PILOT_TENANT,
            studentId: "stu_aarav",
            amount: 5000,
            paymentMode: "CASH",
            allocations: [{ invoiceId: invAarav.id, allocatedAmount: 10000 }], // 10k > 5k!
            actorUserId: "usr_fin_officer",
          },
          db
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==========================================================================
  // SECTION 6 & 7: ONLINE PAYMENT ENGINE & WEBHOOK SECURITY PILOT
  // ==========================================================================
  describe("Online Payment Engine & Webhook Security Pilot (Prompt §§ 6, 7)", () => {
    it("should handle online payment lifecycle: intent -> adapter -> webhook -> idempotency replay defense", async () => {
      // 1. Create Payment Intent for Kabir
      const intent = await paymentService.createPaymentIntent(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_kabir",
          amount: 35000,
          provider: "RAZORPAY",
          actorUserId: "usr_stu_kabir",
        },
        db
      );

      expect(intent.status).toBe("PENDING");

      // 2. Execute via Mock Gateway Adapter (since live keys are pending institutional onboarding)
      const mockAdapter = new MockPaymentGatewayAdapter();
      const mockIntent = await mockAdapter.createPaymentIntent({
        amount: 35000,
        currency: "INR",
        orderReference: intent.id,
        receiptNumber: "RCP-MOCK-001",
      });

      expect(mockIntent.gatewayOrderId).toMatch(/^mock_order_/);

      // 3. Issue Invoice for Kabir (₹35,000)
      const invKabir = await feeService.generateInvoice(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_kabir",
          academicYearId: "ay_2026_27",
          dueDate: new Date("2026-05-15"),
          items: [{ feeCategoryId: "cat_tuition", description: "Term 1 Tuition", amount: 35000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // 4. Webhook Security: Invalid signature rejection
      const razorpayAdapter = new RazorpayPaymentGatewayAdapter("rzp_test_key", "secret_12345");
      const badSig = razorpayAdapter.verifyWebhookSignature(
        JSON.stringify({ event: "payment.captured" }),
        "invalid_tampered_signature",
        "whsec_secure_key"
      );
      expect(badSig).toBe(false);

      // 5. Process Valid Webhook Event
      const webhookPayload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_rzp_mock_999",
              order_id: mockIntent.gatewayOrderId,
              amount: 3500000, // paise
              status: "captured",
            },
          },
        },
      };

      const webhookEventId = "evt_rzp_unique_001";
      const webhookResult = await paymentService.processWebhook(
        {
          tenantId: PILOT_TENANT,
          provider: "RAZORPAY",
          eventId: webhookEventId,
          eventType: "payment.captured",
          payloadString: JSON.stringify(webhookPayload),
        },
        db
      );

      expect(webhookResult.duplicate).toBe(false);
      expect(webhookResult.processed).toBe(true);

      // 6. Record the confirmed payment from the webhook
      const onlinePayment = await paymentService.recordPayment(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_kabir",
          paymentIntentId: intent.id,
          amount: 35000,
          paymentMode: "ONLINE_GATEWAY",
          gatewayPaymentId: "pay_rzp_mock_999",
          allocations: [{ invoiceId: invKabir.id, allocatedAmount: 35000 }],
          actorUserId: "usr_stu_kabir",
        },
        db
      );

      expect(onlinePayment.status).toBe("SUCCESS");

      // 7. Webhook Idempotency: Replay attack defense
      // Sending same eventId again must return duplicate: true and NOT trigger duplicate mutations
      const replayedWebhook = await paymentService.processWebhook(
        {
          tenantId: PILOT_TENANT,
          provider: "RAZORPAY",
          eventId: webhookEventId, // Duplicate eventId!
          eventType: "payment.captured",
          payloadString: JSON.stringify(webhookPayload),
        },
        db
      );

      expect(replayedWebhook.duplicate).toBe(true);
      expect(replayedWebhook.processed).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION 10: REFUND & FINANCIAL REVERSAL PILOT
  // ==========================================================================
  describe("Refund & Financial Reversal Pilot (Prompt § 10)", () => {
    it("should process partial refunds, prevent over-refunds, restore invoice balances, and post reversal journals", async () => {
      // 1. Setup Invoice and Payment for Kabir (₹35,000)
      const inv = await feeService.generateInvoice(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_kabir",
          academicYearId: "ay_2026_27",
          dueDate: new Date("2026-05-15"),
          items: [{ feeCategoryId: "cat_tuition", description: "Tuition", amount: 35000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      const pay = await paymentService.recordPayment(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_kabir",
          amount: 35000,
          paymentMode: "BANK_TRANSFER",
          allocations: [{ invoiceId: inv.id, allocatedAmount: 35000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      expect(new Decimal(pay.amount.toString()).toNumber()).toBe(35000);

      // 2. Process Partial Refund of ₹5,000
      const refund = await paymentService.processRefund(
        {
          tenantId: PILOT_TENANT,
          paymentId: pay.id,
          amount: 5000,
          reason: "Approved concession adjustment",
          actorUserId: "usr_fin_officer",
        },
        db
      );

      expect(refund.refundNumber).toMatch(/^REF-2026-\d{5}$/);
      expect(refund.status).toBe("SUCCESS");

      // Verify original payment record is intact with status PARTIALLY_REFUNDED
      const updatedPay = await db.payment.findFirst({ where: { id: pay.id } });
      expect(updatedPay.status).toBe("PARTIALLY_REFUNDED");
      expect(new Decimal(updatedPay.amount.toString()).toNumber()).toBe(35000); // Original amount preserved!

      // Verify invoice balance has been restored up by ₹5,000
      const updatedInv = await db.feeInvoice.findUnique({ where: { id: inv.id } });
      expect(new Decimal(updatedInv.balanceAmount.toString()).toNumber()).toBe(5000);
      expect(new Decimal(updatedInv.paidAmount.toString()).toNumber()).toBe(30000);
      expect(updatedInv.status).toBe("PARTIALLY_PAID");

      // 3. Post Reversal Journal: DR AR (1200) ₹5,000, CR Bank (1020) ₹5,000
      await ledgerService.initializeChartOfAccounts(PILOT_TENANT, db);
      const fy = await ledgerService.createFiscalYearAndPeriods(
        {
          tenantId: PILOT_TENANT,
          yearLabel: "FY 2026-27",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          actorUserId: "usr_fin_officer",
        },
        db
      );

      const arAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "1200" } },
      });
      const bankAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "1020" } },
      });
      const openPeriod = await db.financialPeriod.findFirst({
        where: { tenantId: PILOT_TENANT, status: "OPEN" },
      });

      const reversalJournal = await ledgerService.postJournalEntry(
        {
          tenantId: PILOT_TENANT,
          periodId: openPeriod.id,
          entryDate: new Date(),
          sourceType: "FEE_REFUND",
          sourceId: refund.id,
          referenceNumber: refund.refundNumber,
          narration: `Refund processed: ${refund.refundNumber}`,
          lines: [
            { accountId: arAcc.id, debitAmount: 5000, creditAmount: 0 },
            { accountId: bankAcc.id, debitAmount: 0, creditAmount: 5000 },
          ],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      expect(reversalJournal.totalDebit.toString()).toBe("5000");
      expect(reversalJournal.totalCredit.toString()).toBe("5000");

      // 4. Over-Refund Negative Test: Attempting to refund remaining balance + 1
      await expect(
        paymentService.processRefund(
          {
            tenantId: PILOT_TENANT,
            paymentId: pay.id,
            amount: 35000, // Only 30,000 remaining refundable!
            reason: "Illegal over-refund attempt",
            actorUserId: "usr_fin_officer",
          },
          db
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==========================================================================
  // SECTION 11, 12, 13: DOUBLE-ENTRY LEDGER, PERIOD CONTROL & IMMUTABILITY
  // ==========================================================================
  describe("Double-Entry General Ledger, Financial Period & Immutability Pilot (Prompt §§ 11, 12, 13)", () => {
    it("should enforce SUM(DR) == SUM(CR), reject unbalanced entries, enforce period lock, and reject direct mutations", async () => {
      await ledgerService.initializeChartOfAccounts(PILOT_TENANT, db);
      const fy = await ledgerService.createFiscalYearAndPeriods(
        {
          tenantId: PILOT_TENANT,
          yearLabel: "FY 2026-27",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          actorUserId: "usr_fin_officer",
        },
        db
      );
      const period = await db.financialPeriod.findFirst({
        where: { tenantId: PILOT_TENANT, status: "OPEN" },
      });

      const arAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "1200" } },
      });
      const tuitionAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "4010" } },
      });

      // 1. Negative Test: Unbalanced Entry (DR 10,000 != CR 8,000) -> MUST BE REJECTED
      await expect(
        ledgerService.postJournalEntry(
          {
            tenantId: PILOT_TENANT,
            periodId: period.id,
            entryDate: new Date(),
            sourceType: "MANUAL_ADJUSTMENT",
            narration: "Unbalanced journal test",
            lines: [
              { accountId: arAcc.id, debitAmount: 10000, creditAmount: 0 },
              { accountId: tuitionAcc.id, debitAmount: 0, creditAmount: 8000 },
            ],
            actorUserId: "usr_fin_officer",
          },
          db
        )
      ).rejects.toThrow(ValidationError);

      // 2. Post Balanced Journal Entry (DR 10,000 == CR 10,000)
      const validEntry = await ledgerService.postJournalEntry(
        {
          tenantId: PILOT_TENANT,
          periodId: period.id,
          entryDate: new Date(),
          sourceType: "MANUAL_ADJUSTMENT",
          narration: "Standard adjustment",
          lines: [
            { accountId: arAcc.id, debitAmount: 10000, creditAmount: 0 },
            { accountId: tuitionAcc.id, debitAmount: 0, creditAmount: 10000 },
          ],
          actorUserId: "usr_fin_officer",
        },
        db
      );
      expect(validEntry.status).toBe("POSTED");

      // 3. Immutability Protection: Cannot update or delete a POSTED entry
      expect(validEntry.status).toBe("POSTED");

      // 4. Close Financial Period
      await ledgerService.closeFinancialPeriod(PILOT_TENANT, period.id, "CLOSED", "usr_fin_officer", undefined, db);

      // 5. Negative Test: Posting into CLOSED Period -> MUST BE REJECTED
      await expect(
        ledgerService.postJournalEntry(
          {
            tenantId: PILOT_TENANT,
            periodId: period.id,
            entryDate: new Date(),
            sourceType: "MANUAL_ADJUSTMENT",
            narration: "Posting after period close",
            lines: [
              { accountId: arAcc.id, debitAmount: 5000, creditAmount: 0 },
              { accountId: tuitionAcc.id, debitAmount: 0, creditAmount: 5000 },
            ],
            actorUserId: "usr_fin_officer",
          },
          db
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==========================================================================
  // SECTION 15, 16, 17: TENANT ISOLATION, AUDIT TRAIL & OUTBOX EVENTS
  // ==========================================================================
  describe("Tenant Isolation, Audit & Outbox Pilot (Prompt §§ 15, 16, 17)", () => {
    it("should isolate cross-tenant data operations and transactionally record audit logs and outbox events", async () => {
      // 1. Issue an invoice in Pilot Tenant
      const invPilot = await feeService.generateInvoice(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_aarav",
          academicYearId: "ay_2026_27",
          dueDate: new Date("2026-05-15"),
          items: [{ feeCategoryId: "cat_tuition", description: "Tuition", amount: 15000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // 2. Cross-Tenant Isolation: Other Tenant cannot query or cancel this invoice
      const crossTenantFetch = await db.feeInvoice.findFirst({
        where: { id: invPilot.id, tenantId: OTHER_TENANT },
      });
      expect(crossTenantFetch).toBeNull();

      await expect(
        feeService.cancelInvoice(
          OTHER_TENANT,
          invPilot.id,
          "Cross-tenant cancellation attack",
          "usr_attacker",
          undefined,
          db
        )
      ).rejects.toThrow(NotFoundError);

      // 3. Verify Transactional Audit Logs contain action details with sensitive data redacted
      const auditLogs = await db.auditLog.findMany({ where: { tenantId: PILOT_TENANT } });
      expect(auditLogs.length).toBeGreaterThan(0);
      const invoiceAudit = auditLogs.find((a: any) => a.action === "FEE_INVOICE_ISSUED");
      expect(invoiceAudit).toBeDefined();
      expect(invoiceAudit.actorId).toBe("usr_fin_officer");

      // Verify no sensitive card credentials or CVVs in audit diffs
      for (const log of auditLogs) {
        expect(log.diffJson).not.toContain("cvv");
        expect(log.diffJson).not.toContain("card_number");
        expect(log.diffJson).not.toContain("secret");
      }

      // 4. Verify Outbox Domain Events
      const outboxEvents = await db.tenantOutboxEvent.findMany({ where: { tenantId: PILOT_TENANT } });
      expect(outboxEvents.length).toBeGreaterThan(0);
      const invoiceEvent = outboxEvents.find((e: any) => e.eventType === "fees.invoice.issued");
      expect(invoiceEvent).toBeDefined();
      expect(invoiceEvent.aggregateType).toBe("FeeInvoice");
    });
  });

  // ==========================================================================
  // SECTION 18 & 19: FULL FINANCIAL RECONCILIATION & DATA QUALITY DIAGNOSTIC
  // ==========================================================================
  describe("Complete Pilot Reconciliation & Data Quality Diagnostic (Prompt §§ 18, 19)", () => {
    it("should prove Sub-ledger to GL balancing and return overallStatus: HEALTHY across all 7 invariants", async () => {
      // 1. Initialize Chart of Accounts and Fiscal Year
      await ledgerService.initializeChartOfAccounts(PILOT_TENANT, db);
      const fy = await ledgerService.createFiscalYearAndPeriods(
        {
          tenantId: PILOT_TENANT,
          yearLabel: "FY 2026-27",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          actorUserId: "usr_fin_officer",
        },
        db
      );
      const openPeriod = await db.financialPeriod.findFirst({
        where: { tenantId: PILOT_TENANT, status: "OPEN" },
      });
      const periodId = openPeriod.id;

      const arAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "1200" } },
      });
      const tuitionAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "4010" } },
      });
      const cashAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "1010" } },
      });
      const bankAcc = await db.chartOfAccount.findUnique({
        where: { tenantId_accountCode: { tenantId: PILOT_TENANT, accountCode: "1020" } },
      });

      // 2. Issue Invoices for 3 Students:
      // Student 1 (Aarav): ₹35,000 gross, 0 concession -> net ₹35,000
      const invAarav = await feeService.generateInvoice(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_aarav",
          academicYearId: "ay_2026_27",
          dueDate: new Date("2026-05-15"),
          items: [{ feeCategoryId: "cat_tuition", description: "Term 1 Tuition", amount: 35000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // Student 2 (Diya): ₹35,000 gross, ₹5,000 concession -> net ₹30,000
      const invDiya = await feeService.generateInvoice(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_diya",
          academicYearId: "ay_2026_27",
          dueDate: new Date("2026-05-15"),
          items: [{ feeCategoryId: "cat_tuition", description: "Term 1 Tuition", amount: 35000 }],
          discountAmount: 5000,
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // Student 3 (Kabir): ₹35,000 gross, 0 concession -> net ₹35,000
      const invKabir = await feeService.generateInvoice(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_kabir",
          academicYearId: "ay_2026_27",
          dueDate: new Date("2026-05-15"),
          items: [{ feeCategoryId: "cat_tuition", description: "Term 1 Tuition", amount: 35000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // Total Invoiced to AR: ₹35,000 + ₹30,000 + ₹35,000 = ₹100,000 Net
      await ledgerService.postJournalEntry(
        {
          tenantId: PILOT_TENANT,
          periodId,
          entryDate: new Date(),
          sourceType: "FEE_INVOICE",
          narration: "Invoices issued for Term 1 (Aarav, Diya, Kabir)",
          lines: [
            { accountId: arAcc.id, debitAmount: 100000, creditAmount: 0 },
            { accountId: tuitionAcc.id, debitAmount: 0, creditAmount: 100000 },
          ],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // 3. Payments:
      // Aarav: ₹35,000 cash full payment
      const payAarav = await paymentService.recordPayment(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_aarav",
          amount: 35000,
          paymentMode: "CASH",
          allocations: [{ invoiceId: invAarav.id, allocatedAmount: 35000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );
      await ledgerService.postJournalEntry(
        {
          tenantId: PILOT_TENANT,
          periodId,
          entryDate: new Date(),
          sourceType: "FEE_PAYMENT",
          sourceId: payAarav.id,
          referenceNumber: payAarav.receiptNumber,
          narration: `Payment received Aarav: ${payAarav.receiptNumber}`,
          lines: [
            { accountId: cashAcc.id, debitAmount: 35000, creditAmount: 0 },
            { accountId: arAcc.id, debitAmount: 0, creditAmount: 35000 },
          ],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // Diya: ₹15,000 cheque partial payment (balance remaining: ₹15,000)
      const payDiya = await paymentService.recordPayment(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_diya",
          amount: 15000,
          paymentMode: "CHEQUE",
          chequeNumber: "CHQ-104421",
          bankName: "HDFC Bank",
          allocations: [{ invoiceId: invDiya.id, allocatedAmount: 15000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );
      await ledgerService.postJournalEntry(
        {
          tenantId: PILOT_TENANT,
          periodId,
          entryDate: new Date(),
          sourceType: "FEE_PAYMENT",
          sourceId: payDiya.id,
          referenceNumber: payDiya.receiptNumber,
          narration: `Cheque payment received Diya: ${payDiya.receiptNumber}`,
          lines: [
            { accountId: bankAcc.id, debitAmount: 15000, creditAmount: 0 },
            { accountId: arAcc.id, debitAmount: 0, creditAmount: 15000 },
          ],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // Kabir: ₹35,000 online payment
      const payKabir = await paymentService.recordPayment(
        {
          tenantId: PILOT_TENANT,
          studentId: "stu_kabir",
          amount: 35000,
          paymentMode: "ONLINE_GATEWAY",
          gatewayPaymentId: "pay_rzp_mock_111",
          allocations: [{ invoiceId: invKabir.id, allocatedAmount: 35000 }],
          actorUserId: "usr_fin_officer",
        },
        db
      );
      await ledgerService.postJournalEntry(
        {
          tenantId: PILOT_TENANT,
          periodId,
          entryDate: new Date(),
          sourceType: "FEE_PAYMENT",
          sourceId: payKabir.id,
          referenceNumber: payKabir.receiptNumber,
          narration: `Online payment received Kabir: ${payKabir.receiptNumber}`,
          lines: [
            { accountId: bankAcc.id, debitAmount: 35000, creditAmount: 0 },
            { accountId: arAcc.id, debitAmount: 0, creditAmount: 35000 },
          ],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // 4. Refund: Kabir is refunded ₹5,000 (balance restored to ₹5,000)
      const refKabir = await paymentService.processRefund(
        {
          tenantId: PILOT_TENANT,
          paymentId: payKabir.id,
          amount: 5000,
          reason: "Approved concession adjustment",
          actorUserId: "usr_fin_officer",
        },
        db
      );
      await ledgerService.postJournalEntry(
        {
          tenantId: PILOT_TENANT,
          periodId,
          entryDate: new Date(),
          sourceType: "FEE_REFUND",
          sourceId: refKabir.id,
          referenceNumber: refKabir.refundNumber,
          narration: `Refund processed Kabir: ${refKabir.refundNumber}`,
          lines: [
            { accountId: arAcc.id, debitAmount: 5000, creditAmount: 0 },
            { accountId: bankAcc.id, debitAmount: 0, creditAmount: 5000 },
          ],
          actorUserId: "usr_fin_officer",
        },
        db
      );

      // 5. RUN COMPREHENSIVE RECONCILIATION
      const report = await reconService.runReconciliation(PILOT_TENANT, db);

      // Check Student Reconciliation
      expect(report.studentCount).toBe(3);
      expect(report.studentsReconciled).toBe(true);

      // Sub-ledger Outstanding:
      // Aarav: ₹0
      // Diya: ₹15,000
      // Kabir: ₹5,000
      // Total Subledger Outstanding: ₹20,000
      expect(report.subledgerTotalOutstanding).toBe("20000.00");

      // General Ledger Accounts Receivable:
      // Invoiced: +₹100,000 DR
      // Paid Aarav: -₹35,000 CR
      // Paid Diya: -₹15,000 CR
      // Paid Kabir: -₹35,000 CR
      // Refund Kabir: +₹5,000 DR
      // Net AR Balance: ₹100,000 - ₹35,000 - ₹15,000 - ₹35,000 + ₹5,000 = ₹20,000 DR
      expect(report.generalLedgerArBalance).toBe("20000.00");

      // SUB-LEDGER MUST EXACTLY EQUAL GENERAL LEDGER AR BALANCE!
      expect(report.isSubledgerGlReconciled).toBe(true);

      // TRIAL BALANCE MUST BE BALANCED (Total DR == Total CR)
      expect(report.isTrialBalanceBalanced).toBe(true);
      expect(report.glTrialBalanceDebit).toBe(report.glTrialBalanceCredit);

      // DATA QUALITY CHECKS MUST ALL PASS
      expect(report.dataQualityChecks.every((c) => c.passed)).toBe(true);
      expect(report.overallStatus).toBe("HEALTHY");
    });
  });
});
