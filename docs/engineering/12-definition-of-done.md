# Definition of Done (DoD)

## 1. Executive Summary

**Status**: DECISION

A module, feature, or migration task is considered **DONE** and eligible for deployment to production only when it satisfies all seventeen criteria defined in this standard. Bypassing any criterion requires explicit architectural sign-off.

---

## 2. The Seventeen DoD Criteria

1. **Requirements Documented**:
   - The functional and non-functional requirements are clearly documented in the corresponding product or architecture specification.
2. **Screen Behavior Defined**:
   - UI responsiveness, mobile layout, optimistic updates, and disabled button states are fully specified and tested.
3. **Permissions Defined**:
   - All required granular RBAC permissions (e.g. `exam.publish`) and their associated access scopes (`ASSIGNED_ONLY`, `INSTITUTION_WIDE`) are cataloged.
4. **Tenant Behavior Defined**:
   - Query isolation, composite unique keys, and multi-tenant constraints are strictly verified.
5. **Entitlement Behavior Defined**:
   - The module key is registered, and route/action gating ensures unentitled institutions cannot execute functionality.
6. **Database Requirements Defined**:
   - Prisma schema definitions include all necessary relations, foreign keys, and indexes on `tenantId`.
7. **Validation Exists**:
   - Both client-side React Hook Form resolvers and server-side Zod validation schemas are implemented and enforce data types.
8. **Error States Exist**:
   - Handled error states, loading skeletons (`loading.tsx`), and sanitized client-facing error messages are implemented.
9. **Unit Tests Exist**:
   - Pure domain logic, algorithms, date utilities, and schema validators have unit test coverage.
10. **Integration Tests Exist**:
    - Database operations, transaction rollbacks, and Server Action authorization guards are verified against a PostgreSQL test container.
11. **E2E Coverage Exists for Critical Flows**:
    - Playwright browser tests validate the complete end-to-end happy path and primary error path.
12. **Lint Passes**:
    - `npm run lint` completes with **0 errors and 0 warnings**.
13. **Type-Check Passes**:
    - `npx tsc --noEmit` completes cleanly with **0 type errors**.
14. **All Tests Pass**:
    - The complete test suite (`vitest run`, `playwright test`) passes 100% cleanly in CI.
15. **Production Build Passes**:
    - `npm run build` succeeds cleanly without runtime initialization failures or circular dependency warnings.
16. **Security Requirements Pass**:
    - No raw client tenant headers trusted; no SQL injection or IDOR hazards; zero committed secrets.
17. **Documentation is Updated**:
    - Relevant architecture documentation, ADRs, and schema migration notes are updated and committed.
