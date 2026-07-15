import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminListUsers } from "@/server/controllers/admin.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/users?status=&search=&page=&limit=
// status=pending lists captured leads who never verified their OTP.
export const GET = withRoute(async (req) => {
  await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  const result = await adminListUsers({
    status: sp.get("status") || undefined,
    search: sp.get("search") || undefined,
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: Math.min(100, Number(sp.get("limit")) || 20),
  });
  return ok(result.items, { meta: result.meta });
});
