# Database Migration, Outage & Disaster Recovery Operational Runbooks

This document outlines the standard operational procedures for database schema migrations, database failure mitigation, backup verification, and point-in-time recovery.

---

## Runbook 3: Production Database Schema Migration

### 1. Detection & Planning
- **Trigger**: New migration file added in `prisma/migrations/` approved during code review.
- **Rule**: Never run `prisma migrate dev` in production or staging. Only use committed migration files via `prisma migrate deploy`.

### 2. Immediate Action
1. **Pre-Migration Snapshot**:
   Take a point-in-time manual snapshot of the production RDS / PostgreSQL cluster before migration execution:
   ```bash
   aws rds create-db-snapshot \
     --db-instance-identifier schoolyard-prod-pg \
     --db-snapshot-identifier pre-mig-snap-$(date +%Y%m%d%H%M)
   ```
2. **Expand-and-Contract Enforcement**:
   - Column additions must be nullable or have safe defaults.
   - Never drop columns or rename tables in Step 1 (defer drop to subsequent releases after code is updated).
3. **Run Migration**:
   ```bash
   DATABASE_URL="$PROD_MIGRATION_DIRECT_URL" npx prisma migrate deploy --schema prisma/schema.target.prisma
   ```

### 3. Verification
- Verify migration status:
  ```bash
  npx prisma migrate status --schema prisma/schema.target.prisma
  ```
- Confirm output reports: `Database schema is up to date!`.
- Verify database readiness probe: `GET /api/health/ready` returns `{ "status": "ready", "database": "connected" }`.

### 4. Recovery
- If migration fails or locks tables:
  - If migration failed halfway, inspect error log and execute prepared rollback SQL script.
  - If schema corruption occurs, restore from the pre-migration snapshot taken in step 1.

### 5. Escalation
- Page Database Administrator (DBA) and Lead Architect if lock contention exceeds 30 seconds.

### 6. Post-Incident Action
- Reconcile `_prisma_migrations` table checksums.
- Update migration changelog in `docs/database/`.

---

## Runbook 4: Database Outage & Failover

### 1. Detection
- `/api/health/ready` probe returns 503 (`database: disconnected`).
- Structured logger outputs continuous connection refused or timeout errors.
- RDS / Cloud database health alarm fires (CPU 100%, connection pool exhausted, or physical host degradation).

### 2. Immediate Action
1. **Determine Outage Scope**:
   - Check if PgBouncer / Connection Pooler is saturated vs primary database node failure.
   - Run connectivity check from bastion host:
     ```bash
     pg_isready -h $DB_HOST -p 5432 -U $DB_USER
     ```
2. **Mitigate Connection Exhaustion**:
   If PgBouncer max connections reached, restart pooler or terminate idle connections:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < current_timestamp - INTERVAL '5 minutes';
   ```
3. **Execute Multi-AZ Failover (if primary down)**:
   If primary hardware failure is confirmed, initiate managed Multi-AZ failover to standby replica:
   ```bash
   aws rds reboot-db-instance \
     --db-instance-identifier schoolyard-prod-pg \
     --force-failover
   ```

### 3. Verification
- Primary endpoint DNS will update automatically to point to the promoted standby.
- Run `/api/health/ready` until HTTP 200 is restored.
- Query transaction logs to verify zero data loss.

### 4. Recovery
- Ensure Next.js connection pools re-establish cleanly.
- Verify read/write transactions on academic modules.

### 5. Escalation
- Severity P0 Incident: Page CTO, Lead Architect, and Head of Infrastructure.
- Post status update to status page (`status.schoolyard.in`).

### 6. Post-Incident Action
- Prepare RCA within 24 hours.
- Review max connection limits and connection pooling efficiency.

---

## Runbook 5: Database Backup & Point-in-Time Restore (PITR) Rehearsal

### 1. Verification of Automated Backups
- Production PostgreSQL runs continuous Write-Ahead Log (WAL) archiving to encrypted multi-region S3 storage.
- Full daily snapshot runs at 02:00 IST with 90-day retention.
- Verify backup status weekly via administrative script:
  ```bash
  aws rds describe-db-snapshots --db-instance-identifier schoolyard-prod-pg --query "reverse(sort_by(DBSnapshots, &SnapshotCreateTime))[0]"
  ```

### 2. Point-in-Time Restore Execution Procedure
1. **Identify Restore Target**:
   Determine target timestamp `RESTORE_TIME` (e.g. 5 minutes prior to incident or corruption event).
2. **Restore to Staging Sandbox / Isolated Recovery Instance**:
   ```bash
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier schoolyard-prod-pg \
     --target-db-instance-identifier schoolyard-pitr-recovery \
     --restore-time "${RESTORE_TIME}" \
     --db-subnet-group-name schoolyard-isolated-vpc \
     --multi-az false
   ```
3. **Verify Restored Instance**:
   - Connect to `schoolyard-pitr-recovery` on isolated network.
   - Run target reconciliation script to verify record counts and referential integrity:
     ```bash
     DATABASE_URL="$RECOVERY_DB_URL" npm run reconcile:target
     ```
4. **Data Extraction & Re-integration**:
   - Extract recovered tenant data or promote recovered instance if performing catastrophic disaster recovery.
5. **RPO / RTO Validation**:
   - RPO Target: < 5 minutes (validated by WAL continuous stream).
   - RTO Target: < 30 minutes (time to provision and verify restored instance).
