/**
 * Auth guards for Route Handlers (Node runtime).
 *
 * `src/middleware.js` blocks unauthenticated traffic at the edge, but every
 * protected route ALSO verifies here — defence in depth, so a route is never
 * reliant on the matcher config being right.
 */
import { verifyAuthToken, AUTH_COOKIE } from "@/server/services/token.service";
import { unauthorized, forbidden } from "@/server/utils/apiError";

/** Returns { userId, email, role } or null. Never throws. */
export async function getAuth(req) {
  const token = req.cookies?.get?.(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(req) {
  const auth = await getAuth(req);
  if (!auth) throw unauthorized("Please sign in to continue.");
  return auth;
}

export async function requireAdmin(req) {
  const auth = await requireAuth(req);
  if (auth.role !== "admin") throw forbidden("Admin access required.");
  return auth;
}
