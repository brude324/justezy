# Engineering Principles & Development Laws

## 1. Executive Summary

**Status**: DECISION

These eighteen engineering principles form the foundational baseline for all development, refactoring, and code review across this platform. Every pull request and implementation task must satisfy these principles without exception.

---

## 2. The Eighteen Engineering Laws

1. **No Business Authorization in the Client**:
   - The client UI (React components) is solely a presentation and convenience layer. Hiding a button or menu link does not secure an endpoint. All authorization decisions MUST execute server-side.
2. **No Trusted Client Tenant Headers**:
   - Headers like `x-tenant-id` are untrusted client input. Tenant context MUST always be resolved and verified server-side against the authenticated user's active `TenantMembership` records.
3. **No Unscoped Tenant Queries**:
   - Every database query touching tenant-owned domain entities MUST explicitly filter by the verified `tenantId`. Unscoped global queries are strictly prohibited.
4. **No Direct Database Queries from UI Components**:
   - Presentation components MUST consume data through dedicated domain services, data access layer functions, or guarded actions. Direct inline Prisma queries across models inside presentation components are banned.
5. **Validate All External Input**:
   - Every piece of external input (form submissions, URL parameters, webhook payloads, query strings) MUST be validated against strict Zod schemas before reaching business logic.
6. **Validate Permissions Server-Side**:
   - Every Server Action and API Route Handler MUST explicitly verify that the caller possesses the requisite fine-grained permission (e.g. `attendance.mark`, `exam.publish`) prior to execution.
7. **Validate Tenant Membership Server-Side**:
   - Before executing an action within a tenant context, the server MUST verify that the user possesses an `ACTIVE` membership within that specific institution.
8. **Prefer Transactions for Related Mutations**:
   - Multi-step state transitions and related entity updates MUST execute within a database transaction (`prisma.$transaction`) to guarantee atomicity.
9. **Critical Audit Events Must Be Transactionally Persisted**:
   - Authoritative security, academic, and financial audit logs MUST be persisted in the exact same database transaction as the underlying mutation. Never delegate critical audit logs to asynchronous queues.
10. **Background Jobs Must Be Idempotent**:
    - Every background worker job (BullMQ) MUST be safe to execute multiple times without producing duplicate side-effects, duplicate SMS alerts, or duplicate financial entries.
11. **External Integrations Must Have Retries and Failure Handling**:
    - All external network calls (Clerk, SMS gateways, payment webhooks, S3) MUST include timeout limits, exponential backoff retries, and graceful fallback paths.
12. **Database Migrations Must Be Reversible Where Practical**:
    - Schema alterations MUST be designed with backward compatibility and explicit down/reversal strategies to enable zero-downtime deployments.
13. **Never Commit Secrets**:
    - Secrets, private keys, database URLs, and API tokens MUST never be committed to source control. Violations will trigger immediate key revocation and repo sanitization.
14. **No Destructive Migration Without Backup/Verification**:
    - Destructive operations (dropping columns, truncating tables, splitting models) MUST have pre-migration data verification, automated snapshots, and rollback scripts in place.
15. **Every Completed Feature Requires Tests**:
    - A feature is not complete until it includes unit tests for business logic, integration tests for data access, and E2E coverage for critical user journeys.
16. **Do Not Bypass CI Checks**:
    - Pull requests MUST pass all linting, type-checking, automated testing, and build verification gates before merging. Force merges and bypassed checks are prohibited.
17. **Do Not Silently Change Architecture Decisions**:
    - Fundamental architectural deviations (altering auth providers, changing database isolation strategies, bypassing the service layer) MUST be discussed and approved via formal Architecture Decision Records (ADRs).
18. **Document Major Architecture Changes with ADRs**:
    - Every significant technical choice, library introduction, or infrastructural shift MUST be recorded in the project's Architecture Decision Register.
