# Section J: External Services & Integrations Audit

## 1. Inventory of Third-Party Integrations

The current codebase integrates with three primary third-party services:

| Service / Provider | Purpose | Where Used in Codebase | Environment Variables Required | Failure Impact | Retain in Final Architecture? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Clerk** | Identity & Session Authentication | [src/app/layout.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/layout.tsx)<br>[src/middleware.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/middleware.ts)<br>[src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts)<br>[src/app/[[...sign-in]]/page.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%5B%5B...sign-in%5D%5D/page.tsx) | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`<br>`CLERK_SECRET_KEY`<br>`NEXT_PUBLIC_CLERK_SIGN_IN_URL`<br>`NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Users cannot log in; server actions creating teachers/students fail completely. | **YES (Refactored)**: Retain for Identity only (`userId`, session verification). Decouple from Clerk metadata RBAC. |
| **Cloudinary** | Media Upload & Image Hosting | [src/components/forms/TeacherForm.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/forms/TeacherForm.tsx)<br>[src/components/forms/StudentForm.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/forms/StudentForm.tsx) | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Users cannot upload profile photos during creation/editing. | **REPLACE**: Replace with multi-tenant S3-compatible object storage (e.g. AWS S3, Cloudflare R2, or MinIO) using pre-signed upload URLs and strict tenant prefixes. |
| **PostgreSQL (Supabase / Self-hosted)** | Primary Database Storage | [src/lib/prisma.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/prisma.ts)<br>[prisma/schema.prisma](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/prisma/schema.prisma) | `DATABASE_URL` | Complete application unavailability (500 Internal Server Errors across all RSC pages). | **YES**: Retain PostgreSQL + Prisma as the core data engine. Schema must be restructured for multi-tenancy and RBAC. |

---

## 2. Integration Vulnerabilities & Implementation Deficiencies

### 2.1 Clerk Decoupling Requirements
- Currently, `src/lib/actions.ts` directly creates users inside Clerk with hardcoded `publicMetadata: { role: "teacher" }` or `{ role: "student" }`.
- Under the target architecture:
  - Clerk must **ONLY** handle identity verification (email/phone authentication, session tokens).
  - The application database in PostgreSQL must store the unified `User` record, linked via `external_auth_id` (`sub`).
  - Roles, permissions, institution memberships, and module entitlements must be evaluated dynamically by PostgreSQL queries on each request.
  - Server actions must **NOT** push role metadata to Clerk's `publicMetadata`.

### 2.2 Cloudinary Unsigned Upload Flaw
- In `TeacherForm.tsx` and `StudentForm.tsx`, `CldUploadWidget` uses `uploadPreset="school"`.
- This relies on an **unsigned upload preset** configured in Cloudinary. Any client can inspect the browser bundle, obtain the cloud name and upload preset, and upload arbitrary malicious files (executables, offensive media) directly to the institution's Cloudinary account.
- In a multi-tenant environment, files uploaded by Tenant A and Tenant B reside in a single flat Cloudinary folder without tenant namespace boundaries or access controls.

### 2.3 Exposed Credentials in Version Control
- As detailed in Section B and Section K, [/.env.example](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/.env.example) contains what appear to be active test/development API keys for Clerk, Supabase, and Cloudinary.
- These keys must be revoked immediately, rotated, and removed from repository history.
