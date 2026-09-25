# Detailed Screen Specifications: Universal Account & Security Suite

## Screen 41: ACC-01 — Universal User Profile
1. **Screen ID**: `ACC-01`
2. **Screen Name**: Universal User Profile
3. **Route**: `/account/profile`
4. **Module**: Universal Account (`account_suite`)
5. **Scope**: Universal User Scope (`AccessScope.SELF_ONLY`)
6. **Primary User(s)**: All Users (Super Admins, Institution Admins, Teachers, Students, Parents)
7. **Secondary User(s)**: Support operators assisting with identity queries
8. **Purpose**: Personal user profile management: view identity details, update preferred display name, upload personal profile avatar, verify email and phone number, and review active institutional memberships.
9. **Entry Points**: User avatar dropdown in top header on all screens -> "My Profile"; profile link on personal dashboards.
10. **Navigation Placement**: Accessible via top-right user menu across all screens; bottom settings tab on mobile PWA.
11. **Required Permissions**: Authenticated Session (Any verified active user).
12. **Required Module Entitlement**: None (Universal platform capability).
13. **Required Tenant Context**: Optional (shows active tenant context if accessed within tenant workspace).
14. **Data Displayed**: Profile Avatar, Full Name, Username, Primary Email (with `VERIFIED` green badge), Mobile Phone (with `VERIFIED` badge), Active Institutional Memberships list (School Name, Role, Status), Preferred Language (English, Hindi, etc.), Interface Theme toggle (System / Light / Dark).
15. **Filters**: None.
16. **Search**: None.
17. **Sorting**: Memberships sorted with active school first.
18. **Pagination**: N/A.
19. **Primary Actions**: "Save Profile Changes" (updates personal display info).
20. **Secondary Actions**: "Change Avatar / Upload Photo", "Switch Active School" (routes to `ACC-04`), "Manage Security" (routes to `ACC-02`).
21. **Bulk Actions**: None.
22. **Row Actions**: In Memberships list: "Switch to this Institution".
23. **Forms**: Personal Profile Form.
24. **Form Fields**: First Name (`string`, required), Last Name (`string`, required), Display Name (`string`), Preferred Language (`dropdown`), Avatar File (`image upload: JPG, PNG, WebP, max 2MB`).
25. **Validation Rules**: First and last name cannot be empty; avatar image must be <= 2MB and square aspect ratio.
26. **Confirmation Requirements**: None for profile info; changing email/phone delegates to Clerk verification modal.
27. **Success Behavior**: Toast: "Profile updated successfully." Avatar and name update instantly in the application header.
28. **Error Behavior**: Field validation alerts; image size error prompt.
29. **Empty State**: N/A.
30. **Loading State**: Profile header and form input shimmer skeleton loaders.
31. **Forbidden State**: N/A (Always accessible to authenticated users).
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Single-column vertical layout; prominent avatar upload button with camera integration.
34. **Tablet Behavior**: Centered container with side-by-side profile and membership cards.
35. **Desktop Behavior**: 2-column layout (left: user overview card & active memberships; right: profile editing form).
36. **PWA Relevance**: `DESKTOP + MOBILE`.
37. **Accessibility Considerations**: Accessible image upload with file selection feedback; clear label-input associations; high contrast verification badges.
38. **Audit Requirements**: Profile updates and avatar changes logged to user audit trail.
39. **Notification/Event Side Effects**: Updates synchronized to Clerk identity and PostgreSQL `User` record.
40. **Dependencies on Other Screens/Modules**: Links to `ACC-02`, `ACC-03`, `ACC-04`.

---

## Screen 42: ACC-02 — Security & Password Settings
1. **Screen ID**: `ACC-02`
2. **Screen Name**: Security & Password Settings
3. **Route**: `/account/security`
4. **Module**: Universal Account (`account_suite`)
5. **Scope**: Universal User Scope (`AccessScope.SELF_ONLY`)
6. **Primary User(s)**: All Users (Admins, Teachers, Students, Parents)
7. **Secondary User(s)**: None
8. **Purpose**: Manage account credentials and authentication security: update account password, configure Multi-Factor Authentication (Authenticator App / SMS 2FA), view active login sessions, and revoke unrecognized devices.
9. **Entry Points**: "Security Settings" link in user menu or sidebar within account settings.
10. **Navigation Placement**: Secondary link under Account settings.
11. **Required Permissions**: Authenticated Session (Any verified active user).
12. **Required Module Entitlement**: None.
13. **Required Tenant Context**: Optional.
14. **Data Displayed**:
    - Password Section: "Change Password" form (Current Password, New Password, Confirm New Password).
    - Multi-Factor Authentication (MFA) Section: Current MFA Status (`DISABLED` or `ENABLED`), Setup Authenticator App (TOTP) button, Setup SMS 2FA button, Recovery Codes generator.
    - Active Sessions List: Current Device (Browser, OS, IP Address, Location, "Active Now" badge), Other Logged-in Devices list with timestamps and "Revoke Session" buttons.
15. **Filters**: None.
16. **Search**: None.
17. **Sorting**: Sessions sorted by last active time (Newest first).
18. **Pagination**: N/A.
19. **Primary Actions**: "Update Password", "Enable Two-Factor Authentication".
20. **Secondary Actions**: "Log Out of All Other Devices", "Download Backup Recovery Codes".
21. **Bulk Actions**: "Revoke All Other Sessions".
22. **Row Actions**: In Sessions list: "Revoke Session".
23. **Forms**: Change Password Form / MFA Setup Modal.
24. **Form Fields**: Current Password (`password`, required), New Password (`password`, required), Confirm New Password (`password`, required). In MFA modal: TOTP 6-digit verification code.
25. **Validation Rules**: Current password must be verified by Clerk; new password must meet complexity requirements (min 8 chars, mixed case, number, symbol) and cannot match current password; passwords must match.
26. **Confirmation Requirements**: "Log Out of All Other Devices" prompts confirmation dialog: "Are you sure? This will terminate all active sessions on other browsers, tablets, and mobile phones."
27. **Success Behavior**: Toast: "Password updated successfully" or "Two-Factor Authentication enabled."
28. **Error Behavior**: Incorrect current password displays error: "Your current password was incorrect."
29. **Empty State**: In other sessions list: "No other active sessions detected."
30. **Loading State**: Form buttons show loading spinner during credential verification.
31. **Forbidden State**: N/A.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Vertically stacked security sections; password show/hide eye toggle button.
34. **Tablet Behavior**: Centered modal card layout.
35. **Desktop Behavior**: Structured security management console with separate cards for Credentials, MFA, and Devices.
36. **PWA Relevance**: `DESKTOP + MOBILE`.
37. **Accessibility Considerations**: Accessible password reveal buttons with `aria-pressed`; MFA QR code includes accessible alphanumeric secret key text alternative.
38. **Audit Requirements**: Password changes, MFA enablement/disablement, and session revocations strictly logged in `AuditLog`.
39. **Notification/Event Side Effects**: Dispatches security alert email to user whenever password is changed or MFA status is modified.
40. **Dependencies on Other Screens/Modules**: Delegates to Clerk Identity SDK for credential mutations.

---

## Screen 43: ACC-03 — Notification Delivery Preferences
1. **Screen ID**: `ACC-03`
2. **Screen Name**: Notification Delivery Preferences
3. **Route**: `/account/notifications`
4. **Module**: Universal Account (`account_suite`)
5. **Scope**: Universal User Scope (`AccessScope.SELF_ONLY`)
6. **Primary User(s)**: All Users (Admins, Teachers, Students, Parents)
7. **Secondary User(s)**: None
8. **Purpose**: Configure multi-channel notification delivery rules: toggle which event categories (attendance alerts, homework updates, exam results, school circulars) are delivered via In-App notifications, Web Push, SMS, or Email.
9. **Entry Points**: "Notification Preferences" link in notification center `TNT-NOT-01` or user settings.
10. **Navigation Placement**: Secondary link under Account settings.
11. **Required Permissions**: Authenticated Session.
12. **Required Module Entitlement**: None.
13. **Required Tenant Context**: Optional (preferences can be institutional or global).
14. **Data Displayed**: Matrix Table of Notification Categories x Channels:
    - Rows: Attendance Alerts (Absent/Late alerts), Academic & Homework (New assignment, due date reminder), Examinations & Results (Exam schedule, marks published), Official Circulars & Notices (School emergency alerts, holiday notices), General Reminders.
    - Columns: In-App Push (`switch`), Mobile SMS (`switch`, Note: Emergency/Absence SMS may be locked to ON by institutional policy), Email (`switch`).
15. **Filters**: None.
16. **Search**: None.
17. **Sorting**: Categories grouped by operational domain.
18. **Pagination**: N/A.
19. **Primary Actions**: "Save Preferences" (auto-saves on toggle switch or manual button).
20. **Secondary Actions**: "Enable Browser Push Notifications" (prompts browser Notification permission dialog), "Restore Default Preferences".
21. **Bulk Actions**: "Turn All Email Notifications Off".
22. **Row Actions**: Toggle individual channel switch.
23. **Forms**: Notification Channel Settings Matrix.
24. **Form Fields**: Array of category-channel booleans: `attendance_sms`, `attendance_email`, `attendance_push`, `homework_push`, etc.
25. **Validation Rules**: Critical institutional safety alerts (e.g. Student Absence Alerts for parents) cannot be disabled by the user if school policy mandates guardian notification.
26. **Confirmation Requirements**: None (instant toggle save).
27. **Success Behavior**: Toast: "Notification preferences updated."
28. **Error Behavior**: Toast alert if preference save fails over network.
29. **Empty State**: N/A.
30. **Loading State**: Toggle switch loading skeleton.
31. **Forbidden State**: N/A.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Mobile-optimized category cards with clean toggle switches.
34. **Tablet Behavior**: Matrix table layout.
35. **Desktop Behavior**: Full-width matrix table with descriptive explanations for each category.
36. **PWA Relevance**: `PWA-CRITICAL` (Controls Web Push notification subscriptions and browser service worker tokens).
37. **Accessibility Considerations**: Accessible toggle switches with `role="switch"`, `aria-checked="true/false"`, and explicit labels ("Receive Attendance Alerts via SMS").
38. **Audit Requirements**: Notification preference changes recorded in user preference store.
39. **Notification/Event Side Effects**: Registers or unregisters Web Push FCM / VAPID endpoint tokens.
40. **Dependencies on Other Screens/Modules**: Directly controls event dispatch in `TNT-NOT-01` and background BullMQ notification dispatchers.

---

## Screen 44: ACC-04 — Multi-Tenant Switcher
1. **Screen ID**: `ACC-04`
2. **Screen Name**: Multi-Tenant Switcher
3. **Route**: `/account/switch-school` (or top header tenant switcher dropdown)
4. **Module**: Universal Account (`account_suite`)
5. **Scope**: Universal User Scope (`AccessScope.SELF_ONLY`)
6. **Primary User(s)**: Users belonging to multiple institutions (e.g., a teacher teaching at two branch campuses; a parent with children in two different schools; an educational consultant or multi-branch administrator)
7. **Secondary User(s)**: Support technicians
8. **Purpose**: Seamless, secure context switching between multiple educational institutions without logging out: display all active verified `TenantMembership` records, select an active tenant, issue an updated institutional tenant context session, and redirect to the target institution workspace.
9. **Entry Points**: "Switch School" link in user header; tenant badge click in top navbar; automatic redirect during login if user has > 1 active institutional memberships.
10. **Navigation Placement**: Header utility dropdown on all screens; dedicated route at `/account/switch-school`.
11. **Required Permissions**: Authenticated Session with >= 2 active `TenantMembership` bindings.
12. **Required Module Entitlement**: None.
13. **Required Tenant Context**: Transition boundary (switches active `tenantId`).
14. **Data Displayed**: List of School Cards: School Crest/Logo, Legal Institution Name, Campus / Branch Location, Subdomain URL, Assigned Role in this School (e.g. "Class Teacher" at Greenwood High; "Parent" at St. Xavier's), Active Session indicator badge ("Current School"), "Switch to this School" CTA button.
15. **Filters**: None.
16. **Search**: Search institution by name if user belongs to > 5 branches.
17. **Sorting**: Active institution listed first; others sorted alphabetically by school name.
18. **Pagination**: N/A (Users rarely belong to more than 5–10 schools).
19. **Primary Actions**: "Switch to this School" button on target institution card.
20. **Secondary Actions**: "Join Another School" (routes to invite code redemption `AUT-02`).
21. **Bulk Actions**: None.
22. **Row Actions**: Click school card to switch tenant context.
23. **Forms**: None.
24. **Form Fields**: N/A.
25. **Validation Rules**: Target tenant must exist and be in `ACTIVE` status; user's `TenantMembership` in target tenant must be in `ACTIVE` status.
26. **Confirmation Requirements**: None (Instant context switch).
27. **Success Behavior**: Session cookie / tenant context claim re-issued; client cache invalidated; user redirected to target tenant workspace (`https://[subdomain].schoolyardsms.in/tenant/dashboard` or `/tenant/dashboard`).
28. **Error Behavior**: If target tenant is suspended, displays error modal: "This institution is currently suspended. You cannot access this workspace."
29. **Empty State**: For single-school user: "You currently belong to one institution: [School Name]." With link back to dashboard.
30. **Loading State**: School cards skeleton loader; full-screen smooth transition spinner during context switch ("Switching to [School Name]...").
31. **Forbidden State**: Renders `403 Forbidden` if user attempts to switch to a `tenantId` they do not possess an active membership for.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Mobile card stream with large touch targets; sticky top back button.
34. **Tablet Behavior**: 2-column card grid.
35. **Desktop Behavior**: Centered responsive modal or card grid with school crests and role badges.
36. **PWA Relevance**: `DESKTOP + MOBILE`.
37. **Accessibility Considerations**: Accessible card buttons with clear screen reader announcements ("Switch active workspace to Greenwood High as Class Teacher"); keyboard focus management.
38. **Audit Requirements**: Every tenant context switch is recorded in `AuditLog` (`action: TENANT_CONTEXT_SWITCHED`, `fromTenantId`, `toTenantId`, `userId`).
39. **Notification/Event Side Effects**: Updates active tenant preferences in PostgreSQL `User` record.
40. **Dependencies on Other Screens/Modules**: Interacts directly with PostgreSQL `TenantMembership` table and triggers workspace reload across all tenant screens.
