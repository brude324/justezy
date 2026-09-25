# Data Security, Privacy & Compliance Architecture

## 1. Compliance Mandates: Indian DPDP Act 2023 & Minor Protection

**Status**: TARGET / PROPOSED

Because this platform processes sensitive records belonging to educational institutions, children (minors), and families across India, compliance with the **Digital Personal Data Protection (DPDP) Act, 2023** is an architectural requirement:

1. **Verifiable Parental Consent for Minors**:
   - The DPDP Act defines any individual under age 18 as a child.
   - Processing student educational or attendance data requires verifiable parental/guardian consent during institutional enrollment.
   - Student personal contact information (email, personal phone) is protected from commercial tracking or profiling.
2. **Right to Correction & Erasure**:
   - Parents have the right to request correction of inaccurate student records or erasure upon student graduation/transfer, subject to statutory school record retention rules.
3. **Purpose Limitation**:
   - Student data collected for academic management cannot be shared with third-party advertisers or external analytics trackers.

---

## 2. Encryption Standards

**Status**: TARGET / PROPOSED

```
+--------------------------------------------------------------------------+
|                             ENCRYPTION TIERS                             |
|                                                                          |
|  +------------------------+  +-------------------+  +-----------------+  |
|  |   Data in Transit      |  |   Data at Rest    |  | Sensitive Fields|  |
|  |  TLS 1.3 enforced on   |  |  AES-256 for all  |  | Column-level    |  |
|  |  all Web, API, and     |  |  database storage |  | encryption for  |  |
|  |  database connections  |  |  and S3 objects   |  | national IDs    |  |
|  +------------------------+  +-------------------+  +-----------------+  |
+--------------------------------------------------------------------------+
```

1. **Transit Encryption**: Mandatory TLS 1.3 encryption across all client-to-edge, edge-to-server, server-to-database, and server-to-redis connections (`sslmode=verify-full`).
2. **Rest Encryption**: PostgreSQL block storage and S3 object storage encrypted using AES-256 with cloud-managed KMS keys.
3. **Application-Level Column Encryption**: High-sensitivity identifiers (such as student Aadhaar numbers or medical notes) are encrypted at the application layer before reaching database storage.

---

## 3. Secret Management & Credential Governance

**Status**: DECISION

Step 0 identified that `.env` files contained live credentials in version control. The target engineering architecture mandates strict secret governance:

1. **Zero Committed Secrets**: `.env` and all files containing credentials must be in `.gitignore`. Production CI/CD scans pull requests using automated secret scanners (e.g. `gitleaks` / `trufflehog`) to block commits containing API keys.
2. **Runtime Secret Injection**: Secrets are injected as environment variables directly by the container orchestration platform or cloud secret vault (e.g. AWS Secrets Manager, Doppler, or Doppler/Infisical).
3. **Mandatory Key Rotation**: Regular 90-day rotation schedules for Clerk API keys, database credentials, and cloud storage access keys.
