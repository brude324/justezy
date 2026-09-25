# Detailed Screen Specifications: Examinations Suite

## Screen 31: TNT-EXM-01 — Examination Schedule & Master
1. **Screen ID**: `TNT-EXM-01`
2. **Screen Name**: Examination Schedule & Master
3. **Route**: `/tenant/exams`
4. **Module**: Examination & Evaluation (`exam_module`)
5. **Scope**: Institutional Scope for Admins / Assigned Scope for Teachers / Self Scope for Students / Linked Scope for Parents
6. **Primary User(s)**: Institution Admin, Principal, Exam Controller
7. **Secondary User(s)**: Teachers, Students, Parents
8. **Purpose**: Central institutional registry for all examination sessions (e.g., Mid-Term Assessment 2026, Annual CBSE Board Prep, Unit Tests): view scheduled exam dates, papers, class assignments, publishing status, and quick link to marks entry.
9. **Entry Points**: Institutional Sidebar under "Examinations" -> "Exam Schedules"; dashboard shortcut from `TNT-DSH-01`.
10. **Navigation Placement**: Primary link under "Examinations" in institutional sidebar.
11. **Required Permissions**: `exam.read` (to view); `exam.create` (to set up); `exam.publish` (to release schedule).
12. **Required Module Entitlement**: `exam_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**: Grid / Table of Examination Sessions: Exam Title (e.g., "Term 1 Final Examinations 2026"), Academic Term, Target Classes (e.g. Grades 6 through 10), Start Date, End Date, Total Papers Scheduled, Status Badge (`DRAFT`, `SCHEDULED`, `ONGOING`, `COMPLETED`, `RESULTS_PUBLISHED`), Actions.
15. **Filters**: Academic Year dropdown, Term filter, Status filter (`ALL`, `UPCOMING`, `ACTIVE`, `COMPLETED`).
16. **Search**: Search by Exam Title or Target Class.
17. **Sorting**: Sort by Start Date (Upcoming first), Exam Title.
18. **Pagination**: Server-side pagination, 15 records per page.
19. **Primary Actions**: "Create New Examination" (routes to wizard `TNT-EXM-02`, requires `exam.create`).
20. **Secondary Actions**: "Export Exam Date Sheet (PDF)", "Publish Exam Schedule" (requires `exam.publish`).
21. **Bulk Actions**: None.
22. **Row Actions**: "View Date Sheet / Papers", "Edit Exam" (requires `exam.update`), "Enter / View Marks" (routes to `TNT-MRK-01`), "Publish Results" (requires `result.publish`), "Delete Exam" (requires `exam.delete`).
23. **Forms**: None directly on schedule list (wizard handles creation).
24. **Form Fields**: N/A.
25. **Validation Rules**: N/A.
26. **Confirmation Requirements**: Publishing exam schedule prompts confirmation: "Publishing this exam will make the date sheet visible to all target students and guardians, and dispatch notifications."
27. **Success Behavior**: Exam card displays updated `SCHEDULED` status badge with green indicator.
28. **Error Behavior**: Banner error if exam status transition fails.
29. **Empty State**: "No examinations scheduled for this term. [Create New Examination] to set up exam dates and papers."
30. **Loading State**: Exam cards skeleton loader.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled if `exam_module` is unlicensed.
33. **Mobile Behavior**: Responsive cards with date badge and expandable papers list; student/parent view shows clear chronological date sheet.
34. **Tablet Behavior**: 2-column card grid.
35. **Desktop Behavior**: Full data table with expandable nested row showing subject paper schedule and maximum marks.
36. **PWA Relevance**: `DESKTOP + MOBILE`.
37. **Accessibility Considerations**: Accessible status badges; date sheet table uses proper headers; screen reader announcements on status change.
38. **Audit Requirements**: Exam creation, schedule modifications, and publishing logged to `AuditLog`.
39. **Notification/Event Side Effects**: Publishing exam schedule dispatches SMS/email notifications and in-app notices to students and parents.
40. **Dependencies on Other Screens/Modules**: Depends on `TNT-ACD-01`, `TNT-CLS-01`, `TNT-SUB-01`; feeds into `TNT-MRK-01` and `TNT-MRK-02`.

---

## Screen 32: TNT-EXM-02 — Exam Setup & Timetable Wizard
1. **Screen ID**: `TNT-EXM-02`
2. **Screen Name**: Exam Setup & Timetable Wizard
3. **Route**: `/tenant/exams/new` (or `/tenant/exams/[id]/edit`)
4. **Module**: Examination & Evaluation (`exam_module`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE`)
6. **Primary User(s)**: Institution Admin, Principal, Exam Controller
7. **Secondary User(s)**: Academic Coordinators
8. **Purpose**: Multi-step structured setup workflow to define a new examination session: configure exam metadata, select target classes, add subject examination papers with dates, start/end times, room allocations, passing marks, and maximum marks weightage.
9. **Entry Points**: "Create New Examination" button on `TNT-EXM-01`.
10. **Navigation Placement**: Secondary view under "Examinations".
11. **Required Permissions**: `exam.create` (or `exam.update` when editing).
12. **Required Module Entitlement**: `exam_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**: Step indicator (Step 1: Exam Overview; Step 2: Target Classes; Step 3: Paper Schedule & Marks; Step 4: Review & Finalize), dynamic paper scheduling table, summary cards.
15. **Filters**: None.
16. **Search**: Subject selector search inside paper setup.
17. **Sorting**: Papers listed in chronological exam date order.
18. **Pagination**: Multi-step wizard navigation (Previous, Next, Complete).
19. **Primary Actions**: "Create Exam & Save as Draft" / "Publish Schedule" (final step trigger).
20. **Secondary Actions**: "Save Draft & Exit", "Add Subject Paper Row".
21. **Bulk Actions**: "Apply Standard Time to All Papers (e.g. 09:00 AM – 12:00 PM)".
22. **Row Actions**: In Paper Schedule: "Delete Paper Row", "Edit Paper Timings".
23. **Forms**: Multi-step Exam Creation Form.
24. **Form Fields**:
    - Step 1: Exam Title (`string`, required, e.g. "Term 1 Summative Assessment"), Academic Year (`dropdown`), Term (`dropdown`), Start Date (`date`), End Date (`date`), Instructions / Rules (`textarea`).
    - Step 2: Target Classes (`multi-select checkboxes: Grade 1 through 12`).
    - Step 3: Paper Schedule Array: `[{ subjectId: string, examDate: date, startTime: time, endTime: time, maxMarks: number, passMarks: number, roomNumber?: string }]`.
25. **Validation Rules**: Exam Start Date must be before End Date; all paper exam dates must fall between Exam Start and End dates; Max Marks must be > 0; Pass Marks must be <= Max Marks; no class can have two exam papers scheduled at the same time on the same date.
26. **Confirmation Requirements**: Final Step 4 shows complete date sheet summary with confirmation button: "Finalize Exam Schedule".
27. **Success Behavior**: Toast: "Exam schedule configured successfully." Redirects to `TNT-EXM-01`.
28. **Error Behavior**: Scheduling conflicts highlighted in red with descriptive error banner.
29. **Empty State**: N/A.
30. **Loading State**: Step transition spinner; save button loading spinner.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Vertically stacked wizard steps; card-based paper setup with mobile date/time pickers.
34. **Tablet Behavior**: Standard wizard container.
35. **Desktop Behavior**: Full 2-column layout (left: setup form; right: live interactive date sheet preview calendar).
36. **PWA Relevance**: `DESKTOP-PRIMARY`.
37. **Accessibility Considerations**: Accessible step indicators (`aria-current="step"`); accessible time and date pickers.
38. **Audit Requirements**: Exam creation transaction logged to `AuditLog` with complete paper metadata.
39. **Notification/Event Side Effects**: None until published.
40. **Dependencies on Other Screens/Modules**: Uses data from `TNT-ACD-01`, `TNT-CLS-01`, `TNT-SUB-01`; creates records for `TNT-EXM-01`.
