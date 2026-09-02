import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminUpdateCoupon, adminDeleteCoupon } from "@/server/controllers/coupon.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/admin/coupons/:id
export const PUT = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return ok(await adminUpdateCoupon(id, body));
});

// DELETE /api/admin/coupons/:id
export const DELETE = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  return ok(await adminDeleteCoupon(id));
});
