# Section I: PWA & Client Architecture Audit

## 1. PWA Readiness: Current Audit Fact vs. Target Product Requirement

### 1.1 Current Audit Fact: PWA is Completely Absent
Physical inspection of the repository confirms that **no PWA capabilities exist in the codebase today**.

| PWA Technical Asset | Current Codebase Status | Verified Audit Evidence |
| :--- | :--- | :--- |
| **Web App Manifest** | **ABSENT** | No `manifest.json`, `manifest.webmanifest`, or `app/manifest.ts` file exists in `public/` or `src/app/`. |
| **Service Worker** | **ABSENT** | No `sw.js`, `service-worker.js`, or service worker registration script exists in `src/` or `public/`. |
| **Offline Fallback** | **ABSENT** | No offline cache mechanism, no offline HTML fallback page, and no caching strategy for static or dynamic routes. |
| **Installability** | **NOT INSTALLABLE** | Browsers will not trigger an "Add to Home Screen" or install banner due to missing manifest and service worker. |
| **Push Notifications** | **ABSENT** | No Web Push API integration, VAPID key configuration, or Service Worker `push` listeners. |
| **Icons & Splash Screens**| **INCOMPLETE** | Static PNG icons exist in `public/`, but none are sized or designated for standard PWA icon standards (192x192, 512x512 maskable). |

### 1.2 Target Product Requirement
The product specification mandates a **PWA-first responsive web application**. This requirement is an objective of the upcoming architecture and rollout phases, not a feature of the current codebase.

---

## 2. Client-Side Architecture & State Management (Current Implementation)

### 2.1 State Management Approach
- **Global State**: **No state management library is installed** (no Redux, Zustand, Recoil, or React Context).
- **Component State**: Strictly uses local React `useState` hooks for modals, calendars, and UI toggles.
- **Server Sync**: Form mutations use React 18's experimental `useFormState` (via `react-dom`) to capture action return values (`{ success: boolean, error: boolean }`).
- **URL as State**: The application utilizes URL search parameters for table search (`?search=...`), pagination (`?page=...`), and calendar filtering (`?date=...`), allowing bookmarking and server-side evaluation.

### 2.2 Client-Side Bundle & Dependencies
- `react-big-calendar` (and bundled `moment.js`) introduces significant client-side JavaScript weight (over 70 KB gzipped).
- `recharts` is loaded across multiple dashboard views, adding SVG rendering overhead to the main thread.
- `@clerk/elements` adds specialized client bundles to handle auth form rendering.

### 2.3 Mobile Responsiveness & Viewport Behavior
- Layout uses Tailwind breakpoints (`hidden md:table-cell`, `lg:w-2/3`, `flex-col md:flex-row`).
- In `src/app/(dashboard)/layout.tsx`, the sidebar width scales from `w-[14%]` on mobile to `w-[8%] md` and `w-[16%] lg`.
  - On mobile screens (`< 768px`), table columns are collapsed, but table rows produce horizontal overflow in narrow viewports.
  - The sidebar collapses to icons on mobile without a dedicated bottom navigation bar or mobile drawer.

---

## 3. PWA Architectural Considerations for Future Target Architecture

To satisfy the target product requirement for PWA-first mobile accessibility:
1. **PWA Integration Engine**: Evaluate modern service worker tooling (such as `@serwist/next`) compatible with Next.js 14 App Router.
2. **Web App Manifest**: Generate a compliant `manifest.webmanifest` defining `name`, `short_name`, theme colors, `display: standalone`, and standard maskable icons.
3. **Caching Strategies**:
   - Cache static visual assets (SVGs, brand logos, font subsets).
   - Evaluate Stale-While-Revalidate caching for read-only timetables and announcements.
   - Design offline queueing patterns for attendance marking with synchronization when network connectivity resumes.
4. **Mobile Navigation**: Evaluate replacing the desktop left sidebar with a mobile-friendly bottom navigation bar or drawer on narrow viewports.
