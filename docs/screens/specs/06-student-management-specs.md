# Detailed Screen Specifications: Student Management Suite

## Screen 21: TNT-STU-01 — Student Directory
1. **Screen ID**: `TNT-STU-01`
2. **Screen Name**: Student Directory
3. **Route**: `/tenant/students`
4. **Module**: Student Management (`student_directory`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE` for Admins) / Assigned Class Scope (`AccessScope.ASSIGNED_ONLY` for Teachers)
6. **Primary User(s)**: Institution Admin, Principal, Class Teachers
7. **Secondary User(s)**: Attendance Clerks, Exam Officers
8. **Purpose**: Primary institutional registry for all enrolled learners: search, filter by grade and section, track enrollment status, provision new student records, link parents/guardians, and export institutional rosters.
9. **Entry Points**: Institutional Sidebar under "Students"; dashboard shortcut from `TNT-DSH-01`.
10. **Navigation Placement**: Primary link under "Academics" or "Students" in institutional sidebar.
11. **Required Permissions**: `student.profile.read` (to view directory); `student.create` (to add); `student.export` (to export).
12. **Required Module Entitlement**: `student_directory`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**: Table of Enrolled Students: Avatar/Photo, Full Name, Admission/Enrollment Number, Grade & Section (e.g., Grade 10-A), Roll Number, Gender, Guardian/Parent Name & Contact, Attendance Rate (%), Enrollment Status (`ACTIVE`, `INACTIVE`, `PROMOTED`, `TRANSFERRED`), Actions.
15. **Filters**: Grade dropdown (All, Grade 1 to 12), Section dropdown (A, B, C), Gender dropdown, Status dropdown (`ACTIVE`, `INACTIVE`, `TRANSFERRED`).
16. **Search**: Instant debounced search bar querying Student Name, Admission Number, Roll Number, or Guardian Phone.
17. **Sorting**: Sort by Roll Number (Ascending), Full Name (A-Z), Admission Number, Attendance Rate.
18. **Pagination**: Server-side pagination, 25 records per page.
19. **Primary Actions**: "Enroll New Student" (opens onboarding wizard/drawer, requires `student.create`).
20. **Secondary Actions**: "Export Roster" (CSV/PDF, requires `student.export`), "Bulk Import Students" (CSV upload wizard), "Promote Class Roster".
21. **Bulk Actions**: "Export Selected", "Assign Section", "Update Status", "Print ID Cards".
22. **Row Actions**: "View 360 Profile" (navigates to `TNT-STU-02`), "Edit Student" (requires `student.update`), "Link Guardian", "Archive/Transfer" (requires `student.delete`).
23. **Forms**: "Enroll New Student" Drawer / Wizard.
24. **Form Fields**: Full Legal Name (`string`, required), Admission Number (`string`, required, unique in tenant), Roll Number (`number`, required within section), Grade (`dropdown`, required), Section (`dropdown`, required), Date of Birth (`date`, required), Gender (`dropdown: MALE, FEMALE, OTHER`, required), Blood Group (`dropdown`, optional), Admission Date (`date`, defaults to today), Guardian Full Name (`string`, required), Guardian Mobile Phone (`phone`, required), Guardian Relationship (`dropdown: FATHER, MOTHER, GUARDIAN`), Address (`string`, optional), Medical Alerts/Allergies (`string`, optional).
25. **Validation Rules**: Admission Number must be strictly unique within the institution (`[tenantId, admissionNumber]`); Roll Number must be unique within `[tenantId, classId, sectionId, academicYearId]`; Guardian mobile must be valid 10-digit Indian phone; Date of birth must indicate student age between 3 and 25 years.
26. **Confirmation Requirements**: Archiving or transferring a student requires confirmation modal explaining that academic and attendance history will be preserved as read-only.
27. **Success Behavior**: Toast: "Student enrolled successfully. Guardian linked." Roster updates optimistically.
28. **Error Behavior**: Duplicate admission number displays inline conflict warning: "A student with Admission No [X] is already enrolled in this school."
29. **Empty State**: "No students found matching your filters. [Enroll First Student] or clear filters."
30. **Loading State**: Table skeleton loader with 10 rows.
31. **Forbidden State**: HTTP 403 Forbidden with explanation if teacher attempts to view unassigned grade.
32. **Module-Disabled State**: HTTP 402 Module Disabled if `student_directory` is unlicensed.
33. **Mobile Behavior**: Table collapses to responsive student list cards showing Avatar, Name, Grade-Section, Roll No, and Attendance pill, with swipe actions for quick contact.
34. **Tablet Behavior**: Scrollable data table with sticky column for Student Name.
35. **Desktop Behavior**: Full-width data table with multi-column sorting, quick class filter chips, and bulk selection checkboxes.
36. **PWA Relevance**: `DESKTOP + MOBILE`.
37. **Accessibility Considerations**: Accessible table semantics (`<caption>`, `<th>`, `aria-sort`); high contrast status badges.
38. **Audit Requirements**: Student creation, updates, and status transfers logged to `AuditLog`.
39. **Notification/Event Side Effects**: Sends welcome SMS to parent phone with link to parent portal and login instructions.
40. **Dependencies on Other Screens/Modules**: Links to `TNT-STU-02`, references `TNT-CLS-01` and `TNT-PAR-01`.

---

## Screen 22: TNT-STU-02 — Student 360 Profile
1. **Screen ID**: `TNT-STU-02`
2. **Screen Name**: Student 360 Profile
3. **Route**: `/tenant/students/[id]`
4. **Module**: Student Management (`student_directory`)
5. **Scope**: Institutional Scope (`INSTITUTION_WIDE` for Admins) / Assigned Class Scope (`ASSIGNED_ONLY` for Teachers) / Linked Children Scope (`LINKED_CHILDREN` for Parents) / Self Scope (`SELF_ONLY` for Student)
6. **Primary User(s)**: Institution Admin, Class Teacher, Subject Teachers
7. **Secondary User(s)**: Parents/Guardians (inspecting own child), Student (inspecting own record)
8. **Purpose**: Complete comprehensive student academic record: view biographical details, parent/guardian links, full attendance history, exam results, term report cards, homework submissions, and behavioral remarks.
9. **Entry Points**: Row click in `TNT-STU-01`, child switcher in `TNT-DSH-04`, student dashboard profile link in `TNT-DSH-03`.
10. **Navigation Placement**: Child view of Student Directory / Family Portal.
11. **Required Permissions**: `student.profile.read` (with scope validation).
12. **Required Module Entitlement**: `student_directory`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Header: Student Photo, Full Name, Grade & Section, Roll No, Admission No, Attendance Badge (e.g. 94.2%), Quick Actions (Edit Profile, Contact Guardian, Print Profile PDF).
    - Tab 1: Overview & Biography (Date of Birth, Gender, Blood Group, Medical Notes, Address, Emergency Contact). Note: National ID/Aadhaar masked unless caller has `sensitive_data.read`.
    - Tab 2: Family & Guardians (Primary Guardian Name, Relationship, Phone, Email, Secondary Guardian info).
    - Tab 3: Attendance History (Monthly calendar heat map of Present, Absent, Late days; term attendance percentage).
    - Tab 4: Academics & Marks (Subject breakdown, Mid-term & Final exam marks, Grade Points, Published Report Cards).
    - Tab 5: Assignments & Submissions (Homework history, submission status, teacher feedback).
15. **Filters**: Academic Year dropdown selector for historical academic records.
16. **Search**: None within profile.
17. **Sorting**: Marks and assignments sorted by date/term.
18. **Pagination**: Attendance and assignment history paginated 15 per page.
19. **Primary Actions**: "Edit Profile" (requires `student.update`), "Download Student Profile PDF".
20. **Secondary Actions**: "Link / Update Guardian", "Transfer Student", "Reset Student Password".
21. **Bulk Actions**: None.
22. **Row Actions**: In Guardians tab: "Call Guardian", "Send SMS Circular". In Report Cards tab: "Download Report Card PDF".
23. **Forms**: Edit Student Profile Form.
24. **Form Fields**: Full Name, Roll Number, Date of Birth, Gender, Blood Group, Address, Medical Notes.
25. **Validation Rules**: Roll Number uniqueness enforced within section; valid DOB.
26. **Confirmation Requirements**: Transferring or un-enrolling student requires confirmation modal.
27. **Success Behavior**: Toast: "Student profile updated successfully."
28. **Error Behavior**: Field validation alerts; access violation returns `403 Forbidden`.
29. **Empty State**: N/A (Detail view).
30. **Loading State**: Profile header and tab shimmer skeletons.
31. **Forbidden State**: Renders `403 Forbidden` if a parent attempts to view a student ID not linked to their account, or if a teacher attempts to view a student outside their assigned classes.
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Tabs scroll horizontally; contact action buttons sticky at bottom of screen.
34. **Tablet Behavior**: 2-column view (left: profile card; right: tab panels).
35. **Desktop Behavior**: Full-width 360-degree dashboard view.
36. **PWA Relevance**: `PWA-CRITICAL` (Parents and teachers frequently access student 360 profiles on mobile).
37. **Accessibility Considerations**: Accessible tab navigation; high contrast calendar heat map for attendance with text labels ("Present", "Absent").
38. **Audit Requirements**: Student profile view by non-family users logged to `AuditLog`; PII unmasking logged.
39. **Notification/Event Side Effects**: Profile edits trigger SMS notification to primary guardian.
40. **Dependencies on Other Screens/Modules**: Aggregates data from `TNT-ATT-02`, `TNT-MRK-02`, `TNT-ASN-02`, `TNT-PAR-01`.
