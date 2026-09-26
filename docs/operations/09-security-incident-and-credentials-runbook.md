# Security Incident & Leaked Credential Operational Runbook

This runbook outlines mandatory immediate containment and remediation protocols for security incidents, compromised secrets, and potential cross-tenant isolation breaches under India DPDP Act standards.

---

## Runbook 9: Leaked Credential & Secret Compromise Response

### 1. Detection
- Secret scanning alert (GitHub Secret Scanning, GitGuardian, or security report).
- Discovery of API keys, Clerk secret keys, database credentials, or signing secrets in code commits, logs, or public repositories.

### 2. Immediate Action (Within 15 Minutes)
1. **Immediate Revocation**:
   - **Clerk Secret Key**: Generate new Secret Key in Clerk Dashboard > API Keys. Delete the compromised key immediately.
   - **Database Password**: Rotate PostgreSQL user password in RDS / database cluster.
   - **Cloudinary / S3 Secrets**: Invalidate access key in cloud IAM console and generate replacement key.
2. **Update Secrets Vault & Deployment Environment**:
   - Update secrets in Cloud Secrets Manager / GitHub Secrets.
   - Trigger immediate rolling redeployment of all Next.js pods with updated credentials.
3. **Inspect Git History & Repository**:
   - If committed to git, remove from git history using `git-filter-repo` or BFG repo-cleaner.
   - Force-push updated branch and coordinate repository cache purge.

### 3. Verification
- Verify that old credentials return 401 Unauthorized when tested.
- Verify that new deployment starts successfully and connects using the rotated credentials.
- Inspect application logs for the past 7 days to verify if the compromised key was used maliciously.

### 4. Recovery
- Confirm zero downtime during secret rotation.
- Re-run automated security scanner to assert zero exposed secrets.

### 5. Escalation
- Escalate to CTO, Lead Security Architect, and Legal Counsel within 1 hour.

### 6. Post-Incident Action
- Audit commit access permissions and pre-commit hook enforcement.
- Publish incident post-mortem within 48 hours.

---

## Runbook 10: Cross-Tenant Data Access or IDOR Incident Response

### 1. Detection
- Audit log alarm: caller attempting to access an entity belonging to another `tenantId`.
- Negative authorization assertion in production logs (`Operation denied by horizontal AccessScope boundary`).
- User report or security vulnerability disclosure.

### 2. Immediate Action
1. **Contain Compromised Account**:
   - Suspend the actor's user account and tenant membership immediately:
     ```sql
     UPDATE users SET is_active = false WHERE id = 'compromised_user_id';
     UPDATE tenant_memberships SET status = 'SUSPENDED' WHERE user_id = 'compromised_user_id';
     ```
2. **Revoke Active Clerk Sessions**:
   - Invalidate all active session tokens for the affected user in Clerk.
3. **Isolate Affected Endpoints**:
   - If an endpoint has an IDOR defect, deploy an immediate WAF rule or hotfix disabling the vulnerable mutation/query.

### 3. Forensic Investigation & Verification
- Query `audit_logs` for all actions taken by the actor:
  ```sql
  SELECT * FROM audit_logs
  WHERE user_id = 'compromised_user_id'
  ORDER BY created_at DESC;
  ```
- Identify exact records and tenant IDs accessed or modified.
- Verify whether cross-tenant read or write took place.

### 4. Recovery & DPDP Act Compliance
1. **Remediation Hotfix**:
   - Deploy hotfix ensuring `tenantId` is strictly asserted via `where: { tenantId }` in Prisma query and AccessScope engine.
2. **Statutory Disclosure (DPDP Act, 2023)**:
   - If personal data was breached, prepare notification for the **Data Protection Board of India (DPBI)** within 72 hours.
   - Notify the Data Protection Officer (DPO) of the affected educational institution.

### 5. Escalation
- Severity P0: Immediate emergency bridge with CTO, General Counsel, and Head of Engineering.

### 6. Post-Incident Action
- Add automated regression test asserting strict rejection of the specific IDOR pattern.
- Execute full codebase audit of all Prisma queries touching domain models.
