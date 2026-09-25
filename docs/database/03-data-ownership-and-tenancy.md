# 03 — Data Ownership & Multi-Tenancy Architecture

## 1. The Sovereign Tenant Invariant

**Status**: TARGET / SPECIFICATION  
**Scope**: Multi-Tenant Isolation Strategy for the Application Database.

In SchoolyardSMS, an educational **`Tenant`** represents a sovereign institution (e.g., "Greenwood High School", "Delhi Public College", "St. Xavier's Academy"). It is the fundamental root of data ownership, accounting, configuration, and security authorization.

Every institutional transaction, student profile, attendance record, and examination result belongs strictly to exactly one `Tenant`. Cross-tenant data sharing is prohibited by design.

---

## 2. Platform-Level vs. Tenant-Level Data Separation

The database architecture maintains an uncompromising boundary between the platform control plane and tenant operational workspaces:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PLATFORM-LEVEL DATA (GLOBAL)                    │
│  - PlatformUser (SaaS Super Admins, Support Operators)                │
│  - User (Global human identities mapped 1:1 with Clerk)                │
│  - SubscriptionPlan (Public pricing & monetization tiers)             │
│  - Module (Platform-wide capability catalog)                          │
│  - LeadInquiry (Marketing signups)                                    │
│  - Platform Audit Logs (Global governance trail)                       │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (Partitions into)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        TENANT-LEVEL DATA (ISOLATED)                    │
│  - Tenant (The sovereign institutional boundary)                      │
│  - TenantMembership (Binds global User to Tenant with Role)            │
│  - TenantModuleEntitlement (Active feature licenses for this school)   │
│  - TenantPolicy & Branding (School-specific rules, logos, signatures)  │
│  - Academic Structure (AcademicYear, Terms, Grades, Classes, Subjects) │
│  - People (StaffProfile, StudentProfile, ParentProfile, Bindings)     │
│  - Operational Workflows (Attendance, Timetable, Exams, Marks, Comms)  │
│  - Tenant Audit Logs (Institutional activity trail)                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Server-Side Tenant Resolution & Untrusted Client Inputs

### 3.1 Security Invariant
- **Client-Provided Tenant IDs are Untrusted**: Headers like `x-tenant-id`, query parameters like `?tenantId=...`, or body fields like `{ tenantId: "..." }` received from client browsers are untrusted user input.
- **Server-Side Derivation**: The server runtime (Next.js Middleware and RSC context) MUST derive `tenantId` strictly from:
  1. **Hostname / Subdomain**: E.g., `greenwood.schoolyardsms.in` → resolves to Tenant `slug: "greenwood"`.
  2. **Custom Apex Domain**: E.g., `portal.greenwoodhigh.edu` → resolves via `TenantDomain` registry.
  3. **Verified Cryptographic Session**: For universal mobile APIs, `tenantId` is extracted from the server-validated session claims matching an active `TenantMembership`.

### 3.2 Tenant Context Lifecycle
Once verified server-side, the `tenantId` is placed into Node.js `AsyncLocalStorage` request context. Every downstream database query automatically consumes this verified context.

---

## 4. Multi-Tenant Foreign Key & Composite Isolation Rules

### 4.1 Universal `tenantId` Column Invariant
Every database table representing tenant-level domain data MUST possess a mandatory, non-nullable foreign key column:
```prisma
tenantId  String
tenant    Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
```

### 4.2 Composite Foreign Keys Preventing Cross-Tenant Mixing
A critical risk in multi-tenant SaaS is accidental cross-tenant relational linking (e.g., linking a Class belonging to Tenant A with a Subject belonging to Tenant B). 

To make cross-tenant data corruption structurally impossible at the PostgreSQL database engine level, the schema implements **Composite Foreign Keys** where both parent and child share the same `tenantId`:

```prisma
// Example: ClassSubject Composite Integrity
model ClassSubject {
  id        String   @id @default(cuid())
  tenantId  String
  classId   String
  subjectId String
  teacherId String

  // Composite foreign key to Class guaranteeing same tenant
  class     Class    @relation(fields: [tenantId, classId], references: [tenantId, id])
  
  // Composite foreign key to Subject guaranteeing same tenant
  subject   Subject  @relation(fields: [tenantId, subjectId], references: [tenantId, id])
  
  // Composite foreign key to Teacher guaranteeing same tenant
  teacher   StaffProfile @relation(fields: [tenantId, teacherId], references: [tenantId, id])

  @@unique([tenantId, classId, subjectId])
}
```

If an application bug or malicious actor attempts to link `classId` from Tenant A to `subjectId` from Tenant B, PostgreSQL rejects the SQL statement with a foreign key violation, because no `Subject` exists with `[tenantId: "Tenant_A", id: "Tenant_B_Subject"]`.

---

## 5. Tenant Deactivation & Cascade Policies

| Action | Soft Deletion Behavior | Referential Cascade Policy |
| :--- | :--- | :--- |
| **Tenant Suspension** | `Tenant.status = 'SUSPENDED'` | Immediate session invalidation. Domain records remain untouched in PostgreSQL. User login displays HTTP 402/Suspended screen. |
| **Tenant Archival / Deletion** | `Tenant.deletedAt = now()` | Soft deletion applied. Records hidden from standard queries via Prisma middleware. Historical audit records preserved. |
| **Cascade Constraints** | Production: `onDelete: Restrict` on critical academic tables. | Prevents accidental deletion of a tenant if active enrolled students or historical examination results exist without explicit pre-archival verification. |
