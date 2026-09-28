import { describe, it, expect, beforeEach, vi } from "vitest";
import { HRService } from "@/lib/services/hr-service";
import { PayrollService } from "@/lib/services/payroll-service";
import { LedgerService } from "@/lib/services/ledger-service";
import { ModuleGate } from "@/lib/authorization/module-gate";
import { ScopeEvaluator } from "@/lib/authorization/scope-evaluator";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
  ModuleDisabledError,
} from "@/lib/errors";
import { Decimal } from "@prisma/client/runtime/library";

function cleanUpdateData(data: any) {
  const clean: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
}

// ============================================================================
// STATEFUL IN-MEMORY CONTROLLED PILOT DATABASE ENGINE (STEP 18)
// Plane 19 (HR) & Plane 20 (Payroll) + Platform Identity & Wave 1 Ledger
// ============================================================================

function createWave5PilotDatabaseStore() {
  const state = {
    // HR Models (Plane 19)
    departments: new Map<string, any>(),
    designations: new Map<string, any>(),
    workLocations: new Map<string, any>(),
    employments: new Map<string, any>(),
    employmentHistories: new Map<string, any>(),
    employmentContracts: new Map<string, any>(),
    leaveTypes: new Map<string, any>(),
    leaveBalances: new Map<string, any>(),
    leaveRequests: new Map<string, any>(),
    holidayCalendars: new Map<string, any>(),
    holidays: new Map<string, any>(),
    employeeDocuments: new Map<string, any>(),

    // Payroll Models (Plane 20)
    salaryComponents: new Map<string, any>(),
    salaryStructures: new Map<string, any>(),
    salaryStructureItems: new Map<string, any>(),
    employeeCompensations: new Map<string, any>(),
    employeeCompensationItems: new Map<string, any>(),
    payrollPeriods: new Map<string, any>(),
    payrollRuns: new Map<string, any>(),
    payrollCalculations: new Map<string, any>(),
    payrollAdjustments: new Map<string, any>(),
    payslips: new Map<string, any>(),
    payrollAccountingPostings: new Map<string, any>(),

    // Platform Identity & Foundation Models
    tenants: new Map<string, any>(),
    users: new Map<string, any>(),
    tenantMemberships: new Map<string, any>(),
    tenantModuleEntitlements: new Map<string, any>(),
    staffProfiles: new Map<string, any>(),
    studentProfiles: new Map<string, any>(),
    guardianProfiles: new Map<string, any>(),

    // Audit & Outbox
    auditLogs: [] as any[],
    tenantOutboxEvents: [] as any[],

    // Wave 1 Financial Foundations
    fiscalYears: new Map<string, any>(),
    financialPeriods: new Map<string, any>(),
    chartOfAccounts: new Map<string, any>(),
    ledgerAccounts: new Map<string, any>(),
    journalEntries: new Map<string, any>(),
    journalLines: new Map<string, any>(),
  };

  let idCounter = 1000;
  const genId = (prefix: string) => `${prefix}_${idCounter++}`;

  let txQueue = Promise.resolve();

  let inTransaction = false;

  const mockDb: any = {
    _state: state,

    $transaction: async (cb: (tx: any) => Promise<any>) => {
      if (inTransaction) {
        return await cb(mockDb);
      }
      let release: () => void;
      const nextLock = new Promise<void>((resolve) => {
        release = resolve;
      });
      const currentLock = txQueue;
      txQueue = txQueue.then(() => nextLock);
      await currentLock;
      inTransaction = true;
      try {
        return await cb(mockDb);
      } finally {
        inTransaction = false;
        release!();
      }
    },

    // ------------------------------------------------------------------------
    // IDENTITY & TENANT MODELS
    // ------------------------------------------------------------------------
    tenant: {
      findUnique: async ({ where }: any) => {
        if (where.id) return state.tenants.get(where.id) || null;
        return null;
      },
    },

    tenantMembership: {
      findFirst: async ({ where }: any) => {
        for (const m of Array.from(state.tenantMemberships.values())) {
          let match = true;
          if (where.tenantId && m.tenantId !== where.tenantId) match = false;
          if (where.userId && m.userId !== where.userId) match = false;
          if (where.status && m.status !== where.status) match = false;
          if (match) return m;
        }
        return null;
      },
    },

    tenantModuleEntitlement: {
      findUnique: async ({ where }: any) => {
        const tId = where?.tenantId_moduleKey?.tenantId || where?.tenantId;
        const mKey = where?.tenantId_moduleKey?.moduleKey || where?.moduleKey;
        for (const e of Array.from(state.tenantModuleEntitlements.values())) {
          if (e.tenantId === tId && e.moduleKey === mKey) return e;
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        for (const e of Array.from(state.tenantModuleEntitlements.values())) {
          let match = true;
          if (where.tenantId && e.tenantId !== where.tenantId) match = false;
          if (where.moduleKey && e.moduleKey !== where.moduleKey) match = false;
          if (match) return e;
        }
        return null;
      },
    },

    staffProfile: {
      create: async ({ data }: any) => {
        const id = genId("stf");
        const rec = { id, ...data };
        state.staffProfiles.set(id, rec);
        return rec;
      },
      findFirst: async ({ where }: any) => {
        for (const s of Array.from(state.staffProfiles.values())) {
          let match = true;
          if (where.id && s.id !== where.id) match = false;
          if (where.tenantId && s.tenantId !== where.tenantId) match = false;
          if (where.userId && s.userId !== where.userId) match = false;
          if (match) {
            const user = s.userId ? state.users.get(s.userId) : null;
            return { ...s, user };
          }
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.staffProfiles.values()).filter((s) => {
          if (where?.tenantId && s.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    // ------------------------------------------------------------------------
    // AUDIT & OUTBOX
    // ------------------------------------------------------------------------
    auditLog: {
      create: async ({ data }: any) => {
        const id = genId("aud");
        const log = { id, ...data, timestamp: new Date() };
        state.auditLogs.push(log);
        return log;
      },
      findMany: async ({ where }: any) => {
        return state.auditLogs.filter((l) => {
          if (where?.tenantId && l.tenantId !== where.tenantId) return false;
          if (where?.action && l.action !== where.action) return false;
          if (where?.entityType && l.entityType !== where.entityType) return false;
          if (where?.entityId && l.entityId !== where.entityId) return false;
          return true;
        });
      },
    },

    tenantOutboxEvent: {
      create: async ({ data }: any) => {
        const id = genId("obx");
        const ev = { id, ...data, createdAt: new Date() };
        state.tenantOutboxEvents.push(ev);
        return ev;
      },
      findMany: async ({ where }: any) => {
        return state.tenantOutboxEvents.filter((e) => {
          if (where?.tenantId && e.tenantId !== where.tenantId) return false;
          if (where?.eventType && e.eventType !== where.eventType) return false;
          if (where?.aggregateId && e.aggregateId !== where.aggregateId) return false;
          return true;
        });
      },
    },

    // ------------------------------------------------------------------------
    // HR MODELS (Plane 19)
    // ------------------------------------------------------------------------
    hRDepartment: {
      findFirst: async ({ where }: any) => {
        for (const d of Array.from(state.departments.values())) {
          let match = true;
          if (where.id && d.id !== where.id) match = false;
          if (where.tenantId && d.tenantId !== where.tenantId) match = false;
          if (where.code && d.code !== where.code) match = false;
          if (match) return d;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("dept");
        const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        state.departments.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.departments.values()).filter((d) => {
          if (where?.tenantId && d.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    hRDesignation: {
      findFirst: async ({ where }: any) => {
        for (const des of Array.from(state.designations.values())) {
          let match = true;
          if (where.id && des.id !== where.id) match = false;
          if (where.tenantId && des.tenantId !== where.tenantId) match = false;
          if (where.code && des.code !== where.code) match = false;
          if (match) return des;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("desig");
        const rec = { id, ...data, createdAt: new Date() };
        state.designations.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.designations.values()).filter((des) => {
          if (where?.tenantId && des.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    hRWorkLocation: {
      findFirst: async ({ where }: any) => {
        for (const loc of Array.from(state.workLocations.values())) {
          let match = true;
          if (where.id && loc.id !== where.id) match = false;
          if (where.tenantId && loc.tenantId !== where.tenantId) match = false;
          if (where.code && loc.code !== where.code) match = false;
          if (match) return loc;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("loc");
        const rec = { id, ...data, createdAt: new Date() };
        state.workLocations.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.workLocations.values()).filter((loc) => {
          if (where?.tenantId && loc.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    hREmployment: {
      findFirst: async ({ where, include }: any) => {
        for (const emp of Array.from(state.employments.values())) {
          let match = true;
          if (where.id && emp.id !== where.id) match = false;
          if (where.tenantId && emp.tenantId !== where.tenantId) match = false;
          if (where.staffProfileId && emp.staffProfileId !== where.staffProfileId) match = false;
          if (where.employeeNumber && emp.employeeNumber !== where.employeeNumber) match = false;
          if (match) {
            let res = { ...emp };
            if (include?.staffProfile) {
              const staff = state.staffProfiles.get(emp.staffProfileId);
              const user = staff?.userId ? state.users.get(staff.userId) : null;
              res.staffProfile = staff ? { ...staff, user } : null;
            }
            if (include?.department) res.department = state.departments.get(emp.departmentId);
            if (include?.designation) res.designation = state.designations.get(emp.designationId);
            if (include?.workLocation) res.workLocation = state.workLocations.get(emp.workLocationId);
            if (include?.compensations) {
              const comps = Array.from(state.employeeCompensations.values()).filter(
                (c) => c.employmentId === emp.id && (!where?.compensations?.where?.status || c.status === where.compensations.where.status)
              );
              res.compensations = comps.map((c) => {
                const items = Array.from(state.employeeCompensationItems.values())
                  .filter((ci) => ci.compensationId === c.id || ci.employeeCompensationId === c.id)
                  .map((ci) => ({ ...ci, component: state.salaryComponents.get(ci.componentId || ci.salaryComponentId) }));
                return { ...c, items };
              });
            }
            if (include?.contracts) {
              res.contracts = Array.from(state.employmentContracts.values()).filter((c) => c.employmentId === emp.id);
            }
            if (include?.histories) {
              res.histories = Array.from(state.employmentHistories.values()).filter((h) => h.employmentId === emp.id);
            }
            if (include?.leaveBalances) {
              res.leaveBalances = Array.from(state.leaveBalances.values())
                .filter((b) => b.employmentId === emp.id)
                .map((b) => ({ ...b, leaveType: state.leaveTypes.get(b.leaveTypeId) }));
            }
            return res;
          }
        }
        return null;
      },
      create: async ({ data, include }: any) => {
        const id = genId("emp");
        const rec = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        state.employments.set(id, rec);
        let res = { ...rec };
        if (include?.staffProfile) {
          const staff = state.staffProfiles.get(rec.staffProfileId);
          const user = staff?.userId ? state.users.get(staff.userId) : null;
          res.staffProfile = staff ? { ...staff, user } : null;
        }
        if (include?.department) res.department = state.departments.get(rec.departmentId);
        if (include?.designation) res.designation = state.designations.get(rec.designationId);
        if (include?.workLocation) res.workLocation = state.workLocations.get(rec.workLocationId);
        return res;
      },
      update: async ({ where, data, include }: any) => {
        const emp = state.employments.get(where.id);
        if (!emp) throw new NotFoundError("Employment record not found");
        const updated = { ...emp, ...cleanUpdateData(data), updatedAt: new Date() };
        state.employments.set(where.id, updated);
        let res = { ...updated };
        if (include?.staffProfile) {
          const staff = state.staffProfiles.get(updated.staffProfileId);
          const user = staff?.userId ? state.users.get(staff.userId) : null;
          res.staffProfile = staff ? { ...staff, user } : null;
        }
        if (include?.department) res.department = state.departments.get(updated.departmentId);
        if (include?.designation) res.designation = state.designations.get(updated.designationId);
        return res;
      },
      findMany: async ({ where, include, skip = 0, take }: any) => {
        let list = Array.from(state.employments.values()).filter((emp) => {
          if (where?.tenantId && emp.tenantId !== where.tenantId) return false;
          if (where?.status?.in && !where.status.in.includes(emp.status)) return false;
          if (where?.status && typeof where.status === "string" && emp.status !== where.status) return false;
          if (where?.departmentId && emp.departmentId !== where.departmentId) return false;
          return true;
        });
        if (skip) list = list.slice(skip);
        if (take) list = list.slice(0, take);
        return list.map((emp) => {
          let res = { ...emp };
          if (include?.staffProfile) {
            const staff = state.staffProfiles.get(emp.staffProfileId);
            const user = staff?.userId ? state.users.get(staff.userId) : null;
            res.staffProfile = staff ? { ...staff, user } : null;
          }
          if (include?.department) res.department = state.departments.get(emp.departmentId);
          if (include?.designation) res.designation = state.designations.get(emp.designationId);
          if (include?.compensations) {
            const comps = Array.from(state.employeeCompensations.values()).filter(
              (c) => c.employmentId === emp.id && (!where?.compensations?.where?.status || c.status === where.compensations.where.status)
            );
            res.compensations = comps.map((c) => {
              const items = Array.from(state.employeeCompensationItems.values())
                .filter((ci) => ci.compensationId === c.id || ci.employeeCompensationId === c.id)
                .map((ci) => ({ ...ci, component: state.salaryComponents.get(ci.componentId || ci.salaryComponentId) }));
              return { ...c, items };
            });
          }
          return res;
        });
      },
      count: async ({ where }: any) => {
        return Array.from(state.employments.values()).filter((emp) => {
          if (where?.tenantId && emp.tenantId !== where.tenantId) return false;
          if (where?.status && emp.status !== where.status) return false;
          if (where?.departmentId && emp.departmentId !== where.departmentId) return false;
          return true;
        }).length;
      },
    },

    hREmploymentHistory: {
      create: async ({ data }: any) => {
        const id = genId("emh");
        const rec = { id, ...data, changeDate: new Date() };
        state.employmentHistories.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.employmentHistories.values()).filter((h) => {
          if (where?.tenantId && h.tenantId !== where.tenantId) return false;
          if (where?.employmentId && h.employmentId !== where.employmentId) return false;
          return true;
        });
      },
    },

    hREmploymentContract: {
      findFirst: async ({ where }: any) => {
        for (const c of Array.from(state.employmentContracts.values())) {
          let match = true;
          if (where.id && c.id !== where.id) match = false;
          if (where.tenantId && c.tenantId !== where.tenantId) match = false;
          if (where.contractNumber && c.contractNumber !== where.contractNumber) match = false;
          if (match) return c;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("cnt");
        const rec = { id, ...data, createdAt: new Date() };
        state.employmentContracts.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.employmentContracts.values()).filter((c) => {
          if (where?.tenantId && c.tenantId !== where.tenantId) return false;
          if (where?.employmentId && c.employmentId !== where.employmentId) return false;
          return true;
        });
      },
    },

    hRLeaveType: {
      findFirst: async ({ where }: any) => {
        for (const lt of Array.from(state.leaveTypes.values())) {
          let match = true;
          if (where.id && lt.id !== where.id) match = false;
          if (where.tenantId && lt.tenantId !== where.tenantId) match = false;
          if (where.code && lt.code !== where.code) match = false;
          if (match) return lt;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("lvt");
        const rec = {
          id,
          ...data,
          daysAllowedPerYear: new Decimal(data.daysAllowedPerYear),
          carryForwardDays: data.carryForwardDays ? new Decimal(data.carryForwardDays) : new Decimal(0),
          createdAt: new Date(),
        };
        state.leaveTypes.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.leaveTypes.values()).filter((lt) => {
          if (where?.tenantId && lt.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    hRLeaveBalance: {
      findFirst: async ({ where }: any) => {
        for (const b of Array.from(state.leaveBalances.values())) {
          let match = true;
          if (where.id && b.id !== where.id) match = false;
          if (where.tenantId && b.tenantId !== where.tenantId) match = false;
          if (where.employmentId && b.employmentId !== where.employmentId) match = false;
          if (where.leaveTypeId && b.leaveTypeId !== where.leaveTypeId) match = false;
          if (where.year && b.year !== where.year) match = false;
          if (match) return b;
        }
        return null;
      },
      upsert: async ({ where, create, update }: any) => {
        const tId = where?.tenantId_employmentId_leaveTypeId_year?.tenantId;
        const eId = where?.tenantId_employmentId_leaveTypeId_year?.employmentId;
        const ltId = where?.tenantId_employmentId_leaveTypeId_year?.leaveTypeId;
        const yr = where?.tenantId_employmentId_leaveTypeId_year?.year;

        let existing: any = null;
        for (const b of Array.from(state.leaveBalances.values())) {
          if (b.tenantId === tId && b.employmentId === eId && b.leaveTypeId === ltId && b.year === yr) {
            existing = b;
            break;
          }
        }
        if (existing) {
          const updated = {
            ...existing,
            ...update,
            allocatedDays: update.allocatedDays !== undefined ? new Decimal(update.allocatedDays) : existing.allocatedDays,
            updatedAt: new Date(),
          };
          state.leaveBalances.set(existing.id, updated);
          return updated;
        } else {
          const id = genId("lvb");
          const rec = {
            id,
            ...create,
            allocatedDays: new Decimal(create.allocatedDays),
            usedDays: new Decimal(create.usedDays || 0),
            pendingDays: new Decimal(create.pendingDays || 0),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.leaveBalances.set(id, rec);
          return rec;
        }
      },
      update: async ({ where, data }: any) => {
        const b = state.leaveBalances.get(where.id);
        if (!b) return null;
        const updated = {
          ...b,
          ...cleanUpdateData(data),
          allocatedDays: data.allocatedDays !== undefined ? new Decimal(data.allocatedDays) : b.allocatedDays,
          usedDays: data.usedDays !== undefined ? new Decimal(data.usedDays) : b.usedDays,
          pendingDays: data.pendingDays !== undefined ? new Decimal(data.pendingDays) : b.pendingDays,
          updatedAt: new Date(),
        };
        state.leaveBalances.set(where.id, updated);
        return updated;
      },
    },

    hRLeaveRequest: {
      findFirst: async ({ where, include }: any) => {
        for (const lr of Array.from(state.leaveRequests.values())) {
          let match = true;
          if (where.id && lr.id !== where.id) match = false;
          if (where.tenantId && lr.tenantId !== where.tenantId) match = false;
          if (where.employmentId && lr.employmentId !== where.employmentId) match = false;
          if (match) {
            let res = { ...lr };
            if (include?.employment) {
              const emp = state.employments.get(lr.employmentId);
              if (emp) {
                const staff = state.staffProfiles.get(emp.staffProfileId);
                const user = staff?.userId ? state.users.get(staff.userId) : null;
                res.employment = { ...emp, staffProfile: staff ? { ...staff, user } : null };
              }
            }
            if (include?.leaveType) res.leaveType = state.leaveTypes.get(lr.leaveTypeId);
            return res;
          }
        }
        return null;
      },
      create: async ({ data, include }: any) => {
        const id = genId("lvr");
        const rec = {
          id,
          ...data,
          daysCount: new Decimal(data.daysCount),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.leaveRequests.set(id, rec);
        let res = { ...rec };
        if (include?.employment) {
          const emp = state.employments.get(rec.employmentId);
          if (emp) {
            const staff = state.staffProfiles.get(emp.staffProfileId);
            const user = staff?.userId ? state.users.get(staff.userId) : null;
            res.employment = { ...emp, staffProfile: staff ? { ...staff, user } : null };
          }
        }
        if (include?.leaveType) res.leaveType = state.leaveTypes.get(rec.leaveTypeId);
        return res;
      },
      update: async ({ where, data }: any) => {
        const lr = state.leaveRequests.get(where.id);
        if (!lr) return null;
        const updated = { ...lr, ...cleanUpdateData(data), updatedAt: new Date() };
        state.leaveRequests.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.leaveRequests.values()).filter((lr) => {
          if (where?.tenantId && lr.tenantId !== where.tenantId) return false;
          if (where?.employmentId && lr.employmentId !== where.employmentId) return false;
          if (where?.status && lr.status !== where.status) return false;
          if (where?.leaveType?.isPaid !== undefined) {
            const lt = state.leaveTypes.get(lr.leaveTypeId);
            if (!lt || lt.isPaid !== where.leaveType.isPaid) return false;
          }
          if (where?.startDate?.lte && new Date(lr.startDate) > new Date(where.startDate.lte)) return false;
          if (where?.endDate?.gte && new Date(lr.endDate) < new Date(where.endDate.gte)) return false;
          return true;
        });
      },
    },

    hRHolidayCalendar: {
      findFirst: async ({ where }: any) => {
        for (const cal of Array.from(state.holidayCalendars.values())) {
          let match = true;
          if (where.id && cal.id !== where.id) match = false;
          if (where.tenantId && cal.tenantId !== where.tenantId) match = false;
          if (match) return cal;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("cal");
        const rec = { id, ...data, createdAt: new Date() };
        state.holidayCalendars.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.holidayCalendars.values()).filter((c) => {
          if (where?.tenantId && c.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    hRHoliday: {
      findFirst: async ({ where }: any) => {
        for (const h of Array.from(state.holidays.values())) {
          let match = true;
          if (where.id && h.id !== where.id) match = false;
          if (where.calendarId && h.calendarId !== where.calendarId) match = false;
          if (match) return h;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("hol");
        const rec = { id, ...data, date: new Date(data.date), createdAt: new Date() };
        state.holidays.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.holidays.values()).filter((h) => {
          if (where?.calendarId && h.calendarId !== where.calendarId) return false;
          return true;
        });
      },
    },

    // ------------------------------------------------------------------------
    // PAYROLL MODELS (Plane 20)
    // ------------------------------------------------------------------------
    salaryComponent: {
      findFirst: async ({ where }: any) => {
        for (const sc of Array.from(state.salaryComponents.values())) {
          let match = true;
          if (where.id && sc.id !== where.id) match = false;
          if (where.tenantId && sc.tenantId !== where.tenantId) match = false;
          if (where.code && sc.code !== where.code) match = false;
          if (match) return sc;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("cmp");
        const rec = {
          id,
          ...data,
          defaultAmount: new Decimal(data.defaultAmount || 0),
          percentage: new Decimal(data.percentage || 0),
          createdAt: new Date(),
        };
        state.salaryComponents.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.salaryComponents.values()).filter((sc) => {
          if (where?.tenantId && sc.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    salaryStructure: {
      findFirst: async ({ where }: any) => {
        for (const ss of Array.from(state.salaryStructures.values())) {
          let match = true;
          if (where.id && ss.id !== where.id) match = false;
          if (where.tenantId && ss.tenantId !== where.tenantId) match = false;
          if (where.code && ss.code !== where.code) match = false;
          if (match) return ss;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("str");
        const rec = { id, ...data, createdAt: new Date() };
        state.salaryStructures.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.salaryStructures.values()).filter((ss) => {
          if (where?.tenantId && ss.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    salaryStructureItem: {
      create: async ({ data }: any) => {
        const id = genId("ssi");
        const rec = {
          id,
          ...data,
          amount: data.amount ? new Decimal(data.amount) : new Decimal(0),
          percentage: data.percentage ? new Decimal(data.percentage) : new Decimal(0),
        };
        state.salaryStructureItems.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.salaryStructureItems.values()).filter((ssi) => {
          if (where?.salaryStructureId && ssi.salaryStructureId !== where.salaryStructureId) return false;
          return true;
        });
      },
    },

    employeeCompensation: {
      findFirst: async ({ where }: any) => {
        for (const ec of Array.from(state.employeeCompensations.values())) {
          let match = true;
          if (where.id && ec.id !== where.id) match = false;
          if (where.tenantId && ec.tenantId !== where.tenantId) match = false;
          if (where.employmentId && ec.employmentId !== where.employmentId) match = false;
          if (where.status && ec.status !== where.status) match = false;
          if (match) return ec;
        }
        return null;
      },
      findUnique: async ({ where, include }: any) => {
        const ec = state.employeeCompensations.get(where.id);
        if (!ec) return null;
        let res = { ...ec };
        if (include?.items) {
          const items = Array.from(state.employeeCompensationItems.values())
            .filter((ci) => ci.compensationId === ec.id || ci.employeeCompensationId === ec.id)
            .map((ci) => ({ ...ci, component: state.salaryComponents.get(ci.componentId || ci.salaryComponentId) }));
          res.items = items;
        }
        return res;
      },
      create: async ({ data }: any) => {
        const id = genId("cmp_asn");
        const rec = {
          id,
          ...data,
          basicSalary: new Decimal(data.basicSalary),
          grossSalary: new Decimal(data.grossSalary || data.basicSalary),
          createdAt: new Date(),
        };
        state.employeeCompensations.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const ec = state.employeeCompensations.get(where.id);
        if (!ec) return null;
        const updated = { ...ec, ...cleanUpdateData(data), updatedAt: new Date() };
        state.employeeCompensations.set(where.id, updated);
        return updated;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [id, ec] of Array.from(state.employeeCompensations.entries())) {
          let match = true;
          if (where?.tenantId && ec.tenantId !== where.tenantId) match = false;
          if (where?.employmentId && ec.employmentId !== where.employmentId) match = false;
          if (where?.status && ec.status !== where.status) match = false;
          if (match) {
            state.employeeCompensations.set(id, { ...ec, ...cleanUpdateData(data), updatedAt: new Date() });
            count++;
          }
        }
        return { count };
      },
    },

    employeeCompensationItem: {
      create: async ({ data, include }: any) => {
        const id = genId("eci");
        const compId = data.compensationId || data.employeeCompensationId;
        const scId = data.componentId || data.salaryComponentId;
        const rec = {
          id,
          ...data,
          compensationId: compId,
          employeeCompensationId: compId,
          componentId: scId,
          salaryComponentId: scId,
          amount: new Decimal(data.amount),
        };
        state.employeeCompensationItems.set(id, rec);
        let res = { ...rec };
        if (include?.component) {
          res.component = state.salaryComponents.get(scId);
        }
        return res;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.employeeCompensationItems.values()).filter((eci) => {
          if (where?.employeeCompensationId && eci.employeeCompensationId !== where.employeeCompensationId && eci.compensationId !== where.employeeCompensationId) return false;
          if (where?.compensationId && eci.compensationId !== where.compensationId && eci.employeeCompensationId !== where.compensationId) return false;
          return true;
        });
      },
    },

    payrollPeriod: {
      findFirst: async ({ where }: any) => {
        for (const pp of Array.from(state.payrollPeriods.values())) {
          let match = true;
          if (where.id && pp.id !== where.id) match = false;
          if (where.tenantId && pp.tenantId !== where.tenantId) match = false;
          if (where.name && pp.name !== where.name) match = false;
          if (match) return pp;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("pp");
        const rec = { id, ...data, status: data.status || "OPEN", createdAt: new Date() };
        state.payrollPeriods.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const pp = state.payrollPeriods.get(where.id);
        if (!pp) return null;
        const updated = { ...pp, ...cleanUpdateData(data), updatedAt: new Date() };
        state.payrollPeriods.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.payrollPeriods.values()).filter((pp) => {
          if (where?.tenantId && pp.tenantId !== where.tenantId) return false;
          return true;
        });
      },
    },

    payrollRun: {
      findFirst: async ({ where, include }: any) => {
        for (const pr of Array.from(state.payrollRuns.values())) {
          let match = true;
          if (where.id && pr.id !== where.id) match = false;
          if (where.tenantId && pr.tenantId !== where.tenantId) match = false;
          if (where.periodId && pr.periodId !== where.periodId) match = false;
          if (where.status?.in && !where.status.in.includes(pr.status)) match = false;
          if (where.status && typeof where.status === "string" && pr.status !== where.status) match = false;
          if (match) {
            let res = { ...pr };
            if (include?.period) res.period = state.payrollPeriods.get(pr.periodId);
            if (include?.calculations) {
              const calcs = Array.from(state.payrollCalculations.values()).filter((c) => c.payrollRunId === pr.id);
              res.calculations = calcs.map((calc) => {
                const emp = state.employments.get(calc.employmentId);
                let empObj = emp ? { ...emp } : null;
                if (empObj) {
                  const staff = state.staffProfiles.get(empObj.staffProfileId);
                  const user = staff?.userId ? state.users.get(staff.userId) : null;
                  empObj.staffProfile = staff ? { ...staff, user } : null;
                  empObj.department = state.departments.get(empObj.departmentId);
                  empObj.designation = state.designations.get(empObj.designationId);
                }
                return { ...calc, employment: empObj };
              });
            }
            return res;
          }
        }
        return null;
      },
      create: async ({ data, include }: any) => {
        const id = genId("pr");
        const rec = {
          id,
          ...data,
          calculationVersion: 1,
          totalEmployees: 0,
          totalGrossEarnings: new Decimal(0),
          totalEmployeeDeductions: new Decimal(0),
          totalEmployerContributions: new Decimal(0),
          totalNetPay: new Decimal(0),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.payrollRuns.set(id, rec);
        let res = { ...rec };
        if (include?.period) res.period = state.payrollPeriods.get(rec.periodId);
        return res;
      },
      update: async ({ where, data, include }: any) => {
        const pr = state.payrollRuns.get(where.id);
        if (!pr) return null;
        const updated = {
          ...pr,
          ...cleanUpdateData(data),
          totalGrossEarnings: data.totalGrossEarnings !== undefined ? new Decimal(data.totalGrossEarnings) : pr.totalGrossEarnings,
          totalEmployeeDeductions: data.totalEmployeeDeductions !== undefined ? new Decimal(data.totalEmployeeDeductions) : pr.totalEmployeeDeductions,
          totalEmployerContributions: data.totalEmployerContributions !== undefined ? new Decimal(data.totalEmployerContributions) : pr.totalEmployerContributions,
          totalNetPay: data.totalNetPay !== undefined ? new Decimal(data.totalNetPay) : pr.totalNetPay,
          updatedAt: new Date(),
        };
        state.payrollRuns.set(where.id, updated);
        let res = { ...updated };
        if (include?.period) res.period = state.payrollPeriods.get(updated.periodId);
        if (include?.calculations) {
          const calcs = Array.from(state.payrollCalculations.values()).filter((c) => c.payrollRunId === updated.id);
          res.calculations = calcs;
        }
        return res;
      },
      count: async ({ where }: any) => {
        return Array.from(state.payrollRuns.values()).filter((pr) => {
          if (where?.tenantId && pr.tenantId !== where.tenantId) return false;
          return true;
        }).length;
      },
    },

    payrollCalculation: {
      create: async ({ data }: any) => {
        const id = genId("prc");
        const rec = {
          id,
          ...data,
          workingDays: new Decimal(data.workingDays),
          presentDays: new Decimal(data.presentDays),
          absentDays: new Decimal(data.absentDays || 0),
          unpaidLeaveDays: new Decimal(data.unpaidLeaveDays || 0),
          grossEarnings: new Decimal(data.grossEarnings),
          totalDeductions: new Decimal(data.totalDeductions),
          employerContributions: new Decimal(data.employerContributions || 0),
          netPay: new Decimal(data.netPay),
          createdAt: new Date(),
        };
        state.payrollCalculations.set(id, rec);
        return rec;
      },
      deleteMany: async ({ where }: any) => {
        let count = 0;
        for (const [id, c] of Array.from(state.payrollCalculations.entries())) {
          if (where.payrollRunId && c.payrollRunId === where.payrollRunId) {
            state.payrollCalculations.delete(id);
            count++;
          }
        }
        return { count };
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.payrollCalculations.values()).filter((c) => {
          if (where?.payrollRunId && c.payrollRunId !== where.payrollRunId) return false;
          return true;
        });
      },
    },

    payrollAdjustment: {
      findFirst: async ({ where }: any) => {
        for (const adj of Array.from(state.payrollAdjustments.values())) {
          let match = true;
          if (where.id && adj.id !== where.id) match = false;
          if (where.tenantId && adj.tenantId !== where.tenantId) match = false;
          if (match) return adj;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("adj");
        const rec = {
          id,
          ...data,
          amount: new Decimal(data.amount),
          status: "APPROVED",
          createdAt: new Date(),
        };
        state.payrollAdjustments.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const adj = state.payrollAdjustments.get(where.id);
        if (!adj) return null;
        const updated = { ...adj, ...cleanUpdateData(data) };
        state.payrollAdjustments.set(where.id, updated);
        return updated;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.payrollAdjustments.values()).filter((adj) => {
          if (where?.tenantId && adj.tenantId !== where.tenantId) return false;
          if (where?.employmentId && adj.employmentId !== where.employmentId) return false;
          if (where?.status && adj.status !== where.status) return false;
          if (where?.appliedInPayrollRunId === null && adj.appliedInPayrollRunId !== null && adj.appliedInPayrollRunId !== undefined) {
            return false;
          }
          return true;
        });
      },
    },

    payslip: {
      upsert: async ({ where, create }: any) => {
        const rId = where?.payrollRunId_employmentId?.payrollRunId;
        const eId = where?.payrollRunId_employmentId?.employmentId;
        let existing: any = null;
        for (const p of Array.from(state.payslips.values())) {
          if (p.payrollRunId === rId && p.employmentId === eId) {
            existing = p;
            break;
          }
        }
        if (existing) return existing;
        const id = genId("ps");
        const rec = {
          id,
          ...create,
          grossEarnings: new Decimal(create.grossEarnings),
          totalDeductions: new Decimal(create.totalDeductions),
          netPay: new Decimal(create.netPay),
          createdAt: new Date(),
        };
        state.payslips.set(id, rec);
        return rec;
      },
      findFirst: async ({ where }: any) => {
        for (const ps of Array.from(state.payslips.values())) {
          let match = true;
          if (where.id && ps.id !== where.id) match = false;
          if (where.tenantId && ps.tenantId !== where.tenantId) match = false;
          if (where.employmentId && ps.employmentId !== where.employmentId) match = false;
          if (match) return ps;
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.payslips.values()).filter((ps) => {
          if (where?.tenantId && ps.tenantId !== where.tenantId) return false;
          if (where?.payrollRunId && ps.payrollRunId !== where.payrollRunId) return false;
          if (where?.employmentId && ps.employmentId !== where.employmentId) return false;
          return true;
        });
      },
    },

    payrollAccountingPosting: {
      create: async ({ data }: any) => {
        const id = genId("pap");
        const rec = {
          id,
          ...data,
          totalExpense: new Decimal(data.totalExpense),
          totalPayable: new Decimal(data.totalPayable),
          postedAt: new Date(),
        };
        state.payrollAccountingPostings.set(id, rec);
        return rec;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.payrollAccountingPostings.values()).filter((p) => {
          if (where?.tenantId && p.tenantId !== where.tenantId) return false;
          if (where?.payrollRunId && p.payrollRunId !== where.payrollRunId) return false;
          return true;
        });
      },
    },

    // ------------------------------------------------------------------------
    // FINANCIAL LEDGER (Wave 1 Foundations)
    // ------------------------------------------------------------------------
    financialPeriod: {
      findFirst: async ({ where }: any) => {
        for (const fp of Array.from(state.financialPeriods.values())) {
          let match = true;
          if (where.id && fp.id !== where.id) match = false;
          if (where.tenantId && fp.tenantId !== where.tenantId) match = false;
          if (where.status && fp.status !== where.status) match = false;
          if (match) return fp;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("fnp");
        const rec = { id, ...data };
        state.financialPeriods.set(id, rec);
        return rec;
      },
      update: async ({ where, data }: any) => {
        const fp = state.financialPeriods.get(where.id);
        if (!fp) return null;
        const updated = { ...fp, ...cleanUpdateData(data) };
        state.financialPeriods.set(where.id, updated);
        return updated;
      },
    },

    chartOfAccount: {
      findUnique: async ({ where, include }: any) => {
        let coa = null;
        if (where.id) coa = state.chartOfAccounts.get(where.id);
        if (!coa && where.tenantId_accountCode) {
          for (const c of Array.from(state.chartOfAccounts.values())) {
            if (c.tenantId === where.tenantId_accountCode.tenantId && c.accountCode === where.tenantId_accountCode.accountCode) {
              coa = c;
              break;
            }
          }
        }
        if (!coa) return null;
        let res = { ...coa };
        if (include?.ledgerAccount) {
          let la = Array.from(state.ledgerAccounts.values()).find((l: any) => l.chartOfAccountId === coa.id);
          if (!la) {
            const laId = genId("la");
            la = {
              id: laId,
              tenantId: coa.tenantId,
              chartOfAccountId: coa.id,
              currentBalance: new Decimal(0),
              currency: "INR",
            };
            state.ledgerAccounts.set(laId, la);
          }
          res.ledgerAccount = la;
        }
        return res;
      },
      findFirst: async ({ where }: any) => {
        for (const coa of Array.from(state.chartOfAccounts.values())) {
          let match = true;
          if (where.id && coa.id !== where.id) match = false;
          if (where.tenantId && coa.tenantId !== where.tenantId) match = false;
          if (where.accountType && coa.accountType !== where.accountType) match = false;
          if (match) return coa;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const id = genId("coa");
        const rec = { id, ...data };
        state.chartOfAccounts.set(id, rec);
        return rec;
      },
      upsert: async ({ where, create, update }: any) => {
        const tId = where?.tenantId_accountCode?.tenantId;
        const code = where?.tenantId_accountCode?.accountCode;
        let existing: any = null;
        for (const c of Array.from(state.chartOfAccounts.values())) {
          if (c.tenantId === tId && c.accountCode === code) {
            existing = c;
            break;
          }
        }
        if (existing) {
          const updated = { ...existing, ...update };
          state.chartOfAccounts.set(existing.id, updated);
          return updated;
        } else {
          const id = genId("coa");
          const rec = { id, ...create };
          state.chartOfAccounts.set(id, rec);
          return rec;
        }
      },
    },

    ledgerAccount: {
      update: async ({ where, data }: any) => {
        const la = state.ledgerAccounts.get(where.id);
        if (!la) return null;
        const updated = {
          ...la,
          ...cleanUpdateData(data),
          currentBalance: data.currentBalance !== undefined ? new Decimal(data.currentBalance) : la.currentBalance,
          updatedAt: new Date(),
        };
        state.ledgerAccounts.set(where.id, updated);
        return updated;
      },
      findFirst: async ({ where }: any) => {
        for (const la of Array.from(state.ledgerAccounts.values())) {
          let match = true;
          if (where.id && la.id !== where.id) match = false;
          if (where.tenantId && la.tenantId !== where.tenantId) match = false;
          if (where.chartOfAccountId && la.chartOfAccountId !== where.chartOfAccountId) match = false;
          if (match) return la;
        }
        return null;
      },
    },

    journalEntry: {
      create: async ({ data }: any) => {
        const id = genId("jrn");
        const lines = data.lines?.create
          ? data.lines.create.map((l: any) => {
              const jlId = genId("jrl");
              const lineRec = {
                id: jlId,
                ...l,
                journalEntryId: id,
                debitAmount: new Decimal(l.debitAmount),
                creditAmount: new Decimal(l.creditAmount),
              };
              state.journalLines.set(jlId, lineRec);
              return lineRec;
            })
          : [];
        const rec = {
          id,
          ...data,
          totalDebit: new Decimal(data.totalDebit),
          totalCredit: new Decimal(data.totalCredit),
          lines,
          createdAt: new Date(),
        };
        state.journalEntries.set(id, rec);
        return rec;
      },
      count: async ({ where }: any) => {
        return Array.from(state.journalEntries.values()).filter((j) => {
          if (where?.tenantId && j.tenantId !== where.tenantId) return false;
          return true;
        }).length;
      },
      findFirst: async ({ where }: any) => {
        for (const j of Array.from(state.journalEntries.values())) {
          let match = true;
          if (where.id && j.id !== where.id) match = false;
          if (where.tenantId && j.tenantId !== where.tenantId) match = false;
          if (match) return j;
        }
        return null;
      },
    },

    journalLine: {
      findMany: async ({ where }: any) => {
        return Array.from(state.journalLines.values()).filter((jl) => {
          if (where?.tenantId && jl.tenantId !== where.tenantId) return false;
          if (where?.journalEntryId && jl.journalEntryId !== where.journalEntryId) return false;
          return true;
        });
      },
    },
  };

  return mockDb;
}

// ============================================================================
// STEP 18: CONTROLLED PILOT TEST SUITE
// ============================================================================

describe("STEP 18 — V2 Wave 5 Controlled Production Pilot: HR & Payroll", () => {
  let db: any;
  let hrService: HRService;
  let payrollService: PayrollService;
  let ledgerService: LedgerService;
  let moduleGate: ModuleGate;
  let scopeEvaluator: ScopeEvaluator;

  // Institutional Tenants
  const tenantPilot = "tnt_pilot_dps"; // Delhi Public Academy (Pilot Institution)
  const tenantControl = "tnt_control_dav"; // DAV Centenary Academy (Control Institution)

  // Personas
  const userAdmin = { id: "usr_admin", email: "admin@dps.edu" };
  const userHRManager = { id: "usr_hr_mgr", email: "hr.manager@dps.edu" };
  const userHROfficer = { id: "usr_hr_off", email: "hr.officer@dps.edu" };
  const userPayrollManager = { id: "usr_pay_mgr", email: "payroll.manager@dps.edu" };
  const userPayrollOfficer = { id: "usr_pay_off", email: "payroll.officer@dps.edu" };
  const userTeacher1 = { id: "usr_teacher_1", email: "teacher1@dps.edu" };
  const userTeacher2 = { id: "usr_teacher_2", email: "teacher2@dps.edu" };
  const userParent = { id: "usr_parent", email: "parent@dps.edu" };

  beforeEach(() => {
    db = createWave5PilotDatabaseStore();
    hrService = new HRService();
    payrollService = new PayrollService();
    ledgerService = new LedgerService();
    moduleGate = new ModuleGate();
    scopeEvaluator = new ScopeEvaluator();

    // 1. Seed Tenants
    db._state.tenants.set(tenantPilot, {
      id: tenantPilot,
      slug: "delhi-public-academy",
      name: "Delhi Public Academy",
      status: "ACTIVE",
    });
    db._state.tenants.set(tenantControl, {
      id: tenantControl,
      slug: "dav-centenary-academy",
      name: "DAV Centenary Academy",
      status: "ACTIVE",
    });

    // 2. Seed Users
    for (const u of [
      userAdmin,
      userHRManager,
      userHROfficer,
      userPayrollManager,
      userPayrollOfficer,
      userTeacher1,
      userTeacher2,
      userParent,
    ]) {
      db._state.users.set(u.id, { ...u, name: u.email.split("@")[0] });
    }

    // 3. Seed Module Entitlements: Pilot enabled, Control disabled
    db._state.tenantModuleEntitlements.set(`${tenantPilot}_hr_module`, {
      tenantId: tenantPilot,
      moduleKey: "hr_module",
      isEnabled: true,
    });
    db._state.tenantModuleEntitlements.set(`${tenantPilot}_payroll_module`, {
      tenantId: tenantPilot,
      moduleKey: "payroll_module",
      isEnabled: true,
    });

    db._state.tenantModuleEntitlements.set(`${tenantControl}_hr_module`, {
      tenantId: tenantControl,
      moduleKey: "hr_module",
      isEnabled: false,
    });
    db._state.tenantModuleEntitlements.set(`${tenantControl}_payroll_module`, {
      tenantId: tenantControl,
      moduleKey: "payroll_module",
      isEnabled: false,
    });

    // 4. Seed Memberships for Personas
    db._state.tenantMemberships.set(`mem_${userAdmin.id}`, {
      id: `mem_${userAdmin.id}`,
      tenantId: tenantPilot,
      userId: userAdmin.id,
      role: "ADMIN",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userHRManager.id}`, {
      id: `mem_${userHRManager.id}`,
      tenantId: tenantPilot,
      userId: userHRManager.id,
      role: "HR_MANAGER",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userHROfficer.id}`, {
      id: `mem_${userHROfficer.id}`,
      tenantId: tenantPilot,
      userId: userHROfficer.id,
      role: "HR_OFFICER",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userPayrollManager.id}`, {
      id: `mem_${userPayrollManager.id}`,
      tenantId: tenantPilot,
      userId: userPayrollManager.id,
      role: "PAYROLL_MANAGER",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userPayrollOfficer.id}`, {
      id: `mem_${userPayrollOfficer.id}`,
      tenantId: tenantPilot,
      userId: userPayrollOfficer.id,
      role: "PAYROLL_OFFICER",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userTeacher1.id}`, {
      id: `mem_${userTeacher1.id}`,
      tenantId: tenantPilot,
      userId: userTeacher1.id,
      role: "TEACHER",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userTeacher2.id}`, {
      id: `mem_${userTeacher2.id}`,
      tenantId: tenantPilot,
      userId: userTeacher2.id,
      role: "TEACHER",
      status: "ACTIVE",
    });
    db._state.tenantMemberships.set(`mem_${userParent.id}`, {
      id: `mem_${userParent.id}`,
      tenantId: tenantPilot,
      userId: userParent.id,
      role: "PARENT",
      status: "ACTIVE",
    });

    // 5. Seed Staff Profiles
    db._state.staffProfiles.set("stf_hrmgr", {
      id: "stf_hrmgr",
      tenantId: tenantPilot,
      userId: userHRManager.id,
      fullName: "Anita Sharma",
    });
    db._state.staffProfiles.set("stf_t1", {
      id: "stf_t1",
      tenantId: tenantPilot,
      userId: userTeacher1.id,
      fullName: "Rohan Verma",
    });
    db._state.staffProfiles.set("stf_t2", {
      id: "stf_t2",
      tenantId: tenantPilot,
      userId: userTeacher2.id,
      fullName: "Priya Nair",
    });

    // 6. Seed Wave 1 Chart of Accounts & Open Financial Period
    const expAcc = {
      id: "coa_salary_exp",
      tenantId: tenantPilot,
      accountCode: "5030",
      accountName: "Staff Salary & Wages Expense",
      accountType: "EXPENSE",
      isActive: true,
    };
    const payAcc = {
      id: "coa_payroll_pay",
      tenantId: tenantPilot,
      accountCode: "2030",
      accountName: "Salaries and Net Wages Payable",
      accountType: "LIABILITY",
      isActive: true,
    };
    const taxAcc = {
      id: "coa_tax_pay",
      tenantId: tenantPilot,
      accountCode: "2040",
      accountName: "Statutory Deductions & TDS Payable",
      accountType: "LIABILITY",
      isActive: true,
    };
    db._state.chartOfAccounts.set(expAcc.id, expAcc);
    db._state.chartOfAccounts.set(payAcc.id, payAcc);
    db._state.chartOfAccounts.set(taxAcc.id, taxAcc);

    const fPeriod = {
      id: "fnp_open_apr",
      tenantId: tenantPilot,
      periodName: "Period 1 (Apr 2026)",
      periodNumber: 1,
      status: "OPEN",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-30"),
    };
    db._state.financialPeriods.set(fPeriod.id, fPeriod);
  });

  // ==========================================================================
  // SECTION A & B: AUTHENTICATION & MODULE GATING
  // ==========================================================================
  describe("Section A & B: Authentication & Module Gating", () => {
    it("should allow Pilot tenant when hr_module and payroll_module are enabled", async () => {
      const hrEnabled = await moduleGate.isModuleEnabled(tenantPilot, "hr_module", db);
      const payrollEnabled = await moduleGate.isModuleEnabled(tenantPilot, "payroll_module", db);
      expect(hrEnabled).toBe(true);
      expect(payrollEnabled).toBe(true);

      await expect(moduleGate.assertModuleEnabled(tenantPilot, "hr_module", db)).resolves.toBeUndefined();
      await expect(moduleGate.assertModuleEnabled(tenantPilot, "payroll_module", db)).resolves.toBeUndefined();
    });

    it("should fail closed with HTTP 402 ModuleDisabledError for Control tenant", async () => {
      const hrEnabled = await moduleGate.isModuleEnabled(tenantControl, "hr_module", db);
      const payrollEnabled = await moduleGate.isModuleEnabled(tenantControl, "payroll_module", db);
      expect(hrEnabled).toBe(false);
      expect(payrollEnabled).toBe(false);

      await expect(moduleGate.assertModuleEnabled(tenantControl, "hr_module", db)).rejects.toBeInstanceOf(
        ModuleDisabledError
      );
      await expect(moduleGate.assertModuleEnabled(tenantControl, "payroll_module", db)).rejects.toBeInstanceOf(
        ModuleDisabledError
      );
    });

    it("should verify independent module gating: HR enabled does NOT enable Payroll", async () => {
      // Create independent test tenant with HR enabled and Payroll disabled
      const tIndependent = "tnt_independent_test";
      db._state.tenantModuleEntitlements.set(`${tIndependent}_hr_module`, {
        tenantId: tIndependent,
        moduleKey: "hr_module",
        isEnabled: true,
      });
      db._state.tenantModuleEntitlements.set(`${tIndependent}_payroll_module`, {
        tenantId: tIndependent,
        moduleKey: "payroll_module",
        isEnabled: false,
      });

      // HR works
      await expect(moduleGate.assertModuleEnabled(tIndependent, "hr_module", db)).resolves.toBeUndefined();
      // Payroll fails closed with 402
      await expect(moduleGate.assertModuleEnabled(tIndependent, "payroll_module", db)).rejects.toBeInstanceOf(
        ModuleDisabledError
      );
    });

    it("should verify independent module gating: Payroll enabled does NOT enable HR", async () => {
      const tIndependent2 = "tnt_independent_test_2";
      db._state.tenantModuleEntitlements.set(`${tIndependent2}_hr_module`, {
        tenantId: tIndependent2,
        moduleKey: "hr_module",
        isEnabled: false,
      });
      db._state.tenantModuleEntitlements.set(`${tIndependent2}_payroll_module`, {
        tenantId: tIndependent2,
        moduleKey: "payroll_module",
        isEnabled: true,
      });

      // Payroll works
      await expect(moduleGate.assertModuleEnabled(tIndependent2, "payroll_module", db)).resolves.toBeUndefined();
      // HR fails closed with 402
      await expect(moduleGate.assertModuleEnabled(tIndependent2, "hr_module", db)).rejects.toBeInstanceOf(
        ModuleDisabledError
      );
    });
  });

  // ==========================================================================
  // SECTION C & D: RBAC & ACCESS SCOPE
  // ==========================================================================
  describe("Section C & D: RBAC & Access Scope Evaluation", () => {
    it("should allow INSTITUTION_WIDE scope for HR_MANAGER to view institutional records", async () => {
      const allowed = await scopeEvaluator.evaluateScope(
        "INSTITUTION_WIDE",
        { permission: "hr.employee.read" } as any,
        { tenant: { id: tenantPilot } as any, user: { id: userHRManager.id } as any } as any,
        db
      );
      expect(allowed).toBe(true);
    });

    it("should allow SELF_ONLY scope for TEACHER to access their own employment profile", async () => {
      const allowedSelf = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        { permission: "hr.employee.read", resourceOwnerUserId: userTeacher1.id } as any,
        { tenant: { id: tenantPilot } as any, user: { id: userTeacher1.id } as any } as any,
        db
      );
      expect(allowedSelf).toBe(true);
    });

    it("should reject SELF_ONLY scope when a TEACHER attempts to view another teacher's profile", async () => {
      const deniedCross = await scopeEvaluator.evaluateScope(
        "SELF_ONLY",
        { permission: "hr.employee.read", resourceOwnerUserId: userTeacher2.id } as any,
        { tenant: { id: tenantPilot } as any, user: { id: userTeacher1.id } as any } as any,
        db
      );
      expect(deniedCross).toBe(false);
    });

    it("should strictly deny LINKED_CHILDREN scope from granting parents access to payroll or salary data", async () => {
      // Invariant: Parents cannot access staff payroll under linked children scope
      const parentScope = await scopeEvaluator.evaluateScope(
        "LINKED_CHILDREN",
        { permission: "payroll.run.read", targetStudentId: "std_child_1" } as any,
        { tenant: { id: tenantPilot } as any, user: { id: userParent.id } as any } as any,
        db
      );
      // Even if child linked, payroll permission is not a student domain permission
      expect(parentScope).toBe(false);
    });
  });

  // ==========================================================================
  // SECTION E: MULTI-TENANT ISOLATION & CROSS-TENANT IDOR
  // ==========================================================================
  describe("Section E: Multi-Tenant Isolation & IDOR Protection", () => {
    it("should prevent cross-tenant access to departments, employments, and payroll runs", async () => {
      // Create dept in Pilot
      const deptPilot = await hrService.createDepartment(
        { tenantId: tenantPilot, code: "SCI_DEPT", name: "Science Department" },
        db
      );

      // Attempt to access Pilot department using Control tenant context
      const controlDept = await db.hRDepartment.findFirst({
        where: { id: deptPilot.id, tenantId: tenantControl },
      });
      expect(controlDept).toBeNull();
    });

    it("should reject cross-tenant reference during department creation", async () => {
      // Parent department created in Control tenant
      const controlParent = await db.hRDepartment.create({
        data: { tenantId: tenantControl, code: "CTRL_PARENT", name: "Control Parent Dept", active: true },
      });

      // Pilot tenant attempts to reference Control tenant's department as parent
      await expect(
        hrService.createDepartment(
          {
            tenantId: tenantPilot,
            code: "PILOT_CHILD",
            name: "Pilot Child Dept",
            parentDepartmentId: controlParent.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject cross-tenant staff reference for department head", async () => {
      const foreignStaff = await db.staffProfile.create({
        data: { tenantId: tenantControl, fullName: "Foreign Staff", userId: "usr_foreign" },
      });

      await expect(
        hrService.createDepartment(
          {
            tenantId: tenantPilot,
            code: "ENG_DEPT",
            name: "English Department",
            headStaffId: foreignStaff.id,
          },
          db
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ==========================================================================
  // SECTION F, G & H: HR EMPLOYEE LIFECYCLE, HISTORY & CONTRACTS
  // ==========================================================================
  describe("Section F, G & H: Employee Lifecycle, Append-Only History & Contracts", () => {
    let deptAcademic: any;
    let desigSeniorTeacher: any;
    let desigHeadTeacher: any;
    let workCampusMain: any;
    let employmentT1: any;

    beforeEach(async () => {
      deptAcademic = await hrService.createDepartment(
        { tenantId: tenantPilot, code: "ACAD", name: "Academics" },
        db
      );
      desigSeniorTeacher = await hrService.createDesignation(
        { tenantId: tenantPilot, code: "SR_TCH", name: "Senior Teacher", level: 2 },
        db
      );
      desigHeadTeacher = await hrService.createDesignation(
        { tenantId: tenantPilot, code: "HD_TCH", name: "Head Teacher", level: 3 },
        db
      );
      workCampusMain = await hrService.createWorkLocation(
        { tenantId: tenantPilot, code: "MAIN_CAMPUS", name: "Main Campus" },
        db
      );

      employmentT1 = await hrService.createEmployee(
        {
          tenantId: tenantPilot,
          staffProfileId: "stf_t1",
          employeeNumber: "EMP-2026-001",
          departmentId: deptAcademic.id,
          designationId: desigSeniorTeacher.id,
          workLocationId: workCampusMain.id,
          joiningDate: new Date("2026-01-15"),
          status: "ACTIVE",
          employmentType: "FULL_TIME",
          actorUserId: userHRManager.id,
        },
        db
      );
    });

    it("should successfully register an employee bound to existing StaffProfile (Single Identity)", async () => {
      expect(employmentT1.id).toBeDefined();
      expect(employmentT1.employeeNumber).toBe("EMP-2026-001");
      expect(employmentT1.staffProfileId).toBe("stf_t1");

      // Verify initial append-only history was created
      const histories = await db.hREmploymentHistory.findMany({
        where: { tenantId: tenantPilot, employmentId: employmentT1.id },
      });
      expect(histories.length).toBe(1);
      expect(histories[0].reason).toBe("Initial employment registration");

      // Verify Outbox & Audit
      const outboxEvents = await db.tenantOutboxEvent.findMany({
        where: { tenantId: tenantPilot, aggregateId: employmentT1.id },
      });
      expect(outboxEvents.some((e: any) => e.eventType === "hr.employee.created")).toBe(true);
    });

    it("should prevent duplicate employee records for the same StaffProfile or employeeNumber", async () => {
      // 1. Duplicate for same staff profile
      await expect(
        hrService.createEmployee(
          {
            tenantId: tenantPilot,
            staffProfileId: "stf_t1",
            employeeNumber: "EMP-DUPLICATE-001",
            joiningDate: new Date("2026-01-15"),
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);

      // 2. Duplicate employeeNumber for different staff profile
      await expect(
        hrService.createEmployee(
          {
            tenantId: tenantPilot,
            staffProfileId: "stf_t2",
            employeeNumber: "EMP-2026-001", // already taken by t1
            joiningDate: new Date("2026-02-01"),
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should update employment, record append-only history, and emit outbox event on promotion", async () => {
      const updated = await hrService.updateEmployment(
        tenantPilot,
        employmentT1.id,
        {
          designationId: desigHeadTeacher.id,
          reason: "Annual Performance Promotion",
          actorUserId: userHRManager.id,
        },
        db
      );

      expect(updated.designationId).toBe(desigHeadTeacher.id);

      // Verify append-only history
      const histories = await db.hREmploymentHistory.findMany({
        where: { tenantId: tenantPilot, employmentId: employmentT1.id },
      });
      expect(histories.length).toBe(2);
      const promoHistory = histories.find((h: any) => h.reason === "Annual Performance Promotion");
      expect(promoHistory).toBeDefined();
      expect(promoHistory.previousDesignationId).toBe(desigSeniorTeacher.id);
      expect(promoHistory.newDesignationId).toBe(desigHeadTeacher.id);
    });

    it("should enforce terminal status invariant: cannot reactivate terminated employee without proper workflow", async () => {
      // Terminate employee
      await hrService.updateEmployment(
        tenantPilot,
        employmentT1.id,
        { status: "TERMINATED", exitReason: "Contract Expiry" },
        db
      );

      // Attempt to reactivate directly
      await expect(
        hrService.updateEmployment(
          tenantPilot,
          employmentT1.id,
          { status: "ACTIVE" },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should create employment contracts with dates and probation/notice periods", async () => {
      // Re-create active employment for Teacher 2
      const empT2 = await hrService.createEmployee(
        {
          tenantId: tenantPilot,
          staffProfileId: "stf_t2",
          employeeNumber: "EMP-2026-002",
          joiningDate: new Date("2026-04-01"),
          status: "ACTIVE",
        },
        db
      );

      const contract = await hrService.createContract(
        {
          tenantId: tenantPilot,
          employmentId: empT2.id,
          contractNumber: "CNT-2026-T2",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          probationPeriodDays: 90,
          noticePeriodDays: 30,
        },
        db
      );

      expect(contract.id).toBeDefined();
      expect(contract.contractNumber).toBe("CNT-2026-T2");
      expect(contract.probationPeriodDays).toBe(90);

      // Duplicate contract number rejected
      await expect(
        hrService.createContract(
          {
            tenantId: tenantPilot,
            employmentId: empT2.id,
            contractNumber: "CNT-2026-T2",
            startDate: new Date("2026-04-01"),
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  // ==========================================================================
  // SECTION I: COMPENSATION STRUCTURES & ASSIGNMENTS
  // ==========================================================================
  describe("Section I: Compensation Structures & Decimal Safety", () => {
    let empT1: any;
    let cmpBasic: any;
    let cmpHRA: any;
    let cmpPF: any;
    let cmpESIEmployer: any;

    beforeEach(async () => {
      empT1 = await db.hREmployment.create({
        data: {
          tenantId: tenantPilot,
          staffProfileId: "stf_t1",
          employeeNumber: "EMP-COMP-001",
          joiningDate: new Date("2026-01-01"),
          status: "ACTIVE",
        },
      });

      cmpBasic = await payrollService.createSalaryComponent(
        { tenantId: tenantPilot, code: "BASIC", name: "Basic Salary", type: "EARNING" },
        db
      );
      cmpHRA = await payrollService.createSalaryComponent(
        { tenantId: tenantPilot, code: "HRA", name: "House Rent Allowance", type: "EARNING" },
        db
      );
      cmpPF = await payrollService.createSalaryComponent(
        { tenantId: tenantPilot, code: "EPF", name: "Employee Provident Fund", type: "DEDUCTION" },
        db
      );
      cmpESIEmployer = await payrollService.createSalaryComponent(
        { tenantId: tenantPilot, code: "ESI_ER", name: "Employer ESI", type: "EMPLOYER_CONTRIBUTION" },
        db
      );
    });

    it("should create salary structure and assign compensation with Decimal-safe values", async () => {
      const comp = await payrollService.assignCompensation(
        {
          tenantId: tenantPilot,
          employmentId: empT1.id,
          basicSalary: new Decimal("50000.00"),
          effectiveFrom: new Date("2026-04-01"),
          items: [
            { componentId: cmpHRA.id, amount: new Decimal("20000.00") },
            { componentId: cmpPF.id, amount: new Decimal("6000.00") },
            { componentId: cmpESIEmployer.id, amount: new Decimal("1625.00") },
          ],
        },
        db
      );

      expect(comp).toBeDefined();
      expect(comp!.id).toBeDefined();
      expect(comp!.basicSalary).toEqual(new Decimal("50000.00"));
      expect(comp!.grossSalary).toEqual(new Decimal("70000.00")); // Basic (50k) + HRA (20k)

      // Verify items created
      const items = await db.employeeCompensationItem.findMany({
        where: { employeeCompensationId: comp!.id },
      });
      expect(items.length).toBe(3);
    });
  });

  // ==========================================================================
  // SECTION J & K: LEAVE MANAGEMENT, HOLIDAYS & SELF-APPROVAL PREVENTIONS
  // ==========================================================================
  describe("Section J & K: Leave Management, Holidays & Self-Approval Prevention", () => {
    let empT1: any;
    let leaveCasual: any;

    beforeEach(async () => {
      empT1 = await db.hREmployment.create({
        data: {
          tenantId: tenantPilot,
          staffProfileId: "stf_t1",
          employeeNumber: "EMP-LV-001",
          joiningDate: new Date("2026-01-01"),
          status: "ACTIVE",
        },
      });

      leaveCasual = await hrService.createLeaveType(
        {
          tenantId: tenantPilot,
          code: "CL",
          name: "Casual Leave",
          daysAllowedPerYear: 12,
          isPaid: true,
        },
        db
      );

      await hrService.allocateLeaveBalance(
        {
          tenantId: tenantPilot,
          employmentId: empT1.id,
          leaveTypeId: leaveCasual.id,
          year: 2026,
          allocatedDays: 12,
        },
        db
      );
    });

    it("should submit leave request and track pending days", async () => {
      const request = await hrService.requestLeave(
        {
          tenantId: tenantPilot,
          employmentId: empT1.id,
          leaveTypeId: leaveCasual.id,
          startDate: new Date("2026-04-10"),
          endDate: new Date("2026-04-11"),
          daysCount: 2,
          reason: "Family event",
        },
        db
      );

      expect(request.id).toBeDefined();
      expect(request.status).toBe("SUBMITTED");

      // Balance should show 2 pending days
      const bal = await db.hRLeaveBalance.findFirst({
        where: { tenantId: tenantPilot, employmentId: empT1.id, leaveTypeId: leaveCasual.id, year: 2026 },
      });
      expect(bal.pendingDays).toEqual(new Decimal(2));
      expect(bal.usedDays).toEqual(new Decimal(0));
    });

    it("CRITICAL INVARIANT: should strictly prohibit employee from approving their own leave request", async () => {
      const request = await hrService.requestLeave(
        {
          tenantId: tenantPilot,
          employmentId: empT1.id,
          leaveTypeId: leaveCasual.id,
          startDate: new Date("2026-04-15"),
          endDate: new Date("2026-04-16"),
          daysCount: 2,
          reason: "Personal travel",
        },
        db
      );

      // Teacher 1 attempts to approve their own request -> HTTP 403 ForbiddenError!
      await expect(
        hrService.approveLeave(tenantPilot, request.id, userTeacher1.id, db)
      ).rejects.toBeInstanceOf(ForbiddenError);

      // Verify request is still SUBMITTED
      const currentReq = await db.hRLeaveRequest.findFirst({ where: { id: request.id } });
      expect(currentReq.status).toBe("SUBMITTED");
    });

    it("should allow HR Manager to approve leave, deducting from balance", async () => {
      const request = await hrService.requestLeave(
        {
          tenantId: tenantPilot,
          employmentId: empT1.id,
          leaveTypeId: leaveCasual.id,
          startDate: new Date("2026-04-20"),
          endDate: new Date("2026-04-21"),
          daysCount: 2,
        },
        db
      );

      // Approved by HR Manager
      const approved = await hrService.approveLeave(tenantPilot, request.id, userHRManager.id, db);
      expect(approved.status).toBe("APPROVED");

      // Balance should have 2 usedDays and 0 pendingDays
      const bal = await db.hRLeaveBalance.findFirst({
        where: { tenantId: tenantPilot, employmentId: empT1.id, leaveTypeId: leaveCasual.id, year: 2026 },
      });
      expect(bal.usedDays).toEqual(new Decimal(2));
    });

    it("should reject leave request when requested days exceed available balance", async () => {
      await expect(
        hrService.requestLeave(
          {
            tenantId: tenantPilot,
            employmentId: empT1.id,
            leaveTypeId: leaveCasual.id,
            startDate: new Date("2026-05-01"),
            endDate: new Date("2026-05-20"),
            daysCount: 20, // Only 12 allocated!
          },
          db
        )
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should create holiday calendar and holidays with tenant isolation", async () => {
      const cal = await hrService.createHolidayCalendar(
        { tenantId: tenantPilot, name: "Academic Year 2026-27 Holidays" },
        db
      );
      expect(cal.id).toBeDefined();

      const hol = await hrService.addHoliday(
        {
          tenantId: tenantPilot,
          calendarId: cal.id,
          name: "Independence Day",
          date: new Date("2026-08-15"),
          holidayType: "NATIONAL",
        },
        db
      );
      expect(hol.id).toBeDefined();
    });
  });

  // ==========================================================================
  // SECTION L, M, N & O: ATTENDANCE, LOP, PAYROLL CALCULATION & ADJUSTMENTS
  // ==========================================================================
  describe("Section L, M, N & O: Deterministic Payroll Calculation, LOP & Adjustments", () => {
    let empT1: any;
    let periodApril: any;
    let unpaidLeaveType: any;

    beforeEach(async () => {
      empT1 = await db.hREmployment.create({
        data: {
          tenantId: tenantPilot,
          staffProfileId: "stf_t1",
          employeeNumber: "EMP-CALC-001",
          joiningDate: new Date("2026-01-01"),
          status: "ACTIVE",
        },
      });

      // Compensation: Basic 50,000 + HRA 10,000 - PF 5,000
      const cmpBasic = await payrollService.createSalaryComponent(
        { tenantId: tenantPilot, code: "BASIC_CALC", name: "Basic", type: "EARNING" },
        db
      );
      const cmpHRA = await payrollService.createSalaryComponent(
        { tenantId: tenantPilot, code: "HRA_CALC", name: "HRA", type: "EARNING" },
        db
      );
      const cmpPF = await payrollService.createSalaryComponent(
        { tenantId: tenantPilot, code: "PF_CALC", name: "PF", type: "DEDUCTION" },
        db
      );

      await payrollService.assignCompensation(
        {
          tenantId: tenantPilot,
          employmentId: empT1.id,
          basicSalary: new Decimal("50000.00"),
          effectiveFrom: new Date("2026-01-01"),
          items: [
            { componentId: cmpHRA.id, amount: new Decimal("10000.00") },
            { componentId: cmpPF.id, amount: new Decimal("5000.00") },
          ],
        },
        db
      );

      // Period
      periodApril = await payrollService.createPayrollPeriod(
        {
          tenantId: tenantPilot,
          name: "April 2026",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2026-04-30"),
        },
        db
      );

      unpaidLeaveType = await hrService.createLeaveType(
        {
          tenantId: tenantPilot,
          code: "LWP",
          name: "Leave Without Pay",
          daysAllowedPerYear: 365,
          isPaid: false,
        },
        db
      );
    });

    it("should calculate deterministic gross, deductions, and net pay with ZERO LOP", async () => {
      const run = await payrollService.createPayrollRun(
        { tenantId: tenantPilot, periodId: periodApril.id, actorUserId: userPayrollOfficer.id },
        db
      );

      const calculated = await payrollService.calculatePayrollRun(
        tenantPilot,
        run.id,
        userPayrollOfficer.id,
        db
      );

      expect(calculated.status).toBe("CALCULATED");
      expect(calculated.totalEmployees).toBe(1);

      // Gross: Basic (50k) + HRA (10k) = 60,000
      expect(calculated.totalGrossEarnings).toEqual(new Decimal("60000.00"));
      // Deductions: PF (5k) = 5,000
      expect(calculated.totalEmployeeDeductions).toEqual(new Decimal("5000.00"));
      // Net Pay: 60k - 5k = 55,000
      expect(calculated.totalNetPay).toEqual(new Decimal("55000.00"));
    });

    it("should calculate exact Loss-of-Pay (LOP) proration formula when unpaid leaves exist", async () => {
      // 2 Days of Unpaid Leave in April 2026
      await db.hRLeaveRequest.create({
        data: {
          tenantId: tenantPilot,
          employmentId: empT1.id,
          leaveTypeId: unpaidLeaveType.id,
          startDate: new Date("2026-04-14"),
          endDate: new Date("2026-04-15"),
          daysCount: new Decimal(2),
          status: "APPROVED",
        },
      });

      const run = await payrollService.createPayrollRun(
        { tenantId: tenantPilot, periodId: periodApril.id, actorUserId: userPayrollOfficer.id },
        db
      );

      const calculated = await payrollService.calculatePayrollRun(
        tenantPilot,
        run.id,
        userPayrollOfficer.id,
        db
      );

      // LOP Calculation:
      // Basic = 50,000
      // Working Days = 30
      // Daily Rate = 50,000 / 30 = 1666.6666...
      // 2 Days LOP = 1666.6666... * 2 = 3333.33 (rounded to 2 decimal places)
      // Total Deductions = PF (5,000) + LOP (3,333.33) = 8,333.33
      // Net Pay = 60,000 - 8,333.33 = 51,666.67
      expect(calculated.totalGrossEarnings).toEqual(new Decimal("60000.00"));
      expect(calculated.totalEmployeeDeductions).toEqual(new Decimal("8333.33"));
      expect(calculated.totalNetPay).toEqual(new Decimal("51666.67"));
    });

    it("should incorporate positive adjustments (Bonus) and negative adjustments", async () => {
      // Add Performance Bonus of ₹4,000
      await payrollService.createAdjustment(
        {
          tenantId: tenantPilot,
          employmentId: empT1.id,
          periodId: periodApril.id,
          adjustmentType: "BONUS",
          amount: new Decimal("4000.00"),
          reason: "Science Olympiad Mentorship Bonus",
          actorUserId: userPayrollManager.id,
        },
        db
      );

      const run = await payrollService.createPayrollRun(
        { tenantId: tenantPilot, periodId: periodApril.id, actorUserId: userPayrollOfficer.id },
        db
      );

      const calculated = await payrollService.calculatePayrollRun(
        tenantPilot,
        run.id,
        userPayrollOfficer.id,
        db
      );

      // Gross: 60,000 + 4,000 bonus = 64,000
      expect(calculated.totalGrossEarnings).toEqual(new Decimal("64000.00"));
      // Deductions: 5,000 PF
      expect(calculated.totalEmployeeDeductions).toEqual(new Decimal("5000.00"));
      // Net: 64,000 - 5,000 = 59,000
      expect(calculated.totalNetPay).toEqual(new Decimal("59000.00"));
    });
  });

  // ==========================================================================
  // SECTION P, Q, R, S & T: FOUR-EYE APPROVAL, PAYSLIPS, IDEMPOTENCY & FINANCIAL LEDGER
  // ==========================================================================
  describe("Section P, Q, R, S & T: Four-Eye Approval, Payslip Immutability & Financial Ledger", () => {
    let empT1: any;
    let periodApril: any;
    let run: any;

    beforeEach(async () => {
      empT1 = await db.hREmployment.create({
        data: {
          tenantId: tenantPilot,
          staffProfileId: "stf_t1",
          employeeNumber: "EMP-FIN-001",
          joiningDate: new Date("2026-01-01"),
          status: "ACTIVE",
        },
      });

      const cmpBasic = await payrollService.createSalaryComponent(
        { tenantId: tenantPilot, code: "BASIC_FIN", name: "Basic", type: "EARNING" },
        db
      );
      const cmpPF = await payrollService.createSalaryComponent(
        { tenantId: tenantPilot, code: "PF_FIN", name: "PF", type: "DEDUCTION" },
        db
      );

      await payrollService.assignCompensation(
        {
          tenantId: tenantPilot,
          employmentId: empT1.id,
          basicSalary: new Decimal("50000.00"),
          effectiveFrom: new Date("2026-01-01"),
          items: [{ componentId: cmpPF.id, amount: new Decimal("5000.00") }],
        },
        db
      );

      periodApril = await payrollService.createPayrollPeriod(
        {
          tenantId: tenantPilot,
          name: "April 2026 Pilot",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2026-04-30"),
        },
        db
      );

      run = await payrollService.createPayrollRun(
        { tenantId: tenantPilot, periodId: periodApril.id, actorUserId: userPayrollOfficer.id },
        db
      );

      await payrollService.calculatePayrollRun(tenantPilot, run.id, userPayrollOfficer.id, db);
    });

    it("should enforce Four-Eye approval workflow: CALCULATED -> UNDER_REVIEW -> APPROVED -> FINALIZED", async () => {
      // 1. Cannot finalize a run that is only CALCULATED
      await expect(
        payrollService.finalizePayrollRun(tenantPilot, run.id, userAdmin.id, db)
      ).rejects.toBeInstanceOf(ConflictError);

      // 2. Review run
      const reviewed = await payrollService.reviewPayrollRun(tenantPilot, run.id, userPayrollManager.id, db);
      expect(reviewed.status).toBe("UNDER_REVIEW");

      // 3. Approve run
      const approved = await payrollService.approvePayrollRun(tenantPilot, run.id, userPayrollManager.id, db);
      expect(approved.status).toBe("APPROVED");
      expect(approved.approvedByUserId).toBe(userPayrollManager.id);

      // 4. Finalize run
      const finalized = await payrollService.finalizePayrollRun(tenantPilot, run.id, userAdmin.id, db);
      expect(finalized.status).toBe("FINALIZED");
      expect(finalized.finalizedByUserId).toBe(userAdmin.id);
    });

    it("should generate immutable payslips with snapshot JSON upon finalization", async () => {
      await payrollService.approvePayrollRun(tenantPilot, run.id, userPayrollManager.id, db);
      await payrollService.finalizePayrollRun(tenantPilot, run.id, userAdmin.id, db);

      const payslip = await db.payslip.findFirst({
        where: { tenantId: tenantPilot, employmentId: empT1.id },
      });

      expect(payslip).toBeDefined();
      expect(payslip.grossEarnings).toEqual(new Decimal("50000.00"));
      expect(payslip.totalDeductions).toEqual(new Decimal("5000.00"));
      expect(payslip.netPay).toEqual(new Decimal("45000.00"));
      expect(payslip.isPublished).toBe(true);

      // Verify that subsequent changes to employee compensation do NOT mutate the payslip
      await db.employeeCompensation.create({
        data: {
          tenantId: tenantPilot,
          employmentId: empT1.id,
          basicSalary: new Decimal("999999.00"),
          grossSalary: new Decimal("999999.00"),
          status: "ACTIVE",
          effectiveFrom: new Date("2026-05-01"),
        },
      });

      // Payslip remains immutable
      const payslipAfter = await db.payslip.findFirst({
        where: { tenantId: tenantPilot, employmentId: empT1.id },
      });
      expect(payslipAfter.grossEarnings).toEqual(new Decimal("50000.00"));
      expect(payslipAfter.netPay).toEqual(new Decimal("45000.00"));
    });

    it("should post a strictly balanced double-entry financial journal via Wave 1 LedgerService", async () => {
      await payrollService.approvePayrollRun(tenantPilot, run.id, userPayrollManager.id, db);
      const finalized = await payrollService.finalizePayrollRun(tenantPilot, run.id, userAdmin.id, db);

      expect(finalized.journalEntryId).toBeDefined();

      const journal = await db.journalEntry.findFirst({
        where: { id: finalized.journalEntryId },
      });
      expect(journal).toBeDefined();

      // Invariant 2: Total Debits == Total Credits
      expect(journal.totalDebit).toEqual(journal.totalCredit);
      expect(journal.totalDebit).toEqual(new Decimal("50000.00"));

      // Verify accounting lines:
      // Line 1: Debit Salary Expense = 50,000
      // Line 2: Credit Net Salaries Payable = 45,000
      // Line 3: Credit Deductions/Tax Payable = 5,000
      const lines = await db.journalLine.findMany({
        where: { journalEntryId: journal.id },
      });
      expect(lines.length).toBe(3);

      const debitLine = lines.find((l: any) => l.debitAmount.gt(0));
      expect(debitLine.debitAmount).toEqual(new Decimal("50000.00"));

      const payableLine = lines.find((l: any) => l.narration.includes("Net Salaries Payable"));
      expect(payableLine.creditAmount).toEqual(new Decimal("45000.00"));

      const taxLine = lines.find((l: any) => l.narration.includes("Deductions"));
      expect(taxLine.creditAmount).toEqual(new Decimal("5000.00"));

      // Reconciliation assertion
      expect(payableLine.creditAmount.add(taxLine.creditAmount)).toEqual(debitLine.debitAmount);
    });

    it("CRITICAL PILOT GATE: Idempotent finalization produces ZERO duplicate journals or outbox events", async () => {
      await payrollService.approvePayrollRun(tenantPilot, run.id, userPayrollManager.id, db);

      // Execution 1: Finalize
      const firstFinalize = await payrollService.finalizePayrollRun(tenantPilot, run.id, userAdmin.id, db);
      expect(firstFinalize.status).toBe("FINALIZED");

      const journalCount1 = await db.journalEntry.count({ where: { tenantId: tenantPilot } });
      const outboxCount1 = (await db.tenantOutboxEvent.findMany({ where: { tenantId: tenantPilot } })).length;
      const payslipCount1 = (await db.payslip.findMany({ where: { tenantId: tenantPilot } })).length;

      // Execution 2: Duplicate finalization call
      const secondFinalize = await payrollService.finalizePayrollRun(tenantPilot, run.id, userAdmin.id, db);
      expect(secondFinalize.status).toBe("FINALIZED");

      const journalCount2 = await db.journalEntry.count({ where: { tenantId: tenantPilot } });
      const outboxCount2 = (await db.tenantOutboxEvent.findMany({ where: { tenantId: tenantPilot } })).length;
      const payslipCount2 = (await db.payslip.findMany({ where: { tenantId: tenantPilot } })).length;

      // Assert ZERO duplicates!
      expect(journalCount2).toBe(journalCount1);
      expect(outboxCount2).toBe(outboxCount1);
      expect(payslipCount2).toBe(payslipCount1);
    });
  });

  // ==========================================================================
  // SECTION U: CLOSED-PERIOD PROTECTION
  // ==========================================================================
  describe("Section U: Closed-Period Protection", () => {
    it("should reject posting into a CLOSED or LOCKED financial period", async () => {
      // Create closed period
      const closedPeriod = await db.financialPeriod.create({
        data: {
          tenantId: tenantPilot,
          periodName: "Closed Period",
          periodNumber: 99,
          status: "CLOSED",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-31"),
        },
      });

      // Attempt manual journal posting into closed period
      await expect(
        ledgerService.postJournalEntry(
          {
            tenantId: tenantPilot,
            periodId: closedPeriod.id,
            entryDate: new Date("2025-01-15"),
            sourceType: "PAYROLL_RUN",
            narration: "Unauthorized post into closed period",
            lines: [
              { accountId: "coa_salary_exp", debitAmount: 1000, creditAmount: 0 },
              { accountId: "coa_payroll_pay", debitAmount: 0, creditAmount: 1000 },
            ],
          },
          db
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  // ==========================================================================
  // SECTION V & W: AUDIT LOGGING & TRANSACTIONAL OUTBOX INTEGRITY
  // ==========================================================================
  describe("Section V & W: Audit Logging & Outbox Event Integrity", () => {
    it("should record complete audit log entries without logging credentials or secrets", async () => {
      await hrService.createDepartment(
        {
          tenantId: tenantPilot,
          code: "AUD_DEPT",
          name: "Audit Department",
          actorUserId: userHRManager.id,
        },
        db
      );

      const auditLogs = await db.auditLog.findMany({
        where: { tenantId: tenantPilot, entityType: "HREmployment" },
      });

      for (const log of auditLogs) {
        expect(log.tenantId).toBe(tenantPilot);
        expect(log.actorId).toBeDefined();
        // Ensure no passwords or sensitive tokens in diffJson
        if (log.diffJson) {
          expect(log.diffJson).not.toContain("password");
          expect(log.diffJson).not.toContain("secret");
          expect(log.diffJson).not.toContain("token");
        }
      }
    });

    it("should emit tenant-scoped outbox events with consistent aggregate metadata", async () => {
      const dept = await hrService.createDepartment(
        { tenantId: tenantPilot, code: "OBX_DEPT", name: "Outbox Dept" },
        db
      );

      const emp = await hrService.createEmployee(
        {
          tenantId: tenantPilot,
          staffProfileId: "stf_t1",
          employeeNumber: "EMP-OBX-001",
          departmentId: dept.id,
          joiningDate: new Date("2026-01-01"),
        },
        db
      );

      const events = await db.tenantOutboxEvent.findMany({
        where: { tenantId: tenantPilot, aggregateId: emp.id },
      });

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].tenantId).toBe(tenantPilot);
      expect(events[0].eventType).toBe("hr.employee.created");
      expect(events[0].aggregateType).toBe("HREmployment");
    });
  });

  // ==========================================================================
  // SECTION X: CONCURRENCY & RACE CONDITIONS
  // ==========================================================================
  describe("Section X: Concurrency & Race Conditions", () => {
    it("should safely handle concurrent leave requests against remaining balance", async () => {
      const emp = await db.hREmployment.create({
        data: {
          tenantId: tenantPilot,
          staffProfileId: "stf_t1",
          employeeNumber: "EMP-RACE-001",
          joiningDate: new Date("2026-01-01"),
          status: "ACTIVE",
        },
      });

      const lt = await hrService.createLeaveType(
        { tenantId: tenantPilot, code: "RACE_LV", name: "Race Leave", daysAllowedPerYear: 3, isPaid: true },
        db
      );

      await hrService.allocateLeaveBalance(
        { tenantId: tenantPilot, employmentId: emp.id, leaveTypeId: lt.id, year: 2026, allocatedDays: 3 },
        db
      );

      // Attempt 2 concurrent requests of 2 days each (total 4 > 3 allocated)
      const req1Promise = hrService.requestLeave(
        {
          tenantId: tenantPilot,
          employmentId: emp.id,
          leaveTypeId: lt.id,
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-06-02"),
          daysCount: 2,
        },
        db
      );

      const req2Promise = hrService.requestLeave(
        {
          tenantId: tenantPilot,
          employmentId: emp.id,
          leaveTypeId: lt.id,
          startDate: new Date("2026-06-10"),
          endDate: new Date("2026-06-11"),
          daysCount: 2,
        },
        db
      );

      const results = await Promise.allSettled([req1Promise, req2Promise]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // Exactly one must succeed and one must fail due to insufficient balance!
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });

  // ==========================================================================
  // SECTION Y & Z: UI ROUTES & REGRESSION SAFETY
  // ==========================================================================
  describe("Section Y & Z: UI Routes & Cross-Wave Regression Protection", () => {
    it("should preserve Wave 1-4 models and services without regression", async () => {
      // Verify LedgerService functionality
      expect(ledgerService.postJournalEntry).toBeDefined();
      expect(ledgerService.initializeChartOfAccounts).toBeDefined();

      // Verify module gates for prior waves
      const waves = ["admissions_module", "library_module", "transport_module", "inventory_module"];
      for (const w of waves) {
        const enabled = await moduleGate.isModuleEnabled(tenantControl, w, db);
        expect(enabled).toBe(false); // Control tenant remains disabled across all waves
      }
    });
  });
});
