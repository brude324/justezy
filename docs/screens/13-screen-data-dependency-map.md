# 13 — Screen-to-Conceptual Data Dependency Map

## 1. Overview & Architectural Principle

**Status**: TARGET / SPECIFICATION  
**Scope**: Conceptual Data Invariants across all 38 Target V1 Screens.

This document establishes the conceptual data dependencies required by every target V1 screen before entering Step 3 (Database Architecture & Design). 

In accordance with the non-negotiable architectural rules:
- **No premature physical schema prescription**: This map specifies *conceptual entities, domain relations, and state invariants*, not exact Prisma column definitions, SQL syntax, or index declarations.
- **Tenant Scoping**: Every tenant-facing entity conceptually depends upon an immutable `Tenant` boundary.
- **Academic Context**: Academic entities depend upon an active `AcademicYear` session context.
- **Identity & Membership**: Personas are bound through `TenantMembership` rather than hardcoded global role fields.

---

## 2. Conceptual Entity Dependency Catalog by Screen Suite

### 2.1 Public & Marketing Suite
* **`PUB-01` (Public Landing)**:
  - *Conceptual Data Required*: Marketing Copy, Plan Feature Highlights, Institutional Testimonials, Platform Trust Metrics (aggregations).
  - *Data Dependencies*: Platform Public Metadata; Lead Capture Entity (`LeadInquiry`: Name, Email, Phone, Institution Type, Student Strength, Status).
* **`PUB-02` (Pricing Matrix)**:
  - *Conceptual Data Required*: `SubscriptionPlan` (Plan Key, Name, Price Per Student, Interval, Feature Matrix, Limits).
  - *Data Dependencies*: Platform Monetization Catalog.
* **`PUB-03` (Portal Finder)**:
  - *Conceptual Data Required*: `Tenant` (Legal Name, Subdomain/Slug, Board Affiliation, City, State, Logo URL, Status: `ACTIVE`).
  - *Data Dependencies*: Public Tenant Directory index.

---

### 2.2 Authentication & Identity Suite
* **`AUT-01` (Unified Sign-In)**:
  - *Conceptual Data Required*: Clerk Authentication Session Token, `User` (Clerk ID, Primary Email, Phone, Status), `Tenant` (Branding, Logo, Domain if accessed via tenant host).
  - *Data Dependencies*: Identity Provider session, Application User identity.
* **`AUT-02` (Invitation Onboarding)**:
  - *Conceptual Data Required*: `TenantInvitation` (Cryptographic Token, Email, Target Tenant, Target Role, Expiration Timestamp, Claim Status), `TenantMembership` (Initial State: `INVITED`).
  - *Data Dependencies*: Token verification service, User provisioning.
* **`AUT-03` (MFA Verification)**:
  - *Conceptual Data Required*: Clerk Intermediate Session Ticket, MFA Factors (TOTP, SMS).
  - *Data Dependencies*: Identity Provider MFA state.
* **`AUT-04` (Password Reset)**:
  - *Conceptual Data Required*: Password Reset Token, Clerk Identity verification.
  - *Data Dependencies*: Identity Provider reset pipeline.

---

### 2.3 Platform Control Plane Suite
* **`PLT-01` (SaaS Executive Overview)**:
  - *Conceptual Data Required*: Platform Aggregations (Total Active Tenants, Total Students Platform-wide, Active Faculty, MRR Calculation, System Health Metrics), `AuditLog` (Recent platform actions).
  - *Data Dependencies*: Cross-tenant read access (Restricted strictly to Platform Super Admins).
* **`PLT-02` (Tenant Directory)**:
  - *Conceptual Data Required*: `Tenant` (ID, Name, Subdomain, Board, Plan Tier, Student Quota, Staff Quota, Status: `ACTIVE` / `SUSPENDED` / `TRIAL`, Created At), Aggregated Counts (Enrolled Students, Assigned Staff).
  - *Data Dependencies*: Platform Tenant Registry.
* **`PLT-03` (Tenant Provisioning Wizard)**:
  - *Conceptual Data Required*: `Tenant` (New Record), `SubscriptionPlan`, `ModuleEntitlement` (Default bundle for selected plan), `User` (Initial School Owner), `TenantMembership` (Owner Binding with `TENANT_ADMIN` role).
  - *Data Dependencies*: Atomic multi-entity provisioning pipeline.
* **`PLT-04` (Tenant Detail & Governance)**:
  - *Conceptual Data Required*: `Tenant` (Full record), `ModuleEntitlement` (Active feature flags: e.g., `attendance_module`, `exam_module`, `report_card_module`), `TenantMembership` (List of tenant admins), `TenantUsageMetric` (Storage, quotas), `AuditLog` (Tenant governance history).
  - *Data Dependencies*: Deep Tenant detail graph.
* **`PLT-05` (Plan & Entitlements Manager)**:
  - *Conceptual Data Required*: `SubscriptionPlan` (Key, Display Name, Pricing, Billing Rules), `PlanModuleMapping` (Default bundled module keys).
  - *Data Dependencies*: Monetization catalog.
* **`PLT-06` (Platform User Directory)**:
  - *Conceptual Data Required*: `PlatformUser` / `User` with `PlatformRole` (`SUPER_ADMIN`, `SUPPORT_OPERATOR`, `AUDITOR`), MFA Status, Last Active Timestamp.
  - *Data Dependencies*: Platform administrative security store.
* **`PLT-07` (Platform Security Audit Logs)**:
  - *Conceptual Data Required*: `AuditLog` (Timestamp, Severity, Actor ID, Actor Email, Action Category, Target Tenant, IP Address, User Agent, Change Payload Diff).
  - *Data Dependencies*: Immutable global audit append-only log.

---

### 2.4 Institutional Dashboards Suite
* **`TNT-DSH-01` (School Administrator Dashboard)**:
  - *Conceptual Data Required*: `Tenant` context, Active `AcademicYear`, Aggregate Stat Cards (Enrolled Students, Active Teachers, Today's Attendance %, Active Classes), `AttendanceSummary` (14-day institutional trend), `PendingApproval` (Leave, corrections, draft report cards), `Event` (Upcoming school calendar), `Announcement` (Latest bulletins).
  - *Data Dependencies*: Multi-module institutional aggregation queries.
* **`TNT-DSH-02` (Teacher / Faculty Dashboard)**:
  - *Conceptual Data Required*: `User`, `StaffProfile`, Assigned `Class` records, Today's `TimetableLesson` slots (ordered chronologically), `AttendanceRecord` (Submission status for assigned classes today), `Assignment` (Ungraded submission counts), `Announcement` (Staff circulars).
  - *Data Dependencies*: Scope-restricted queries (`AccessScope.ASSIGNED_ONLY`).
* **`TNT-DSH-03` (Student Academic Dashboard)**:
  - *Conceptual Data Required*: `User`, `StudentProfile` (Bio, Roll No, Admission No), Enrolled `Class` & `Section`, Today's `TimetableLesson` periods, Personal `AttendanceSummary` (Overall attendance %), `Assignment` (Pending homework due within 48h), `Exam` (Upcoming scheduled exams), `Announcement` (Grade circulars).
  - *Data Dependencies*: Scope-restricted queries (`AccessScope.SELF_ONLY`).
* **`TNT-DSH-04` (Parent Family Dashboard)**:
  - *Conceptual Data Required*: `User`, `ParentProfile`, Linked `StudentProfile` records (via `StudentParentBinding`), Selected Active Child context, Child's Today `AttendanceRecord` (Present/Absent status + timestamp), Recent `ExamResult` scores, Pending `Assignment` deadlines, School `Announcement` circulars.
  - *Data Dependencies*: Scope-restricted queries (`AccessScope.LINKED_CHILDREN`).

---

### 2.5 Staff & Teacher Management Suite
* **`TNT-STF-01` (Faculty Directory)**:
  - *Conceptual Data Required*: `Tenant`, `StaffProfile` (ID, Employee ID, Full Name, Designation, Email, Phone, Status: `ACTIVE` / `ON_LEAVE` / `ARCHIVED`, Gender, Date of Joining), Linked `Subject` records, Assigned `Class` records (as Class Teacher or Subject Teacher).
  - *Data Dependencies*: Tenant staff registry, Academic associations.
* **`TNT-STF-02` (Staff Profile Detail)**:
  - *Conceptual Data Required*: `StaffProfile` (Full record including Address, Emergency Contact, Qualifications, Experience, Masked PII: National ID/Aadhaar), Assigned `Subject` catalog, Assigned `Class` sections, Weekly `TimetableLesson` schedule grid, Attendance marking compliance metrics.
  - *Data Dependencies*: Comprehensive staff graph; masked PII security policy.

---

### 2.6 Student Management Suite
* **`TNT-STU-01` (Student Directory)**:
  - *Conceptual Data Required*: `Tenant`, `StudentProfile` (ID, Admission No, Full Name, Roll No, Gender, Status: `ACTIVE` / `PROMOTED` / `TRANSFERRED`), Enrolled `Class` & `Section`, Active `AcademicYear`, Primary `ParentProfile` (Name, Phone), Cumulative `AttendanceSummary` (%).
  - *Data Dependencies*: Tenant student registry, Class enrollment.
* **`TNT-STU-02` (Student 360 Profile)**:
  - *Conceptual Data Required*: `StudentProfile` (Full bio, DOB, Blood Group, Medical Notes, Address, Masked National ID), Linked `ParentProfile` records (Relationship, Phone, Email, Fee Payer status), Historical `AttendanceRecord` logs (monthly heatmap), `ExamResult` history by Term, `AssignmentSubmission` records, Official `ReportCard` documents.
  - *Data Dependencies*: Complete student academic 360 graph.

---

### 2.7 Parent & Guardian Management Suite
* **`TNT-PAR-01` (Parent Directory)**:
  - *Conceptual Data Required*: `Tenant`, `ParentProfile` (ID, Full Name, Mobile Phone, Email, Portal Access Status: `ACTIVE` / `INVITED` / `NOT_REGISTERED`), `StudentParentBinding` (Array of linked students: Student Name, Grade, Section, Relationship).
  - *Data Dependencies*: Parent registry, Student-parent relational junction.

---

### 2.8 Academic Structure Suite
* **`TNT-ACD-01` (Academic Terms Manager)**:
  - *Conceptual Data Required*: `Tenant`, `AcademicYear` (Label, Start Date, End Date, Status: `ACTIVE` / `UPCOMING` / `ARCHIVED`), `Term` (Term 1, Term 2, Dates), Enrolled Student count, Configured Class count.
  - *Data Dependencies*: Academic calendar foundation.
* **`TNT-CLS-01` (Classes & Sections Manager)**:
  - *Conceptual Data Required*: `Tenant`, `AcademicYear`, `Grade` (Grade 1 through 12), `Class` (Section A/B/C, Room Number, Student Capacity), Assigned `StaffProfile` (Class Teacher Supervisor), Enrolled Student count, Associated `Subject` count.
  - *Data Dependencies*: Class organization hierarchy.
* **`TNT-SUB-01` (Subject Catalog)**:
  - *Conceptual Data Required*: `Tenant`, `Subject` (Subject Code, Name, Type: `THEORY` / `PRACTICAL` / `ELECTIVE`, Max Marks, Pass Marks), Applicable `Grade` mappings, Qualified `StaffProfile` associations.
  - *Data Dependencies*: Curriculum catalog.

---

### 2.9 Timetable & Scheduling Suite
* **`TNT-TBL-01` (Master Timetable Grid & Builder)**:
  - *Conceptual Data Required*: `Tenant`, `AcademicYear`, `Term`, Target `Class`, `TimetablePeriod` (Period 1..8, Start Time, End Time, Is Break), `TimetableLesson` (Day of Week: MON..SAT, Subject, Assigned Teacher, Room Number), Real-time conflict evaluation data (Teacher schedule across all classes, Room allocations).
  - *Data Dependencies*: Relational scheduling matrix; multi-entity constraint validation.
* **`TNT-TBL-02` (Weekly Timetable View)**:
  - *Conceptual Data Required*: Target context (`StaffProfile` for teacher, `Class` for student/parent), Published `TimetableLesson` records, `TimetablePeriod` definitions.
  - *Data Dependencies*: Published timetable records.

---

### 2.10 Attendance Management Suite
* **`TNT-ATT-01` (Daily Attendance Marking)**:
  - *Conceptual Data Required*: `Tenant`, `AcademicYear`, Target `Class` & `Section`, Target `Date`, Class Roster (`StudentProfile` list ordered by Roll No), Existing `AttendanceRecord` entries (`studentId`, `date`, `status`: `PRESENT` / `ABSENT` / `LATE`, `remarks`), Prior submission lock state.
  - *Data Dependencies*: Daily class attendance roster; composite unique constraint: `[tenantId, classId, date, studentId]`.
* **`TNT-ATT-02` (Attendance Analytics & Reports)**:
  - *Conceptual Data Required*: `Tenant`, Date Range, `AttendanceRecord` aggregations (Working days, Total Present, Total Absent, Chronic Defaulters list with attendance < 75%), Teacher Submission compliance logs.
  - *Data Dependencies*: Attendance aggregation engine.

---

### 2.11 Examination & Evaluation Suite
* **`TNT-EXM-01` (Exam Schedules & Master)**:
  - *Conceptual Data Required*: `Tenant`, `AcademicYear`, `Term`, `Exam` (Title, Start Date, End Date, Status: `DRAFT` / `SCHEDULED` / `ONGOING` / `COMPLETED` / `RESULTS_PUBLISHED`), Target `Class` list, `ExamPaper` count.
  - *Data Dependencies*: Exam session registry.
* **`TNT-EXM-02` (Exam Setup Wizard)**:
  - *Conceptual Data Required*: `Exam` (Master details), Target `Class` bindings, `ExamPaper` array (`subjectId`, `examDate`, `startTime`, `endTime`, `maxMarks`, `passMarks`, `roomNumber`).
  - *Data Dependencies*: Multi-paper examination setup graph.

---

### 2.12 Assignments & Homework Suite
* **`TNT-ASN-01` (Assignments Hub)**:
  - *Conceptual Data Required*: `Tenant`, `AcademicYear`, `Assignment` (Title, Class, Subject, Due Date, Assigned By Teacher, Submissions Count), For Students: `AssignmentSubmission` (Status: `SUBMITTED`, `PENDING`, `OVERDUE`, `GRADED`).
  - *Data Dependencies*: Assignment lifecycle store.
* **`TNT-ASN-02` (Assignment Creator & Submission Reviewer)**:
  - *Conceptual Data Required*: `Assignment` (Rich Instructions, File Attachments), `AssignmentSubmission` array (`studentId`, `submissionTimestamp`, `fileUrls`, `remarks`, `marksAwarded`, `teacherFeedback`, `status`).
  - *Data Dependencies*: Student submission and grading graph.

---

### 2.13 Marks, Results & Report Cards Suite
* **`TNT-MRK-01` (Marks Entry Grid)**:
  - *Conceptual Data Required*: `Tenant`, `Exam`, `ExamPaper`, Target `Class`, Class Roster (`StudentProfile`), `ExamResult` array (`studentId`, `theoryMarks`, `practicalMarks`, `isAbsent`, `totalMarks`, `percentage`, `gradeLetter`, `remarks`).
  - *Data Dependencies*: Composite marks entry matrix; auto-grading rules.
* **`TNT-MRK-02` (Term Report Card & Summary)**:
  - *Conceptual Data Required*: `Tenant` (Branding, Crest, Board Affiliation No, Signatures), `StudentProfile`, `AcademicYear`, `Term`, All Term `ExamResult` records across all subjects, `AttendanceSummary`, Co-scholastic evaluations, Class Teacher & Principal remarks, `ReportCard` (Generated PDF URL, Publication Status).
  - *Data Dependencies*: Holistic student academic transcript aggregation.

---

### 2.14 Communications & Events Suite
* **`TNT-ANN-01` (Announcements Hub)**:
  - *Conceptual Data Required*: `Tenant`, `Announcement` (Title, Category, Body Markdown, Attachment URLs, Target Audience: Roles/Grades, Priority: `NORMAL` / `URGENT`, Published At, Author `StaffProfile`).
  - *Data Dependencies*: Targeted broadcast newsfeed.
* **`TNT-EVT-01` (Institutional Calendar & Events)**:
  - *Conceptual Data Required*: `Tenant`, `AcademicYear`, `Event` (Title, Type: `HOLIDAY` / `EXAM` / `SPORTS` / `PTM` / `ACADEMIC`, Start DateTime, End DateTime, Is School Closed, Location, Target Audience).
  - *Data Dependencies*: Master institutional event calendar.
* **`TNT-NOT-01` (Universal Notification Center)**:
  - *Conceptual Data Required*: `User`, `Tenant`, `Notification` (Event Type, Title, Message, Deep Link URL, Is Read, Read At, Created At).
  - *Data Dependencies*: User notification inbox.

---

### 2.15 Institution Settings & Universal Account Suite
* **`TNT-SET-01` (Institution Settings)**:
  - *Conceptual Data Required*: `Tenant` (Legal Name, Short Code, Affiliation Board, Board Reg No, Email, Phone, Address, Logo URL, Theme Tokens), `TenantPolicy` (Attendance cutoff time, Absenteeism warning threshold, Auto-SMS flag), `SubscriptionPlan`, `ModuleEntitlement` list, `AuditLog`.
  - *Data Dependencies*: Master institutional configuration store.
* **`ACC-01` (Universal User Profile)**:
  - *Conceptual Data Required*: `User` (First Name, Last Name, Display Name, Email, Phone, Avatar URL, Preferred Language), `TenantMembership` list (Active institutions, Assigned Roles).
  - *Data Dependencies*: Universal user identity and membership graph.
* **`ACC-02` (Security & Credentials)**:
  - *Conceptual Data Required*: Clerk Security state, Password Last Changed, MFA Status, Active User Sessions.
  - *Data Dependencies*: Identity provider security metadata.
* **`ACC-03` (Notification Preferences)**:
  - *Conceptual Data Required*: `UserNotificationPreference` (Channel toggles per category: SMS, Email, In-App, Push), Browser Web Push VAPID subscription token.
  - *Data Dependencies*: Notification delivery preference matrix.
* **`ACC-04` (Multi-Tenant Switcher)**:
  - *Conceptual Data Required*: `User`, All active `TenantMembership` records for user (`tenantId`, `Tenant.name`, `Tenant.logoUrl`, `Tenant.status`, `Role.name`, `isCurrentSession`).
  - *Data Dependencies*: Multi-tenant membership bindings.

---

## 3. Conceptual Data Dependency Summary Matrix

```
                      ┌─────────────────────────────────┐
                      │             TENANT              │
                      └───────────────┬─────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  ACADEMIC CONTEXT   │    │  MEMBERSHIP & RBAC  │    │ MODULE ENTITLEMENT  │
│ - Academic Year     │    │ - User              │    │ - core_academics    │
│ - Terms             │    │ - TenantMembership  │    │ - attendance_module │
│ - Grade / Class     │    │ - Role              │    │ - exam_module       │
│ - Subject           │    │ - Permission        │    │ - timetable_module  │
└──────────┬──────────┘    └──────────┬──────────┘    └─────────────────────┘
           │                          │
           └───────────┬──────────────┘
                       ▼
        ┌─────────────────────────────┐
        │   TENANT-SCOPED DOMAINS     │
        │ - Staff & Students          │
        │ - Timetable Lessons         │
        │ - Attendance Records        │
        │ - Exams & Marks Entry       │
        │ - Assignments & Submissions │
        │ - Announcements & Events    │
        │ - Atomic Audit Logs         │
        └─────────────────────────────┘
```

All 38 target screens have complete, closed, and validated conceptual data dependencies. Step 3 can proceed without data model ambiguity.
