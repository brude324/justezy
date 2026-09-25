# Audit Logging & Compliance Architecture

## 1. Core Architectural Principle: Atomic Transactional Auditing

**Status**: DECISION

A critical finding from Step 0 was the architectural contradiction of relying on asynchronous queues for security-critical audit logging.

**The Golden Audit Rule**:
> Critical business, academic, financial, and security audit events **MUST be persisted atomically within the exact same database transaction as the corresponding mutation**.

Under no circumstances may the system rely on an asynchronous background queue (such as Redis or BullMQ) to persist authoritative audit logs. If a background queue fails, crashes, or drops messages, the legal and regulatory audit trail of an educational institution must **never** be lost.

Background message queues are designated strictly for secondary, non-critical downstream consumers:
- Delivering push notifications to administrators.
- Re-indexing audit trails into search clusters.
- Generating asynchronous export CSVs or compliance reports.

---

## 2. Conceptual Audit Log Entity Specification

**Status**: TARGET / PROPOSED (Physical schema deferred to Step 3)

```prisma
// Conceptual Model: AuditLog
model AuditLog {
  id          String   @id @default(cuid())
  tenantId    String   // Mandatory Tenant Scoping
  actorId     String   // Application User ID who performed the action
  action      String   // Standardized Action Enum / Code
  entityType  String   // e.g. "StudentProfile", "Result", "FeePayment"
  entityId    String   // Identifier of the modified entity
  timestamp   DateTime @default(now())
  ipAddress   String?  // Client IP address
  userAgent   String?  // Client user-agent string
  reason      String?  // Mandatory reason for high-impact changes (e.g. marks override)
  oldState    Json?    // Serialized snapshot before mutation
  newState    Json?    // Serialized snapshot after mutation

  @@index([tenantId, entityType, entityId])
  @@index([tenantId, actorId, timestamp])
  @@index([tenantId, timestamp])
}
```

---

## 3. High-Impact Events Requiring Mandatory Atomic Auditing

| Domain | Event Code | Trigger Condition | Mandatory Fields |
| :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | `USER_ROLE_ASSIGNED` | Administrator changes a user's role or membership permissions. | Old Role, New Role, Admin Actor ID. |
| **Academic Records** | `MARKS_OVERRIDDEN` | Teacher or Admin alters a student's finalized exam marks. | Old Score, New Score, Mandatory Reason string. |
| **Student Profiles** | `STUDENT_DELETED` | Student profile is archived or permanently removed. | Complete serialized profile snapshot, Actor ID. |
| **Attendance** | `ATTENDANCE_OVERRIDDEN` | Attendance record is modified after the official daily roll-call window. | Previous State, New State, Reason. |
| **Financial (V2)** | `FEE_PAYMENT_COLLECTED`| Offline cash/cheque receipt is generated. | Receipt Number, Amount, Collector ID. |
| **Financial (V2)** | `FEE_WAIVER_GRANTED` | Tuition fee concession or scholarship applied. | Concession Amount, Approver ID, Justification. |

---

## 4. Atomic Audit Persistence Pattern

Every domain mutation service follows the atomic transaction pattern:

```typescript
// TARGET / PROPOSED: Atomic Mutation + Audit Transaction
await prisma.$transaction(async (tx) => {
  // 1. Fetch current state for delta comparison
  const originalResult = await tx.result.findUniqueOrThrow({
    where: { id: input.resultId, tenantId: ctx.tenantId },
  });

  // 2. Perform the business mutation
  const updatedResult = await tx.result.update({
    where: { id: input.resultId, tenantId: ctx.tenantId },
    data: { score: input.newScore },
  });

  // 3. Atomically write the audit log entry
  await tx.auditLog.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'MARKS_OVERRIDDEN',
      entityType: 'Result',
      entityId: input.resultId,
      oldState: { score: originalResult.score },
      newState: { score: updatedResult.score },
      reason: input.reason,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
  });

  // 4. Both commit together, or both rollback together
});
```

---

## 5. Tamper-Resistance & Export Governance

1. **Strictly Append-Only**: The `AuditLog` table has zero `UPDATE` or `DELETE` permissions granted to application database users.
2. **Institutional Compliance Exports**: Administrators with `audit.export` permission can export date-bounded audit logs to signed CSV/PDF archives for accreditation bodies (e.g. CBSE / NAAC compliance inspections in India).
