# 10 — Standardized Screen Action Contract

## 1. Overview & Architectural Policy

**Status**: TARGET / SPECIFICATION  
**Scope**: Universal across all Server Actions, Form Handlers, and Mutation Endpoints in SchoolyardSMS.

This document establishes the standardized functional and technical contract for lifecycle mutations across the application. In accordance with the non-negotiable security requirements in `AGENTS.md`:
1. **Never trust client authorization**: Every action MUST execute full server-side permission, scope, and tenant verification.
2. **Never execute unscoped tenant queries**: Every database mutation MUST be explicitly scoped to `tenantId`.
3. **Atomic Audit Logging**: Sensitive and lifecycle-altering mutations MUST produce an immutable `AuditLog` entry in the same transaction or guaranteed post-commit hook.
4. **Idempotency**: Retried or double-submitted mutations must not create duplicate entities or corrupt state.

---

## 2. Standardized Action Lifecycle Archetypes

Every mutation in the platform adheres to one of six standard action contracts:

```
  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
  │ 1. CREATE     │     │ 2. UPDATE     │     │ 3. DELETE     │
  └───────────────┘     └───────────────┘     └───────────────┘
  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
  │ 4. PUBLISH    │     │ 5. APPROVE    │     │ 6. EXPORT     │
  └───────────────┘     └───────────────┘     └───────────────┘
```

---

## 3. Detailed Action Specifications

### 3.1 `CREATE` (Entity Creation)
* **Purpose**: Instantiates a new institutional record (e.g., student, staff, assignment, announcement).
* **Required Pre-Conditions**:
  - Valid authenticated session (`userId`).
  - Active tenant membership (`tenantId`).
  - Module entitlement verified (e.g., `student_directory`).
  - Explicit atomic permission verified (e.g., `student.create`).
  - Required fields validated against strict Zod schema server-side.
* **UX & Interaction Contract**:
  - Invoked via primary CTA button ("Add Student", "Create Assignment").
  - Rendered in a dedicated modal dialog, side-drawer, or full-page form depending on complexity.
  - Submitting state disables all controls and displays an animated spinner.
* **Duplicate Detection**:
  - Enforces composite uniqueness (e.g., `[tenantId, admissionNo]`, `[tenantId, email]`).
  - If duplicate is detected, returns friendly error: "A record with this identifier already exists in this institution."
* **Success Behavior**:
  - Toast message: "[Entity Name] created successfully."
  - Form resets and closes modal/drawer; user is optionally redirected to detail view or list updates optimistically.
* **Audit & Event Side Effects**:
  - Writes `AuditLog` (`action: ENTITY_CREATED`, `entityType`, `entityId`, `actorId`, `tenantId`, `metadata: { newValues }`).
  - Fires background notification job if applicable (e.g., welcome email to staff).

---

### 3.2 `UPDATE` (Entity Modification)
* **Purpose**: Modifies existing entity fields while preserving integrity and audit trail.
* **Required Pre-Conditions**:
  - Caller has `update` permission (e.g., `student.update`).
  - Target record belongs to the caller's active `tenantId` (verified via composite WHERE: `{ id, tenantId }`).
  - Caller's `AccessScope` allows mutating the target record (e.g., teacher can only update classes assigned to them).
* **UX & Interaction Contract**:
  - Accessible via row action menu ("Edit") or detail page action bar.
  - Form fields pre-populated with current persisted values.
  - Form detects dirty state (`isDirty`); warns user upon navigation attempt if unsaved.
* **Concurrency & Stale Data Guard**:
  - Enforces optimistic concurrency control using an `updatedAt` timestamp or record version.
  - If record was modified concurrently by another user, prompts: "This record has been modified by another user. Please refresh and review before saving."
* **Success Behavior**:
  - Toast: "[Entity Name] updated successfully."
  - Inline data updates immediately; audit trail logs modified field diffs.
* **Audit & Event Side Effects**:
  - Writes `AuditLog` (`action: ENTITY_UPDATED`, diff of changed keys: `{ oldValues, newValues }`).

---

### 3.3 `DELETE` (Entity Deletion / Archival)
* **Purpose**: Permanently deletes or soft-deletes/archives an entity.
* **Architectural Warning**: The Step 0 audit revealed a dangerous baseline defect where `FormModal.tsx` routed deletions of 7 unrelated entity types to `deleteSubject`. This is strictly prohibited. Every entity must have an explicit, strongly typed, tenant-scoped deletion handler.
* **Required Pre-Conditions**:
  - Caller has explicit `delete` permission (e.g., `student.delete`).
  - Record belongs to active `tenantId`.
  - Referential integrity check: Cannot delete a record if active dependent relations exist (e.g., cannot delete Class if active students are assigned; cannot delete Academic Year if lessons exist).
* **Confirmation Requirements**:
  - **Standard Deletion**: Modal dialog with warning message: "Are you sure you want to delete this [entity]? This action cannot be undone." Requires explicit click on destructive button: "Delete [Entity]".
  - **Critical / High-Impact Deletion** (e.g., Class, Exam, Tenant): Requires typing the exact entity name or confirmation word ("DELETE") into a verification input before the delete button is enabled.
* **Soft-Delete vs Hard-Delete Policy**:
  - Core domain data (Students, Staff, Attendance, Results, Financials) must utilize soft-deletion / archival (`status: ARCHIVED` or `deletedAt: DateTime?`).
  - Transient records (draft announcements, temporary attachments) may use hard database deletion.
* **Success Behavior**:
  - Toast: "[Entity Name] has been deleted."
  - Row removed from UI list immediately via cache invalidation.
* **Audit & Event Side Effects**:
  - Writes high-priority `AuditLog` (`action: ENTITY_DELETED`, `actorId`, `entityId`, `tenantId`).

---

### 3.4 `PUBLISH` (Release to Public / Broad Audience)
* **Purpose**: Transitions a draft or private entity into an active, visible, and immutable state for students, parents, or staff (e.g., Publishing Exam Results, Publishing Timetable, Broadcasting Announcements).
* **Required Pre-Conditions**:
  - Caller has `publish` permission (e.g., `result.publish`, `announcement.publish`).
  - Target entity has completed all prerequisite steps (e.g., 100% of exam marks entered and verified before publishing results).
* **Confirmation Requirements**:
  - Two-step confirmation modal detailing the audience reach:
    - Summary of records to be published (e.g., "142 student result cards will become visible to parents").
    - Clear statement: "Notifications will be dispatched to students and guardians."
    - Explicit confirmation button: "Confirm & Publish".
* **Success Behavior**:
  - State pill updates to `PUBLISHED` (green badge).
  - Toast: "Results published successfully. Notifications queued."
* **Audit & Event Side Effects**:
  - Writes `AuditLog` (`action: ENTITY_PUBLISHED`).
  - Enqueues background BullMQ dispatch jobs to send push, SMS, or email notifications to target audience.

---

### 3.5 `APPROVE` (Formal Administrative Sign-Off)
* **Purpose**: Authorizes or approves a pending workflow request submitted by another user (e.g., Leave requests, Attendance corrections, Grade sheet approval by Principal).
* **Required Pre-Conditions**:
  - Caller has `approve` permission (e.g., `attendance.approve`, `leave.approve`).
  - Caller is distinct from the requester (Four-Eyes Principle / Separation of Duties).
* **UX & Interaction Contract**:
  - Workflow badge: `PENDING_APPROVAL` (amber).
  - Detail screen or drawer shows request summary, submission time, requester identity, and attached evidence.
  - Action buttons: "Approve Request" (green primary) and "Reject with Comments" (red outlined).
  - Rejection requires entering a mandatory textual rationale (> 10 characters).
* **Success Behavior**:
  - Status updates to `APPROVED` or `REJECTED`.
  - Notification dispatched to original requester with comments.
* **Audit & Event Side Effects**:
  - Writes `AuditLog` (`action: WORKFLOW_APPROVED` or `WORKFLOW_REJECTED`, `decisionComments`, `actorId`).

---

### 3.6 `EXPORT` (Data Extraction & Reporting)
* **Purpose**: Extracts institutional data into downloadable formats (CSV, XLSX, PDF) for reporting or external compliance.
* **Security & Privacy Invariants**:
  - Caller has explicit `export` permission (e.g., `student.export`, `result.export`).
  - Masking applied: Sensitive PII (Aadhaar numbers, bank details, medical records) must be masked or omitted unless caller has dedicated `sensitive_data.read` permission.
  - Tenant scoping: Export file generation MUST strictly query only records matching verified `tenantId`.
* **UX & Interaction Contract**:
  - Invoked via "Export" dropdown button with options: "Export as CSV", "Export as PDF".
  - For small datasets (< 500 rows): Generated client-side or streamed synchronously (< 2 seconds).
  - For large datasets (> 500 rows / institutional reports): Asynchronously queued; toast informs user: "Your export is being generated. You will receive an in-app download notification when ready."
* **Audit & Event Side Effects**:
  - Writes mandatory security `AuditLog` (`action: DATA_EXPORTED`, `filterCriteria`, `recordCount`, `exportFormat`).

---

## 4. Universal Mutation Return Schema

Every Server Action must return a deterministic typed result matching this TypeScript contract:

```typescript
export type ActionResult<T = unknown> = 
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: {
        code: 
          | 'UNAUTHENTICATED'
          | 'FORBIDDEN'
          | 'MODULE_DISABLED'
          | 'NOT_FOUND'
          | 'VALIDATION_ERROR'
          | 'DUPLICATE_RECORD'
          | 'PRECONDITION_FAILED'
          | 'INTERNAL_ERROR';
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
```

---

## 5. Screen Action Compliance Matrix

| Operation | Server RBAC Verified | Tenant Scoped Query | Zod Validated | Confirmation Modal | Audit Log Generated | Background Event |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Create** | Required | Required | Required | No (Form) | Mandatory | Conditional |
| **Update** | Required | Required | Required | No (Dirty Guard) | Mandatory | Conditional |
| **Delete** | Required | Required | N/A | Mandatory | Mandatory | Optional |
| **Publish** | Required | Required | Required | Mandatory | Mandatory | Mandatory |
| **Approve** | Required | Required | Required | Mandatory | Mandatory | Mandatory |
| **Export** | Required | Required | N/A | Optional | Mandatory | No |
