# Product Module Map, Evolution & Release Principles

## 1. Executive Release Principles

**Status**: DECISION

To ensure software excellence, prevent architectural churn, and maintain predictable delivery velocity, all product and engineering teams adhere to the **Eight Release Principles**:

1. **Foundations Before Feature Breadth (V1 Law)**:
   - V1 must establish rock-solid architectural foundations (tenant resolution, dynamic DB RBAC, atomic audit logging, service boundaries) before expanding into broad enterprise workflows.
2. **Backward-Compatible Architecture (V2 Law)**:
   - No V2 feature may force a breaking rewrite of V1 core architecture. V2 modules (fees, notifications, promotions) must attach cleanly as consumers of V1 domain services.
3. **Stable Contracts for the Ecosystem (V3 Law)**:
   - V3 enterprise and third-party capabilities must build on stable, versioned internal domain contracts and documented public APIs.
4. **Controlled Rollouts via Feature Entitlements**:
   - All newly introduced capabilities must be gated by the `ModuleEntitlement` licensing engine, enabling canary deployments, pilot institution testing, and tiered monetization.
5. **Independent Deployability of Heavy Workloads**:
   - High-throughput asynchronous workloads (bulk notifications, PDF compilation, data imports) must run in standalone worker daemons (BullMQ) to prevent web runner starvation.
6. **Screen Existence Does Not Equal Completion**:
   - A module is not "complete" merely because frontend screens or mock forms exist. It must satisfy the full 17-point Definition of Done (server guards, Zod validation, error handling, tests).
7. **Automated Test Coverage for Critical Workflows**:
   - No workflow touching student safety, academic marks, financial transactions, or tenant isolation may ship without passing automated unit, integration, and E2E browser tests.
8. **Universal Cross-Tenant Isolation**:
   - Cross-tenant data isolation is non-negotiable and mandatory for every single tenant-facing table, query, cache key, background job, and S3 file path.

---

## 2. Diagram 1: V1 Core Module Architecture

```mermaid
flowchart TD
    subgraph FoundationLayer ["V1 Architectural Foundations"]
        Clerk["Clerk Authentication<br/>(Identity & Session JWT)"]
        TenantSys["Tenant Resolution & Context<br/>(Server-side verified)"]
        RBAC["Dynamic DB RBAC<br/>(Roles, Permissions, Scopes)"]
        Audit["Atomic Transactional Audit<br/>(PostgreSQL Log Trail)"]
    end

    subgraph AcademicCore ["V1 Core Academic Entities"]
        AcademicYear["Academic Years & Terms"]
        Classes["Classes, Sections & Grades"]
        Subjects["Subjects & Teacher Allocations"]
        Timetable["Weekly Timetable & Lessons"]
    end

    subgraph PeopleCore ["V1 People Management"]
        Staff["Faculty & Staff Directory"]
        Students["Student Directory & Profiles"]
        Parents["Parent / Guardian Directory"]
    end

    subgraph ClassroomOperations ["V1 Classroom Operations & Grading"]
        Attendance["Daily & Subject Attendance"]
        Exams["Examinations & Homework"]
        Marks["Marks Entry & Assessment Results"]
        ReportCards["Basic Gradebook & Report Cards"]
        Notices["Announcements & School Calendar"]
    end

    Clerk --> TenantSys
    TenantSys --> RBAC
    RBAC --> AcademicCore & PeopleCore
    
    AcademicYear --> Classes
    Classes --> Subjects --> Timetable
    Staff & Students --> Classes
    Parents --> Students

    Classes & Timetable --> Attendance
    Subjects & Students --> Exams --> Marks --> ReportCards
    Audit -.-> Attendance & Marks & Staff & Students
```

---

## 3. Diagram 2: V1 -> V2 -> V3 Evolution Roadmap

```mermaid
flowchart LR
    subgraph V1 ["V1: Core Academic Foundation"]
        direction TB
        V1_Core["• Multi-Tenant Schema<br/>• DB Dynamic RBAC<br/>• Students & Staff Roster<br/>• Timetable & Scheduling<br/>• Daily Attendance<br/>• Exams & Marks Entry<br/>• Atomic Mutation Auditing"]
    end

    subgraph V2 ["V2: Operational Expansion"]
        direction TB
        V2_Ops["• Institutional Fee Management<br/>• Online Razorpay Invoicing<br/>• DLT SMS & WhatsApp Alerts<br/>• BullMQ Background Workers<br/>• Automated Student Promotion<br/>• PDF Report Card Engine<br/>• Full Offline PWA Sync"]
    end

    subgraph V3 ["V3: Enterprise Ecosystem"]
        direction TB
        V3_Eco["• Online Admissions Pipeline<br/>• Biometric RFID Gate Sync<br/>• Fleet & Bus Route IoT<br/>• Library Circulation Desk<br/>• Public REST & Webhook APIs<br/>• AI Auto-Timetable Solvers<br/>• Predictive Attrition BI"]
    end

    V1 -->|"Extends with Async Workers & Fees"| V2
    V2 -->|"Extends with APIs, IoT & Intelligence"| V3
```

---

## 4. Diagram 3: Comprehensive Module Dependency Graph

```mermaid
flowchart TD
    %% Base Foundations
    Auth["Clerk Identity"] --> Tenant["Tenant System"]
    Tenant --> RBAC["Dynamic DB RBAC"]
    Tenant --> Entitlements["Module Entitlements"]
    
    %% Core Entities
    RBAC --> AcademicYear["Academic Year"]
    AcademicYear --> Class["Class & Section"]
    RBAC --> Staff["Staff / Faculty"]
    Staff --> Subject["Subjects"]
    Class & Subject & Staff --> Lesson["Timetable Lessons"]
    Class & RBAC --> Student["Student Directory"]
    Student --> Parent["Parent Directory"]

    %% Operational Workflows (V1)
    Student & Lesson --> Attendance["Daily Attendance"]
    Student & Subject --> Exam["Exams & Homework"]
    Exam --> Result["Marks & Results"]
    Result & Attendance --> ReportCard["Basic Report Cards"]

    %% V2 Expansions
    Student & Class --> Fees["Fee Management (V2)"]
    Attendance & Lesson --> SMS["SMS & WhatsApp Alerts (V2)"]
    Exam & Class --> Promotion["Student Promotion (V2)"]
    Result --> PDFWorker["Report Card PDF Engine (V2)"]
    Student & Staff --> Library["Library Management (V2)"]
    Student & Class --> Transport["Transport & Fleet (V2)"]

    %% V3 Advanced Additions
    Tenant & RBAC --> OpenAPI["Public REST & Webhooks (V3)"]
    Attendance --> Biometric["Biometric Hardware Sync (V3)"]
    Fees --> Accounting["Double-Entry Ledger ERP (V3)"]
    Lesson & Staff --> AITimetable["AI Timetable Solver (V3)"]
    Result & Attendance --> PredictiveBI["Predictive Attrition BI (V3)"]
```
