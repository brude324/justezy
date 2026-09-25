# Section A: Repository Structure Audit

## 1. Directory Tree Overview

```
c:\Users\Abhijeet Rawat\Desktop\justezy\
├── .env.example                     # Environment template (contains active credentials)
├── .env.local                       # Local environment variables
├── .eslintrc.json                   # ESLint configuration
├── .gitignore                       # Git ignore list
├── Dockerfile                       # Multi-stage/single container build script (defective)
├── docker-compose.yml               # Local services definition (defective naming)
├── next-env.d.ts                    # Next.js TypeScript definitions
├── next.config.mjs                  # Next.js runtime configuration
├── package-lock.json                # NPM dependency lockfile (v3)
├── package.json                     # NPM project manifest
├── postcss.config.mjs               # PostCSS plugins (Tailwind)
├── README.md                        # Upstream tutorial README
├── tailwind.config.ts               # Tailwind CSS theme extension
├── tsconfig.json                    # TypeScript compiler config
├── prisma/
│   ├── migration_lock.toml          # Prisma engine lock
│   ├── schema.prisma                # Core Prisma data model (14 models, 2 enums)
│   ├── seed.ts                      # Database seeder script
│   └── migrations/
│       ├── 20240905145454_init/
│       │   └── migration.sql        # Initial migration
│       └── 20240913083652_addbirthday/
│           └── migration.sql        # Added birthday to Teacher and Student
├── public/                          # 41 static PNG icons and logos (no PWA manifest)
└── src/
    ├── middleware.ts                # Clerk route protection middleware
    ├── app/
    │   ├── globals.css              # Global styles & Tailwind directives
    │   ├── layout.tsx               # Root application layout (ClerkProvider, ToastContainer)
    │   ├── favicon.ico              # Browser icon
    │   ├── [[...sign-in]]/
    │   │   └── page.tsx             # Custom Clerk sign-in form using @clerk/elements
    │   └── (dashboard)/             # Main authenticated route group
    │       ├── layout.tsx           # Dashboard shell (Sidebar Menu + Top Navbar + Content)
    │       ├── admin/
    │       │   └── page.tsx         # Admin analytics dashboard
    │       ├── teacher/
    │       │   └── page.tsx         # Teacher schedule dashboard
    │       ├── student/
    │       │   └── page.tsx         # Student schedule dashboard
    │       ├── parent/
    │       │   └── page.tsx         # Parent child schedule dashboard
    │       └── list/                # Entity table listing views
    │           ├── loading.tsx      # Fallback loading spinner
    │           ├── teachers/
    │           │   ├── page.tsx     # Teacher list view
    │           │   └── [id]/
    │           │       └── page.tsx # Single teacher profile
    │           ├── students/
    │           │   ├── page.tsx     # Student list view
    │           │   └── [id]/
    │           │       └── page.tsx # Single student profile
    │           ├── parents/
    │           │   └── page.tsx     # Parent list view
    │           ├── subjects/
    │           │   └── page.tsx     # Subject list view
    │           ├── classes/
    │           │   └── page.tsx     # Class list view
    │           ├── lessons/
    │           │   └── page.tsx     # Lesson list view
    │           ├── exams/
    │           │   └── page.tsx     # Exam list view
    │           ├── assignments/
    │           │   └── page.tsx     # Assignment list view
    │           ├── results/
    │           │   └── page.tsx     # Assessment results list view
    │           ├── events/
    │           │   └── page.tsx     # Institutional events list view
    │           └── announcements/
    │               └── page.tsx     # Bulletin announcements list view
    ├── components/
    │   ├── Announcements.tsx        # Announcement feed card
    │   ├── AttendanceChart.tsx      # Bar chart component (recharts)
    │   ├── AttendanceChartContainer.tsx # Async RSC for attendance data calculation
    │   ├── BigCalendarContainer.tsx # Async RSC fetching lessons for calendar
    │   ├── BigCalender.tsx          # Client wrapper around react-big-calendar
    │   ├── CountChart.tsx           # Radial pie chart (boys/girls)
    │   ├── CountChartContainer.tsx  # Async RSC calculating gender ratios
    │   ├── EventCalendar.tsx        # Mini react-calendar date picker
    │   ├── EventCalendarContainer.tsx # RSC wrapping calendar and event query
    │   ├── EventList.tsx            # Event list filtered by date
    │   ├── FinanceChart.tsx         # Mock income/expense line chart
    │   ├── FormContainer.tsx        # Async RSC prefetching related data for modals
    │   ├── FormModal.tsx            # Client modal coordinator for CRUD operations
    │   ├── InputField.tsx           # Reusable form text input with react-hook-form
    │   ├── Menu.tsx                 # Sidebar navigation links
    │   ├── Navbar.tsx               # Top navigation bar with user profile
    │   ├── Pagination.tsx           # Reusable query-param based pagination controls
    │   ├── Performance.tsx          # Mock semi-circle pie chart
    │   ├── StudentAttendanceCard.tsx# Async RSC computing student attendance rate
    │   ├── Table.tsx                # Reusable table markup renderer
    │   ├── TableSearch.tsx          # Client search bar updating URL query string
    │   ├── UserCard.tsx             # Metric summary card (counts entity rows)
    │   └── forms/                   # Form implementations (react-hook-form + zod)
    │       ├── ClassForm.tsx        # Create/Update Class form
    │       ├── ExamForm.tsx         # Create/Update Exam form
    │       ├── StudentForm.tsx      # Create/Update Student form
    │       ├── SubjectForm.tsx      # Create/Update Subject form
    │       └── TeacherForm.tsx      # Create/Update Teacher form
    └── lib/
        ├── actions.ts               # Next.js Server Actions for CRUD operations
        ├── data.ts                  # Dead code: 1,063 lines of tutorial mock data
        ├── formValidationSchemas.ts # Zod validation schemas for forms & actions
        ├── prisma.ts                # PrismaClient singleton instance
        ├── settings.ts              # Route access rules & pagination constants
        └── utils.ts                 # Date/schedule adjustment helpers
```

---

## 2. Structural & Architectural Analysis

### 2.1 File Placement & Conventions
- **Routing**: Strictly uses Next.js 14 App Router under `src/app/`. The routing tree is split into `[[...sign-in]]` (authentication) and `(dashboard)` (authenticated application shell).
- **API Routes**: **Zero API route handlers exist** (`src/app/api` does not exist). The repository relies entirely on React Server Components (RSC) for data reads and Next.js Server Actions in `src/lib/actions.ts` for mutations.
- **Shared Libraries**: Core utilities reside in `src/lib/`. However, `src/lib/data.ts` contains 1,063 lines of legacy mock data that is never imported by any active component.
- **Components**: Flat structure in `src/components/`, with a single subfolder `src/components/forms/`. Components are tightly coupled to domain models without a generic UI design system (e.g., no Radix, Shadcn, or Tailwind UI primitives).
- **Typographical Irregularities**:
  - `src/components/BigCalender.tsx` is misspelled with an `e` (`Calender` instead of `Calendar`).
  - `model Grade { classess Class[] }` in `prisma/schema.prisma` contains a misspelling (`classess`).

### 2.2 Background Workers & Jobs
- There are **no queue directories, worker scripts, or job processors**.
- No BullMQ, Redis, or Celery integration exists anywhere in the repository.

### 2.3 Configuration & Infrastructure
- `next.config.mjs`: Only configures `images.remotePatterns` for `images.pexels.com`. PWA plugins, headers, security policies, and build optimization flags are missing.
- `Dockerfile`: Single-stage Dockerfile attempting to run `npx prisma migrate dev --name init` during image build, which breaks in containerized CI environments without a live DB.
- `docker-compose.yml`: Defines a `postgress` service (double 's') while the `app` container specifies `depends_on: - postgres` (single 's'), rendering `docker compose up` non-functional out of the box.
- `.env.example`: Leaks active Supabase database credentials, Clerk API keys, and Cloudinary identifiers.

### 2.4 Test Directories
- **Zero test files exist** across the entire repository. There are no unit test, integration test, or E2E test folders.
