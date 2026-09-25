# 05 — Module Entitlement & Licensing Data Model

## 1. Architectural Policy: Licensing != Authorization

**Status**: TARGET / SPECIFICATION  
**Scope**: Commercial Capability Gating and Feature Licensing.

In SchoolyardSMS, commercial feature licensing is decoupled from user authorization:
- **RBAC Answers**: *"Does this user have permission to perform this action?"* (Evaluated via `RolePermission`).
- **Module Entitlements Answer**: *"Has this educational institution licensed this functional capability?"* (Evaluated via `TenantModuleEntitlement`).

A user with the permission `report_card.generate` cannot access the report card generation screen if their school is subscribed to a plan that does NOT include the `report_card_module`. In such cases, the system returns `HTTP 402 Module Disabled` rather than `HTTP 403 Forbidden`.

---

## 2. Conceptual Entitlement Entity Graph

```
┌─────────────────────────────────┐
│        SubscriptionPlan         │ (e.g. Starter, Academic Pro, Enterprise)
│  - planKey (Unique)             │
│  - name                         │
│  - monthlyPricePerStudent       │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       * ┌─────────────────────────────┐
│             Tenant              ├────────►│   TenantModuleEntitlement   │
│  - planTier                     │ 1       │  - tenantId                 │
│  - studentQuota                 │         │  - moduleKey                │
└─────────────────────────────────┘         │  - isEnabled (Boolean)      │
                                            │  - source (PLAN/ADDON)      │
                                            └──────────────┬──────────────┘
                                                           │ *
                                                           │
                                                           │ 1
                                            ┌──────────────▼──────────────┐
                                            │           Module            │
                                            │  - moduleKey (Unique)       │
                                            │  - isCore (Boolean)         │
                                            │  - displayName              │
                                            └─────────────────────────────┘
```

---

## 3. Detailed Entity Specifications

### 3.1 `Module`
- **Definition**: Represents a functional capability in the SaaS ecosystem.
- **Classification**:
  - **Core Modules (`isCore: true`)**: Mandatory, always enabled for all active tenants. Cannot be disabled:
    - `core_academics`: Class management, student/staff directories, basic dashboard.
    - `attendance_module`: Daily attendance tracking and absence notifications.
    - `communication_module`: School circulars, events calendar, and notification center.
  - **Optional / Entitlement-Controlled Modules (`isCore: false`)**: Bundled with higher subscription tiers or sold as standalone add-ons:
    - `timetable_module`: Master drag-and-drop timetable builder and conflict engine.
    - `exam_module`: Multi-paper examination scheduling and marks entry matrix.
    - `report_card_module`: Automated CBSE/ICSE term report card generation and digital signatures.
    - `assignment_module`: Digital homework distribution and submission review.
  - **Future Roadmap Placeholders (V2 / V3)**:
    - `fees_module` (V2): Invoicing, fee structures, online fee payments.
    - `transport_module` (V2): Vehicle fleet, bus routes, driver assignments.
    - `library_module` (V2): Book catalog, barcode check-in/out, overdue fines.
    - `lms_module` (V3): Course syllabus, online quizzes, video lessons.

### 3.2 `TenantModuleEntitlement`
- **Definition**: The active binding between a `Tenant` and a `Module`.
- **Composite Uniqueness**: `@@unique([tenantId, moduleKey])`.
- **Attributes**:
  - `tenantId`: Foreign key to `Tenant`.
  - `moduleKey`: Identifier matching `Module.moduleKey`.
  - `isEnabled`: Boolean flag (`true` = licensed and accessible, `false` = disabled).
  - `source`: Enum (`PLAN_INCLUDED`, `ADDON_PURCHASE`, `PROMOTIONAL_OVERRIDE`).
  - `expiresAt`: Optional timestamp for time-limited trial add-ons.

---

## 4. Dual-Gate Authorization Evaluation Logic

Every incoming request passes through the **Dual-Gate Security Pipeline**:

```
                       [ Incoming Request ]
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │     GATE 1: Module Entitlement Evaluation    │
         └──────────────────────┬───────────────────────┘
                                │
                 Is module enabled for tenant?
                                │
                 ├──► NO  ──► Halt: HTTP 402 Module Disabled
                 │            (Render Upgrade Banner / Sales Contact)
                 ▼ YES
         ┌──────────────────────────────────────────────┐
         │       GATE 2: User RBAC & Scope Evaluation   │
         └──────────────────────┬───────────────────────┘
                                │
                 Does caller have permission + scope?
                                │
                 ├──► NO  ──► Halt: HTTP 403 Forbidden
                 │            (Render Access Denied, Log Security Alert)
                 ▼ YES
         [ Execute Tenant-Scoped Business Mutation / Query ]
```

This strict separation ensures that licensing changes do not disturb underlying RBAC definitions, and that future V2/V3 modules seamlessly register into the platform by simply inserting a new record into `Module`.
