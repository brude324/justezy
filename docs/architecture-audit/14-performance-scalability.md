# Section N: Performance & Scalability Audit

## 1. Database & Query Performance (Current Implementation)

### 1.1 Unindexed Sequential Table Scans
- **No Secondary Indexes**: The Prisma schema defines zero secondary indexes. Foreign keys (`studentId`, `lessonId`, `classId`, `teacherId`, `gradeId`, `parentId`, `subjectId`) do not possess indexes.
- **Impact**: Every query with a `where: { classId: ... }`, `where: { teacherId: ... }`, or relation include executes a sequential table scan in PostgreSQL. In a multi-tenant environment with thousands of students and attendance rows, database CPU utilization will increase and query latency may become a significant scalability bottleneck requiring validation through profiling.

### 1.2 Unbounded In-Memory Data Processing
- **Attendance Aggregation in Memory**:
  - In `AttendanceChartContainer.tsx`, all attendance records since the previous Monday are retrieved:
    ```typescript
    const resData = await prisma.attendance.findMany({
      where: { date: { gte: lastMonday } },
      select: { date: true, present: true },
    });
    ```
  - Without an upper date bound or tenant filter, every attendance record across all classes is pulled into Node.js heap memory, where a JavaScript `forEach` loop populates an in-memory aggregation dictionary.
- **Annual Student Attendance Card**:
  - In `StudentAttendanceCard.tsx`, every attendance row for the current year is fetched into Node.js:
    ```typescript
    const attendance = await prisma.attendance.findMany({
      where: { studentId: id, date: { gte: new Date(new Date().getFullYear(), 0, 1) } },
    });
    ```
  - Instead of executing an efficient SQL `COUNT(*) FILTER (WHERE present = true)`, it transfers all rows over the wire and filters in JavaScript: `attendance.filter((day) => day.present).length`.

### 1.3 Sequential Database Roundtrips & Transaction Contention
- In all list pages (e.g. `TeacherListPage`, `StudentListPage`), queries execute as:
  ```typescript
  const [data, count] = await prisma.$transaction([
    prisma.teacher.findMany({ ... }),
    prisma.teacher.count({ ... }),
  ]);
  ```
  While wrapping in `$transaction` batches them, running `count()` over an unindexed table on every page load creates read contention on PostgreSQL that requires optimization prior to scaling.

---

## 2. Rendering & Client Hydration Performance

### 2.1 Heavy Client Component Trees
- Multiple components marked `"use client"` import large third-party visualization libraries:
  - `recharts` is loaded on both the Admin dashboard and single profile pages (`Performance.tsx`).
  - `react-big-calendar` and `moment` bundle large date localization assets into client chunks.
- These components should be evaluated for code-splitting using `next/dynamic` with `ssr: false` where server pre-rendering provides no SEO or performance benefit.

### 2.2 Re-Rendering Cascades in Modals
- In [src/components/FormModal.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/FormModal.tsx), the dynamic form loader defines child forms inside the render function:
  ```typescript
  const Form = () => { ... }
  ```
  Declaring a React component inside another component body causes React to unmount, remount, and discard DOM state on re-renders of `FormModal`.

---

## 3. Multi-Tenant Scaling Bottlenecks (Identified Risks)

1. **Shared Unscoped Tables**:
   - Because no tenant separation exists currently, every query queries the entire global table. As tenant count grows, single-tenant queries will slow down proportionally to the total data size of all other tenants unless tenant indexes and scoping are enforced.
2. **Missing Caching Layer**:
   - Institutional metadata (school settings, class lists, subject catalogues, academic calendar) changes infrequently during school hours, yet is queried directly from PostgreSQL on every page navigation.
   - Introducing Redis / Next.js `unstable_cache` with tag-based revalidation can reduce redundant read traffic for static institutional configuration data.
3. **Database Connection Limits**:
   - `src/lib/prisma.ts` creates a singleton `PrismaClient`. In serverless or containerized autoscaling deployments, each container replica instantiates its own connection pool. Without connection pooling (PgBouncer or Supabase Supavisor), PostgreSQL connection limits may be exceeded under load.
