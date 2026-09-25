# 15 — Database Multi-Tenant Isolation Strategy Evaluation

## 1. Executive Summary & Strategy Selection

**Status**: TARGET / SPECIFICATION  
**Scope**: Isolation Strategy for Multi-Tenant Data in PostgreSQL.

This document formally evaluates the three architectural paradigms for tenant data isolation in multi-tenant PostgreSQL systems:
1. **Option A**: Application-Level Tenant Scoping (Prisma Client Extensions + `AsyncLocalStorage`).
2. **Option B**: Database-Level PostgreSQL Row-Level Security (RLS) with Session Variables.
3. **Option C**: Hybrid Defense-in-Depth (Application Scoping + Native Database RLS).

**FINAL DECISION: OPTION C — HYBRID DEFENSE-IN-DEPTH (with Phase 1 Application Scoping as Core Baseline)**.

---

## 2. Comparative Evaluation Matrix

| Architectural Dimension | Option A: Application Scoping (Prisma Extension) | Option B: Pure PostgreSQL RLS (`SET LOCAL`) | Option C: Hybrid Defense-in-Depth |
| :--- | :--- | :--- | :--- |
| **Security Boundary** | High (in application runtime). Risk: raw SQL bypasses extension. | Highest (enforced at SQL engine level). | **Maximum**: Enforced at both application and database engine layers. |
| **Connection Pooling Compatibility** | **100% Compatible** with transaction-mode pooling (PgBouncer, Supabase Pooler, AWS RDS Proxy). | **High Risk**: Session variables (`SET app.tenant_id`) can leak across pooled connections unless reset on every transaction. | **Compatible**: Uses transaction-scoped `SET LOCAL` or application extension. |
| **Prisma ORM Ergonomics** | Native `prisma.$extends()` with query middleware. Type-safe and transparent. | Awkward: Requires wrapping every query in interactive transactions to set session variables. | Prisma client handles automatic filtering; RLS acts as a hard backstop. |
| **Development & Test Velocity** | Fast: Unit and integration tests run easily against in-memory or standard PostgreSQL instances. | Slower: Every test must mock database session roles and connection variables. | Development tests run via Prisma; security tests validate RLS rejection. |
| **Operational & Migration Risk** | Low: Standard migrations; no complex SQL function dependencies. | High: Complex RLS policies can impact query plans and prevent index scans if poorly tuned. | Phased rollout reduces blast radius. |

---

## 3. Detailed Strategy Specifications

### 3.1 Option A: Application-Level Tenant Scoping (The Primary Engine)
- **Mechanism**:
  - Request middleware extracts verified `tenantId` from hostname/subdomain and injects it into Node.js `AsyncLocalStorage`.
  - A Prisma Client Extension (`prisma.$extends()`) intercepts every model query:
    ```typescript
    // Conceptual Prisma Extension Hook
    export const tenantPrisma = prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = getTenantContext();
            if (isTenantModel(model) && tenantId) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
        },
      },
    });
    ```
- **Advantages**: Completely transparent to service layer code; 0% connection pool contamination risk; full TypeScript type-safety.

### 3.2 Option B: PostgreSQL Row-Level Security (The Security Backstop)
- **Mechanism**:
  - PostgreSQL tables declare `ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;`.
  - Policy:
    ```sql
    CREATE POLICY tenant_isolation_policy ON "StudentProfile"
      USING (tenant_id = current_setting('app.current_tenant_id', true));
    ```
- **Connection Pool Caveat**:
  - In serverless environments (Next.js on Vercel/Node.js) using transaction-mode PgBouncer, global `SET app.current_tenant_id` is dangerous because a connection returned to the pool might retain Tenant A's ID and serve Tenant B.
  - Therefore, RLS MUST strictly use **`SET LOCAL app.current_tenant_id`** inside an explicit transaction block, which automatically clears the variable upon transaction commit or rollback.

---

## 4. Phase Rollout Architecture

To deliver the highest security without slowing down development or risking connection leaks:

```
[ Phase 1: V1 Core ] ──► Application Scoping via Prisma Client Extension & AsyncLocalStorage
                         - Guaranteed tenantId injection on all queries.
                         - Composite unique constraints and foreign keys.
                         - Automated security integration tests asserting cross-tenant query rejection.

[ Phase 2: Production Hardening ] ──► Layer Native PostgreSQL RLS Backstop
                         - Enable RLS policies on critical PII tables (StudentProfile, StaffProfile, ExamResult).
                         - Enforce SET LOCAL in dedicated Prisma transaction extensions.
```

This hybrid strategy ensures that an accidental omission of a `where: { tenantId }` in raw service code is immediately blocked by PostgreSQL RLS, providing absolute protection against cross-tenant data leaks.
