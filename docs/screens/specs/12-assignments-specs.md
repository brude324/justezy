# Detailed Screen Specifications: Assignments & Homework Suite

## Screen 33: TNT-ASN-01 — Assignments & Homework Hub
1. **Screen ID**: `TNT-ASN-01`
2. **Screen Name**: Assignments & Homework Hub
3. **Route**: `/tenant/assignments`
4. **Module**: Assignments & Learning (`assignment_module`)
5. **Scope**: Institutional Scope for Admins / Assigned Scope for Teachers / Self Scope for Students / Linked Scope for Parents
6. **Primary User(s)**: Subject Teachers, Students, Parents
7. **Secondary User(s)**: Institution Admin, Academic Supervisors
8. **Purpose**: Centralized digital homework portal: teachers distribute daily class assignments and learning resources; students and parents monitor due dates, track completion, and submit digital work.
9. **Entry Points**: Sidebar "Assignments" or "Homework"; quick widget links from Dashboards `TNT-DSH-02`, `TNT-DSH-03`, `TNT-DSH-04`.
10. **Navigation Placement**: Primary link under "Academics" -> "Assignments" in sidebar.
11. **Required Permissions**: `assignment.read` (to view); `assignment.create` (to post); `assignment.delete` (to remove).
12. **Required Module Entitlement**: `assignment_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**: Table / Grid of Assignments: Assignment Title, Subject Badge (e.g., Mathematics), Target Class & Section (e.g., 10-A), Assigned Date, Due Date & Time, Assigned By (Teacher Name), Submissions Ratio (e.g., 34/40 Submitted for Teachers; Status pill `SUBMITTED`, `PENDING`, `OVERDUE`, `GRADED` for Students/Parents), Actions.
15. **Filters**: Status filter (`ALL`, `PENDING`, `SUBMITTED`, `EVALUATED`), Subject dropdown, Class dropdown.
16. **Search**: Search by Assignment Title or Description keywords.
17. **Sorting**: Sort by Due Date (Closest first), Assigned Date, Subject.
18. **Pagination**: Server-side pagination, 15 records per page.
19. **Primary Actions**: "Create Assignment" (opens `TNT-ASN-02` form/drawer for teachers, requires `assignment.create`).
20. **Secondary Actions**: "Filter Overdue Assignments", "Export Homework Log (PDF)".
21. **Bulk Actions**: For teachers: "Extend Due Date for Selected", "Delete Selected".
22. **Row Actions**: For teachers: "Review Submissions" (opens review view in `TNT-ASN-02`), "Edit Assignment", "Delete Assignment". For students: "Submit Work" (opens submission modal in `TNT-ASN-02`), "View Feedback".
23. **Forms**: None directly on hub page.
24. **Form Fields**: N/A.
25. **Validation Rules**: N/A.
26. **Confirmation Requirements**: Deleting an assignment prompts confirmation modal: "Deleting this assignment will remove all associated student submissions and grades."
27. **Success Behavior**: Active assignments load with clear deadline badges (Green: > 48h remaining, Yellow: < 24h remaining, Red: Overdue).
28. **Error Behavior**: Banner alert if assignment fetch fails.
29. **Empty State**: For students: "Great job! You have no pending homework assignments." For teachers: "No assignments posted yet for this class. [Create First Assignment]."
30. **Loading State**: Assignment card skeleton loaders with progress pills.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled if `assignment_module` is unlicensed.
33. **Mobile Behavior**: Responsive assignment cards with deadline countdown chips and one-tap submission buttons.
34. **Tablet Behavior**: 2-column card grid.
35. **Desktop Behavior**: Full data table with inline submission progress bars and quick action buttons.
36. **PWA Relevance**: `PWA-CRITICAL` (Students and parents check homework daily on mobile devices).
37. **Accessibility Considerations**: Deadline urgency is announced with text ("Due in 4 hours", not color alone); accessible submission status pills.
38. **Audit Requirements**: Assignment creation, edits, and deletions logged in `AuditLog`.
39. **Notification/Event Side Effects**: Creating a new assignment triggers push/in-app notification to enrolled students and parents.
40. **Dependencies on Other Screens/Modules**: Depends on `TNT-CLS-01` and `TNT-SUB-01`; links to `TNT-ASN-02`.

---

## Screen 34: TNT-ASN-02 — Assignment Creator & Submission Reviewer
1. **Screen ID**: `TNT-ASN-02`
2. **Screen Name**: Assignment Creator & Submission Reviewer
3. **Route**: `/tenant/assignments/new` (or `/tenant/assignments/[id]`)
4. **Module**: Assignments & Learning (`assignment_module`)
5. **Scope**: Assigned Scope for Teachers / Self Scope for Students / Institutional Scope for Admins
6. **Primary User(s)**: Subject Teachers (creating/grading), Students (submitting work)
7. **Secondary User(s)**: Parents (reviewing submitted work and teacher comments)
8. **Purpose**: Dual-purpose workflow screen: (A) For Teachers: author rich homework assignments with PDF/image attachments and review/grade student submission rosters; (B) For Students: upload work, attach documents/images, and receive teacher feedback.
9. **Entry Points**: "Create Assignment" button on `TNT-ASN-01` or row click on an existing assignment.
10. **Navigation Placement**: Child view of Assignments Hub.
11. **Required Permissions**: `assignment.create` / `assignment.grade` (for teachers); `assignment.submit` (for students); `assignment.read` (for parents).
12. **Required Module Entitlement**: `assignment_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Mode A (Teacher Creator / Submissions View): Assignment Header (Title, Class, Subject, Due Date, Instructions, Teacher Attachments). Submissions Table: Student Name, Roll No, Submission Timestamp, Status Badge (`SUBMITTED`, `NOT_SUBMITTED`, `GRADED`, `RESUBMISSION_REQUESTED`), Attached Files link, Marks / Score input, Feedback Notes.
    - Mode B (Student Submission View): Assignment Instructions, Due Date, Downloadable Worksheet link, Digital Submission Uploader (File dropzone for PDF, JPG, PNG up to 10MB), Submission Notes textarea, Grade & Teacher Feedback (if evaluated).
15. **Filters**: For teachers: Submission status filter (`ALL`, `NEEDS_GRADING`, `GRADED`, `NOT_SUBMITTED`).
16. **Search**: Search student name in submissions roster.
17. **Sorting**: Sort submissions by Roll Number, Submission Date, Score.
18. **Pagination**: Submissions table paginated 25 per page.
19. **Primary Actions**: For teachers: "Publish Assignment" (create mode) or "Save All Grades" (review mode). For students: "Submit Assignment" (submit mode).
20. **Secondary Actions**: "Save Draft", "Request Resubmission", "Download All Submissions (ZIP)".
21. **Bulk Actions**: For teachers: "Mark All Ungraded as Completed", "Download Selected Files".
22. **Row Actions**: In Submissions table: "Inspect Submission", "Enter Grade & Comment", "Return for Correction".
23. **Forms**: Assignment Authoring Form (Mode A) / Student Submission Form (Mode B) / Teacher Grading Form.
24. **Form Fields**:
    - Mode A Form: Title (`string`, required), Class/Section (`dropdown`, required), Subject (`dropdown`, required), Due Date & Time (`datetime`, required), Maximum Marks (`number`, optional), Instructions (`rich text / markdown`), Attachments (`file upload: PDF, DOCX, images`).
    - Mode B Form: Student File Attachments (`file dropzone`), Student Remarks (`textarea`, optional).
    - Grading Form: Marks Awarded (`number`), Feedback Comments (`textarea`).
25. **Validation Rules**: Due date must be in the future; file upload limited to allowed MIME types (`image/*`, `application/pdf`) and max 10MB; Marks Awarded cannot exceed Maximum Marks.
26. **Confirmation Requirements**: Publishing assignment prompts confirmation showing target recipient count.
27. **Success Behavior**: Toast: "Assignment published successfully" or "Submission received successfully."
28. **Error Behavior**: File upload error banner if file is oversized or corrupt; validation alerts on required fields.
29. **Empty State**: In submissions view: "No students have submitted work yet. Submissions will appear as students upload their work."
30. **Loading State**: Form skeletons; file upload progress bar with animated percentage.
31. **Forbidden State**: HTTP 403 Forbidden (preventing students from accessing teacher grading tools or peers' files).
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Mobile file upload via camera snapshot or file picker; sticky submit button at bottom.
34. **Tablet Behavior**: Split view (left: assignment text; right: submission uploader or grading table).
35. **Desktop Behavior**: Full-width authoring workspace / interactive grading grid with document preview modal.
36. **PWA Relevance**: `PWA-CRITICAL` (Students photograph written paper homework with mobile camera and submit via PWA).
37. **Accessibility Considerations**: Accessible file dropzone with clear keyboard focus and file selection announcements; error alerts use `role="alert"`.
38. **Audit Requirements**: Assignment creation, file uploads, and grade entries logged to `AuditLog`.
39. **Notification/Event Side Effects**: Assignment publication triggers student notifications; submission triggers teacher notification; grade posting notifies student and parent.
40. **Dependencies on Other Screens/Modules**: Depends on `TNT-ASN-01`, `TNT-CLS-01`, `TNT-SUB-01`, `TNT-STU-01`.
