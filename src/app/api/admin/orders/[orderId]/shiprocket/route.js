import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import Order from "@/server/models/Order";
import { badRequest, notFound } from "@/server/utils/apiError";
import {
  createShiprocketOrder,
  assignAWB,
  requestPickup,
  generateShippingLabel,
} from "@/server/services/shiprocket.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Helper to populate user details for order notifications or Shiprocket billing info
async function getOrderWithCustomer(orderId) {
  const order = await Order.findOne({ orderId }).populate("user", "email fullName");
  if (!order) throw notFound("Order not found.");
  return {
    ...order.toObject(),
    customer: {
      email: order.user?.email || "customer@foodville.in",
      name: order.user?.fullName || order.address?.receiverName || "Customer",
    },
  };
}

/**
 * POST /api/admin/orders/:orderId/shiprocket
 * Body: { weight, length, width, height }
 * Action: Packs order and pushes details to Shiprocket (creates Shiprocket order).
 */
export const POST = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { orderId } = await params;
  const { weight, length, width, height } = await req.json().catch(() => ({}));

  if (!weight || !length || !width || !height) {
    throw badRequest("Weight and box dimensions (length, width, height) are required.");
  }

  const orderDoc = await Order.findOne({ orderId });
  if (!orderDoc) throw notFound("Order not found.");

  if (orderDoc.status === "cancelled") {
    throw badRequest("Cancelled orders cannot be pushed to Shiprocket.");
  }
  if (orderDoc.shipping?.shiprocketOrderId) {
    throw badRequest("This order is already pushed to Shiprocket.");
  }

  // Ensure order is paid (if online) or confirmed (if COD)
  if (orderDoc.paymentMethod === "razorpay" && orderDoc.paymentStatus !== "paid") {
    throw badRequest("Unpaid Razorpay orders cannot be shipped.");
  }

  const orderWithUser = await getOrderWithCustomer(orderId);
  const result = await createShiprocketOrder(orderWithUser, { weight, length, width, height });

  // Update order database record
  orderDoc.status = "confirmed";
  orderDoc.shipping = {
    shiprocketOrderId: result.shiprocketOrderId,
    shiprocketShipmentId: result.shiprocketShipmentId,
    weight: Number(weight),
    dimensions: {
      length: Number(length),
      width: Number(width),
      height: Number(height),
    },
  };
  orderDoc.timeline.push({
    status: "confirmed",
    at: new Date(),
    note: `Order packed & registered in Shiprocket (Shipment ID: ${result.shiprocketShipmentId})`,
  });

  await orderDoc.save();
  return ok(orderDoc.toObject());
});

/**
 * PUT /api/admin/orders/:orderId/shiprocket
 * Action: Assigns Courier AWB tracking ID and requests pickup (marks as shipped).
 */
export const PUT = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { orderId } = await params;

  const orderDoc = await Order.findOne({ orderId });
  if (!orderDoc) throw notFound("Order not found.");

  const shipmentId = orderDoc.shipping?.shiprocketShipmentId;
  if (!shipmentId) {
    throw badRequest("Order must be pushed to Shiprocket before booking courier.");
  }
  if (orderDoc.shipping?.awbCode) {
    throw badRequest("AWB is already assigned to this shipment.");
  }

  // 1. Assign AWB Courier
  const courierDetails = await assignAWB(shipmentId);

  // 2. Request Pickup
  try {
    await requestPickup(shipmentId);
  } catch (err) {
    console.error("[Shiprocket] Pickup booking failed, proceeding anyway", err);
  }

  // Update order record
  orderDoc.status = "shipped";
  orderDoc.shipping.awbCode = courierDetails.awbCode;
  orderDoc.shipping.courierName = courierDetails.courierName;
  orderDoc.timeline.push({
    status: "shipped",
    at: new Date(),
    note: `Shipped via ${courierDetails.courierName} (AWB Tracking: ${courierDetails.awbCode})`,
  });

  await orderDoc.save();
  return ok(orderDoc.toObject());
});

/**
 * GET /api/admin/orders/:orderId/shiprocket
 * Action: Generates and saves the printable AWB shipping label URL.
 */
export const GET = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { orderId } = await params;

  const orderDoc = await Order.findOne({ orderId });
  if (!orderDoc) throw notFound("Order not found.");

  const shipmentId = orderDoc.shipping?.shiprocketShipmentId;
  if (!shipmentId) {
    throw badRequest("Order has no shipment ID generated.");
  }

  // Retrieve label from API
  const { labelUrl } = await generateShippingLabel(shipmentId);

  // Store in DB for future reference
  orderDoc.shipping.labelUrl = labelUrl;
  await orderDoc.save();

  return ok({ labelUrl });
});
