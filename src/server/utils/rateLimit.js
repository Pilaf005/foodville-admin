/**
 * Sliding-window rate limiter.
 *
 * In-memory and therefore per-instance (best-effort on serverless). It is a
 * defence-in-depth layer only — durable limits that MUST hold across instances
 * (e.g. the OTP resend cooldown) are enforced in the database instead.
 */
import { tooManyRequests } from "@/server/utils/apiError";

const GLOBAL_KEY = "__foodville_ratelimit__";
let store = globalThis[GLOBAL_KEY];
if (!store) store = globalThis[GLOBAL_KEY] = new Map();

/** Best-effort client IP (Vercel/proxies set x-forwarded-for). */
export function getClientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Throws 429 when the caller exceeds `limit` requests in `windowMs`.
 * @param {Request} req
 * @param {{key: string, limit?: number, windowMs?: number}} opts
 */
export function rateLimit(req, { key, limit = 60, windowMs = 60_000 } = {}) {
  const bucket = `${key}:${getClientIp(req)}`;
  const now = Date.now();

  const hits = (store.get(bucket) || []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000));
    throw tooManyRequests("Too many requests. Please slow down and try again shortly.", { retryAfter });
  }

  hits.push(now);
  store.set(bucket, hits);

  // Opportunistic cleanup so the map can't grow without bound.
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (!v.length || now - v[v.length - 1] > windowMs) store.delete(k);
    }
  }
}
