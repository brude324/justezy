# Target Project Structure & Modular Organization

## 1. Architectural Organization Model

**Status**: TARGET / PROPOSED

To support multi-tenancy, clean service boundaries, and robust automated testing, the codebase will evolve from its current flat tutorial layout into a modular, domain-driven structure.

```
justezy/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # PR validation (lint, typecheck, test, build)
│       └── deploy.yml                 # Staging & Production deployment pipeline
├── docs/                              # Authoritative architectural & audit specifications
├── prisma/
│   ├── schema.prisma                  # Target multi-tenant relational schema
│   ├── seed.ts                        # Multi-tenant test fixtures & institutional seed
│   └── migrations/                    # Versioned SQL migrations (via prisma migrate deploy)
├── src/
│   ├── app/                           # Next.js App Router (Routing & Presentation)
│   │   ├── (auth)/                    # Sign-in, sign-up, password reset layouts
│   │   ├── (dashboard)/               # Institutional dashboard layout shell
│   │   │   ├── [tenant]/              # Tenant-scoped route group (if path routing chosen)
│   │   │   ├── admin/                 # Institutional Administrator screens
│   │   │   ├── teacher/               # Staff & Instructor portal
│   │   │   ├── student/               # Student portal
│   │   │   ├── parent/                # Parent & Guardian portal
│   │   │   └── list/                  # Standardized tabular list views (11 routes)
│   │   ├── api/                       # API Route Handlers (Webhooks, Mobile JSON)
│   │   │   ├── webhooks/
│   │   │   │   ├── clerk/             # Clerk identity event webhook
│   │   │   │   └── payments/          # Razorpay payment confirmation webhook
│   │   │   └── v1/                    # External REST endpoints
│   │   ├── layout.tsx                 # Root layout with providers & font optimization
│   │   └── not-found.tsx              # Generic 404 handler
│   ├── components/                    # Reusable React UI Components
│   │   ├── ui/                        # Atomic design primitives (Buttons, Inputs, Dialogs)
│   │   ├── forms/                     # Zod-validated domain form dialogs
│   │   ├── tables/                    # Standardized pagination & data tables
│   │   └── charts/                    # Recharts wrappers with responsive containers
│   ├── services/                      # Unified Domain Service Layer (Pure Business Logic)
│   │   ├── academic.service.ts        # Classes, Sections, Subjects, Terms
│   │   ├── attendance.service.ts      # Daily & Subject attendance processing
│   │   ├── assessment.service.ts      # Exams, Marks entry, Gradebooks
│   │   ├── profile.service.ts         # Student, Staff, and Parent profiles
│   │   ├── notification.service.ts    # Notification dispatch & queue producer
│   │   ├── storage.service.ts         # S3 pre-signed upload & download pipeline
│   │   └── audit.service.ts           # Atomic transaction auditing
│   ├── lib/                           # Core Infrastructure, Utilities & Config
│   │   ├── actions/                   # Server Actions wrapped with authorization guards
│   │   ├── auth/                      # Clerk session verification & context initialization
│   │   ├── rbac/                      # Permission evaluator, scope validator, role definitions
│   │   ├── tenant/                    # Server-side tenant resolver & AsyncLocalStorage context
│   │   ├── prisma.ts                  # Extended Prisma Client singleton
│   │   ├── redis.ts                   # Redis client singleton for queues & caching
│   │   ├── queue.ts                   # BullMQ queue definitions & job producers
│   │   └── validations/               # Zod DTO schemas for all entities and actions
│   └── workers/                       # Standalone Asynchronous Job Workers (Node.js)
│       ├── worker.ts                  # BullMQ worker process entry point
│       ├── handlers/                  # Dedicated job handlers (SMS, PDF, Bulk Import)
│       └── cron.ts                    # Scheduled maintenance & reconciliation jobs
└── tests/                             # Comprehensive Automated Test Suites
    ├── unit/                          # Pure unit tests (validators, permission checks)
    ├── integration/                   # Database & service layer integration tests
    ├── e2e/                           # Playwright end-to-end browser workflows
    └── fixtures/                      # Deterministic test data & tenant seeds
```
