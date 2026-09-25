# Test Data, Seed Strategy & Fixture Architecture

## 1. Baseline Seed Limitations & Target Strategy

**Status**: CURRENT / VERIFIED vs. TARGET / PROPOSED

- **Current Baseline Fact**: Sourced from `05-database-audit.md`. The existing `prisma/seed.ts` file generates hardcoded mock data for a single school. It lacks multi-tenant scoping, creates global conflicting IDs, and includes zero role-permission bindings.
- **Target Strategy**: Implement a modular, deterministic test fixture engine that provisions multi-tenant test environments with isolated institutions, distinct subscription tiers, and predictable user credentials.

---

## 2. Standard Multi-Tenant Test Fixture Hierarchy

**Status**: TARGET / PROPOSED

The automated test harness provisions three standard test institutions to validate cross-tenant boundaries:

```
+--------------------------------------------------------------------------+
|                     STANDARDIZED TEST INSTITUTIONS                       |
+--------------------------------------------------------------------------+
| 1. TENANT A: "Delhi Public School" (Slug: `dps`)                         |
|    - Status: ACTIVE                                                      |
|    - Plan: Enterprise (All Modules Enabled: Core, Exams, Fees, SMS)      |
|    - Users: 1 Admin, 3 Teachers, 20 Students, 15 Parents                 |
+--------------------------------------------------------------------------+
| 2. TENANT B: "St. Xavier's Academy" (Slug: `st-xaviers`)                 |
|    - Status: ACTIVE                                                      |
|    - Plan: Basic Academic (Core Academics Only; Fees & SMS Disabled)     |
|    - Users: 1 Admin, 2 Teachers, 10 Students, 8 Parents                  |
+--------------------------------------------------------------------------+
| 3. TENANT C: "Oakridge High" (Slug: `oakridge`)                          |
|    - Status: SUSPENDED (Non-payment / Inactive)                          |
|    - Purpose: Validating that all user access is blocked upon suspension |
+--------------------------------------------------------------------------+
```

---

## 3. Test Fixture Factory Conventions

Test fixtures are generated programmatically using factory functions rather than brittle SQL dumps:

```typescript
// TARGET / PROPOSED: tests/fixtures/factories.ts
export async function createTestTenant(prisma: PrismaClient, overrides?: Partial<Tenant>) {
  return await prisma.tenant.create({
    data: {
      name: 'Test Institution',
      slug: `test-${Date.now()}`,
      status: 'ACTIVE',
      ...overrides,
    },
  });
}

export async function createTestUserWithMembership(
  prisma: PrismaClient,
  tenantId: string,
  roleCode: string,
  overrides?: Partial<User>
) {
  const user = await prisma.user.create({
    data: {
      clerkId: `clerk_${Date.now()}_${Math.random()}`,
      email: `user_${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    },
  });

  const role = await prisma.role.findFirstOrThrow({ where: { tenantId, code: roleCode } });

  const membership = await prisma.tenantMembership.create({
    data: {
      tenantId,
      userId: user.id,
      roleId: role.id,
      status: 'ACTIVE',
    },
  });

  return { user, membership };
}
```

---

## 4. Test State Isolation & Database Reset

1. **Transactional Test Rollbacks**: Unit integration tests execute within an active transaction that automatically rolls back at the end of each test block (`afterEach`), ensuring zero test pollution.
2. **Deterministic IDs**: Fixture factories generate predictable deterministic IDs (e.g. `test-teacher-dps-01`) for Playwright E2E browser runs.
