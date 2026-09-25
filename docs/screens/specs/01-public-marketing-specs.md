# Detailed Screen Specifications: Public & Marketing Suite

## Screen 1: PUB-01 — Public Platform Landing
1. **Screen ID**: `PUB-01`
2. **Screen Name**: Public Platform Landing
3. **Route**: `/public` (maps to `/` on root domain)
4. **Module**: Public & Marketing (`public_web`)
5. **Scope**: Global Public
6. **Primary User(s)**: Prospective School Leadership, Inquiring Educational Institutions
7. **Secondary User(s)**: Parents and students seeking their institutional login portal
8. **Purpose**: Showcase the SchoolyardSMS value proposition, feature capabilities, institutional benefits, compliance (CBSE/State Board), and convert visitors into trial/demo signups.
9. **Entry Points**: Direct domain navigation (`schoolyardsms.in`, `justezy.com`), search engine links, referral marketing campaigns.
10. **Navigation Placement**: Root unauthenticated navbar: Brand Logo, "Features", "Pricing", "Find Your School", CTA "Request Demo", CTA "Sign In".
11. **Required Permissions**: None (Unauthenticated Public).
12. **Required Module Entitlement**: None.
13. **Required Tenant Context**: None (Platform Root).
14. **Data Displayed**: Hero marketing copy, interactive product feature highlights (Academics, Attendance, Marks, Parent Engagement), institution testimonials, security badge (DPDP Act compliant, cloud hosted in India), live metrics counter (trusted by institutions), footer links.
15. **Filters**: None.
16. **Search**: None on landing (links to `PUB-03` for school search).
17. **Sorting**: N/A.
18. **Pagination**: N/A.
19. **Primary Actions**: "Request a School Demo" (triggers lead capture modal/form), "Sign In" (redirects to `/auth/sign-in`).
20. **Secondary Actions**: "Find My School Portal" (redirects to `/public/find-school`), "View Pricing" (redirects to `/public/pricing`).
21. **Bulk Actions**: None.
22. **Row Actions**: None.
23. **Forms**: "Request Demo / Lead Capture" form modal.
24. **Form Fields**: Institution Name (`string`, required), Contact Person Name (`string`, required), Official Email (`email`, required), Phone Number (`phone`, required), Institution Type (`dropdown: K-12 School, College, Coaching/Group`, required), Student Strength (`number/tier`, required), State/City (`string`, required).
25. **Validation Rules**: Phone must be valid 10-digit Indian mobile; email must be valid RFC-5322 format; student strength must be > 0.
26. **Confirmation Requirements**: None (instant confirmation message).
27. **Success Behavior**: Displays success modal: "Thank you for your interest! A SaaS institutional consultant will reach out to you within 24 hours." Form fields reset.
28. **Error Behavior**: Inline field error highlighting if validation fails; toast notification if lead submission service fails.
29. **Empty State**: N/A (Static marketing page).
30. **Loading State**: Hero image lazy-loading with CSS shimmer placeholder.
31. **Forbidden State**: N/A.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Responsive hamburger menu drawer; hero CTA stacked vertically; touch-friendly 48px tap targets.
34. **Tablet Behavior**: 2-column feature grid; full navbar visible.
35. **Desktop Behavior**: Full-width container; multi-column layout; interactive micro-animations on feature cards.
36. **PWA Relevance**: Minimal (unauthenticated brochureware; not cached offline).
37. **Accessibility Considerations**: WCAG 2.1 AA compliant; high-contrast text (`ratio >= 4.5:1`); semantic `<header>`, `<main>`, `<section>`, `<footer>` landmarks; all images have descriptive `alt` text.
38. **Audit Requirements**: Anonymous lead submission event logged to platform marketing analytics.
39. **Notification/Event Side Effects**: Fires background BullMQ job: sends lead notification email to platform sales team and automated acknowledgment email to applicant.
40. **Dependencies on Other Screens/Modules**: Links to `PUB-02`, `PUB-03`, `AUT-01`.

---

## Screen 2: PUB-02 — Pricing & Plans Matrix
1. **Screen ID**: `PUB-02`
2. **Screen Name**: Pricing & Plans Matrix
3. **Route**: `/public/pricing`
4. **Module**: Public & Marketing (`public_web`)
5. **Scope**: Global Public
6. **Primary User(s)**: School Owners, Principals, Decision Makers
7. **Secondary User(s)**: Institutional IT Administrators
8. **Purpose**: Present transparent subscription tiers (e.g., Starter, Academic Pro, Enterprise Campus), feature breakdowns, student-slab billing calculators, and self-service onboarding or sales contact options.
9. **Entry Points**: Top navigation bar from `PUB-01`, marketing ads.
10. **Navigation Placement**: Unauthenticated root header under "Pricing".
11. **Required Permissions**: None.
12. **Required Module Entitlement**: None.
13. **Required Tenant Context**: None.
14. **Data Displayed**: Plan cards (Starter, Academic Pro, Enterprise), monthly/annual pricing toggles (showing annual discount), feature checklist per plan (attendance, exams, timetable, SMS, custom branding), interactive student count slider estimating annual costs, FAQ accordion.
15. **Filters**: Monthly vs. Annual billing cycle toggle.
16. **Search**: None.
17. **Sorting**: N/A.
18. **Pagination**: N/A.
19. **Primary Actions**: "Get Started" (routes to `/platform/onboarding` or demo request), "Contact Enterprise Sales".
20. **Secondary Actions**: Expand/collapse FAQ questions.
21. **Bulk Actions**: None.
22. **Row Actions**: None.
23. **Forms**: Student count cost estimator slider (`range: 100 to 5000+ students`).
24. **Form Fields**: Student volume slider input.
25. **Validation Rules**: Client-side clamped numerical bounds.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Dynamically updates calculated price per student per month and estimated total.
28. **Error Behavior**: Fallback to standard base tiers if dynamic calculator encounters script error.
29. **Empty State**: N/A.
30. **Loading State**: Skeleton cards for plan comparison matrix.
31. **Forbidden State**: N/A.
32. **Module-Disabled State**: N/A.
33. **Mobile Behavior**: Horizontal scroll carousel or vertically stacked plan comparison cards.
34. **Tablet Behavior**: 3-column side-by-side plan display.
35. **Desktop Behavior**: Full comparison matrix with sticky header for plan names during table scroll.
36. **PWA Relevance**: None.
37. **Accessibility Considerations**: Accessible slider with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`; screen-reader announcements on billing cycle toggle change.
38. **Audit Requirements**: None.
39. **Notification/Event Side Effects**: None.
40. **Dependencies on Other Screens/Modules**: Linked from `PUB-01`, links to `PUB-01` lead modal or `AUT-01`.

---

## Screen 3: PUB-03 — Institutional Portal Finder
1. **Screen ID**: `PUB-03`
2. **Screen Name**: Institutional Portal Finder
3. **Route**: `/public/find-school`
4. **Module**: Public & Marketing (`public_web`)
5. **Scope**: Global Public
6. **Primary User(s)**: Parents, Students, Staff who don't know their school's exact login subdomain/URL
7. **Secondary User(s)**: General public
8. **Purpose**: Allow users to look up their educational institution by name, city, or school code and receive a direct redirect link to their tenant's login portal.
9. **Entry Points**: Public landing navigation "Find Your School", direct link provided in school onboarding SMS/email.
10. **Navigation Placement**: Unauthenticated root header.
11. **Required Permissions**: None.
12. **Required Module Entitlement**: None.
13. **Required Tenant Context**: None.
14. **Data Displayed**: Search input card, results list displaying verified active school names, institution logo, city/state, school board affiliation, and direct "Launch School Portal" button.
15. **Filters**: State dropdown, City dropdown, Board type (CBSE, ICSE, State Board).
16. **Search**: Instant debounced search bar querying public institution directory by name or unique School Code.
17. **Sorting**: Alphabetical by Institution Name.
18. **Pagination**: Max 10 results per query page.
19. **Primary Actions**: "Go to School Portal" (redirects to tenant-specific URL, e.g., `https://greenwood.schoolyardsms.in/auth/sign-in` or `/tenant/greenwood/auth/sign-in`).
20. **Secondary Actions**: "My School is Not Listed" (opens help form).
21. **Bulk Actions**: None.
22. **Row Actions**: Click result row to launch tenant portal.
23. **Forms**: Search and location filter form.
24. **Form Fields**: Search Query (`string`, min 2 chars), State (`string`, optional), City (`string`, optional).
25. **Validation Rules**: Query string sanitized to prevent SQL/XSS injection; minimum 2 characters required before remote query fires.
26. **Confirmation Requirements**: None.
27. **Success Behavior**: Displays matched school cards with verified badges and logos.
28. **Error Behavior**: Network error displays friendly banner: "Unable to search schools right now. Please try again."
29. **Empty State**: "No schools found matching '[Query]'. Check the spelling or ask your school administrator for your unique portal link."
30. **Loading State**: Animated 3-row skeleton card results during debounced fetch.
31. **Forbidden State**: N/A.
32. **Module-Disabled State**: Inactive or suspended tenants are automatically filtered out from public search.
33. **Mobile Behavior**: Mobile-friendly full-width search input with clear button (`X`), touch card results.
34. **Tablet Behavior**: Centered search container with 2-column card results.
35. **Desktop Behavior**: Centered card layout with immediate auto-focus on search input.
36. **PWA Relevance**: PWA discovery page.
37. **Accessibility Considerations**: Live search results announced via `aria-live="polite"`; keyboard navigation through arrow keys to select school results.
38. **Audit Requirements**: None.
39. **Notification/Event Side Effects**: None.
40. **Dependencies on Other Screens/Modules**: Routes to tenant-scoped `AUT-01` sign-in portal.
