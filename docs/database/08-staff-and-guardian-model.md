# 08 — Staff & Parent/Guardian Relational Data Model

## 1. Architectural Mandate: Decoupled Persona Graphs

**Status**: TARGET / SPECIFICATION  
**Scope**: Staff Employment and Family Relationship Architecture.

In traditional single-school prototype architectures (including the Step 0 baseline), `Teacher` and `Parent` were modeled as flat, isolated database tables conflating login credentials, phone numbers, and academic roles.

The target architecture enforces a strict decoupling:
1. **`User` is Global Identity**: Holds authentication email, password (via Clerk), and universal communication preferences.
2. **`TenantMembership` Binds User to Institution**: Assigns the institutional role (`TEACHER`, `PARENT`).
3. **`StaffProfile` Contains Employment Data**: Captures institutional HR and teaching credentials.
4. **`ParentProfile` & `StudentParentBinding` Support Multi-Child Family Graphs**: Models complex family dynamics where multiple guardians (Mother, Father, Local Guardian) connect to multiple enrolled siblings.

---

## 2. Conceptual Persona Relational Graph

```
                            ┌─────────────────────────────────┐
                            │              User               │ (Global Human Identity)
                            └───────────────┬─────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     │ 1                                           │ 1
                     │                                             │
                     │ 0..*                                        │ 0..*
         ┌───────────▼───────────┐                     ┌───────────▼───────────┐
         │     StaffProfile      │                     │     ParentProfile     │
         │ - employeeId (Unique) │                     │ - fullName            │
         │ - designation         │                     │ - primaryPhone        │
         │ - department          │                     │ - email               │
         └───────────┬───────────┘                     └───────────┬───────────┘
                     │                                             │ 1
                     │ 1                                           │
                     │                                             │ *
                     │ *                               ┌───────────▼───────────┐
         ┌───────────▼───────────┐                     │ StudentParentBinding  │
         │     ClassSubject      │                     │ - relationshipType    │
         │ (Assigned Instructor) │                     │ - isPrimaryContact    │
         └───────────────────────┘                     │ - isFeePayer          │
                                                       └───────────┬───────────┘
                                                                   │ *
                                                                   │
                                                                   │ 1
                                                       ┌───────────▼───────────┐
                                                       │    StudentProfile     │
                                                       │ (Enrolled Child)      │
                                                       └───────────────────────┘
```

---

## 3. Detailed Staff Lifecycle Specifications

### 3.1 `StaffProfile`
- **Definition**: Institutional personnel and faculty employment record.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `userId`: Foreign key to `User` (Staff member's digital login account).
  - `membershipId`: Foreign key to `TenantMembership`.
  - `employeeId`: String (e.g., "EMP-1042").
  - `fullName`: String.
  - `gender`: Enum (`MALE`, `FEMALE`, `OTHER`).
  - `designation`: String (e.g., "Senior Mathematics Faculty", "Vice Principal", "Lab Assistant").
  - `department`: String (e.g., "Science", "Humanities", "Administration").
  - `dateOfJoining`: Calendar date.
  - `qualifications`: String (e.g., "M.Sc. Mathematics, B.Ed.").
  - `emergencyContactPerson`: String.
  - `emergencyPhone`: String.
  - `maskedNationalId`: Encrypted string (Aadhaar, masked in UI).
  - `status`: Enum (`ACTIVE`, `ON_LEAVE`, `RESIGNED`, `TERMINATED`, `RETIRED`).
  - `createdAt`, `updatedAt`, `deletedAt`.
- **Composite Uniqueness**: `@@unique([tenantId, employeeId])`.

### 3.2 Academic Supervision Bindings
- **Class Supervisor (Class Teacher)**: Referenced via `Class.supervisorTeacherId` → `StaffProfile.id`.
- **Subject Instructor**: Referenced via `ClassSubject.teacherId` → `StaffProfile.id`.
- **Timetable Period Instructor**: Referenced via `TimetableLesson.teacherId` → `StaffProfile.id`.

---

## 4. Detailed Parent & Guardian Specifications

### 4.1 `ParentProfile`
- **Definition**: Guardian contact entity within an institution.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `userId`: Optional foreign key to `User` (populated once parent accepts portal invitation).
  - `fullName`: String.
  - `primaryPhone`: String (Mandatory for Indian DLT SMS notifications; e.g., "+919876543210").
  - `secondaryPhone`: Optional string.
  - `email`: Optional string.
  - `occupation`: Optional string.
  - `address`: Optional string.
  - `status`: Enum (`ACTIVE`, `INACTIVE`).

### 4.2 `StudentParentBinding`
- **Definition**: Relational junction connecting parents to students, modeling real-world family structures.
- **Attributes**:
  - `id`: Unique identifier (CUID).
  - `tenantId`: Foreign key to `Tenant`.
  - `studentId`: Foreign key to `StudentProfile`.
  - `parentId`: Foreign key to `ParentProfile`.
  - `relationshipType`: Enum (`FATHER`, `MOTHER`, `LEGAL_GUARDIAN`, `STEP_PARENT`, `RELATIVE`).
  - `isPrimaryContact`: Boolean (`true` = primary recipient for urgent attendance alerts).
  - `isFeePayer`: Boolean (`true` = designated recipient for billing and fee invoices).
  - `isEmergencyContact`: Boolean.
  - `canPickupStudent`: Boolean (Authorized for after-school pickup verification).
- **Composite Uniqueness**: `@@unique([tenantId, studentId, parentId])`. Prevents duplicate bindings between the same child and guardian.

---

## 5. Multi-Child & Multi-Guardian Real-World Scenarios

The `StudentParentBinding` model elegantly resolves critical operational edge cases:

1. **Multi-Child Families (Siblings)**:
   - Mrs. Sharma (`ParentProfile`) has two children in the school: Aarav in Grade 10-A and Ananya in Grade 6-B.
   - Two records in `StudentParentBinding` connect Mrs. Sharma to both students.
   - The Parent Dashboard (`TNT-DSH-04`) renders the Child Switcher pill, allowing Mrs. Sharma to toggle between Aarav and Ananya seamlessly.
2. **Dual-Parent Communications**:
   - Both Father (Mr. Sharma) and Mother (Mrs. Sharma) possess distinct `ParentProfile` records.
   - Both are bound to Aarav in `StudentParentBinding`.
   - Mr. Sharma is flagged `isFeePayer: true`; Mrs. Sharma is flagged `isPrimaryContact: true` (receives daily absence alerts).
3. **Guardians with Children in Different Schools**:
   - A parent with one child in a primary school and another in a separate high school holds one global `User` account with two `TenantMembership` records across the two distinct `Tenant` databases, managed through the Multi-Tenant Switcher (`ACC-04`).
