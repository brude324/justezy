# Incident Response & Operational Governance

## 1. Incident Classification & Severity Levels

**Status**: TARGET / PROPOSED

| Severity Level | Definition | Response SLA | Executive Escalation |
| :---: | :--- | :---: | :--- |
| **P0: Catastrophic** | Platform unavailable; data corruption; cross-tenant security breach. | **< 15 Minutes** | Immediate page to CTO, Lead Architect, Legal Counsel. |
| **P1: Critical** | Single major module failure (e.g. attendance marking broken nationwide). | **< 30 Minutes** | Page to Engineering Manager & On-Call Team. |
| **P2: Moderate** | Performance degradation (latency > 2s); notification backlog growing. | **< 2 Hours** | Slack alert to Engineering On-Call. |
| **P3: Minor** | Non-critical UI glitch, formatting flaw, or single-user defect. | **Next Sprint** | Standard backlog triage. |

---

## 2. Standard Incident Lifecycle

```
[ 1. DETECTION ] ----> [ 2. TRIAGE ] ----> [ 3. CONTAINMENT ]
  Automated Alert       Severity Assigned    Isolate Component /
  or User Report        Lead Assigned        Rollback Deployment
                                                      |
                                                      v
[ 6. POST-MORTEM ] <-- [ 5. RECOVERY ] <-- [ 4. ERADICATION ]
  Blameless Root        Verify System Health Fix Root Cause /
  Cause Analysis        & Tenant Integrity   Deploy Hotfix
```

---

## 3. Data Breach Protocol & Statutory Notifications (DPDP Act Compliance)

Under India's **Digital Personal Data Protection (DPDP) Act, 2023**, institutional data fiduciaries face strict obligations in the event of a personal data breach:

1. **Mandatory 72-Hour Notification**:
   - If unauthorized access to student, parent, or employee records is confirmed, the Incident Commander must notify the **Data Protection Board of India (DPBI)** within statutory timelines.
2. **Institutional Disclosure**:
   - Affected school leadership must receive a detailed forensic incident report specifying:
     - Extent and nature of compromised data categories.
     - Root cause and remediation actions taken.
     - Recommended protective guidance for affected parents and staff.
3. **Blameless Post-Mortem Mandate**:
   - Within 5 business days of any P0 or P1 incident, the team must publish a blameless post-mortem document detailing timeline, root cause, failure of preventive controls, and preventative engineering action items.
