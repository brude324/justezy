# Step 4C Architecture: Identity, Tenant Foundation & Tenant Isolation

**Document ID**: `docs/STEP-4C-IDENTITY-TENANCY.md`  
**Status**: `IMPLEMENTED`  
**Target SaaS Environment**: SchoolyardSMS Multi-Tenant SaaS  
**Author**: Antigravity DeepMind Agent  

---

## 1. Architectural Overview & Classification

Step 4C establishes the identity and multi-tenancy foundation for SchoolyardSMS, strictly enforcing the separation of **Authentication / Identity** from **Application Authorization & Institutional Tenancy**.

### Operational Status Labels
- **Clerk Authentication**: `CURRENT (OPERATIONAL)` — External authentication provider issuing signed session JWTs.
- **Application User Sync**: `IMPLEMENTED` — Webhook handler at `/api/webhooks/clerk` and `UserService` syncing Clerk identities to application `User` records.
- **Tenant Management**: `IMPLEMENTED` — `TenantService` supporting atomic, transactional tenant provisioning with default policies, branding, and owner binding.
- **Tenant Membership**: `IMPLEMENTED` — `MembershipService` establishing multi-institution bindings between `User` and `Tenant`.
- **Server-Side Tenant Resolution**: `IMPLEMENTED` — `TenantResolver` resolving institution from hostname, subdomain, and verified custom domains.
- **Tenant Context**: `IMPLEMENTED` — `AsyncLocalStorage` request-level context providing active `TenantContextData` and strictly separated `PlatformContextData`.
- **Prisma Tenant Scoping Extension**: `IMPLEMENTED` — `getScopedPrisma(tenantId)` automatically scoping reads, creates, updates, and deletes to the active institution.
- **Dynamic DB RBAC Evaluator**: `DEFERRED (STEP 4D)` — Evaluation of atomic permissions and AccessScopes.
- **Module Entitlement Enforcement**: `DEFERRED (STEP 4D)` — Feature gating checks.
- **PostgreSQL Native RLS**: `TARGET (DEFENSE-IN-DEPTH / EVALUATION)` — Schema is prepared with non-nullable `tenantId` composite foreign keys; session variable RLS is planned as an engine-level defense-in-depth layer.

---

## 2. Source of Truth Request Pipeline

Every incoming request flows through this strict, non-bypassable sequence:

```
[ Incoming HTTP Request ]
          │
          ▼
[ 1. Next.js Edge Middleware ] ──────────────► (Bypassed for /api/webhooks/clerk)
- Verifies Clerk Session Token
- Extracts Host / Forwarded-Host
          │
          ▼
[ 2. Server-Side Tenant Resolution ]
- Resolves Tenant via Subdomain or Verified Custom Domain
- Rejects Suspended (403) or Archived (404) Institutions
- SECURITY INVARIANT: Client-supplied headers/params (e.g. x-tenant-id) are IGNORED
          │
          ▼
[ 3. Authenticated Identity Mapping ]
- Resolves Clerk User ID -> Application User record
          │
          ▼
[ 4. Tenant Membership Verification ]
- Asserts active TenantMembership exists for [tenantId, userId]
- Rejects unlinked users (403 Forbidden)
          │
          ▼
[ 5. Initialize AsyncLocalStorage TenantContext ]
- Stores { tenant, user, membership } in execution thread
          │
          ▼
[ 6. Tenant-Safe Data Access Layer ]
- getCurrentScopedPrisma() enforces tenantId on all domain queries
          │
          ▼
[ Business Operation Execution ]
```

---

## 3. Clerk Authentication Architecture & User Synchronization

### 3.1 Responsibilities
- **Clerk**: Exclusively responsible for credential verification, password resets, SMS/OTP verification, MFA, social logins, and cryptographic session token issuance.
- **PostgreSQL Database**: Authoritative for the human `User` entity, `TenantMembership`, `Role`, `Permission`, and all institutional data.
- **Rule**: Clerk `publicMetadata.role` is NEVER used for business authorization or institutional access control.

### 3.2 Webhook Specification (`/api/webhooks/clerk`)
- **Transport Security**: Requires headers `svix-id`, `svix-timestamp`, `svix-signature`.
- **Signature Verification**: Validated using `svix` package with `CLERK_WEBHOOK_SECRET`.
- **Replay Protection**: Rejects timestamps older than 5 minutes.
- **Idempotency**: All operations execute as idempotent upserts on `clerkId`. Repeated webhook deliveries produce zero duplicate records.

```typescript
// Handled Webhook Events
switch (eventType) {
  case "user.created":
  case "user.updated":
    await userService.syncClerkUser(evt.data);
    break;
  case "user.deleted":
    await userService.deactivateUser(evt.data.id);
    break;
}
```

---

## 4. Tenant Lifecycle & Creation Foundation

### 4.1 Tenant Provisioning Service (`TenantService.createTenant`)
Tenant creation is an authenticated, transactional server workflow (`prismaTarget.$transaction`):
1. Normalizes and validates institutional `slug` uniqueness.
2. Validates that the initiating `ownerUserId` exists.
3. Inserts root `Tenant` record (`status: ACTIVE`, default quotas).
4. Inserts default `TenantPolicy` (attendance cutoffs, SMS alert flags).
5. Inserts default `TenantBranding` (school colors, crest placeholders).
6. Resolves/creates the system role `INSTITUTION_OWNER`.
7. Inserts `TenantMembership` binding `ownerUserId` to the new `tenantId` with `INSTITUTION_OWNER` role.
8. Provisions baseline `TenantModuleEntitlement` records (`core_academics`, `attendance_module`, `communication_module`).
9. Creates an immutable `AuditLog` entry recording the provisioning event.

### 4.2 Tenant Lifecycle States
- `PROVISIONING`: Initial setup in progress.
- `ACTIVE`: Normal operational state.
- `SUSPENDED`: Institution access frozen (e.g. delinquent billing); users receive `TenantSuspendedError` (403).
- `ARCHIVED`: Institution decommissioned; requests receive `TenantNotFoundError` (404) to prevent tenant enumeration.

---

## 5. Server-Side Tenant Resolution & Untrusted Inputs

### 5.1 Hostname Derivation
The server derives the target institution strictly from:
1. **Platform Subdomain**: `https://<slug>.schoolyardsms.in` -> extracts `<slug>`.
2. **Verified Custom Apex Domain**: `https://portal.greenwoodhigh.edu` -> queries `TenantDomain` table where `isVerified: true`.

### 5.2 Critical Security Invariant
```
ATTACK VECTOR: Client sends GET /api/students HTTP/1.1
               Host: greenwood.schoolyardsms.in
               x-tenant-id: victim_school_id

RESOLUTION:
- Header x-tenant-id is completely discarded.
- Server resolves tenant strictly via host -> 'greenwood'.
- Context tenantId = 'tnt_greenwood'.
- Scoped query executes: WHERE tenantId = 'tnt_greenwood'.
- ATTACK MITIGATED.
```

---

## 6. Tenant Context & AsyncLocalStorage

Node.js `AsyncLocalStorage` provides a clean execution context across async call trees:

```typescript
export interface TenantContextData {
  tenant: { id: string; slug: string; name: string; status: string; planTier: string };
  user: { id: string; clerkId: string; email: string; firstName: string; lastName: string; displayName: string | null };
  membership: { id: string; tenantId: string; userId: string; roleId: string; status: string };
  requestId?: string;
}
```

- `requireTenantContext()`: Throws `TenantContextMissingError` (401) if called outside an active tenant session.
- `PlatformContext`: Strictly separated context for global SaaS operators (`isSuperAdmin: true`). Platform users do NOT automatically inherit tenant memberships.

---

## 7. Prisma Tenant Scoping Extension (`getScopedPrisma`)

Located at [src/lib/tenant/scoped-prisma.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/tenant/scoped-prisma.ts):

- Automatically intercepts all queries on `TENANT_SCOPED_MODELS` (34 institutional models).
- **Reads**: Appends `where: { tenantId }` to `findMany`, `findFirst`, `count`.
- **Creates**: Injects active `tenantId` into `create` and `createMany`. Throws `CrossTenantAccessError` if caller supplies a conflicting foreign `tenantId`.
- **Updates**: Appends `where: { tenantId }` and rejects reassignments to foreign tenants.
- **Deletes**: Appends `where: { tenantId }` to `delete` and `deleteMany`.
- **Global Models**: Global tables (`User`, `Module`, `SubscriptionPlan`) are not scoped by `tenantId`.

---

## 8. Security Invariants & Testing Matrix

| Invariant | Description | Verification Test | Status |
| :--- | :--- | :--- | :--- |
| **Invariant 1** | Tenant A user cannot read Tenant B records | `tenant-isolation.test.ts` (findMany scoping) | **VERIFIED** |
| **Invariant 2** | Tenant A user cannot create records in Tenant B | `tenant-isolation.test.ts` (foreign tenantId rejection) | **VERIFIED** |
| **Invariant 3** | Tenant A user cannot update Tenant B records | `tenant-isolation.test.ts` (scoped update) | **VERIFIED** |
| **Invariant 4** | Tenant A user cannot delete Tenant B records | `tenant-isolation.test.ts` (scoped delete) | **VERIFIED** |
| **Invariant 5** | Client-supplied tenant ID cannot bypass resolution | `tenant-resolution.test.ts` (header rejection) | **VERIFIED** |
| **Invariant 6** | Cross-tenant foreign key reassignments fail | `tenant-isolation.test.ts` (update reassign rejection) | **VERIFIED** |
| **Invariant 7** | Global models are not accidentally tenant-scoped | `tenant-isolation.test.ts` (User/Module queries) | **VERIFIED** |
| **Invariant 8** | Platform context is isolated from tenant context | `tenant-context.test.ts` (context separation) | **VERIFIED** |

---

## 9. Reconciliation & Operational Failure Scenarios

- **Orphaned Identities**: [scripts/reconcile-identity.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/scripts/reconcile-identity.ts) audits the database for users missing Clerk IDs, active memberships on inactive users, or memberships pointing to deleted institutions.
- **Webhook Delivery Failure**: Clerk retries failed webhook deliveries with exponential backoff. Because user synchronization is strictly idempotent, out-of-order or duplicate retries are handled cleanly without duplicate user creation.
- **Inactive Institution**: If an institution is suspended or archived, the resolver immediately halts execution before database mutations can occur.

---

## 10. Known Limitations & Deferred Work

1. **RBAC Engine (Deferred to Step 4D)**: Atomic permission strings (`attendance.mark`, `exam.publish`) and AccessScope bounds (`INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN`) are established in seed definitions but evaluation logic is deferred to Step 4D.
2. **Module Entitlements (Deferred to Step 4D)**: Feature gating middleware checking `TenantModuleEntitlement` is deferred to Step 4D.
3. **Application Screens & Actions (Deferred to Step 4E)**: Existing single-tenant server actions in `actions.ts` and RSC views in `src/app/(dashboard)` will be refactored to consume `getCurrentScopedPrisma()` during Step 4E.
