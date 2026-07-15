/**
 * Tiny in-memory TTL cache for hot read endpoints (categories, product lists).
 * Cuts repeat DB round-trips and keeps API latency low. Per-instance, so it is
 * a latency optimisation, never a correctness mechanism — always safe to miss.
 */
const GLOBAL_KEY = "__foodville_cache__";
let store = globalThis[GLOBAL_KEY];
if (!store) store = globalThis[GLOBAL_KEY] = new Map();

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs = 60_000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Read-through helper: returns the cached value or computes + caches it. */
export async function cached(key, ttlMs, compute) {
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  const value = await compute();
  cacheSet(key, value, ttlMs);
  return value;
}

/** Invalidate everything, or every key starting with `prefix` (use after writes). */
export function cacheClear(prefix) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

/** Standard CDN/browser cache headers for public, cacheable GET responses. */
export const publicCacheHeaders = (seconds = 60, swr = 300) => ({
  "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${swr}`,
});
