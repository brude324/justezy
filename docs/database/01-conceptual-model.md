# 01 — Target Database Conceptual Model

## 1. Executive Summary & Purpose

**Status**: TARGET / SPECIFICATION  
**Scope**: Conceptual Data Model for the SchoolyardSMS SaaS Transformation.

This document establishes the high-level **Target Conceptual Data Model** for SchoolyardSMS, transforming the single-school prototype audited in Step 0 into an enterprise-grade, multi-tenant education SaaS platform tailored for schools, colleges, and educational institutes in India.

The conceptual model defines the sovereign boundaries, entity clusters, and core relational contracts that govern application data access. In accordance with the non-negotiable architectural invariants:
- **Authentication != Authorization**: Clerk provides cryptographic identity and session tokens; PostgreSQL is the sovereign authority for application users, institutional tenants, memberships, roles, permissions, scopes, entitlements, and business data.
- **Tenant Isolation**: Every institutional data entity is bound to an immutable `Tenant` boundary.
- **Relational Integrity**: Cross-tenant data references are structurally impossible.
- **Auditability**: Critical business events and security transitions generate immutable append-only audit records.

---

## 2. High-Level Entity-Relationship Topology

The target database architecture organizes domain entities into five hierarchical planes:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PLANE 1: SAAS CONTROL PLANE                     │
│  SubscriptionPlan ────► Tenant ◄──── ModuleEntitlement                 │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────────────────────┐
│                  PLANE 2: IDENTITY, MEMBERSHIP & RBAC                  │
│  User ◄─── TenantMembership ───► Role ───► RolePermission ───► Permission
└───────────────────────────┬────────────────────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────────────────────┐
│                    PLANE 3: ACADEMIC CALENDAR & STRUCTURE              │
│  AcademicYear ───► Term ───► Grade ───► Class ───► Section ───► Subject │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────────────────────┐
│                   PLANE 4: PERSONA PROFILES & ENROLLMENT               │
│  StaffProfile               StudentProfile ◄──── StudentParentBinding   │
│  (Class Teacher/Faculty)    (Enrollment)               ▲               │
│                                                        │               │
│                                                  ParentProfile         │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────────────────────┐
│                    PLANE 5: TENANT OPERATIONAL WORKFLOWS               │
│  • TimetablePeriod & Lesson      • Exam & ExamPaper                    │
│  • AttendanceRecord              • ExamResult & ReportCard             │
│  • Assignment & Submission       • Announcement & Event                │
│  • Notification                  • Immutable AuditLog                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 20 Conceptual Domain Clusters

The system architecture decomposes domain data into 20 distinct conceptual clusters (A through T):

### A. Platform / SaaS Domain
- Manages global control plane entities: multi-tenant provisioning, subscription tiers, platform-wide configuration, and global platform operators.
- *Key Entities*: `Tenant`, `SubscriptionPlan`, `PlatformUser`, `LeadInquiry`.

### B. Identity Domain
- Bridges external Clerk authentication sessions to internal application identities.
- *Key Entities*: `User` (1:1 with Clerk `clerkId`), `UserIdentitySync`, `UserSessionMeta`.

### C. Tenant / Institution Domain
- Sovereign boundary for educational institutions (schools, colleges, academies).
- *Key Entities*: `Tenant`, `TenantPolicy`, `TenantBranding`, `TenantDomain`.

### D. Membership / RBAC Domain
- Dynamic role-based access control and user-tenant bindings. Enforces **`ROLE != PERMISSION`**.
- *Key Entities*: `TenantMembership`, `Role`, `Permission`, `RolePermission`, `TenantInvitation`.

### E. Module Entitlements Domain
- Commercial feature licensing separated cleanly from user authorization.
- *Key Entities*: `Module`, `TenantModuleEntitlement`, `PlanModuleBundle`.

### F. Academic Structure Domain
- Temporal academic sessions, curriculum grades, classroom structures, and course catalogs.
- *Key Entities*: `AcademicYear`, `Term`, `Grade`, `Class`, `Section`, `Subject`.

### G. People Domain
- Base persona extensions linked to the central `User` identity within a tenant.
- *Key Entities*: `PersonProfile` (abstract), contact metadata, emergency contacts.

### H. Student Lifecycle Domain
- Complete academic journey of learners from admission to graduation/alumni.
- *Key Entities*: `StudentProfile`, `StudentEnrollment`, `StudentTransferHistory`.

### I. Staff Lifecycle Domain
- Employment profiles, designations, departments, and academic supervisor bindings.
- *Key Entities*: `StaffProfile`, `Department`, `StaffSubjectQualification`.

### J. Parent / Guardian Domain
- Multi-child, multi-guardian family structures and communication contact channels.
- *Key Entities*: `ParentProfile`, `StudentParentBinding`.

### K. Timetable Domain
- Weekly instructional scheduling, period definitions, room allocations, and conflict avoidance.
- *Key Entities*: `TimetablePeriod`, `TimetableLesson`, `RoomAllocation`.

### L. Attendance Domain
- High-speed daily and period-level student presence tracking, leaves, and excuse notes.
- *Key Entities*: `AttendanceRecord`, `AttendanceCorrectionRequest`, `AttendanceDailySummary`.

### M. Assignments Domain
- Coursework distribution, digital submission collection, attachments, and feedback.
- *Key Entities*: `Assignment`, `AssignmentSubmission`, `AssignmentAttachment`.

### N. Examinations Domain
- Summative and formative assessment sessions, multi-subject date sheets, and room rosters.
- *Key Entities*: `Exam`, `ExamPaper`, `ExamRoomAllocation`.

### O. Results / Grading Domain
- Student score entry matrices, percentages, configurable letter grades, and GPA calculations.
- *Key Entities*: `ExamResult`, `GradingScheme`, `GradeScaleTier`.

### P. Report Cards Domain
- Official term transcripts, historical grade snapshots, CBSE/ICSE co-scholastic marks, and digital signatures.
- *Key Entities*: `ReportCard`, `ReportCardEntry`, `ReportCardTemplate`.

### Q. Communication Domain
- Official circulars, emergency bulletins, school calendar events, and holidays.
- *Key Entities*: `Announcement`, `Event`, `AnnouncementAudienceScope`.

### R. Notifications Domain
- Multi-channel notification delivery (In-App, Web Push, SMS, Email) and personal preferences.
- *Key Entities*: `Notification`, `NotificationPreference`, `PushSubscription`.

### S. Audit Domain
- Transactional, tamper-evident, append-only security and operational audit trails.
- *Key Entities*: `AuditLog`.

### T. Files / Documents Domain
- Provider-independent object storage references (S3 / Cloudflare R2) and tenant quotas.
- *Key Entities*: `DocumentReference`, `DocumentAttachmentJunction`.

---

## 4. Fundamental Conceptual Relationships

1. **One User to Many Tenants**: A physical individual (`User`) holds exactly one record in the global identity pool, but holds independent `TenantMembership` bindings across multiple educational institutions (e.g., Parent with children in different schools; Teacher teaching across multiple campuses).
2. **One Tenant to Many Users**: An educational institution owns an arbitrary number of staff, student, and parent memberships.
3. **Role Bound to Membership, Not User**: A user's role and permissions are evaluated strictly within the context of their active `TenantMembership`. A user may be an `Institution Owner` in School A and a `Parent` in School B.
4. **Historical Isolation via Enrollment**: Student attendance, marks, and report cards belong to a specific historical `StudentEnrollment` (Class, Section, Academic Year), preventing historical data corruption upon annual grade promotion.
5. **Universal Tenant Partitioning**: Every domain record (Attendance, Lesson, Exam, Assignment) contains a direct foreign reference to `Tenant` (`tenantId`) and composite foreign references where applicable.
