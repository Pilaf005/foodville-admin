import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAuth } from "@/server/middleware/auth";
import { getMe } from "@/server/controllers/auth.controller";
import { signAuthToken, setAuthCookie } from "@/server/services/token.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me — the signed-in user (401 when the cookie is missing/invalid).
 *
 * ROLE REFRESH: the JWT stores the role from login time. If an admin promotes a
 * user afterwards, their cookie still says the OLD role, so the edge guard
 * keeps bouncing them off /admin. Whenever the DB role differs from the token
 * role we re-issue the cookie here — the next click on "Admin Dashboard" just
 * works, no re-login needed.
 */
export const GET = withRoute(async (req) => {
  const auth = await requireAuth(req);
  const user = await getMe(auth.userId);

  if (user.role !== auth.role) {
    const token = await signAuthToken({ userId: user.id, email: user.email, role: user.role });
    return setAuthCookie(ok(user), token);
  }

  return ok(user);
});
