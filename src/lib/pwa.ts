/**
 * Sends a message to the active service worker to purge all cached data.
 * Crucial during logout or tenant switching to prevent stale cross-tenant leakage.
 */
export async function clearTenantCaches(): Promise<void> {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      registration.active.postMessage({ type: "CLEAR_TENANT_CACHE" });
    }
    // Also explicitly purge CacheStorage from window
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  }
}
