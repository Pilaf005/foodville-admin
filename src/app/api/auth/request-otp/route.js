import { ok, withRoute } from "@/server/utils/apiResponse";
import { requestOtpSchema } from "@/server/validators/auth.validators";
import { requestOtp } from "@/server/controllers/auth.controller";
import { rateLimit } from "@/server/utils/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/request-otp  { email }
export const POST = withRoute(async (req) => {
  // Abuse guard (per IP). The per-email cooldown is enforced in the DB.
  rateLimit(req, { key: "otp-request", limit: 6, windowMs: 10 * 60_000 });

  const body = await req.json().catch(() => ({}));
  const { email } = requestOtpSchema.parse(body);

  return ok(await requestOtp(email));
});
