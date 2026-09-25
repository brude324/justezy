# Validation & Error Handling Standards

## 1. Dual-Layer Validation with Zod

**Status**: TARGET / PROPOSED

The application enforces **Dual-Layer Validation**:
1. **Client-Side (UX Layer)**: React Hook Form binds to Zod schemas via `@hookform/resolvers/zod` to provide instant inline validation feedback, character limits, and format checking.
2. **Server-Side (Security Layer)**: Every Server Action, Route Handler, and Service function re-executes `schema.parse()` or `schema.safeParse()`. Client validation is never trusted as a security barrier.

```
                           [ User Form Input ]
                                    |
                       [ Client-Side Zod Validation ]
                        (Instant UX error highlight)
                                    |
                                    v
                         [ Server Action Post ]
                                    |
                       [ Server-Side Zod Validation ]
                          (Guaranteed Type Safety)
                                    |
                                    v
                         [ Domain Service Logic ]
```

---

## 2. Standard Domain Error Hierarchy

The application defines a typed exception hierarchy extending a base `AppError`:

```typescript
// TARGET / PROPOSED: src/lib/errors/AppError.ts
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = 'UNAUTHORIZED';
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';
}
```

---

## 3. Error Masking & Information Leakage Prevention

1. **Database Error Masking**: Raw database exceptions (e.g. Prisma connection errors, unique constraint collisions, foreign key violations) MUST NEVER be passed directly to the client browser. They must be logged server-side and transformed into user-friendly messages:
   - *Raw DB Error*: `Unique constraint failed on the fields: (tenantId, name)`
   - *Client Sanitized Response*: `"A class with this name already exists in your institution."`
2. **Tenant Privacy Masking**: If a user attempts to access an entity belonging to a different tenant, the server MUST return `NotFoundError ("Entity not found")` rather than `ForbiddenError ("Unauthorized access to Tenant X")` to prevent adversaries from inferring the existence of other institutional records.
