# Detailed Screen Specifications: Timetable & Scheduling Suite

## Screen 27: TNT-TBL-01 — Master Timetable Grid & Builder
1. **Screen ID**: `TNT-TBL-01`
2. **Screen Name**: Master Timetable Grid & Builder
3. **Route**: `/tenant/timetable`
4. **Module**: Timetable & Scheduling (`timetable_module`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE`)
6. **Primary User(s)**: Institution Admin, Principal, Academic Timetable Coordinator
7. **Secondary User(s)**: Department Heads
8. **Purpose**: Interactive institutional scheduling grid to configure periods (time slots, recess/lunch), assign subject teachers to specific class periods across weekdays (Monday–Saturday), detect scheduling conflicts in real time, and publish official timetables.
9. **Entry Points**: Institutional Sidebar under "Timetable" -> "Master Timetable Builder".
10. **Navigation Placement**: Primary link under "Timetable" in institutional sidebar.
11. **Required Permissions**: `timetable.manage` (to configure periods and lessons); `timetable.read` (to view).
12. **Required Module Entitlement**: `timetable_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Header: Target Class Selector (e.g., Grade 10-A), Academic Year, Term, "Conflict Detection: 0 Conflicts Found" badge, "Publish Timetable" CTA.
    - Scheduling Grid: Matrix of Weekdays (Monday through Saturday as rows) x Periods (Period 1 to Period 8 + Recess / Lunch breaks as columns).
    - Grid Cell Content: Subject Badge (e.g. "Math"), Assigned Teacher Name (e.g. "R. Sharma"), Room Number (e.g. "Room 204"), Conflict Warning icon (if teacher double-booked).
    - Sidebar Tray: Available Subjects & Teachers list for drag-and-drop or click-to-assign placement.
15. **Filters**: Target Class/Section dropdown, View Mode toggle (By Class vs By Teacher).
16. **Search**: Search teacher availability within scheduler drawer.
17. **Sorting**: Weekdays in standard calendar order; periods in chronological time sequence.
18. **Pagination**: None (full weekly grid displayed simultaneously).
19. **Primary Actions**: "Publish Timetable" (opens confirmation modal, requires `timetable.manage`).
20. **Secondary Actions**: "Configure Period Timeslots", "Clear Grid", "Export Timetable PDF", "Auto-Generate Slots (AI/Rule-based)".
21. **Bulk Actions**: "Copy Schedule to Section [B]", "Clear Day Schedule".
22. **Row Actions**: Click cell to assign/edit lesson slot or drag-and-drop subject card into cell.
23. **Forms**: "Assign Lesson Slot" Modal / Cell Popover.
24. **Form Fields**: Subject (`dropdown`, required), Teacher (`dropdown`, required), Room Number (`string`, optional), Recess/Break Slot (`checkbox`).
25. **Validation Rules**: Real-time hard conflict check: Teacher cannot be assigned to two distinct classes during overlapping time slots on the same day; Room cannot be double-booked; slot duration must fit within period boundaries.
26. **Confirmation Requirements**: Publishing timetable prompts modal: "Publishing this timetable will make it active and immediately visible to 42 students and 6 teachers."
27. **Success Behavior**: Cell updates instantly; conflict badge updates; toast confirms: "Lesson slot saved successfully."
28. **Error Behavior**: Immediate red cell highlight and tooltip: "Conflict detected: Teacher R. Sharma is already scheduled for Grade 9-B during Period 3 on Tuesday."
29. **Empty State**: "Timetable grid is empty for Grade [X]. Click slots to assign subjects or use Auto-Generate."
30. **Loading State**: Weekly grid skeleton with pulsing table cells.
31. **Forbidden State**: HTTP 403 Forbidden boundary.
32. **Module-Disabled State**: HTTP 402 Module Disabled if `timetable_module` is unlicensed.
33. **Mobile Behavior**: Grid converts to tabbed weekday view (Monday, Tuesday...) with vertical period cards.
34. **Tablet Behavior**: Horizontal scrolling grid with fixed weekday header.
35. **Desktop Behavior**: Full-width interactive drag-and-drop scheduling matrix with live conflict detection.
36. **PWA Relevance**: `DESKTOP-PRIMARY` (Builder is desktop-focused; published views are mobile-first).
37. **Accessibility Considerations**: Accessible grid semantics (`role="grid"`, `role="row"`, `role="gridcell"`); keyboard navigation between cells via arrow keys; conflicts announced via `aria-live="assertive"`.
38. **Audit Requirements**: Timetable creation, slot edits, and publishing actions logged to `AuditLog`.
39. **Notification/Event Side Effects**: Publishing triggers in-app notification to affected teachers and students.
40. **Dependencies on Other Screens/Modules**: Depends on `TNT-CLS-01`, `TNT-SUB-01`, `TNT-STF-01`; feeds into `TNT-TBL-02` and `TNT-ATT-01`.

---

## Screen 28: TNT-TBL-02 — Weekly Timetable & Schedule View
1. **Screen ID**: `TNT-TBL-02`
2. **Screen Name**: Weekly Timetable & Schedule View
3. **Route**: `/tenant/timetable/view` (or `/tenant/timetable`)
4. **Module**: Timetable & Scheduling (`timetable_module`)
5. **Scope**: Institutional Scope for Admins / Assigned Scope for Teachers / Self Scope for Students / Linked Scope for Parents
6. **Primary User(s)**: Teachers, Students, Parents
7. **Secondary User(s)**: Substitute Teachers, Front Desk Staff
8. **Purpose**: Read-only, clean, touch-friendly weekly schedule viewer tailored to the logged-in user: shows periods, subjects, teachers, and timings for the active day or full week.
9. **Entry Points**: Sidebar "Timetable" link for Teachers/Students; dashboard widget link from `TNT-DSH-02`, `TNT-DSH-03`, `TNT-DSH-04`.
10. **Navigation Placement**: Primary link under "Timetable" in teacher/student/parent navigation.
11. **Required Permissions**: `timetable.read`
12. **Required Module Entitlement**: `timetable_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Header: Target Context (e.g. "My Schedule — Teacher Sharma" or "Grade 10-A Timetable"), Day Selector tabs (Mon, Tue, Wed, Thu, Fri, Sat), "Current Period" live indicator badge.
    - Timeline / Period Cards: Period Number, Time range (e.g., 09:00 AM – 09:45 AM), Subject Name & Code, Teacher Avatar & Name, Room Number, Break/Recess banner.
15. **Filters**: Weekday tabs (defaults to current day of the week), Class Selector (for Admins).
16. **Search**: None.
17. **Sorting**: Chronological by period start time.
18. **Pagination**: None.
19. **Primary Actions**: "Mark Attendance" (quick-action button on active period card for teacher).
20. **Secondary Actions**: "Download Schedule PDF", "Sync with Google Calendar / iCal".
21. **Bulk Actions**: None.
22. **Row Actions**: Click period card to view lesson details or syllabus topic.
23. **Forms**: None (Read-only view).
24. **Form Fields**: N/A.
25. **Validation Rules**: N/A.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Active period is dynamically highlighted with pulsing border based on device clock.
28. **Error Behavior**: Banner alert if timetable failed to load.
29. **Empty State**: "No classes scheduled for [Day]. Enjoy your break!"
30. **Loading State**: Timeline skeleton with 6 period cards.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Mobile-first vertical timeline stream; sticky top weekday selector; large tap-friendly cards; prominent active class banner.
34. **Tablet Behavior**: Full weekly 6-column grid or single-day expanded view.
35. **Desktop Behavior**: Full-width calendar grid view with day/week toggle.
36. **PWA Relevance**: `PWA-CRITICAL` (Frequently checked multiple times daily by teachers and students on mobile phones).
37. **Accessibility Considerations**: High contrast time text; active period announced to screen readers.
38. **Audit Requirements**: Access logged in tenant user session log.
39. **Notification/Event Side Effects**: None.
40. **Dependencies on Other Screens/Modules**: Renders published schedules produced by `TNT-TBL-01`.
