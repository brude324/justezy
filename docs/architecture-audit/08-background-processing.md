# Section H: Background Processing Audit

## 1. Current State of Background Processing (Verified Audit Fact)

### 1.1 Queue Systems & Workers
- **Redis**: **NOT INSTALLED / CONFIGURED**. No Redis client (`ioredis`, `@upstash/redis`, or `redis`) exists in `package.json`.
- **BullMQ**: **NOT INSTALLED / CONFIGURED**. No queue definitions, worker loops, or job handlers exist.
- **Scheduled Tasks / Cron**: **NO CRON JOBS CONFIGURED**. No native timers, Node.js cron libraries (`node-cron`), or Vercel cron endpoints exist.
- **Background Workers**: **ZERO BACKGROUND PROCESSES**. The repository operates purely as a synchronous request-response application.

---

## 2. Failure Behavior of Current Synchronous Operations

Because background processing is absent, any operation requiring external communication or multi-row processing is executed synchronously inside Next.js Server Actions or RSC render passes:

1. **Third-Party User Creation in Server Actions**:
   - In `createTeacher` and `createStudent` in [src/lib/actions.ts](file:///c:/Users/Abhijeet%20Rawat/Desktop/justezy/src/lib/actions.ts), the server action blocks while awaiting `clerkClient.users.createUser(...)` over HTTP.
   - If Clerk's API experiences high latency, rate limits, or network disruption, the user's browser hangs on form submission.
   - If the database write fails after Clerk user creation, the operation catches the error, logs it to `console.log(err)`, and returns `{ success: false, error: true }`. The created Clerk user is left orphaned in Clerk with no rollback mechanism.

2. **Bulk Student / Staff Import**:
   - Currently absent. Implementing CSV/Excel student onboarding inside synchronous server actions without a queue may exceed edge/serverless request timeouts (such as 15-60 second platform limits).

3. **Email, SMS & WhatsApp Delivery**:
   - Absent in the current codebase. Any future notification logic added directly to Server Actions will degrade mutation responsiveness and create unrecoverable failure states when external communication gateways fail.

---

## 3. Production Risks of Current Synchronous Model

| Workflow | Current Implementation | Failure Mode | Severity |
| :--- | :--- | :--- | :--- |
| **User Provisioning** | Synchronous Clerk API call inside Server Action | Orphaned Clerk accounts upon DB error; no compensatory transaction | **HIGH** |
| **Notification Dispatch**| Absent (announcements are static DB rows) | Notifications cannot be broadcast via external channels without blocking the request cycle | **HIGH** |
| **Report Generation** | Absent (results rendered as simple HTML rows) | PDF report card generation in-process can exhaust Node.js memory / event loop | **HIGH** |
| **Data Aggregation** | Synchronous grouping and counting during RSC render | Unindexed queries (`groupBy`, `count`) executed synchronously on page load | **MEDIUM** |

---

## 4. Architectural Considerations for Proposed Asynchronous Processing

To support future multi-tenant workloads:
1. **Dedicated BullMQ Queue Worker**:
   - Evaluate running an independent long-running process (e.g. Docker container or dedicated worker service).
   - Redis-backed job storage with dead-letter queue (DLQ) support and configurable retry backoff.
2. **Appropriate Queue Workloads**:
   - `notifications`: Asynchronous dispatch across external messaging providers (WhatsApp, SMS, Email).
   - `bulk-import`: Parsing, validating, and batch-inserting student and teacher CSVs.
   - `report-cards`: Generating PDF report cards with institutional letterheads.
   - `secondary-events`: Non-critical downstream analytics and event processing.
3. **Audit Logging Distinction**:
   - **Critical business and security audit events** must be persisted atomically with the corresponding database mutation in PostgreSQL when required for correctness, ensuring critical history cannot disappear if a queue fails.
   - Background queues are reserved for secondary event processing, notifications, and non-critical downstream consumers.
