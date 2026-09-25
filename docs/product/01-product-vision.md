# Product Vision: Next-Generation Educational SaaS Platform

## 1. Executive Summary & Vision Statement

**Status**: TARGET / PROPOSED

The overarching mission of this platform (evolving from the baseline SchoolyardSMS repository) is to deliver a modern, multi-tenant Software-as-a-Service (SaaS) management operating system designed specifically for educational institutions (K-12 schools, intermediate colleges, coaching networks, and polytechnics/universities).

Traditional School ERPs in emerging markets suffer from severe architectural fatigue: monolithic desktop or legacy PHP architectures, unencrypted on-premise databases, poor mobile responsiveness, zero offline reliability, and rigid role hierarchies. 

Our vision is to provide a **cloud-native, multi-tenant, mobile-first Progressive Web Application (PWA)** that combines consumer-grade responsiveness with enterprise-grade tenant isolation, data governance, fine-grained access control, and robust operational workflows.

---

## 2. Strategic Objectives

| Strategic Pillar | Description | Architectural Translation | Status |
| :--- | :--- | :--- | :---: |
| **Multi-Tenant SaaS Economy** | Serve thousands of distinct educational institutions on a shared infrastructure while strictly enforcing complete logical tenant isolation. | Shared PostgreSQL database with institutional tenant partitioning, server-side context validation, and isolated asset storage. | TARGET / PROPOSED |
| **Identity & Access Governance** | Enable seamless, secure authentication while delegating complex institutional roles and permissions to the application layer. | Clerk strictly for authentication & identity; application PostgreSQL database for multi-tenant memberships, dynamic RBAC, and access scopes. | DECISION |
| **Mobile-First & PWA Accessibility** | Deliver full operational capability on low-cost smartphones and varying network bandwidths without requiring native app store gatekeeping. | PWA with service workers, local offline caching, responsive layouts, and minimal client JavaScript payload. | TARGET / PROPOSED |
| **Operational Automation** | Free academic administrators and educators from repetitive operational overhead (attendance tracking, fee reminders, timetable scheduling, report generation). | Background job processing queue (BullMQ + Redis) for asynchronous notifications, bulk imports, and scheduled tasks. | TARGET / PROPOSED |
| **Compliance & Auditability** | Provide tamper-evident operational and financial traceability for regulatory compliance, parental trust, and institutional oversight. | Atomic audit logging for all sensitive database mutations combined with institutional export capabilities. | DECISION |

---

## 3. Institutional Target Market

**Status**: TARGET / PROPOSED

1. **Private K-12 Schools (Affiliated with CBSE, ICSE, or State Boards)**:
   - Primary operational requirement: Academic calendar planning, section management, daily attendance, gradebook/exam marks calculation, report card generation, parent communications, and fee collection.
2. **Intermediate & Junior Colleges**:
   - Primary operational requirement: Stream-based curriculum management (Science, Commerce, Arts), multi-lecturer period scheduling, attendance cut-offs, parent SMS alerts, and hall ticket generation.
3. **Coaching & Test-Prep Institutes**:
   - Primary operational requirement: Flexible batch management, mock test scheduling, performance analytics, multi-branch operations, and dynamic fee schedules.

---

## 4. Current State vs. Target Product State

| Product Capability | CURRENT / VERIFIED Baseline | TARGET / PROPOSED SaaS Platform | Evolution Strategy |
| :--- | :--- | :--- | :--- |
| **Multi-Tenancy** | Single-school tutorial database; zero institutional isolation; global unpartitioned tables. | Multi-tenant SaaS with server-side tenant validation, institutional subscription tiers, and isolated data domains. | Replace flat data model with Tenant-scoped architecture. |
| **Authentication & Roles** | Hardcoded Clerk `publicMetadata.role` (`admin`, `teacher`, `student`, `parent`). No multi-tenant membership. | Clerk handles authentication only; DB-driven RBAC with `User`, `TenantMembership`, `Role`, `Permission`, and `AccessScope`. | Decouple auth from authz; implement DB RBAC. |
| **Module Breadth** | 10 functioning business modules (basic tables), 4 mock/dead modules, zero fees/finance. | Tiered modular suite (V1 Core Academics, V2 Finance & Notifications, V3 Advanced Portals & Admissions). | Modularize existing screens, build missing domains. |
| **Mobile & Offline** | Standard desktop web dashboard; zero PWA capabilities; zero offline caching. | PWA-compliant application with home-screen installation, background sync, and offline schedule viewing. | Add Web App Manifest, Service Worker, and offline caching. |
| **Workflows & Automation** | Synchronous Next.js server actions; no background queues; no scheduled tasks. | Asynchronous job queues (BullMQ + Redis) handling bulk messaging, PDF report generation, and exports. | Deploy worker layer with durable background queues. |

---

## 5. Architectural Principles Supporting the Vision

1. **Strict Separation of Concerns**: Authentication ("Who are you?") is strictly decoupled from Authorization ("What can you do in this institution?").
2. **Zero Trust Client Input**: Tenant identifiers, user memberships, and permissions are verified server-side on every request without trusting client headers.
3. **Progressive Modular Rollout**: Customers only see and access features enabled by their institution's module entitlements and subscription tier.
4. **Resilient Data Architecture**: All institutional data is protected by composite uniqueness, foreign key integrity, and atomic audit logging.
