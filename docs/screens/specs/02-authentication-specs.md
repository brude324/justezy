# Detailed Screen Specifications: Authentication & Identity Suite

## Screen 4: AUT-01 — Unified Sign-In Portal
1. **Screen ID**: `AUT-01`
2. **Screen Name**: Unified Sign-In Portal
3. **Route**: `/auth/sign-in` (or tenant-scoped equivalent)
4. **Module**: Authentication & Identity (`clerk_auth`)
5. **Scope**: Global / Tenant Login Scope
6. **Primary User(s)**: All Users (SaaS Super Admins, Institution Admins, Teachers, Staff, Students, Parents)
7. **Secondary User(s)**: New users signing in for the first time
8. **Purpose**: Authenticate user credentials securely via Clerk Identity Service, establish a cryptographically signed session, trigger PostgreSQL user record sync/verification, and route the user to their authorized institutional dashboard.
9. **Entry Points**: Direct access, login button on public landing `PUB-01`, portal finder `PUB-03`, unauthenticated redirect from protected routes (HTTP 401).
10. **Navigation Placement**: Standalone authentication layout (no main app sidebar).
11. **Required Permissions**: None (Unauthenticated).
12. **Required Module Entitlement**: None.
13. **Required Tenant Context**: Optional (if accessed on tenant subdomain, displays custom tenant branding/logo; if on root domain, displays platform branding).
14. **Data Displayed**: Institution/Platform Logo, Institution Name, Sign-in Form (Email/Username/Phone, Password), "Remember this device" checkbox, "Forgot password?" link, SSO buttons (if enabled for institution: Google Workspace / Microsoft 365), security reassurance footer.
15. **Filters**: None.
16. **Search**: None.
17. **Sorting**: N/A.
18. **Pagination**: N/A.
19. **Primary Actions**: "Sign In" button (triggers Clerk authentication API).
20. **Secondary Actions**: "Sign in with Google / Microsoft" (SSO flow), "Forgot password?" (navigates to `AUT-04`), "Find School" (navigates to `PUB-03`).
21. **Bulk Actions**: None.
22. **Row Actions**: None.
23. **Forms**: Sign-in form.
24. **Form Fields**: Identifier (`string`: email, username, or phone; required), Password (`password`, required), Remember Me (`boolean`, optional).
25. **Validation Rules**: Identifier must not be empty; password must be at least 8 characters.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Session cookie set; Clerk session claims resolved; background webhook/middleware synchronizes `User` and `TenantMembership` in PostgreSQL; redirects to appropriate dashboard (`TNT-DSH-01` for Admin, `TNT-DSH-02` for Teacher, `TNT-DSH-03` for Student, `TNT-DSH-04` for Parent, or `PLT-01` for Platform Admin) or respects original `redirect_url`.
28. **Error Behavior**: Invalid credentials display alert: "Invalid email or password. Please verify your credentials." Account locked alert displayed if rate-limited.
29. **Empty State**: N/A.
30. **Loading State**: Submit button spinner, form inputs disabled during credential verification.
31. **Forbidden State**: If user authenticates successfully with Clerk but has no active `TenantMembership` or account is marked `SUSPENDED`, display: "Account Suspended or Membership Inactive. Please contact your school administrator."
32. **Module-Disabled State**: If tenant account is suspended by SaaS platform, display: "Institution Access Suspended. Please contact institution administration."
33. **Mobile Behavior**: Responsive centered card; virtual keyboard defaults to email or telephone keypad depending on identifier format; password reveal eye icon.
34. **Tablet Behavior**: Centered modal card over institutional background artwork.
35. **Desktop Behavior**: Split layout (left side: institutional imagery/announcements; right side: centered sign-in card).
36. **PWA Relevance**: Must remain functional when launched as standalone PWA; prompts biometric unlock (WebAuthn/FaceID) if enabled.
37. **Accessibility Considerations**: Full keyboard navigation; inputs have explicit `<label>` tags with matching `for`/`id`; password visibility toggle announced to screen readers.
38. **Audit Requirements**: Clerk records login attempt; application writes `UserSession` / security audit log upon successful session establishment.
39. **Notification/Event Side Effects**: If login from new device/unrecognized IP, trigger security notification email to user.
40. **Dependencies on Other Screens/Modules**: Redirects to `AUT-03` if MFA is required; links to `AUT-04`.

---

## Screen 5: AUT-02 — Invitation Onboarding Portal
1. **Screen ID**: `AUT-02`
2. **Screen Name**: Invitation Onboarding Portal
3. **Route**: `/auth/accept-invite`
4. **Module**: Authentication & Identity (`clerk_auth`)
5. **Scope**: Global / Tenant Onboarding
6. **Primary User(s)**: Newly invited Teachers, Staff Members, or Students/Parents
7. **Secondary User(s)**: Institution Admin verifying invite link
8. **Purpose**: Validate cryptographic invitation token, bind user identity to their pre-provisioned `TenantMembership`, set initial password, and collect mandatory onboarding details.
9. **Entry Points**: Unique secure URL received via Email or SMS invitation (e.g., `/auth/accept-invite?token=xyz...`).
10. **Navigation Placement**: Standalone onboarding layout.
11. **Required Permissions**: Valid non-expired invitation token.
12. **Required Module Entitlement**: None.
13. **Required Tenant Context**: Derived from token payload (e.g., tenantId, assigned role, pre-filled email/phone).
14. **Data Displayed**: School Logo, School Name, Welcome Message ("Welcome to [School Name]"), Invitee Name and Pre-assigned Role ("You have been invited as a Faculty Member / Teacher"), Token status.
15. **Filters**: None.
16. **Search**: None.
17. **Sorting**: N/A.
18. **Pagination**: N/A.
19. **Primary Actions**: "Complete Setup & Activate Account" button.
20. **Secondary Actions**: "Need Help?" (contact support link).
21. **Bulk Actions**: None.
22. **Row Actions**: None.
23. **Forms**: Account activation form.
24. **Form Fields**: Full Name (pre-filled, editable if allowed), New Password (`password`, required), Confirm Password (`password`, required), Agree to Terms & Privacy Policy (`checkbox`, required).
25. **Validation Rules**: Password must satisfy policy: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char; passwords must match exactly; checkbox must be checked.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Clerk user credentials initialized; PostgreSQL `TenantMembership` transitioned from `INVITED` to `ACTIVE`; user automatically logged in and routed to welcome tour or dashboard.
28. **Error Behavior**: If token is expired or already used, render error state: "This invitation link has expired or has already been used. Please request a new invitation from your school administrator."
29. **Empty State**: N/A.
30. **Loading State**: Token validation spinner on initial load ("Verifying invitation...").
31. **Forbidden State**: Renders error state if token signature fails or is tampered with.
32. **Module-Disabled State**: Renders error if inviting tenant is currently suspended.
33. **Mobile Behavior**: Single-column clean mobile wizard; password strength meter dynamically updates.
34. **Tablet Behavior**: Centered card layout.
35. **Desktop Behavior**: Centered card layout with school branding.
36. **PWA Relevance**: Can be launched directly from SMS link on mobile device.
37. **Accessibility Considerations**: Password rules list dynamically marks off requirements with green checkmarks and screen reader live announcements.
38. **Audit Requirements**: Writes `AuditLog` (`action: INVITATION_ACCEPTED`, `userId`, `tenantId`, `role`).
39. **Notification/Event Side Effects**: Sends welcome email to user; notifies institution administrator of completed onboarding.
40. **Dependencies on Other Screens/Modules**: Transitions user to `TNT-DSH-01`, `TNT-DSH-02`, or `TNT-DSH-03`.

---

## Screen 6: AUT-03 — Multi-Factor Authentication Verification
1. **Screen ID**: `AUT-03`
2. **Screen Name**: Multi-Factor Authentication Verification
3. **Route**: `/auth/mfa`
4. **Module**: Authentication & Identity (`clerk_auth`)
5. **Scope**: Global / Tenant Auth Boundary
6. **Primary User(s)**: Staff, Principals, and Admins with MFA enforced
7. **Secondary User(s)**: Any user who opted into TOTP / SMS 2FA
8. **Purpose**: Challenge the user for secondary proof of identity (Authenticator App TOTP or SMS OTP) before granting session token for protected routes.
9. **Entry Points**: Triggered automatically during sign-in flow (`AUT-01`) if user account or institutional policy mandates MFA.
10. **Navigation Placement**: Standalone auth layout.
11. **Required Permissions**: Valid intermediate Clerk authentication ticket (Level 1 pass).
12. **Required Module Entitlement**: None.
13. **Required Tenant Context**: Inherited from login flow.
14. **Data Displayed**: MFA shield icon, instruction text ("Enter the 6-digit verification code from your authenticator app" or "Code sent to +91 ******4521"), 6-digit PIN input boxes, "Resend code" countdown timer (for SMS).
15. **Filters**: None.
16. **Search**: None.
17. **Sorting**: N/A.
18. **Pagination**: N/A.
19. **Primary Actions**: "Verify & Continue" (submits 6-digit token to Clerk).
20. **Secondary Actions**: "Try another method" (switch between Authenticator App, SMS OTP, or Backup Recovery Codes).
21. **Bulk Actions**: None.
22. **Row Actions**: None.
23. **Forms**: 6-digit OTP verification form.
24. **Form Fields**: OTP Code (`array of 6 digits` or single string, required), "Trust this browser for 30 days" (`checkbox`, optional).
25. **Validation Rules**: Exactly 6 numerical digits; auto-submits upon completion of 6th digit.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Upgrades session to full authenticated clearance; redirects to target dashboard.
28. **Error Behavior**: Shake animation on OTP input; displays "Incorrect verification code. Please try again."
29. **Empty State**: N/A.
30. **Loading State**: Inputs disabled with inline spinner during verification.
31. **Forbidden State**: If max verification attempts exceeded (> 5), locks account temporarily and displays: "Too many failed attempts. Please try again in 15 minutes."
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Native numeric keypad opened automatically; supports WebOTP API on mobile Safari and Chrome to auto-fill SMS code with one tap.
34. **Tablet Behavior**: Centered modal card.
35. **Desktop Behavior**: Centered modal card; auto-focuses first input digit; auto-advances to next digit on keystroke; handles paste of full 6-digit string.
36. **PWA Relevance**: Critical security checkpoint on mobile PWA.
37. **Accessibility Considerations**: Grouped inputs have `aria-label="Digit 1 of 6"`; errors announced via live region.
38. **Audit Requirements**: Clerk logs 2FA verification success/failure; application logs audit event on failure threshold.
39. **Notification/Event Side Effects**: SMS notification triggered if SMS fallback selected.
40. **Dependencies on Other Screens/Modules**: Preceded by `AUT-01`, leads to dashboard.

---

## Screen 7: AUT-04 — Password Reset Portal
1. **Screen ID**: `AUT-04`
2. **Screen Name**: Password Reset Portal
3. **Route**: `/auth/reset-password`
4. **Module**: Authentication & Identity (`clerk_auth`)
5. **Scope**: Global / Tenant
6. **Primary User(s)**: Users who forgot their password
7. **Secondary User(s)**: Users prompted for mandatory periodic password rotation
8. **Purpose**: Allow users to securely request a password reset email/SMS link and establish a new compliant password.
9. **Entry Points**: "Forgot password?" link on `AUT-01`.
10. **Navigation Placement**: Standalone auth layout.
11. **Required Permissions**: Public (Step 1); Valid reset token (Step 2).
12. **Required Module Entitlement**: None.
13. **Required Tenant Context**: Optional (inherits tenant styling if on tenant subdomain).
14. **Data Displayed**: Step 1: Identifier input with instructions ("Enter your registered email address or phone number"). Step 2: "Check your inbox" confirmation screen or New Password input form if accessed via reset token link.
15. **Filters**: None.
16. **Search**: None.
17. **Sorting**: N/A.
18. **Pagination**: N/A.
19. **Primary Actions**: Step 1: "Send Reset Link"; Step 2: "Update Password & Sign In".
20. **Secondary Actions**: "Return to Sign In" (navigates back to `AUT-01`).
21. **Bulk Actions**: None.
22. **Row Actions**: None.
23. **Forms**: Password Reset Request Form (Step 1) / Set New Password Form (Step 2).
24. **Form Fields**: Step 1: Email or Phone (`string`, required). Step 2: New Password (`password`, required), Confirm New Password (`password`, required).
25. **Validation Rules**: Email/phone format validation; new password must meet complexity rules and cannot match last 3 historical passwords.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Step 1: Confirmation banner: "If an account exists with that identifier, a reset link has been dispatched." (prevents user enumeration). Step 2: Toast: "Password updated successfully." Redirects to `AUT-01`.
28. **Error Behavior**: Inline error validation if passwords do not match or token has expired.
29. **Empty State**: N/A.
30. **Loading State**: Button spinner during reset dispatch or password update.
31. **Forbidden State**: If reset token is expired or revoked, displays: "Reset link has expired. Please request a new one."
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Responsive centered layout; password toggle visible.
34. **Tablet Behavior**: Centered modal card.
35. **Desktop Behavior**: Centered modal card with clean branding.
36. **PWA Relevance**: None.
37. **Accessibility Considerations**: Accessible form controls; password rules announced.
38. **Audit Requirements**: Password reset requests and completions logged to security audit log.
39. **Notification/Event Side Effects**: Dispatches password reset email/SMS via Clerk notification worker.
40. **Dependencies on Other Screens/Modules**: Routes to `AUT-01` upon completion.
