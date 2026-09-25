# Section K: Comprehensive Security Audit

## 1. Executive Security Assessment

The existing codebase contains **multiple severe security vulnerabilities** that make it entirely unsuitable for production or multi-tenant deployment in its current state. The application relies primarily on client-side visual masking (hiding UI buttons) rather than server-side policy enforcement.

---

## 2. Identified Vulnerabilities & Detailed Findings

### 2.1 Complete Authorization Bypass on Server Actions (CRITICAL)
- **File**: [src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts)
- **Vulnerability**: Every Server Action (`createSubject`, `deleteSubject`, `createClass`, `deleteClass`, `createTeacher`, `deleteTeacher`, `createStudent`, `deleteStudent`, `createExam`, `deleteExam`) can be invoked by **ANY** caller—including unauthenticated anonymous users.
- **Evidence**:
  - The actions lack any call to `auth()` or role verification.
  - In `createExam`, `updateExam`, and `deleteExam`, the authorization code was deliberately commented out:
    ```typescript
    // const { userId, sessionClaims } = auth();
    // const role = (sessionClaims?.metadata as { role?: string })?.role;
    // if (role === "teacher") { ... }
    ```
- **Consequence**: An attacker can send a direct POST request to Next.js's internal Server Action endpoint and delete or insert teachers, students, classes, or exams without credentials.

### 2.2 Broken Delete Action Routing / Unintended Data Loss (CRITICAL)
- **File**: [src/components/FormModal.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/FormModal.tsx#L18-L32)
- **Vulnerability**: In `deleteActionMap`, delete actions for `parent`, `lesson`, `assignment`, `result`, `attendance`, `event`, and `announcement` are all mapped to `deleteSubject`:
  ```typescript
  const deleteActionMap = {
    subject: deleteSubject,
    class: deleteClass,
    teacher: deleteTeacher,
    student: deleteStudent,
    exam: deleteExam,
    parent: deleteSubject,        // BUG!
    lesson: deleteSubject,        // BUG!
    assignment: deleteSubject,    // BUG!
    result: deleteSubject,        // BUG!
    attendance: deleteSubject,    // BUG!
    event: deleteSubject,         // BUG!
    announcement: deleteSubject,  // BUG!
  };
  ```
- **Consequence**: An administrator attempting to delete an announcement or lesson with ID 5 will unintentionally execute `deleteSubject` on Subject ID 5 (e.g., Mathematics), permanently destroying academic curriculum records.

### 2.3 Leaked Credentials in Version Control (CRITICAL)
- **File**: [/.env.example](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/.env.example)
- **Vulnerability**: Contains hardcoded, live database connection strings, Clerk test secret keys, and Cloudinary cloud names:
  ```env
  DATABASE_URL="postgresql://postgres:brude#654@supabse@db.cjchjrktleihxbdimdjp.supabase.co:5432/postgres"
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
  CLERK_SECRET_KEY="sk_test_..."
  ```
- **Consequence**: Anyone with access to the repository can directly connect to the Supabase database instance with administrative privileges and read, alter, or drop the entire dataset.

### 2.4 Middleware Failure / Bypassable Authentication (HIGH)
- **File**: [src/middleware.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/middleware.ts)
- **Vulnerability**:
  - `auth().protect()` is commented out.
  - When an unauthenticated visitor hits an administrative URL like `/list/teachers`, the middleware redirects to `/${role}` where `role` is `undefined`, sending the user to `http://localhost:3000/undefined`.
  - Any URL not explicitly enumerated in `routeAccessMap` is served without any authentication requirement.

### 2.5 Insecure Direct Object References (IDOR) & Sensitive PII Exposure (HIGH)
- **Files**:
  - [src/app/(dashboard)/list/teachers/[id]/page.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%28dashboard%29/list/teachers/%5Bid%5D/page.tsx)
  - [src/app/(dashboard)/list/students/[id]/page.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%28dashboard%29/list/students/%5Bid%5D/page.tsx)
- **Vulnerability**: Routes accept arbitrary `id` path parameters and perform an unconditional `findUnique` query without verifying whether the requesting user has permission to inspect that record.
- **Consequence**: Any student or parent can view sensitive PII (blood type, birth date, residential address, personal phone number, and guardian contacts) of any teacher or student across the institution.

### 2.6 Total Absence of Multi-Tenant Scoping (CRITICAL)
- **All Models & Queries**: No model has a `tenant_id` foreign key.
- **Consequence**: In a multi-tenant environment, any query executed returns data from all schools simultaneously, causing complete cross-tenant data leaks and privacy violations.

### 2.7 Unrestricted File Upload via Unsigned Cloudinary Widget (MEDIUM)
- **Files**: `TeacherForm.tsx`, `StudentForm.tsx`
- **Vulnerability**: Uses client-side unsigned upload preset (`uploadPreset="school"`). There is no server-side validation of file mime-types, file size, or tenant folder ownership.

### 2.8 Rate Limiting & Denial of Service (HIGH)
- **Vulnerability**: Zero rate-limiting middleware or Redis token-bucket mechanisms are configured.
- **Consequence**: Server Action endpoints and expensive aggregated RSC queries (e.g. `AttendanceChartContainer`) can be spammed to exhaust PostgreSQL connection pools and CPU resources.
