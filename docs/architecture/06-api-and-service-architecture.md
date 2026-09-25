# API & Service Layer Architecture

## 1. Architectural Strategy: Hybrid Presentation with Unified Domain Services

**Status**: TARGET / PROPOSED

To balance high-performance server-side rendering with clean separation of concerns, the platform adopts a **Hybrid Presentation Layer** backed by a **Unified Domain Service Layer**.

```
+--------------------------------------------------------------------------+
|                            PRESENTATION TIER                             |
|                                                                          |
|  +------------------------+  +-------------------+  +-----------------+  |
|  | React Server Component |  |   Server Action   |  |  Route Handler  |  |
|  |  (Fast Data Reads /    |  |  (UI Form Mut-    |  |  (Webhooks /    |  |
|  |   SSR Layouts)         |  |   ations & Edits) |  |   Public APIs)  |  |
|  +------------------------+  +-------------------+  +-----------------+  |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
|                          GUARD & CONTEXT TIER                            |
|  - Server-Side Tenant Resolution (AsyncLocalStorage context)             |
|  - Authentication Guard (Clerk JWT validation)                           |
|  - Authorization Policy Guard (DB RBAC & AccessScope evaluation)         |
|  - Module Entitlement Guard (Subscription feature check)                 |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
|                       UNIFIED DOMAIN SERVICE TIER                        |
|  - StudentService         - StaffService          - AttendanceService    |
|  - TimetableService       - ExaminationService    - AuditLogService      |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
|                     DATA ACCESS TIER (PRISMA ORM)                        |
|  - Scoped Prisma Client (automatic tenantId filtering via $extends)      |
|  - Explicit Transaction Management (prisma.$transaction)                 |
+--------------------------------------------------------------------------+
```

---

## 2. Handlers & Responsibilities

| Ingress Handler | Best Use Case | Security & Context Strategy |
| :--- | :--- | :--- |
| **React Server Components (RSC)** | High-performance read screens (dashboards, list tables, calendar views). | Calls Domain Service directly; renders HTML on server; zero client JS bundle for read logic. |
| **Server Actions** | User-driven form mutations, button clicks, modals, dialog submits. | Wrapped with `createGuardedAction()`; validates input with Zod; evaluates RBAC permissions server-side. |
| **Route Handlers (`src/app/api/...`)** | External webhooks (Clerk identity events, Razorpay payment confirmations) and mobile JSON APIs. | Cryptographic signature verification (Svix for Clerk webhooks); returns standard JSON response envelope. |

---

## 3. Unified Domain Service Layer Pattern

**Status**: TARGET / PROPOSED

UI components and handlers must never perform arbitrary inline queries across multiple models without transactional coordination. Business logic is encapsulated in dedicated Domain Services:

```typescript
// TARGET / PROPOSED: src/services/attendance.service.ts
export class AttendanceService {
  constructor(private readonly prisma: PrismaClient) {}

  async recordClassAttendance(
    tenantId: string,
    actorId: string,
    input: RecordAttendanceDTO
  ): Promise<AttendanceResult> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Verify class belongs to active tenant
      const classEntity = await tx.class.findFirstOrThrow({
        where: { id: input.classId, tenantId },
      });

      // 2. Upsert attendance records
      const records = await Promise.all(
        input.records.map((r) =>
          tx.attendance.upsert({
            where: {
              tenantId_studentId_date: {
                tenantId,
                studentId: r.studentId,
                date: input.date,
              },
            },
            create: { tenantId, ...r, date: input.date },
            update: { present: r.present },
          })
        )
      );

      // 3. Atomically write audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'ATTENDANCE_RECORDED',
          entityType: 'Attendance',
          metadata: { classId: input.classId, count: records.length },
        },
      });

      return { success: true, count: records.length };
    });
  }
}
```

---

## 4. Standard Response & Error Envelope

All Server Actions and Route Handlers adhere to a standardized contract:

```typescript
// Standard Mutation Result Type
export type ActionResponse<T = unknown> =
  | { success: true; data: T; message?: string }
  | { 
      success: false; 
      error: { 
        code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';
        message: string;
        details?: Record<string, string[]>; // Field validation errors
      } 
    };
```
