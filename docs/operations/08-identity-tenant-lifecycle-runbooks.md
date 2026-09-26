# Identity & Tenant Lifecycle Operational Runbooks

This document covers operational handling of Clerk identity synchronization failures, administrative tenant suspensions, and user offboarding/deactivation.

---

## Runbook 6: Clerk Webhook Failure & Identity Resynchronization

### 1. Detection
- Clerk Dashboard logs show failed webhook delivery attempts (HTTP 4xx or 5xx) to `/api/webhooks/clerk`.
- Application alerts fire on `[ErrorReporter] Clerk webhook signature verification failed` or `Error executing Clerk webhook identity synchronization`.
- Newly registered or updated users cannot access their assigned institution.

### 2. Immediate Action
1. **Check Webhook Secrets & Health**:
   - Verify `CLERK_WEBHOOK_SECRET` environment variable is intact in deployment secrets.
   - Inspect `/api/webhooks/clerk` rate limiter logs to verify if traffic was temporarily throttled.
2. **Review Clerk Delivery Logs**:
   - Navigate to Clerk Dashboard > Webhooks > Endpoints > `/api/webhooks/clerk` > Delivery Attempts.
   - Note the failed event IDs, event types (`user.created`, `user.updated`, `user.deleted`), and HTTP response status.

### 3. Verification
- Check if application database `User` table reflects the user's latest email or status:
  ```sql
  SELECT id, clerk_id, email, is_active, updated_at FROM users WHERE clerk_id = 'user_clerk_id';
  ```

### 4. Recovery
1. **Trigger Clerk Webhook Replay**:
   In Clerk Dashboard, select the failed event attempt and click **Resend Webhook**.
2. **Execute Manual Identity Reconciliation Script**:
   If bulk events were missed or webhook was down during maintenance, execute the identity reconciliation script:
   ```bash
   npx ts-node scripts/reconcile-identity.ts --userId user_clerk_id
   ```
   Or run full batch reconciliation:
   ```bash
   npx ts-node scripts/reconcile-identity.ts --all
   ```

### 5. Escalation
- If webhooks fail continuously due to signature mismatch, escalate to Security Lead to verify Svix secret rotation.

### 6. Post-Incident Action
- Audit missed user events and verify that all affected institutional users have valid `TenantMembership` records.

---

## Runbook 7: Institutional Tenant Suspension & Offboarding

### 1. Detection & Authorization
- **Triggers**:
  - Non-payment / subscription expiration past grace period.
  - Institutional contract termination.
  - Security incident / suspected compromise within institution.
- **Authorization**: Must be authorized by Platform Super Admin or Head of Customer Operations.

### 2. Immediate Action
1. **Update Tenant Status in Database**:
   Transition tenant state to `SUSPENDED`:
   ```sql
   UPDATE tenants
   SET status = 'SUSPENDED', updated_at = NOW()
   WHERE id = 'target_tenant_id';
   ```
2. **Invalidate Active Sessions**:
   - The PolicyEngine automatically fails closed for any user whose active tenant status is `SUSPENDED`.
   - Clear tenant-scoped cache keys in Redis and trigger PWA cache purge header.

### 3. Verification
- Attempt to access any guarded route under the target tenant:
  - System must return HTTP 403 Forbidden (`Institutional tenant account is currently suspended`).
- Verify that read operations, attendance marking, and grade entries are completely blocked.

### 4. Recovery (Reactivation Procedure)
- Once payment or security audit is cleared:
  ```sql
  UPDATE tenants
  SET status = 'ACTIVE', updated_at = NOW()
  WHERE id = 'target_tenant_id';
  ```
- Confirm institution staff can access their workspace normally.

### 5. Escalation
- If unauthorized data access attempts persist from a suspended tenant, escalate to Security Incident Commander.

---

## Runbook 8: User Offboarding & Deactivation

### 1. Trigger
- Staff resignation, teacher termination, student withdrawal, or security deactivation.

### 2. Immediate Action
1. **Revoke Clerk Identity**:
   - In Clerk Dashboard, set user status to Suspended / Ban or delete session.
2. **Deactivate Application Tenant Membership**:
   ```sql
   UPDATE tenant_memberships
   SET status = 'TERMINATED', updated_at = NOW()
   WHERE user_id = 'target_user_id' AND tenant_id = 'target_tenant_id';
   ```
3. **If Global User Deactivation**:
   ```sql
   UPDATE users
   SET is_active = false, updated_at = NOW()
   WHERE id = 'target_user_id';
   ```

### 3. Verification
- Caller receives immediate 401/403 rejection on next Server Action or API request.
- PWA and browser session are terminated.
- Confirm student historical academic records (attendance, exams) remain intact (soft offboarding invariant).
