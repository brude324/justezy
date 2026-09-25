# Section D: Authentication & Authorization Audit

## 1. Authentication Mechanism

### 1.1 Provider & SDK
- **Provider**: Clerk (`@clerk/nextjs` v5.4.1).
- **Client Form**: Custom login screen built using `@clerk/elements` in [src/app/[[...sign-in]]/page.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/app/%5B%5B...sign-in%5D%5D/page.tsx).
- **Session Mechanism**: Short-lived Clerk JWT stored in cookies (`__session`), validated at the edge by `clerkMiddleware`.
- **Identity Fields**: Username and password authenticated via Clerk. Password reset flows and OAuth are not explicitly configured in code; default Clerk dashboard flows apply if enabled.

### 1.2 User Onboarding Flow
- In [src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts):
  - When an admin creates a teacher: `clerkClient.users.createUser({ username, password, firstName, lastName, publicMetadata: { role: "teacher" } })`
  - When an admin creates a student: `clerkClient.users.createUser({ username, password, firstName, lastName, publicMetadata: { role: "student" } })`
  - There is **no signup form** for end users. Account creation is done manually by an administrator via Server Actions.
  - Parents cannot be created via Server Actions (no `createParent` action exists in `actions.ts`).

---

## 2. Current Authorization Model

### 2.1 Role Representation
- There is **no database table for Roles, Permissions, or Memberships**.
- Roles are static string constants: `"admin"`, `"teacher"`, `"student"`, `"parent"`.
- The user's role is stored in Clerk's `user.publicMetadata.role`.
- When Clerk generates the JWT, `publicMetadata` is mirrored into `sessionClaims.metadata.role`.

### 2.2 Route Protection via Middleware ([src/middleware.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/middleware.ts))

```typescript
const matchers = Object.keys(routeAccessMap).map((route) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles: routeAccessMap[route],
}));

export default clerkMiddleware((auth, req) => {
  // if (isProtectedRoute(req)) auth().protect()  <-- COMMENTED OUT!

  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  for (const { matcher, allowedRoles } of matchers) {
    if (matcher(req) && !allowedRoles.includes(role!)) {
      return NextResponse.redirect(new URL(`/${role}`, req.url));
    }
  }
});
```

#### Critical Vulnerabilities & Flaws in Middleware:
1. **Unauthenticated User Redirect to `/undefined`**:
   - If an unauthenticated user navigates to `/list/teachers` (which requires `["admin", "teacher"]`), `role` is `undefined`.
   - `allowedRoles.includes(role!)` evaluates to `false`.
   - The redirect executes: `NextResponse.redirect(new URL('/' + role, req.url))` -> **Redirects to `http://localhost:3000/undefined`**, triggering a 404 instead of redirecting to `/sign-in`!
2. **Commented-Out `auth().protect()`**:
   - The standard Clerk route protection call `auth().protect()` is commented out on line 13.
3. **Public Route Hole**:
   - Any route not explicitly enumerated in `routeAccessMap` in `src/lib/settings.ts` is completely open and bypasses all middleware checks.
4. **Console Log at Edge**:
   - `console.log(matchers);` runs in module scope on every worker initialization.

---

## 3. Server-Side vs. Client-Side Authorization

### 3.1 Client-Side Navigation Guards ([src/components/Menu.tsx](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/components/Menu.tsx))
- Navigation links check `item.visible.includes(role)`.
- If an unauthorized user directly visits an unlisted route or manipulates client state, the UI links simply disappear, but this is purely cosmetic.

### 3.2 Page-Level RSC Authorization
- Most list pages (`list/teachers/page.tsx`, `list/students/page.tsx`, etc.) extract `role` from `auth().sessionClaims`.
- They do **not** verify whether the caller has permission to view the page. Instead, they use `role` to conditionally include action columns:
  ```typescript
  ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : [])
  ```
- Any authenticated user who navigates past middleware can view the entire dataset.

### 3.3 Server Action Mutation Authorization ([src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts))

| Action Function | Auth Check Present? | Role Verified? | Tenant Verified? | Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| `createSubject` | **NO** | **NO** | **NO** | **CRITICAL** |
| `updateSubject` | **NO** | **NO** | **NO** | **CRITICAL** |
| `deleteSubject` | **NO** | **NO** | **NO** | **CRITICAL** |
| `createClass` | **NO** | **NO** | **NO** | **CRITICAL** |
| `updateClass` | **NO** | **NO** | **NO** | **CRITICAL** |
| `deleteClass` | **NO** | **NO** | **NO** | **CRITICAL** |
| `createTeacher` | **NO** | **NO** | **NO** | **CRITICAL** |
| `updateTeacher` | **NO** | **NO** | **NO** | **CRITICAL** |
| `deleteTeacher` | **NO** | **NO** | **NO** | **CRITICAL** |
| `createStudent` | **NO** | **NO** | **NO** | **CRITICAL** |
| `updateStudent` | **NO** | **NO** | **NO** | **CRITICAL** |
| `deleteStudent` | **NO** | **NO** | **NO** | **CRITICAL** |
| `createExam` | Commented Out (lines 370-385) | **NO** | **NO** | **CRITICAL** |
| `updateExam` | Commented Out (lines 408-424) | **NO** | **NO** | **CRITICAL** |
| `deleteExam` | Commented Out (lines 451-459) | **NO** | **NO** | **CRITICAL** |

**Summary**: There is **zero functioning server-side authorization** guarding database mutations. Any authenticated or unauthenticated client can trigger server actions directly.

---

## 4. Insecure / Bypassable Logic & Duplications

1. **IDOR on Single Item Pages**:
   - `SingleTeacherPage` (`/list/teachers/[id]`) and `SingleStudentPage` (`/list/students/[id]`) take `params.id` directly and query `prisma.teacher.findUnique({ where: { id } })`.
   - Any student or parent can view complete personal information (blood type, birth date, phone number, address) of any teacher or student by guessing or enumerating IDs.
2. **Missing Teacher Class Ownership Check in Exam Creation**:
   - In `createExam`, lines 374-385 originally intended to check if the teacher actually teaches the lesson (`where: { teacherId: userId, id: data.lessonId }`). Because it is commented out, any teacher can create exams for another teacher's class.
3. **Password Update Schema Mismatch**:
   - In `updateTeacher` and `updateStudent`, lines 202 and 320 attempt to pass `password` to `prisma.teacher.update({ data: { password: data.password } })`.
   - The Prisma schema has **no password column** on `Teacher` or `Student` (since passwords reside in Clerk). Submitting an updated password crashes Prisma with `Unknown argument 'password'`.
