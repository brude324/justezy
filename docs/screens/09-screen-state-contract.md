# 09 — Standardized Screen State Contract

## 1. Overview & Architectural Principle

**Status**: TARGET / SPECIFICATION  
**Scope**: Universal across all web, tablet, and mobile PWA client surfaces in SchoolyardSMS.

This document establishes the deterministic contract for screen states across the entire application. In accordance with the non-negotiable security and reliability invariants established in `AGENTS.md` and `docs/architecture/`, screen rendering must be predictable, resilient, and deterministic. No UI component may render in an indeterminate state, show raw unhandled exceptions, leak cross-tenant metadata during loading, or bypass authorization checks during network transitions.

Every data-driven screen and form component in the application must strictly implement the standard state machine defined herein.

---

## 2. Universal Data-Driven Screen State Machine

Every screen that fetches, presents, or synchronizes data transitions through a deterministic state machine:

```
                  ┌────────────────┐
                  │    INITIAL     │
                  └───────┬────────┘
                          │ (Fetch triggered)
                          ▼
                  ┌────────────────┐
                  │    LOADING     │◄──────────────────┐
                  └───────┬────────┘                   │
                          │                            │
         ┌────────────────┼────────────────┬───────────┤ (Re-fetch / Retry)
         │                │                │           │
         ▼                ▼                ▼           │
 ┌───────────────┐┌───────────────┐┌───────────────┐   │
 │    SUCCESS    ││     EMPTY     ││  ERROR STATE  │───┘
 └───────┬───────┘└───────────────┘└───────┬───────┘
         │                                 │
         │                                 ├──► 401 UNAUTHENTICATED
         ▼                                 ├──► 403 FORBIDDEN / SCOPE REJECT
 ┌───────────────┐                         ├──► 402 MODULE DISABLED
 │ PARTIAL DATA  │                         ├──► 404 NOT FOUND / CROSS-TENANT
 └───────────────┘                         └──► NETWORK FAILURE / OFFLINE
```

---

## 3. Detailed Screen States Specification

### State 1: `LOADING` (Content Skeleton & Suspense)
* **Trigger**: Initial server-side streaming render or client-side route navigation awaiting React Server Component (RSC) payload / server action resolution.
* **UX Contract**:
  - Never display a generic, full-screen blank white page or an unstyled spinning wheel.
  - Render an animated structural skeleton (`tailwind-animate pulse` or CSS shimmer) mirroring the exact geometry of the target screen:
    - Tables: Render header bar, search bar placeholder, and 5 skeleton table rows with column-proportional grey blocks.
    - Detail views: Render header avatar circle, title placeholder, metadata pill placeholders, and tab content rectangles.
    - Dashboards: Render metric card blocks and chart skeleton cards with identical aspect ratios to prevent Cumulative Layout Shift (CLS < 0.05).
  - Retain existing data visible with a subtle top progress bar (`nprogress` style) during background refreshes or pagination queries.
* **Security & Performance**: Zero tenant data is rendered until the server returns a fully validated response. Time-to-Skeleton must be < 150ms.

### State 2: `SUCCESS` (Full Data Presentation)
* **Trigger**: Data successfully resolved, tenant isolation verified, caller permissions evaluated, and access scope applied.
* **UX Contract**:
  - Full interactive interface rendered with semantic HTML5 elements.
  - Interactive controls (search, sort, filter, pagination, row actions) fully hydrated and active.
  - Contextual header with breadcrumbs and active tenant/school badge visible.

### State 3: `EMPTY` (Zero Domain Records)
* **Trigger**: Query returned an empty dataset (`items.length === 0`) under the verified tenant context and applied filters.
* **UX Contract**:
  - Must differentiate between **Absolute Empty** (no records exist in the institution) and **Filtered Empty** (no records match current search/filter criteria).
  - Absolute Empty State:
    - Domain-specific SVG illustration (neutral, modern style).
    - Clear explanatory heading (e.g., "No students enrolled yet").
    - Reassuring body text describing the purpose of the screen.
    - Contextual Primary Action button if the user has `create` permission (e.g., "Enroll First Student"); if caller lacks `create` permission, display instructions to contact the institution administrator.
  - Filtered Empty State:
    - Heading: "No matching records found".
    - Body: "No results found matching your current filter criteria."
    - Action button: "Clear All Filters" (resets filter form and re-fetches list).

### State 4: `PARTIAL DATA` (Graceful Degradation)
* **Trigger**: Primary entity data successfully fetched, but optional or downstream secondary micro-services/relations are degraded, rate-limited, or empty (e.g., Student profile loaded, but real-time bus tracking or fee balance is unreachable).
* **UX Contract**:
  - Primary UI renders normally; affected sub-card or widget renders a subtle inline warning state: "Information temporarily unavailable".
  - Includes a localized retry button (`Refresh Card`) without reloading the entire page.
  - Prevents total screen failure due to non-critical subsystem degradation.

### State 5: `UNAUTHORIZED` (HTTP 401 — Unauthenticated Session)
* **Trigger**: Request lacks a valid Clerk session token, session has expired, or token was revoked.
* **UX Contract**:
  - Middleware intercepts immediately and redirects the user to `/auth/sign-in` with an encoded `redirect_url` query parameter.
  - For AJAX / Server Action mutations, returns `{ success: false, error: { code: 'UNAUTHENTICATED', message: 'Your session has expired. Please sign in again.' } }`. Client surfaces a modal prompt or redirect.

### State 6: `FORBIDDEN` (HTTP 403 — Insufficient RBAC / Access Scope)
* **Trigger**: User is authenticated and belongs to the tenant, but lacks the required atomic permission string (e.g., lacks `attendance.approve`) or attempted an operation outside their authorized `AccessScope` (e.g., a teacher attempting to view grades of an unassigned class).
* **UX Contract**:
  - Dedicated full-page or contained boundary view:
    - Shield/lock icon (`lucide-react` / SVG).
    - Heading: "Access Denied".
    - Body: "You do not have permission to view this resource. If you believe this is an error, please contact your institution administrator."
    - Does **not** disclose internal database role keys, stack traces, or technical error logs to the end user.
    - Provides a primary button: "Return to Dashboard" (`/tenant/dashboard`).
  - Emits a structured security audit log entry (`SECURITY_AUTHORIZATION_FAILURE`) recording `userId`, `tenantId`, `requiredPermission`, and `ipAddress`.

### State 7: `MODULE DISABLED` (HTTP 402 — Subscription / Entitlement Gate)
* **Trigger**: Tenant's active subscription tier does not license the requested module key (e.g., School is on `BASIC_TIER` attempting to access `/tenant/report-cards` requiring `report_card_module`).
* **UX Contract**:
  - Clean upgrade illustration with lock badge.
  - Heading: "Module Not Included".
  - Body: "The [Module Name] module is not enabled for [School Name]. Upgrade your institution's subscription plan to access advanced capabilities."
  - Action for Tenant Admin: "View Subscription Plans" (`/account/subscription` or contact platform sales).
  - Action for Non-Admin Staff/Students: "Contact Administrator".
  - Absolutely zero underlying business data or table headers are revealed.

### State 8: `NOT FOUND` (HTTP 404 — Cross-Tenant / Missing Entity)
* **Trigger**: Requested entity ID does not exist in the database OR belongs to another tenant.
* **Security Invariant**: Any cross-tenant query MUST resolve to `404 Not Found` rather than `403 Forbidden` to prevent tenant enumeration attacks.
* **UX Contract**:
  - Heading: "Record Not Found".
  - Body: "The requested record could not be found. It may have been deleted, moved, or the link is invalid."
  - Action: "Back to List".

### State 9: `NETWORK FAILURE / OFFLINE` (Connectivity Degraded)
* **Trigger**: Client browser loses network connectivity or server API times out (> 10,000ms).
* **UX Contract**:
  - Top fixed offline banner: "You are currently offline. Changes will not sync."
  - Cached data remains readable if cached in Service Worker / IndexedDB (for PWA-critical screens).
  - Mutation buttons (Save, Submit) are visually disabled with an offline tooltip.
  - Automatic reconnection listener triggers background re-validation when connectivity is restored.

---

## 4. Standardized Form States Contract

Every interactive form across modal dialogs, drawer sidebars, and full-page wizards must support the following states:

| Form State | Visual Indicator | Interaction Rules | Technical Contract |
| :--- | :--- | :--- | :--- |
| **Pristine** | Clean input fields with placeholders and required asterisks (`*`). | Submit button disabled or enabled based on initial validity; cancel button active. | `isDirty === false`, `isValid === true/false`. |
| **Dirty / Editing** | Real-time input validation on blur; dirty indicator active. | Unsaved changes guard: if user attempts navigation away, prompt browser `beforeunload` or router dialog. | `isDirty === true`. |
| **Field Validation Error** | Red border (`border-red-500`), error icon, and red descriptive text below input. | Focus moves automatically to the first invalid field upon form submit attempt. Screen readers announce error via `aria-describedby` and `aria-invalid="true"`. | Zod schema evaluation failure on client or server. |
| **Submitting** | All input controls locked (`disabled`); Submit button displays spinner and text "Saving...". | Form controls cannot be edited; duplicate submissions blocked via idempotency token and disabled button. | Async Server Action in-flight. |
| **Submission Success** | Toast notification (top-right or bottom-center): "Record created successfully." | Form resets or modal closes; data list is optimistically updated or revalidated via `router.refresh()`. | Server returns `{ success: true, data: { ... } }`. |
| **Submission Failed** | Banner alert at top of form: "Failed to save record. [Specific actionable reason]." | Form fields remain populated with user input so work is not lost; fields causing failure highlighted. | Server returns `{ success: false, error: { message, fieldErrors } }`. |
| **Duplicate Detected** | Alert badge: "A record with this identifier (e.g. Admission No) already exists in this institution." | User given option to view existing record or modify unique field. | Database composite unique constraint violation caught gracefully. |
| **Unsaved Changes Dialog** | Modal dialog: "You have unsaved changes. Are you sure you want to leave without saving?" | Buttons: "Keep Editing" (primary) vs "Discard Changes" (destructive secondary). | Navigation interception. |

---

## 5. Screen State Implementation Checklist

Developers and code generation agents must verify:
- [ ] Screen renders corresponding Skeleton within 150ms of navigation.
- [ ] Screen checks `tenantContext` and renders `404` for missing/cross-tenant resources.
- [ ] Screen checks `ModuleEntitlement` and renders `402` when module key is unlicensed.
- [ ] Screen checks `Permission` + `AccessScope` and renders `403` when unauthorized.
- [ ] Screen separates Absolute Empty from Filtered Empty with actionable recovery buttons.
- [ ] Forms disable inputs and submit buttons during in-flight mutations.
- [ ] Forms preserve user input when server-side validation fails.
