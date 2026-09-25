# Environment Separation & Configuration Architecture

## 1. Environment Topology

**Status**: TARGET / PROPOSED

To ensure that pre-production testing, continuous integration, and staging releases never corrupt or leak production institutional records, the platform enforces strict physical and logical environment separation across three tiers:

```
[ Local Development ]       [ Staging / QA ]          [ Production ]
- Localhost (Windows/Mac)   - Cloud Staging Cluster   - High-Availability Cluster
- Local Docker PostgreSQL   - Isolated Staging RDS    - Multi-AZ Production RDS
- Local Docker Redis        - Staging Redis Cluster   - Managed Production Redis
- Clerk Development Env     - Clerk Staging Instance  - Clerk Production Instance
- Local MinIO / Mock S3     - Staging S3 Bucket       - Production S3 Vault
```

---

## 2. Infrastructure Separation Matrix

| Infrastructure Asset | Local Development | Staging / Pre-Production | Production |
| :--- | :--- | :--- | :--- |
| **Domain & Host** | `localhost:3000` | `*.staging.schoolyard.in` | `*.schoolyard.in` / Custom Domains |
| **PostgreSQL Database** | Local Docker (Port 5432) | Dedicated Staging Database (Isolated VPC) | High-Availability Multi-AZ PostgreSQL |
| **Connection Pooling** | Direct connection | PgBouncer Pooling (Port 6543) | Managed PgBouncer / Supabase Pooler |
| **Clerk Auth Instance** | Clerk Test Environment (`pk_test_...`) | Dedicated Clerk Staging Account | Dedicated Clerk Production Account (`pk_live_...`) |
| **Redis Cache & Queue** | Local Docker Redis | Managed Staging Redis Instance | Multi-Node Redis Cluster with Persistence |
| **File Storage (S3)** | Local Mock / S3 Dev Bucket | `schoolyard-staging-vault` | `schoolyard-production-vault` |
| **Secrets Management** | `.env.local` (Developer Gitignored) | GitHub Secrets / Staging Vault | Production Cloud KMS Vault |
| **Monitoring & Telemetry**| Console output (pretty printed) | Staging Log Ingestion | Production Datadog / OpenTelemetry Tracing |

---

## 3. Configuration & Variable Immutability

1. **Environment Variable Parity**: All environments adhere to the same variable schema defined in `.env.example`.
2. **Never Share Database Instances**: Development or staging workloads MUST NEVER point to the production database or share connection credentials.
3. **Clerk Production Domain Isolation**: Production uses dedicated domain DNS records (`auth.schoolyard.in`) to prevent third-party cookie restrictions and guarantee session isolation from development environments.
