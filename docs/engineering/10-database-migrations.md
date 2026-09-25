# Database Migration Strategy & Zero-Downtime Governance

## 1. Migration Command Governance

**Status**: DECISION

To prevent database corruption and build pipeline failures, the execution of Prisma migration commands is strictly governed:

| Environment | Permitted Command | Prohibited Command | Rationale |
| :--- | :--- | :--- | :--- |
| **Local Development** | `npx prisma migrate dev` | Direct DB edits without migration | Generates tracked, reviewable SQL migration files in `prisma/migrations/`. |
| **CI / Container Build** | **NONE** | `npx prisma migrate dev`<br>`npx prisma migrate deploy` | Container images must be immutable and buildable without requiring a live database connection. |
| **Staging & Production** | `npx prisma migrate deploy` | `npx prisma migrate dev`<br>`npx prisma db push` | Applies committed, verified SQL migrations deterministically during the release phase. |

---

## 2. Zero-Downtime Schema Evolution: The Expand-and-Contract Pattern

**Status**: TARGET / PROPOSED

When migrating high-impact tables (e.g. converting single-tenant tables to multi-tenant or splitting user models), migrations MUST follow the three-phase **Expand-and-Contract** pattern to avoid service downtime:

```
[ Phase 1: EXPAND ]
- Add new nullable column / new table (e.g. `tenantId String?`)
- Deploy migration
- Application code continues reading old column, writes to both old & new

                     |
                     v

[ Phase 2: BACKFILL ]
- Execute idempotent backfill script populating `tenantId` on all historic rows
- Verify 100% data coverage & foreign key integrity

                     |
                     v

[ Phase 3: CONTRACT ]
- Alter column to `NOT NULL` (e.g. `tenantId String @notnull`)
- Add composite unique indexes (e.g. `@@unique([tenantId, name])`)
- Remove deprecated columns from schema
```

---

## 3. Resolving Global Unique Constraints for Multi-Tenancy

Step 0 identified that `Class.name`, `Subject.name`, and `Grade.level` enforce `@unique` globally. In Step 3, these will be converted to composite unique keys:

```sql
-- Migration SQL Step: Drop global constraint and create composite unique constraint
ALTER TABLE "Class" DROP CONSTRAINT IF EXISTS "Class_name_key";
CREATE UNIQUE INDEX "Class_tenantId_name_key" ON "Class"("tenantId", "name");

ALTER TABLE "Subject" DROP CONSTRAINT IF EXISTS "Subject_name_key";
CREATE UNIQUE INDEX "Subject_tenantId_name_key" ON "Subject"("tenantId", "name");
```

---

## 4. Pre-Migration Data Verification & Backups

1. **Automated Pre-Migration Snapshots**: Production database instances (AWS RDS / Supabase) MUST execute an automated point-in-time snapshot immediately prior to applying schema migrations.
2. **Reversibility Scripts**: Every complex SQL migration must include a tested rollback script documented in `docs/migrations/rollback-vX.Y.Z.sql`.
