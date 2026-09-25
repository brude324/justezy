# Section E: Database & Schema Audit

## 1. Schema Overview

The database is managed via Prisma ORM connecting to PostgreSQL. The schema file [prisma/schema.prisma](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/prisma/schema.prisma) defines:
- **14 Models**: `Admin`, `Student`, `Teacher`, `Parent`, `Grade`, `Class`, `Subject`, `Lesson`, `Exam`, `Assignment`, `Result`, `Attendance`, `Event`, `Announcement`.
- **2 Enums**: `UserSex` (`MALE`, `FEMALE`), `Day` (`MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`).
- **2 Migrations**:
  - `20240905145454_init` (initial tables)
  - `20240913083652_addbirthday` (added `birthday` to Student and Teacher)

---

## 2. High-Level Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    Admin {
        String id PK
        String username UK
    }

    Teacher {
        String id PK
        String username UK
        String name
        String surname
        String email UK
        String phone UK
        String address
        String img
        String bloodType
        UserSex sex
        DateTime createdAt
        DateTime birthday
    }

    Parent {
        String id PK
        String username UK
        String name
        String surname
        String email UK
        String phone UK
        String address
        DateTime createdAt
    }

    Student {
        String id PK
        String username UK
        String name
        String surname
        String email UK
        String phone UK
        String address
        String img
        String bloodType
        UserSex sex
        DateTime createdAt
        DateTime birthday
        String parentId FK
        Int classId FK
        Int gradeId FK
    }

    Grade {
        Int id PK
        Int level UK
    }

    Class {
        Int id PK
        String name UK
        Int capacity
        String supervisorId FK
        Int gradeId FK
    }

    Subject {
        Int id PK
        String name UK
    }

    Lesson {
        Int id PK
        String name
        Day day
        DateTime startTime
        DateTime endTime
        Int subjectId FK
        Int classId FK
        String teacherId FK
    }

    Exam {
        Int id PK
        String title
        DateTime startTime
        DateTime endTime
        Int lessonId FK
    }

    Assignment {
        Int id PK
        String title
        DateTime startDate
        DateTime dueDate
        Int lessonId FK
    }

    Result {
        Int id PK
        Int score
        Int examId FK
        Int assignmentId FK
        String studentId FK
    }

    Attendance {
        Int id PK
        DateTime date
        Boolean present
        String studentId FK
        Int lessonId FK
    }

    Event {
        Int id PK
        String title
        String description
        DateTime startTime
        DateTime endTime
        Int classId FK
    }

    Announcement {
        Int id PK
        String title
        String description
        DateTime date
        Int classId FK
    }

    Parent ||--o{ Student : "parentId"
    Class ||--o{ Student : "classId"
    Grade ||--o{ Student : "gradeId"
    Grade ||--o{ Class : "gradeId (classess)"
    Teacher ||--o{ Class : "supervisorId"
    Teacher }o--o{ Subject : "_SubjectToTeacher"
    Subject ||--o{ Lesson : "subjectId"
    Class ||--o{ Lesson : "classId"
    Teacher ||--o{ Lesson : "teacherId"
    Lesson ||--o{ Exam : "lessonId"
    Lesson ||--o{ Assignment : "lessonId"
    Lesson ||--o{ Attendance : "lessonId"
    Student ||--o{ Attendance : "studentId"
    Student ||--o{ Result : "studentId"
    Exam ||--o{ Result : "examId"
    Assignment ||--o{ Result : "assignmentId"
    Class ||--o{ Event : "classId"
    Class ||--o{ Announcement : "classId"
```

---

## 3. Comprehensive Model Audit

### 3.1 `Admin`
- **Fields**: `id String @id`, `username String @unique`
- **Deficiencies**: No email, no name, no audit timestamp, no tenant association. Clerk ID stored directly as PK.

### 3.2 `Teacher`
- **Fields**: `id String @id`, `username String @unique`, `name String`, `surname String`, `email String? @unique`, `phone String? @unique`, `address String`, `img String?`, `bloodType String`, `sex UserSex`, `createdAt DateTime @default(now())`, `birthday DateTime`
- **Relations**: `subjects Subject[]` (implicit M:N), `lessons Lesson[]`, `classes Class[]` (supervised classes)
- **Deficiencies**: No designation, no department, no employment status, no tenant scoping.

### 3.3 `Student`
- **Fields**: `id String @id`, `username String @unique`, `name String`, `surname String`, `email String? @unique`, `phone String? @unique`, `address String`, `img String?`, `bloodType String`, `sex UserSex`, `createdAt DateTime @default(now())`, `birthday DateTime`, `parentId String`, `classId Int`, `gradeId Int`
- **Relations**: `parent Parent`, `class Class`, `grade Grade`, `attendances Attendance[]`, `results Result[]`
- **Deficiencies**: Both `classId` and `gradeId` stored redundantly on Student even though `Class` already belongs to `Grade`. No roll number, admission number, or academic year.

### 3.4 `Parent`
- **Fields**: `id String @id`, `username String @unique`, `name String`, `surname String`, `email String? @unique`, `phone String @unique`, `address String`, `createdAt DateTime @default(now())`
- **Relations**: `students Student[]`
- **Deficiencies**: Phone is non-nullable (`String @unique`), email is optional. No relation to user credentials or relationship type (Father, Mother, Guardian).

### 3.5 `Grade`
- **Fields**: `id Int @id @default(autoincrement())`, `level Int @unique`
- **Relations**: `students Student[]`, `classess Class[]` (Note typo in field name: `classess`)
- **Deficiencies**: `level` has a global `@unique` constraint across the entire database. In a multi-tenant setup, multiple schools will have Grade level 1, 2, 3, etc., causing collisions!

### 3.6 `Class`
- **Fields**: `id Int @id @default(autoincrement())`, `name String @unique`, `capacity Int`, `supervisorId String?`, `gradeId Int`
- **Relations**: `supervisor Teacher?`, `lessons Lesson[]`, `students Student[]`, `grade Grade`, `events Event[]`, `announcements Announcement[]`
- **Deficiencies**: `name` has a global `@unique` constraint (`name String @unique`). Different schools cannot both have a class named "10A". `supervisorId` is nullable.

### 3.7 `Subject`
- **Fields**: `id Int @id @default(autoincrement())`, `name String @unique`
- **Relations**: `teachers Teacher[]`, `lessons Lesson[]`
- **Deficiencies**: `name String @unique` prevents two tenants from offering "Mathematics" or "Science". No subject code.

### 3.8 `Lesson`
- **Fields**: `id Int @id @default(autoincrement())`, `name String`, `day Day`, `startTime DateTime`, `endTime DateTime`, `subjectId Int`, `classId Int`, `teacherId String`
- **Relations**: `subject Subject`, `class Class`, `teacher Teacher`, `exams Exam[]`, `assignments Assignment[]`, `attendances Attendance[]`
- **Deficiencies**: Day is constrained to MONDAY-FRIDAY. Indian schools frequently have Saturday classes. `startTime` and `endTime` are stored as full `DateTime` instead of time-of-day offsets.

### 3.9 `Exam`
- **Fields**: `id Int @id @default(autoincrement())`, `title String`, `startTime DateTime`, `endTime DateTime`, `lessonId Int`
- **Relations**: `lesson Lesson`, `results Result[]`
- **Deficiencies**: Exams are tied to a single `Lesson` rather than an exam series, subject, or academic term.

### 3.10 `Assignment`
- **Fields**: `id Int @id @default(autoincrement())`, `title String`, `startDate DateTime`, `dueDate DateTime`, `lessonId Int`
- **Relations**: `lesson Lesson`, `results Result[]`
- **Deficiencies**: No file attachment/submission mechanism, no maximum marks field.

### 3.11 `Result`
- **Fields**: `id Int @id @default(autoincrement())`, `score Int`, `examId Int?`, `assignmentId Int?`, `studentId String`
- **Relations**: `exam Exam?`, `assignment Assignment?`, `student Student`
- **Deficiencies**: Score is an integer (cannot represent decimals or grades like A+). An entity can have both `examId` and `assignmentId` null simultaneously, or both populated (no CHECK constraint).

### 3.12 `Attendance`
- **Fields**: `id Int @id @default(autoincrement())`, `date DateTime`, `present Boolean`, `studentId String`, `lessonId Int`
- **Relations**: `student Student`, `lesson Lesson`
- **Deficiencies**: Tied to `lessonId` (period-wise attendance) rather than daily or session-wise attendance. `present` is a binary boolean (no Late, Half-Day, Medical Leave status). No unique constraint on `(date, studentId, lessonId)`.

### 3.13 `Event` & `Announcement`
- **Fields (`Event`)**: `id Int @id @default(autoincrement())`, `title String`, `description String`, `startTime DateTime`, `endTime DateTime`, `classId Int?`
- **Fields (`Announcement`)**: `id Int @id @default(autoincrement())`, `title String`, `description String`, `date DateTime`, `classId Int?`
- **Deficiencies**: `classId` nullable indicates school-wide vs. class-specific. In multi-tenant architecture, `classId = null` would be visible to all schools without a `tenantId`.

---

## 4. Cross-Cutting Database Omissions

1. **Tenant / Institution Boundaries**: Zero models possess `tenant_id`, `school_id`, or `organization_id`.
2. **Unified User Table**: Identity is splintered across `Admin`, `Teacher`, `Student`, and `Parent`. There is no core `User` model, no `Membership` junction, and no unified profile.
3. **Audit Fields**: No `updatedAt` on any model; only `createdAt` on `Student`, `Teacher`, and `Parent`. No `createdById` or `updatedById`.
4. **Soft Deletion**: No `isDeleted` or `deletedAt` fields anywhere in the schema. All deletes are hard cascading deletions.
5. **Database Indexing**: **Zero secondary indexes exist** across the entire database. Foreign key fields (`studentId`, `lessonId`, `classId`, `teacherId`, `gradeId`, `parentId`) lack indexes, resulting in sequential table scans for joins and list queries.
6. **Academic Year & Term Context**: No concept of academic sessions (e.g., 2024-2025). When a student advances to the next grade, historical records will be corrupted or lost.
