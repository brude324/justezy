# System Security Model & Defense-in-Depth

## 1. Architectural Strategy: Defense-in-Depth

**Status**: TARGET / PROPOSED

The security model employs a multi-layered **Defense-in-Depth** architecture. Security is never delegated to a single gate; rather, an unauthorized or malicious request must breach multiple independent validation layers before gaining access to institutional assets.

```
                      [ External Internet Traffic ]
                                    |
                                    v
            +-----------------------------------------------+
            |  Layer 1: Edge & Network Security (Cloudflare) |
            |  - DDoS mitigation, TLS 1.3, Rate limiting    |
            +-----------------------------------------------+
                                    |
                                    v
            +-----------------------------------------------+
            |  Layer 2: Identity & Authentication (Clerk)   |
            |  - Credential verification, MFA, Session JWT  |
            +-----------------------------------------------+
                                    |
                                    v
            +-----------------------------------------------+
            |  Layer 3: Server-Side Tenant Resolution       |
            |  - Host extraction, Tenant membership check   |
            +-----------------------------------------------+
                                    |
                                    v
            +-----------------------------------------------+
            |  Layer 4: Module Entitlement Licensing Gate   |
            |  - Verifies institution subscription includes |
            |    the requested functional module            |
            +-----------------------------------------------+
                                    |
                                    v
            +-----------------------------------------------+
            |  Layer 5: Dynamic DB RBAC & Scope Enforcement |
            |  - Evaluates user's fine-grained permissions  |
            |    and horizontal access scope                |
            +-----------------------------------------------+
                                    |
                                    v
            +-----------------------------------------------+
            |  Layer 6: Data Access & Tenant Scoping        |
            |  - Prisma query filter (`where: { tenantId }`) |
            |  - Atomic transactional audit log commitment  |
            +-----------------------------------------------+
```

---

## 2. Core Security Invariants

1. **Zero Client Trust**: All client-provided data (parameters, payloads, headers) is untrusted until parsed by Zod and validated server-side.
2. **Session Authenticity**: The application verifies Clerk JWT cryptographic signatures on every non-public request. Revoked or expired sessions terminate access immediately.
3. **Institutional Non-Interference**: An authenticated user of Tenant A has zero permission to view, query, or infer data belonging to Tenant B.
4. **Audit Immutability**: All security-relevant actions write append-only audit records directly to PostgreSQL within the mutation transaction.
