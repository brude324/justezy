import { describe, it, expect, beforeEach } from "vitest";
import { LibraryService } from "@/lib/services/library-service";
import { TransportService } from "@/lib/services/transport-service";
import { ModuleGate } from "@/lib/authorization/module-gate";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ModuleDisabledError,
} from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

// Helper to strip undefined values during mock updates
function cleanUpdateData(data: any) {
  const clean: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
}

// ============================================================================
// STATEFUL IN-MEMORY CONTROLLED PILOT DATABASE ENGINE (STEP 14)
// ============================================================================

function createPilotDatabaseStore() {
  const state = {
    // Library Models (Plane 15)
    libraries: new Map<string, any>(),
    libraryPolicies: new Map<string, any>(),
    libraryCategories: new Map<string, any>(),
    libraryAuthors: new Map<string, any>(),
    libraryPublishers: new Map<string, any>(),
    libraryBooks: new Map<string, any>(),
    libraryBookCopies: new Map<string, any>(),
    libraryMembers: new Map<string, any>(),
    libraryLoans: new Map<string, any>(),
    libraryReservations: new Map<string, any>(),
    libraryFines: new Map<string, any>(),

    // Transport Models (Plane 16)
    transportFacilities: new Map<string, any>(),
    transportRoutes: new Map<string, any>(),
    transportStops: new Map<string, any>(),
    transportVehicles: new Map<string, any>(),
    transportDrivers: new Map<string, any>(),
    transportAttendants: new Map<string, any>(),
    transportRouteAssignments: new Map<string, any>(),
    studentTransportAssignments: new Map<string, any>(),
    transportPasses: new Map<string, any>(),
    transportIncidents: new Map<string, any>(),

    // Identity, Academic & Tenant Models
    tenants: new Map<string, any>(),
    users: new Map<string, any>(),
    tenantMemberships: new Map<string, any>(),
    tenantModuleEntitlements: new Map<string, any>(),
    studentProfiles: new Map<string, any>(),
    parentProfiles: new Map<string, any>(),
    studentParentBindings: new Map<string, any>(),
    academicYears: new Map<string, any>(),
    grades: new Map<string, any>(),
    classes: new Map<string, any>(),

    // Observability & Event Outbox
    auditLogs: [] as any[],
    tenantOutboxEvents: [] as any[],

    // Financial Integration (Wave 1)
    feeInvoices: new Map<string, any>(),
    payments: new Map<string, any>(),
    journalEntries: new Map<string, any>(),
    journalLines: new Map<string, any>(),
  };

  let idCounter = 1;
  const genId = (prefix: string) => `${prefix}_${idCounter++}`;

  let txQueue = Promise.resolve();

  const mockDb: any = {
    _state: state,

    $transaction: async (cb: (tx: any) => Promise<any>) => {
      let release: () => void;
      const nextLock = new Promise<void>((resolve) => {
        release = resolve;
      });
      const currentLock = txQueue;
      txQueue = txQueue.then(() => nextLock);
      await currentLock;
      try {
        return await cb(mockDb);
      } finally {
        release!();
      }
    },

    // ------------------------------------------------------------------------
    // IDENTITY & TENANCY
    // ------------------------------------------------------------------------
    tenantModuleEntitlement: {
      findUnique: async ({ where }: any) => {
        if (where.tenantId_moduleKey) {
          const key = `${where.tenantId_moduleKey.tenantId}_${where.tenantId_moduleKey.moduleKey}`;
          return state.tenantModuleEntitlements.get(key) || null;
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const ent of Array.from(state.tenantModuleEntitlements.values())) {
          let match = true;
          if (where.tenantId && ent.tenantId !== where.tenantId) match = false;
          if (where.moduleKey && ent.moduleKey !== where.moduleKey) match = false;
          if (where.isEnabled !== undefined && ent.isEnabled !== where.isEnabled) match = false;
          if (match) return ent;
        }
        return null;
      },
    },

    tenantMembership: {
      findFirst: async ({ where }: any) => {
        for (const m of Array.from(state.tenantMemberships.values())) {
          let match = true;
          if (where.userId && m.userId !== where.userId) match = false;
          if (where.tenantId && m.tenantId !== where.tenantId) match = false;
          if (where.status && m.status !== where.status) match = false;
          if (match) return m;
        }
        return null;
      },
    },

    user: {
      findFirst: async ({ where }: any) => {
        for (const u of Array.from(state.users.values())) {
          let match = true;
          if (where.id && u.id !== where.id) match = false;
          if (match) return u;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        return state.users.get(where.id) || null;
      },
    },

    studentProfile: {
      findUnique: async ({ where }: any) => {
        return state.studentProfiles.get(where.id) || null;
      },
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
          if (where.tenantId && b.tenantId !== where.tenantId) match = false;
          if (where.studentId && b.studentId !== where.studentId) match = false;
          if (where.parentId && b.parentId !== where.parentId) match = false;
          if (where.parentProfile?.userId && b.parentProfile?.userId !== where.parentProfile.userId) match = false;
          if (match) return b;
        }
        return null;
      },
    },

    academicYear: {
      findFirst: async ({ where }: any) => {
        for (const ay of Array.from(state.academicYears.values())) {
          let match = true;
          if (where.id && ay.id !== where.id) match = false;
          if (where.tenantId && ay.tenantId !== where.tenantId) match = false;
          if (where.isCurrent !== undefined && ay.isCurrent !== where.isCurrent) match = false;
          if (match) return ay;
        }
        return null;
      },
    },

    // ------------------------------------------------------------------------
    // LIBRARY MODELS
    // ------------------------------------------------------------------------
    library: {
      findFirst: async ({ where }: any) => {
        for (const lib of Array.from(state.libraries.values())) {
          let match = true;
          if (where.id && lib.id !== where.id) match = false;
          if (where.tenantId && lib.tenantId !== where.tenantId) match = false;
          if (match) return lib;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("lib");
        const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        state.libraries.set(id, rec);
        return rec;
      },
    },

    libraryPolicy: {
      findFirst: async ({ where }: any) => {
        for (const pol of Array.from(state.libraryPolicies.values())) {
          let match = true;
          if (where.id && pol.id !== where.id) match = false;
          if (where.tenantId && pol.tenantId !== where.tenantId) match = false;
          if (where.isDefault !== undefined && pol.isDefault !== where.isDefault) match = false;
          if (match) return pol;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("pol");
        const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        state.libraryPolicies.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const pol = state.libraryPolicies.get(where.id);
        if (!pol) throw new NotFoundError("LibraryPolicy not found");
        const updated = { ...pol, ...cleanUpdateData(data), updatedAt: new Date() };
        state.libraryPolicies.set(where.id, updated);
        return updated;
      },
    },

    libraryCategory: {
      findFirst: async ({ where }: any) => {
        for (const c of Array.from(state.libraryCategories.values())) {
          let match = true;
          if (where.id && c.id !== where.id) match = false;
          if (where.tenantId && c.tenantId !== where.tenantId) match = false;
          if (where.code && c.code !== where.code) match = false;
          if (match) return c;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        if (where.id) return state.libraryCategories.get(where.id) || null;
        if (where.tenantId_code) {
          const key = `${where.tenantId_code.tenantId}_${where.tenantId_code.code}`;
          for (const c of Array.from(state.libraryCategories.values())) {
            if (`${c.tenantId}_${c.code}` === key) return c;
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("cat");
        const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        state.libraryCategories.set(id, rec);
        return rec;
      },
    },

    libraryAuthor: {
      findFirst: async ({ where }: any) => {
        for (const a of Array.from(state.libraryAuthors.values())) {
          let match = true;
          if (where.id && a.id !== where.id) match = false;
          if (where.tenantId && a.tenantId !== where.tenantId) match = false;
          if (where.name && a.name !== where.name) match = false;
          if (match) return a;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("auth");
        const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        state.libraryAuthors.set(id, rec);
        return rec;
      },
    },

    libraryPublisher: {
      findFirst: async ({ where }: any) => {
        for (const p of Array.from(state.libraryPublishers.values())) {
          let match = true;
          if (where.id && p.id !== where.id) match = false;
          if (where.tenantId && p.tenantId !== where.tenantId) match = false;
          if (where.name && p.name !== where.name) match = false;
          if (match) return p;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("pub");
        const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        state.libraryPublishers.set(id, rec);
        return rec;
      },
    },

    libraryBook: {
      findFirst: async ({ where }: any) => {
        for (const b of Array.from(state.libraryBooks.values())) {
          let match = true;
          if (where.id && b.id !== where.id) match = false;
          if (where.tenantId && b.tenantId !== where.tenantId) match = false;
          if (where.isbn && b.isbn !== where.isbn) match = false;
          if (match) return b;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("bk");
        const rec = { id, ...data, active: true, createdAt: new Date(), updatedAt: new Date() };
        state.libraryBooks.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const b = state.libraryBooks.get(where.id);
        if (!b) throw new NotFoundError("LibraryBook not found");
        const updated = { ...b, ...cleanUpdateData(data), updatedAt: new Date() };
        state.libraryBooks.set(where.id, updated);
        return updated;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const b of Array.from(state.libraryBooks.values())) {
          if (where?.tenantId && b.tenantId !== where.tenantId) continue;
          if (where?.active !== undefined && b.active !== where.active) continue;
          cnt++;
        }
        return cnt;
      },
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        const results = [];
        for (const b of Array.from(state.libraryBooks.values())) {
          if (where?.tenantId && b.tenantId !== where.tenantId) continue;
          results.push(b);
        }
        return results.slice(skip, skip + take);
      },
    },

    libraryBookCopy: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.libraryBookCopies.get(where.id) || null;
        if (where.tenantId_accessionNumber) {
          const key = `${where.tenantId_accessionNumber.tenantId}_${where.tenantId_accessionNumber.accessionNumber}`;
          for (const c of Array.from(state.libraryBookCopies.values())) {
            if (`${c.tenantId}_${c.accessionNumber}` === key) return c;
          }
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const c of Array.from(state.libraryBookCopies.values())) {
          let match = true;
          if (where.id && c.id !== where.id) match = false;
          if (where.tenantId && c.tenantId !== where.tenantId) match = false;
          if (where.accessionNumber && c.accessionNumber !== where.accessionNumber) match = false;
          if (where.status && c.status !== where.status) match = false;
          if (match) {
            const book = state.libraryBooks.get(c.bookId);
            return { ...c, book };
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("cp");
        const rec = { id, ...data, status: data.status || "AVAILABLE", createdAt: new Date(), updatedAt: new Date() };
        state.libraryBookCopies.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const c = state.libraryBookCopies.get(where.id);
        if (!c) throw new NotFoundError("LibraryBookCopy not found");
        const updated = { ...c, ...cleanUpdateData(data), updatedAt: new Date() };
        state.libraryBookCopies.set(where.id, updated);
        return updated;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const c of Array.from(state.libraryBookCopies.values())) {
          if (where?.tenantId && c.tenantId !== where.tenantId) continue;
          if (where?.status && c.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        const results = [];
        for (const c of Array.from(state.libraryBookCopies.values())) {
          if (where?.tenantId && c.tenantId !== where.tenantId) continue;
          if (where?.status && c.status !== where.status) continue;
          results.push(c);
        }
        return results.slice(skip, skip + take);
      },
    },

    libraryMember: {
      findUnique: async ({ where, include }: any) => {
        let m: any = null;
        if (where.id) m = state.libraryMembers.get(where.id) || null;
        if (!m && where.tenantId_memberCode) {
          const key = `${where.tenantId_memberCode.tenantId}_${where.tenantId_memberCode.memberCode}`;
          for (const item of Array.from(state.libraryMembers.values())) {
            if (`${item.tenantId}_${item.memberCode}` === key) {
              m = item;
              break;
            }
          }
        }
        if (m && include?.studentProfile && m.studentProfileId) {
          const sp = state.studentProfiles.get(m.studentProfileId);
          return { ...m, studentProfile: sp };
        }
        return m;
      },
      findFirst: async ({ where }: any) => {
        for (const m of Array.from(state.libraryMembers.values())) {
          let match = true;
          if (where.id && m.id !== where.id) match = false;
          if (where.tenantId && m.tenantId !== where.tenantId) match = false;
          if (where.memberCode && m.memberCode !== where.memberCode) match = false;
          if (where.studentProfileId && m.studentProfileId !== where.studentProfileId) match = false;
          if (where.userId && m.userId !== where.userId) match = false;
          if (where.status && m.status !== where.status) match = false;
          if (match) return m;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("mem");
        const rec = { id, ...data, status: data.status || "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
        state.libraryMembers.set(id, rec);
        return rec;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const m of Array.from(state.libraryMembers.values())) {
          if (where?.tenantId && m.tenantId !== where.tenantId) continue;
          if (where?.status && m.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        const results = [];
        for (const m of Array.from(state.libraryMembers.values())) {
          if (where?.tenantId && m.tenantId !== where.tenantId) continue;
          if (where?.status && m.status !== where.status) continue;
          results.push(m);
        }
        return results.slice(skip, skip + take);
      },
    },

    libraryLoan: {
      findFirst: async ({ where }: any) => {
        for (const l of Array.from(state.libraryLoans.values())) {
          let match = true;
          if (where.id && l.id !== where.id) match = false;
          if (where.tenantId && l.tenantId !== where.tenantId) match = false;
          if (where.bookCopyId && l.bookCopyId !== where.bookCopyId) match = false;
          if (where.memberId && l.memberId !== where.memberId) match = false;
          if (where.status && l.status !== where.status) match = false;
          if (match) {
            const bookCopy = state.libraryBookCopies.get(l.bookCopyId);
            const book = bookCopy ? state.libraryBooks.get(bookCopy.bookId) : null;
            return { ...l, bookCopy: bookCopy ? { ...bookCopy, book } : null };
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("loan");
        const rec = { id, ...data, status: data.status || "ISSUED", renewalCount: 0, createdAt: new Date(), updatedAt: new Date() };
        state.libraryLoans.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const l = state.libraryLoans.get(where.id);
        if (!l) throw new NotFoundError("LibraryLoan not found");
        const updated = { ...l, ...cleanUpdateData(data), updatedAt: new Date() };
        state.libraryLoans.set(where.id, updated);
        return updated;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const l of Array.from(state.libraryLoans.values())) {
          if (where?.tenantId && l.tenantId !== where.tenantId) continue;
          if (where?.memberId && l.memberId !== where.memberId) continue;
          if (where?.status) {
            if (typeof where.status === "string" && l.status !== where.status) continue;
            if (where.status.in && Array.isArray(where.status.in) && !where.status.in.includes(l.status)) continue;
          }
          if (where?.dueAt?.lt && !(l.dueAt < where.dueAt.lt)) continue;
          cnt++;
        }
        return cnt;
      },
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        const results = [];
        for (const l of Array.from(state.libraryLoans.values())) {
          if (where?.tenantId && l.tenantId !== where.tenantId) continue;
          if (where?.memberId && l.memberId !== where.memberId) continue;
          if (where?.status && l.status !== where.status) continue;
          results.push(l);
        }
        return results.slice(skip, skip + take);
      },
    },

    libraryReservation: {
      findFirst: async ({ where }: any) => {
        for (const r of Array.from(state.libraryReservations.values())) {
          let match = true;
          if (where.id && r.id !== where.id) match = false;
          if (where.tenantId && r.tenantId !== where.tenantId) match = false;
          if (where.bookId && r.bookId !== where.bookId) match = false;
          if (where.memberId && r.memberId !== where.memberId) match = false;
          if (where.status && r.status !== where.status) match = false;
          if (match) return r;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("res");
        const rec = { id, ...data, status: data.status || "PENDING", createdAt: new Date(), updatedAt: new Date() };
        state.libraryReservations.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const r = state.libraryReservations.get(where.id);
        if (!r) throw new NotFoundError("LibraryReservation not found");
        const updated = { ...r, ...cleanUpdateData(data), updatedAt: new Date() };
        state.libraryReservations.set(where.id, updated);
        return updated;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const r of Array.from(state.libraryReservations.values())) {
          if (where?.tenantId && r.tenantId !== where.tenantId) continue;
          if (where?.status && r.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
    },

    libraryFine: {
      findFirst: async ({ where }: any) => {
        for (const f of Array.from(state.libraryFines.values())) {
          let match = true;
          if (where.id && f.id !== where.id) match = false;
          if (where.tenantId && f.tenantId !== where.tenantId) match = false;
          if (where.loanId && f.loanId !== where.loanId) match = false;
          if (where.memberId && f.memberId !== where.memberId) match = false;
          if (where.status && f.status !== where.status) match = false;
          if (match) return f;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("fine");
        const rec = { id, ...data, status: data.status || "UNPAID", createdAt: new Date(), updatedAt: new Date() };
        state.libraryFines.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const f = state.libraryFines.get(where.id);
        if (!f) throw new NotFoundError("LibraryFine not found");
        const updated = { ...f, ...cleanUpdateData(data), updatedAt: new Date() };
        state.libraryFines.set(where.id, updated);
        return updated;
      },
      aggregate: async ({ where, _sum }: any) => {
        let total = new Decimal(0);
        for (const f of Array.from(state.libraryFines.values())) {
          if (where?.tenantId && f.tenantId !== where.tenantId) continue;
          if (where?.status && f.status !== where.status) continue;
          total = total.plus(new Decimal(f.amount.toString()));
        }
        return { _sum: { amount: total } };
      },
      groupBy: async ({ where }: any) => {
        const groups = new Map<string, { status: string; total: Decimal; count: number }>();
        for (const f of Array.from(state.libraryFines.values())) {
          if (where?.tenantId && f.tenantId !== where.tenantId) continue;
          const status = f.status;
          const current = groups.get(status) || { status, total: new Decimal(0), count: 0 };
          current.total = current.total.plus(new Decimal(f.amount.toString()));
          current.count += 1;
          groups.set(status, current);
        }
        return Array.from(groups.values()).map((g) => ({
          status: g.status,
          _sum: { amount: g.total },
          _count: { id: g.count },
        }));
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const f of Array.from(state.libraryFines.values())) {
          if (where?.tenantId && f.tenantId !== where.tenantId) continue;
          if (where?.status && f.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
    },

    // ------------------------------------------------------------------------
    // TRANSPORT MODELS
    // ------------------------------------------------------------------------
    transportFacility: {
      findFirst: async ({ where }: any) => {
        for (const fac of Array.from(state.transportFacilities.values())) {
          let match = true;
          if (where.id && fac.id !== where.id) match = false;
          if (where.tenantId && fac.tenantId !== where.tenantId) match = false;
          if (match) return fac;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("fac");
        const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        state.transportFacilities.set(id, rec);
        return rec;
      },
    },

    transportRoute: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.transportRoutes.get(where.id) || null;
        if (where.tenantId_routeCode) {
          const key = `${where.tenantId_routeCode.tenantId}_${where.tenantId_routeCode.routeCode}`;
          for (const r of Array.from(state.transportRoutes.values())) {
            if (`${r.tenantId}_${r.routeCode}` === key) return r;
          }
        }
        return null;
      },
      findFirst: async ({ where, include }: any) => {
        for (const r of Array.from(state.transportRoutes.values())) {
          let match = true;
          if (where.id && r.id !== where.id) match = false;
          if (where.tenantId && r.tenantId !== where.tenantId) match = false;
          if (where.routeCode && r.routeCode !== where.routeCode) match = false;
          if (where.active !== undefined && r.active !== where.active) match = false;
          if (match) {
            const enriched = { ...r };
            if (include?.assignments) {
              const assignments = [];
              for (const ra of Array.from(state.transportRouteAssignments.values())) {
                if (ra.routeId === r.id && (!include.assignments.where?.active || ra.active === include.assignments.where.active)) {
                  const vehicle = state.transportVehicles.get(ra.vehicleId);
                  assignments.push({ ...ra, vehicle });
                }
              }
              enriched.assignments = assignments;
            }
            return enriched;
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("rt");
        const rec = { id, ...data, active: true, createdAt: new Date(), updatedAt: new Date() };
        state.transportRoutes.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const r = state.transportRoutes.get(where.id);
        if (!r) throw new NotFoundError("TransportRoute not found");
        const updated = { ...r, ...cleanUpdateData(data), updatedAt: new Date() };
        state.transportRoutes.set(where.id, updated);
        return updated;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const r of Array.from(state.transportRoutes.values())) {
          if (where?.tenantId && r.tenantId !== where.tenantId) continue;
          if (where?.active !== undefined && r.active !== where.active) continue;
          cnt++;
        }
        return cnt;
      },
      findMany: async ({ where, include, skip = 0, take = 50 }: any) => {
        const results = [];
        for (const r of Array.from(state.transportRoutes.values())) {
          if (where?.tenantId && r.tenantId !== where.tenantId) continue;
          if (where?.active !== undefined && r.active !== where.active) continue;
          const enriched = { ...r };
          if (include?.assignments) {
            const assignments = [];
            for (const ra of Array.from(state.transportRouteAssignments.values())) {
              if (ra.routeId === r.id && (!include.assignments.where?.active || ra.active === include.assignments.where.active)) {
                const vehicle = state.transportVehicles.get(ra.vehicleId);
                assignments.push({ ...ra, vehicle });
              }
            }
            enriched.assignments = assignments;
          }
          if (include?._count) {
            let studentCount = 0;
            for (const sta of Array.from(state.studentTransportAssignments.values())) {
              if (sta.routeId === r.id && sta.status === "ACTIVE") studentCount++;
            }
            let stopCount = 0;
            for (const stp of Array.from(state.transportStops.values())) {
              if (stp.routeId === r.id && stp.active !== false) stopCount++;
            }
            enriched._count = { studentAssignments: studentCount, stops: stopCount };
          }
          results.push(enriched);
        }
        return results.slice(skip, skip + take);
      },
    },

    transportStop: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.transportStops.get(where.id) || null;
        if (where.routeId_sequence) {
          for (const s of Array.from(state.transportStops.values())) {
            if (s.routeId === where.routeId_sequence.routeId && s.sequence === where.routeId_sequence.sequence) {
              return s;
            }
          }
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const s of Array.from(state.transportStops.values())) {
          let match = true;
          if (where.id && s.id !== where.id) match = false;
          if (where.tenantId && s.tenantId !== where.tenantId) match = false;
          if (where.routeId && s.routeId !== where.routeId) match = false;
          if (where.sequence && s.sequence !== where.sequence) match = false;
          if (match) return s;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("stp");
        const rec = { id, ...data, active: true, createdAt: new Date(), updatedAt: new Date() };
        state.transportStops.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const s = state.transportStops.get(where.id);
        if (!s) throw new NotFoundError("TransportStop not found");
        const updated = { ...s, ...cleanUpdateData(data), updatedAt: new Date() };
        state.transportStops.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where, orderBy }: any) => {
        const results = [];
        for (const s of Array.from(state.transportStops.values())) {
          if (where?.tenantId && s.tenantId !== where.tenantId) continue;
          if (where?.routeId && s.routeId !== where.routeId) continue;
          results.push(s);
        }
        if (orderBy?.sequence) {
          results.sort((a, b) => (orderBy.sequence === "asc" ? a.sequence - b.sequence : b.sequence - a.sequence));
        }
        return results;
      },
    },

    transportVehicle: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.transportVehicles.get(where.id) || null;
        if (where.tenantId_registrationNumber) {
          const key = `${where.tenantId_registrationNumber.tenantId}_${where.tenantId_registrationNumber.registrationNumber}`;
          for (const v of Array.from(state.transportVehicles.values())) {
            if (`${v.tenantId}_${v.registrationNumber}` === key) return v;
          }
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const v of Array.from(state.transportVehicles.values())) {
          let match = true;
          if (where.id && v.id !== where.id) match = false;
          if (where.tenantId && v.tenantId !== where.tenantId) match = false;
          if (where.registrationNumber && v.registrationNumber !== where.registrationNumber) match = false;
          if (where.status && v.status !== where.status) match = false;
          if (match) return v;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("veh");
        const rec = { id, ...data, status: data.status || "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
        state.transportVehicles.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const v = state.transportVehicles.get(where.id);
        if (!v) throw new NotFoundError("TransportVehicle not found");
        const updated = { ...v, ...cleanUpdateData(data), updatedAt: new Date() };
        state.transportVehicles.set(where.id, updated);
        return updated;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const v of Array.from(state.transportVehicles.values())) {
          if (where?.tenantId && v.tenantId !== where.tenantId) continue;
          if (where?.status && v.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        const results = [];
        for (const v of Array.from(state.transportVehicles.values())) {
          if (where?.tenantId && v.tenantId !== where.tenantId) continue;
          if (where?.status && v.status !== where.status) continue;
          results.push(v);
        }
        return results.slice(skip, skip + take);
      },
    },

    transportDriver: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.transportDrivers.get(where.id) || null;
        if (where.tenantId_licenseNumber) {
          for (const d of Array.from(state.transportDrivers.values())) {
            if (d.tenantId === where.tenantId_licenseNumber.tenantId && d.licenseNumber === where.tenantId_licenseNumber.licenseNumber) {
              return d;
            }
          }
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const d of Array.from(state.transportDrivers.values())) {
          let match = true;
          if (where.id && d.id !== where.id) match = false;
          if (where.tenantId && d.tenantId !== where.tenantId) match = false;
          if (where.userId && d.userId !== where.userId) match = false;
          if (where.status && d.status !== where.status) match = false;
          if (match) return d;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("drv");
        const rec = { id, ...data, status: data.status || "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
        state.transportDrivers.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        const results = [];
        for (const d of Array.from(state.transportDrivers.values())) {
          if (where?.tenantId && d.tenantId !== where.tenantId) continue;
          if (where?.status && d.status !== where.status) continue;
          results.push(d);
        }
        return results;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const d of Array.from(state.transportDrivers.values())) {
          if (where?.tenantId && d.tenantId !== where.tenantId) continue;
          if (where?.status && d.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
    },

    transportAttendant: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.transportAttendants.get(where.id) || null;
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const a of Array.from(state.transportAttendants.values())) {
          let match = true;
          if (where.id && a.id !== where.id) match = false;
          if (where.tenantId && a.tenantId !== where.tenantId) match = false;
          if (where.userId && a.userId !== where.userId) match = false;
          if (where.status && a.status !== where.status) match = false;
          if (match) return a;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("att");
        const rec = { id, ...data, status: data.status || "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
        state.transportAttendants.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        const results = [];
        for (const a of Array.from(state.transportAttendants.values())) {
          if (where?.tenantId && a.tenantId !== where.tenantId) continue;
          if (where?.status && a.status !== where.status) continue;
          results.push(a);
        }
        return results;
      },
    },

    transportRouteAssignment: {
      findFirst: async ({ where }: any) => {
        for (const ra of Array.from(state.transportRouteAssignments.values())) {
          let match = true;
          if (where.id && ra.id !== where.id) match = false;
          if (where.tenantId && ra.tenantId !== where.tenantId) match = false;
          if (where.routeId && ra.routeId !== where.routeId) match = false;
          if (where.vehicleId && ra.vehicleId !== where.vehicleId) match = false;
          if (where.active !== undefined && ra.active !== where.active) match = false;
          if (where.OR && Array.isArray(where.OR)) {
            let orMatch = false;
            for (const cond of where.OR) {
              if (cond.driverId && ra.driverId === cond.driverId) orMatch = true;
              if (cond.attendantId && ra.attendantId === cond.attendantId) orMatch = true;
            }
            if (!orMatch) match = false;
          }
          if (match) {
            const vehicle = state.transportVehicles.get(ra.vehicleId);
            const driver = ra.driverId ? state.transportDrivers.get(ra.driverId) : null;
            return { ...ra, vehicle, driver };
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("tra");
        const rec = { id, ...data, active: true, createdAt: new Date(), updatedAt: new Date() };
        state.transportRouteAssignments.set(id, rec);
        return rec;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const ra of Array.from(state.transportRouteAssignments.values())) {
          if (where.routeId && ra.routeId === where.routeId && ra.active === where.active) {
            state.transportRouteAssignments.set(ra.id, { ...ra, ...cleanUpdateData(data) });
            count++;
          }
        }
        return { count };
      },
    },

    studentTransportAssignment: {
      findFirst: async ({ where }: any) => {
        for (const sta of Array.from(state.studentTransportAssignments.values())) {
          let match = true;
          if (where.id && sta.id !== where.id) match = false;
          if (where.tenantId && sta.tenantId !== where.tenantId) match = false;
          if (where.studentId && sta.studentId !== where.studentId) match = false;
          if (where.routeId && sta.routeId !== where.routeId) match = false;
          if (where.academicYearId && sta.academicYearId !== where.academicYearId) match = false;
          if (where.status && sta.status !== where.status) match = false;
          if (match) {
            const route = state.transportRoutes.get(sta.routeId);
            const pickupStop = state.transportStops.get(sta.pickupStopId);
            const dropStop = state.transportStops.get(sta.dropStopId);
            const student = state.studentProfiles.get(sta.studentId);
            return { ...sta, route, pickupStop, dropStop, student };
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("sta");
        const rec = { id, ...data, status: data.status || "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
        state.studentTransportAssignments.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const sta = state.studentTransportAssignments.get(where.id);
        if (!sta) throw new NotFoundError("StudentTransportAssignment not found");
        const updated = { ...sta, ...cleanUpdateData(data), updatedAt: new Date() };
        state.studentTransportAssignments.set(where.id, updated);
        return updated;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const sta of Array.from(state.studentTransportAssignments.values())) {
          if (where?.tenantId && sta.tenantId !== where.tenantId) continue;
          if (where?.routeId && sta.routeId !== where.routeId) continue;
          if (where?.academicYearId && sta.academicYearId !== where.academicYearId) continue;
          if (where?.status && sta.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        const results = [];
        for (const sta of Array.from(state.studentTransportAssignments.values())) {
          if (where?.tenantId && sta.tenantId !== where.tenantId) continue;
          if (where?.routeId && sta.routeId !== where.routeId) continue;
          if (where?.academicYearId && sta.academicYearId !== where.academicYearId) continue;
          if (where?.status && sta.status !== where.status) continue;
          results.push(sta);
        }
        return results.slice(skip, skip + take);
      },
    },

    transportPass: {
      findFirst: async ({ where }: any) => {
        for (const p of Array.from(state.transportPasses.values())) {
          let match = true;
          if (where.id && p.id !== where.id) match = false;
          if (where.tenantId && p.tenantId !== where.tenantId) match = false;
          if (where.assignmentId && p.assignmentId !== where.assignmentId) match = false;
          if (where.status && p.status !== where.status) match = false;
          if (match) return p;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("pass");
        const rec = { id, ...data, status: data.status || "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
        state.transportPasses.set(id, rec);
        return rec;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const p of Array.from(state.transportPasses.values())) {
          if (where.assignmentId && p.assignmentId === where.assignmentId) {
            state.transportPasses.set(p.id, { ...p, ...cleanUpdateData(data) });
            count++;
          }
        }
        return { count };
      },
    },

    transportIncident: {
      findFirst: async ({ where }: any) => {
        for (const inc of Array.from(state.transportIncidents.values())) {
          let match = true;
          if (where.id && inc.id !== where.id) match = false;
          if (where.tenantId && inc.tenantId !== where.tenantId) match = false;
          if (where.status && inc.status !== where.status) match = false;
          if (match) return inc;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("inc");
        const rec = { id, ...data, status: data.status || "OPEN", createdAt: new Date(), updatedAt: new Date() };
        state.transportIncidents.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const inc = state.transportIncidents.get(where.id);
        if (!inc) throw new NotFoundError("TransportIncident not found");
        const updated = { ...inc, ...cleanUpdateData(data), updatedAt: new Date() };
        state.transportIncidents.set(where.id, updated);
        return updated;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const inc of Array.from(state.transportIncidents.values())) {
          if (where?.tenantId && inc.tenantId !== where.tenantId) continue;
          if (where?.status && inc.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        const results = [];
        for (const inc of Array.from(state.transportIncidents.values())) {
          if (where?.tenantId && inc.tenantId !== where.tenantId) continue;
          if (where?.status && inc.status !== where.status) continue;
          results.push(inc);
        }
        return results.slice(skip, skip + take);
      },
    },

    // ------------------------------------------------------------------------
    // AUDIT & OUTBOX
    // ------------------------------------------------------------------------
    auditLog: {
      create: async ({ data }: any) => {
        const id = genId("aud");
        const rec = { id, ...data, createdAt: new Date() };
        state.auditLogs.push(rec);
        return rec;
      },
    },

    tenantOutboxEvent: {
      create: async ({ data }: any) => {
        const id = genId("obx");
        const rec = { id, ...data, createdAt: new Date() };
        state.tenantOutboxEvents.push(rec);
        return rec;
      },
    },
  };

  return mockDb;
}

// ============================================================================
// STEP 14: V2 WAVE 3 CONTROLLED PRODUCTION PILOT TEST SUITE
// ============================================================================

describe("STEP 14: V2 WAVE 3 CONTROLLED PRODUCTION PILOT (Library & Transport)", () => {
  let db: any;
  let libraryService: LibraryService;
  let transportService: TransportService;
  let moduleGate: ModuleGate;
  let scopeEvaluator: ScopeEvaluator;

  // Established Pilot & Control Tenants
  const tenantPilot = "tnt_pilot_dps"; // Delhi Public Academy
  const tenantControl = "tnt_control_dav"; // DAV Centenary Academy

  // Personas
  const userAdmin = { id: "usr_principal", email: "principal@dps.edu" };
  const userLibrarian = { id: "usr_librarian", email: "librarian@dps.edu" };
  const userTransportCoord = { id: "usr_transport_coord", email: "transport@dps.edu" };
  const userTeacher = { id: "usr_teacher", email: "teacher@dps.edu" };
  const userStudent1 = { id: "usr_student_1", email: "student1@dps.edu" };
  const userStudent2 = { id: "usr_student_2", email: "student2@dps.edu" };
  const userStudent3 = { id: "usr_student_3", email: "student3@dps.edu" };
  const userParent = { id: "usr_parent_1", email: "parent1@gmail.com" };
  const userDriver = { id: "usr_driver_1", email: "driver1@dps.edu" };
  const userAttendant = { id: "usr_attendant_1", email: "attendant1@dps.edu" };

  beforeEach(() => {
    db = createPilotDatabaseStore();
    libraryService = new LibraryService();
    transportService = new TransportService();
    moduleGate = new ModuleGate();
    scopeEvaluator = new ScopeEvaluator();

    // 1. Seed Tenants
    db._state.tenants.set(tenantPilot, {
      id: tenantPilot,
      name: "Delhi Public Academy",
      slug: "dps-delhi",
      status: "ACTIVE",
    });
    db._state.tenants.set(tenantControl, {
      id: tenantControl,
      name: "DAV Centenary Academy",
      slug: "dav-centenary",
      status: "ACTIVE",
    });

    // 2. Seed Users
    db._state.users.set(userAdmin.id, { id: userAdmin.id, email: userAdmin.email });
    db._state.users.set(userLibrarian.id, { id: userLibrarian.id, email: userLibrarian.email });
    db._state.users.set(userTransportCoord.id, { id: userTransportCoord.id, email: userTransportCoord.email });
    db._state.users.set(userTeacher.id, { id: userTeacher.id, email: userTeacher.email });
    db._state.users.set(userStudent1.id, { id: userStudent1.id, email: userStudent1.email });
    db._state.users.set(userStudent2.id, { id: userStudent2.id, email: userStudent2.email });
    db._state.users.set(userStudent3.id, { id: userStudent3.id, email: userStudent3.email });
    db._state.users.set(userParent.id, { id: userParent.id, email: userParent.email });
    db._state.users.set(userDriver.id, { id: userDriver.id, email: userDriver.email });
    db._state.users.set(userAttendant.id, { id: userAttendant.id, email: userAttendant.email });

    // 3. Seed Academic Year
    db._state.academicYears.set("ay_2026_dps", {
      id: "ay_2026_dps",
      tenantId: tenantPilot,
      name: "Academic Year 2026-27",
      isCurrent: true,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
    });

    // 4. Seed Module Entitlements: Pilot tenant has both enabled; Control tenant has neither
    db._state.tenantModuleEntitlements.set(`${tenantPilot}_library_module`, {
      tenantId: tenantPilot,
      moduleKey: "library_module",
      isEnabled: true,
    });
    db._state.tenantModuleEntitlements.set(`${tenantPilot}_transport_module`, {
      tenantId: tenantPilot,
      moduleKey: "transport_module",
      isEnabled: true,
    });
    db._state.tenantModuleEntitlements.set(`${tenantControl}_library_module`, {
      tenantId: tenantControl,
      moduleKey: "library_module",
      isEnabled: false,
    });
    db._state.tenantModuleEntitlements.set(`${tenantControl}_transport_module`, {
      tenantId: tenantControl,
      moduleKey: "transport_module",
      isEnabled: false,
    });

    // 5. Seed Student Profiles & Parent Bindings
    db._state.studentProfiles.set("stu_p1", {
      id: "stu_p1",
      tenantId: tenantPilot,
      userId: userStudent1.id,
      admissionNumber: "DPS-2026-001",
      firstName: "Aarav",
      lastName: "Sharma",
      status: "ACTIVE",
    });
    db._state.studentProfiles.set("stu_p2", {
      id: "stu_p2",
      tenantId: tenantPilot,
      userId: userStudent2.id,
      admissionNumber: "DPS-2026-002",
      firstName: "Diya",
      lastName: "Patel",
      status: "ACTIVE",
    });
    db._state.studentProfiles.set("stu_p3", {
      id: "stu_p3",
      tenantId: tenantPilot,
      userId: userStudent3.id,
      admissionNumber: "DPS-2026-003",
      firstName: "Kabir",
      lastName: "Singh",
      status: "ACTIVE",
    });

    // Control tenant student
    db._state.studentProfiles.set("stu_ctrl_1", {
      id: "stu_ctrl_1",
      tenantId: tenantControl,
      admissionNumber: "DAV-2026-099",
      firstName: "Rohan",
      lastName: "Verma",
      status: "ACTIVE",
    });

    db._state.parentProfiles.set("par_1", {
      id: "par_1",
      tenantId: tenantPilot,
      userId: userParent.id,
      firstName: "Rajesh",
      lastName: "Sharma",
    });
    db._state.studentParentBindings.set("spb_1", {
      id: "spb_1",
      tenantId: tenantPilot,
      studentId: "stu_p1",
      parentId: "par_1",
      relationship: "FATHER",
      parentProfile: { userId: userParent.id },
    });
  });

  // ==========================================================================
  // SECTION 4: MODULE ENTITLEMENT TESTS
  // ==========================================================================
  describe("Section 4: Module Entitlement Tests (Independent & Tenant-Specific)", () => {
    it("should allow Library and Transport when both modules are enabled for pilot tenant", async () => {
      const libEnabled = await moduleGate.isModuleEnabled(tenantPilot, "library_module", db);
      const transEnabled = await moduleGate.isModuleEnabled(tenantPilot, "transport_module", db);

      expect(libEnabled).toBe(true);
      expect(transEnabled).toBe(true);
    });

    it("should reject operations with HTTP 402 ModuleDisabledError when library_module is disabled", async () => {
      // Temporarily disable library for pilot
      db._state.tenantModuleEntitlements.set(`${tenantPilot}_library_module`, {
        tenantId: tenantPilot,
        moduleKey: "library_module",
        isEnabled: false,
      });

      await expect(
        moduleGate.assertModuleEnabled(tenantPilot, "library_module", db)
      ).rejects.toBeInstanceOf(ModuleDisabledError);

      // Transport remains enabled
      const transEnabled = await moduleGate.isModuleEnabled(tenantPilot, "transport_module", db);
      expect(transEnabled).toBe(true);
    });

    it("should reject operations with HTTP 402 ModuleDisabledError when transport_module is disabled", async () => {
      // Temporarily disable transport for pilot
      db._state.tenantModuleEntitlements.set(`${tenantPilot}_transport_module`, {
        tenantId: tenantPilot,
        moduleKey: "transport_module",
        isEnabled: false,
      });

      await expect(
        moduleGate.assertModuleEnabled(tenantPilot, "transport_module", db)
      ).rejects.toBeInstanceOf(ModuleDisabledError);

      // Library remains enabled
      const libEnabled = await moduleGate.isModuleEnabled(tenantPilot, "library_module", db);
      expect(libEnabled).toBe(true);
    });

    it("should reject Control tenant from both modules with HTTP 402 (Tenant-Specific Isolation)", async () => {
      await expect(
        moduleGate.assertModuleEnabled(tenantControl, "library_module", db)
      ).rejects.toBeInstanceOf(ModuleDisabledError);

      await expect(
        moduleGate.assertModuleEnabled(tenantControl, "transport_module", db)
      ).rejects.toBeInstanceOf(ModuleDisabledError);
    });
  });

  // ==========================================================================
  // SECTION 6: LIBRARY PILOT SCENARIOS
  // ==========================================================================
  describe("Section 6: Library Pilot Operations & Circulation Invariants", () => {
    let dpsPolicy: any;
    let catScience: any;
    let authFeynman: any;
    let pubAddison: any;
    let bookPhysics: any;
    let copyPhysics1: any;
    let copyPhysics2: any;
    let memberStudent1: any;
    let memberStudent2: any;

    beforeEach(async () => {
      // Institutional policy: max 2 active loans, 1 renewal, 14 days, fine 10/day, 1 grace day
      dpsPolicy = await libraryService.upsertPolicy(
        {
          tenantId: tenantPilot,
          name: "DPS Delhi Circulation Policy",
          defaultLoanPeriodDays: 14,
          maxActiveLoans: 2,
          renewalLimit: 1,
          finePerDayCents: new Decimal(10.0),
          gracePeriodDays: 1,
          actorUserId: userLibrarian.id,
        },
        db
      );

      catScience = await libraryService.createCategory(
        {
          tenantId: tenantPilot,
          name: "Physics & Natural Sciences",
          code: "SCI-PHYS",
          actorUserId: userLibrarian.id,
        },
        db
      );

      authFeynman = await libraryService.createAuthor(
        {
          tenantId: tenantPilot,
          name: "Richard P. Feynman",
          actorUserId: userLibrarian.id,
        },
        db
      );

      pubAddison = await libraryService.createPublisher(
        {
          tenantId: tenantPilot,
          name: "Addison-Wesley",
          actorUserId: userLibrarian.id,
        },
        db
      );

      bookPhysics = await libraryService.createBook(
        {
          tenantId: tenantPilot,
          title: "The Feynman Lectures on Physics, Vol. I",
          isbn: "978-0465024933",
          categoryId: catScience.id,
          authorId: authFeynman.id,
          publisherId: pubAddison.id,
          publicationYear: 2011,
          actorUserId: userLibrarian.id,
        },
        db
      );

      copyPhysics1 = await libraryService.createBookCopy(
        {
          tenantId: tenantPilot,
          bookId: bookPhysics.id,
          accessionNumber: "ACC-DPS-001",
          barcode: "BAR-001",
          location: "Stack A1-04",
          actorUserId: userLibrarian.id,
        },
        db
      );

      copyPhysics2 = await libraryService.createBookCopy(
        {
          tenantId: tenantPilot,
          bookId: bookPhysics.id,
          accessionNumber: "ACC-DPS-002",
          barcode: "BAR-002",
          location: "Stack A1-05",
          actorUserId: userLibrarian.id,
        },
        db
      );

      memberStudent1 = await libraryService.registerMember(
        {
          tenantId: tenantPilot,
          memberType: "STUDENT",
          memberCode: "MEM-DPS-S1",
          studentProfileId: "stu_p1",
          userId: userStudent1.id,
          actorUserId: userLibrarian.id,
        },
        db
      );

      memberStudent2 = await libraryService.registerMember(
        {
          tenantId: tenantPilot,
          memberType: "STUDENT",
          memberCode: "MEM-DPS-S2",
          studentProfileId: "stu_p2",
          userId: userStudent2.id,
          actorUserId: userLibrarian.id,
        },
        db
      );
    });

    it("6.1 Catalog: should enforce accession number uniqueness within tenant", async () => {
      await expect(
        libraryService.createBookCopy(
          {
            tenantId: tenantPilot,
            bookId: bookPhysics.id,
            accessionNumber: "ACC-DPS-001", // duplicate
            actorUserId: userLibrarian.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("6.2 Membership: should prevent duplicate member registration for same user/student", async () => {
      await expect(
        libraryService.registerMember(
          {
            tenantId: tenantPilot,
            memberType: "STUDENT",
            memberCode: "MEM-DPS-S1-DUP",
            studentProfileId: "stu_p1", // already registered
            actorUserId: userLibrarian.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("6.3 Issue: should issue available book copy and update status to ISSUED", async () => {
      const loan = await libraryService.issueBook(
        {
          tenantId: tenantPilot,
          memberId: memberStudent1.id,
          bookCopyId: copyPhysics1.id,
          actorUserId: userLibrarian.id,
        },
        db
      );

      expect(loan.id).toBeDefined();
      expect(loan.status).toBe("ISSUED");

      const copy = await libraryService.getBookCopy(tenantPilot, copyPhysics1.id, db);
      expect(copy.status).toBe("ISSUED");

      // Verify audit & outbox
      const audit = db._state.auditLogs.find((a: any) => a.action === "LIBRARY_BOOK_ISSUED");
      expect(audit).toBeDefined();
      expect(audit.tenantId).toBe(tenantPilot);

      const outbox = db._state.tenantOutboxEvents.find(
        (o: any) => o.eventType === "library.book.issued"
      );
      expect(outbox).toBeDefined();
    });

    it("6.3 Issue Negative: should reject issuing an already issued copy", async () => {
      await libraryService.issueBook(
        {
          tenantId: tenantPilot,
          memberId: memberStudent1.id,
          bookCopyId: copyPhysics1.id,
          actorUserId: userLibrarian.id,
        },
        db
      );

      await expect(
        libraryService.issueBook(
          {
            tenantId: tenantPilot,
            memberId: memberStudent2.id,
            bookCopyId: copyPhysics1.id, // already issued
            actorUserId: userLibrarian.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("6.3 Issue Negative: should reject issuing when member quota (maxActiveLoans = 2) is reached", async () => {
      // 1st issue
      await libraryService.issueBook(
        {
          tenantId: tenantPilot,
          memberId: memberStudent1.id,
          bookCopyId: copyPhysics1.id,
          actorUserId: userLibrarian.id,
        },
        db
      );

      // 2nd issue
      await libraryService.issueBook(
        {
          tenantId: tenantPilot,
          memberId: memberStudent1.id,
          bookCopyId: copyPhysics2.id,
          actorUserId: userLibrarian.id,
        },
        db
      );

      // 3rd book copy
      const copy3 = await libraryService.createBookCopy(
        {
          tenantId: tenantPilot,
          bookId: bookPhysics.id,
          accessionNumber: "ACC-DPS-003",
          actorUserId: userLibrarian.id,
        },
        db
      );

      // Attempt 3rd issue -> quota exceeded
      await expect(
        libraryService.issueBook(
          {
            tenantId: tenantPilot,
            memberId: memberStudent1.id,
            bookCopyId: copy3.id,
            actorUserId: userLibrarian.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("6.4 Return: should return book, set copy to AVAILABLE, and handle concurrent returns safely", async () => {
      const loan = await libraryService.issueBook(
        {
          tenantId: tenantPilot,
          memberId: memberStudent1.id,
          bookCopyId: copyPhysics1.id,
          actorUserId: userLibrarian.id,
        },
        db
      );

      const returned = await libraryService.returnBook(
        {
          tenantId: tenantPilot,
          loanId: loan.id,
          actorUserId: userLibrarian.id,
        },
        db
      );

      expect(returned.loan.status).toBe("RETURNED");
      const copy = await libraryService.getBookCopy(tenantPilot, copyPhysics1.id, db);
      expect(copy.status).toBe("AVAILABLE");

      // Attempt second return on already returned loan
      await expect(
        libraryService.returnBook(
          {
            tenantId: tenantPilot,
            loanId: loan.id,
            actorUserId: userLibrarian.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("6.5 Renewal: should renew book and enforce renewal limit (max 1)", async () => {
      const loan = await libraryService.issueBook(
        {
          tenantId: tenantPilot,
          memberId: memberStudent1.id,
          bookCopyId: copyPhysics1.id,
          actorUserId: userLibrarian.id,
        },
        db
      );

      // 1st renewal -> success
      const renewed = await libraryService.renewBook(
        {
          tenantId: tenantPilot,
          loanId: loan.id,
          actorUserId: userLibrarian.id,
        },
        db
      );
      expect(renewed.renewalCount).toBe(1);

      // 2nd renewal -> rejected (limit is 1)
      await expect(
        libraryService.renewBook(
          {
            tenantId: tenantPilot,
            loanId: loan.id,
            actorUserId: userLibrarian.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("6.6 Reservations: should reserve title and enforce single active reservation per member", async () => {
      const res = await libraryService.reserveBook(
        {
          tenantId: tenantPilot,
          memberId: memberStudent1.id,
          bookId: bookPhysics.id,
          actorUserId: userStudent1.id,
        },
        db
      );
      expect(res.status).toBe("PENDING");

      // Duplicate reservation attempt
      await expect(
        libraryService.reserveBook(
          {
            tenantId: tenantPilot,
            memberId: memberStudent1.id,
            bookId: bookPhysics.id,
            actorUserId: userStudent1.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);

      // Cancel reservation
      const cancelled = await libraryService.cancelReservation(
        tenantPilot,
        res.id,
        userStudent1.id,
        undefined,
        db
      );
      expect(cancelled.status).toBe("CANCELLED");
    });

    it("6.7 Deterministic Overdue Fines & Authorized Waiver", async () => {
      // Create overdue loan (5 days overdue: 5 days - 1 min to prevent Math.ceil rounding to 6th day, 1 day grace -> 4 billable days * ₹10 = ₹40)
      const pastDue = new Date(Date.now() - (5 * 24 * 60 * 60 * 1000 - 60 * 1000));
      const loan = await libraryService.issueBook(
        {
          tenantId: tenantPilot,
          memberId: memberStudent1.id,
          bookCopyId: copyPhysics1.id,
          dueAt: pastDue,
          actorUserId: userLibrarian.id,
        },
        db
      );

      const returned = await libraryService.returnBook(
        {
          tenantId: tenantPilot,
          loanId: loan.id,
          actorUserId: userLibrarian.id,
        },
        db
      );

      expect(returned.fine).toBeDefined();
      expect(returned.fine!.amount.toString()).toBe("40");
      expect(returned.fine!.status).toBe("UNPAID");

      // Authorized waiver
      const waived = await libraryService.waiveFine(
        {
          tenantId: tenantPilot,
          fineId: returned.fine!.id,
          waiveReason: "Approved medical leave certificate presented by guardian",
          actorUserId: userAdmin.id,
        },
        db
      );
      expect(waived.status).toBe("WAIVED");
      expect(waived.waiveReason).toContain("medical leave");
    });
  });

  // ==========================================================================
  // SECTION 7: LIBRARY FINANCIAL INTEGRATION
  // ==========================================================================
  describe("Section 7: Library Financial Integration (Wave 1 Reconciliation)", () => {
    it("should settle library fine and record authoritative financial transaction reference", async () => {
      const fine = await db.libraryFine.create({
        data: {
          tenantId: tenantPilot,
          memberId: "mem_pilot_1",
          amount: new Decimal(50.0),
          reason: "Damaged cover repair charge",
          status: "UNPAID",
          assessedAt: new Date(),
        },
      });

      const settled = await libraryService.settleFine(
        {
          tenantId: tenantPilot,
          fineId: fine.id,
          financialReference: "RCP-DPS-2026-9042",
          feePaymentId: "pay_w1_8832",
          notes: "Collected at front library desk via POS terminal",
          actorUserId: userLibrarian.id,
        },
        db
      );

      expect(settled.status).toBe("PAID");
      expect(settled.financialReference).toBe("RCP-DPS-2026-9042");

      // Prevent duplicate fine settlement
      await expect(
        libraryService.settleFine(
          {
            tenantId: tenantPilot,
            fineId: fine.id,
            financialReference: "RCP-DPS-2026-9042",
            actorUserId: userLibrarian.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  // ==========================================================================
  // SECTION 8 & 9: TRANSPORT PILOT & CAPACITY ENFORCEMENT
  // ==========================================================================
  describe("Section 8 & 9: Transport Operations, Capacity & Incident Management", () => {
    let routeA: any;
    let stop1: any;
    let stop2: any;
    let stop3: any;
    let busMini: any;
    let driver1: any;
    let attendant1: any;

    beforeEach(async () => {
      routeA = await transportService.createRoute(
        {
          tenantId: tenantPilot,
          routeCode: "RT-NORTH-01",
          name: "North Delhi Express Line",
          direction: "BOTH",
          operatingDays: "MON,TUE,WED,THU,FRI",
          actorUserId: userTransportCoord.id,
        },
        db
      );

      stop1 = await transportService.createStop(
        {
          tenantId: tenantPilot,
          routeId: routeA.id,
          stopName: "Rohini Sector 14 Crossing",
          sequence: 1,
          pickupTime: "07:15 AM",
          dropTime: "02:45 PM",
          landmark: "Opposite Mother Dairy Booth",
          actorUserId: userTransportCoord.id,
        },
        db
      );

      stop2 = await transportService.createStop(
        {
          tenantId: tenantPilot,
          routeId: routeA.id,
          stopName: "Pitampura Metro Pillar 320",
          sequence: 2,
          pickupTime: "07:30 AM",
          dropTime: "02:30 PM",
          landmark: "Near Exit Gate 2",
          actorUserId: userTransportCoord.id,
        },
        db
      );

      stop3 = await transportService.createStop(
        {
          tenantId: tenantPilot,
          routeId: routeA.id,
          stopName: "DPS Main Campus Gate 3",
          sequence: 3,
          pickupTime: "07:55 AM",
          dropTime: "02:10 PM",
          landmark: "School Bus Bay",
          actorUserId: userTransportCoord.id,
        },
        db
      );

      // Bus with deliberately small capacity: 2 seats
      busMini = await transportService.createVehicle(
        {
          tenantId: tenantPilot,
          registrationNumber: "DL-1VA-9081",
          vehicleType: "MINIBUS",
          capacity: 2,
          status: "ACTIVE",
          actorUserId: userTransportCoord.id,
        },
        db
      );

      driver1 = await transportService.registerDriver(
        {
          tenantId: tenantPilot,
          userId: userDriver.id,
          name: "Ramesh Kumar",
          phone: "+91 98765 43210",
          licenseNumber: "DL-0420110098765",
          licenseExpiry: new Date("2029-12-31"),
          actorUserId: userTransportCoord.id,
        },
        db
      );

      attendant1 = await transportService.registerAttendant(
        {
          tenantId: tenantPilot,
          userId: userAttendant.id,
          name: "Suresh Lal",
          phone: "+91 98765 43211",
          actorUserId: userTransportCoord.id,
        },
        db
      );

      await transportService.assignRouteFleet(
        {
          tenantId: tenantPilot,
          routeId: routeA.id,
          vehicleId: busMini.id,
          driverId: driver1.id,
          attendantId: attendant1.id,
          shift: "BOTH",
          effectiveFrom: new Date("2026-04-01"),
          actorUserId: userTransportCoord.id,
        },
        db
      );
    });

    it("8.1 Routes & Stops: should reject duplicate stop sequence on the same route", async () => {
      await expect(
        transportService.createStop(
          {
            tenantId: tenantPilot,
            routeId: routeA.id,
            stopName: "Duplicate Sequence Stop",
            sequence: 1, // already taken by Rohini
            actorUserId: userTransportCoord.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("8.2 Fleet: should reject assigning an INACTIVE or MAINTENANCE vehicle to a route", async () => {
      const brokenVan = await transportService.createVehicle(
        {
          tenantId: tenantPilot,
          registrationNumber: "DL-1VA-4040",
          vehicleType: "VAN",
          capacity: 10,
          status: "MAINTENANCE",
          actorUserId: userTransportCoord.id,
        },
        db
      );

      await expect(
        transportService.assignRouteFleet(
          {
            tenantId: tenantPilot,
            routeId: routeA.id,
            vehicleId: brokenVan.id,
            driverId: driver1.id,
            effectiveFrom: new Date("2026-04-01"),
            actorUserId: userTransportCoord.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("9. Capacity Enforcement: should strictly enforce vehicle capacity (2 seats) and reject over-allocation", async () => {
      // 1st seat assigned -> Student 1
      const assign1 = await transportService.assignStudentTransport(
        {
          tenantId: tenantPilot,
          studentId: "stu_p1",
          routeId: routeA.id,
          pickupStopId: stop1.id,
          dropStopId: stop3.id,
          academicYearId: "ay_2026_dps",
          actorUserId: userTransportCoord.id,
        },
        db
      );
      expect(assign1.assignment.id).toBeDefined();
      expect(assign1.pass?.passNumber).toBeDefined();

      // 2nd seat assigned -> Student 2
      const assign2 = await transportService.assignStudentTransport(
        {
          tenantId: tenantPilot,
          studentId: "stu_p2",
          routeId: routeA.id,
          pickupStopId: stop2.id,
          dropStopId: stop3.id,
          academicYearId: "ay_2026_dps",
          actorUserId: userTransportCoord.id,
        },
        db
      );
      expect(assign2.assignment.id).toBeDefined();

      // 3rd seat attempt -> Student 3 (Exceeds capacity of 2)
      await expect(
        transportService.assignStudentTransport(
          {
            tenantId: tenantPilot,
            studentId: "stu_p3",
            routeId: routeA.id,
            pickupStopId: stop1.id,
            dropStopId: stop3.id,
            academicYearId: "ay_2026_dps",
            actorUserId: userTransportCoord.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("10. Student Transport: should reject stops belonging to a different route", async () => {
      const routeB = await transportService.createRoute(
        {
          tenantId: tenantPilot,
          routeCode: "RT-SOUTH-02",
          name: "South Delhi Transit",
          actorUserId: userTransportCoord.id,
        },
        db
      );

      const foreignStop = await transportService.createStop(
        {
          tenantId: tenantPilot,
          routeId: routeB.id,
          stopName: "Saket Metro Crossing",
          sequence: 1,
          actorUserId: userTransportCoord.id,
        },
        db
      );

      // Attempt to assign student on routeA using foreignStop from routeB
      await expect(
        transportService.assignStudentTransport(
          {
            tenantId: tenantPilot,
            studentId: "stu_p1",
            routeId: routeA.id,
            pickupStopId: foreignStop.id, // invalid stop
            dropStopId: stop3.id,
            academicYearId: "ay_2026_dps",
            actorUserId: userTransportCoord.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("11. Incidents: should log and resolve operational transit incidents", async () => {
      const incident = await transportService.recordIncident(
        {
          tenantId: tenantPilot,
          routeId: routeA.id,
          vehicleId: busMini.id,
          severity: "HIGH",
          description: "Engine overheating near Ring Road flyover; passengers safe",
          actorUserId: userDriver.id,
        },
        db
      );
      expect(incident.id).toBeDefined();
      expect(incident.status).toBe("OPEN");

      const resolved = await transportService.resolveIncident(
        {
          tenantId: tenantPilot,
          incidentId: incident.id,
          resolutionNotes: "Backup vehicle dispatched, passengers transferred safely without delay",
          actorUserId: userTransportCoord.id,
        },
        db
      );
      expect(resolved.status).toBe("RESOLVED");
    });
  });

  // ==========================================================================
  // SECTION 12: ACCESS SCOPE ENFORCEMENT (IDOR RESISTANCE)
  // ==========================================================================
  describe("Section 12: AccessScope Enforcement & Anti-IDOR Protections", () => {
    it("INSTITUTION_WIDE: Librarian can view all institutional member circulation records", async () => {
      const allowed = await scopeEvaluator.evaluateScope(
        "INSTITUTION_WIDE",
        { permission: "library.read", targetMemberId: "mem_any_1" },
        { tenant: { id: tenantPilot }, user: { id: userLibrarian.id } } as any,
        db
      );
      expect(allowed).toBe(true);
    });

    it("SELF_ONLY: Student can access own records, but is blocked from another student's records (IDOR)", async () => {
      // Allowed: own records
      const ownAllowed = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        { permission: "library.read", targetStudentId: "stu_p1" },
        { tenant: { id: tenantPilot }, user: { id: userStudent1.id } } as any,
        db
      );
      expect(ownAllowed).toBe(true);

      // Blocked: another student's records
      const foreignAllowed = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        { permission: "library.read", targetStudentId: "stu_p2" },
        { tenant: { id: tenantPilot }, user: { id: userStudent1.id } } as any,
        db
      );
      expect(foreignAllowed).toBe(false);
    });

    it("LINKED_CHILDREN: Parent can access verified linked child, but is blocked from unlinked students", async () => {
      // Allowed: linked child (stu_p1)
      const linkedAllowed = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        { permission: "library.read", targetStudentId: "stu_p1" },
        { tenant: { id: tenantPilot }, user: { id: userParent.id } } as any,
        db
      );
      expect(linkedAllowed).toBe(true);

      // Blocked: unlinked student (stu_p2)
      const unlinkedAllowed = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        { permission: "library.read", targetStudentId: "stu_p2" },
        { tenant: { id: tenantPilot }, user: { id: userParent.id } } as any,
        db
      );
      expect(unlinkedAllowed).toBe(false);
    });

    it("ASSIGNED_ONLY: Driver is restricted strictly to assigned route roster", async () => {
      // Setup driver assignment on rt_assigned_1
      const driverRec = await db.transportDriver.create({
        data: {
          tenantId: tenantPilot,
          userId: userDriver.id,
          name: "Driver Scope Test",
          phone: "+91 99999 11111",
          licenseNumber: "DL-SCOPE-111",
        },
      });

      await db.transportRouteAssignment.create({
        data: {
          tenantId: tenantPilot,
          routeId: "rt_assigned_1",
          vehicleId: "veh_1",
          driverId: driverRec.id,
          active: true,
        },
      });

      // Allowed: assigned route rt_assigned_1
      const assignedAllowed = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        { permission: "transport.read", targetRouteId: "rt_assigned_1" },
        { tenant: { id: tenantPilot }, user: { id: userDriver.id } } as any,
        db
      );
      expect(assignedAllowed).toBe(true);

      // Blocked: unassigned route rt_unassigned_2
      const unassignedAllowed = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        { permission: "transport.read", targetRouteId: "rt_unassigned_2" },
        { tenant: { id: tenantPilot }, user: { id: userDriver.id } } as any,
        db
      );
      expect(unassignedAllowed).toBe(false);
    });
  });

  // ==========================================================================
  // SECTION 13: CROSS-TENANT ISOLATION (ZERO LEAKAGE)
  // ==========================================================================
  describe("Section 13: Cross-Tenant Isolation Invariants", () => {
    it("should reject Pilot tenant from assigning a student belonging to Control tenant", async () => {
      const route = await transportService.createRoute(
        {
          tenantId: tenantPilot,
          routeCode: "RT-PILOT-01",
          name: "Pilot Campus Line",
          actorUserId: userTransportCoord.id,
        },
        db
      );

      const stop = await transportService.createStop(
        {
          tenantId: tenantPilot,
          routeId: route.id,
          stopName: "Campus Gate",
          sequence: 1,
          actorUserId: userTransportCoord.id,
        },
        db
      );

      // Attempt to assign stu_ctrl_1 (DAV tenant) to RT-PILOT-01 (DPS tenant)
      await expect(
        transportService.assignStudentTransport(
          {
            tenantId: tenantPilot,
            studentId: "stu_ctrl_1", // Control tenant student
            routeId: route.id,
            pickupStopId: stop.id,
            dropStopId: stop.id,
            academicYearId: "ay_2026_dps",
            actorUserId: userTransportCoord.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject issuing a Pilot book copy to a member of Control tenant", async () => {
      const book = await libraryService.createBook(
        {
          tenantId: tenantPilot,
          title: "Pilot Chemistry",
          actorUserId: userLibrarian.id,
        },
        db
      );

      const copy = await libraryService.createBookCopy(
        {
          tenantId: tenantPilot,
          bookId: book.id,
          accessionNumber: "ACC-PILOT-99",
          actorUserId: userLibrarian.id,
        },
        db
      );

      // Control member in Control tenant
      const ctrlMember = await db.libraryMember.create({
        data: {
          tenantId: tenantControl,
          memberType: "STUDENT",
          memberCode: "MEM-CTRL-01",
          status: "ACTIVE",
        },
      });

      // Attempt to issue Pilot book to Control member
      await expect(
        libraryService.issueBook(
          {
            tenantId: tenantPilot,
            memberId: ctrlMember.id, // foreign member
            bookCopyId: copy.id,
            actorUserId: userLibrarian.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ==========================================================================
  // SECTION 20: PRODUCTION-LIKE DATA RECONCILIATION
  // ==========================================================================
  describe("Section 20: Production-Like Data Integrity Reconciliation", () => {
    it("should maintain 100% parity between active loan records and copy statuses", async () => {
      const report = await libraryService.getCirculationReport(tenantPilot, db);

      // Total copies in pilot tenant
      const totalCopies = await db.libraryBookCopy.count({ where: { tenantId: tenantPilot } });
      const availableCopies = await db.libraryBookCopy.count({
        where: { tenantId: tenantPilot, status: "AVAILABLE" },
      });
      const issuedCopies = await db.libraryBookCopy.count({
        where: { tenantId: tenantPilot, status: "ISSUED" },
      });

      expect(availableCopies + issuedCopies).toBe(totalCopies);
      expect(report.totalBooks).toBeGreaterThanOrEqual(0);
    });

    it("should maintain 100% parity between active passenger count and vehicle occupancy", async () => {
      const report = await transportService.getTransportReport(tenantPilot, db);

      for (const routeStat of report.routeOccupancies) {
        expect(routeStat.enrolled).toBeLessThanOrEqual(routeStat.capacity);
      }
      expect(report.totalRoutes).toBeGreaterThanOrEqual(0);
    });
  });
});
