# STRIDE Threat Model & Vulnerability Mitigations

## 1. Overview & Threat Assessment Framework

**Status**: TARGET / PROPOSED

To protect institutional integrity, student privacy, and financial assets, this threat model evaluates the system against the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).

---

## 2. Threat Analysis & Specific Mitigations

### 2.1 Spoofing (Identity Spoofing)
- **Threat Scenario**: An adversary steals a session cookie or impersonates a school administrator to access institutional records.
- **Existing Vulnerability (Step 0)**: In `actions.ts`, server actions do not verify caller session claims.
- **Mitigation**:
  - Outsource session token signing to Clerk using short-lived JWTs.
  - Enforce Multi-Factor Authentication (MFA) for administrative and financial staff roles.
  - Server actions verify caller session identity via Clerk SDK before processing inputs.

### 2.2 Tampering (Data Tampering & Integrity Breaches)
- **Threat Scenario**: A malicious student modifies their examination score or alters attendance records by posting custom payloads to mutation endpoints.
- **Existing Vulnerability (Step 0)**: In `actions.ts`, server actions lack caller role checks; exam results accept arbitrary raw values.
- **Mitigation**:
  - Dynamic DB RBAC requires `result.write` permission and evaluates teacher-class assignment scopes.
  - Strict Zod schema validation checks `0 <= score <= maxScore`.
  - Finalized grades require administrative unlock before modification.

### 2.3 Repudiation (Denial of Action)
- **Threat Scenario**: A corrupt staff member alters grade cards or fee waivers and claims the system malfunctioned or another teacher performed the edit.
- **Existing Vulnerability (Step 0)**: Zero audit logging exists across the codebase (0% implemented).
- **Mitigation**:
  - Atomic transactional audit logging commits the actor's `userId`, timestamp, old state, new state, client IP, and mandatory remark directly into PostgreSQL.

### 2.4 Information Disclosure (Cross-Tenant Data Leakage & IDOR)
- **Threat Scenario**: A parent or teacher in Institution A guesses entity IDs (e.g. `studentId: 104`) belonging to Institution B and views confidential records.
- **Existing Vulnerability (Step 0)**: All database queries operate globally without `tenantId` filtering.
- **Mitigation**:
  - Every query enforces `where: { tenantId: ctx.tenantId }`.
  - Unscoped queries are blocked by Prisma client extensions.
  - Entities use non-sequential CUID/UUID keys to prevent enumeration.

### 2.5 Denial of Service (System Resource Exhaustion)
- **Threat Scenario**: An attacker submits thousands of mass report card generation requests or bulk SMS triggers, exhausting server CPU and telecom quotas.
- **Existing Vulnerability (Step 0)**: Actions run synchronously in Next.js Server Actions with zero rate limiting.
- **Mitigation**:
  - Long-running jobs are offloaded to BullMQ queues with rate-limiting and job deduplication.
  - Edge rate limiting (Cloudflare) throttles brute-force submission attempts.

### 2.6 Elevation of Privilege (Horizontal & Vertical Authorization Bypass)
- **Threat Scenario**: A student sends a request to `/api/admin/roles` or invokes `deleteTeacher()` Server Action.
- **Existing Vulnerability (Step 0)**: Server actions have commented-out role checks.
- **Mitigation**:
  - `createGuardedAction` enforces server-side permission checks.
  - UI client role claims in Clerk metadata are completely ignored for business authorization.
