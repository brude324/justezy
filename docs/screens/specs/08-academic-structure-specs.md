# Detailed Screen Specifications: Academic Structure & Foundation Suite

## Screen 24: TNT-ACD-01 — Academic Terms Manager
1. **Screen ID**: `TNT-ACD-01`
2. **Screen Name**: Academic Terms Manager
3. **Route**: `/tenant/academic-years`
4. **Module**: Academic Structure (`core_academics`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE`)
6. **Primary User(s)**: Institution Admin, Principal, Registrar
7. **Secondary User(s)**: Academic Coordinators
8. **Purpose**: Configure academic calendar years (e.g., 2026-2027), define grading terms/semesters (Term 1, Term 2), set active session status, and control term boundaries.
9. **Entry Points**: Institutional Sidebar under "Academic Settings" or "Academics"; link in institutional setup checklist.
10. **Navigation Placement**: Secondary link under "Academics" -> "Academic Years".
11. **Required Permissions**: `academic.year.manage`
12. **Required Module Entitlement**: `core_academics`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**: Table/Cards of Academic Years: Academic Year Label (e.g., "2026-2027"), Start Date, End Date, Status Badge (`ACTIVE`, `UPCOMING`, `ARCHIVED`), Terms List (Term 1, Term 2, Mid-Term dates), Enrolled Students Count, Classes Configured, Actions.
15. **Filters**: Status filter (`ALL`, `ACTIVE`, `ARCHIVED`).
16. **Search**: Search by Academic Year label.
17. **Sorting**: Chronological by Start Date (Newest first).
18. **Pagination**: Server-side pagination, 10 records per page.
19. **Primary Actions**: "Create Academic Year" (opens modal/drawer, requires `academic.year.manage`).
20. **Secondary Actions**: "Set Active Session", "Archive Past Year".
21. **Bulk Actions**: None.
22. **Row Actions**: "Edit Year Dates", "Manage Terms/Semesters", "View Classes Assigned", "Archive".
23. **Forms**: "Create/Edit Academic Year" Form Modal.
24. **Form Fields**: Year Label (`string`, e.g. "2026-2027", required), Start Date (`date`, required), End Date (`date`, required), Terms Count (`number: 1 to 4`, default 2), Set as Active Session (`checkbox`).
25. **Validation Rules**: Start Date must precede End Date by at least 180 days; Year Label must be unique within `tenantId`; only one Academic Year can be marked `ACTIVE` at any given time.
26. **Confirmation Requirements**: Setting a new year as `ACTIVE` prompts confirmation: "Setting this session as active will switch the default academic session for all attendance, classes, and grading across the school."
27. **Success Behavior**: Toast: "Academic session updated successfully." System-wide active session context updates.
28. **Error Behavior**: Overlapping dates or duplicate labels display inline error alert.
29. **Empty State**: "No academic years configured. Create your first academic year to begin school operations."
30. **Loading State**: Card shimmer skeleton.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Vertically stacked year cards with term chips.
34. **Tablet Behavior**: 2-column card layout.
35. **Desktop Behavior**: Structured table with expandable terms accordion.
36. **PWA Relevance**: `DESKTOP-PRIMARY`.
37. **Accessibility Considerations**: Accessible date pickers with keyboard navigation; active session badge clearly announced.
38. **Audit Requirements**: All academic year creations, edits, and active status switches logged to `AuditLog`.
39. **Notification/Event Side Effects**: None.
40. **Dependencies on Other Screens/Modules**: Foundation for `TNT-CLS-01`, `TNT-STU-01`, `TNT-TBL-01`, `TNT-EXM-01`.

---

## Screen 25: TNT-CLS-01 — Classes & Sections Manager
1. **Screen ID**: `TNT-CLS-01`
2. **Screen Name**: Classes & Sections Manager
3. **Route**: `/tenant/classes`
4. **Module**: Academic Structure (`core_academics`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE` for Admins) / Assigned Class Scope (`AccessScope.ASSIGNED_ONLY` for Teachers)
6. **Primary User(s)**: Institution Admin, Principal, Academic Dean
7. **Secondary User(s)**: Class Teachers inspecting class rosters
8. **Purpose**: Define academic grades (Grade 1 through 12, Pre-K, etc.), create classroom sections (Section A, B, C), assign Class Teachers / Room Numbers, manage student capacities, and view enrolled student rosters per class.
9. **Entry Points**: Institutional Sidebar under "Classes & Sections"; quick link from Admin Dashboard `TNT-DSH-01`.
10. **Navigation Placement**: Primary link under "Academics" -> "Classes".
11. **Required Permissions**: `class.read` (to view); `class.create` (to add); `class.update` (to edit); `class.delete` (to remove).
12. **Required Module Entitlement**: `core_academics`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**: Grid / Table of Classes: Grade Name (e.g. Grade 10), Section Name (e.g. Section A), Class Teacher Name & Avatar, Enrolled Students vs Capacity (e.g., 38 / 40), Room / Classroom Number, Associated Subjects Count, Actions.
15. **Filters**: Grade filter dropdown (All, Grade 1 to 12), Academic Year dropdown.
16. **Search**: Search by Class Name, Section, or Teacher Name.
17. **Sorting**: Sort by Grade level (Ascending/Descending), Student Count, Section.
18. **Pagination**: Server-side pagination, 20 records per page.
19. **Primary Actions**: "Add Class / Section" (opens modal/drawer, requires `class.create`).
20. **Secondary Actions**: "Assign Class Teachers", "Export Class Rosters".
21. **Bulk Actions**: "Assign Academic Year", "Export Selected".
22. **Row Actions**: "View Roster" (opens list of students in section), "Edit Class" (requires `class.update`), "Assign Subjects", "Delete Class" (requires `class.delete`).
23. **Forms**: "Add Class / Section" Modal Form.
24. **Form Fields**: Grade Name (`string`, required, e.g. "Grade 10"), Section Name (`string`, required, e.g. "A"), Academic Year (`dropdown`, required), Class Teacher (`typeahead search dropdown: Faculty`, optional), Student Capacity (`number`, required, default 40), Room Number (`string`, optional).
25. **Validation Rules**: Composite uniqueness enforced: `[tenantId, gradeName, sectionName, academicYearId]`; capacity must be > 0.
26. **Confirmation Requirements**: Deleting a class requires strict verification modal: "Cannot delete class if active student enrollments or timetable lessons exist. Unassign or transfer students first."
27. **Success Behavior**: Toast: "Class [Grade]-[Section] created successfully." Grid updates immediately.
28. **Error Behavior**: Duplicate section warning alert; foreign key rejection banner if deleting populated class.
29. **Empty State**: "No classes configured for this academic year. [Add First Class]."
30. **Loading State**: 6-card grid skeleton loader.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Responsive card list with quick roster drawer.
34. **Tablet Behavior**: 2-column card grid.
35. **Desktop Behavior**: Interactive data table / card grid with quick class teacher re-assignment dropdown.
36. **PWA Relevance**: `DESKTOP-PRIMARY`.
37. **Accessibility Considerations**: Accessible modal dialog; capacity progress bar has `aria-valuenow` and `aria-valuemax`.
38. **Audit Requirements**: Class creation, class teacher assignment, and deletion logged to `AuditLog`.
39. **Notification/Event Side Effects**: If a teacher is assigned as Class Teacher, dispatches in-app notification to the teacher.
40. **Dependencies on Other Screens/Modules**: Depends on `TNT-ACD-01` and `TNT-STF-01`; feeds into `TNT-STU-01`, `TNT-TBL-01`, `TNT-ATT-01`.

---

## Screen 26: TNT-SUB-01 — Subject & Course Catalog
1. **Screen ID**: `TNT-SUB-01`
2. **Screen Name**: Subject & Course Catalog
3. **Route**: `/tenant/subjects`
4. **Module**: Academic Structure (`core_academics`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE`)
6. **Primary User(s)**: Institution Admin, Principal, Curriculum Coordinator
7. **Secondary User(s)**: Teachers (curriculum review)
8. **Purpose**: Maintain institutional subject curriculum catalog (e.g., Mathematics, English Literature, Computer Science), assign subject codes, categorize (Theory, Practical, Elective), and link qualified faculty members.
9. **Entry Points**: Institutional Sidebar under "Academics" -> "Subjects".
10. **Navigation Placement**: Secondary link under "Academics" in institutional sidebar.
11. **Required Permissions**: `subject.read` (to view); `subject.create` (to add); `subject.update` (to edit); `subject.delete` (to remove).
12. **Required Module Entitlement**: `core_academics`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**: Table of Subjects: Subject Name, Subject Code (e.g. `MATH-10`), Subject Type (`THEORY`, `PRACTICAL`, `ELECTIVE`), Applicable Grades (e.g. "Grades 9, 10, 11"), Assigned Faculty Count, Max Marks / Weightage, Actions.
15. **Filters**: Subject Type filter (`ALL`, `THEORY`, `PRACTICAL`, `ELECTIVE`), Grade filter.
16. **Search**: Search by Subject Name or Subject Code.
17. **Sorting**: Sort by Subject Name (A-Z), Subject Code.
18. **Pagination**: Server-side pagination, 20 records per page.
19. **Primary Actions**: "Add Subject" (opens modal/drawer, requires `subject.create`).
20. **Secondary Actions**: "Export Subject Catalog" (CSV).
21. **Bulk Actions**: None.
22. **Row Actions**: "Edit Subject" (requires `subject.update`), "Assign Teachers", "Delete Subject" (requires `subject.delete`).
23. **Forms**: "Add Subject" Modal Form.
24. **Form Fields**: Subject Name (`string`, required), Subject Code (`string`, required, unique in tenant), Subject Type (`dropdown: THEORY, PRACTICAL, ELECTIVE`), Applicable Grades (`multi-select dropdown`), Qualified Faculty (`multi-select typeahead`), Pass Marks (`number`), Max Marks (`number`, default 100).
25. **Validation Rules**: Subject Code must be uppercase alphanumeric and unique per tenant (`[tenantId, subjectCode]`); Max Marks must be > Pass Marks.
26. **Confirmation Requirements**: Deleting a subject prompts confirmation modal: "Cannot delete subject if linked to active exam schedules or timetable lessons."
27. **Success Behavior**: Toast: "Subject created successfully." Catalog updates.
28. **Error Behavior**: Duplicate subject code displays conflict alert.
29. **Empty State**: "No subjects added yet. [Add First Subject]."
30. **Loading State**: Table skeleton loader with 6 rows.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Responsive card list showing code badges and assigned faculty counts.
34. **Tablet Behavior**: Scrollable table.
35. **Desktop Behavior**: Clean curriculum catalog table with expandable faculty chips.
36. **PWA Relevance**: `DESKTOP-PRIMARY`.
37. **Accessibility Considerations**: Accessible chips and dropdown tags with screen reader announcements.
38. **Audit Requirements**: Subject creation, updates, and removals logged to `AuditLog`.
39. **Notification/Event Side Effects**: None.
40. **Dependencies on Other Screens/Modules**: Feeds into `TNT-CLS-01`, `TNT-TBL-01`, `TNT-EXM-01`.
