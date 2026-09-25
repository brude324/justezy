# Detailed Screen Specifications: Platform SaaS Control Plane

## Screen 8: PLT-01 — SaaS Executive Overview
1. **Screen ID**: `PLT-01`
2. **Screen Name**: SaaS Executive Overview
3. **Route**: `/platform/dashboard`
4. **Module**: Platform Control Plane (`platform_core`)
5. **Scope**: Global Platform Scope (`PlatformScope.GLOBAL`)
6. **Primary User(s)**: SaaS Super Admin, SaaS Operations Lead
7. **Secondary User(s)**: Platform Financial & Security Auditors
8. **Purpose**: Provide SaaS leadership with real-time operational visibility into institutional tenant counts, active student strength, recurring subscription health, system throughput, and infrastructure alerts.
9. **Entry Points**: Post-login redirect for Platform Super Admins; primary sidebar link.
10. **Navigation Placement**: Top item in Platform Admin Sidebar under "Overview".
11. **Required Permissions**: `platform.dashboard.read`
12. **Required Module Entitlement**: `platform_core`
13. **Required Tenant Context**: None (operates globally across all tenants).
14. **Data Displayed**: 
    - Top Metric KPI Cards: Total Active Tenants, Total Enrolled Students across platform, Active Faculty Members, Monthly Recurring Revenue (MRR in INR), Platform Uptime (99.98%).
    - Growth Chart: Institutional Onboarding trend over 12 months.
    - Tenant Distribution by Plan: Donut chart (Starter, Academic Pro, Enterprise).
    - Recent Provisioning Activity Feed: Last 5 onboarded tenants with status badges.
    - Critical System Alerts: Database connection pool utilization, Redis queue lag, failed Clerk webhook syncs.
15. **Filters**: Date range selector (Last 7 Days, Last 30 Days, Year-to-Date, All Time).
16. **Search**: Quick tenant finder dropdown in header.
17. **Sorting**: N/A (Dashboard widgets).
18. **Pagination**: Recent activity feed paginated to 5 items with "View All" link to `PLT-02`.
19. **Primary Actions**: "Provision New Tenant" (button navigating to `PLT-03`).
20. **Secondary Actions**: "Export Platform Summary Report" (PDF/CSV), "System Health Details".
21. **Bulk Actions**: None.
22. **Row Actions**: Click activity row to navigate to `PLT-04`.
23. **Forms**: None on dashboard page.
24. **Form Fields**: N/A.
25. **Validation Rules**: N/A.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Live widgets render with smooth CSS entrance animations.
28. **Error Behavior**: Individual widget error boundaries display "Failed to load metric" with retry icon without crashing the whole dashboard.
29. **Empty State**: Zero-tenants state: "No institutions onboarded yet. Click 'Provision New Tenant' to start."
30. **Loading State**: Pulse skeletons for all 4 metric cards and 2 chart containers.
31. **Forbidden State**: Renders full-page 403 Forbidden: "Platform Admin clearance required. Your identity does not possess global administrative privileges."
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Metric cards stack into 1-column layout; charts convert to scrollable SVG cards.
34. **Tablet Behavior**: 2-column grid of KPI cards.
35. **Desktop Behavior**: 4-column KPI grid, 2-column chart row, collapsible platform sidebar.
36. **PWA Relevance**: Desktop-primary view; accessible on mobile for emergency checks.
37. **Accessibility Considerations**: ARIA labels on all charts; metric cards announce "Metric Name, Value, Trend" to screen readers.
38. **Audit Requirements**: Page access logged to platform admin audit trail.
39. **Notification/Event Side Effects**: None on view.
40. **Dependencies on Other Screens/Modules**: Links to `PLT-02`, `PLT-03`, `PLT-05`, `PLT-07`.

---

## Screen 9: PLT-02 — Tenant Directory
1. **Screen ID**: `PLT-02`
2. **Screen Name**: Tenant Directory
3. **Route**: `/platform/tenants`
4. **Module**: Platform Control Plane (`platform_core`)
5. **Scope**: Global Platform Scope
6. **Primary User(s)**: SaaS Super Admin, Customer Support Leads
7. **Secondary User(s)**: Platform Account Managers
8. **Purpose**: Search, filter, inspect, and manage all educational institution tenants hosted on the multi-tenant platform.
9. **Entry Points**: Platform sidebar "Tenants" link; dashboard shortcut from `PLT-01`.
10. **Navigation Placement**: Platform Admin Sidebar under "Tenants".
11. **Required Permissions**: `tenant.manage`
12. **Required Module Entitlement**: `platform_core`
13. **Required Tenant Context**: None.
14. **Data Displayed**: Table listing institutions: Tenant Name, Subdomain/Slug, Affiliation Board (CBSE/ICSE/State), Active Plan Tier, Student Count, Staff Count, Status Badge (`ACTIVE`, `TRIAL`, `SUSPENDED`, `PROVISIONING`), Created Date, Actions.
15. **Filters**: Status dropdown (`ALL`, `ACTIVE`, `TRIAL`, `SUSPENDED`), Plan dropdown (`STARTER`, `ACADEMIC_PRO`, `ENTERPRISE`), State/Region filter.
16. **Search**: Search bar querying Tenant Name, Domain, or School Code.
17. **Sorting**: Sort by Name (A-Z), Student Count (High-Low), Creation Date (Newest First).
18. **Pagination**: Server-side cursor pagination, 25 tenants per page.
19. **Primary Actions**: "Add Tenant" (routes to `PLT-03`).
20. **Secondary Actions**: "Export Tenant Directory" (CSV).
21. **Bulk Actions**: "Export Selected", "Bulk Notification".
22. **Row Actions**: "Manage Tenant" (navigates to `PLT-04`), "Suspend Tenant" (opens confirmation modal), "Impersonate Admin" (emergency support access with strict audit logging).
23. **Forms**: Suspend Tenant confirmation dialog.
24. **Form Fields**: Suspension Reason (`string`, required, min 15 chars), Immediate Disconnect Active Sessions (`checkbox`).
25. **Validation Rules**: Suspension reason mandatory.
26. **Confirmation Requirements**: Type tenant slug to confirm suspension.
27. **Success Behavior**: Tenant status badge updates to `SUSPENDED` (red); toast notification displayed.
28. **Error Behavior**: Banner error if database update fails.
29. **Empty State**: "No tenants found matching your filter criteria. [Clear Filters]".
30. **Loading State**: Table skeleton with 10 simulated rows.
31. **Forbidden State**: HTTP 403 Forbidden boundary.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Table collapses to card view with expandable detail accordions.
34. **Tablet Behavior**: Scrollable table with sticky first column (Tenant Name).
35. **Desktop Behavior**: Full data table with density toggle (compact/comfortable).
36. **PWA Relevance**: Desktop-primary.
37. **Accessibility Considerations**: Table markup uses `<thead>`, `<th>`, `scope="col"`; status badges include visually hidden descriptive text.
38. **Audit Requirements**: Every tenant search, status change, and detail navigation logged.
39. **Notification/Event Side Effects**: Suspending tenant revokes active JWT session tokens and sends institutional notification email.
40. **Dependencies on Other Screens/Modules**: Links to `PLT-03` and `PLT-04`.

---

## Screen 10: PLT-03 — Tenant Provisioning Wizard
1. **Screen ID**: `PLT-03`
2. **Screen Name**: Tenant Provisioning Wizard
3. **Route**: `/platform/tenants/new`
4. **Module**: Platform Control Plane (`platform_core`)
5. **Scope**: Global Platform Scope
6. **Primary User(s)**: SaaS Super Admin, Onboarding Specialist
7. **Secondary User(s)**: Platform Support Engineers
8. **Purpose**: Multi-step wizard to provision a new educational institution: create `Tenant` record, configure subdomain/slug, assign initial subscription plan and module entitlements, and create the initial School Owner/Administrator user.
9. **Entry Points**: "Add Tenant" CTA on `PLT-01` and `PLT-02`.
10. **Navigation Placement**: Secondary view under "Tenants" navigation.
11. **Required Permissions**: `tenant.create`
12. **Required Module Entitlement**: `platform_core`
13. **Required Tenant Context**: None.
14. **Data Displayed**: Step indicator (Step 1: Institutional Details; Step 2: Plan & Feature Entitlements; Step 3: School Owner Credentials; Step 4: Review & Provision), input forms, preview summary card.
15. **Filters**: None.
16. **Search**: Real-time subdomain availability checker.
17. **Sorting**: N/A.
18. **Pagination**: Multi-step wizard navigation (Previous, Next, Complete).
19. **Primary Actions**: "Provision Institution" (final step trigger).
20. **Secondary Actions**: "Save Draft", "Cancel" (returns to `PLT-02`).
21. **Bulk Actions**: None.
22. **Row Actions**: None.
23. **Forms**: 3-step wizard form.
24. **Form Fields**: 
    - Step 1: Legal Institution Name (`string`), Subdomain/Slug (`string`, e.g. `greenwood`), Affiliation Board (`dropdown: CBSE, ICSE, IB, State Board`), Address, City, State, Pin Code.
    - Step 2: Subscription Tier (`Starter, Academic Pro, Enterprise`), Custom Modules Checklist (enable/disable optional modules), Max Student Quota (`number`), Max Staff Quota (`number`).
    - Step 3: Initial Admin Full Name, Admin Email, Admin Mobile (+91), Send Welcome Invitation Email (`checkbox`).
25. **Validation Rules**: Subdomain must be lowercase alphanumeric and hyphens only (`/^[a-z0-9-]+$/`), min 3 chars, globally unique; Admin email must be valid format and not exist in conflicting tenant owner roles; Quotas must be positive integers.
26. **Confirmation Requirements**: Final Step 4 presents full summary with confirmation checkbox: "I verify that this institution is legally registered and authorized."
27. **Success Behavior**: Progress modal shows provisioning pipeline:
    - 1. Creating Tenant Database Record... [Done]
    - 2. Binding Default Roles & Permissions... [Done]
    - 3. Seeding Default Academic Year... [Done]
    - 4. Provisioning School Owner Account... [Done]
    - 5. Dispatching Welcome Invitation... [Done]
    Redirects to `PLT-04` upon completion with success banner.
28. **Error Behavior**: If database transaction fails, cleanly rolls back and highlights failed step without leaving orphaned records.
29. **Empty State**: N/A.
30. **Loading State**: Step transitions show loading spinners on button; final provisioning step shows progress checklist.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Vertically stacked wizard steps; floating sticky "Next" action bar at bottom.
34. **Tablet Behavior**: Standard wizard container with top progress bar.
35. **Desktop Behavior**: Two-column layout (left: wizard steps; right: sticky dynamic live summary preview card).
36. **PWA Relevance**: Desktop-primary administration tool.
37. **Accessibility Considerations**: Accessible step indicator with `aria-current="step"`; keyboard focus trapped inside wizard context.
38. **Audit Requirements**: Generates high-priority `AuditLog` (`action: TENANT_PROVISIONED`, `tenantId`, `subdomain`, `planTier`, `adminEmail`, `actorId`).
39. **Notification/Event Side Effects**: Dispatches Clerk onboarding invitation email to the school owner.
40. **Dependencies on Other Screens/Modules**: Uses plan definitions from `PLT-05`, transitions to `PLT-04`.

---

## Screen 11: PLT-04 — Tenant Detail & Governance
1. **Screen ID**: `PLT-04`
2. **Screen Name**: Tenant Detail & Governance
3. **Route**: `/platform/tenants/[id]`
4. **Module**: Platform Control Plane (`platform_core`)
5. **Scope**: Global Platform Scope
6. **Primary User(s)**: SaaS Super Admin, Technical Account Lead
7. **Secondary User(s)**: Billing & Compliance Officers
8. **Purpose**: Complete 360-degree governance view of a single institution: view settings, update quotas, toggle individual module entitlements, inspect institutional users, view billing status, and initiate suspension or deletion.
9. **Entry Points**: Clicking tenant in `PLT-02` or directly from `PLT-01`.
10. **Navigation Placement**: Child view of Tenant Directory.
11. **Required Permissions**: `tenant.manage`
12. **Required Module Entitlement**: `platform_core`
13. **Required Tenant Context**: None (operates from platform control plane on target `[id]`).
14. **Data Displayed**: 
    - Header: Institution Name, Subdomain link, Board, Status badge, Quick Action buttons (Suspend, Impersonate, Contact Admin).
    - Tab 1: Overview & Usage (Enrolled Students vs Quota bar, Faculty count, Storage used in GB, Active classes count).
    - Tab 2: Subscription & Entitlements (Current Plan, Next billing date, Module switches: Attendance, Timetable, Exams, Report Cards, etc.).
    - Tab 3: Institutional Administrators (List of users with `TENANT_ADMIN` role).
    - Tab 4: Audit & Activity Log (Chronological events for this tenant).
15. **Filters**: Audit tab filtered by date or action type.
16. **Search**: Search users inside tab.
17. **Sorting**: Sort audit trail by timestamp.
18. **Pagination**: Audit trail paginated 20 per page.
19. **Primary Actions**: "Save Changes" (updates quotas/entitlements).
20. **Secondary Actions**: "Suspend Tenant", "Restore Tenant", "Regenerate API Keys", "Delete Tenant (High Risk)".
21. **Bulk Actions**: None.
22. **Row Actions**: In Admins tab: "Resend Invite", "Revoke Admin".
23. **Forms**: Quota & Entitlement Editor form.
24. **Form Fields**: Max Student Limit (`number`), Max Staff Limit (`number`), Module Entitlement Toggles (`switch` for each module key), Primary Domain Name (`string`, optional custom domain).
25. **Validation Rules**: Quota cannot be set lower than currently active student enrollment; domain name must be valid FQDN syntax.
26. **Confirmation Requirements**: Toggling core module or reducing quota requires explicit modal confirmation.
27. **Success Behavior**: Toast: "Tenant configuration updated successfully." Database reflects new `ModuleEntitlement` bindings.
28. **Error Behavior**: Inline error banner if validation or database update fails.
29. **Empty State**: N/A.
30. **Loading State**: Header and tab content skeleton loaders.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Tabs convert to swipeable scroll menu; action buttons collapse into "More Actions" menu.
34. **Tablet Behavior**: Standard tabbed layout.
35. **Desktop Behavior**: Full-width container with sticky tab navigation.
36. **PWA Relevance**: Desktop-primary.
37. **Accessibility Considerations**: ARIA tabs pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`); tab switching accessible via arrow keys.
38. **Audit Requirements**: All quota and entitlement modifications logged to `AuditLog` with before/after diffs.
39. **Notification/Event Side Effects**: If module entitlement toggled off, active sessions for that module in the tenant receive real-time invalidation.
40. **Dependencies on Other Screens/Modules**: Linked to `PLT-02`, references `PLT-05`.

---

## Screen 12: PLT-05 — Plan & Entitlements Manager
1. **Screen ID**: `PLT-05`
2. **Screen Name**: Plan & Entitlements Manager
3. **Route**: `/platform/plans`
4. **Module**: Platform Control Plane (`platform_core`)
5. **Scope**: Global Platform Scope
6. **Primary User(s)**: SaaS Super Admin, Product Monetization Lead
7. **Secondary User(s)**: Finance Managers
8. **Purpose**: Define, price, and maintain SaaS subscription plans (Starter, Academic Pro, Enterprise) and map which functional modules are bundled by default with each plan tier.
9. **Entry Points**: Platform sidebar link under "Subscription Plans".
10. **Navigation Placement**: Platform Admin Sidebar.
11. **Required Permissions**: `platform.plans.manage`
12. **Required Module Entitlement**: `platform_core`
13. **Required Tenant Context**: None.
14. **Data Displayed**: Grid of Plan Cards, Pricing per Student/Month (INR), Plan Features List, Active Tenant Count per Plan, Default Module Matrix table (rows = modules, columns = plans).
15. **Filters**: None.
16. **Search**: None.
17. **Sorting**: N/A.
18. **Pagination**: N/A.
19. **Primary Actions**: "Create New Plan", "Edit Plan Matrix".
20. **Secondary Actions**: "Archive Plan".
21. **Bulk Actions**: None.
22. **Row Actions**: Click plan card to edit properties.
23. **Forms**: Plan Configuration Drawer / Modal.
24. **Form Fields**: Plan Key (`string`, unique), Display Name (`string`), Monthly Price per Student (`number`), Annual Price Discount (`percent`), Included Modules (`multi-select checkboxes`).
25. **Validation Rules**: Plan Key immutable once created; price must be >= 0.
26. **Confirmation Requirements**: Modifying module entitlements for an existing plan warns: "This change will affect default permissions for future tenants provisioned under this plan."
27. **Success Behavior**: Toast: "Subscription plan updated successfully."
28. **Error Behavior**: Banner error if plan key conflicts or update fails.
29. **Empty State**: N/A.
30. **Loading State**: Plan cards skeleton loader.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Vertically stacked cards.
34. **Tablet Behavior**: 2-column grid.
35. **Desktop Behavior**: 3-column plan grid with full matrix comparison table below.
36. **PWA Relevance**: Desktop-primary.
37. **Accessibility Considerations**: Accessible checkboxes and comparison table headers.
38. **Audit Requirements**: Plan modifications logged with detailed audit trail.
39. **Notification/Event Side Effects**: None.
40. **Dependencies on Other Screens/Modules**: Informs `PLT-03` and `PLT-04`.

---

## Screen 13: PLT-06 — Platform User Directory
1. **Screen ID**: `PLT-06`
2. **Screen Name**: Platform User Directory
3. **Route**: `/platform/users`
4. **Module**: Platform Control Plane (`platform_core`)
5. **Scope**: Global Platform Scope
6. **Primary User(s)**: SaaS Super Admin, Security Compliance Officer
7. **Secondary User(s)**: SaaS Operations Engineers
8. **Purpose**: Manage platform-level administrators, view cross-tenant user lookup for support emergencies, and enforce security policies (MFA mandates, session revocation).
9. **Entry Points**: Platform sidebar link under "Platform Admins".
10. **Navigation Placement**: Platform Admin Sidebar.
11. **Required Permissions**: `platform.users.read`
12. **Required Module Entitlement**: `platform_core`
13. **Required Tenant Context**: None.
14. **Data Displayed**: Table of Platform Administrators: Name, Email, Platform Role (`SUPER_ADMIN`, `SUPPORT_OPERATOR`, `AUDITOR`), MFA Status (`ENABLED`, `DISABLED`), Last Login Date, Status (`ACTIVE`, `INACTIVE`), Actions.
15. **Filters**: Platform Role filter, MFA Status filter.
16. **Search**: Search by Admin Name or Email.
17. **Sorting**: Name, Last Login, Date Created.
18. **Pagination**: 20 users per page.
19. **Primary Actions**: "Invite Platform Admin" (button).
20. **Secondary Actions**: "Enforce Global MFA".
21. **Bulk Actions**: None.
22. **Row Actions**: "Edit Permissions", "Revoke Access", "Force Password Reset".
23. **Forms**: Invite Platform Admin dialog.
24. **Form Fields**: Full Name (`string`), Email (`email`), Platform Role (`dropdown`), Expiry Date (`date`, optional).
25. **Validation Rules**: Email must be corporate domain; role must be valid platform enum.
26. **Confirmation Requirements**: Revoking access requires confirmation prompt.
27. **Success Behavior**: Invitation email dispatched; user added to directory with `INVITED` status.
28. **Error Behavior**: Inline error if email already exists in platform admin table.
29. **Empty State**: "No platform admins found matching search."
30. **Loading State**: Table skeleton loader.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Card list view.
34. **Tablet Behavior**: Scrollable table.
35. **Desktop Behavior**: Clean administrative data table.
36. **PWA Relevance**: Desktop-primary.
37. **Accessibility Considerations**: Full keyboard navigability and high contrast badges.
38. **Audit Requirements**: High-severity `AuditLog` generated for any platform role assignment or revocation.
39. **Notification/Event Side Effects**: Sends Clerk invitation email to newly invited admin.
40. **Dependencies on Other Screens/Modules**: Links to `PLT-07`.

---

## Screen 14: PLT-07 — Platform Security Audit Logs
1. **Screen ID**: `PLT-07`
2. **Screen Name**: Platform Security Audit Logs
3. **Route**: `/platform/audit-logs`
4. **Module**: Platform Control Plane (`platform_core`)
5. **Scope**: Global Platform Scope
6. **Primary User(s)**: SaaS Super Admin, Chief Information Security Officer (CISO)
7. **Secondary User(s)**: External Security Compliance Auditors (DPDP / ISO-27001)
8. **Purpose**: Search, filter, inspect, and export immutable, tamper-evident security audit logs capturing all critical platform actions, permission changes, cross-tenant impersonations, and access failures.
9. **Entry Points**: Platform sidebar link under "Security & Audit".
10. **Navigation Placement**: Platform Admin Sidebar.
11. **Required Permissions**: `platform.audit.read`
12. **Required Module Entitlement**: `platform_core`
13. **Required Tenant Context**: None.
14. **Data Displayed**: Table of Audit Events: Timestamp (ISO / IST), Severity Badge (`CRITICAL`, `WARNING`, `INFO`), Actor Name & Email, Action Category (`AUTH`, `TENANT_MGMT`, `SECURITY`, `RBAC`, `EXPORT`), Target Tenant (if applicable), IP Address, User Agent, Details JSON viewer toggle.
15. **Filters**: Severity (`ALL`, `CRITICAL`, `WARNING`, `INFO`), Action Category, Date Range (Presets: Today, Last 7 Days, Custom Range), Target Tenant dropdown.
16. **Search**: Search by Actor Email, IP Address, or Event Keywords.
17. **Sorting**: Chronological (Newest First by default).
18. **Pagination**: Server-side pagination, 50 events per page.
19. **Primary Actions**: "Export Audit Log" (generates cryptographically signed CSV/JSON).
20. **Secondary Actions**: "Filter Critical Events Only", "Refresh Live Feed".
21. **Bulk Actions**: None (Audit logs are strictly immutable and cannot be deleted or modified).
22. **Row Actions**: "Inspect Payload" (opens expandable JSON viewer showing before/after diffs).
23. **Forms**: Audit Log Export Configuration Dialog.
24. **Form Fields**: Date Range, Event Types, Format (`CSV` or `JSON`), Include PII / IP Addresses (`checkbox`, requires extra authorization).
25. **Validation Rules**: Date range cannot exceed 90 days in a single export file.
26. **Confirmation Requirements**: None for viewing; Export prompts confirmation.
27. **Success Behavior**: Exports file download streamed to client.
28. **Error Behavior**: Banner alert if export generation fails.
29. **Empty State**: "No audit logs found for the selected time window."
30. **Loading State**: Table skeleton loader with 15 rows.
31. **Forbidden State**: HTTP 403 Forbidden.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Compact card feed showing timestamp, action, and severity badge.
34. **Tablet Behavior**: Scrollable table with JSON drawer.
35. **Desktop Behavior**: Full-width data table with expandable JSON syntax-highlighted diff viewer.
36. **PWA Relevance**: Desktop-primary compliance interface.
37. **Accessibility Considerations**: Accessible JSON tree with keyboard expand/collapse; color-blind friendly severity indicators with distinct icons.
38. **Audit Requirements**: The act of viewing or exporting the audit log itself writes an audit record (`AUDIT_LOG_ACCESSED`, `AUDIT_LOG_EXPORTED`).
39. **Notification/Event Side Effects**: Real-time webhook fires to security monitoring channel on any `CRITICAL` severity event.
40. **Dependencies on Other Screens/Modules**: Directly queries application PostgreSQL `AuditLog` table.
