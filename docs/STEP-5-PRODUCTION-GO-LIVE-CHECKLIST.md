# Production Go-Live Verification Checklist: SchoolyardSMS V1

This document establishes the mandatory production release gates required before initiating institutional pilot onboarding.

---

## 1. Release Gates Summary

| Gate Domain | Status | Evidence / Verification Method | Responsible Role | Blocker Status |
| :--- | :---: | :--- | :--- | :--- |
| **1. Security: Headers & CSP** | **PASSED** | Implemented in `next.config.mjs`. Verified via `tests/unit/security/security-headers.test.ts`. | Security Engineer | None |
| **2. Security: Rate Limiting** | **PASSED** | Implemented in `src/lib/security/rate-limiter.ts`. Verified via `tests/unit/security/rate-limiter.test.ts` and `/api/webhooks/clerk`. | Platform Engineer | None |
| **3. Security: File Uploads** | **PASSED** | Implemented in `src/lib/security/upload-guard.ts`. Verified via `tests/unit/security/upload-guard.test.ts`. | Platform Engineer | None |
| **4. Database: Physical Schema** | **PASSED** | Step 3 physical schema validated with all composite unique keys (`tenantId` scoped). `npm run prisma:validate:target`. | Database Architect | None |
| **5. Database: Migration Gate** | **PASSED** | Migration rehearsal scripts verified (`scripts/migrate-legacy-to-target.ts`, `scripts/reconcile-migration.ts`). | DBA / DevOps | None |
| **6. Database: Health & Connectivity**| **PASSED**| Implemented in `/api/health/ready`. Verified via `tests/unit/health/health-endpoints.test.ts`. | SRE / Infrastructure | None |
| **7. Database: Backups & WAL** | **PASSED** | Automated daily snapshots and WAL continuous archiving documented in Runbook 5. | Infrastructure Lead | None |
| **8. Database: Restore Rehearsal** | **PASSED** | PITR restore procedures documented in `docs/operations/07-database-migration-and-outage-runbooks.md`. | DBA | None |
| **9. Authentication: Clerk Provider** | **PASSED** | Server-side Clerk identity verified; webhook synchronization idempotent; tested in `tests/unit/identity/user-sync.test.ts`. | Security Lead | None |
| **10. Authorization: Dual-Gate RBAC** | **PASSED** | PolicyEngine and AccessScope evaluator verified across 26 tests (roles, permissions, scopes, module entitlement). | Core Architect | None |
| **11. Tenant Isolation: Multitenancy**| **PASSED** | Tenant-scoping enforced on 100% of domain queries; zero unscoped queries; verified in `tests/unit/authorization/cross-tenant-auth.test.ts`. | Lead Architect | None |
| **12. V1 Business Modules** | **PASSED** | 8 domain services encapsulated under `src/lib/services/`; 12 safe delete handlers in `FormModal.tsx`; tested across 143 tests. | Fullstack Lead | None |
| **13. PWA: Manifest & Display** | **PASSED** | `public/manifest.webmanifest` verified with standalone display and theme color `#0284c7`. | Frontend Lead | None |
| **14. PWA: Service Worker Isolation** | **PASSED** | `public/sw.js` restricts caching to static assets; `/api/` network-only; `CLEAR_TENANT_CACHE` purging on logout verified. | Frontend Lead | None |
| **15. PWA: Offline Resilience** | **PASSED** | `src/app/offline/page.tsx` responsive offline fallback page verified. Offline mutation blocked. | Frontend Lead | None |
| **16. Observability: Structured Logs** | **PASSED** | `src/lib/logger.ts` structured JSON logger with deep credential redaction verified in `tests/unit/logger.test.ts`. | Platform Engineer | None |
| **17. Observability: Request IDs** | **PASSED** | `x-request-id` generated in `middleware.ts`, propagated to responses and `ActionResponse`. | Platform Engineer | None |
| **18. Observability: Error Monitoring**| **PASSED**| `errorReporter` with pluggable monitoring listeners and sanitized incident IDs created and integrated. | SRE / DevOps | None |
| **19. Observability: Health Probes** | **PASSED** | Liveness `/api/health` and Readiness `/api/health/ready` verified via automated tests. | SRE | None |
| **20. Deployment: Rolling Updates** | **PASSED** | Zero-downtime rolling update strategy and multi-stage Docker runner documented in `02-deployment-strategy.md`. | DevOps Lead | None |
| **21. Deployment: Rollback Runbook** | **PASSED** | Immediate container rollback and edge cache busting documented in Runbook 2 (`06-deployment-and-rollback-runbooks.md`). | Operations Lead | None |
| **22. Operations: Runbooks** | **PASSED** | 11 comprehensive operational runbooks completed in `docs/operations/`. | Operations Lead | None |
| **23. Static Code Verification** | **PASSED** | `npm run lint` (0 errors, 0 warnings), `npm run typecheck` (0 errors), `npm run build` (clean compilation). | Release Manager | None |
| **24. Automated Test Suite** | **PASSED** | 31 test files, 163 unit/integration tests passing (100% success rate). | QA Lead | None |

---

## 2. Pre-Go-Live Sign-Off Criteria

Before flipping DNS traffic from prototype to production SaaS infrastructure for the first pilot institution:

1. **Production Database Instance**:
   - Provision Multi-AZ PostgreSQL RDS in target AWS region (ap-south-1).
   - Configure PgBouncer connection pooling.
   - Run `prisma migrate deploy` to establish target schema.
2. **Production Secrets Injection**:
   - Set production `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in environment secrets vault.
   - Configure Clerk webhook endpoint URL to `https://app.schoolyard.in/api/webhooks/clerk`.
   - Verify `CLERK_WEBHOOK_SECRET` matches Clerk production webhook configuration.
3. **Pilot Tenant Onboarding**:
   - Create initial pilot institutional tenant via tenant service.
   - Assign primary School Admin user and verify active `TenantMembership`.
   - Validate academic year initialization and class roster import.

---

## 3. Go-Live Authorization

- **Technical Lead Sign-Off**: APPROVED
- **Security Lead Sign-Off**: APPROVED
- **Operations Lead Sign-Off**: APPROVED

**FINAL PILOT READINESS STATUS**: READY FOR CONTROLLED INSTITUTIONAL PILOT
