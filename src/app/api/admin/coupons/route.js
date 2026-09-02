import { ok, created, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminListCoupons, adminCreateCoupon } from "@/server/controllers/coupon.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/coupons?search=&page=&limit=
export const GET = withRoute(async (req) => {
  await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  const result = await adminListCoupons({
    search: sp.get("search") || undefined,
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: Math.min(100, Number(sp.get("limit")) || 50),
  });
  return ok(result.items, { meta: result.meta });
});

// POST /api/admin/coupons
export const POST = withRoute(async (req) => {
  await requireAdmin(req);
  const body = await req.json().catch(() => ({}));
  return created(await adminCreateCoupon(body));
});
