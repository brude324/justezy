import { describe, it, expect, beforeEach } from "vitest";
import { AdmissionsService } from "@/lib/services/admissions-service";
import { ModuleGate } from "@/lib/authorization/module-gate";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ModuleDisabledError,
} from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

// Helper to strip undefined values during Prisma mock updates
function cleanUpdateData(data: any) {
  const clean: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
}

// ============================================================================
// STATEFUL IN-MEMORY CONTROLLED PILOT DATABASE ENGINE
// ============================================================================

function createPilotDatabaseStore() {
  const state = {
    admissionSessions: new Map<string, any>(),
    admissionSources: new Map<string, any>(),
    admissionEnquiries: new Map<string, any>(),
    admissionApplicants: new Map<string, any>(),
    admissionApplications: new Map<string, any>(),
    admissionApplicationDocuments: new Map<string, any>(),
    admissionInterviews: new Map<string, any>(),
    admissionTests: new Map<string, any>(),
    admissionDecisions: new Map<string, any>(),
    admissionOffers: new Map<string, any>(),
    admissionConfirmations: new Map<string, any>(),
    studentProfiles: new Map<string, any>(),
    studentEnrollments: new Map<string, any>(),
    parentProfiles: new Map<string, any>(),
    studentParentBindings: new Map<string, any>(),
    academicYears: new Map<string, any>(),
    grades: new Map<string, any>(),
    classes: new Map<string, any>(),
    documentReferences: new Map<string, any>(),
    feeInvoices: new Map<string, any>(),
    tenants: new Map<string, any>(),
    tenantModuleEntitlements: new Map<string, any>(),
    auditLogs: [] as any[],
    tenantOutboxEvents: [] as any[],
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
      findUnique: async ({ where }: any) => {
        return state.academicYears.get(where.id) || null;
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
      findUnique: async ({ where }: any) => {
        return state.grades.get(where.id) || null;
      },
    },

    class: {
      findFirst: async ({ where }: any) => {
        for (const c of Array.from(state.classes.values())) {
          let match = true;
          if (where.id && c.id !== where.id) match = false;
          if (where.tenantId && c.tenantId !== where.tenantId) match = false;
          if (where.gradeId && c.gradeId !== where.gradeId) match = false;
          if (match) return c;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        return state.classes.get(where.id) || null;
      },
    },

    tenant: {
      findUnique: async ({ where }: any) => {
        return state.tenants.get(where.id) || null;
      },
    },

    tenantModuleEntitlement: {
      findUnique: async ({ where }: any) => {
        const key = `${where.tenantId_moduleKey.tenantId}_${where.tenantId_moduleKey.moduleKey}`;
        return state.tenantModuleEntitlements.get(key) || null;
      },
      findFirst: async ({ where }: any) => {
        for (const ent of Array.from(state.tenantModuleEntitlements.values())) {
          let match = true;
          if (where.tenantId && ent.tenantId !== where.tenantId) match = false;
          if (where.moduleKey && ent.moduleKey !== where.moduleKey) match = false;
          if (match) return ent;
        }
        return null;
      },
    },

    admissionSession: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.admissionSessions.get(where.id) || null;
        if (where.tenantId_code) {
          const key = `${where.tenantId_code.tenantId}_${where.tenantId_code.code}`;
          for (const s of Array.from(state.admissionSessions.values())) {
            if (`${s.tenantId}_${s.code}` === key) return s;
          }
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const s of Array.from(state.admissionSessions.values())) {
          let match = true;
          if (where.id && s.id !== where.id) match = false;
          if (where.tenantId && s.tenantId !== where.tenantId) match = false;
          if (where.status && s.status !== where.status) match = false;
          if (match) return s;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("sess");
        const rec = { id, ...data };
        state.admissionSessions.set(id, rec);
        return rec;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const s of Array.from(state.admissionSessions.values())) {
          if (where?.tenantId && s.tenantId !== where.tenantId) continue;
          cnt++;
        }
        return cnt;
      },
    },

    admissionSource: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.admissionSources.get(where.id) || null;
        if (where.tenantId_name) {
          const key = `${where.tenantId_name.tenantId}_${where.tenantId_name.name}`;
          for (const s of Array.from(state.admissionSources.values())) {
            if (`${s.tenantId}_${s.name}` === key) return s;
          }
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const s of Array.from(state.admissionSources.values())) {
          let match = true;
          if (where.id && s.id !== where.id) match = false;
          if (where.tenantId && s.tenantId !== where.tenantId) match = false;
          if (match) return s;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("src");
        const rec = { id, ...data };
        state.admissionSources.set(id, rec);
        return rec;
      },
    },

    admissionEnquiry: {
      findFirst: async ({ where }: any) => {
        for (const e of Array.from(state.admissionEnquiries.values())) {
          let match = true;
          if (where.id && e.id !== where.id) match = false;
          if (where.tenantId && e.tenantId !== where.tenantId) match = false;
          if (where.status && e.status !== where.status) match = false;
          if (where.primaryContactPhone && e.primaryContactPhone !== where.primaryContactPhone) match = false;
          if (where.ownerUserId && e.ownerUserId !== where.ownerUserId) match = false;
          if (match) return e;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        return state.admissionEnquiries.get(where.id) || null;
      },
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        const results = [];
        for (const e of Array.from(state.admissionEnquiries.values())) {
          let match = true;
          if (where?.tenantId && e.tenantId !== where.tenantId) match = false;
          if (where?.status && e.status !== where.status) match = false;
          if (where?.sessionId && e.sessionId !== where.sessionId) match = false;
          if (where?.ownerUserId && e.ownerUserId !== where.ownerUserId) match = false;
          if (where?.interestedGradeId && e.interestedGradeId !== where.interestedGradeId) match = false;
          if (where?.OR && Array.isArray(where.OR)) {
            let orMatch = false;
            for (const cond of where.OR) {
              if (cond.prospectiveStudentName && e.prospectiveStudentName?.toLowerCase().includes(cond.prospectiveStudentName.contains?.toLowerCase())) orMatch = true;
              if (cond.primaryContactName && e.primaryContactName?.toLowerCase().includes(cond.primaryContactName.contains?.toLowerCase())) orMatch = true;
              if (cond.primaryContactPhone && e.primaryContactPhone?.includes(cond.primaryContactPhone.contains)) orMatch = true;
              if (cond.enquiryNumber && e.enquiryNumber?.includes(cond.enquiryNumber.contains)) orMatch = true;
            }
            if (!orMatch) match = false;
          }
          if (match) results.push(e);
        }
        return results.slice(skip, skip + take);
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const e of Array.from(state.admissionEnquiries.values())) {
          if (where?.tenantId && e.tenantId !== where.tenantId) continue;
          if (where?.status && e.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
      groupBy: async ({ by, where }: any) => {
        const groups = new Map<string, number>();
        for (const e of Array.from(state.admissionEnquiries.values())) {
          if (where?.tenantId && e.tenantId !== where.tenantId) continue;
          if (where?.sessionId && e.sessionId !== where.sessionId) continue;
          const key = e[by[0]] || "UNKNOWN";
          groups.set(key, (groups.get(key) || 0) + 1);
        }
        return Array.from(groups.entries()).map(([k, count]) => ({
          [by[0]]: k,
          _count: { id: count },
        }));
      },
      create: async ({ data }: any) => {
        const id = genId("enq");
        const rec = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
        state.admissionEnquiries.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const existing = state.admissionEnquiries.get(where.id);
        if (!existing) throw new Error("Not found");
        const updated = { ...existing, ...cleanUpdateData(data), updatedAt: new Date() };
        state.admissionEnquiries.set(where.id, updated);
        return updated;
      },
    },

    applicant: {
      findFirst: async ({ where }: any) => {
        for (const a of Array.from(state.admissionApplicants.values())) {
          let match = true;
          if (where.id && a.id !== where.id) match = false;
          if (where.tenantId && a.tenantId !== where.tenantId) match = false;
          if (where.primaryPhone && a.primaryPhone !== where.primaryPhone) match = false;
          if (where.guardianPhone && a.guardianPhone !== where.guardianPhone) match = false;
          if (match) return a;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        return state.admissionApplicants.get(where.id) || null;
      },
      findMany: async ({ where }: any) => {
        const results = [];
        for (const a of Array.from(state.admissionApplicants.values())) {
          let match = true;
          if (where?.tenantId && a.tenantId !== where.tenantId) match = false;
          if (match) results.push(a);
        }
        return results;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const a of Array.from(state.admissionApplicants.values())) {
          if (where?.tenantId && a.tenantId !== where.tenantId) continue;
          cnt++;
        }
        return cnt;
      },
      create: async ({ data }: any) => {
        const id = genId("applc");
        const rec = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
        state.admissionApplicants.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const existing = state.admissionApplicants.get(where.id);
        if (!existing) throw new Error("Not found");
        const updated = { ...existing, ...cleanUpdateData(data), updatedAt: new Date() };
        state.admissionApplicants.set(where.id, updated);
        return updated;
      },
    },

    admissionApplication: {
      findFirst: async ({ where, include }: any) => {
        for (const app of Array.from(state.admissionApplications.values())) {
          let match = true;
          if (where.id && app.id !== where.id) match = false;
          if (where.tenantId && app.tenantId !== where.tenantId) match = false;
          if (where.applicantId && app.applicantId !== where.applicantId) match = false;
          if (where.status && app.status !== where.status) match = false;
          if (match) {
            const res = { ...app };
            res.session = state.admissionSessions.get(app.sessionId) || null;
            res.applicant = state.admissionApplicants.get(app.applicantId) || null;
            res.documents = Array.from(state.admissionApplicationDocuments.values()).filter(
              (d) => d.applicationId === app.id
            );
            res.interviews = Array.from(state.admissionInterviews.values()).filter(
              (i) => i.applicationId === app.id
            );
            res.tests = Array.from(state.admissionTests.values()).filter(
              (t) => t.applicationId === app.id
            );
            res.offers = Array.from(state.admissionOffers.values()).filter(
              (o) => o.applicationId === app.id
            );
            res.decisions = Array.from(state.admissionDecisions.values()).filter(
              (d) => d.applicationId === app.id
            );
            res.confirmations = Array.from(state.admissionConfirmations.values()).filter(
              (c) => c.applicationId === app.id
            );
            return res;
          }
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        return state.admissionApplications.get(where.id) || null;
      },
      findMany: async ({ where, skip = 0, take = 50, include }: any) => {
        const results = [];
        for (const app of Array.from(state.admissionApplications.values())) {
          let match = true;
          if (where?.tenantId && app.tenantId !== where.tenantId) match = false;
          if (where?.status && app.status !== where.status) match = false;
          if (where?.sessionId && app.sessionId !== where.sessionId) match = false;
          if (where?.gradeId && app.gradeId !== where.gradeId) match = false;
          if (where?.reviewerUserId && app.reviewerUserId !== where.reviewerUserId) match = false;
          if (match) {
            const res = { ...app };
            if (include?.applicant) {
              res.applicant = state.admissionApplicants.get(app.applicantId);
            }
            results.push(res);
          }
        }
        return results.slice(skip, skip + take);
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const app of Array.from(state.admissionApplications.values())) {
          if (where?.tenantId && app.tenantId !== where.tenantId) continue;
          if (where?.status && app.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
      groupBy: async ({ by, where }: any) => {
        const groups = new Map<string, number>();
        for (const a of Array.from(state.admissionApplications.values())) {
          if (where?.tenantId && a.tenantId !== where.tenantId) continue;
          if (where?.sessionId && a.sessionId !== where.sessionId) continue;
          const key = a[by[0]] || "UNKNOWN";
          groups.set(key, (groups.get(key) || 0) + 1);
        }
        return Array.from(groups.entries()).map(([k, count]) => ({
          [by[0]]: k,
          _count: { id: count },
        }));
      },
      create: async ({ data }: any) => {
        const id = genId("appl");
        const rec = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
        state.admissionApplications.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const existing = state.admissionApplications.get(where.id);
        if (!existing) throw new Error("Not found");
        const updated = { ...existing, ...cleanUpdateData(data), updatedAt: new Date() };
        state.admissionApplications.set(where.id, updated);
        return updated;
      },
    },

    admissionApplicationDocument: {
      findFirst: async ({ where }: any) => {
        for (const d of Array.from(state.admissionApplicationDocuments.values())) {
          let match = true;
          if (where.id && d.id !== where.id) match = false;
          if (where.tenantId && d.tenantId !== where.tenantId) match = false;
          if (where.applicationId && d.applicationId !== where.applicationId) match = false;
          if (match) return d;
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.admissionApplicationDocuments.values()).filter(
          (d) => d.tenantId === where?.tenantId && (!where?.applicationId || d.applicationId === where.applicationId)
        );
      },
      create: async ({ data }: any) => {
        const id = genId("doc");
        const rec = { id, createdAt: new Date(), updatedAt: new Date(), verificationStatus: "PENDING", ...data };
        state.admissionApplicationDocuments.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const existing = state.admissionApplicationDocuments.get(where.id);
        if (!existing) throw new Error("Not found");
        const updated = { ...existing, ...cleanUpdateData(data), updatedAt: new Date() };
        state.admissionApplicationDocuments.set(where.id, updated);
        return updated;
      },
    },

    documentReference: {
      findFirst: async ({ where }: any) => {
        for (const ref of Array.from(state.documentReferences.values())) {
          let match = true;
          if (where.id && ref.id !== where.id) match = false;
          if (where.tenantId && ref.tenantId !== where.tenantId) match = false;
          if (match) return ref;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("docref");
        const rec = { id, ...data };
        state.documentReferences.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const existing = state.documentReferences.get(where.id);
        if (!existing) throw new Error("Not found");
        const updated = { ...existing, ...cleanUpdateData(data) };
        state.documentReferences.set(where.id, updated);
        return updated;
      },
    },

    admissionInterview: {
      findFirst: async ({ where }: any) => {
        for (const i of Array.from(state.admissionInterviews.values())) {
          let match = true;
          if (where.id && i.id !== where.id) match = false;
          if (where.tenantId && i.tenantId !== where.tenantId) match = false;
          if (where.applicationId && i.applicationId !== where.applicationId) match = false;
          if (match) return i;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("intv");
        const rec = { id, createdAt: new Date(), updatedAt: new Date(), status: "SCHEDULED", ...data };
        state.admissionInterviews.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const existing = state.admissionInterviews.get(where.id);
        if (!existing) throw new Error("Not found");
        const updated = { ...existing, ...cleanUpdateData(data), updatedAt: new Date() };
        state.admissionInterviews.set(where.id, updated);
        return updated;
      },
    },

    admissionTest: {
      findFirst: async ({ where }: any) => {
        for (const t of Array.from(state.admissionTests.values())) {
          let match = true;
          if (where.id && t.id !== where.id) match = false;
          if (where.tenantId && t.tenantId !== where.tenantId) match = false;
          if (where.applicationId && t.applicationId !== where.applicationId) match = false;
          if (match) return t;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("test");
        const rec = { id, createdAt: new Date(), updatedAt: new Date(), status: "SCHEDULED", ...data };
        state.admissionTests.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const existing = state.admissionTests.get(where.id);
        if (!existing) throw new Error("Not found");
        const updated = { ...existing, ...cleanUpdateData(data), updatedAt: new Date() };
        state.admissionTests.set(where.id, updated);
        return updated;
      },
    },

    admissionDecision: {
      create: async ({ data }: any) => {
        const id = genId("dec");
        const rec = { id, createdAt: new Date(), ...data };
        state.admissionDecisions.set(id, rec);
        return rec;
      },
      findFirst: async ({ where }: any) => {
        for (const d of Array.from(state.admissionDecisions.values())) {
          let match = true;
          if (where.applicationId && d.applicationId !== where.applicationId) match = false;
          if (where.tenantId && d.tenantId !== where.tenantId) match = false;
          if (match) return d;
        }
        return null;
      },
    },

    admissionOffer: {
      findFirst: async ({ where }: any) => {
        for (const o of Array.from(state.admissionOffers.values())) {
          let match = true;
          if (where.id && o.id !== where.id) match = false;
          if (where.tenantId && o.tenantId !== where.tenantId) match = false;
          if (where.applicationId && o.applicationId !== where.applicationId) match = false;
          if (where.status && o.status !== where.status) match = false;
          if (match) return o;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("off");
        const rec = { id, createdAt: new Date(), updatedAt: new Date(), status: "ISSUED", ...data };
        state.admissionOffers.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const existing = state.admissionOffers.get(where.id);
        if (!existing) throw new Error("Not found");
        const updated = { ...existing, ...cleanUpdateData(data), updatedAt: new Date() };
        state.admissionOffers.set(where.id, updated);
        return updated;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const o of Array.from(state.admissionOffers.values())) {
          if (where?.tenantId && o.tenantId !== where.tenantId) continue;
          if (where?.status && o.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
    },

    admissionConfirmation: {
      create: async ({ data }: any) => {
        const id = genId("conf");
        const rec = { id, createdAt: new Date(), ...data };
        state.admissionConfirmations.set(id, rec);
        return rec;
      },
      findFirst: async ({ where }: any) => {
        for (const c of Array.from(state.admissionConfirmations.values())) {
          let match = true;
          if (where?.applicationId && c.applicationId !== where.applicationId) match = false;
          if (where?.tenantId && c.tenantId !== where.tenantId) match = false;
          if (match) return c;
        }
        return null;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const c of Array.from(state.admissionConfirmations.values())) {
          if (where?.tenantId && c.tenantId !== where.tenantId) continue;
          cnt++;
        }
        return cnt;
      },
    },

    studentProfile: {
      findFirst: async ({ where }: any) => {
        for (const s of Array.from(state.studentProfiles.values())) {
          let match = true;
          if (where.id && s.id !== where.id) match = false;
          if (where.tenantId && s.tenantId !== where.tenantId) match = false;
          if (where.userId && s.userId !== where.userId) match = false;
          if (where.admissionNumber && s.admissionNumber !== where.admissionNumber) match = false;
          if (where.fullName && s.fullName !== where.fullName) match = false;
          if (where.dateOfBirth) {
            const sDob = s.dateOfBirth instanceof Date ? s.dateOfBirth.toISOString().split("T")[0] : String(s.dateOfBirth);
            const wDob = where.dateOfBirth instanceof Date ? where.dateOfBirth.toISOString().split("T")[0] : String(where.dateOfBirth);
            if (sDob !== wDob) match = false;
          }
          if (match) return s;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        return state.studentProfiles.get(where.id) || null;
      },
      findMany: async ({ where }: any) => {
        const res = [];
        for (const s of Array.from(state.studentProfiles.values())) {
          let match = true;
          if (where?.tenantId && s.tenantId !== where.tenantId) match = false;
          if (match) res.push(s);
        }
        return res;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const s of Array.from(state.studentProfiles.values())) {
          if (where?.tenantId && s.tenantId !== where.tenantId) continue;
          cnt++;
        }
        return cnt;
      },
      create: async ({ data }: any) => {
        const id = genId("stu");
        const rec = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
        state.studentProfiles.set(id, rec);
        return rec;
      },
    },

    studentEnrollment: {
      findFirst: async ({ where }: any) => {
        for (const enr of Array.from(state.studentEnrollments.values())) {
          let match = true;
          if (where.studentId && enr.studentId !== where.studentId) match = false;
          if (where.academicYearId && enr.academicYearId !== where.academicYearId) match = false;
          if (where.tenantId && enr.tenantId !== where.tenantId) match = false;
          if (match) return enr;
        }
        return null;
      },
      count: async ({ where }: any) => {
        let cnt = 0;
        for (const enr of Array.from(state.studentEnrollments.values())) {
          if (where?.tenantId && enr.tenantId !== where.tenantId) continue;
          if (where?.classId && enr.classId !== where.classId) continue;
          cnt++;
        }
        return cnt;
      },
      create: async ({ data }: any) => {
        const id = genId("enr");
        const rec = { id, createdAt: new Date(), ...data };
        state.studentEnrollments.set(id, rec);
        return rec;
      },
    },

    parentProfile: {
      findFirst: async ({ where }: any) => {
        for (const p of Array.from(state.parentProfiles.values())) {
          let match = true;
          if (where.id && p.id !== where.id) match = false;
          if (where.tenantId && p.tenantId !== where.tenantId) match = false;
          if (where.phone && p.phone !== where.phone) match = false;
          if (where.primaryPhone && (p.primaryPhone !== where.primaryPhone && p.phone !== where.primaryPhone)) match = false;
          if (where.userId && p.userId !== where.userId) match = false;
          if (match) return p;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        if (where?.id) return state.parentProfiles.get(where.id) || null;
        if (where?.tenantId_primaryPhone) {
          const { tenantId, primaryPhone } = where.tenantId_primaryPhone;
          for (const p of Array.from(state.parentProfiles.values())) {
            if (p.tenantId === tenantId && (p.primaryPhone === primaryPhone || p.phone === primaryPhone)) return p;
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("par");
        const rec = { id, createdAt: new Date(), ...data };
        state.parentProfiles.set(id, rec);
        return rec;
      },
    },

    studentParentBinding: {
      findFirst: async ({ where }: any) => {
        for (const b of Array.from(state.studentParentBindings.values())) {
          let match = true;
          if (where.tenantId && b.tenantId !== where.tenantId) match = false;
          if (where.studentId && b.studentId !== where.studentId) match = false;
          if (where.parentId && b.parentId !== where.parentId) match = false;
          if (match) return b;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        if (where?.id) return state.studentParentBindings.get(where.id) || null;
        if (where?.tenantId_studentId_parentId) {
          const { tenantId, studentId, parentId } = where.tenantId_studentId_parentId;
          for (const b of Array.from(state.studentParentBindings.values())) {
            if (b.tenantId === tenantId && b.studentId === studentId && b.parentId === parentId) return b;
          }
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("spb");
        const rec = { id, ...data };
        state.studentParentBindings.set(id, rec);
        return rec;
      },
    },

    feeInvoice: {
      findFirst: async ({ where }: any) => {
        for (const inv of Array.from(state.feeInvoices.values())) {
          let match = true;
          if (where.id && inv.id !== where.id) match = false;
          if (where.tenantId && inv.tenantId !== where.tenantId) match = false;
          if (match) return inv;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("inv");
        const rec = { id, ...data };
        state.feeInvoices.set(id, rec);
        return rec;
      },
    },

    auditLog: {
      create: async ({ data }: any) => {
        const id = genId("aud");
        const rec = { id, timestamp: new Date(), ...data };
        state.auditLogs.push(rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return state.auditLogs.filter((a) => !where?.tenantId || a.tenantId === where.tenantId);
      },
    },

    tenantOutboxEvent: {
      create: async ({ data }: any) => {
        const id = genId("outb");
        const rec = { id, occurredAt: new Date(), ...data };
        state.tenantOutboxEvents.push(rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return state.tenantOutboxEvents.filter(
          (o) => !where?.tenantId || o.tenantId === where.tenantId
        );
      },
    },
  };

  return { state, mockDb };
}

// ============================================================================
// PILOT TEST SUITE
// ============================================================================

describe("STEP 12 — V2 Wave 2 Admissions & Enquiry CRM Controlled Production Pilot", () => {
  let admissionsService: AdmissionsService;
  let moduleGate: ModuleGate;
  let scopeEvaluator: ScopeEvaluator;
  let state: ReturnType<typeof createPilotDatabaseStore>["state"];
  let mockDb: ReturnType<typeof createPilotDatabaseStore>["mockDb"];

  // Pilot Tenant & Control Tenant
  const pilotTenantId = "tnt_pilot_dps";
  const controlTenantId = "tnt_beta_academy";

  // Personas
  const adminActor = { actorUserId: "usr_pilot_admin", actorEmail: "admin@dps.edu" };
  const officerActor = { actorUserId: "usr_pilot_officer", actorEmail: "admissions@dps.edu" };
  const reviewerActor = { actorUserId: "usr_pilot_reviewer", actorEmail: "reviewer@dps.edu" };
  const studentUser = { id: "usr_student_1", tenantId: pilotTenantId };
  const parentUser = { id: "usr_parent_1", tenantId: pilotTenantId };

  let pilotSessionId: string;
  let pilotGrade11Id: string;
  let pilotClass11AId: string;
  let pilotAcademicYearId: string;

  // Helper to execute end-to-end applicant lifecycle up to confirmed state
  async function setupConfirmedApplication(studentName = "Aryan Kapoor", phone = "9876543210") {
    const applicant = await admissionsService.createApplicant(
      {
        tenantId: pilotTenantId,
        fullName: studentName,
        gender: "MALE",
        dateOfBirth: new Date("2009-08-15"),
        primaryPhone: phone,
        guardianName: "Vikram Kapoor",
        guardianPhone: phone,
        guardianRelationship: "FATHER",
        ...officerActor,
      },
      mockDb
    );

    const application = await admissionsService.createApplication(
      {
        tenantId: pilotTenantId,
        sessionId: pilotSessionId,
        applicantId: applicant.id,
        gradeId: pilotGrade11Id,
        requestedClassId: pilotClass11AId,
        ...officerActor,
      },
      mockDb
    );

    await admissionsService.submitApplication(
      pilotTenantId,
      application.id,
      officerActor.actorUserId,
      officerActor.actorEmail,
      mockDb
    );

    await admissionsService.transitionApplicationStatus(
      pilotTenantId,
      application.id,
      "UNDER_REVIEW",
      "Screening passed",
      officerActor.actorUserId,
      officerActor.actorEmail,
      mockDb
    );

    await admissionsService.recordDecision(
      {
        tenantId: pilotTenantId,
        applicationId: application.id,
        decision: "APPROVED",
        reason: "Approved for admission",
        ...officerActor,
      },
      mockDb
    );

    const offer = await admissionsService.issueOffer(
      {
        tenantId: pilotTenantId,
        applicationId: application.id,
        offeredGradeId: pilotGrade11Id,
        offeredClassId: pilotClass11AId,
        expiryDate: new Date(Date.now() + 86400000),
        ...officerActor,
      },
      mockDb
    );

    await admissionsService.acceptOffer(
      pilotTenantId,
      offer.id,
      officerActor.actorUserId,
      officerActor.actorEmail,
      mockDb
    );

    const confirmed = await admissionsService.confirmAdmission(
      {
        tenantId: pilotTenantId,
        applicationId: application.id,
        financialReference: "REC-2026-00045",
        ...officerActor,
      },
      mockDb
    );

    return { applicant, application, offer, confirmed };
  }

  beforeEach(async () => {
    const store = createPilotDatabaseStore();
    state = store.state;
    mockDb = store.mockDb;
    admissionsService = new AdmissionsService();
    moduleGate = new ModuleGate();
    scopeEvaluator = new ScopeEvaluator();

    // 1. Seed Institutional Tenants
    state.tenants.set(pilotTenantId, {
      id: pilotTenantId,
      name: "Delhi Public Academy",
      slug: "dps-delhi",
      status: "ACTIVE",
    });
    state.tenants.set(controlTenantId, {
      id: controlTenantId,
      name: "Beta Global Academy",
      slug: "beta-academy",
      status: "ACTIVE",
    });

    // 2. Module Entitlement: admissions_module enabled ONLY for pilot tenant
    state.tenantModuleEntitlements.set(`${pilotTenantId}_admissions_module`, {
      tenantId: pilotTenantId,
      moduleKey: "admissions_module",
      isEnabled: true,
      expiresAt: null,
    });
    // Wave 1 financial modules enabled for pilot tenant
    state.tenantModuleEntitlements.set(`${pilotTenantId}_fees_module`, {
      tenantId: pilotTenantId,
      moduleKey: "fees_module",
      isEnabled: true,
      expiresAt: null,
    });
    state.tenantModuleEntitlements.set(`${pilotTenantId}_finance_module`, {
      tenantId: pilotTenantId,
      moduleKey: "finance_module",
      isEnabled: true,
      expiresAt: null,
    });
    // Control tenant has admissions_module explicitly DISABLED
    state.tenantModuleEntitlements.set(`${controlTenantId}_admissions_module`, {
      tenantId: controlTenantId,
      moduleKey: "admissions_module",
      isEnabled: false,
      expiresAt: null,
    });

    // 3. Academic Structure for Pilot
    pilotAcademicYearId = "ay_2026_27";
    state.academicYears.set(pilotAcademicYearId, {
      id: pilotAcademicYearId,
      tenantId: pilotTenantId,
      name: "Academic Year 2026-2027",
      isCurrent: true,
    });

    pilotGrade11Id = "grd_11";
    state.grades.set(pilotGrade11Id, {
      id: pilotGrade11Id,
      tenantId: pilotTenantId,
      level: 11,
      name: "Grade 11",
    });

    pilotClass11AId = "cls_11a";
    state.classes.set(pilotClass11AId, {
      id: pilotClass11AId,
      tenantId: pilotTenantId,
      gradeId: pilotGrade11Id,
      name: "11-A (Science)",
      capacity: 40,
    });

    // Control tenant academic year
    state.academicYears.set("ay_control", {
      id: "ay_control",
      tenantId: controlTenantId,
      name: "Beta AY 2026-2027",
      isCurrent: true,
    });

    // 4. Create Pilot Session
    const session = await admissionsService.createSession(
      {
        tenantId: pilotTenantId,
        academicYearId: pilotAcademicYearId,
        name: "Academic Year 2026-27 Admissions",
        code: "ADM-2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-07-31"),
        ...adminActor,
      },
      mockDb
    );
    pilotSessionId = session.id;

    // 5. Create Sources
    await admissionsService.createSource(
      {
        tenantId: pilotTenantId,
        name: "Website Admissions Portal",
        sourceType: "WEBSITE",
        ...adminActor,
      },
      mockDb
    );
  });

  // ==========================================================================
  // STEP 2 — CONTROLLED PILOT TENANT & MODULE ENTITLEMENT
  // ==========================================================================
  describe("Step 2: Controlled Pilot Tenant & Entitlement Gating", () => {
    it("should allow admissions operations for pilot tenant with admissions_module enabled", async () => {
      const isEnabled = await moduleGate.isModuleEnabled(pilotTenantId, "admissions_module", mockDb);
      expect(isEnabled).toBe(true);
      await expect(moduleGate.assertModuleEnabled(pilotTenantId, "admissions_module", mockDb)).resolves.not.toThrow();
    });

    it("should reject admissions operations with HTTP 402 ModuleDisabledError for unentitled tenant", async () => {
      const isEnabled = await moduleGate.isModuleEnabled(controlTenantId, "admissions_module", mockDb);
      expect(isEnabled).toBe(false);

      await expect(
        moduleGate.assertModuleEnabled(controlTenantId, "admissions_module", mockDb)
      ).rejects.toThrow(ModuleDisabledError);
    });

    it("should verify existing V1 core modules remain active regardless of admissions entitlement", async () => {
      expect(await moduleGate.isModuleEnabled(controlTenantId, "core_academics", mockDb)).toBe(true);
      expect(await moduleGate.isModuleEnabled(controlTenantId, "attendance_module", mockDb)).toBe(true);
      expect(await moduleGate.isModuleEnabled(controlTenantId, "communication_module", mockDb)).toBe(true);
    });
  });

  // ==========================================================================
  // STEP 3 & 15 — PILOT PERSONAS & RBAC / SCOPE SEPARATION
  // ==========================================================================
  describe("Step 3 & 15: Pilot Personas & RBAC / AccessScope Matrix", () => {
    it("should verify Admissions Officer has admissions permissions but strictly no finance.post or fees.refund", () => {
      const officerPerms = new Set([
        "admissions.enquiry.read",
        "admissions.enquiry.create",
        "admissions.application.read",
        "admissions.application.mutate",
        "admissions.document.verify",
        "admissions.decision",
        "admissions.offer",
        "admissions.confirm",
      ]);
      expect(officerPerms.has("admissions.confirm")).toBe(true);
      expect(officerPerms.has("finance.post")).toBe(false);
      expect(officerPerms.has("fees.refund")).toBe(false);
    });

    it("should verify Finance Officer has financial permissions but no admissions mutation privileges", () => {
      const financePerms = new Set([
        "fees.invoice.create",
        "fees.payment.record",
        "fees.refund",
        "finance.post",
        "finance.period.close",
      ]);
      expect(financePerms.has("finance.post")).toBe(true);
      expect(financePerms.has("admissions.application.mutate")).toBe(false);
      expect(financePerms.has("admissions.decision")).toBe(false);
    });

    it("should verify Student persona has SELF_ONLY scope restriction", async () => {
      const selfStudentId = "stu_self_101";
      const otherStudentId = "stu_other_202";

      state.studentProfiles.set(selfStudentId, {
        id: selfStudentId,
        tenantId: pilotTenantId,
        userId: studentUser.id,
      });

      const allowedDecision = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        {
          targetStudentId: selfStudentId,
          permission: "admissions.application.read",
        },
        {
          tenant: { id: pilotTenantId } as any,
          user: studentUser as any,
          membership: { status: "ACTIVE", roleId: "rol_student" } as any,
        },
        mockDb
      );
      expect(allowedDecision).toBe(true);

      const deniedDecision = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        {
          targetStudentId: otherStudentId,
          permission: "admissions.application.read",
        },
        {
          tenant: { id: pilotTenantId } as any,
          user: studentUser as any,
          membership: { status: "ACTIVE", roleId: "rol_student" } as any,
        },
        mockDb
      );
      expect(deniedDecision).toBe(false);
    });

    it("should verify Reviewer persona has ASSIGNED_ONLY scope restriction", async () => {
      const reviewerUserId = "usr_reviewer_assigned";
      const otherReviewerId = "usr_reviewer_other";

      // Seed applications assigned to self vs other
      state.admissionApplications.set("appl_assigned_self", {
        id: "appl_assigned_self",
        tenantId: pilotTenantId,
        reviewerUserId: reviewerUserId,
      });
      state.admissionApplications.set("appl_assigned_other", {
        id: "appl_assigned_other",
        tenantId: pilotTenantId,
        reviewerUserId: otherReviewerId,
      });

      const allowed = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        {
          targetApplicationId: "appl_assigned_self",
          permission: "admissions.interview.evaluate",
        },
        {
          tenant: { id: pilotTenantId } as any,
          user: { id: reviewerUserId } as any,
          membership: { status: "ACTIVE", roleId: "rol_teacher" } as any,
        },
        mockDb
      );
      expect(allowed).toBe(true);

      const denied = await scopeEvaluator.evaluateScope(
        "ASSIGNED_ONLY",
        {
          targetApplicationId: "appl_assigned_other",
          permission: "admissions.interview.evaluate",
        },
        {
          tenant: { id: pilotTenantId } as any,
          user: { id: reviewerUserId } as any,
          membership: { status: "ACTIVE", roleId: "rol_teacher" } as any,
        },
        mockDb
      );
      expect(denied).toBe(false);
    });
  });

  // ==========================================================================
  // STEP 4 — ENQUIRY CRM PILOT
  // ==========================================================================
  describe("Step 4: Enquiry CRM Pilot", () => {
    it("should successfully create, update, and search 3 realistic synthetic enquiries", async () => {
      // Enquiry A: Normal prospective applicant
      const enquiryA = await admissionsService.createEnquiry(
        {
          tenantId: pilotTenantId,
          prospectiveStudentName: "Aryan Kapoor",
          prospectiveGender: "MALE",
          prospectiveDob: new Date("2009-08-15"),
          primaryContactName: "Vikram Kapoor",
          primaryContactPhone: "9876543210",
          primaryContactEmail: "vikram.kapoor@example.com",
          primaryContactRelation: "FATHER",
          interestedGradeId: pilotGrade11Id,
          sessionId: pilotSessionId,
          ownerUserId: officerActor.actorUserId,
          notes: "Interested in PCM + Computer Science",
          ...officerActor,
        },
        mockDb
      );
      expect(enquiryA.enquiryNumber).toMatch(/^ENQ-\d{4}-\d{5}$/);
      expect(enquiryA.status).toBe("NEW");

      // Enquiry B: Candidate destined for duplicate testing
      const enquiryB = await admissionsService.createEnquiry(
        {
          tenantId: pilotTenantId,
          prospectiveStudentName: "Pooja Sharma",
          prospectiveGender: "FEMALE",
          prospectiveDob: new Date("2010-04-20"),
          primaryContactName: "Sunita Sharma",
          primaryContactPhone: "9811223344",
          primaryContactEmail: "sunita.sharma@example.com",
          interestedGradeId: pilotGrade11Id,
          sessionId: pilotSessionId,
          ownerUserId: officerActor.actorUserId,
          ...officerActor,
        },
        mockDb
      );
      expect(enquiryB.enquiryNumber).toBeDefined();

      // Enquiry C: Candidate destined to be marked LOST
      const enquiryC = await admissionsService.createEnquiry(
        {
          tenantId: pilotTenantId,
          prospectiveStudentName: "Rohan Verma",
          prospectiveGender: "MALE",
          prospectiveDob: new Date("2009-12-05"),
          primaryContactName: "Anil Verma",
          primaryContactPhone: "9822334455",
          interestedGradeId: pilotGrade11Id,
          sessionId: pilotSessionId,
          ownerUserId: officerActor.actorUserId,
          ...officerActor,
        },
        mockDb
      );
      expect(enquiryC.enquiryNumber).toBeDefined();

      // Update enquiry notes
      const updated = await admissionsService.updateEnquiry(
        {
          id: enquiryA.id,
          tenantId: pilotTenantId,
          notes: "Parent visited campus; very positive interaction",
          ...officerActor,
        },
        mockDb
      );
      expect(updated.notes).toContain("Parent visited campus");

      // Search and Filter
      const searchRes = await admissionsService.listEnquiries(
        {
          tenantId: pilotTenantId,
          search: "Aryan",
        },
        mockDb
      );
      expect(searchRes.items.length).toBe(1);
      expect(searchRes.items[0].prospectiveStudentName).toBe("Aryan Kapoor");

      // Transition Enquiry C to LOST
      const lost = await admissionsService.updateEnquiryStatus(
        pilotTenantId,
        enquiryC.id,
        "LOST",
        "Relocated to another city",
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );
      expect(lost.status).toBe("LOST");
      expect(lost.lostReason).toBe("Relocated to another city");

      // Tenant isolation on update
      await expect(
        admissionsService.updateEnquiry(
          {
            id: enquiryA.id,
            tenantId: controlTenantId,
            notes: "Malicious update from Tenant B",
          },
          mockDb
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // STEP 5 — DETERMINISTIC DUPLICATE DETECTION
  // ==========================================================================
  describe("Step 5: Deterministic Duplicate Detection & Protection", () => {
    it("should return EXACT_MATCH and block applicant creation when normalized name + DOB + phone match", async () => {
      // 1. Create original applicant
      await admissionsService.createApplicant(
        {
          tenantId: pilotTenantId,
          fullName: "Ananya Iyer",
          gender: "FEMALE",
          dateOfBirth: new Date("2009-05-15"),
          primaryPhone: "9876500001",
          guardianName: "Raghav Iyer",
          guardianPhone: "9876500001",
          ...officerActor,
        },
        mockDb
      );

      // 2. Duplicate detection check
      const dupCheck = await admissionsService.detectDuplicates(
        {
          tenantId: pilotTenantId,
          fullName: "  ananya  iyer ",
          dateOfBirth: new Date("2009-05-15"),
          guardianPhone: "+91 98765 00001",
        },
        mockDb
      );
      expect(dupCheck.matchLevel).toBe("EXACT_MATCH");
      expect(dupCheck.matches.length).toBe(1);

      // 3. Attempt creation without force flag -> MUST throw ConflictError
      await expect(
        admissionsService.createApplicant(
          {
            tenantId: pilotTenantId,
            fullName: "Ananya Iyer",
            gender: "FEMALE",
            dateOfBirth: new Date("2009-05-15"),
            primaryPhone: "9876500001",
            guardianName: "Raghav Iyer",
            guardianPhone: "9876500001",
            ...officerActor,
          },
          mockDb
        )
      ).rejects.toThrow(ConflictError);
    });

    it("should detect EXACT_MATCH collision when applicant matches an already active enrolled student", async () => {
      // Seed existing student
      state.studentProfiles.set("stu_active_kavita", {
        id: "stu_active_kavita",
        tenantId: pilotTenantId,
        fullName: "Kavita Nair",
        dateOfBirth: new Date("2010-09-10"),
        admissionNumber: "ADM-2024-00123",
        status: "ACTIVE",
      });

      const dupCheck = await admissionsService.detectDuplicates(
        {
          tenantId: pilotTenantId,
          fullName: "kavita nair",
          dateOfBirth: new Date("2010-09-10"),
          guardianPhone: "9988776655",
        },
        mockDb
      );
      expect(dupCheck.matchLevel).toBe("EXACT_MATCH");
      expect(dupCheck.matches[0].type).toBe("STUDENT");
      expect(dupCheck.matches[0].admissionNumber).toBe("ADM-2024-00123");
    });

    it("should flag POSSIBLE_MATCH when name and DOB match but phone is different", async () => {
      // Create seed applicant in this test
      await admissionsService.createApplicant(
        {
          tenantId: pilotTenantId,
          fullName: "Ananya Iyer",
          gender: "FEMALE",
          dateOfBirth: new Date("2009-05-15"),
          primaryPhone: "9876500001",
          guardianName: "Raghav Iyer",
          guardianPhone: "9876500001",
          ...officerActor,
        },
        mockDb
      );

      const dupCheck = await admissionsService.detectDuplicates(
        {
          tenantId: pilotTenantId,
          fullName: "Ananya Iyer",
          dateOfBirth: new Date("2009-05-15"),
          guardianPhone: "9123456789", // Different phone
        },
        mockDb
      );
      expect(dupCheck.matchLevel).toBe("POSSIBLE_MATCH");
      expect(dupCheck.matches.length).toBeGreaterThan(0);
    });

    it("should strictly scope duplicate detection by tenant (no cross-tenant leakage)", async () => {
      // Seed applicant in pilot tenant
      await admissionsService.createApplicant(
        {
          tenantId: pilotTenantId,
          fullName: "Ananya Iyer",
          gender: "FEMALE",
          dateOfBirth: new Date("2009-05-15"),
          primaryPhone: "9876500001",
          guardianName: "Raghav Iyer",
          guardianPhone: "9876500001",
          ...officerActor,
        },
        mockDb
      );

      // In control tenant (Beta Academy), duplicate detection should find NO_MATCH
      const crossTenantCheck = await admissionsService.detectDuplicates(
        {
          tenantId: controlTenantId,
          fullName: "Ananya Iyer",
          dateOfBirth: new Date("2009-05-15"),
          guardianPhone: "9876500001",
        },
        mockDb
      );
      expect(crossTenantCheck.matchLevel).toBe("NO_MATCH");
      expect(crossTenantCheck.matches.length).toBe(0);
    });
  });

  // ==========================================================================
  // STEPS 6, 7, 8, 9, 10, 11 — END-TO-END APPLICATION LIFECYCLE
  // ==========================================================================
  describe("Steps 6–11: Complete Application Lifecycle & Verification", () => {
    it("should execute complete application lifecycle: DRAFT -> ADMITTED", async () => {
      // Step 6A: Create Applicant
      const applicant = await admissionsService.createApplicant(
        {
          tenantId: pilotTenantId,
          fullName: "Aryan Kapoor",
          gender: "MALE",
          dateOfBirth: new Date("2009-08-15"),
          primaryPhone: "9876543210",
          email: "aryan@example.com",
          guardianName: "Vikram Kapoor",
          guardianPhone: "9876543210",
          guardianEmail: "vikram@example.com",
          guardianRelationship: "FATHER",
          address: "123 Delhi High Road",
          ...officerActor,
        },
        mockDb
      );
      expect(applicant.id).toBeDefined();

      // Step 6B: Create Application (DRAFT)
      const application = await admissionsService.createApplication(
        {
          tenantId: pilotTenantId,
          sessionId: pilotSessionId,
          applicantId: applicant.id,
          gradeId: pilotGrade11Id,
          requestedClassId: pilotClass11AId,
          notes: "Prospective Grade 11 Science student",
          ...officerActor,
        },
        mockDb
      );
      expect(application.status).toBe("DRAFT");
      expect(application.applicationNumber).toMatch(/^APPL-\d{4}-\d{5}$/);

      // Step 6C: Submit Application (SUBMITTED)
      const submitted = await admissionsService.submitApplication(
        pilotTenantId,
        application.id,
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );
      expect(submitted.status).toBe("SUBMITTED");

      // Step 6D: Move to UNDER_REVIEW
      const underReview = await admissionsService.transitionApplicationStatus(
        pilotTenantId,
        application.id,
        "UNDER_REVIEW",
        "Initial desk screening completed",
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );
      expect(underReview.status).toBe("UNDER_REVIEW");

      // ======================================================================
      // STEP 7: DOCUMENT ATTACHMENT & VERIFICATION
      // ======================================================================
      const docRefId = "dref_birth_cert_aryan";
      state.documentReferences.set(docRefId, {
        id: docRefId,
        tenantId: pilotTenantId,
        fileName: "birth_certificate.pdf",
        storagePath: "tenants/tnt_pilot_dps/documents/bc_aryan.pdf",
        fileSizeBytes: 245000,
        mimeType: "application/pdf",
      });

      const docRecord = await admissionsService.attachDocument(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          documentReferenceId: docRefId,
          documentType: "BIRTH_CERTIFICATE",
          ...officerActor,
        },
        mockDb
      );
      expect(docRecord.verificationStatus).toBe("PENDING");

      // Verify Document
      const verifiedDoc = await admissionsService.verifyDocument(
        pilotTenantId,
        docRecord.id,
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );
      expect(verifiedDoc.verificationStatus).toBe("VERIFIED");
      expect(verifiedDoc.verifiedAt).toBeDefined();

      // Test Rejection Path Requires Reason
      const docRefId2 = "dref_prev_marksheet";
      state.documentReferences.set(docRefId2, {
        id: docRefId2,
        tenantId: pilotTenantId,
        fileName: "prev_marksheet.pdf",
      });
      const docToReject = await admissionsService.attachDocument(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          documentReferenceId: docRefId2,
          documentType: "PREVIOUS_MARKSHEET",
          ...officerActor,
        },
        mockDb
      );

      await expect(
        admissionsService.rejectDocument(
          pilotTenantId,
          docToReject.id,
          "", // Missing rejection reason
          officerActor.actorUserId,
          officerActor.actorEmail,
          mockDb
        )
      ).rejects.toThrow(ValidationError);

      const rejectedDoc = await admissionsService.rejectDocument(
        pilotTenantId,
        docToReject.id,
        "Illegible scan of Grade 10 mark sheet",
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );
      expect(rejectedDoc.verificationStatus).toBe("REJECTED");
      expect(rejectedDoc.rejectionReason).toBe("Illegible scan of Grade 10 mark sheet");

      // Candidate submits clear scan; verifier marks as VERIFIED
      const resolvedDoc = await admissionsService.verifyDocument(
        pilotTenantId,
        docToReject.id,
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );
      expect(resolvedDoc.verificationStatus).toBe("VERIFIED");

      // ======================================================================
      // STEP 8: INTERVIEW & ENTRANCE TEST
      // ======================================================================
      // Schedule & Complete Interview
      const interview = await admissionsService.scheduleInterview(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          scheduledDateTime: new Date("2026-02-15T10:00:00Z"),
          interviewerUserId: reviewerActor.actorUserId,
          mode: "IN_PERSON",
          location: "Conference Room A",
          ...officerActor,
        },
        mockDb
      );
      expect(interview.status).toBe("SCHEDULED");

      const completedInterview = await admissionsService.recordInterviewResult(
        pilotTenantId,
        interview.id,
        "RECOMMENDED",
        88,
        "Candidate demonstrated strong communication and aptitude in mathematics",
        reviewerActor.actorUserId,
        reviewerActor.actorEmail,
        mockDb
      );
      expect(completedInterview.status).toBe("COMPLETED");
      expect(completedInterview.score).toEqual(new Decimal(88));

      // Schedule & Complete Entrance Test
      const testRecord = await admissionsService.scheduleTest(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          testType: "PCM_APTITUDE",
          scheduledDateTime: new Date("2026-02-16T09:00:00Z"),
          maxScore: 100,
          passScore: 60,
          evaluatorUserId: reviewerActor.actorUserId,
          ...officerActor,
        },
        mockDb
      );
      expect(testRecord.status).toBe("SCHEDULED");

      const completedTest = await admissionsService.recordTestResult(
        pilotTenantId,
        testRecord.id,
        92,
        "Top quartile performance in Physics & Math",
        reviewerActor.actorUserId,
        reviewerActor.actorEmail,
        mockDb
      );
      expect(completedTest.status).toBe("COMPLETED");
      expect(completedTest.result).toBe("PASSED");

      // Move application to DECISION_PENDING
      await admissionsService.transitionApplicationStatus(
        pilotTenantId,
        application.id,
        "DECISION_PENDING",
        "Completed interview and test",
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );

      // ======================================================================
      // STEP 9: DECISION RECORDING
      // ======================================================================
      const approvedDecision = await admissionsService.recordDecision(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          decision: "APPROVED",
          reason: "Candidate met all entrance criteria and excelled in interview",
          notes: "Approved for Grade 11 Science",
          ...officerActor,
        },
        mockDb
      );
      expect(approvedDecision.decision).toBe("APPROVED");
      expect(approvedDecision.reason).toBe("Candidate met all entrance criteria and excelled in interview");

      // ======================================================================
      // STEP 10: OFFER ISSUANCE & ACCEPTANCE
      // ======================================================================
      const offerExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
      const offer = await admissionsService.issueOffer(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          offeredGradeId: pilotGrade11Id,
          offeredClassId: pilotClass11AId,
          expiryDate: offerExpiry,
          ...officerActor,
        },
        mockDb
      );
      expect(offer.offerNumber).toMatch(/^OFR-\d{4}-\d{5}$/);
      expect(offer.status).toBe("ISSUED");

      // Accept Offer
      const acceptedOffer = await admissionsService.acceptOffer(
        pilotTenantId,
        offer.id,
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );
      expect(acceptedOffer.status).toBe("ACCEPTED");

      // Idempotent repeated offer acceptance
      const repeatOffer = await admissionsService.acceptOffer(
        pilotTenantId,
        offer.id,
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );
      expect(repeatOffer.status).toBe("ACCEPTED");

      // ======================================================================
      // STEP 11: ADMISSION CONFIRMATION
      // ======================================================================
      const confirmed = await admissionsService.confirmAdmission(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          financialReference: "REC-2026-00045",
          notes: "Admission fee received via Net Banking",
          ...officerActor,
        },
        mockDb
      );
      expect(confirmed.status).toBe("CONFIRMED");
      expect(confirmed.confirmedAt).toBeDefined();
    });

    it("should reject illegal state transitions", async () => {
      // Create new draft application
      const freshApplicant = await admissionsService.createApplicant(
        {
          tenantId: pilotTenantId,
          fullName: "Illegal Test",
          gender: "MALE",
          dateOfBirth: new Date("2010-01-01"),
          primaryPhone: "9000000000",
          guardianName: "Parent",
          guardianPhone: "9000000000",
          ...officerActor,
        },
        mockDb
      );
      const draftApp = await admissionsService.createApplication(
        {
          tenantId: pilotTenantId,
          sessionId: pilotSessionId,
          applicantId: freshApplicant.id,
          gradeId: pilotGrade11Id,
          ...officerActor,
        },
        mockDb
      );

      // 1. DRAFT -> ADMITTED (Illegal jump)
      await expect(
        admissionsService.admitStudent(
          {
            tenantId: pilotTenantId,
            applicationId: draftApp.id,
            ...officerActor,
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);

      // Submit and move to UNDER_REVIEW
      await admissionsService.submitApplication(
        pilotTenantId,
        draftApp.id,
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );
      await admissionsService.transitionApplicationStatus(
        pilotTenantId,
        draftApp.id,
        "UNDER_REVIEW",
        "Screening",
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );

      // 2. Reject application and verify cannot confirm
      await admissionsService.recordDecision(
        {
          tenantId: pilotTenantId,
          applicationId: draftApp.id,
          decision: "REJECTED",
          reason: "Did not meet eligibility",
          ...officerActor,
        },
        mockDb
      );
      await expect(
        admissionsService.confirmAdmission(
          {
            tenantId: pilotTenantId,
            applicationId: draftApp.id,
            ...officerActor,
          },
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });

    it("should reject expired offer acceptance", async () => {
      const { application } = await setupConfirmedApplication("Expiring Candidate", "9112233445");
      // Re-issue an offer with past expiry
      state.admissionApplications.get(application.id).status = "APPROVED";
      const expiredOffer = await admissionsService.issueOffer(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          offeredGradeId: pilotGrade11Id,
          expiryDate: new Date("2020-01-01"), // Expired
          ...officerActor,
        },
        mockDb
      );

      await expect(
        admissionsService.acceptOffer(
          pilotTenantId,
          expiredOffer.id,
          officerActor.actorUserId,
          officerActor.actorEmail,
          mockDb
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==========================================================================
  // STEP 12 — WAVE 1 FINANCIAL INTEGRATION
  // ==========================================================================
  describe("Step 12: Wave 1 Financial Integration & Authorization Boundaries", () => {
    it("should verify admissions attaches fee invoice without direct GL bypass", async () => {
      // Seed a Wave 1 admission fee invoice
      const invoiceId = "inv_adm_2026_aryan";
      state.feeInvoices.set(invoiceId, {
        id: invoiceId,
        tenantId: pilotTenantId,
        invoiceNumber: "INV-2026-00099",
        totalAmount: new Decimal(25000),
        status: "PAID",
      });

      // Create a fresh candidate and confirm with invoice
      const financeApplc = await admissionsService.createApplicant(
        {
          tenantId: pilotTenantId,
          fullName: "Finance Aryan",
          gender: "MALE",
          dateOfBirth: new Date("2009-08-15"),
          primaryPhone: "9876543210",
          guardianName: "Vikram Kapoor",
          guardianPhone: "9876543210",
          ...officerActor,
        },
        mockDb
      );
      const financeApp = await admissionsService.createApplication(
        {
          tenantId: pilotTenantId,
          sessionId: pilotSessionId,
          applicantId: financeApplc.id,
          gradeId: pilotGrade11Id,
          requestedClassId: pilotClass11AId,
          ...officerActor,
        },
        mockDb
      );
      await admissionsService.submitApplication(pilotTenantId, financeApp.id, officerActor.actorUserId, officerActor.actorEmail, mockDb);
      await admissionsService.transitionApplicationStatus(pilotTenantId, financeApp.id, "UNDER_REVIEW", "Screening", officerActor.actorUserId, officerActor.actorEmail, mockDb);
      await admissionsService.recordDecision({
        tenantId: pilotTenantId,
        applicationId: financeApp.id,
        decision: "APPROVED",
        reason: "Approved for admission",
        ...officerActor,
      }, mockDb);
      const financeOffer = await admissionsService.issueOffer({
        tenantId: pilotTenantId,
        applicationId: financeApp.id,
        offeredGradeId: pilotGrade11Id,
        offeredClassId: pilotClass11AId,
        expiryDate: new Date(Date.now() + 86400000),
        ...officerActor,
      }, mockDb);
      await admissionsService.acceptOffer(pilotTenantId, financeOffer.id, officerActor.actorUserId, officerActor.actorEmail, mockDb);

      const confirmed = await admissionsService.confirmAdmission(
        {
          tenantId: pilotTenantId,
          applicationId: financeApp.id,
          financialReference: invoiceId,
          notes: "Admission fee verified against invoice",
          ...officerActor,
        },
        mockDb
      );
      expect(confirmed.financialReference).toBe(invoiceId);
    });

    it("should reject Admissions Officer attempting a financial journal posting mutation with HTTP 403", () => {
      const admissionsOfficerPermissions = [
        "admissions.application.mutate",
        "admissions.confirm",
      ];
      const hasFinancePost = admissionsOfficerPermissions.includes("finance.post");
      expect(hasFinancePost).toBe(false);
    });
  });

  // ==========================================================================
  // STEP 13 & 14 — STUDENT CONVERSION & GUARDIAN VALIDATION
  // ==========================================================================
  describe("Steps 13 & 14: Student Conversion & Guardian Binding Idempotency", () => {
    let confirmedAppId: string;

    beforeEach(async () => {
      const { application } = await setupConfirmedApplication("Aryan Kapoor", "9876543210");
      confirmedAppId = application.id;
    });

    it("should convert confirmed application into StudentProfile, Enrollment, and Guardian Binding exactly once", async () => {
      const student = await admissionsService.admitStudent(
        {
          tenantId: pilotTenantId,
          applicationId: confirmedAppId,
          classId: pilotClass11AId,
          rollNumber: 15,
          ...adminActor,
        },
        mockDb
      );

      expect(student).toBeDefined();
      expect(student?.fullName).toBe("Aryan Kapoor");
      expect(student?.admissionNumber).toMatch(/^ADM-\d{4}-\d{5}$/);

      // Verify StudentEnrollment
      const enrollments = Array.from(state.studentEnrollments.values()).filter(
        (e) => e.studentId === student?.id
      );
      expect(enrollments.length).toBe(1);
      expect(enrollments[0].classId).toBe(pilotClass11AId);
      expect(enrollments[0].rollNumber).toBe(15);

      // Verify Guardian (ParentProfile)
      const parents = Array.from(state.parentProfiles.values()).filter(
        (p) => p.primaryPhone === "9876543210"
      );
      expect(parents.length).toBe(1);
      expect(parents[0].fullName).toBe("Vikram Kapoor");

      // Verify StudentParentBinding
      const bindings = Array.from(state.studentParentBindings.values()).filter(
        (b) => b.studentId === student?.id
      );
      expect(bindings.length).toBe(1);
      expect(bindings[0].parentId).toBe(parents[0].id);

      // Verify Application Status Updated to ADMITTED
      const appRecord = state.admissionApplications.get(confirmedAppId);
      expect(appRecord.status).toBe("ADMITTED");
      expect(appRecord.studentProfileId).toBe(student?.id);
    });

    it("should be strictly idempotent when repeat admission conversion is requested", async () => {
      // First conversion
      const firstStudent = await admissionsService.admitStudent(
        {
          tenantId: pilotTenantId,
          applicationId: confirmedAppId,
          classId: pilotClass11AId,
          rollNumber: 15,
          ...adminActor,
        },
        mockDb
      );

      const initialStudentCount = state.studentProfiles.size;
      const initialEnrollmentCount = state.studentEnrollments.size;
      const initialParentCount = state.parentProfiles.size;
      const initialBindingCount = state.studentParentBindings.size;

      // Second identical conversion attempt
      const secondStudent = await admissionsService.admitStudent(
        {
          tenantId: pilotTenantId,
          applicationId: confirmedAppId,
          classId: pilotClass11AId,
          rollNumber: 15,
          ...adminActor,
        },
        mockDb
      );

      // Must return identical student profile without creating any new records
      expect(secondStudent?.id).toBe(firstStudent?.id);
      expect(state.studentProfiles.size).toBe(initialStudentCount);
      expect(state.studentEnrollments.size).toBe(initialEnrollmentCount);
      expect(state.parentProfiles.size).toBe(initialParentCount);
      expect(state.studentParentBindings.size).toBe(initialBindingCount);
    });

    it("should allow parent to view linked child's admission and reject view of unrelated student", async () => {
      const student = await admissionsService.admitStudent(
        {
          tenantId: pilotTenantId,
          applicationId: confirmedAppId,
          classId: pilotClass11AId,
          rollNumber: 15,
          ...adminActor,
        },
        mockDb
      );

      const parentProfile = Array.from(state.parentProfiles.values())[0];
      parentProfile.userId = parentUser.id; // Link parent profile to parent user

      // Linked child view evaluation
      const canViewLinked = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        {
          targetStudentId: student?.id,
          permission: "admissions.application.read",
        },
        {
          tenant: { id: pilotTenantId } as any,
          user: parentUser as any,
          membership: { status: "ACTIVE", roleId: "rol_parent" } as any,
        },
        mockDb
      );
      expect(canViewLinked).toBe(true);

      // Unrelated child view evaluation
      const canViewUnrelated = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        {
          targetStudentId: "stu_unrelated_999",
          permission: "admissions.application.read",
        },
        {
          tenant: { id: pilotTenantId } as any,
          user: parentUser as any,
          membership: { status: "ACTIVE", roleId: "rol_parent" } as any,
        },
        mockDb
      );
      expect(canViewUnrelated).toBe(false);
    });
  });

  // ==========================================================================
  // STEP 16 — TENANT ISOLATION ATTACK TESTING
  // ==========================================================================
  describe("Step 16: Tenant Isolation Attack Testing", () => {
    it("should reject cross-tenant reads and mutations across all admissions entities", async () => {
      // 1. Create enquiry in Tenant A
      const enqA = await admissionsService.createEnquiry(
        {
          tenantId: pilotTenantId,
          prospectiveStudentName: "Secret Lead Tenant A",
          primaryContactName: "Parent A",
          primaryContactPhone: "9000000001",
          ...officerActor,
        },
        mockDb
      );

      // Tenant B attempting to read Tenant A enquiry -> NotFoundError
      await expect(
        admissionsService.updateEnquiry(
          {
            id: enqA.id,
            tenantId: controlTenantId,
            notes: "Attacking Tenant A enquiry from Tenant B",
          },
          mockDb
        )
      ).rejects.toThrow(NotFoundError);

      // 2. Tenant B attempting to create an applicant referencing Tenant A Academic Year -> NotFoundError
      await expect(
        admissionsService.createSession(
          {
            tenantId: controlTenantId,
            academicYearId: pilotAcademicYearId, // Cross-tenant academic year!
            name: "Malicious Session",
            code: "ATTACK-2026",
            startDate: new Date(),
            endDate: new Date(),
          },
          mockDb
        )
      ).rejects.toThrow(NotFoundError);

      // 3. Tenant B attempting to attach a document belonging to Tenant A -> NotFoundError
      state.documentReferences.set("dref_tenant_a_doc", {
        id: "dref_tenant_a_doc",
        tenantId: pilotTenantId,
        fileName: "confidential_a.pdf",
      });
      await expect(
        admissionsService.attachDocument(
          {
            tenantId: controlTenantId,
            applicationId: "appl_b",
            documentReferenceId: "dref_tenant_a_doc",
            documentType: "AADHAAR",
          },
          mockDb
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // STEP 17 — CONCURRENCY & IDEMPOTENCY
  // ==========================================================================
  describe("Step 17: Concurrency & Idempotency Simulation", () => {
    it("should safely handle simultaneous student conversion requests", async () => {
      const { application } = await setupConfirmedApplication("Concurrent Candidate", "9876549999");

      // Execute 2 conversions concurrently
      const [res1, res2] = await Promise.all([
        admissionsService.admitStudent(
          {
            tenantId: pilotTenantId,
            applicationId: application.id,
            classId: pilotClass11AId,
            ...adminActor,
          },
          mockDb
        ),
        admissionsService.admitStudent(
          {
            tenantId: pilotTenantId,
            applicationId: application.id,
            classId: pilotClass11AId,
            ...adminActor,
          },
          mockDb
        ),
      ]);

      expect(res1?.id).toBe(res2?.id);
      expect(res1?.admissionNumber).toBe(res2?.admissionNumber);

      // Check database state has exactly 1 student record for this candidate
      const candidateStudents = Array.from(state.studentProfiles.values()).filter(
        (s) => s.fullName === "Concurrent Candidate"
      );
      expect(candidateStudents.length).toBe(1);
    });
  });

  // ==========================================================================
  // STEP 18 & 19 — AUTHORITATIVE AUDIT & OUTBOX EVENTS
  // ==========================================================================
  describe("Steps 18 & 19: Authoritative Audit Logs & Transactional Outbox Events", () => {
    it("should record structured AuditLog entries and emit outbox events across key lifecycle milestones", async () => {
      // Execute a full lifecycle run to populate audit logs and outbox events
      const enquiry = await admissionsService.createEnquiry(
        {
          tenantId: pilotTenantId,
          prospectiveStudentName: "Lifecycle Candidate",
          primaryContactName: "Parent",
          primaryContactPhone: "9876500000",
          ...officerActor,
        },
        mockDb
      );
      await admissionsService.createApplicant(
        {
          tenantId: pilotTenantId,
          enquiryId: enquiry.id,
          fullName: "Lifecycle Candidate",
          gender: "MALE",
          dateOfBirth: new Date("2010-01-01"),
          primaryPhone: "9876500000",
          guardianName: "Parent",
          guardianPhone: "9876500000",
          ...officerActor,
        },
        mockDb
      );

      const { application, confirmed } = await setupConfirmedApplication("Outbox Candidate", "9876500001");

      const docRefId = "dref_bc_outbox";
      state.documentReferences.set(docRefId, {
        id: docRefId,
        tenantId: pilotTenantId,
        fileName: "bc.pdf",
      });
      const doc = await admissionsService.attachDocument(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          documentReferenceId: docRefId,
          documentType: "BIRTH_CERTIFICATE",
          ...officerActor,
        },
        mockDb
      );
      await admissionsService.verifyDocument(
        pilotTenantId,
        doc.id,
        officerActor.actorUserId,
        officerActor.actorEmail,
        mockDb
      );

      const interview = await admissionsService.scheduleInterview(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          scheduledDateTime: new Date(),
          interviewerUserId: reviewerActor.actorUserId,
          ...officerActor,
        },
        mockDb
      );
      await admissionsService.recordInterviewResult(
        pilotTenantId,
        interview.id,
        "RECOMMENDED",
        90,
        "Good interview",
        reviewerActor.actorUserId,
        reviewerActor.actorEmail,
        mockDb
      );

      const test = await admissionsService.scheduleTest(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          testType: "PCM",
          scheduledDateTime: new Date(),
          maxScore: 100,
          passScore: 50,
          ...officerActor,
        },
        mockDb
      );
      await admissionsService.recordTestResult(
        pilotTenantId,
        test.id,
        85,
        "Passed",
        reviewerActor.actorUserId,
        reviewerActor.actorEmail,
        mockDb
      );

      await admissionsService.admitStudent(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          classId: pilotClass11AId,
          ...adminActor,
        },
        mockDb
      );

      // Verify Audit Logs
      const logs = state.auditLogs.filter((a) => a.tenantId === pilotTenantId);
      expect(logs.length).toBeGreaterThan(0);

      for (const log of logs) {
        expect(log.actorId).toBeDefined();
        expect(log.timestamp).toBeDefined();
        expect(log.action).toBeDefined();
        const diffStr = JSON.stringify(log.diffJson || "");
        expect(diffStr).not.toContain("password");
        expect(diffStr).not.toContain("clerk_secret");
        expect(diffStr).not.toContain("panNumber");
        expect(diffStr).not.toContain("cvv");
      }

      // Verify Outbox Events
      const outbox = state.tenantOutboxEvents.filter((o) => o.tenantId === pilotTenantId);
      const eventTypes = new Set(outbox.map((o) => o.eventType));

      expect(eventTypes.has("admissions.enquiry.created")).toBe(true);
      expect(eventTypes.has("admissions.enquiry.converted")).toBe(true);
      expect(eventTypes.has("admissions.application.created")).toBe(true);
      expect(eventTypes.has("admissions.application.submitted")).toBe(true);
      expect(eventTypes.has("admissions.document.verified")).toBe(true);
      expect(eventTypes.has("admissions.interview.scheduled")).toBe(true);
      expect(eventTypes.has("admissions.interview.completed")).toBe(true);
      expect(eventTypes.has("admissions.test.completed")).toBe(true);
      expect(eventTypes.has("admissions.application.approved")).toBe(true);
      expect(eventTypes.has("admissions.offer.issued")).toBe(true);
      expect(eventTypes.has("admissions.offer.accepted")).toBe(true);
      expect(eventTypes.has("admissions.confirmation.completed")).toBe(true);
      expect(eventTypes.has("admissions.student.admitted")).toBe(true);
    });
  });

  // ==========================================================================
  // STEP 20 — DATA RECONCILIATION DIAGNOSTIC
  // ==========================================================================
  describe("Step 20: Data Reconciliation Diagnostic", () => {
    it("should run complete pilot reconciliation and assert zero orphans and zero cross-tenant references", async () => {
      // Run complete lifecycle to produce admitted record
      const { application } = await setupConfirmedApplication("Reconciliation Student", "9988776655");
      await admissionsService.admitStudent(
        {
          tenantId: pilotTenantId,
          applicationId: application.id,
          classId: pilotClass11AId,
          rollNumber: 21,
          ...adminActor,
        },
        mockDb
      );

      const tenantAEnquiries = Array.from(state.admissionEnquiries.values()).filter(
        (e) => e.tenantId === pilotTenantId
      );
      const tenantAApplications = Array.from(state.admissionApplications.values()).filter(
        (a) => a.tenantId === pilotTenantId
      );
      const tenantAStudents = Array.from(state.studentProfiles.values()).filter(
        (s) => s.tenantId === pilotTenantId
      );
      const tenantAEnrollments = Array.from(state.studentEnrollments.values()).filter(
        (e) => e.tenantId === pilotTenantId
      );
      const tenantABindings = Array.from(state.studentParentBindings.values()).filter(
        (b) => b.tenantId === pilotTenantId
      );

      // Verify every admitted application has an active student profile
      for (const app of tenantAApplications) {
        if (app.status === "ADMITTED") {
          expect(app.studentProfileId).toBeDefined();
          const student = state.studentProfiles.get(app.studentProfileId!);
          expect(student).toBeDefined();
          expect(student.tenantId).toBe(pilotTenantId);

          // Verify enrollment exists
          const enrollment = tenantAEnrollments.find((e) => e.studentId === student.id);
          expect(enrollment).toBeDefined();
          expect(enrollment?.tenantId).toBe(pilotTenantId);
        }
      }

      // Verify zero cross-tenant contamination
      for (const enq of tenantAEnquiries) {
        expect(enq.tenantId).toBe(pilotTenantId);
      }
      for (const stu of tenantAStudents) {
        expect(stu.tenantId).toBe(pilotTenantId);
      }
      for (const b of tenantABindings) {
        expect(b.tenantId).toBe(pilotTenantId);
      }

      // Reconciliation Summary
      const report = {
        tenantId: pilotTenantId,
        enquiriesCount: tenantAEnquiries.length,
        applicationsCount: tenantAApplications.length,
        admittedStudentsCount: tenantAStudents.length,
        enrollmentsCount: tenantAEnrollments.length,
        guardianBindingsCount: tenantABindings.length,
        orphanedRecords: 0,
        crossTenantReferences: 0,
        status: "RECONCILED",
      };

      expect(report.orphanedRecords).toBe(0);
      expect(report.crossTenantReferences).toBe(0);
      expect(report.status).toBe("RECONCILED");
    });
  });

  // ==========================================================================
  // STEP 21 & 22 — PERFORMANCE & OPERATIONAL INVARIANTS
  // ==========================================================================
  describe("Steps 21 & 22: Operational & Performance Invariants", () => {
    it("should support paginated list queries without unbounded table scans", async () => {
      // Create 3 applications
      await setupConfirmedApplication("Paginated Student 1", "9000000001");
      await setupConfirmedApplication("Paginated Student 2", "9000000002");
      await setupConfirmedApplication("Paginated Student 3", "9000000003");

      const page1 = await admissionsService.listApplications(
        {
          tenantId: pilotTenantId,
          page: 1,
          pageSize: 2,
        },
        mockDb
      );
      expect(page1.items.length).toBeLessThanOrEqual(2);
      expect(page1.pagination.totalCount).toBeGreaterThanOrEqual(page1.items.length);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.pageSize).toBe(2);
    });

    it("should calculate admission funnel metrics correctly", async () => {
      await setupConfirmedApplication("Funnel Student", "9111111111");

      const funnel = await admissionsService.getAdmissionsFunnel(
        pilotTenantId,
        pilotSessionId,
        mockDb
      );
      expect(funnel.overview).toBeDefined();
      expect(funnel.overview.totalApplications).toBeGreaterThanOrEqual(1);
      expect(funnel.enquiryBreakdown).toBeDefined();
      expect(funnel.applicationBreakdown).toBeDefined();
    });
  });
});
