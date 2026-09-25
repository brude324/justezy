# Section B: Technology Stack Audit

## 1. Verified Technology Stack & Dependency Inventory

All versions and packages are sourced directly from [package.json](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/package.json) and verified via node runtime.

| Layer / Concern | Technology | Exact Version | Configuration & Entry Points | Migration Relevance |
| :--- | :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `14.2.5` | [next.config.mjs](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/next.config.mjs) (ESM) | Compatible with App Router; needs PWA setup, middleware modernization, and route handler additions. |
| **UI Library** | React / React DOM | `^18.0.0` (18.3.1) | Installed via npm | Standard React 18 concurrent features. |
| **Language** | TypeScript | `^5.0.0` (5.5.4) | [tsconfig.json](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/tsconfig.json) (`strict: true`, `@/*` alias) | Strict mode active, compiles cleanly with zero emit errors. |
| **Node Runtime** | Node.js | v24.15.0 (host), `FROM node:18` (Docker) | [Dockerfile](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/Dockerfile) | Host uses Node 24; Docker specifies Node 18 LTS. Standardize on Node 20/22 LTS. |
| **Package Manager**| npm | `10.7.0` | [package-lock.json](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/package-lock.json) (lockfileVersion: 3) | Standard npm package management. |
| **Database** | PostgreSQL | 15 (Docker) / Hosted (Supabase) | `.env.local`, [docker-compose.yml](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/docker-compose.yml) | Target DB engine. Schema must be restructured for multi-tenancy and dynamic RBAC. |
| **ORM** | Prisma Client & CLI | `^5.19.1` | [prisma/schema.prisma](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/prisma/schema.prisma), [src/lib/prisma.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/prisma.ts) | Retain Prisma ORM. Needs client extension for tenant scoping and soft delete. |
| **Authentication** | Clerk Next.js SDK | `@clerk/nextjs` `^5.4.1`<br>`@clerk/elements` `^0.14.6` | [src/app/layout.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/layout.tsx), [src/middleware.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/middleware.ts) | Retain for Identity only (`userId`, session JWT). Decouple from Clerk metadata RBAC. |
| **Styling** | Tailwind CSS | `^3.4.1` | [tailwind.config.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/tailwind.config.ts), [postcss.config.mjs](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/postcss.config.mjs) | Custom pastel colors (`lamaSky`, `lamaPurple`, `lamaYellow`). Needs design system upgrade. |
| **Form Management**| React Hook Form | `^7.52.2` | Used across `src/components/forms/*.tsx` | Retain for complex interactive forms. |
| **Validation** | Zod | `^3.23.8` | [src/lib/formValidationSchemas.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/formValidationSchemas.ts) | Retain for DTO and form input validation. Needs missing schemas added. |
| **Form Resolvers** | Hookform Resolvers | `^3.9.0` | Used in form components with `@hookform/resolvers/zod` | Retain for binding Zod to React Hook Form. |
| **File Storage** | Cloudinary | `next-cloudinary` `^6.13.0` | [src/components/forms/TeacherForm.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/forms/TeacherForm.tsx), `StudentForm.tsx` | Unsigned upload widget. Replace with secure S3-compatible pre-signed upload pipeline. |
| **Charts** | Recharts | `^2.12.7` | `CountChart.tsx`, `AttendanceChart.tsx`, `FinanceChart.tsx` | Retain for dashboard data visualization. |
| **Calendar UI** | React Big Calendar | `^1.13.2` | [src/components/BigCalender.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/BigCalender.tsx) | Retain for timetable/schedule visualization. |
| **Date Library** | Moment.js | `^2.30.1` | Localizer for `react-big-calendar` | Moment is in maintenance mode. Consider replacing with Day.js or date-fns in future. |
| **Mini Calendar** | React Calendar | `^5.0.0` | [src/components/EventCalendar.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/EventCalendar.tsx) | Lightweight interactive date picker. |
| **Notifications UI**| React Toastify | `^10.0.5` | [src/app/layout.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/layout.tsx) | Toast feedback on mutation actions. |
| **Background Queue**| None | **ABSENT** | N/A | Must be added (BullMQ + Redis) for asynchronous workloads. |
| **PWA** | None | **ABSENT** | N/A | Must be implemented (`@serwist/next` or custom SW + webmanifest). |
| **Testing** | None | **ABSENT** | N/A | Must install Vitest / Jest, Playwright, React Testing Library. |
| **Linter** | ESLint | `^8.0.0`, `eslint-config-next: 14.2.5` | [.eslintrc.json](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/.eslintrc.json) | Basic Next.js core web vitals linting. |

---

## 2. Technology Stack Gaps & Migration Assessment

1. **Authentication vs Authorization Coupling**:
   - The application relies on `@clerk/elements` and Clerk's `publicMetadata` to pass the user's role into session claims.
   - For a multi-tenant platform in India, institutions need fine-grained roles (e.g., Principal, Accountant, Class Teacher, Exam Coordinator) with dynamic permissions stored in PostgreSQL, not hardcoded into third-party token payloads.
2. **Missing Async/Worker Infrastructure**:
   - Bulk notifications, report card generation, SMS/WhatsApp messaging, and data imports cannot run in Next.js Server Action request cycles without hitting timeouts. BullMQ + Redis are essential.
3. **No Storage Abstraction**:
   - Media storage uses `next-cloudinary` with hardcoded client-side upload presets (`uploadPreset="school"`). There is no multi-tenant isolation in storage buckets, no server-side signing, and no support for PDFs, student documents, or reports.
4. **No Automated Testing Baseline**:
   - Zero test dependencies exist in `package.json` (`devDependencies`). No test suite can be run prior to migration.
