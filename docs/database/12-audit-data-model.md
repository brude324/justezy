# 12 — Audit Logging Data Model & Compliance Invariants

## 1. Architectural Mandate: Append-Only Immutability

**Status**: TARGET / SPECIFICATION  
**Scope**: Transactional Security, Regulatory Compliance (DPDP Act India), and Operational Forensics.

In the transformed SaaS platform, auditing is an integral architectural pillar rather than an afterthought:
- **Append-Only Immutability**: The `AuditLog` table strictly permits `INSERT` operations. `UPDATE` and `DELETE` operations are prohibited by database permissions and application code.
- **Transactional Atomicity**: Critical state-altering mutations (e.g., student grade modifications, attendance corrections, permission role changes, tenant suspensions) MUST write their `AuditLog` record within the same PostgreSQL transaction as the business operation.
- **PII Protection in Audit Records**: Passwords, plaintext national identity tokens (Aadhaar), session secrets, and personal bank accounts MUST NEVER enter the audit log. Only non-sensitive field diffs are recorded.

---

## 2. Conceptual Audit Entity Graph

```
┌─────────────────────────────────┐
│              User               │ (Actor triggering the action)
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       1 ┌─────────────────────────────┐
│            AuditLog             ├────────►│           Tenant            │
│  - actionCategory (SECURITY/etc)│         │ (Tenant where action took   │
│  - action (e.g. ATTENDANCE_EDIT)│         │  place; null if SaaS admin) │
│  - entityType, entityId         │         └─────────────────────────────┘
│  - diffJson ({old, new})        │
│  - ipAddress, userAgent         │
│  - createdAt (Immutable)        │
└─────────────────────────────────┘
```

---

## 3. Detailed Entity Specifications

### `AuditLog`
- **Definition**: The tamper-evident transactional ledger of institutional and platform actions.
- **Attributes**:
  - `id`: Unique identifier (CUID / UUID v7).
  - `tenantId`: Optional foreign key to `Tenant` (populated for institutional actions; `null` for SaaS platform control plane actions).
  - `actorId`: Foreign key to `User` who initiated the mutation (`null` for automated scheduled workers).
  - `actorEmail`: Cached string of actor email (preserves auditability even if user is later deleted/archived).
  - `actionCategory`: Enum:
    - `AUTH`: Sign-in, sign-out, password change, MFA challenge, invitation accepted.
    - `SECURITY`: Permission denied (403), scope violation, token tampering, role assignment.
    - `TENANT_MGMT`: Tenant provisioned, suspended, quota changed, module toggled.
    - `RBAC`: Custom role created, permissions modified, user assigned role.
    - `ACADEMIC`: Class teacher reassigned, academic year activated, subject archived.
    - `STUDENT`: Student admitted, promoted, transferred, guardian linked.
    - `ATTENDANCE`: Bulk attendance submitted, attendance record corrected.
    - `EVALUATION`: Marks entered, exam published, report cards released.
    - `EXPORT`: Student directory exported, marks exported, audit log exported.
  - `action`: String (e.g., `STUDENT_PROMOTED`, `MARKS_PUBLISHED`, `TENANT_SUSPENDED`).
  - `entityType`: String (e.g., `StudentProfile`, `ExamResult`, `AttendanceRecord`, `Tenant`).
  - `entityId`: String (ID of the target entity mutated).
  - `diffJson`: Structured JSON containing modified key-value diffs:
    ```json
    {
      "changedFields": ["theoryMarks", "totalMarks", "gradeLetter"],
      "oldValues": { "theoryMarks": 45.0, "totalMarks": 45.0, "gradeLetter": "C" },
      "newValues": { "theoryMarks": 68.0, "totalMarks": 68.0, "gradeLetter": "B1" },
      "reason": "Re-evaluation requested by parent"
    }
    ```
  - `ipAddress`: String (Client IP address).
  - `userAgent`: String (Browser / mobile user-agent string).
  - `createdAt`: Timestamp with timezone (Defaults to `now()`).

---

## 4. Performance & Retention Strategy

- **Targeted Diffs**: The application does NOT serialize entire table row blobs into `diffJson`. It only writes the specific columns that changed (`oldValues` vs `newValues`).
- **Partitioning Strategy (PostgreSQL Native)**: For high-volume enterprise deployments, the physical `AuditLog` table will be range-partitioned monthly by `createdAt` (e.g., `audit_log_2026_09`, `audit_log_2026_10`), ensuring fast analytical queries and efficient archival.
- **Index Optimization**:
  - `@@index([tenantId, createdAt])`: High-speed institutional audit log rendering in `TNT-SET-01`.
  - `@@index([actorId, createdAt])`: User forensics.
  - `@@index([entityType, entityId])`: Entity timeline history.
