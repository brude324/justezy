# 04 — Dynamic Database-Driven RBAC Data Model

## 1. Architectural Mandate: `ROLE != PERMISSION`

**Status**: TARGET / SPECIFICATION  
**Scope**: Dynamic Database-Driven Authorization Engine.

In the transformed SaaS architecture, hardcoding role strings (e.g., `if (role === 'admin')` or `if (role === 'teacher')`) in application logic or database queries is **strictly prohibited**. 

The authorization engine adheres to three fundamental axioms:
1. **Roles are Administrative Containers**: A `Role` is simply a named collection of atomic capabilities (`Permissions`).
2. **Operations Require Permissions**: Application screens, Server Actions, and API routes verify atomic permissions (e.g., `attendance.mark`, `exam.publish`).
3. **Scopes Constrain Visibility**: A permission is evaluated within a horizontal `AccessScope` that limits which specific rows of data a user may inspect or mutate.

---

## 2. Conceptual RBAC Entity Graph

```
┌─────────────────────────────────┐
│              User               │ (Global Human Identity)
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐
│        TenantMembership         │ (Binds User to Tenant)
│  - tenantId                     │
│  - userId                       │
│  - roleId                       │
│  - status (ACTIVE/INVITED)      │
└───────────────┬─────────────────┘
                │ *
                │
                │ 1
┌───────────────▼─────────────────┐
│              Role               │
│  - tenantId (null = System)     │
│  - roleKey                      │
│  - name                         │
│  - isSystemRole                 │
└───────────────┬─────────────────┘
                │ 1
                │
                │ *
┌───────────────▼─────────────────┐       * ┌─────────────────────────────┐
│         RolePermission          ├────────►│         Permission          │
│  - roleId                       │ 1       │  - permissionKey (Unique)   │
│  - permissionId                 │         │  - moduleKey                │
│  - accessScope                  │         │  - verb (read/create/etc)   │
└─────────────────────────────────┘         └─────────────────────────────┘
```

---

## 3. Detailed RBAC Entity Specifications

### 3.1 `Role`
- **Definition**: Represents an organizational persona within the SaaS platform or a specific institution.
- **System Roles vs. Custom Tenant Roles**:
  - **System Predefined Roles (`tenantId: null, isSystemRole: true`)**: Seeded by the platform and immutable. Available across all institutions:
    - `INSTITUTION_OWNER`: Full administrative sovereignty over institutional configuration, billing, and staff.
    - `PRINCIPAL`: Complete academic and operational clearance.
    - `TEACHER`: Instructional clearance for assigned classes and subjects.
    - `STAFF`: Administrative clerk and registrar clearance.
    - `STUDENT`: Learner view restricted strictly to self.
    - `PARENT`: Family view restricted strictly to linked children.
  - **Custom Tenant Roles (`tenantId: "tenant_xyz", isSystemRole: false`)**: Institutions can create customized roles (e.g. `EXAM_CONTROLLER`, `ACADEMIC_COORDINATOR`, `SPORTS_DIRECTOR`, `ACCOUNTANT`) with tailored permission sets without requiring code deployments or database schema migrations.

### 3.2 `Permission`
- **Definition**: An atomic, non-decomposable statement of capability within a functional module.
- **Standardized Naming Convention**: `[module_domain].[entity_or_concept].[verb]`
  - Examples:
    - `attendance.record.mark`
    - `attendance.record.correct`
    - `exam.session.create`
    - `exam.result.publish`
    - `student.profile.export`
- **Verb Taxonomy**:
  - `read`: View records matching caller's access scope.
  - `create`: Instantiates new records.
  - `update`: Modifies existing records within access scope.
  - `delete`: Soft-deletes or archives records.
  - `publish`: Transitions status from draft to active public/student view.
  - `approve`: Formally authorizes pending workflow requests.
  - `export`: Extracts data to external files (CSV, PDF) with PII sanitization.
  - `manage`: Full administrative configuration over a domain.

### 3.3 `RolePermission` Junction & `AccessScope` Engine
- **Definition**: Connects a `Role` to a `Permission` and specifies the horizontal boundary (`AccessScope`) within which the permission applies.
- **Horizontal Access Scopes**:
  1. **`INSTITUTION_WIDE`**: Caller can access records across the entire educational institution (used by Owners, Principals, Head Registrars).
  2. **`ASSIGNED_ONLY`**: Caller can access records ONLY for classes, sections, or subjects assigned to them in the academic timetable or roster (used by Subject Teachers and Class Teachers).
  3. **`SELF_ONLY`**: Caller can access ONLY records where `studentId === caller.studentId` or `userId === caller.userId` (used by Students and individual Staff for profile edits).
  4. **`LINKED_CHILDREN`**: Caller can access ONLY records for students linked to their guardian record via `StudentParentBinding` (used by Parents/Guardians).

---

## 4. Authorization Evaluation Pipeline

When a Server Action or API mutation executes, it evaluates authorization through a deterministic three-step pipeline:

```
  ┌─────────────────────────┐
  │  Step 1: Authenticate   │  Verify active Clerk session token (resolves User).
  └────────────┬────────────┘
               │
               ▼
  ┌─────────────────────────┐
  │  Step 2: Tenant Context │  Verify User holds ACTIVE TenantMembership in target
  └────────────┬────────────┘  tenantId (resolves Role and RolePermissions).
               │
               ▼
  ┌─────────────────────────┐
  │  Step 3: Evaluate Scope │  Assert Role possui required PermissionKey.
  └─────────────────────────┘  Apply AccessScope query filter to database operation:
                               - INSTITUTION_WIDE: where: { tenantId }
                               - ASSIGNED_ONLY:    where: { tenantId, class: { teacherId: staffId } }
                               - SELF_ONLY:        where: { tenantId, studentId: callerStudentId }
                               - LINKED_CHILDREN:  where: { tenantId, studentId: { in: linkedKids } }
```

If any step fails, the request is terminated immediately with an HTTP 401 Unauthenticated or HTTP 403 Forbidden exception and logged to the security audit trail.
