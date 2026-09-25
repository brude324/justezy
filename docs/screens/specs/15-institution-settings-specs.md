# Detailed Screen Specifications: Institution Settings & Governance Suite

## Screen 40: TNT-SET-01 — Institution Profile & Governance Settings
1. **Screen ID**: `TNT-SET-01`
2. **Screen Name**: Institution Profile & Governance Settings
3. **Route**: `/tenant/settings`
4. **Module**: Institution Profile & Settings (`core_academics`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE`)
6. **Primary User(s)**: Institution Owner, Principal, Chief Operating Officer
7. **Secondary User(s)**: Administrative IT Coordinator
8. **Purpose**: Master institutional administration console: configure school identity (logo, crest, affiliation details), set default academic session, define attendance policies (e.g. 75% threshold, auto-SMS triggers), configure notification sender IDs, view subscription plan usage, and inspect institutional audit logs.
9. **Entry Points**: "Settings" link at bottom of institutional sidebar; user profile dropdown menu.
10. **Navigation Placement**: Bottom-pinned link in Institutional Sidebar.
11. **Required Permissions**: `tenant.settings.manage` (to edit); `tenant.settings.read` (to view).
12. **Required Module Entitlement**: `core_academics`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Header: Institution Legal Name, Subdomain / School Code, Status Badge (`ACTIVE`), Subscription Tier Badge (`Academic Pro`), "Save All Settings" CTA.
    - Tab 1: Institution Profile (Legal Name, Short Code, Affiliation Board: CBSE/ICSE/State, Affiliation Number, Established Year, Official Email, Phone, Website URL, Physical Campus Address, School Crest/Logo uploader).
    - Tab 2: Academic & Attendance Policies (Default Passing Percentage, Attendance Warning Threshold: e.g. 75%, Auto-dispatch Parent SMS on Absence toggle, Daily Attendance Cutoff Time: e.g. 10:00 AM).
    - Tab 3: Branding & Report Card Customization (School Theme Color, Principal Digital Signature Upload, Report Card Header Text, Report Card Footer Disclaimer).
    - Tab 4: Subscription & Usage Quotas (Current Plan, Enrolled Students vs Plan Quota: e.g. 842 / 1000, Staff Count vs Quota: 48 / 60, Storage Used, Active Add-on Modules).
    - Tab 5: Institutional Audit Log (Chronological table of administrative actions taken within this tenant).
15. **Filters**: Audit Log tab filtered by date and action type.
16. **Search**: Search inside institutional audit logs.
17. **Sorting**: Audit log sorted chronologically (Newest first).
18. **Pagination**: Audit log paginated 25 events per page.
19. **Primary Actions**: "Save Institutional Settings" (submits settings form, requires `tenant.settings.manage`).
20. **Secondary Actions**: "Upload New Logo", "Upload Principal Signature", "Export Institutional Audit Log (CSV)".
21. **Bulk Actions**: None.
22. **Row Actions**: In Audit Log tab: "Inspect Event Details".
23. **Forms**: Master Institution Settings Form.
24. **Form Fields**: Institution Name (`string`, required), Short Name/Code (`string`, required), Affiliation Board (`dropdown`), Affiliation Number (`string`), Email (`email`, required), Phone (`phone`, required), Website (`url`, optional), Address (`string`, required), Logo Image (`file upload: PNG, SVG, max 2MB`), Principal Signature Image (`file upload: PNG, max 1MB`), Attendance Warning Threshold (`number: 50 to 90`, default 75), Auto-SMS on Absenteeism (`switch`, boolean), Daily Attendance Lock Time (`time: e.g. 11:00 AM`).
25. **Validation Rules**: Institution Name cannot be empty; email and phone must be valid formats; logo file must be image format <= 2MB; Attendance threshold must be between 50% and 90%.
26. **Confirmation Requirements**: Enabling or disabling Auto-SMS on Absenteeism prompts confirmation warning regarding institutional SMS credits.
27. **Success Behavior**: Toast: "Institution settings updated successfully." Brand logo and theme update in real-time across the client application shell.
28. **Error Behavior**: Field validation alerts; server failure displays sticky alert banner.
29. **Empty State**: N/A (Standard configuration console).
30. **Loading State**: Form skeleton loader with tab shimmers.
31. **Forbidden State**: Renders full `403 Forbidden` if non-administrator staff or teachers attempt to access `/tenant/settings`.
32. **Module-Disabled State**: HTTP 402 Module Disabled if tenant account suspended.
33. **Mobile Behavior**: Tabs collapse into swipeable horizontal menu; save button floats sticky at bottom.
34. **Tablet Behavior**: Side-navigation tab layout.
35. **Desktop Behavior**: Full-width settings console with left vertical navigation tab list and right-hand form editor pane.
36. **PWA Relevance**: `DESKTOP-PRIMARY`.
37. **Accessibility Considerations**: Accessible form controls with explicit labels; logo uploader has clear keyboard focus and file selection announcements.
38. **Audit Requirements**: Every setting modification is recorded in `AuditLog` (`action: TENANT_SETTINGS_UPDATED`, diff of changed keys: `{ oldValues, newValues }`, `actorId`).
39. **Notification/Event Side Effects**: Updating school branding invalidates cached institutional theme tokens across client devices.
40. **Dependencies on Other Screens/Modules**: Provides master configuration for `TNT-DSH-01`, `TNT-ATT-01`, `TNT-MRK-02`.
