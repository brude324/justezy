# Comprehensive Automated Testing Strategy

## 1. Testing Pyramid & Tooling Framework

**Status**: TARGET / PROPOSED

Step 0 established that the repository currently contains **0 automated test files** (0% coverage). 

The target engineering architecture establishes a rigorous testing pyramid using **Vitest** for fast unit and service integration tests, and **Playwright** for multi-tenant browser end-to-end (E2E) flows.

```
                                  / \
                                 /   \
                                / E2E \       <-- Playwright (Critical Journeys)
                               /-------\
                              / Integr- \     <-- Vitest + TestContainers / Postgres
                             /   ation   \        (DB Scoping, Transactions, RBAC)
                            /-------------\
                           /   Unit Tests  \  <-- Vitest (Pure Logic, Zod, Resolvers)
                          /-----------------\
```

| Layer | Framework / Tool | Execution Target | Coverage Objective |
| :--- | :--- | :--- | :---: |
| **Unit Tests** | Vitest | Input validators, permission evaluator, tenant resolvers, schedule algorithms, date utilities. | > 90% |
| **Integration Tests** | Vitest + PostgreSQL Test DB | Domain services, Prisma tenant scoping, atomic audit logging, transaction rollbacks. | > 80% |
| **E2E Tests** | Playwright | Multi-tenant login, role dashboards, marks entry, attendance marking, PWA installation. | Core Flows |
| **Security Tests** | Vitest + Custom Scenarios | Cross-tenant injection, IDOR mutation bypass, unauthenticated server action triggers. | 100% Critical Endpoints |

---

## 2. Test Layer Specifications

### 2.1 Unit Testing Layer
- Focuses on isolated, deterministic functions with zero network or database dependencies:
  - Zod schemas validating edge cases (e.g. malformed phone numbers, invalid exam scores).
  - RBAC policy engine evaluating permission hierarchies and access scope logic.
  - Date helper calculations (`adjustScheduleToCurrentWeek`) verifying leap years and weekends.

### 2.2 Integration Testing Layer
- Executes against a real, isolated PostgreSQL test container:
  - **Tenant Scoping Tests**: Verifying that querying for students under Tenant A never returns records from Tenant B.
  - **Atomic Transaction Rollback Tests**: Asserting that if an audit log write fails, the entire business entity update rolls back cleanly.
  - **Server Action Authorization Guards**: Simulating unauthorized requests to verify that `401` or `403` responses are returned.

### 2.3 End-to-End (E2E) Browser Testing Layer
- Tests full user journeys in headless Chromium/Firefox/WebKit:
  - **Journey 1**: Admin logs in, creates a new section, assigns a teacher, and verifies timetable rendering.
  - **Journey 2**: Teacher marks class attendance, submits form, and verifies absentee count toast.
  - **Journey 3**: Parent logs in, switches between two enrolled children, and reviews report cards.

### 2.4 Security & Regression Testing Layer
- **Cross-Tenant Access Verification**: Automated tests deliberately submit Tenant A identifiers with Tenant B user credentials to assert immediate rejection.
- **IDOR Protection**: Modifying entity IDs in request bodies to ensure a user cannot edit an exam belonging to another school.
- **Entitlement Bypass**: Verifying that disabling a module in a tenant's subscription immediately prevents access to all underlying routes and actions.
