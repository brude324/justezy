# 11 — Current-to-Target Screen Migration Map

## 1. Overview & Migration Philosophy

**Status**: TARGET / MIGRATION SPECIFICATION  
**Scope**: Complete mapping of the baseline SchoolyardSMS route inventory (18 physical `page.tsx` routes, 1 compiled `/_not-found` route, and 6 dead/broken navigation links) to the target SaaS application architecture.

As established in `AGENTS.md` and the Step 0 audit (`docs/architecture-audit/07-route-screen-audit.md`), the existing routes represent a single-institution tutorial/prototype structure lacking:
- Multi-tenant pathing or subdomain resolution.
- Server-side RBAC and atomic permissions.
- Module entitlement gating.
- Platform SaaS control plane.
- Robust error handling and loading skeletons.

This migration map prescribes the exact architectural disposition for every existing route:
- **`KEEP`**: Retain core visual layout, adapting purely to multi-tenant context.
- **`REFACTOR`**: Preserve functional intent, but restructure code to use tenant-scoped service layer, Zod validation, and dynamic permissions.
- **`REPLACE`**: Scrap insecure or defective prototype implementation; build anew against target specifications.
- **`REMOVE`**: Delete obsolete, redundant, or prototype-only routes.
- **`MERGE`**: Consolidate multiple fragmented routes into a unified dynamic route.
- **`SPLIT`**: Divide an overloaded prototype route into distinct, specialized screen architectures.

---

## 2. Complete Current-to-Target Route Migration Ledger

| # | Current Route | Current Purpose & Baseline Status | Target Screen ID | Target Logical Route | Target Module | Disposition | Migration Notes & Defect Remediation |
| :-: | :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| **1** | `src/app/` (Root) | **Broken Link / 404**: No `page.tsx` exists at root. Navigating to root yields 404. | `PUB-01` | `/public` | Public & Marketing | **REPLACE** | Create SaaS public landing page with product value proposition, lead capture, and links to pricing and school login. |
| **2** | `[[...sign-in]]` | **Insecure Prototype Auth**: Uses Clerk Elements; redirects blindly based on unverified client session metadata. | `AUT-01` | `/auth/sign-in` | Authentication | **REFACTOR** | Replace with unified multi-tenant sign-in portal. Integrate server-side identity sync, tenant branding resolution, and active membership routing. |
| **3** | `/admin` | **Monolithic Admin Dashboard**: Directly queries global Prisma tables without tenant isolation. | `TNT-DSH-01` | `/tenant/dashboard` | Institutional Core | **MERGE / REFACTOR** | Merge separate `/admin`, `/teacher`, `/student`, `/parent` routes into single dynamic `/tenant/dashboard` projecting `TNT-DSH-01` when user has `dashboard.admin.read`. Enforce tenant-scoped aggregations. |
| **4** | `/teacher` | **Teacher Schedule Dashboard**: Global lesson query; unverified Clerk metadata check. | `TNT-DSH-02` | `/tenant/dashboard` | Staff Experience | **MERGE / REFACTOR** | Merge into dynamic `/tenant/dashboard` projecting `TNT-DSH-02` when caller has `dashboard.teacher.read`. Scope strictly to teacher's assigned classes (`AccessScope.ASSIGNED_ONLY`). |
| **5** | `/student` | **Student Schedule Dashboard**: Severe bug: unhandled empty array access (`classItem[0].id`) crashes server if student has no class. | `TNT-DSH-03` | `/tenant/dashboard` | Student Experience | **MERGE / REFACTOR** | Merge into dynamic `/tenant/dashboard` projecting `TNT-DSH-03`. Fix null crash bug with proper empty state; scope to `AccessScope.SELF_ONLY`. |
| **6** | `/parent` | **Parent Children Dashboard**: Queries global student table; lacks multi-child switcher. | `TNT-DSH-04` | `/tenant/dashboard` | Parent Experience | **MERGE / REFACTOR** | Merge into dynamic `/tenant/dashboard` projecting `TNT-DSH-04`. Implement multi-child switcher pill and scope strictly to `AccessScope.LINKED_CHILDREN`. |
| **7** | `/list/teachers` | **Faculty Directory**: Unscoped Prisma query; dangerous delete mapping in `FormModal.tsx`. | `TNT-STF-01` | `/tenant/teachers` | Staff Management | **REFACTOR** | Scope strictly to `tenantId`. Implement `staff_directory` module gate, server-side RBAC (`teacher.profile.read`), PII masking, and separate typed teacher deletion action. |
| **8** | `/list/teachers/[id]` | **Staff Profile Detail**: Queries global Prisma tables; lacks RBAC on sensitive PII. | `TNT-STF-02` | `/tenant/teachers/[id]` | Staff Management | **REFACTOR** | Implement 360-degree staff profile with tenant scoping, PII access control (`sensitive_data.read`), and assigned timetable view. |
| **9** | `/list/students` | **Student Directory**: Unscoped Prisma query; unverified pagination; dangerous delete modal routing. | `TNT-STU-01` | `/tenant/students` | Student Management | **REFACTOR** | Add tenant-scoped composite filtering, `student_directory` module entitlement check, roll number ordering, and guarded student enrollment drawer. |
| **10** | `/list/students/[id]` | **Student Detail Profile**: Direct RSC query; lacks role-based tab restrictions. | `TNT-STU-02` | `/tenant/students/[id]` | Student Management | **REFACTOR** | Rebuild into comprehensive Student 360 profile with attendance calendar, academic marks history, and guardian contact cards. Enforce `AccessScope` boundaries. |
| **11** | `/list/parents` | **Parent Directory**: Flat list with plain text phone numbers; no portal onboarding link. | `TNT-PAR-01` | `/tenant/parents` | Parent Management | **REFACTOR** | Add tenant scoping, `parent_directory` entitlement gate, linked children badge chips, and SMS portal invitation dispatch actions. |
| **12** | `/list/subjects` | **Subject Catalog**: Prototype table; delete action hardwired into global delete Subject action. | `TNT-SUB-01` | `/tenant/subjects` | Academic Structure | **REFACTOR** | Scope to `tenantId`. Enforce unique `[tenantId, subjectCode]` constraint and prevent deletion if linked to active lessons or exam papers. |
| **13** | `/list/classes` | **Classes & Sections**: Severe bug: throws unhandled TypeError if `supervisor` teacher is null. | `TNT-CLS-01` | `/tenant/classes` | Academic Structure | **REFACTOR** | Fix null supervisor bug with optional chaining / fallback text. Scope to `tenantId` and academic year. Enforce capacity limits and roster inspection. |
| **14** | `/list/lessons` | **Raw Lesson Slots**: Prototype table showing raw lesson slots without weekly grid context. | `TNT-TBL-01` / `TNT-TBL-02` | `/tenant/timetable` | Timetable & Scheduling | **SPLIT / REPLACE** | Split raw list into: (A) `TNT-TBL-01` Master Timetable Grid & Builder for admins/coordinators with conflict detection; (B) `TNT-TBL-02` Weekly Timetable View for teachers, students, and parents. |
| **15** | `/list/attendance` | **Dead Link / 404**: Linked in navigation menu, but route file does not exist. | `TNT-ATT-01` / `TNT-ATT-02` | `/tenant/attendance` | Attendance Management | **REPLACE (NEW)** | Build full target attendance suite: (A) `TNT-ATT-01` Daily Attendance Marking with one-thumb mobile UI and offline PWA capability; (B) `TNT-ATT-02` Attendance Analytics & Reports. |
| **16** | `/list/exams` | **Exam List**: Global list; lacks exam paper configuration or date sheet formatting. | `TNT-EXM-01` / `TNT-EXM-02` | `/tenant/exams` | Examination & Evaluation | **REFACTOR / SPLIT** | Rebuild into: (A) `TNT-EXM-01` Exam Schedules & Master; (B) `TNT-EXM-02` Exam Setup & Timetable Wizard with multi-paper scheduling and validation. |
| **17** | `/list/assignments` | **Assignments List**: Flat list without digital file submission or grading workflow. | `TNT-ASN-01` / `TNT-ASN-02` | `/tenant/assignments` | Assignments & Learning | **REFACTOR / SPLIT** | Rebuild into: (A) `TNT-ASN-01` Homework Hub; (B) `TNT-ASN-02` Creator & Submission Reviewer supporting camera snapshot uploads on mobile. |
| **18** | `/list/results` | **Results Table**: Severe bug: prints `studentName + " " + studentName` twice; lacks grading matrix. | `TNT-MRK-01` / `TNT-MRK-02` | `/tenant/results` & `/tenant/report-cards` | Examination & Evaluation | **SPLIT / REPLACE** | Fix duplicated name bug. Split into: (A) `TNT-MRK-01` Spreadsheet Marks Entry Grid with auto-calculations; (B) `TNT-MRK-02` Term Report Card Generator with PDF compilation. |
| **19** | `/list/events` | **Events Table**: Flat list table lacking calendar visualization. | `TNT-EVT-01` | `/tenant/events` | Communications | **REFACTOR** | Transform flat table into an interactive full-screen monthly/weekly calendar grid with event category filtering and holiday declarations. |
| **20** | `/list/announcements`| **Announcements List**: Simple table lacking rich text formatting or audience targeting. | `TNT-ANN-01` | `/tenant/announcements` | Communications | **REFACTOR** | Upgrade to rich circulars newsfeed with audience targeting (by grade/role), urgent pinning, PDF attachments, and SMS notification dispatch. |
| **21** | `/list/messages` | **Dead Link / 404**: Linked in navigation menu, but no model or route exists. | N/A (Future) | `/tenant/messages` | Future V2 Expansion | **REMOVE** | Remove dead link from V1 navigation. Classified as Future V2 operational expansion (`messaging_module`). |
| **22** | `/profile` | **Dead Link / 404**: Linked in navigation menu, but route file does not exist. | `ACC-01` | `/account/profile` | Universal Account | **REPLACE (NEW)** | Build universal user profile screen with identity verification, avatar upload, language preference, and multi-tenant membership listing. |
| **23** | `/settings` | **Dead Link / 404**: Linked in navigation menu, but route file does not exist. | `TNT-SET-01` & `ACC-02` | `/tenant/settings` & `/account/security` | Governance & Account | **SPLIT / REPLACE (NEW)** | Split into: (A) `TNT-SET-01` Institution Governance Settings for school admins; (B) `ACC-02` Personal Security & Password Settings for individual users. |
| **24** | `/logout` | **Dead Link / 404**: Linked in navigation menu, but no route exists. | `AUT-01` (Action) | `/auth/sign-out` (Action) | Authentication | **REFACTOR** | Replace broken route with standard Clerk sign-out handler in user menu popover. |
| **25** | `/_not-found` | **Next.js Default 404**: Generic Next.js unstyled error page. | Universal State | Multi-Tenant Error State | Platform Shell | **REFACTOR** | Brand with responsive multi-tenant 404 boundary with "Return to School Dashboard" button. |

---

## 3. Route Disposition Summary Statistics

```
Total Current Application Route References: 25
├── KEEP: 0 routes (Zero existing routes can be kept completely as-is due to lack of multi-tenancy)
├── REFACTOR: 12 routes (Preserving functional core while adding tenant scoping, RBAC, and Zod validation)
├── REPLACE / NEW: 5 routes (Fixing 404 dead links: Public Landing, Attendance, Profile, Settings)
├── SPLIT: 4 routes (Lessons -> Builder/View; Exams -> Schedule/Wizard; Assignments -> Hub/Reviewer; Results -> Marks/ReportCards)
├── MERGE: 4 routes (Separate /admin, /teacher, /student, /parent dashboards -> Unified dynamic /tenant/dashboard)
└── REMOVE: 1 route (Dead link /list/messages deferred to V2 roadmap)
```

---

## 4. Remediation of Known Critical Baseline Defects

During implementation of the target screen architecture, developers must strictly verify that the following Step 0 defects are permanently eliminated:

1. **Dangerous Delete Routing in `FormModal.tsx`**:
   - *Current Baseline*: Mapped deletions of 7 unrelated entity types to `deleteSubject`.
   - *Target Resolution*: Every target screen uses an explicit, type-safe, tenant-scoped Server Action adhering to `docs/screens/10-screen-action-contract.md`.
2. **Student Dashboard Unhandled Crash (`classItem[0].id`)**:
   - *Current Baseline*: Crashes if newly enrolled student lacks class assignment.
   - *Target Resolution*: `TNT-DSH-03` implements graceful Empty State with helpful onboarding guidance when `classItem.length === 0`.
3. **Class List Null Supervisor Crash**:
   - *Current Baseline*: Crashes on `item.supervisor.name` if teacher unassigned.
   - *Target Resolution*: `TNT-CLS-01` implements optional chaining and displays "Unassigned" placeholder badge.
4. **Results List Duplicate Name Bug**:
   - *Current Baseline*: Prints `studentName + " " + studentName`.
   - *Target Resolution*: `TNT-MRK-01` and `TNT-MRK-02` display full legal student name (`firstName + " " + lastName`).
