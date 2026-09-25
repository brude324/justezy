# System Security Requirements & Baseline Controls

## 1. Overview

**Status**: TARGET / PROPOSED

This document establishes the mandatory non-functional security requirements that all system components, API routes, Server Actions, and database migrations must fulfill prior to production deployment.

---

## 2. Mandatory Security Controls Matrix

| Control Category | Specific Requirement | Implementation Standard | Status |
| :--- | :--- | :--- | :---: |
| **Input Sanitization** | All inputs validated against strict Zod schemas. | Reject unknown keys (`.strict()`); sanitize text strings against XSS. | DECISION |
| **Authentication** | Session verification via Clerk SDK. | Cryptographically verify JWT on every protected request; enforce MFA on admin roles. | DECISION |
| **Tenant Isolation** | Server-side resolution & membership check. | Client-supplied tenant headers are untrusted; queries require verified `tenantId`. | DECISION |
| **Authorization** | Fine-grained atomic permissions in PostgreSQL. | No reliance on client metadata; verify permission & scope in `createGuardedAction`. | DECISION |
| **Mutation Auditing** | Atomic persistence for critical mutations. | `AuditLog` written within `prisma.$transaction` of the mutation. | DECISION |
| **Asset Security** | Secure S3 pre-signed upload pipeline. | Unsigned Cloudinary presets eliminated; files restricted to tenant directories. | DECISION |
| **Secret Management** | Zero committed credentials. | Automated secret scanning in CI; secrets injected via container environment. | DECISION |
| **Transport Security**| TLS 1.3 encryption across all network hops. | HSTS headers (`Strict-Transport-Security: max-age=31536000; includeSubDomains`). | DECISION |
| **Dependency Health** | Zero high/critical known vulnerabilities. | Automated `npm audit` and Dependabot vulnerability monitoring. | TARGET / PROPOSED |
| **CORS Policy** | Restrict cross-origin access. | Reject cross-origin POST requests to internal Server Actions and API routes. | TARGET / PROPOSED |
