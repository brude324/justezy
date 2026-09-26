# Production Migration Checklist: Target Multi-Tenant Schema Cutover

**Document ID**: `docs/database/21-production-migration-checklist.md`  
**Purpose**: Formal operational gate before applying `20260925_expand_target_schema` to production staging or live environments.  
**Execution Authority**: Database Administrator / Lead Platform Engineer  

---

## Pre-Migration Gate (T - 24h to T - 1h)

- [ ] **1. Full Production Backup Verified**
  - Binary `pg_dump -Fc` executed against live cluster.
  - Backup file size validated (> 0 bytes).
  - Restoration drill passed on staging cluster using identical PostgreSQL engine version.
- [ ] **2. Maintenance Window Scheduled**
  - Institutional stakeholders notified of maintenance window.
  - Read-only maintenance banner or maintenance mode configured.
- [ ] **3. Migration Artifacts Reviewed**
  - Migration SQL (`prisma/migrations/20260925_expand_target_schema/migration.sql`) inspected by DBA.
  - Verified 0 `DROP TABLE`, 0 `ALTER TABLE ... DROP COLUMN`, 0 unhandled `NOT NULL` constraints without defaults.
- [ ] **4. Rollback Script Staged**
  - `prisma/migrations/20260925_expand_target_schema/rollback.sql` reviewed and confirmed clean.
  - Command tested in staging environment.
- [ ] **5. Infrastructure Capacity Inspected**
  - Target database disk space verified (> 3x existing database size for table additions and index compilation).
  - Connection pool limits and max connections verified.
- [ ] **6. Production Credentials & Network Verified**
  - `DATABASE_URL` pointing to authoritative target cluster.
  - SSL/TLS mode set to `require` or `verify-full`.
  - Zero development or local credentials in deployment environment.

---

## Migration Execution Gate (T = 0)

- [ ] **1. Put Application in Maintenance Mode**
  - Divert write traffic / pause background worker queues.
- [ ] **2. Apply Additive Schema Migration**
  ```bash
  npx prisma migrate deploy --schema prisma/schema.target.prisma
  ```
  - Capture all stdout/stderr logs to migration execution log artifact.
  - Check for zero connection timeouts or lock contention.
- [ ] **3. Verify DDL Status**
  - Check that all 46 target tables are created.
  - Check that table ownership and schema grants match application service user.
- [ ] **4. Execute Tier 1 System Seeds**
  ```bash
  npm run seed:target
  ```
  - Confirm 7 core modules, 68 atomic permissions, 6 system roles, and 3 subscription plans seeded.
- [ ] **5. Execute Legacy-to-Target Data Migration ETL**
  ```bash
  npm run migrate:rehearse
  ```
  - Verify all legacy institutional records are transformed and assigned to target tenant.
- [ ] **6. Run Automated Reconciliation Audit**
  ```bash
  npm run reconcile:target
  ```
  - Assert zero record discrepancies between legacy and target models.
  - Assert zero orphaned student enrollments, guardian bindings, or unassigned records.

---

## Post-Migration Gate (T + 1h)

- [ ] **1. Health Checks & Verification**
  - Run `npm run test` against staging/production database.
  - Inspect Next.js API endpoints and server-rendered views.
- [ ] **2. Error Log Inspection**
  - Inspect Datadog/CloudWatch/Sentry error streams for unhandled exceptions or constraint violations.
- [ ] **3. Lift Maintenance Mode**
  - Re-enable live traffic.
- [ ] **4. Monitoring Window**
  - Monitor database query latency, CPU utilization, and lock wait times for 4 hours post-cutover.
- [ ] **5. Close Maintenance Incident**
  - Record execution duration, row reconciliation counts, and sign off migration completion.
