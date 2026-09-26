# Step 4B Database Foundation & Migration Rehearsal Architecture

**Document ID**: `docs/database/20-step-4b-database-foundation.md`  
**Status**: `IMPLEMENTED & REHEARSED` (Target Schema Validated, Production Migration Deferred)  
**Target SaaS Environment**: SchoolyardSMS Multi-Tenant Education SaaS  
**Author**: Antigravity DeepMind Agent  

---

## 1. Executive Summary & Status Classification

Step 4B establishes the operational database foundation required to transition SchoolyardSMS from a legacy single-tenant prototype with 14 global models into a production-grade multi-tenant educational SaaS platform with 46 target models across 6 control/data planes.

### Operational State Labels
- **Legacy Schema**: `CURRENT (OPERATIONAL)` — Located in `prisma/schema.prisma`. Powers existing prototype RSC pages and Server Actions until Step 4E cutover.
- **Target Schema**: `TARGET (VALIDATED & COMPILED)` — Located in `prisma/schema.target.prisma`. Generates `@/generated/target-client` via `npm run prisma:generate:target`.
- **Migration SQL**: `REHEARSED & REVIEWED` — Located in `prisma/migrations/20260925_expand_target_schema/migration.sql` (additive expand phase) and `rollback.sql`.
- **Live Production Database**: `NOT YET EXECUTED IN PRODUCTION` — The target migration has been rehearsed against disposable and test fixtures; live production execution is gated behind deployment sign-off.

---

## 2. Schema Inventory: Baseline vs. Target

| Dimension | Baseline (Legacy Step 0) | Target SaaS (Step 4B Target) | Delta & Impact |
| :--- | :--- | :--- | :--- |
| **Model Count** | 14 global models | 46 tenant-scoped models | +32 models (Plane 1-6 architecture) |
| **Multi-Tenancy** | 0 models with `tenantId` | All domain tables enforce `tenantId` | Tenant isolation guaranteed at DB level |
| **Primary Keys** | `Int` (Autoincrement) / `String` mixed | Canonical `cuid()` across all entities | Distributed ID generation & predictability |
| **Authorization** | Zero DB RBAC (unverified Clerk role) | Dynamic RBAC (Roles, Permissions, Scopes) | 68 atomic permissions, 6 default roles |
| **Identity** | Implicit user records per table | Unified `User` model + `TenantMembership` | Multi-institution user bindings supported |
| **Audit Logging** | 0 audit logs | Immutable `AuditLog` table with IP & user agent | Compliance-ready audit trails |
| **Module Licensing**| All features global | `TenantModuleEntitlement` feature flags | Tiered monetization (Starter/Pro/Enterprise) |

---

## 3. Migration Architecture: The Expand-and-Contract Pattern

In accordance with architectural invariant ADR-014 and AGENTS.md, zero destructive schema alterations are permitted in the initial migration.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: EXPAND (Implemented in Step 4B)                    │
│ - Apply 20260925_expand_target_schema/migration.sql         │
│ - Create 46 new target tables with tenantId foreign keys    │
│ - Zero columns dropped; zero legacy tables modified         │
│ - Both legacy & target tables coexist in database           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 2: ETL & BACKFILL (Rehearsed in Step 4B)              │
│ - Execute scripts/migrate-legacy-to-target.ts               │
│ - Map 14 legacy models into target multi-tenant records     │
│ - Assign default institution tenantId                       │
│ - Validate integrity with scripts/reconcile-migration.ts    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 3: PARALLEL RUN & SHADOW WRITES (Step 4C/4D)          │
│ - Dual-write or forward mutations to target plane           │
│ - Tenant resolution & RBAC validation active                │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 4: CUTOVER (Step 4E)                                  │
│ - Swap prisma/schema.prisma to target schema                │
│ - Switch application reads and writes exclusively to target │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 5: CONTRACT (Post-Verification)                       │
│ - Drop legacy single-tenant tables after backup verification│
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Rehearsal & Verification Tooling

Step 4B provides deterministic automation scripts committed directly to source control:

### 4.1 Prisma Client Generation
```bash
# Generate legacy client for existing app
npm run prisma:generate

# Generate target client for migration engine & target services
npm run prisma:generate:target
```

### 4.2 Seed Infrastructure
```bash
# Seed Tier 1 (Modules, Permissions, Roles, Plans) and Tier 2 (Demo Academy)
npm run seed:target
```
- **Idempotency**: Uses compound `upsert` queries to ensure reruns produce 0 duplicates.
- **Security**: No secrets or live Clerk tokens stored in seed definitions.

### 4.3 Legacy-to-Target Data Migration
```bash
# Execute deterministic ETL from legacy tables to target tables
npm run migrate:rehearse
```
- Maps all 14 legacy entities to target counterparts.
- Enforces normalized blood group enums (`A_POS`, `B_POS`, etc.).
- Maps boolean attendance to rich `AttendanceStatus` enums.
- Links students to class enrollments with sequential roll numbers.

### 4.4 Data Reconciliation Audit
```bash
# Validate row counts and integrity invariants
npm run reconcile:target
```
Asserts:
1. Student counts match StudentProfile counts exactly.
2. Parent counts match ParentProfile counts exactly.
3. Attendance counts match AttendanceRecord counts exactly.
4. Exam marks match ExamResult counts exactly.
5. Zero orphaned enrollments, parent bindings, or unassigned records exist.

---

## 5. Backup & Restore Rehearsal Runbook

### 5.1 Pre-Migration Snapshot (PostgreSQL)
```bash
# Create timestamped binary snapshot
pg_dump -Fc -v \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -f "backups/pre_target_migration_$(date +%Y%m%d_%H%M%S).dump"
```

### 5.2 Snapshot Restoration Drill
```bash
# Terminate existing connections to test database
psql -U "${DB_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'justezy_drill';"

# Drop and recreate drill database
dropdb -U "${DB_USER}" justezy_drill
createdb -U "${DB_USER}" justezy_drill

# Restore binary snapshot
pg_restore -v -O \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d justezy_drill \
  "backups/pre_target_migration_snapshot.dump"
```

---

## 6. Migration Rollback Strategy

Prisma migrations do not support automated down migrations by default. Step 4B provides explicit rollback categorization:

### Class A: Reversible Additive Operations (Expand Phase)
Because Phase 1 is purely additive, rollback is accomplished by executing the reviewed rollback SQL script:
```bash
psql -U "${DB_USER}" -d "${DB_NAME}" -f prisma/migrations/20260925_expand_target_schema/rollback.sql
```
- Drops only the 46 newly created target tables.
- Preserves all 14 legacy tables and their live data completely untouched.

### Class B: Irreversible Data Alterations (Contraction Phase)
- When legacy tables are dropped in Phase 5, rollback is impossible without database restoration.
- **Rule**: Phase 5 requires pre-execution snapshot verification, 7-day shadow operation, and operator approval.
