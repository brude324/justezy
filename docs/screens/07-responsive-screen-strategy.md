# Responsive Screen Strategy & PWA Adaptation

## 1. Responsive Tiering & Device Breakpoints

**Status**: TARGET / PROPOSED

To support both dense desktop administrative workflows and mobile-first parental and teacher interactions, every screen adheres to a 3-tier responsive breakpoint strategy:

```
[ Mobile Tier: < 768px ]         [ Tablet Tier: 768px - 1024px ]     [ Desktop Tier: > 1024px ]
- Single column layout           - 2-column dashboard layout         - Multi-column full layout
- Fixed bottom navigation bar    - Collapsed icon sidebar            - Expanded domain sidebar
- Touch-friendly tap targets     - Split modal sheets                - Dense data tables
- Pull-to-refresh & swipe cards  - High-density lists                - Multi-filter action clusters
```

---

## 2. Screen Responsive Classification Scheme

| Responsive Class | Description & Layout Priority | Target Persona & Context |
| :--- | :--- | :--- |
| **`PWA-CRITICAL`** | Must function flawlessly offline on entry-level mobile devices. Minimal client payload, cached local snapshots, background sync. | Class Teachers (Roll-call), Parents (Daily alerts). |
| **`MOBILE-PRIMARY`** | Designed primarily for smartphones. Vertical card stacks, bottom action drawers, simplified tabular data. | Parents, Students, Field Staff. |
| **`DESKTOP + MOBILE`** | Fully adaptive screens delivering rich data density on desktop while gracefully collapsing to cards on mobile. | Subject Teachers, Academic Supervisors. |
| **`DESKTOP-PRIMARY`** | Optimized for complex multi-column administrative management. Usable on mobile via horizontal pan or responsive drawers. | School Administrators, Exam Coordinators, SaaS Super Admins. |

---

## 3. Comprehensive Responsive & PWA Screen Matrix

| Screen ID | Screen Name | Responsive Class | Desktop Layout (> 1024px) | Mobile Layout (< 768px) | PWA Offline Requirement? |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **TNT-ATT-01**| Daily Attendance Sheet | **`PWA-CRITICAL`** | Dense multi-student roster grid with shortcut keys. | Fullscreen single-tap attendance card stack; swipe next. | **YES (IndexedDB Sync)** |
| **TNT-TBL-02**| Weekly Timetable View | **`PWA-CRITICAL`** | Full 6-day period matrix (React Big Calendar). | Day-by-day swipe carousel; current period highlighted. | **YES (CacheStorage)** |
| **TNT-NOT-01**| Notification Center | **`PWA-CRITICAL`** | Split-pane notification drawer with preview. | Fullscreen list feed with unread badges. | **YES (Push + Cache)** |
| **TNT-DSH-04**| Parent Dashboard | **`PWA-CRITICAL`** | Multi-card analytics, fee summaries, recent notices. | Vertical scroll feed, top child switcher, quick stats. | **YES (CacheStorage)** |
| **TNT-DSH-02**| Teacher Dashboard | **`PWA-CRITICAL`** | 3-column layout: today's schedule, pending attendance. | Quick action buttons, today's period timeline. | **YES (CacheStorage)** |
| **TNT-STU-02**| Student 360 Profile | **`DESKTOP + MOBILE`**| 2-column layout: personal bio, historic grade chart. | Collapsible accordion sections: bio, grades, attendance. | No |
| **TNT-DSH-03**| Student Dashboard | **`MOBILE-PRIMARY`** | Daily schedule, active homework, recent marks. | Touch cards: "Today's Classes", "Due Homework". | **YES (CacheStorage)** |
| **TNT-ASN-01**| Homework Assignments | **`DESKTOP + MOBILE`**| Paginated table with attachment links and dates. | Card list grouped by subject; tap to view instructions. | No |
| **TNT-COM-01**| Bulletins & Notices | **`MOBILE-PRIMARY`** | Tabular notice archive with audience filters. | Card feed with attached PDF viewer. | No |
| **TNT-COM-02**| School Events Calendar | **`DESKTOP + MOBILE`**| Full monthly interactive calendar view. | Chronological event list with date badges. | No |
| **TNT-MRK-01**| Marks Entry Grid | **`DESKTOP-PRIMARY`** | High-density Excel-style grid (`Tab`/`Enter` navigation).| Scrollable table with sticky student name column. | No (Online only) |
| **TNT-TBL-01**| Master Timetable Grid | **`DESKTOP-PRIMARY`** | Drag-and-drop period schedule grid. | Read-only matrix view; editing requires tablet/desktop. | No |
| **TNT-CLS-01**| Classes & Sections | **`DESKTOP-PRIMARY`** | Section table with capacity progress bars. | Responsive card stack per grade level. | No |
| **TNT-STF-01**| Faculty Directory | **`DESKTOP + MOBILE`**| Multi-column directory with department filters. | Avatar card list with direct tap-to-call/email. | No |
| **TNT-STU-01**| Student Directory | **`DESKTOP-PRIMARY`** | Paginated table with 8 data columns and search. | Compact student list showing name, roll no, section. | No |
| **TNT-SET-01**| Institution Settings | **`DESKTOP-PRIMARY`** | Multi-tab form layout (Branding, Academic, Roles). | Single stacked form; editing restricted to desktop/tab. | No |
| **TNT-AUD-01**| Institutional Audit | **`DESKTOP-PRIMARY`** | JSON diff viewer, actor filters, export triggers. | Compact chronological activity log. | No |
| **PLT-01..07**| Platform Control Plane | **`DESKTOP-PRIMARY`** | Complex data grids, charts, tenant configuration. | Admin console viewable on mobile; creation on desktop. | No |
