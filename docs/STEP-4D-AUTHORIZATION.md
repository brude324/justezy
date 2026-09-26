# Step 4D — Authorization Architecture & Dynamic RBAC Foundation

## 1. Executive Summary & Purpose

Step 4D establishes the canonical, fail-closed, multi-tenant authorization foundation for SchoolyardSMS. This system separates **Authentication** (handled strictly by Clerk) from **Authorization** (governed authoritatively by the application PostgreSQL database).

The authorization architecture enforces a dual-gate security decision model across:
1. **Tenant Context & Active Membership**
2. **Institutional Module Entitlements** (Feature licensing gate, returning HTTP 402 if disabled)
3. **Role-Based Access Control (RBAC)** (Atomic permission checks via DB `RolePermission`)
4. **Horizontal Access Scopes** (`INSTITUTION_WIDE`, `ASSIGNED_ONLY`, `SELF_ONLY`, `LINKED_CHILDREN` evaluating verified database relationships)

---

## 2. Authentication vs Authorization Separation of Concerns

```
========================================================================================
CONCERN          PROVIDER               RESPONSIBILITIES
========================================================================================
Authentication   Clerk                  - User identity verification
                                        - Passwordless / MFA / Social login
                                        - Session token issuance & rotation
                                        - Clerk Webhook dispatch (user.created, updated, deleted)
----------------------------------------------------------------------------------------
Authorization    Application Database   - Application User & Tenant records
                 (PostgreSQL via        - TenantMembership & MembershipStatus
                  Prisma Target)        - Dynamic Roles (System & Custom Tenant Roles)
                                        - Atomic Permission catalog
                                        - RolePermission mappings
                                        - AccessScope horizontal boundaries
                                        - TenantModuleEntitlement licensing
                                        - Transactional AuditLog generation
========================================================================================
```

**Non-Negotiable Invariant**: Clerk `publicMetadata` or session claims are **never** trusted as authoritative business authorization. All permissions, scopes, and memberships are resolved and evaluated server-side.

---

## 3. Canonical Dual-Gate Authorization Pipeline

Every protected operation follows the canonical 4-gate authorization sequence:

```
Incoming Request
       │
       ▼
[Gate 0: Tenant Context & Membership]
   • Verify Server-Resolved Tenant Context (AsyncLocalStorage)
   • Assert Caller TenantMembership exists and status == "ACTIVE"
   • Fails closed if Suspended, Terminated, or Missing (403 Forbidden / 401 Unauthorized)
       │
       ▼
[Gate 1: Module Entitlement Gate]
   • If action touches an optional module (e.g. timetable, exam, report_card)
   • Check TenantModuleEntitlement(tenantId, moduleKey)
   • If isEnabled == false or expired: Throw ModuleDisabledError (HTTP 402)
       │
       ▼
[Gate 2: Role Permission Gate]
   • Lookup RolePermission(roleId: membership.roleId, permissionKey)
   • If permission missing: Throw ForbiddenError (HTTP 403)
       │
       ▼
[Gate 3: Horizontal Access Scope Gate]
   • Extract assigned AccessScope (INSTITUTION_WIDE | ASSIGNED_ONLY | SELF_ONLY | LINKED_CHILDREN)
   • INSTITUTION_WIDE: Allow across tenant boundary
   • SELF_ONLY: Assert resourceOwnerUserId == caller.id
   • LINKED_CHILDREN: Verify StudentParentBinding in DB
   • ASSIGNED_ONLY: Verify Class supervisor or ClassSubject teacher in DB
   • If violated: Throw ScopeAccessDeniedError (HTTP 403)
       │
       ▼
[Authorized Execution] ──► Audit Log (if mutating) ──► Database Operation
```

---

## 4. Permission Model & V1 Catalog

Permissions are machine-readable, stable, dot-delimited strings in the format `<domain>.<action>`. They never encode tenant identity.

### Implemented V1 Permission Catalog

| Domain | Permission Key | Module Key | Description |
|---|---|---|---|
| **Identity & Users** | `user.read` | `core_academics` | View institutional user profile |
| | `user.update` | `core_academics` | Modify user profile |
| **Institution** | `tenant.read` | `core_academics` | View institution metadata |
| | `tenant.update` | `core_academics` | Update institution configuration |
| | `tenant.manage` | `core_academics` | Institutional admin operations |
| **Students** | `student.read` | `core_academics` | View student records |
| | `student.create` | `core_academics` | Register new student profile |
| | `student.update` | `core_academics` | Edit student demographic details |
| | `student.delete` | `core_academics` | Archive/deactivate student |
| **Staff** | `staff.read` | `core_academics` | View teacher/staff records |
| | `staff.create` | `core_academics` | Onboard staff members |
| | `staff.update` | `core_academics` | Update staff assignments |
| | `staff.delete` | `core_academics` | Deactivate staff members |
| **Academics** | `class.read` | `core_academics` | View classes and sections |
| | `class.create` | `core_academics` | Create academic classes |
| | `subject.read` | `core_academics` | View academic subjects |
| | `subject.create` | `core_academics` | Create academic subjects |
| **Attendance** | `attendance.read` | `attendance_module` | View daily/lesson attendance |
| | `attendance.mark` | `attendance_module` | Record student attendance |
| | `attendance.update` | `attendance_module` | Edit past attendance |
| | `attendance.correct` | `attendance_module` | Administrative attendance correction |
| **Timetable** | `timetable.read` | `timetable_module` | View class/teacher schedules |
| | `timetable.manage` | `timetable_module` | Edit timetable periods and lesson slots |
| **Exams** | `exam.read` | `exam_module` | View scheduled exam papers |
| | `exam.create` | `exam_module` | Create new exam paper |
| | `exam.publish` | `exam_module` | Publish exam schedules and grades |
| | `result.read` | `exam_module` | View student exam results |
| | `result.update` | `exam_module` | Enter or grade exam marks |
| **Report Cards** | `report_card.generate` | `report_card_module` | Generate term-end report cards |
| | `report_card.read` | `report_card_module` | View student report cards |
| **Assignments** | `assignment.read` | `assignment_module` | View course assignments |
| | `assignment.create` | `assignment_module` | Create and assign coursework |
| | `assignment.grade` | `assignment_module` | Grade student submissions |
| **Communication** | `announcement.read` | `communication_module` | Read school announcements |
| | `announcement.create`| `communication_module` | Publish announcements |
| | `event.read` | `communication_module` | View academic calendar events |
| | `event.create` | `communication_module` | Schedule calendar events |

---

## 5. System Roles & Default Access Scope Matrix

Roles do not have implicit ranking or unearned inheritance. Access is determined purely by explicit `RolePermission` records.

| System Role Key | Role Category | Default Scope | Key Permissions Granted |
|---|---|---|---|
| `INSTITUTION_OWNER` | Tenant Admin | `INSTITUTION_WIDE` | Complete tenant control: `tenant.*`, `user.*`, `student.*`, `staff.*`, `class.*`, `attendance.*`, `exam.*`, `timetable.*`, `report_card.*`, `announcement.*` |
| `INSTITUTION_ADMIN` | Tenant Admin | `INSTITUTION_WIDE` | Operational administration: all academic, attendance, exam, and student management permissions |
| `PRINCIPAL` | Academic Leadership | `INSTITUTION_WIDE` | Academic supervision: read/update across students, teachers, classes, exams, report cards, timetables |
| `TEACHER` | Faculty | `ASSIGNED_ONLY` | Assigned class supervision: `attendance.read/mark`, `exam.read/create`, `result.read/update`, `assignment.*`, `announcement.read/create` |
| `STUDENT` | Learner | `SELF_ONLY` | Personal record access: `student.read` (own profile), `attendance.read` (own), `result.read` (own), `assignment.read` (assigned class), `announcement.read` |
| `PARENT` | Guardian | `LINKED_CHILDREN` | Child record access: `student.read` (linked kids), `attendance.read` (linked kids), `result.read` (linked kids), `announcement.read` |

---

## 6. Access Scope Rules & Evaluator Engine

The `ScopeEvaluator` verifies horizontal boundaries using database queries rather than trusting client-supplied identifiers:

1. **`INSTITUTION_WIDE`**: Caller may access any record in the active tenant.
2. **`SELF_ONLY`**:
   - Compares target resource owner with `context.user.id`.
   - Also resolves `StudentProfile(userId: context.user.id)` to verify student self-ownership.
3. **`LINKED_CHILDREN`**:
   - Resolves `ParentProfile(userId: context.user.id, tenantId)`.
   - Queries `StudentParentBinding(parentId: parentProfile.id, studentId: targetStudentId)`.
   - Rejects if no binding exists in the database.
4. **`ASSIGNED_ONLY`**:
   - Resolves `StaffProfile(userId: context.user.id, tenantId)`.
   - Checks if caller is `supervisorTeacherId` on target `Class`.
   - Checks if caller is `teacherId` on `ClassSubject` for the target class.
   - Rejects if teacher has no active teaching assignment for the class.

---

## 7. Platform Authorization vs Tenant Authorization

The platform control plane and tenant institutions are strictly separated:

```
Platform Users (SUPER_ADMIN, SUPPORT_OPERATOR, AUDITOR)
   │
   ▼
platformAuthorizer.requirePlatformRole(["SUPER_ADMIN"])
   • Evaluates DB PlatformUser record
   • Completely independent of TenantMembership
   • Tenant admins CANNOT perform platform operations
   • Platform users DO NOT automatically inherit tenant memberships
```

---

## 8. Role Management & Privilege Escalation Defense

All administrative mutations are guarded by `RoleService`:
- **Self-Escalation Block**: A user cannot assign themselves a role with higher privileges.
- **Cross-Tenant Block**: Custom roles cannot be assigned or modified across tenant boundaries.
- **System Role Protection**: System roles cannot be deleted or re-keyed.
- **Transactional Audit Logging**: Every role assignment and creation generates a durable `AuditLog` entry.

---

## 9. Error Semantics & HTTP Status Codes

The authorization engine strictly separates error conditions:
- **`401 Unauthorized`** (`UnauthorizedError`): Missing authentication session or unauthenticated request.
- **`402 Payment Required / Module Disabled`** (`ModuleDisabledError`): Action requires a feature module not licensed or enabled for this institution.
- **`403 Forbidden`** (`ForbiddenError`): Caller possesses insufficient permissions.
- **`403 Forbidden (Scope)`** (`ScopeAccessDeniedError`): Caller has the permission, but horizontal boundary check failed (e.g. accessing unrelated student).
- **`404 Not Found`** (`NotFoundError`): Used when resource existence must be concealed.

---

## 10. Status & Scope Matrix

- **CURRENT**: Foundational authorization engine, dual-gate pipeline, scope evaluator, role service, platform authorizer, unit test suite (119 passing tests).
- **IMPLEMENTED**: Complete RBAC foundation, `ModuleGate`, `ScopeEvaluator`, `PolicyEngine`, `PlatformAuthorizer`, `RoleService`, comprehensive Authorization Matrix test suite.
- **TARGET**: Full Step 4E V1 business module cutover and legacy CRUD action migration.
- **DEFERRED**: Step 4E handles migrating legacy `src/lib/actions.ts` and wiring server-side authorization into all dashboard screen mutations.
