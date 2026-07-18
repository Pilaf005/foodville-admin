import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminUpdateOrderStatus } from "@/server/controllers/admin.controller";
import { badRequest, notFound } from "@/server/utils/apiError";
import Order from "@/server/models/Order";
import Payment from "@/server/models/Payment";
 
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 
// GET /api/admin/orders/:orderId
export const GET = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { orderId } = await params;
  const order = await Order.findOne({ orderId, isDraft: { $ne: true } }).populate("user", "email fullName").lean();
  if (!order) throw notFound("Order not found.");
  return ok(order);
});
 
// PATCH /api/admin/orders/:orderId  { status, note, deliveryMethod, localDelivery }
export const PATCH = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { orderId } = await params;
  const { status, note, deliveryMethod, localDelivery } = await req.json().catch(() => ({}));
  if (!status) throw badRequest("A status is required.");
  return ok(await adminUpdateOrderStatus(orderId, status, note, { deliveryMethod, localDelivery }));
});
 
// DELETE /api/admin/orders/:orderId
export const DELETE = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { orderId } = await params;
 
  const result = await Order.deleteOne({ orderId });
  if (result.deletedCount === 0) throw notFound("Order not found.");
 
  // Clean up any payments associated with this order
  await Payment.deleteMany({ orderId });
 
  return ok({ success: true, message: "Order deleted successfully." });
});
