# Global Screen States & Interaction Feedback Standards

## 1. Overview & Consistency Mandate

**Status**: TARGET / PROPOSED

To ensure a seamless, professional user experience across all modules, every screen must adhere to standardized UI states. Inconsistent loading spinners, raw unhandled error dumps, or blank screens are strictly prohibited.

---

## 2. Standard States for Data-Driven Screens

```
                                [ User Navigates to Route ]
                                             |
                                             v
                                  { 1. LOADING STATE }
                               (Route Skeleton / Suspense)
                                             |
                     +-----------------------+-----------------------+
                     |                       |                       |
                     v                       v                       v
            { 2. SUCCESS STATE }    { 3. EMPTY STATE }     { 4. ERROR STATES }
          (Renders Data / Table)   (Zero Records Found)              |
                     |                                               v
                     |                                    +----------+----------+
                     v                                    |                     |
           { 5. PARTIAL DATA }                            v                     v
         (Stale Cache + Background               [ Auth / Perm Error ]  [ System Error ]
                Revalidation)                    - 401 Unauthorized      - 404 Not Found
                                                 - 403 Forbidden         - 500 Failure
                                                 - 402 Module Disabled   - Network Drop
```

### Detailed State Specifications:

1. **Loading State (`loading.tsx`)**:
   - Next.js Server Component streaming renders an accessible, animated Tailwind skeleton matching the target layout (e.g. table rows, card grids) within 50ms of navigation.
2. **Success State**:
   - Displays fully rendered data with active search, filters, pagination, and action buttons.
3. **Empty State**:
   - Renders when a database query returns zero records. MUST include a friendly illustration, a clear explanation (e.g. *"No students enrolled in Grade 10-A yet"*), and a prominent Primary Action button (e.g. `+ Enroll First Student`) if the user possesses create permissions.
4. **Partial Data / Revalidating State**:
   - For PWA or stale-while-revalidate screens (e.g. timetable), displays cached snapshot instantly while a subtle background indicator (e.g. *"Updating schedule..."*) shows active synchronization.
5. **Unauthorized State (HTTP 401)**:
   - User session is missing or expired. Automatically redirects to `/auth/sign-in` with a `returnUrl` query parameter.
6. **Forbidden State (HTTP 403 - Access Denied)**:
   - User is authenticated, but their active role/membership lacks the required permission or access scope. Renders a clean "Access Restricted" view with an option to return to the active dashboard.
7. **Module Disabled State (HTTP 402 - Feature Licensing Gate)**:
   - User attempts to access an optional module (e.g. `/tenant/finance`) that is disabled in the institution's current subscription tier. Renders an institutional upgrade banner with contact options for the School Administrator.
8. **Not Found State (HTTP 404)**:
   - Entity ID does not exist OR belongs to another tenant. Masks tenant existence by rendering a generic *"The requested record could not be found"* message.
9. **Network Failure State**:
   - Offline or disconnected. Displays a top banner (*"You are currently offline. Viewing cached data."*) and disables destructive mutation buttons until connectivity resumes.

---

## 3. Specialized Form States & Validation Feedback

All form dialogs, modals, and submission workflows enforce the following interactive states:

| Form State | Visual Trigger & Behavior | Technical Mechanism |
| :--- | :--- | :--- |
| **Pristine / Idle** | Form dialog opens with pre-filled or empty fields. Primary submit button is active. | Initial form mount. |
| **Validation Error** | User enters invalid data (e.g. malformed email or exam score > 100). Inline red helper text appears below specific field immediately on blur. | React Hook Form + Zod resolver (`errors.[field].message`). |
| **Submitting** | User clicks submit. Primary button transitions to disabled state with animated spinner (*"Saving student record..."*). Form inputs become read-only. | `isSubmitting` / React `useFormStatus().pending`. |
| **Submission Success** | Mutation succeeds. Server action returns `{ success: true }`. Form dialog closes automatically; success toast displays (*"Student enrolled successfully"*); target table refreshes. | React Toastify + `revalidatePath()`. |
| **Submission Failed** | Server action rejects request (e.g. unique constraint collision). Error alert appears at top of form (*"A class named '10-A' already exists in your institution"*). Fields remain populated. | Server Action error envelope (`error.message`). |
| **Unsaved Changes** | User makes edits to a form and attempts to close the dialog or navigate away. Browser warning prompt prevents accidental loss (*"You have unsaved changes. Are you sure you want to discard them?"*). | `isDirty` state tracking. |
| **Destructive Confirmation**| User triggers high-consequence deletion (e.g. delete teacher). Screen renders a dedicated confirmation modal requiring the user to type the entity name to confirm. | Two-step confirmation dialog. |
