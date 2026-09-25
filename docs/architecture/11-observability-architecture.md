# Observability, Telemetry & Monitoring Architecture

## 1. Architectural Strategy: Structured Telemetry & Tenant Awareness

**Status**: TARGET / PROPOSED

In a multi-tenant SaaS environment serving thousands of educational institutions, observability is critical for detecting localized performance degradation, security anomalies, and system bottlenecks before they impact end-users.

All telemetry (logs, metrics, traces) is emitted with **mandatory tenant context** (`tenantId`) and a unique **correlation ID** (`requestId`) that flows through every edge, server, and worker layer.

---

## 2. Structured JSON Logging

**Status**: TARGET / PROPOSED

Application logs are emitted as single-line structured JSON objects (via `pino`), enabling automated ingestion and indexing by log aggregators (e.g. Datadog, Grafana Loki, or AWS CloudWatch):

```json
{
  "timestamp": "2026-09-25T14:30:00.123Z",
  "level": "info",
  "requestId": "req_8a92f0b7c12",
  "tenantId": "tnt_greenwood_456",
  "userId": "usr_99812",
  "role": "TEACHER",
  "action": "ATTENDANCE_RECORDED",
  "durationMs": 42.5,
  "module": "attendance",
  "message": "Class attendance successfully recorded for Class cls_8a"
}
```

### Logging Rules:
1. **Never Log Sensitive Personal Data (PII) or Credentials**: Passwords, session tokens, national IDs, and raw medical data must never appear in application logs.
2. **Standard Log Levels**:
   - `DEBUG`: Verbose query performance details and cache evaluation logs (disabled in production).
   - `INFO`: Normal operational lifecycle events (user login, exam published, fee collected).
   - `WARN`: Recoverable degradation (SMS gateway retry, high queue delay, cache miss).
   - `ERROR`: Unhandled exceptions, failed database transactions, rejected webhooks.

---

## 3. Key Operational Metrics & Thresholds

| Metric Name | Component | Warning Threshold | Critical Threshold | Alert Action |
| :--- | :--- | :---: | :---: | :--- |
| **HTTP 5xx Error Rate** | Next.js Server | > 1.0% (5-min window) | > 5.0% | PagerDuty to On-Call Engineer |
| **p95 Request Latency** | Next.js Server | > 800 ms | > 2000 ms | Auto-scale container runners |
| **Prisma Pool Exhaustion**| PostgreSQL / Pool | > 75% active connections | > 90% | Trigger PgBouncer scaling |
| **BullMQ Queue Backlog** | Notification Worker | > 500 delayed jobs | > 2000 delayed jobs | Scale out worker daemons |
| **DLQ Growth Rate** | Dead Letter Queue | > 5 failed jobs / hour | > 25 failed jobs / hour | Engineering investigation |

---

## 4. Distributed Tracing & OpenTelemetry

**Status**: TARGET / PROPOSED

Distributed tracing tracks incoming HTTP requests from the edge middleware through Next.js Server Actions, Prisma database queries, BullMQ job enqueueing, and background worker completion. 

Every request generates an OpenTelemetry-compatible `traceparent` header, providing full visibility into query bottlenecks and slow third-party API dependencies.
