import { z } from "zod";
import { ok, withRoute } from "@/server/utils/apiResponse";
import { loginWithPassword } from "@/server/controllers/auth.controller";
import { setAuthCookie } from "@/server/services/token.service";
import { rateLimit } from "@/server/utils/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Action: Validates admin credentials, signs JWT, sets httpOnly session cookie.
 */
export const POST = withRoute(async (req) => {
  // Rate limit login attempts per IP to prevent brute force attacks
  rateLimit(req, { key: "login-attempt", limit: 10, windowMs: 15 * 60_000 });

  const body = await req.json().catch(() => ({}));
  const { email, password } = loginSchema.parse(body);

  const { user, token } = await loginWithPassword(email, password);

  // Set httpOnly cookie on response
  return setAuthCookie(ok({ user }), token);
});
