# Detailed Screen Specifications: Communications & Events Suite

## Screen 37: TNT-ANN-01 — Announcements & Circulars Hub
1. **Screen ID**: `TNT-ANN-01`
2. **Screen Name**: Announcements & Circulars Hub
3. **Route**: `/tenant/announcements`
4. **Module**: Communications & Announcements (`communication_module`)
5. **Scope**: Institutional Scope for Admins / Assigned Scope for Teachers / Target Audience Scope for Students & Parents
6. **Primary User(s)**: Institution Admin, Principal (broadcasting); Teachers, Students, Parents (reading)
7. **Secondary User(s)**: Administrative Staff
8. **Purpose**: Official institutional notice board: publish and read school circulars, urgent emergency notices, holiday declarations, academic updates, and extracurricular announcements with audience targeting and file attachments.
9. **Entry Points**: Sidebar "Announcements" or "Notice Board"; dashboard widget links from `TNT-DSH-01`, `TNT-DSH-02`, `TNT-DSH-03`, `TNT-DSH-04`.
10. **Navigation Placement**: Primary link under "Communication" -> "Announcements" in institutional sidebar.
11. **Required Permissions**: `announcement.read` (to view); `announcement.create` (to author); `announcement.publish` (to broadcast); `announcement.delete` (to remove).
12. **Required Module Entitlement**: `communication_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**: Grid / Feed of Announcements: Title, Category Badge (`ACADEMIC`, `HOLIDAY`, `URGENT`, `EVENT`, `ADMINISTRATIVE`), Target Audience Chips (e.g., "All School", "Grade 10 Only", "Staff Only"), Author Name & Role, Publish Date & Time, Rich Text Body Content, Attached Document Links (PDF, images), Priority Flag (Normal vs Urgent/Sticky), Read Acknowledgment Count.
15. **Filters**: Category filter (`ALL`, `ACADEMIC`, `HOLIDAYS`, `URGENT`), Target Audience filter, Date Range.
16. **Search**: Search by Announcement Title or Content keywords.
17. **Sorting**: Sort by Publish Date (Newest first, with Urgent/Sticky announcements pinned to top).
18. **Pagination**: Server-side pagination, 10 announcements per page.
19. **Primary Actions**: "Create Announcement" (opens authoring drawer/modal, requires `announcement.create`).
20. **Secondary Actions**: "Filter Urgent Only", "Download Circular (PDF)".
21. **Bulk Actions**: For Admins: "Delete Selected", "Archive Selected".
22. **Row Actions**: "Read Full Notice" (opens modal), "Edit Announcement" (requires `announcement.update`), "Delete Notice" (requires `announcement.delete`).
23. **Forms**: "Create Announcement" Modal / Drawer Form.
24. **Form Fields**: Title (`string`, required), Category (`dropdown: ACADEMIC, HOLIDAY, URGENT, EVENT, GENERAL`), Target Audience (`radio: ENTIRE_INSTITUTION, SPECIFIC_ROLES, SPECIFIC_GRADES`), Roles Checklist (if selected: Staff, Students, Parents), Grades Checklist (if selected), Content Body (`rich text / markdown`, required), Attachments (`file upload: PDF, images, max 10MB`), Pin to Top / Urgent Banner (`checkbox`), Dispatch Push/SMS Notification (`checkbox`).
25. **Validation Rules**: Title must be at least 5 characters; body must be at least 15 characters; at least one target audience role or grade must be selected.
26. **Confirmation Requirements**: Broadcasting urgent circular with SMS dispatch prompts confirmation dialog: "Are you sure you want to broadcast this circular to 850 parents and staff via SMS?"
27. **Success Behavior**: Announcement published immediately; appears at top of circulars feed; toast: "Announcement published successfully."
28. **Error Behavior**: Banner error if publishing or notification dispatch encounters an error.
29. **Empty State**: "No announcements posted yet. Check back later for institutional updates."
30. **Loading State**: Circular cards skeleton loader with simulated text lines.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled if `communication_module` is unlicensed.
33. **Mobile Behavior**: Mobile feed layout; swipe to read full notice; attached PDFs open in in-app viewer.
34. **Tablet Behavior**: 2-column card grid.
35. **Desktop Behavior**: Full responsive newsfeed layout with category filter tabs and prominent authoring CTA.
36. **PWA Relevance**: `PWA-CRITICAL` (Parents and staff check school circulars on mobile devices).
37. **Accessibility Considerations**: Urgent circulars tagged with `aria-live="polite"`; category badges have distinct icons and high contrast.
38. **Audit Requirements**: Announcement creation, modifications, audience reach, and deletions logged to `AuditLog`.
39. **Notification/Event Side Effects**: Enqueues background BullMQ notification jobs: dispatches push notifications and optional SMS broadcasts.
40. **Dependencies on Other Screens/Modules**: Renders circulars displayed on all dashboards (`TNT-DSH-01` through `TNT-DSH-04`).

---

## Screen 38: TNT-EVT-01 — Institutional Calendar & Events
1. **Screen ID**: `TNT-EVT-01`
2. **Screen Name**: Institutional Calendar & Events
3. **Route**: `/tenant/events`
4. **Module**: Communications & Announcements (`communication_module`)
5. **Scope**: Institutional Scope for Admins / Target Audience Scope for Teachers, Students & Parents
6. **Primary User(s)**: Institution Admin, Principal (event scheduling); Teachers, Students, Parents (calendar viewing)
7. **Secondary User(s)**: Event Coordinators, Sports Directors
8. **Purpose**: Master institutional calendar: schedule academic milestones, term holidays, sports meets, parent-teacher conferences (PTM), annual functions, and exam dates in an interactive monthly, weekly, and agenda view.
9. **Entry Points**: Sidebar "Calendar" or "Events"; dashboard calendar widgets.
10. **Navigation Placement**: Primary link under "Communication" -> "Calendar" in institutional sidebar.
11. **Required Permissions**: `event.read` (to view); `event.create` (to schedule); `event.update` (to edit); `event.delete` (to remove).
12. **Required Module Entitlement**: `communication_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Calendar View: Interactive full-screen calendar grid (Month / Week / Day / Agenda view) with color-coded event chips (Blue: Academic, Red: Holiday/School Closed, Green: Sports/Cultural, Purple: Exams, Orange: Parent-Teacher Meeting).
    - Event Detail Popover / Modal: Event Title, Event Type Badge, Start Date & Time, End Date & Time, Location / Venue (e.g., School Auditorium), Target Audience, Description, RSVP / Attendance notes.
15. **Filters**: Event Type filter checkboxes (Holidays, Exams, Sports, Academic, Meetings), Target Grade filter.
16. **Search**: Search event titles in calendar view.
17. **Sorting**: Agenda view sorted chronologically.
18. **Pagination**: Calendar navigates by Month (Previous / Next / Today); Agenda view paginated 20 events per view.
19. **Primary Actions**: "Create Event / Holiday" (opens event modal, requires `event.create`).
20. **Secondary Actions**: "Export Calendar (iCal / Google Calendar Sync)", "Print Monthly Calendar PDF".
21. **Bulk Actions**: "Import Standard State/Board Holidays".
22. **Row Actions**: Click event badge to open details popover; "Edit Event" (requires `event.update`), "Delete Event" (requires `event.delete`).
23. **Forms**: "Create Institutional Event" Modal Form.
24. **Form Fields**: Event Title (`string`, required), Event Type (`dropdown: HOLIDAY, EXAM, ACADEMIC, SPORTS_CULTURE, PTM, GENERAL`), Start Date & Time (`datetime`, required), End Date & Time (`datetime`, required), All-Day Event (`checkbox`), School Closed (`checkbox`), Location / Venue (`string`, optional), Target Audience (`radio: ALL_SCHOOL, SPECIFIC_ROLES, SPECIFIC_GRADES`), Description (`textarea`).
25. **Validation Rules**: Start Date must be on or before End Date; School Closed events cannot conflict with active examination dates without administrative override.
26. **Confirmation Requirements**: Marking an event as "School Closed / Holiday" prompts confirmation: "This will mark all classes as off in the institutional timetable for the selected date(s)."
27. **Success Behavior**: Event chip appears immediately on calendar grid; toast confirms: "Event scheduled successfully."
28. **Error Behavior**: Date validation alerts; conflict warning banner.
29. **Empty State**: In agenda view: "No events scheduled for this month."
30. **Loading State**: Calendar grid skeleton loader with pulsing day blocks.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: HTTP 402 Module Disabled if `communication_module` is unlicensed.
33. **Mobile Behavior**: Defaults to touch-friendly Agenda / List view; month view supports swipe gestures between months; tap date to see day's event list below.
34. **Tablet Behavior**: Responsive monthly calendar grid.
35. **Desktop Behavior**: Full-width interactive month/week calendar view with click-to-add slot behavior.
36. **PWA Relevance**: `DESKTOP + MOBILE`.
37. **Accessibility Considerations**: Accessible calendar grid (`role="grid"`, `aria-label="Calendar for October 2026"`); day cells announce event counts to screen readers.
38. **Audit Requirements**: Event creation, edits, holiday declarations, and cancellations logged to `AuditLog`.
39. **Notification/Event Side Effects**: Creating a PTM or holiday event dispatches push notification reminders 24 hours prior to event start.
40. **Dependencies on Other Screens/Modules**: Integrates with `TNT-ACD-01` (Academic terms) and `TNT-EXM-01` (Exam dates).

---

## Screen 39: TNT-NOT-01 — Universal In-App Notification Center
1. **Screen ID**: `TNT-NOT-01`
2. **Screen Name**: Universal In-App Notification Center
3. **Route**: `/tenant/notifications`
4. **Module**: Communications & Announcements (`communication_module`)
5. **Scope**: Universal User Scope (`AccessScope.SELF_ONLY`)
6. **Primary User(s)**: All Users (Admins, Teachers, Students, Parents)
7. **Secondary User(s)**: Support operators
8. **Purpose**: Centralized notification drawer and full history page: inspect real-time alerts (attendance alerts, assignment deadlines, exam marks published, new circulars, fee reminders), mark alerts as read, and manage alert delivery channels.
9. **Entry Points**: Bell icon with unread badge count in top navigation header on all screens; mobile bottom nav notification icon; deep link from push notification.
10. **Navigation Placement**: Header utility icon on all screens; secondary full page at `/tenant/notifications`.
11. **Required Permissions**: Authenticated Session (Any verified active user in tenant).
12. **Required Module Entitlement**: `core_academics` (Universal notification capability).
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Header: "Notifications", Unread Count badge (e.g. "3 Unread"), "Mark All as Read" button, Settings gear icon.
    - Notification List: Event Icon (e.g., Attendance shield, Exam graduation cap, Assignment book, Circular horn), Notification Title, Message Snippet, Relative Timestamp (e.g., "5 mins ago", "Yesterday at 04:30 PM"), Read/Unread status indicator dot, Action Deep Link button (e.g., "View Homework", "View Report Card").
15. **Filters**: Filter tabs (`ALL`, `UNREAD`, `ACADEMIC`, `ATTENDANCE`, `ADMINISTRATIVE`).
16. **Search**: Search notifications by keyword.
17. **Sorting**: Strict reverse chronological order (Newest first).
18. **Pagination**: Infinite scroll / server-side pagination, 20 notifications per batch.
19. **Primary Actions**: "Mark All as Read", Click notification to navigate to related entity screen.
20. **Secondary Actions**: "Manage Notification Preferences" (routes to `ACC-03`), "Clear Read Notifications".
21. **Bulk Actions**: "Mark Selected as Read", "Delete Selected".
22. **Row Actions**: Click to open deep link; "Mark as Read / Unread", "Dismiss".
23. **Forms**: None directly on notification list.
24. **Form Fields**: N/A.
25. **Validation Rules**: N/A.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Unread dot disappears immediately; header unread counter decrements; target screen opens.
28. **Error Behavior**: Toast alert if marking read fails over network.
29. **Empty State**: "You are all caught up! No notifications to display." With friendly checkmark icon.
30. **Loading State**: Notification card skeleton loaders with simulated avatar and text rows.
31. **Forbidden State**: N/A (Accessible to all authenticated tenant users).
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Full-screen slide-over drawer or dedicated screen; pull-to-refresh gesture; swipe-to-dismiss notification rows.
34. **Tablet Behavior**: Dropdown popover from header or dedicated drawer.
35. **Desktop Behavior**: Header dropdown popover (first 6 items) with "View All Notifications" link opening full-page view.
36. **PWA Relevance**: `PWA-CRITICAL` (Receives Web Push notifications when app is closed; opens directly to target screen upon tap).
37. **Accessibility Considerations**: Live announcements via `aria-live="polite"` when new notification arrives; unread items have `aria-label="Unread notification: [Title]"`.
38. **Audit Requirements**: None for standard reads; bulk dismissals logged.
39. **Notification/Event Side Effects**: WebSocket / Server-Sent Events (SSE) updates unread badge counter in real time.
40. **Dependencies on Other Screens/Modules**: Receives events dispatched across all modules (`TNT-ATT-01`, `TNT-ASN-01`, `TNT-MRK-01`, `TNT-ANN-01`).
