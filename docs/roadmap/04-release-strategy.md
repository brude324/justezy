# Product Release Strategy & Rollout Governance

## 1. Release Milestones & Phase Gates

**Status**: TARGET / PROPOSED

To ensure platform stability, data safety, and seamless institutional adoption, the transformation rollout progresses through four structured release gates:

```
[ Phase 0: Alpha Sandbox ]
  - Internal testing with synthetic multi-tenant fixtures
  - Security penetration testing & cross-tenant leak validation
                            |
                            v
[ Phase 1: Private Beta (Pilot Institutions) ]
  - Onboard 3-5 pilot Indian schools in shadow mode
  - Parallel running alongside legacy attendance/exam spreadsheets
                            |
                            v
[ Phase 2: Public Beta ]
  - Open onboarding for early-adopter schools on V1 Core Academics
  - BullMQ notification workers activated in staging
                            |
                            v
[ Phase 3: General Availability (GA) ]
  - Commercial V1 release with full SLA guarantees
  - Rollout of V2 fee collection & multi-channel notification engine
```

---

## 2. Progressive Feature Toggling

1. **Tenant-Level Feature Flags**: Every newly released module or workflow is protected by a feature flag in the `ModuleEntitlement` system.
2. **Canary Rollouts**: New features are enabled first for 10% of institutional tenants (pilot group) to monitor telemetry, error rates, and support tickets before platform-wide activation.
3. **Instant Kill-Switch**: If a bug is detected in a new module (e.g. report card PDF generation), the module flag can be toggled off instantly from the SaaS Control Plane without requiring an emergency container deployment.

---

## 3. Maintenance Windows & Communication

1. **Zero-Downtime Architecture**: Because migrations use the Expand-and-Contract pattern and container runners update via rolling deployments, standard releases require zero system downtime.
2. **Scheduled Low-Traffic Windows**: High-consequence database indexing or massive data migrations execute during low-traffic windows (Sundays 01:00 - 04:00 IST).
3. **In-App Maintenance Banners**: If maintenance is planned, an advisory banner appears on administrative dashboards 48 hours in advance.
