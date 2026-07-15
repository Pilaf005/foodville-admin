/**
 * Orders.
 *
 * An order is always built from the user's SERVER cart and priced server-side.
 * COD orders are confirmed immediately; Razorpay orders stay `pending` until a
 * verified signature (or webhook) proves payment.
 */
import Order from "@/server/models/Order";
import Cart from "@/server/models/Cart";
import Address from "@/server/models/Address";
import Product from "@/server/models/Product";
import Payment from "@/server/models/Payment";
import { nextSequence } from "@/server/models/Counter";
import { priceItems } from "@/server/services/pricing.service";
import { refundPayment } from "@/server/services/razorpay.service";
import { cancelShiprocketOrder } from "@/server/services/shiprocket.service";
import { badRequest, notFound } from "@/server/utils/apiError";

export function serializeOrder(o) {
  if (!o) return null;
  return {
    id: String(o._id),
    orderId: o.orderId,
    items: o.items,
    amounts: o.amounts,
    address: o.address,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    status: o.status,
    timeline: o.timeline,
    placedAt: o.placedAt,
    razorpayOrderId: o.razorpay?.orderId,
  };
}

async function generateOrderId() {
  const seq = await nextSequence("order");
  return `FV${String(100000 + seq)}`;
}

/**
 * Create an order from the signed-in user's cart.
 * @param {string} userId
 * @param {{ addressId?: string, address?: object, paymentMethod: "cod"|"razorpay" }} input
 */
export async function createOrder(userId, { addressId, address, paymentMethod }) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || !cart.items.length) throw badRequest("Your cart is empty.");

  // Resolve the delivery address (saved one, or an inline one from checkout).
  let snapshot = address;
  if (addressId) {
    const saved = await Address.findOne({ _id: addressId, user: userId }).lean();
    if (!saved) throw notFound("Delivery address not found.");
    snapshot = saved;
  }
  if (!snapshot || !snapshot.city || !snapshot.receiverName || !snapshot.phone || !snapshot.pincode) {
    throw badRequest("A complete delivery address (name, phone, PIN code, city) is required.");
  }

  // Prices come from the catalog — never from the client.
  const { items, amounts } = await priceItems(cart.items);

  const orderId = await generateOrderId();
  const isCod = paymentMethod === "cod";

  const order = await Order.create({
    orderId,
    user: userId,
    items,
    amounts,
    address: {
      label: snapshot.label,
      receiverName: snapshot.receiverName,
      phone: snapshot.phone,
      houseFlat: snapshot.houseFlat,
      area: snapshot.area,
      landmark: snapshot.landmark,
      city: snapshot.city,
      state: snapshot.state,
      pincode: snapshot.pincode,
    },
    paymentMethod,
    paymentStatus: "pending",
    status: isCod ? "confirmed" : "pending",
    timeline: isCod
      ? [{ status: "confirmed", at: new Date(), note: "Order placed (Cash on Delivery)" }]
      : [{ status: "pending", at: new Date(), note: "Awaiting payment" }],
  });

  // COD is final at placement: empty the cart and decrement stock now.
  if (isCod) {
    await finaliseOrder(order);
  }

  return serializeOrder(order.toObject());
}

/** Called once an order is genuinely confirmed (COD placed, or payment verified). */
export async function finaliseOrder(order) {
  // Remove only the ORDERED items — if the customer abandoned a payment,
  // shopped some more, then finished paying the old order, their newer cart
  // additions must survive.
  await Cart.updateOne(
    { user: order.user },
    { $pull: { items: { productId: { $in: order.items.map((i) => i.productId) } } } }
  );

  await Promise.all(
    order.items.map((item) =>
      Product.updateOne({ numericId: item.productId }, { $inc: { stock: -item.qty } })
    )
  );
}

/**
 * Cancel an order — the flow Amazon/Flipkart use:
 *  - customers may cancel any time BEFORE it ships,
 *  - admins may also cancel shipped/out-for-delivery orders,
 *  - delivered and already-cancelled orders are terminal,
 *  - reserved stock is put back (only if it was actually decremented),
 *  - paid online orders get an automatic Razorpay refund; if the refund call
 *    fails the order still cancels and the timeline says it'll be manual.
 */
export async function cancelOrder(order, { by = "customer", note = "" } = {}) {
  if (order.status === "cancelled") return serializeOrder(order.toObject()); // idempotent
  if (order.status === "delivered") {
    throw badRequest("Delivered orders can't be cancelled. Please use a return/refund request.");
  }
  if (by === "customer" && ["shipped", "out_for_delivery"].includes(order.status)) {
    throw badRequest("This order has already shipped and can no longer be cancelled.");
  }

  // If order was pushed to Shiprocket, cancel it there
  if (order.shipping?.shiprocketOrderId) {
    try {
      await cancelShiprocketOrder(order.shipping.shiprocketOrderId);
      order.timeline.push({
        status: "cancelled",
        at: new Date(),
        note: `Shipment cancelled in Shiprocket (Order ID: ${order.shipping.shiprocketOrderId})`,
      });
    } catch (err) {
      console.error(`[Shiprocket Cancel Error] Admin Cancel Order ${order.orderId}:`, err?.message || err);
    }
  }

  // Stock was only decremented once the order was finalised (COD at placement,
  // online on payment capture) — restore exactly in that case.
  const stockWasReserved = order.paymentMethod === "cod" || order.paymentStatus === "paid";
  if (stockWasReserved) {
    await Promise.all(
      order.items.map((item) =>
        Product.updateOne({ numericId: item.productId }, { $inc: { stock: item.qty } })
      )
    );
  }

  // Automatic refund for captured online payments.
  if (order.paymentStatus === "paid" && order.razorpay?.paymentId) {
    try {
      const refund = await refundPayment(order.razorpay.paymentId, order.amounts.total);
      order.paymentStatus = "refunded";
      await Payment.create({
        order: order._id,
        orderId: order.orderId,
        user: order.user,
        razorpayOrderId: order.razorpay.orderId,
        razorpayPaymentId: order.razorpay.paymentId,
        amount: order.amounts.total,
        status: "refunded",
        source: "checkout",
        raw: refund,
      });
      order.timeline.push({
        status: "cancelled",
        at: new Date(),
        note: `Refund of ₹${order.amounts.total} initiated to the original payment method`,
      });
    } catch (err) {
      order.timeline.push({
        status: "cancelled",
        at: new Date(),
        note: "Refund could not be auto-initiated — it will be processed manually",
      });
      // eslint-disable-next-line no-console
      console.error("[refund]", order.orderId, err?.message);
    }
  }

  order.status = "cancelled";
  order.timeline.push({
    status: "cancelled",
    at: new Date(),
    note: note || (by === "admin" ? "Cancelled by Foodville" : "Cancelled by you"),
  });
  await order.save();

  return serializeOrder(order.toObject());
}

/** Customer-initiated cancellation (owner-scoped). */
export async function cancelOwnOrder(userId, orderId) {
  const order = await Order.findOne({ orderId, user: userId });
  if (!order) throw notFound("Order not found.");
  return cancelOrder(order, { by: "customer" });
}

export async function listOrders(userId) {
  const docs = await Order.find({ user: userId }).sort({ placedAt: -1 }).lean();
  return docs.map(serializeOrder);
}

export async function getOrder(userId, orderId) {
  const doc = await Order.findOne({ orderId, user: userId }).lean();
  if (!doc) throw notFound("Order not found.");
  return serializeOrder(doc);
}
