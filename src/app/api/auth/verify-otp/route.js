import { ok, withRoute } from "@/server/utils/apiResponse";
import { verifyOtpSchema } from "@/server/validators/auth.validators";
import { verifyOtp } from "@/server/controllers/auth.controller";
import { setAuthCookie } from "@/server/services/token.service";
import { rateLimit } from "@/server/utils/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/verify-otp  { email, code }  → sets the httpOnly auth cookie
export const POST = withRoute(async (req) => {
  rateLimit(req, { key: "otp-verify", limit: 12, windowMs: 10 * 60_000 });

  const body = await req.json().catch(() => ({}));
  const { email, code } = verifyOtpSchema.parse(body);

  const { user, token } = await verifyOtp(email, code);

  // The JWT goes back ONLY as an httpOnly cookie — never in the body, so no
  // browser script can read it. The response carries just the user.
  return setAuthCookie(ok({ user }), token);
});
