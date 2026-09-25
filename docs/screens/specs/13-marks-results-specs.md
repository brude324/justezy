# Detailed Screen Specifications: Marks, Results & Report Cards Suite

## Screen 35: TNT-MRK-01 — Marks Entry Grid & Results
1. **Screen ID**: `TNT-MRK-01`
2. **Screen Name**: Marks Entry Grid & Results
3. **Route**: `/tenant/results`
4. **Module**: Examination & Evaluation (`exam_module`)
5. **Scope**: Institutional Scope for Admins / Assigned Subject Scope (`AccessScope.ASSIGNED_ONLY`) for Teachers
6. **Primary User(s)**: Subject Teachers (entering marks), Exam Controllers, Class Teachers
7. **Secondary User(s)**: Institution Admin, Principal (reviewing and publishing)
8. **Purpose**: Rapid spreadsheet-like marks entry matrix for teachers to enter raw examination marks, practical scores, and remarks for all enrolled students in a selected class and exam paper, with auto-calculating percentages, pass/fail indicators, and publish controls.
9. **Entry Points**: "Enter / View Marks" action on `TNT-EXM-01`; sidebar under "Examinations" -> "Marks Entry"; quick link from Teacher Dashboard `TNT-DSH-02`.
10. **Navigation Placement**: Secondary link under "Examinations" in institutional sidebar.
11. **Required Permissions**: `result.enter` (to input scores); `result.read` (to view); `result.publish` (to release to students/parents); `result.export` (to download).
12. **Required Module Entitlement**: `exam_module`
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Header: Target Exam Session (e.g. Mid-Term 2026), Target Class/Section (e.g. 10-A), Target Subject (e.g. Mathematics), Max Marks (e.g. 100), Passing Marks (e.g. 33), Marks Entry Status Badge (`DRAFT`, `SUBMITTED`, `VERIFIED`, `PUBLISHED`).
    - Marks Entry Table: Roll Number, Student Name, Theory Marks Input (`number`), Practical Marks Input (if applicable), Total Marks (auto-calculated), Percentage (auto-calculated), Grade / Remarks Pill (e.g. `A1`, `B2`, `FAIL`), Teacher Remarks (`string`).
    - Summary Footer: Class Average Score (e.g. 74.2%), Highest Score (98), Lowest Score (31), Pass Percentage (94.8%).
15. **Filters**: Exam Session dropdown, Class/Section dropdown, Subject dropdown.
16. **Search**: Search student name or roll number inside roster.
17. **Sorting**: Default sorted strictly by Roll Number (Ascending).
18. **Pagination**: Full class roster rendered on a single view (typically 25–45 students) for keyboard-driven data entry.
19. **Primary Actions**: "Save Marks" (draft save) / "Submit for Verification" (for teachers) / "Publish Results" (for Admins, requires `result.publish`).
20. **Secondary Actions**: "Export Marks Sheet (XLSX/PDF)", "Import Marks from Excel", "Lock Marks Entry".
21. **Bulk Actions**: "Apply Grace Marks (+2)", "Clear Unsaved Scores".
22. **Row Actions**: Enter marks directly into cell; click row to inspect past term history.
23. **Forms**: Marks Entry Matrix Form.
24. **Form Fields**: Exam ID (`string`, required), Class ID (`string`, required), Subject ID (`string`, required), Marks Array: `[{ studentId: string, theoryMarks: number, practicalMarks?: number, isAbsent?: boolean, remarks?: string }]`.
25. **Validation Rules**: Score cannot be negative; Total Score cannot exceed Subject Maximum Marks; if `isAbsent` checked, score is locked to 0 with status `ABSENT`; non-numeric inputs prevented.
26. **Confirmation Requirements**: Publishing results prompts two-step confirmation modal: "Publishing results will make scores visible to 40 students and their guardians, and lock further edits. Do you wish to continue?"
27. **Success Behavior**: Toast: "Marks saved successfully." Table footer statistics dynamically recalculate; cells flash green on successful save.
28. **Error Behavior**: Input turns red with tooltip if score exceeds max marks (e.g., "Score cannot exceed 100"); server errors display top alert.
29. **Empty State**: "No exam papers found for the selected combination. Please configure the exam timetable first."
30. **Loading State**: Table skeleton loader with 15 rows showing input box placeholders.
31. **Forbidden State**: Renders `403 Forbidden` if a teacher attempts to enter marks for a subject/class they are not assigned to teach.
32. **Module-Disabled State**: HTTP 402 Module Disabled if `exam_module` is unlicensed.
33. **Mobile Behavior**: Responsive cards with student avatar, roll number, and large numerical input field with quick 'Absent' toggle; sticky bottom save bar.
34. **Tablet Behavior**: Full spreadsheet table with on-screen numerical keypad support.
35. **Desktop Behavior**: `DESKTOP-PRIMARY` high-speed spreadsheet: Tab/Enter keys advance focus to next student row; arrow keys navigate cells; instant auto-calculation of grades.
36. **PWA Relevance**: `DESKTOP-PRIMARY` (Data-entry intensive).
37. **Accessibility Considerations**: Accessible form inputs with `aria-label="Marks for [Student Name], Max 100"`; live announcement of class statistics.
38. **Audit Requirements**: All marks entries, corrections, and publishing events strictly logged in `AuditLog` recording `oldScore`, `newScore`, and `actorId`.
39. **Notification/Event Side Effects**: Publishing results queues BullMQ notification jobs dispatching result announcements to students and parents.
40. **Dependencies on Other Screens/Modules**: Depends on `TNT-EXM-01`, `TNT-CLS-01`, `TNT-SUB-01`, `TNT-STU-01`; feeds into `TNT-MRK-02`.

---

## Screen 36: TNT-MRK-02 — Term Report Card & Academic Summary
1. **Screen ID**: `TNT-MRK-02`
2. **Screen Name**: Term Report Card & Academic Summary
3. **Route**: `/tenant/report-cards`
4. **Module**: Examination & Evaluation (`report_card_module`)
5. **Scope**: Institutional Scope for Admins / Assigned Scope for Class Teachers / Self Scope for Students / Linked Scope for Parents
6. **Primary User(s)**: Class Teachers (generating/signing), Institution Admin, Students, Parents
7. **Secondary User(s)**: Academic Counselors
8. **Purpose**: Generate, review, sign, and distribute official institutional student report cards and academic transcripts (CBSE / State Board compliant): aggregated subject scores, percentage, letter grades, attendance summary, co-curricular ratings, and teacher remarks.
9. **Entry Points**: "View Report Card" button on Student/Parent Dashboards `TNT-DSH-03`, `TNT-DSH-04`; Student 360 profile `TNT-STU-02`; sidebar link under "Academics" -> "Report Cards".
10. **Navigation Placement**: Secondary link under "Academics" or "Examinations" in institutional sidebar.
11. **Required Permissions**: `report_card.read` (to view); `report_card.generate` (to build); `report_card.publish` (to release); `report_card.export` (to download PDF).
12. **Required Module Entitlement**: `report_card_module` (Entitlement-controlled optional module).
13. **Required Tenant Context**: Mandatory verified `tenantId`.
14. **Data Displayed**:
    - Mode A (Admin / Teacher Batch Manager): Class Selector, Term Selector, Report Card Generation Progress (e.g. "38/40 Generated"), Batch Actions (Generate All, Publish All, Print All).
    - Mode B (Individual Report Card Preview): Official Institution Header (School Name, Affiliation Code, School Crest/Logo, Address). Student Bio Block (Name, Admission No, Roll No, Grade & Section, DOB, Attendance %: e.g. 96.5%). Scholastic Achievement Table: Subject Name, Maximum Marks, Marks Obtained, Grade Points, Letter Grade (A1, A2, B1...), Subject Teacher Remarks. Co-Scholastic Grades: Work Education, Art Education, Health & Physical Education. Overall Performance: Grand Total, Aggregate Percentage, Class Rank (optional), Class Teacher Remarks, Principal Signature block.
15. **Filters**: Academic Year dropdown, Term dropdown, Class/Section dropdown, Student Selector.
16. **Search**: Search by Student Name or Admission Number.
17. **Sorting**: Sort by Roll Number or Class Rank.
18. **Pagination**: In batch list: 25 students per page.
19. **Primary Actions**: "Generate Batch Report Cards" (for teachers/admins) / "Download Report Card (PDF)" (for all authorized users).
20. **Secondary Actions**: "Publish Report Cards to Parents" (requires `report_card.publish`), "Edit Remarks", "Print Bulk PDF".
21. **Bulk Actions**: "Generate Selected", "Publish Selected", "Download Combined Class PDF".
22. **Row Actions**: "Preview PDF", "Edit Teacher Remarks", "Publish Individual Card".
23. **Forms**: Teacher Remarks & Co-Scholastic Assessment Form.
24. **Form Fields**: General Remarks (`textarea`, e.g. "Hardworking and attentive student"), Discipline Rating (`dropdown: A, B, C`), Sports/Arts Rating (`dropdown: A, B, C`), Promotion Status (`dropdown: PROMOTED, DETAINED, CONDITIONAL`).
25. **Validation Rules**: All subject marks must be verified and published before generating official report card; teacher remarks required before signing.
26. **Confirmation Requirements**: Publishing batch report cards prompts modal: "Are you sure you want to release report cards for Grade 10-A? Report cards will become immediately downloadable by 40 parent accounts."
27. **Success Behavior**: Report card PDF generated on server; preview renders with high-fidelity print styling; toast confirms: "Report card generated successfully."
28. **Error Behavior**: If missing subject marks exist, shows blocker banner: "Cannot generate report cards. Mathematics marks for Grade 10-A have not been entered."
29. **Empty State**: "No report cards generated for this term yet. Click 'Generate Batch Report Cards' to compile student scores."
30. **Loading State**: Document preview skeleton loader with simulated letterhead and grade table blocks.
31. **Forbidden State**: Renders `403 Forbidden` if student or parent attempts to inspect report cards of other students.
32. **Module-Disabled State**: `402 Payment Required` with Upgrade Prompt: "The Advanced Report Card & Transcript Module is an optional add-on. Upgrade your school's subscription to generate automated CBSE/ICSE digital report cards."
33. **Mobile Behavior**: Mobile-responsive document view with prominent "Download PDF" floating button; pinch-to-zoom enabled on PDF preview.
34. **Tablet Behavior**: Side-by-side student list and report card preview pane.
35. **Desktop Behavior**: Full-screen document previewer with print formatting, template selector, and digital signature stamps.
36. **PWA Relevance**: `PWA-CRITICAL` (Parents download and view report card PDFs on mobile PWA).
37. **Accessibility Considerations**: Accessible HTML tables for scholastic grades; PDF downloads tagged for screen reader accessibility; high contrast letter grades.
38. **Audit Requirements**: Report card generation, publishing, and individual PDF downloads logged in `AuditLog`.
39. **Notification/Event Side Effects**: Publishing report cards dispatches celebratory push notifications and SMS alert with secure download link to parents.
40. **Dependencies on Other Screens/Modules**: Aggregates final data from `TNT-EXM-01`, `TNT-MRK-01`, `TNT-ATT-02`, `TNT-STU-02`.
