import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminListUsers } from "@/server/controllers/admin.controller";
import User from "@/server/models/User";
import Order from "@/server/models/Order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/users?status=&search=&page=&limit=
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

// DELETE /api/admin/users — Purge all unverified pending users who have 0 orders
export const DELETE = withRoute(async (req) => {
  await requireAdmin(req);

  const pendingUsers = await User.find({ status: "pending", role: { $ne: "admin" } }).lean();
  let purgedCount = 0;

  for (const user of pendingUsers) {
    const orderCount = await Order.countDocuments({ user: user._id });
    if (orderCount === 0) {
      await User.deleteOne({ _id: user._id });
      purgedCount++;
    }
  }

  return ok({ success: true, purgedCount });
});
