# Detailed Screen Specifications: Parent & Guardian Management Suite

## Screen 23: TNT-PAR-01 — Parent & Guardian Directory
1. **Screen ID**: `TNT-PAR-01`
2. **Screen Name**: Parent & Guardian Directory
3. **Route**: `/tenant/parents`
4. **Module**: Parent Management (`parent_directory`)
5. **Scope**: Institutional Scope (`AccessScope.INSTITUTION_WIDE` for Admins) / Assigned Class Scope (`AccessScope.ASSIGNED_ONLY` for Class Teachers)
6. **Primary User(s)**: Institution Admin, Principal, Class Teachers
7. **Secondary User(s)**: Front Office & Transport Coordinators
8. **Purpose**: Maintain institutional directory of parent/guardian profiles, inspect verified child-parent bindings, manage communication contacts (SMS/WhatsApp), and assist parents with portal onboarding.
9. **Entry Points**: Institutional Sidebar under "Parents & Guardians"; link from Student Profile `TNT-STU-02`.
10. **Navigation Placement**: Secondary link under "Academics" or "Students" in institutional sidebar.
11. **Required Permissions**: `parent.read` (to view); `parent.create` (to link new guardian); `parent.update` (to edit); `parent.export` (to export).
12. **Required Module Entitlement**: `parent_directory`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**: Table of Guardians: Full Name, Relationship (`FATHER`, `MOTHER`, `GUARDIAN`), Primary Mobile Number, Email Address, Linked Children (chips with student names and grades, e.g. "Aarav (10-A)", "Ananya (6-B)"), Portal Access Status (`ACTIVE`, `INVITED`, `NOT_REGISTERED`), Actions.
15. **Filters**: Portal Access Status (`ALL`, `ACTIVE`, `INVITED`, `NOT_REGISTERED`), Grade of Linked Children dropdown.
16. **Search**: Debounced search by Parent Name, Mobile Number, or Child's Name.
17. **Sorting**: Sort by Parent Name (A-Z), Linked Children Count, Date Added.
18. **Pagination**: Server-side pagination, 25 records per page.
19. **Primary Actions**: "Link New Guardian" (opens modal/drawer, requires `parent.create`).
20. **Secondary Actions**: "Export Guardian Directory" (CSV, requires `parent.export`), "Send Bulk Portal Invites" (SMS broadcast).
21. **Bulk Actions**: "Send Portal Invitation SMS", "Export Selected".
22. **Row Actions**: "Edit Contact" (requires `parent.update`), "Send Portal Invite Link", "View Linked Children" (links to `TNT-STU-02`), "Unlink Student".
23. **Forms**: "Link New Guardian" Modal Form.
24. **Form Fields**: Guardian Full Name (`string`, required), Mobile Number (`phone`, required), Email Address (`email`, optional), Relationship (`dropdown: FATHER, MOTHER, LEGAL_GUARDIAN`), Target Student (`typeahead search dropdown`, required), Is Emergency Contact (`checkbox`), Is Fee Payer (`checkbox`).
25. **Validation Rules**: Mobile number must be valid 10-digit Indian mobile; target student must belong to active `tenantId`; duplicate phone number prompts merging with existing guardian record across multiple children.
26. **Confirmation Requirements**: Unlinking a guardian from a student prompts confirmation dialog: "Are you sure you want to remove this guardian link? The parent will lose portal visibility for this student."
27. **Success Behavior**: Toast: "Guardian linked successfully. Portal invite SMS queued." List updates immediately.
28. **Error Behavior**: Field validation alerts on malformed phone/email.
29. **Empty State**: "No guardians found matching your search. [Link First Guardian] or clear filters."
30. **Loading State**: Table skeleton loader with 8 rows.
31. **Forbidden State**: HTTP 403 Forbidden boundary.
32. **Module-Disabled State**: HTTP 402 Module Disabled if `parent_directory` is unlicensed.
33. **Mobile Behavior**: Table collapses to responsive contact cards with direct "Call" and "Invite" action buttons.
34. **Tablet Behavior**: Scrollable data table with sticky parent name column.
35. **Desktop Behavior**: Full data table with multi-child chips and quick filter bar.
36. **PWA Relevance**: `DESKTOP + MOBILE`.
37. **Accessibility Considerations**: Accessible table structure; child tags announce "Linked student: [Name], Grade [Grade]".
38. **Audit Requirements**: Guardian creations, updates, and student unlinking logged to `AuditLog`.
39. **Notification/Event Side Effects**: Sends onboarding SMS via notification worker with parent portal login instructions.
40. **Dependencies on Other Screens/Modules**: Strongly coupled with `TNT-STU-01` and `TNT-STU-02`.
