# Detailed Screen Specifications: Staff & Teacher Management Suite

## Screen 19: TNT-STF-01 — Faculty Directory
1. **Screen ID**: `TNT-STF-01`
2. **Screen Name**: Faculty Directory
3. **Route**: `/tenant/teachers`
4. **Module**: Staff Management (`staff_directory`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE` for Admins) / Limited Scope for Peer Teachers
6. **Primary User(s)**: Institution Admin, Principal, HR Coordinator
7. **Secondary User(s)**: Teachers (peer contact lookup with masked PII)
8. **Purpose**: Search, filter, inspect, and manage faculty and instructional staff members; provision teacher accounts, assign subjects/grades, and monitor employment status.
9. **Entry Points**: Institutional Sidebar under "Faculty" or "Staff"; quick search header.
10. **Navigation Placement**: Primary link under "Staff" in institutional sidebar.
11. **Required Permissions**: `teacher.profile.read` (to view directory); `teacher.create` (to add); `teacher.export` (to export).
12. **Required Module Entitlement**: `staff_directory`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**: Table / Grid of Teachers: Photo/Avatar, Full Name, Staff ID/Code, Assigned Subjects (e.g., Mathematics, Physics), Assigned Classes/Sections (e.g., 10-A, 11-B), Contact Email (masked if peer viewer), Phone Number (masked if peer viewer), Status Badge (`ACTIVE`, `ON_LEAVE`, `INVITED`, `ARCHIVED`), Actions.
15. **Filters**: Status dropdown (`ALL`, `ACTIVE`, `ON_LEAVE`, `INVITED`), Department/Subject dropdown, Class assignment dropdown.
16. **Search**: Debounced search bar querying Teacher Name, Staff ID, or Subject.
17. **Sorting**: Sort by Full Name (A-Z), Staff ID, Date Joined.
18. **Pagination**: Server-side pagination, 20 records per page.
19. **Primary Actions**: "Add Faculty Member" (opens create drawer/form, requires `teacher.create`).
20. **Secondary Actions**: "Export Faculty Directory" (CSV/XLSX, requires `teacher.export`), "Import Faculty CSV" (bulk upload wizard).
21. **Bulk Actions**: "Export Selected", "Assign Subject", "Deactivate Selected".
22. **Row Actions**: "View Profile" (navigates to `TNT-STF-02`), "Edit Details" (requires `teacher.update`), "Resend Invite" (for pending invites), "Archive" (requires `teacher.delete`).
23. **Forms**: "Add Faculty Member" drawer/modal form.
24. **Form Fields**: Full Name (`string`, required), Staff Employee ID (`string`, required, unique in tenant), Official Email (`email`, required, unique in tenant), Mobile Number (`phone`, required), Gender (`dropdown: MALE, FEMALE, OTHER`), Date of Joining (`date`), Designation/Title (`string`), Primary Subjects (`multi-select dropdown`), Class Teacher Assignment (`dropdown: optional Grade-Section`), Address (`string`, optional), Blood Group (`dropdown`, optional).
25. **Validation Rules**: Staff Employee ID must be unique per tenant; Email must be valid format; Phone must be valid 10-digit Indian number; Date of joining cannot be in the future.
26. **Confirmation Requirements**: Archiving or deactivating a teacher prompts modal warning: "Are you sure you want to deactivate [Teacher Name]? Active class assignments will need reassignment."
27. **Success Behavior**: Toast: "Faculty member created and invitation dispatched." List refreshes optimistically.
28. **Error Behavior**: Duplicate staff ID or email shows field error alert; server mutation errors display banner.
29. **Empty State**: "No faculty members found. [Add Your First Teacher] or clear search filters."
30. **Loading State**: Table skeleton with 8 rows.
31. **Forbidden State**: HTTP 403 Forbidden with prompt to contact school administration.
32. **Module-Disabled State**: HTTP 402 Module Disabled if `staff_directory` is unlicensed.
33. **Mobile Behavior**: Table collapses to responsive contact card list with phone/email tap-to-call action buttons (for authorized roles).
34. **Tablet Behavior**: Scrollable table with sticky name column.
35. **Desktop Behavior**: Full data table with quick filters and bulk selection checkboxes.
36. **PWA Relevance**: `DESKTOP + MOBILE`.
37. **Accessibility Considerations**: Accessible table landmarks; screen readers announce status changes; keyboard navigable action menus.
38. **Audit Requirements**: Faculty creation, edits, and status changes logged to `AuditLog`.
39. **Notification/Event Side Effects**: Sends Clerk invitation email and SMS welcome link to new teacher.
40. **Dependencies on Other Screens/Modules**: Links to `TNT-STF-02`, references `TNT-CLS-01` and `TNT-SUB-01`.

---

## Screen 20: TNT-STF-02 — Staff Profile Detail
1. **Screen ID**: `TNT-STF-02`
2. **Screen Name**: Staff Profile Detail
3. **Route**: `/tenant/teachers/[id]`
4. **Module**: Staff Management (`staff_directory`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE`) for Admins / Self Scope (`AccessScope.SELF_ONLY`) for Teacher viewing own profile.
6. **Primary User(s)**: Institution Admin, HR Coordinator, Teacher (Self)
7. **Secondary User(s)**: Academic Supervisors
8. **Purpose**: Complete 360-degree personnel record for a faculty member: view personal details, assigned classes, subject curriculum workload, timetable schedule, and employment records.
9. **Entry Points**: Row click in `TNT-STF-01`, link in Timetable or Class roster, "My Profile" link for teacher.
10. **Navigation Placement**: Child view of Faculty Directory.
11. **Required Permissions**: `teacher.profile.read` (Admin/Teacher-Self); `teacher.update` (to edit).
12. **Required Module Entitlement**: `staff_directory`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Header: Teacher Avatar, Full Name, Designation, Staff ID, Status Badge, Quick Actions (Edit Profile, Change Password, Resend Invite).
    - Tab 1: Personal & Contact Info (Email, Phone, Date of Birth, Emergency Contact, Address, Blood Group). Note: Aadhaar/National ID strictly masked unless caller has `sensitive_data.read`.
    - Tab 2: Academic Assignments (Assigned Subjects, Assigned Classes, Class Teacher responsibility).
    - Tab 3: Weekly Timetable (Teacher's personal schedule grid across periods and weekdays).
    - Tab 4: Performance & Activity (Classes taught, attendance marking compliance rate).
15. **Filters**: Academic Year selector for schedule/assignments.
16. **Search**: None within profile.
17. **Sorting**: Timetable ordered by period.
18. **Pagination**: Activity history paginated 10 per page.
19. **Primary Actions**: "Edit Profile" (opens edit drawer, requires `teacher.update`).
20. **Secondary Actions**: "Assign to Class", "Reset Password / Send Link", "Print Profile PDF".
21. **Bulk Actions**: None.
22. **Row Actions**: In Assignments tab: "Remove Assignment".
23. **Forms**: Edit Staff Profile Form.
24. **Form Fields**: Full Name, Phone, Address, Emergency Contact Person, Emergency Contact Phone, Qualifications / Degrees, Experience (Years).
25. **Validation Rules**: Phone numbers must be valid 10 digits; emergency phone cannot match personal phone.
26. **Confirmation Requirements**: Saving changes requires confirmation if changing class teacher assignment.
27. **Success Behavior**: Toast: "Profile updated successfully." Changes reflected immediately.
28. **Error Behavior**: Inline field error highlighting.
29. **Empty State**: N/A (Detail view).
30. **Loading State**: Profile header and tab shimmer skeletons.
31. **Forbidden State**: HTTP 403 Forbidden (preventing teachers from inspecting arbitrary peer full PII).
32. **Module-Disabled State**: HTTP 402 Module Disabled.
33. **Mobile Behavior**: Tabs collapse into horizontal scroll menu; contact actions (Call, Email) prominent at top.
34. **Tablet Behavior**: 2-column layout (left: profile summary card; right: tabbed details).
35. **Desktop Behavior**: Full-width container with sticky header and responsive tab panels.
36. **PWA Relevance**: `DESKTOP + MOBILE`.
37. **Accessibility Considerations**: ARIA tab navigation; phone and email links use semantic `tel:` and `mailto:`.
38. **Audit Requirements**: Profile updates and sensitive data views logged in `AuditLog`.
39. **Notification/Event Side Effects**: If profile contact info is updated, confirmation notification sent to staff member's email.
40. **Dependencies on Other Screens/Modules**: Depends on `TNT-CLS-01`, `TNT-SUB-01`, `TNT-TBL-01`.
