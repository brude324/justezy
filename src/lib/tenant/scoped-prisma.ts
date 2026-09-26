import { prismaTarget } from "@/lib/prisma-target";
import { requireTenantContext } from "./tenant-context";
import { CrossTenantAccessError } from "@/lib/errors";

/**
 * Authoritative set of models that belong to an individual educational institution (Tenant).
 * Derived from docs/database/03-data-ownership-and-tenancy.md
 */
export const TENANT_SCOPED_MODELS = new Set([
  "TenantPolicy",
  "TenantBranding",
  "TenantDomain",
  "TenantMembership",
  "TenantModuleEntitlement",
  "TenantInvitation",
  "AcademicYear",
  "Term",
  "Grade",
  "Class",
  "Subject",
  "ClassSubject",
  "StaffProfile",
  "StudentProfile",
  "ParentProfile",
  "StudentParentBinding",
  "StudentEnrollment",
  "StudentAcademicHistory",
  "TimetablePeriod",
  "TimetableLesson",
  "AttendanceRecord",
  "AttendanceDailySummary",
  "Exam",
  "ExamPaper",
  "GradingScheme",
  "ExamResult",
  "ReportCard",
  "Assignment",
  "AssignmentSubmission",
  "Announcement",
  "Event",
  "Notification",
  "AuditLog",
  "DocumentReference",
]);

/**
 * Returns true if the model name represents tenant-isolated domain data.
 */
export function isTenantScopedModel(modelName: string): boolean {
  return TENANT_SCOPED_MODELS.has(modelName);
}

/**
 * Creates a tenant-scoped Prisma Client extension that automatically enforces
 * tenant isolation on all reads, creates, updates, and deletes.
 *
 * Prevents cross-tenant leaks even if developers omit `where: { tenantId }`.
 */
export function getScopedPrisma(tenantId: string, baseClient = prismaTarget) {
  if (!tenantId) {
    throw new Error("A verified tenantId is required to construct a scoped Prisma client");
  }

  return baseClient.$extends({
    name: "tenant-scoping-extension",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            const data = args.data as Record<string, unknown> | undefined;
            if (data?.tenantId && data.tenantId !== tenantId) {
              throw new CrossTenantAccessError(
                `Attempted to create ${model} record for tenant '${data.tenantId}' within scoped context of tenant '${tenantId}'`
              );
            }
            args.data = { ...(data || {}), tenantId } as any;
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            if (Array.isArray(args.data)) {
              for (const item of args.data as Array<Record<string, unknown>>) {
                if (item.tenantId && item.tenantId !== tenantId) {
                  throw new CrossTenantAccessError(
                    `Attempted to batch create ${model} record for tenant '${item.tenantId}' within scoped context of tenant '${tenantId}'`
                  );
                }
                item.tenantId = tenantId;
              }
            } else if (args.data) {
              (args.data as Record<string, unknown>).tenantId = tenantId;
            }
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            const data = args.data as Record<string, unknown> | undefined;
            if (data?.tenantId && data.tenantId !== tenantId) {
              throw new CrossTenantAccessError(
                `Attempted to reassign ${model} record to foreign tenant '${data.tenantId}'`
              );
            }
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            const data = args.data as Record<string, unknown> | undefined;
            if (data?.tenantId && data.tenantId !== tenantId) {
              throw new CrossTenantAccessError(
                `Attempted to reassign ${model} records to foreign tenant '${data.tenantId}'`
              );
            }
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
      },
    },
  });
}

/**
 * Accessor that retrieves the current scoped Prisma client from the active request context.
 * Throws TenantContextMissingError if invoked outside of a verified tenant context.
 */
export function getCurrentScopedPrisma() {
  const context = requireTenantContext();
  return getScopedPrisma(context.tenant.id);
}
