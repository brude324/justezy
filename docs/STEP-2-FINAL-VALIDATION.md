# Step 2 — Final Screen Architecture Validation

## 1. Executive Validation Summary

**Step**: STEP 2 — APPLICATION INFORMATION ARCHITECTURE & ROUTE ARCHITECTURE  
**Status**: VALIDATED & COMPLETE  
**Controlling Specifications**: `docs/screens/`, `docs/product/`, `docs/architecture/`, `docs/engineering/`, `docs/roadmap/`, `docs/architecture-audit/`  
**Application Code Modifications**: Exactly **0** lines of application source code modified; zero database migrations run; zero packages installed.

This document provides final architectural verification of the information architecture, route namespaces, dynamic navigation hierarchies, role-to-permission access matrices, module entitlement gates, responsive PWA behaviors, and baseline migration mappings designed across Step 2A, Step 2B, and Step 2C.

---

## 2. Quantitative Architecture Statistics

```
Total Target V1 Physical Screens: 38
├── Public & Marketing Screens: 3 (PUB-01, PUB-02, PUB-03)
├── Authentication & Identity Screens: 4 (AUT-01, AUT-02, AUT-03, AUT-04)
├── Platform SaaS Control Plane Screens: 7 (PLT-01 through PLT-07)
├── Tenant Workspace Screens: 20 (Dashboards, Staff, Students, Parents, Academics, Timetable, Attendance, Exams, Homework, Marks, Comms, Settings)
└── Universal Account & Identity Screens: 4 (ACC-01, ACC-02, ACC-03, ACC-04)

Total Future Architecture Placeholders:
├── Total V2 Module Placeholders: 8 (Admissions, Fees/Billing, Library, Transport, Inventory, Staff HR/Payroll, Advanced Analytics, Integrations)
└── Total V3 Module Placeholders: 5 (Multi-Branch Federation, Custom Form Engine, LMS, Alumni Network, Public API Marketplace)

Screen Distribution by Access Archetype:
├── Public Unauthenticated Screens: 4 (PUB-01, PUB-02, PUB-03, AUT-01)
├── Platform Super Admin Only: 7 (PLT-01 through PLT-07)
├── Tenant Admin & Leadership Only: 3 (TNT-DSH-01, TNT-ACD-01, TNT-SET-01)
├── Role-Projected Dynamic Views: 4 (TNT-DSH-01..04, TNT-TBL-02, TNT-MRK-01, TNT-ASN-02)
└── Shared / Universal Across Roles: 20 (Notifications, Circulars, Calendar, Profile, Security, Timetable View, Directories with Scope Gating)

Screen Distribution by Client Optimization:
├── PWA-Critical (Mobile-First / Offline Sync Candidates): 11 Screens
├── Desktop-Primary (Data Entry / Heavy Administration): 13 Screens
└── Desktop + Mobile Fully Responsive: 14 Screens

Baseline Repository Migration Classification:
├── Existing Baseline Routes Refactored: 12 Routes
├── Existing Dead Links / Missing Pages Replaced with New Specs: 5 Routes
├── Split Routes (Decomposing overloaded prototype lists): 4 Routes
├── Merged Routes (Consolidating fragmented role dashboards): 4 Routes
└── Dead Routes Deprecated / Deferred to V2: 1 Route (`/list/messages`)
```

---

## 3. Systematic Architectural Checks (20-Point Checklist)

1. **Every V1 module has required screens**:  
   *Verified*. All V1 modules defined in `docs/roadmap/01-phased-roadmap.md` (Tenant Onboarding, Identity, Staff, Students, Parents, Academic Structure, Timetable, Daily Attendance, Exams, Homework, Marks, Circulars, Events, Notifications, Platform Control Plane) have fully specified screen suites.
2. **Every screen has a unique Screen ID**:  
   *Verified*. Screen IDs follow a strict uppercase domain prefix naming convention (`PUB-xx`, `AUT-xx`, `PLT-xx`, `TNT-xxx-xx`, `ACC-xx`). No duplicates exist across the registry.
3. **Every route is unique**:  
   *Verified*. Logical route namespaces are strictly isolated (`/public`, `/auth`, `/platform`, `/tenant`, `/account`). Parameterized routes (`/tenant/students/[id]`, `/platform/tenants/[id]`) do not collide with static endpoints.
4. **Every screen has a defined primary user**:  
   *Verified*. Documented in all individual specifications under `docs/screens/specs/` and indexed in `docs/STEP-2-SCREEN-INDEX.md`.
5. **Every protected screen has permission requirements**:  
   *Verified*. Every protected route explicitly declares an atomic permission string (e.g., `attendance.mark`, `exam.publish`). Zero protected screens rely on insecure, unverified client metadata.
6. **Tenant-facing screens have tenant scope**:  
   *Verified*. All 20 tenant-facing screens enforce mandatory verified `tenantId` context and declare horizontal `AccessScope` boundaries (`INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN`).
7. **Module-enabled/disabled behavior is defined**:  
   *Verified*. Screen contracts define deterministic Gate 1 evaluation (`HTTP 402 Module Disabled` vs `HTTP 403 Forbidden`). Unlicensed modules render upgrade cards without disclosing internal table structures.
8. **Platform screens are separated from tenant screens**:  
   *Verified*. SaaS Control Plane (`/platform/*`) operates exclusively under `PlatformScope.GLOBAL` and cannot be accessed from within institutional tenant subdomains.
9. **No screen depends directly on a role when a permission contract is more appropriate**:  
   *Verified*. Enforces **`ROLE != PERMISSION`**. Dynamic dashboards at `/tenant/dashboard` render views based on atomic capabilities (`dashboard.admin.read`, `dashboard.teacher.read`, etc.) rather than hardcoded role strings.
10. **Sensitive PII visibility is defined**:  
    *Verified*. Personal identifiers (Aadhaar numbers, bank account numbers, medical notes) are explicitly masked across directory and profile views (`TNT-STF-01/02`, `TNT-STU-01/02`), requiring dedicated `sensitive_data.read` authorization for unmasking.
11. **List/detail/create/edit flows are connected**:  
    *Verified*. Every entity domain has documented navigation connections linking List -> Detail -> Drawer/Modal Form -> Row Action Deletion.
12. **Navigation does not expose disabled modules**:  
    *Verified*. Navigation evaluation engine (`docs/screens/03-navigation-architecture.md`) dynamically filters menu items against tenant `ModuleEntitlement` flags before rendering client shells.
13. **Unauthorized and forbidden states are defined**:  
    *Verified*. Documented in `docs/screens/09-screen-state-contract.md` with explicit UX and security logging contracts for HTTP 401 and HTTP 403.
14. **Empty/loading/error states exist**:  
    *Verified*. Every screen defines content skeletons (preventing CLS), Absolute vs. Filtered Empty states, and partial degradation boundaries.
15. **Mobile behavior is defined**:  
    *Verified*. All 38 screens have documented Desktop, Tablet, and Mobile layouts with thumb-zone ergonomics.
16. **PWA-critical screens are identified**:  
    *Verified*. 11 screens (`TNT-ATT-01`, `TNT-TBL-02`, `TNT-DSH-02..04`, `TNT-NOT-01`, `TNT-ASN-01..02`, `TNT-MRK-02`, `TNT-ANN-01`, `ACC-03`) are designated for standalone PWA installation, mobile touch optimization, and offline sync readiness.
17. **V1/V2/V3 classification is consistent with docs/roadmap**:  
    *Verified*. Consistent with `docs/roadmap/01-phased-roadmap.md`. V2 modules (Fees, Transport, Library) and V3 modules (LMS, Multi-Branch Federation) are represented purely as logical route placeholders without premature V1 screen bloat.
18. **Existing SchoolyardSMS screens that will be reused/refactored are mapped**:  
    *Verified*. Complete 25-route mapping compiled in `docs/screens/11-current-to-target-screen-migration-map.md`.
19. **Existing broken/dead routes are explicitly classified**:  
    *Verified*. Baseline defects (`/` 404, `/list/attendance` 404, `/profile` 404, `/settings` 404, `/list/messages` 404, `/logout` 404, dangerous `FormModal` delete routing, and unhandled null crashes) are documented with concrete remediation specs.
20. **No database design has been prematurely embedded into screen specifications**:  
    *Verified*. Screen specifications establish the conceptual data requirements, relationships, and invariants needed by the user interfaces without prematurely dictating physical SQL column types, index names, or migration scripts.

---

## 4. Open Architectural Decisions (`OPEN DECISION`)

The following architectural decisions remain intentionally decoupled from the Information Architecture and will be definitively resolved in Step 3 database design and Step 4 implementation:

### 1. `OPEN DECISION`: Physical Tenant Routing Strategy
- **Context**: Screen architecture defines logical `/tenant/*` namespace.
- **Alternatives**:
  - *Option A (Recommended)*: Subdomain routing (`https://greenwood.schoolyardsms.in/dashboard`).
  - *Option B*: Path-prefix routing (`https://schoolyardsms.in/tenant/greenwood/dashboard`).
  - *Option C*: Hybrid supporting both subdomains and custom apex domains (`portal.greenwoodhigh.edu`).
- **Resolution Point**: Step 4 Middleware & Routing Implementation.

### 2. `OPEN DECISION`: Indian SMS / WhatsApp DLT Provider
- **Context**: Automated attendance absence alerts and circular broadcasts require Indian DLT-registered templates.
- **Alternatives**:
  - *Option A*: Gupshup Enterprise API.
  - *Option B*: Fast2SMS / Textlocal.
  - *Option C*: Twilio Messaging Gateway.
- **Resolution Point**: Step 4 Background Workers & Notification Service layer.

### 3. `OPEN DECISION`: PDF Report Card Rendering Engine
- **Context**: `TNT-MRK-02` requires high-fidelity, printable PDF report cards complying with CBSE/ICSE board formats.
- **Alternatives**:
  - *Option A*: Headless Chromium / Puppeteer microservice on AWS Lambda / Fly.io.
  - *Option B*: `@react-pdf/renderer` generating client/server PDFs via React primitives.
  - *Option C*: Typst / WeasyPrint compiled binary.
- **Resolution Point**: Step 4 Report Card Worker implementation.

---

## 5. Transition to Step 3 (Database Architecture & Design)

With the complete Information Architecture, logical route tree, and detailed functional screen specifications established, all downstream data requirements for Step 3 are formally locked:

- **Entity Models Needed**: `Tenant`, `User`, `TenantMembership`, `Role`, `Permission`, `RolePermission`, `ModuleEntitlement`, `AcademicYear`, `Term`, `Grade`, `Class`, `Section`, `Subject`, `StaffProfile`, `StudentProfile`, `ParentProfile`, `StudentParentBinding`, `TimetablePeriod`, `TimetableLesson`, `AttendanceRecord`, `Exam`, `ExamPaper`, `Assignment`, `AssignmentSubmission`, `ExamResult`, `ReportCard`, `Announcement`, `Event`, `Notification`, `AuditLog`.
- **Composite Uniqueness Requirements**:
  - `[tenantId, admissionNumber]` on Student.
  - `[tenantId, employeeId]` on Staff.
  - `[tenantId, subjectCode]` on Subject.
  - `[tenantId, gradeName, sectionName, academicYearId]` on Class.
  - `[tenantId, classId, date, studentId]` on AttendanceRecord.
- **Soft Deletion & Audit Fields**: Every domain model requires `tenantId`, `createdAt`, `updatedAt`, `deletedAt`, and relational audit foreign keys.

---

```
STEP 2 STATUS: READY FOR STEP 3
```
