# Detailed Screen Specifications: Attendance Management Suite

## Screen 29: TNT-ATT-01 — Daily Attendance Marking Screen
1. **Screen ID**: `TNT-ATT-01`
2. **Screen Name**: Daily Attendance Marking Screen
3. **Route**: `/tenant/attendance`
4. **Module**: Attendance Management (`attendance_module`)
5. **Scope**: Institutional Scope for Admins / Assigned Class Scope (`AccessScope.ASSIGNED_ONLY`) for Teachers
6. **Primary User(s)**: Class Teachers, Subject Teachers, Attendance Coordinators
7. **Secondary User(s)**: Institution Admin, Principal
8. **Purpose**: Rapid, high-speed, touch-optimized daily student attendance recording: select class/section, review student roster, toggle Present/Absent/Late status with single thumb-taps, mark all present in one click, record absence reasons, and submit verified attendance records.
9. **Entry Points**: "Mark Attendance" button on Teacher Dashboard `TNT-DSH-02` or Admin Dashboard `TNT-DSH-01`; sidebar link under "Attendance".
10. **Navigation Placement**: Primary link under "Attendance" in institutional sidebar / Teacher mobile nav.
11. **Required Permissions**: `attendance.mark` (to mark/save); `attendance.read` (to view); `attendance.correct` (to edit past dates).
12. **Required Module Entitlement**: `attendance_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Header: Target Class/Section Selector (e.g., Grade 10-A), Date Selector (defaults to today), Attendance Status Badge (`NOT_SUBMITTED`, `SUBMITTED`, `LOCKED`), Summary Pills (Total: 40 | Present: 38 | Absent: 2 | Late: 0).
    - Top Quick Action Bar: "Mark All Present" button, "Reset" button.
    - Student Roster List: Roll Number, Student Photo/Avatar, Student Full Name, Attendance Toggle Button Group (`P` [Present - Green], `A` [Absent - Red], `L` [Late - Yellow]), Absence Reason text input / quick-tags (Sick, Family Emergency, Unexcused).
15. **Filters**: Grade & Section dropdown, Date Picker (past dates restricted unless user has `attendance.correct`).
16. **Search**: Quick in-roster search by student name or roll number.
17. **Sorting**: Default sorted strictly by Roll Number (Ascending).
18. **Pagination**: Full class roster rendered on a single view (typically 25–45 students) to ensure rapid submission without page switching.
19. **Primary Actions**: "Submit & Finalize Attendance" (sticky bottom action bar button, requires `attendance.mark`).
20. **Secondary Actions**: "Mark All as Present", "Save as Draft", "Export Attendance Sheet (PDF)".
21. **Bulk Actions**: "Mark All Present", "Invert Attendance Status".
22. **Row Actions**: Toggle status between `PRESENT`, `ABSENT`, `LATE`; click student name to inspect recent attendance record.
23. **Forms**: Attendance Roster Form.
24. **Form Fields**: Date (`date`, required), Class ID (`string`, required), Academic Year ID (`string`, required), Student Attendance Array: `[{ studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE', remarks?: string }]`.
25. **Validation Rules**: All students in class roster must have a selected status before final submission; future dates strictly prohibited; dates > 2 days in the past require `attendance.correct` permission.
26. **Confirmation Requirements**: Submitting attendance prompts brief bottom drawer confirmation: "Confirm submission for Grade 10-A: 38 Present, 2 Absent? Automated SMS alerts will be dispatched to guardians of absent students."
27. **Success Behavior**: Immediate green toast: "Attendance submitted successfully. 2 parent alerts queued." Roster locks or transitions to view mode with "Edit" toggle.
28. **Error Behavior**: Failed submission displays top banner with specific failure reasons; unsaved changes preserved in client state.
29. **Empty State**: "No students currently enrolled in Grade [X]-[Section]. Enroll students first in Student Directory."
30. **Loading State**: Roster skeleton with 15 row placeholders showing avatar circles and toggle pill shapes.
31. **Forbidden State**: Renders `403 Forbidden` if a teacher attempts to mark attendance for a class not assigned to them in `Class.teacherId`.
32. **Module-Disabled State**: HTTP 402 Module Disabled if `attendance_module` is unlicensed.
33. **Mobile Behavior**: `PWA-CRITICAL` one-thumb design: large 44px+ touch targets for P/A/L buttons; haptic vibration feedback upon tapping 'Absent'; sticky bottom submission bar showing live count of Present/Absent students.
34. **Tablet Behavior**: 2-column or wide roster view with expandable remarks field.
35. **Desktop Behavior**: Clean table layout with keyboard navigation shortcuts (e.g., Spacebar toggles P/A, Down Arrow moves to next student).
36. **PWA Relevance**: `PWA-CRITICAL` & **Sync-Sensitive Offline Candidate**: Roster cached in IndexedDB; teachers can mark attendance even when classroom Wi-Fi drops; queue syncs automatically upon network reconnection.
37. **Accessibility Considerations**: Accessible button group semantics (`role="radiogroup"`, `role="radio"`, `aria-checked="true"`); screen readers announce "Aarav Sharma, Roll 1, Marked Present".
38. **Audit Requirements**: Mandatory `AuditLog` entry generated: `action: ATTENDANCE_MARKED`, `classId`, `date`, `totalPresent`, `totalAbsent`, `markedByUserId`. Any subsequent edits log `action: ATTENDANCE_CORRECTED` with old/new status diffs.
39. **Notification/Event Side Effects**: Enqueues background BullMQ jobs: dispatches immediate absence SMS / WhatsApp notifications to parents of absent students.
40. **Dependencies on Other Screens/Modules**: Depends on `TNT-CLS-01` and `TNT-STU-01`; feeds into `TNT-ATT-02`, `TNT-DSH-01`, and `TNT-DSH-04`.

---

## Screen 30: TNT-ATT-02 — Attendance Analytics & History Reports
1. **Screen ID**: `TNT-ATT-02`
2. **Screen Name**: Attendance Analytics & History Reports
3. **Route**: `/tenant/attendance/reports`
4. **Module**: Attendance Management (`attendance_module`)
5. **Scope**: Institutional Scope for Admins / Assigned Scope for Teachers / Self Scope for Students / Linked Scope for Parents
6. **Primary User(s)**: Institution Admin, Principal, Class Teachers
7. **Secondary User(s)**: Parents & Students (viewing personal/child history)
8. **Purpose**: Track institutional, class-wise, and individual student attendance records over time: identify chronic absenteeism (< 75% threshold), view monthly heatmaps, audit attendance submission compliance by teachers, and export compliance reports.
9. **Entry Points**: Secondary tab in Attendance navigation; "View Full Report" link from Dashboards `TNT-DSH-01` or `TNT-DSH-04`.
10. **Navigation Placement**: Secondary link under "Attendance" -> "Reports".
11. **Required Permissions**: `attendance.read` (general); `attendance.export` (to download).
12. **Required Module Entitlement**: `attendance_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Summary Cards: Overall Institutional Attendance Rate (%), Total Working Days, Students Below 75% Attendance (Chronic Absenteeism Alert), Teacher Submission Compliance Rate (98.4%).
    - Attendance Trend Chart: Monthly/Weekly bar chart showing percentage trends over the academic session.
    - Class Breakdown Table: Class Name, Total Students, Present Days, Absent Days, Overall Class Average %, Low Attendance Count.
    - Defaulters List Widget: Students with attendance below 75% with parent contact links.
15. **Filters**: Date Range Picker (This Month, Last Term, Full Year), Grade & Section dropdown, Status threshold filter (e.g. "< 75% Attendance").
16. **Search**: Search individual student name in report.
17. **Sorting**: Sort classes or students by Attendance Percentage (Lowest First), Name, Roll No.
18. **Pagination**: Server-side pagination, 25 records per page.
19. **Primary Actions**: "Export Attendance Report" (XLSX/PDF, requires `attendance.export`).
20. **Secondary Actions**: "Send Absenteeism Warning Notice" (bulk SMS to guardians of chronic absentees).
21. **Bulk Actions**: "Send Warning SMS to Selected", "Export Selected".
22. **Row Actions**: Click student row to open monthly attendance calendar view modal (`TNT-STU-02`).
23. **Forms**: None directly on report view.
24. **Form Fields**: N/A.
25. **Validation Rules**: N/A.
26. **Confirmation Requirements**: Sending bulk absenteeism warnings requires confirmation prompt showing estimated SMS recipient count.
27. **Success Behavior**: Real-time chart rendering and instant filtered table updates.
28. **Error Behavior**: Banner alert if report aggregation query times out.
29. **Empty State**: "No attendance data recorded for the selected date range."
30. **Loading State**: KPI cards and report table skeleton loaders.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: KPI cards stack vertically; class breakdown converts to responsive summary cards; trend chart touch-scrollable.
34. **Tablet Behavior**: 2-column KPI grid with scrollable breakdown table.
35. **Desktop Behavior**: Full analytics dashboard with side-by-side trend charts and interactive defaulters roster.
36. **PWA Relevance**: `DESKTOP + MOBILE`.
37. **Accessibility Considerations**: Accessible charts with tabular data fallback; high contrast color coding (Green >= 85%, Yellow 75-84%, Red < 75%).
38. **Audit Requirements**: Report generation and data exports logged to `AuditLog`.
39. **Notification/Event Side Effects**: Bulk warning action dispatches SMS alerts to guardians.
40. **Dependencies on Other Screens/Modules**: Aggregates records created in `TNT-ATT-01`.
