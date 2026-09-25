# Server Action Conventions & Mutation Standards

## 1. Architectural Guard Pattern: `createGuardedAction`

**Status**: TARGET / PROPOSED

Step 0 uncovered that Server Actions in `src/lib/actions.ts` lacked authorization checks, with security code commented out. In the target architecture, raw unguarded Server Actions are banned.

Every mutation action MUST be created using the `createGuardedAction` higher-order utility:

```typescript
// TARGET / PROPOSED: src/lib/actions/actionWrapper.ts
export function createGuardedAction<TInput, TOutput>({
  permission,
  moduleKey,
  schema,
  handler,
}: {
  permission: string;
  moduleKey?: string;
  schema: z.ZodSchema<TInput>;
  handler: (ctx: ActionContext, data: TInput) => Promise<TOutput>;
}) {
  return async (rawInput: unknown): Promise<ActionResponse<TOutput>> => {
    try {
      // 1. Resolve Server-Side Tenant & User Context
      const ctx = await getAuthenticatedTenantContext();

      // 2. Validate Module Entitlement (if moduleKey specified)
      if (moduleKey && !ctx.entitlements.has(moduleKey)) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: `Institutional module '${moduleKey}' is disabled.` },
        };
      }

      // 3. Verify Server-Side Permission
      if (!ctx.permissions.has(permission)) {
        return {
          success: false,
          error: { code: 'UNAUTHORIZED', message: `Missing required permission: ${permission}` },
        };
      }

      // 4. Validate Input Schema with Zod
      const parseResult = schema.safeParse(rawInput);
      if (!parseResult.success) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed.',
            details: parseResult.error.flatten().fieldErrors,
          },
        };
      }

      // 5. Execute Business Handler
      const data = await handler(ctx, parseResult.data);
      return { success: true, data };
    } catch (error) {
      logError('ServerActionExecutionFailure', { error });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      };
    }
  };
}
```

---

## 2. Next.js Cache Revalidation Guidelines

1. **Selective Path Revalidation**:
   - Following a mutation (e.g. `createClass`), invoke `revalidatePath('/list/classes')` to refresh the server component cache for that specific view.
2. **Tag-Based Revalidation for Shared Relational Data**:
   - For shared institutional caches (e.g. subjects or timetable rosters), use `revalidateTag(`tenant-${ctx.tenantId}-academics`)`.
3. **No Blind Full-Site Revalidation**:
   - Do not call `revalidatePath('/', 'layout')` on routine mutations, as this flushes the entire client cache across all modules.
