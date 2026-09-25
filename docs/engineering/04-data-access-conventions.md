# Data Access Conventions & Query Standards

## 1. Core Data Access Law: Universal Tenant Scoping

**Status**: DECISION

Every database query touching tenant-owned domain entities MUST be scoped to the verified `tenantId`.

```typescript
// PROHIBITED: Unscoped Global Query (Vulnerable to cross-tenant leakage)
const student = await prisma.student.findUnique({
  where: { id: studentId }
});

// MANDATORY CONVENTION: Tenant-Scoped Query
const student = await prisma.student.findFirstOrThrow({
  where: { 
    id: studentId,
    tenantId: ctx.tenantId 
  }
});
```

---

## 2. Prisma Client Extension for Automatic Scoping

**Status**: TARGET / PROPOSED

To provide defense-in-depth against accidental developer omission of `tenantId`, the application initializes an extended Prisma client using `$extends`:

```typescript
// TARGET / PROPOSED: src/lib/prisma.ts
export const getScopedPrisma = (tenantId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, tenantId };
          return query(args);
        },
      },
    },
  });
};
```

---

## 3. Transaction Guidelines & Avoiding N+1 Queries

1. **Explicit Interactive Transactions**:
   - Multi-step operations (e.g. creating a student, linking a parent, and writing an audit log) MUST be wrapped in `prisma.$transaction(async (tx) => { ... })`.
2. **Preventing N+1 Hazards**:
   - Sourced from `14-performance-scalability.md`. When loading relational entities (e.g. classes with teachers and subjects), use Prisma's `include` or `select` joins rather than iterating and querying in a loop:
   ```typescript
   // CORRECT: Single SQL query with relational joins
   const classes = await prisma.class.findMany({
     where: { tenantId: ctx.tenantId },
     include: {
       supervisor: { select: { id: true, name: true, surname: true } },
       _count: { select: { students: true } },
     },
   });
   ```

---

## 4. Standardized Pagination Conventions

All list views enforce pagination to prevent server memory exhaustion:
- **Default Page Size**: 10 records per page (configurable up to a maximum limit of 50).
- **Pagination Shape**:
  ```typescript
  export interface PaginatedResult<T> {
    data: T[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }
  ```
