import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminUpdateOrderStatus } from "@/server/controllers/admin.controller";
import { badRequest } from "@/server/utils/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/admin/orders/:orderId  { status, note }
export const PATCH = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { orderId } = await params;
  const { status, note } = await req.json().catch(() => ({}));
  if (!status) throw badRequest("A status is required.");
  return ok(await adminUpdateOrderStatus(orderId, status, note));
});
