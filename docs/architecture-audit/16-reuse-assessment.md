# Section P: Codebase Reuse Assessment

## 1. Structural Reuse Matrix

This matrix establishes the definitive recommendation on whether each existing subsystem should be **KEPT**, **REFACTORED**, **REPLACED**, or **REMOVED**.

| Area | Keep | Refactor | Replace | Remove | Technical Rationale |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **UI Components (General)** | | **X** | | | Reusable table (`Table.tsx`), search bar (`TableSearch.tsx`), and pagination (`Pagination.tsx`) have clean contracts; refactor styling and integrate with modern UI primitives. |
| **Layout & Shell** | | **X** | | | Layout structure (`DashboardLayout`) is responsive on desktop; refactor navigation for mobile (bottom bar/drawer) and dynamic tenant-branded sidebar. |
| **Authentication (Clerk)** | | **X** | | | Keep Clerk as authentication / identity provider; refactor out role metadata usage and integrate with internal DB user records. |
| **Authorization (RBAC)** | | | **X** | | Replace entirely with custom database-driven RBAC (Roles, Permissions, Memberships, Scopes). Existing implementation is hardcoded and bypassable. |
| **Database Schema (Prisma)**| | **X** | | | Refactor schema: unify fragmented user models, introduce `Tenant` model, add `tenantId` to all entities, composite unique indexes, and audit fields. |
| **Student Management** | | **X** | | | Keep list and single profile UI; refactor data access, add tenant isolation, roll numbers, and academic session support. |
| **Parent Management** | | **X** | | | Keep basic list layout; implement missing forms, CRUD actions, and link to unified user identity. |
| **Teacher Management** | | **X** | | | Keep directory and profile UI; refactor password handling, add designations, departments, and tenant-scoped queries. |
| **Academics: Subjects** | | **X** | | | Keep form and table; refactor unique constraints from global to tenant-scoped, add subject codes. |
| **Academics: Classes** | | **X** | | | Keep Section and Class management UI; fix Grade relation typo (`classess`), add tenant scoping, handle null supervisors gracefully. |
| **Timetable & Lessons** | | **X** | | | Keep `react-big-calendar` component; refactor date helpers (`utils.ts`) to eliminate in-place mutations, add Saturday support, and create lesson CRUD forms. |
| **Attendance** | | | **X** | | Replace with comprehensive multi-tenant attendance engine supporting daily, period-wise, and biometric/holiday exceptions. Current model is binary present/absent. |
| **Assignments** | | **X** | | | Refactor list UI; implement missing assignment form, file attachments, and submission tracking. |
| **Examinations** | | **X** | | | Refactor exam form; decouple from single lesson, link to terms and grading schemes, restore server authorization. |
| **Grades & Marks (Results)**| | | **X** | | Replace with formal grading and report card engine. Existing `Result` model (simple integer `score`) is inadequate for Indian school standards (CBSE/ICSE/State). |
| **Reports & Analytics** | | | **X** | | Replace hardcoded mock charts (`FinanceChart.tsx`, `Performance.tsx`) with genuine tenant-scoped reporting services. |
| **Messaging & Community** | | | **X** | | Existing route is missing (dead link). Build clean notification and parent-teacher communication module. |
| **Notifications** | | **X** | | | Keep UI announcement feed; refactor backend to dispatch via multi-channel background queue (WhatsApp, SMS, Email). |
| **PWA Infrastructure** | | | **X** | | Completely absent. Build from ground up with Web Manifest, Service Worker, and offline caching strategy. |
| **Background Processing** | | | **X** | | Completely absent. Introduce BullMQ + Redis queue architecture. |
| **Email & SMS Service** | | | **X** | | Completely absent. Introduce unified communications adapter (SendGrid/SES, Gupshup/Twilio). |
| **File Storage** | | | **X** | | Replace unsigned Cloudinary client widget with secure S3-compatible pre-signed upload pipeline. |
| **API Layer** | | | **X** | | Currently 0 API routes exist. Introduce clean service-repository layer, tenant-aware server actions, and REST/webhook endpoints. |
| **Mock Data (`lib/data.ts`)**| | | | **X** | Remove completely. 1,063 lines of dead code leftover from initial tutorial template. |
| **Testing Infrastructure** | | | **X** | | Completely absent. Set up Vitest, Playwright, and test fixtures from scratch. |
| **CI/CD Pipelines** | | | **X** | | Completely absent. Build automated GitHub Actions pipeline for lint, typecheck, test, and container deployment. |
