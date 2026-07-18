import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { notFound } from "@/server/utils/apiError";
import User from "@/server/models/User";
import Address from "@/server/models/Address";
import Order from "@/server/models/Order";
 
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 
// GET /api/admin/users/:id  — fetch single user details, addresses, and order history
export const GET = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
 
  const user = await User.findById(id).lean();
  if (!user) throw notFound("Customer not found.");
 
  const [addresses, orders] = await Promise.all([
    Address.find({ user: id }).sort({ isDefault: -1, createdAt: -1 }).lean(),
    Order.find({ user: id, isDraft: { $ne: true } }).sort({ createdAt: -1 }).lean(),
  ]);
 
  const totalSpent = orders
    .filter(o => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + (o.amounts?.total || 0), 0);
 
  return ok({
    user: {
      id: String(user._id),
      email: user.email,
      fullName: user.fullName || "",
      phone: user.phone || "",
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    addresses,
    orders: orders.map(o => ({
      orderId: o.orderId,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: o.amounts?.total || 0,
      createdAt: o.createdAt,
    })),
    stats: {
      totalOrders: orders.length,
      totalSpent,
    }
  });
});
