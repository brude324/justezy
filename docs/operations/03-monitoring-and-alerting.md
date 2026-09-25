# Monitoring, Alerting & Operational Dashboards

## 1. Observability Stack Overview

**Status**: TARGET / PROPOSED

Operational monitoring combines infrastructure metrics (CPU, RAM, disk, connection pools), application performance telemetry (Next.js request latencies, error budgets), and queue state:

```
+--------------------------------------------------------------------------+
|                        OPERATIONAL TELEMETRY HUBS                        |
|                                                                          |
|  +------------------------+  +-------------------+  +-----------------+  |
|  | Application Telemetry  |  | Database Metrics  |  | Queue Dashboard |  |
|  | (Datadog / New Relic / |  | (PgBouncer Pool,  |  | (BullMQ Arena,  |  |
|  |  Grafana Loki Logs)    |  |  Active Conns)    |  |  Waiting Jobs)  |  |
|  +------------------------+  +-------------------+  +-----------------+  |
+--------------------------------------------------------------------------+
```

---

## 2. Health Check API Specification

The platform exposes an authenticated internal health check endpoint at `/api/health`:

```json
{
  "status": "healthy",
  "timestamp": "2026-09-25T15:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "up", "latencyMs": 4.2 },
    "redis": { "status": "up", "latencyMs": 1.1 },
    "storage": { "status": "up" }
  }
}
```

---

## 3. Incident Escalation & On-Call Policy

1. **Severity 1 (Critical Outage)**: Complete platform unavailability, database connectivity failure, or cross-tenant data leak.
   - *Escalation*: Automated page to Primary On-Call Engineer within 5 minutes; Secondary Lead paged at 15 minutes.
2. **Severity 2 (Degraded Performance)**: High latency (p95 > 2s), notification queue backlog > 1,000, or SMS gateway degradation.
   - *Escalation*: Slack alert to Engineering channel; triage within 30 minutes during business hours.
3. **Severity 3 (Localized Bug)**: Single institution feature issue or minor UI styling defect.
   - *Escalation*: Standard ticketing queue; resolved in subsequent sprint release.
