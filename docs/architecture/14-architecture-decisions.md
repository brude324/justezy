# Consolidated Architecture Decision Summary

## 1. Overview & Decision Framework

**Status**: TARGET / PROPOSED

This document provides a consolidated register of all critical architectural decisions evaluated across Step 0 and Step 1. Every decision is categorized as either a **Confirmed Decision** (locking the architectural baseline) or an **Open / Deferred Decision** (to be resolved in Step 1B, 2, or 3).

---

## 2. Confirmed Architectural Decisions (Baseline)

| Decision Reference | Architectural Concern | Confirmed Direction | Rationale & Trade-Offs | Status |
| :--- | :--- | :--- | :--- | :---: |
| **ADR-001** | Authentication Provider | **Clerk for Identity Only** | Outsources MFA, credential hashing, and security sessions to Clerk. Zero usage of Clerk metadata for authorization. | DECISION |
| **ADR-002** | Tenant Architecture | **Application-Level Multi-Tenancy** | Avoids vendor lock-in to Clerk Organizations; enables rich institutional membership metadata, status, and multi-tenant hierarchies in PostgreSQL. | DECISION |
| **ADR-003** | Authorization Engine | **Dynamic Database-Driven RBAC** | Granular permissions and customizable roles stored in PostgreSQL. Strict server-side policy evaluation. | DECISION |
| **ADR-004** | Data Partitioning Model | **Shared Database / Shared Schema** | Single PostgreSQL instance with `tenantId` foreign key on all domain entities. Maximizes resource efficiency across institutions. | DECISION |
| **ADR-005** | Identity Separation | **User -> Membership -> Profiles** | Decouples human identity (`User`) from institutional relationship (`TenantMembership`) and specialized academic profiles (`StudentProfile`, `StaffProfile`). | DECISION |
| **ADR-006** | Asynchronous Processing | **BullMQ + Redis Queue Tier** | Moves notifications, report cards, and bulk onboarding out of the synchronous Next.js request cycle into scalable worker daemons. | DECISION |
| **ADR-007** | Audit Logging Engine | **Atomic Transactional Auditing** | Critical security, academic, and financial mutation logs MUST be committed in the same DB transaction. Queues reserved for secondary events. | DECISION |
| **ADR-008** | Client Delivery Strategy | **PWA-First Architecture** | Prioritizes high-performance Progressive Web Application over expensive dual native iOS/Android codebases for rapid emerging-market adoption. | DECISION |

---

## 3. Open & Intentionally Deferred Architectural Decisions

| Decision Reference | Open Architectural Concern | Evaluated Options | Planned Resolution Horizon | Status |
| :--- | :--- | :--- | :---: | :---: |
| **ADR-009** | Tenant Ingress Routing | Subdomain (`tenant.schoolyard.in`) vs. Path (`/school/:tenant/...`) | Step 1B Implementation Specification | OPEN / TBD |
| **ADR-010** | Database Isolation Mechanism | Prisma Client Extensions vs. Native PostgreSQL RLS vs. Hybrid | Step 3 Database Architecture Phase | OPEN / TBD |
| **ADR-011** | User Provisioning Flow | Webhook-First Sync vs. Database-Outbox-First Sync | Step 1B Implementation Specification | OPEN / TBD |
| **ADR-012** | Cloud Hosting Provider | AWS (ECS/RDS/ElastiCache) vs. Supabase + Render vs. Hetzner VPS | Step 1B Operations Specification | OPEN / TBD |
| **ADR-013** | Telecom / SMS Aggregator | Gupshup vs. Exotel vs. Twilio India (DLT compliance) | Step 2 Integration Phase | OPEN / TBD |
| **ADR-014** | Object Storage Provider | Cloudflare R2 (zero egress fees) vs. AWS S3 (ecosystem maturity) | Step 2 Storage Phase | OPEN / TBD |
| **ADR-015** | Payment Gateway | Razorpay vs. Cashfree (Indian UPI/Netbanking fees) | Step 2 Finance Phase | OPEN / TBD |
