# Detailed Screen Specifications: Tenant Institutional Dashboards

## Screen 15: TNT-DSH-01 — School Administrator Dashboard
1. **Screen ID**: `TNT-DSH-01`
2. **Screen Name**: School Administrator Dashboard
3. **Route**: `/tenant/dashboard` (rendered dynamically when user possesses `dashboard.admin.read`)
4. **Module**: Institutional Core (`core_academics`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE`)
6. **Primary User(s)**: Institution Owner, Principal, Vice Principal, Academic Dean
7. **Secondary User(s)**: Administrative Coordinators
8. **Purpose**: Executive control center providing school leadership with live operational metrics on daily attendance, student enrollment, faculty status, academic calendar milestones, pending approvals, and institutional alerts.
9. **Entry Points**: Post-login landing for Institution Administrators; main logo or "Dashboard" link in institutional sidebar.
10. **Navigation Placement**: First item in Institutional Sidebar ("Dashboard").
11. **Required Permissions**: `dashboard.admin.read`
12. **Required Module Entitlement**: `core_academics`
13. **Required Tenant Context**: Mandatory verified `tenantId` (e.g., from subdomain or verified path).
14. **Data Displayed**: 
    - Top Stat Cards: Total Students Enrolled, Total Active Teachers, Today's Overall Attendance Percentage, Active Classes/Sections Count.
    - Attendance Overview Chart: Daily attendance trend bar chart (Boys vs Girls vs Total) over the past 14 days.
    - Class-wise Attendance Widget: Horizontal progress bars showing attendance rate per grade (e.g., Grade 10: 96%, Grade 9: 91%).
    - Action Required / Pending Approvals Card: Count of pending leave requests, attendance corrections, and draft report cards awaiting sign-off.
    - Upcoming Institutional Events: Next 5 calendar events/exams scheduled.
    - Recent Announcements: Latest 3 school-wide announcements with author and timestamp.
15. **Filters**: Academic Year dropdown selector in header (defaults to active academic year).
16. **Search**: Universal institutional quick-search in top header (Command+K bar).
17. **Sorting**: N/A (Dashboard widgets).
18. **Pagination**: Recent announcements/events show max 5 items with "View All" links.
19. **Primary Actions**: "Mark Today's Attendance" (routes to `TNT-ATT-01`), "Create Announcement" (routes to `TNT-ANN-01`).
20. **Secondary Actions**: "View Full Attendance Report", "Manage Students".
21. **Bulk Actions**: None.
22. **Row Actions**: Click pending approval row to open approval modal.
23. **Forms**: None directly on dashboard.
24. **Form Fields**: N/A.
25. **Validation Rules**: N/A.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Smooth animated metric card loading; real-time attendance figures update automatically.
28. **Error Behavior**: Failed widgets display error placeholder with retry button without crashing sibling widgets.
29. **Empty State**: For new school: "Welcome to SchoolyardSMS! Start by setting up Academic Years and enrolling your faculty and students." Displays onboarding checklist.
30. **Loading State**: Shimmer skeleton blocks for stat cards and charts.
31. **Forbidden State**: Renders `403 Forbidden` if caller lacks `dashboard.admin.read`.
32. **Module-Disabled State**: `402 Payment Required` if institution account is expired/disabled.
33. **Mobile Behavior**: Metric cards scroll horizontally or stack; charts optimized for touch tooltips.
34. **Tablet Behavior**: 2x2 grid for metrics; stacked chart widgets.
35. **Desktop Behavior**: 4-column KPI row, 2-column middle section (Attendance Chart + Pending Approvals), 2-column bottom section (Events + Announcements).
36. **PWA Relevance**: `DESKTOP + MOBILE` (High utility for principals checking status on mobile).
37. **Accessibility Considerations**: All metric cards have descriptive screen reader text; charts include accessible data summary tables toggled via keyboard.
38. **Audit Requirements**: Dashboard access logged to tenant activity log.
39. **Notification/Event Side Effects**: None on view.
40. **Dependencies on Other Screens/Modules**: Aggregates data from `TNT-ATT-01`, `TNT-STU-01`, `TNT-STF-01`, `TNT-EVT-01`, `TNT-ANN-01`.

---

## Screen 16: TNT-DSH-02 — Teacher / Faculty Dashboard
1. **Screen ID**: `TNT-DSH-02`
2. **Screen Name**: Teacher / Faculty Dashboard
3. **Route**: `/tenant/dashboard` (rendered dynamically when user possesses `dashboard.teacher.read`)
4. **Module**: Staff Experience (`core_academics`)
5. **Scope**: Assigned Classes Scope (`AccessScope.ASSIGNED_ONLY`)
6. **Primary User(s)**: Classroom Teachers, Subject Teachers, Faculty Members
7. **Secondary User(s)**: Substitute Teachers
8. **Purpose**: Daily instructional operational hub for educators: view today's class schedule, single-tap access to mark class attendance, pending homework grading, upcoming subject exams, and class announcements.
9. **Entry Points**: Post-login landing for Teachers; main logo / "Dashboard" link in sidebar.
10. **Navigation Placement**: Top item in Teacher Sidebar.
11. **Required Permissions**: `dashboard.teacher.read`
12. **Required Module Entitlement**: `core_academics`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Greeting & Today's Schedule Card: "Good morning, Teacher Sharma! You have 4 classes scheduled today."
    - Active / Next Class Banner: Highlights currently running or upcoming period (e.g., "Period 3: Mathematics — Grade 10-A (11:00 AM – 11:45 AM, Room 204)") with primary button "Mark Attendance".
    - Today's Timetable Timeline: Chronological timeline of periods for today.
    - My Classes Card: Grid of classes assigned to this teacher with student counts.
    - Pending Submissions & Grading: Count of ungraded assignment submissions.
    - Class Notices / Announcements: School circulars affecting staff.
15. **Filters**: Day selector for timetable (Monday through Saturday, defaults to today).
16. **Search**: None on dashboard.
17. **Sorting**: Timetable periods ordered chronologically.
18. **Pagination**: None.
19. **Primary Actions**: "Mark Attendance for Class [X]" (one-tap route to `TNT-ATT-01` with class pre-selected).
20. **Secondary Actions**: "Create Assignment" (routes to `TNT-ASN-01`), "Enter Marks" (routes to `TNT-MRK-01`).
21. **Bulk Actions**: None.
22. **Row Actions**: Click timeline period to view lesson plan / class roster.
23. **Forms**: None.
24. **Form Fields**: N/A.
25. **Validation Rules**: N/A.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Timetable highlights active current period in real-time based on local device clock.
28. **Error Behavior**: Graceful widget fallback if timetable service fails.
29. **Empty State**: "No classes scheduled for today. Enjoy your day off!"
30. **Loading State**: Timetable timeline skeleton with 4 period card placeholders.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Sticky "Mark Attendance" quick-action button; timeline optimized for vertical thumb-scroll; bottom navigation bar enabled.
34. **Tablet Behavior**: Side-by-side schedule and pending tasks widgets.
35. **Desktop Behavior**: Full instructional view with right sidebar for calendar and staff announcements.
36. **PWA Relevance**: `PWA-CRITICAL` (Primary screen used by teachers daily in classrooms on mobile phones).
37. **Accessibility Considerations**: Live schedule updates announce current period; high-contrast schedule badges.
38. **Audit Requirements**: Access logged to tenant session log.
39. **Notification/Event Side Effects**: None.
40. **Dependencies on Other Screens/Modules**: Deep links to `TNT-ATT-01`, `TNT-TBL-02`, `TNT-ASN-01`, `TNT-MRK-01`.

---

## Screen 17: TNT-DSH-03 — Student Academic Dashboard
1. **Screen ID**: `TNT-DSH-03`
2. **Screen Name**: Student Academic Dashboard
3. **Route**: `/tenant/dashboard` (rendered dynamically when user possesses `dashboard.student.read`)
4. **Module**: Student Experience (`core_academics`)
5. **Scope**: Self Scope (`AccessScope.SELF_ONLY`)
6. **Primary User(s)**: Enrolled Students
7. **Secondary User(s)**: Academic Counselors
8. **Purpose**: Personal learning and school life portal for students: check daily class schedule, track personal attendance percentage, review pending homework assignments with due dates, view upcoming exam schedules, and read school announcements.
9. **Entry Points**: Post-login landing for Students.
10. **Navigation Placement**: Top item in Student Sidebar / Mobile Bottom Nav.
11. **Required Permissions**: `dashboard.student.read`
12. **Required Module Entitlement**: `core_academics`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Student Profile Card: Student Photo, Full Name, Grade & Section, Roll No, Active Academic Year.
    - Attendance Summary Gauge: Semi-circle progress donut showing student's overall attendance (e.g., 92.4% — "Good standing (Above 75% CBSE requirement)").
    - Today's Classes: Cards showing subjects, periods, teacher names, and room numbers.
    - Pending Assignments Card: List of homework due within 48 hours with status pills (`DRAFT`, `SUBMITTED`, `PENDING`).
    - Upcoming Examinations: Countdown cards to next scheduled exam.
    - School Announcements Feed: Circulars applicable to student's grade.
15. **Filters**: Assignment filter (Pending vs Completed).
16. **Search**: None.
17. **Sorting**: Assignments sorted by Due Date (soonest first).
18. **Pagination**: Max 4 pending assignments displayed with link to `TNT-ASN-01`.
19. **Primary Actions**: "Submit Assignment" (routes to `TNT-ASN-01`), "View Full Timetable" (routes to `TNT-TBL-02`).
20. **Secondary Actions**: "View Report Card" (routes to `TNT-MRK-02`).
21. **Bulk Actions**: None.
22. **Row Actions**: Click assignment row to open submission view.
23. **Forms**: None.
24. **Form Fields**: N/A.
25. **Validation Rules**: N/A.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Real-time display of personal academic milestones.
28. **Error Behavior**: Inline error card if student profile or attendance data fails to resolve.
29. **Empty State**: For assignments: "Awesome! You have no pending homework assignments."
30. **Loading State**: Profile header and class card skeletons.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Mobile-first card stream; thumb-friendly assignment cards; bottom navigation bar with icons (Home, Timetable, Homework, Notices).
34. **Tablet Behavior**: 2-column layout.
35. **Desktop Behavior**: Centered container with 3-column widget layout.
36. **PWA Relevance**: `PWA-CRITICAL` (Installed as mobile PWA on student/family mobile devices).
37. **Accessibility Considerations**: Accessible SVG attendance gauge with `aria-label="Attendance 92.4%"`; clear color indicators for assignment urgency.
38. **Audit Requirements**: Student session access logged.
39. **Notification/Event Side Effects**: None.
40. **Dependencies on Other Screens/Modules**: Depends on `TNT-ATT-02`, `TNT-TBL-02`, `TNT-ASN-01`, `TNT-MRK-02`.

---

## Screen 18: TNT-DSH-04 — Parent Family Dashboard
1. **Screen ID**: `TNT-DSH-04`
2. **Screen Name**: Parent Family Dashboard
3. **Route**: `/tenant/dashboard` (rendered dynamically when user possesses `dashboard.parent.read`)
4. **Module**: Parent Experience (`core_academics`)
5. **Scope**: Linked Children Scope (`AccessScope.LINKED_CHILDREN`)
6. **Primary User(s)**: Parents, Guardians
7. **Secondary User(s)**: School Family Liaison Officers
8. **Purpose**: Dedicated multi-child family portal for parents: monitor linked children's daily school attendance, academic progress, pending assignments, teacher circulars, and event calendar from a single unified screen.
9. **Entry Points**: Post-login landing for Parents/Guardians.
10. **Navigation Placement**: Top item in Parent Sidebar / Mobile Bottom Nav.
11. **Required Permissions**: `dashboard.parent.read`
12. **Required Module Entitlement**: `core_academics`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Linked Child Switcher: Horizontal pill selector at top (e.g., "Aarav Sharma — Grade 10-A" | "Ananya Sharma — Grade 6-B") allowing instant switching between children.
    - Child Overview Card: Photo, Grade, Class Teacher Name, Emergency Contact.
    - Today's Attendance Status Banner: Immediate reassurance badge: "Present Today (Marked at 08:15 AM)" or "Absent Today (Alert sent to guardian)".
    - Academic Progress Snippet: Latest test marks and grade averages.
    - Homework Due Tracker: Upcoming assignment deadlines for selected child.
    - School Announcements & Circulars: Official notifications from school principal or class teacher.
15. **Filters**: Selected Child Selector (switches active child context).
16. **Search**: None.
17. **Sorting**: Chronological for announcements and assignments.
18. **Pagination**: Max 3 recent notices with "View All" link.
19. **Primary Actions**: "View Report Card" (routes to `TNT-MRK-02`), "View Detailed Attendance History" (routes to `TNT-ATT-02`).
20. **Secondary Actions**: "Switch Child", "Contact Class Teacher".
21. **Bulk Actions**: None.
22. **Row Actions**: Click circular to expand details.
23. **Forms**: None directly on dashboard.
24. **Form Fields**: N/A.
25. **Validation Rules**: N/A.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Switching child instantly updates all widgets with selected child's data via client cache or quick server action without full page reload.
28. **Error Behavior**: If parent has no verified linked children, render Empty State.
29. **Empty State**: "No children currently linked to your guardian account. Please contact your school administration with your registered mobile number to link your child."
30. **Loading State**: Child switcher skeleton and profile card shimmer.
31. **Forbidden State**: Renders `403 Forbidden` if parent attempts to pass an unlinked student ID.
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Mobile-first design; sticky child switcher at top of mobile screen; large touch buttons; prominent attendance status badge.
34. **Tablet Behavior**: Side-by-side child overview and notices.
35. **Desktop Behavior**: Centered responsive dashboard layout.
36. **PWA Relevance**: `PWA-CRITICAL` (Primary interface for school communication to parent smartphone PWA).
37. **Accessibility Considerations**: Child switcher uses radio group semantics (`role="radiogroup"`); high contrast for attendance status badges (green for Present, red for Absent).
38. **Audit Requirements**: Parent portal access logged with active child ID.
39. **Notification/Event Side Effects**: None on view.
40. **Dependencies on Other Screens/Modules**: Depends on student-parent bindings in `TNT-PAR-01`, links to `TNT-ATT-02`, `TNT-MRK-02`, `TNT-ANN-01`.
