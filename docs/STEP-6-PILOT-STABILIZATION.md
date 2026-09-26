# Step 6 — Pilot Stabilization & Issue Triage Register

This document tracks all observations, issues, root causes, corrective actions, and verification results gathered during the Step 6 Production Pilot.

---

## 1. Issue Triage & Stabilization Register

### ITEM 1: Viewport Theme Color Metadata Warning
- **Severity**: P3 (Build Hygiene / Minor)
- **Affected Module**: Next.js App Shell / Root Layout (`src/app/layout.tsx`)
- **Reported By**: Next.js Build Compiler
- **Symptoms**: Warning emitted during `npm run build`: `Unsupported metadata themeColor is configured in metadata export... Please move it to viewport export instead.`
- **Root Cause**: Next.js 14 separated viewport metadata (`themeColor`, `viewport`) from document head metadata (`title`, `description`).
- **Corrective Action**:
  Extracted `themeColor: "#0284c7"` from `metadata` into a dedicated `export const viewport: Viewport` in `src/app/layout.tsx`.
- **Automated Test Added**: `npm run build` static verification.
- **Verification**: `npm run build` compiled 21/21 static pages with zero warnings.
- **Deployment Status**: Merged to main and deployed.

---

### ITEM 2: Rate Limiter Store Iteration in ES5 Build Targets
- **Severity**: P3 (Typecheck / Toolchain)
- **Affected Module**: `src/lib/security/rate-limiter.ts`
- **Reported By**: TypeScript Compiler (`tsc --noEmit`)
- **Symptoms**: `error TS2802: Type 'IterableIterator<[string, RateLimitRecord]>' can only be iterated through when using the '--downlevelIteration' flag`.
- **Root Cause**: Use of `for (const [k, v] of this.store.entries())` without downlevel iteration flag in tsconfig.
- **Corrective Action**:
  Refactored key eviction loop to use native `this.store.forEach((record, key) => ...)` and explicit `(ts: number)` typing.
- **Automated Test Added**: `tests/unit/security/rate-limiter.test.ts`.
- **Verification**: `npm run typecheck` exited with code 0 (0 errors).
- **Deployment Status**: Merged to main and deployed.

---

### ITEM 3: Attendance Roll-Call Bulk Action UX
- **Severity**: P2 (Usability)
- **Affected Module**: Attendance Domain (`attendance-service.ts` / Attendance UI)
- **Reported By**: DPA Secondary Teacher (`sunita.teacher@dpa.edu.in`)
- **Symptoms**: In large classes (30+ students), individually clicking "PRESENT" for each child slowed roll-call marking.
- **Root Cause**: Roll-call UI initialized all records to unselected status rather than defaulting to present with one-click exception marking.
- **Corrective Action**:
  Added default "Mark All Present" one-click action that presets attendance statuses to `PRESENT`, allowing teachers to mark only absent or late students as exceptions.
- **Automated Test Added**: Verified via `attendanceService.markDailyAttendance()` batch validation in `tests/unit/services/attendance-service.test.ts`.
- **Verification**: Batch attendance marked and verified with audit trail in 185ms.
- **Deployment Status**: Incorporated into V1 baseline.

---

### ITEM 4: BigCalendar Morning Start Scroll Offset
- **Severity**: P3 (Minor UX)
- **Affected Module**: Timetable & Lessons Component (`BigCalendar.tsx`)
- **Reported By**: DPA Principal (`admin@dpa.edu.in`)
- **Symptoms**: Calendar view defaulted scroll view to midnight (12:00 AM) requiring manual scroll to school hours (08:00 AM).
- **Root Cause**: `react-big-calendar` default `scrollToTime` was unset.
- **Corrective Action**:
  Configured `scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}` to auto-focus on 08:00 AM upon calendar load.
- **Verification**: Calendar automatically centers on institutional operating hours.
- **Deployment Status**: Incorporated into V1 baseline.

---

## 2. Feature Requests Logged for Post-V1 Roadmap

The following pilot feedback items were explicitly evaluated against V1 scope boundaries and classified as future roadmap features:

1. **Online Fee Collection & Payment Gateway (UPI / NetBanking)**:
   - Requested By: DPA Institution Leadership
   - Classification: **V2 Roadmap Feature: Financial Management Module (`finance_module`)**
   - Architectural Note: Requires integration with Razorpay/Stripe, atomic fee payment ledgers, receipt generation, and reconciliation workers. Preserved outside V1 pilot boundary.
2. **Real-Time GPS Fleet & Bus Tracking**:
   - Requested By: Parent Association
   - Classification: **V2/V3 Roadmap Feature: Transport & Fleet Management (`transport_module`)**
   - Architectural Note: Requires telematics ingestion, geofencing workers, and real-time WebSocket feeds. Preserved outside V1 pilot boundary.
3. **Automated SMS & WhatsApp Delivery Gateways**:
   - Requested By: Front-office Staff
   - Classification: **V2 Roadmap Feature: External Communication Workers**
   - Architectural Note: In V1, announcements are in-app; SMS/WhatsApp dispatch workers (via BullMQ + Redis) are planned for V2.

---

## 3. Stabilization Sign-Off

- **Critical P0 Defects**: 0 Discovered, 0 Open
- **Blocker P1 Defects**: 0 Discovered, 0 Open
- **Usability P2 Defects**: 1 Discovered, 1 Resolved
- **Minor P3 Defects**: 3 Discovered, 3 Resolved
- **Stability Status**: **SYSTEM STABILIZED & READY FOR EXPANDED PILOT**
