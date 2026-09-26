# PWA & Service Worker Cache Recovery Operational Runbook

This runbook provides remediation procedures for service worker desynchronization, stale client caching, and emergency browser cache invalidation.

---

## Runbook 11: PWA Service Worker Recovery & Emergency Cache Invalidation

### 1. Detection
- Users reporting outdated screen layouts after release.
- Stale static assets or 404s on dynamic chunk loads (`ChunkLoadError`).
- In extreme cases, concerns that client browser cache might retain stale institutional assets across user logouts.

### 2. Immediate Action
1. **Increment Service Worker Cache Version**:
   - In `public/sw.js`, bump `STATIC_CACHE_NAME` (e.g. from `schoolyard-static-v1` to `schoolyard-static-v2`).
   - The Service Worker `activate` event automatically deletes all caches matching previous version names.
2. **Deploy Emergency Cache-Busting Response Headers**:
   - In Next.js middleware or Cloudflare edge, attach header to HTML navigation requests:
     ```
     Clear-Site-Data: "cache"
     ```
   - *Note: Do not include "cookies" unless intentionally forcing global re-authentication.*

3. **Trigger Client-Side Cache Purge**:
   - When users log out or switch tenants, `clearTenantCaches()` is automatically invoked from `ServiceWorkerRegistration.tsx`.
   - To force all connected browser clients to discard existing caches immediately, broadcast a postMessage via active tabs:
     ```javascript
     navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_TENANT_CACHE' });
     ```

### 3. Verification
- Open DevTools > Application > Storage > Cache Storage in browser.
- Verify that old cache versions are completely deleted.
- Verify that only the current static cache exists and contains strictly public assets (`/manifest.webmanifest`, `/offline`, `/logo.png`).
- Verify zero sensitive `/api/` or tenant domain records in Cache Storage.

### 4. Recovery
- Ensure PWA reloads with the updated assets.
- Validate that offline fallback page loads seamlessly when network is disconnected.

### 5. Escalation
- If a security bug caused sensitive data to be cached in client browsers, escalate immediately under Runbook 10 (Security Incident).

### 6. Post-Incident Action
- Audit service worker fetch interceptors to assert that all API and mutation endpoints remain strictly network-only.
