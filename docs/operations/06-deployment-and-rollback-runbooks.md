# Deployment & Rollback Operational Runbooks

This document provides step-by-step procedures for deploying, rolling back, and recovering from failed releases of the SchoolyardSMS SaaS platform.

---

## Runbook 1: Production Application Deployment

### 1. Detection & Initiation
- **Trigger**: Approved merge of release pull request into `main` branch.
- **Pre-Conditions**:
  - All CI checks pass (Lint, Typecheck, Unit Tests, Integration Tests, Target Prisma Validation, Build).
  - Production database backup verified within the last 2 hours.
  - Release manager and database administrator on standby.

### 2. Immediate Action
1. **Pre-flight Migration Check**:
   Execute the migration release gate in an isolated runner:
   ```bash
   npx prisma migrate deploy --schema prisma/schema.target.prisma
   ```
2. **Container Image Build & Push**:
   Build the multi-stage production Docker container tagged with git commit SHA and semver release tag:
   ```bash
   docker build -t schoolyard-web:${RELEASE_TAG} -t schoolyard-web:${GIT_COMMIT_SHA} .
   docker push registry.schoolyard.in/schoolyard-web:${RELEASE_TAG}
   ```
3. **Rolling Update Trigger**:
   Shift traffic incrementally using rolling update deployment (max surge: 25%, max unavailable: 0%):
   ```bash
   kubectl set image deployment/schoolyard-web web=registry.schoolyard.in/schoolyard-web:${RELEASE_TAG}
   ```

### 3. Verification
- Monitor application liveness probe: `GET https://app.schoolyard.in/api/health` (HTTP 200).
- Monitor application readiness probe: `GET https://app.schoolyard.in/api/health/ready` (HTTP 200, database connected).
- Verify synthetic smoke tests across all tenant routes (`/admin`, `/teacher`, `/student`, `/parent`).
- Check structured error log rates; error rate must remain below 0.05% baseline.

### 4. Recovery
- If any pod fails readiness checks, orchestrator halts rolling update automatically.
- Active traffic remains routed exclusively to previous stable version pods.

### 5. Escalation
- If deployment stalls or health check fails for > 5 minutes:
  - Page On-Call Engineering Lead and DevOps Lead.
  - Announce release pause in `#ops-incidents` Slack channel.

### 6. Post-Incident Action
- Tag release in Git.
- Archive release deployment logs in centralized storage.

---

## Runbook 2: Application Rollback & Failed Deployment Response

### 1. Detection
- **Trigger**:
  - Application readiness endpoint `/api/health/ready` returns 503.
  - CrashLoopBackOff on new container pods.
  - Error rate spikes above 1% within 15 minutes of release.
  - Severe P0/P1 functional regression reported by institutional users.

### 2. Immediate Action
1. **Halt Deployment**:
   Stop any ongoing deployment pipeline immediately.
2. **Execute Immediate Traffic Rollback**:
   Revert container deployment to the previous known stable image digest:
   ```bash
   kubectl rollout undo deployment/schoolyard-web
   ```
3. **Verify Edge Cache & CDN**:
   Purge Cloudflare HTML cache to prevent serving mismatched client scripts:
   ```bash
   curl -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
     -H "Authorization: Bearer ${CF_API_TOKEN}" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":false, "tags":["app-shell"]}'
   ```

### 3. Verification
- Confirm that previous stable pods are receiving 100% of incoming traffic.
- Verify HTTP 200 on `/api/health` and `/api/health/ready`.
- Test dashboard rendering and authentication flow for test tenant.

### 4. Recovery
- Re-establish baseline operational latency (< 250ms).
- Confirm zero error spikes in structured logs.

### 5. Escalation
- Notify Engineering Leadership and Customer Success within 15 minutes.
- If database schema migration was applied and is backward-incompatible, escalate to Database Administrator immediately.

### 6. Post-Incident Action
- Conduct a blameless post-mortem within 48 hours.
- Fix identified root cause in development branch with mandatory regression test coverage.
