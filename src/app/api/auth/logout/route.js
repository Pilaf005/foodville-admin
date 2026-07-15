import { ok, withRoute } from "@/server/utils/apiResponse";
import { clearAuthCookie } from "@/server/services/token.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/logout — expires the auth cookie.
export const POST = withRoute(async () => clearAuthCookie(ok({ loggedOut: true })));
