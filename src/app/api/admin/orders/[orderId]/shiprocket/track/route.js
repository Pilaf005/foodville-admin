import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import Order from "@/server/models/Order";
import { badRequest, notFound } from "@/server/utils/apiError";
import { trackShipment, getShiprocketOrderDetails } from "@/server/services/shiprocket.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapShiprocketStatus(statusName) {
  if (!statusName) return null;
  const s = String(statusName).toLowerCase().trim();
  if (["delivered"].includes(s)) return "delivered";
  if (["out for delivery", "out_for_delivery", "outfordelivery"].includes(s)) return "out_for_delivery";
  if (["shipped", "picked up", "picked_up", "in transit", "in_transit", "awb assigned", "ready to ship"].includes(s)) return "shipped";
  if (["cancelled", "canceled", "rto"].includes(s)) return "cancelled";
  return null;
}

/**
 * GET /api/admin/orders/:orderId/shiprocket/track
 * Action: Fetches real-time shipment transit updates from Shiprocket.
 *         Syncs cancellations and deliveries directly with MongoDB.
 */
export const GET = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { orderId } = await params;

  const orderDoc = await Order.findOne({ orderId });
  if (!orderDoc) throw notFound("Order not found.");

  const shiprocketOrderId = orderDoc.shipping?.shiprocketOrderId;
  if (!shiprocketOrderId) {
    throw badRequest("This order has not been registered on Shiprocket yet.");
  }

  // 1. Fetch main order status details from Shiprocket
  let shiprocketOrder = null;
  try {
    shiprocketOrder = await getShiprocketOrderDetails(shiprocketOrderId);
  } catch (err) {
    console.error(`[Shiprocket Sync Error] Failed to fetch order details for ${orderId}:`, err);
  }

  // 2. If Shiprocket order is cancelled, update local database immediately and return
  if (shiprocketOrder) {
    const srStatus = shiprocketOrder.status;
    const mappedStatus = mapShiprocketStatus(srStatus);

    if (mappedStatus === "cancelled" && orderDoc.status !== "cancelled") {
      console.log(`[Shiprocket Sync] Order ${orderId} cancelled in Shiprocket. Updating local state.`);
      orderDoc.status = "cancelled";
      orderDoc.timeline.push({
        status: "cancelled",
        at: new Date(),
        note: `[Shiprocket Auto-Sync] Order marked as "${srStatus}" on Shiprocket Dashboard.`,
      });
      await orderDoc.save();

      return ok({
        shipment_status: "Cancelled",
        is_cancelled: true,
        shipment_track_activities: [
          {
            activity: "Order cancelled directly on Shiprocket Dashboard",
            location: "Shiprocket Panel",
            date: new Date().toISOString(),
          }
        ]
      });
    }

    // Sync AWB generated directly inside Shiprocket Dashboard back to MongoDB
    if (shiprocketOrder.shipments?.awb && !orderDoc.shipping?.awbCode) {
      const assignedAwb = shiprocketOrder.shipments.awb;
      const assignedCourier = shiprocketOrder.shipments.courier || "Shiprocket Partner";
      console.log(`[Shiprocket Sync] Detected AWB assigned in Shiprocket Panel: ${assignedAwb}. Syncing to MongoDB.`);
      
      orderDoc.shipping.awbCode = assignedAwb;
      orderDoc.shipping.courierName = assignedCourier;
      
      // Auto transition to shipped if currently packed/placed
      if (orderDoc.status !== "shipped" && orderDoc.status !== "delivered" && orderDoc.status !== "cancelled") {
        orderDoc.status = "shipped";
        orderDoc.timeline.push({
          status: "shipped",
          at: new Date(),
          note: `[Shiprocket Auto-Sync] Shipped via ${assignedCourier} (AWB Tracking: ${assignedAwb})`,
        });
      }
      await orderDoc.save();
    }

    // Sync AWB generated directly inside Shiprocket Dashboard back to MongoDB
    if (shiprocketOrder.shipments?.awb && !orderDoc.shipping?.awbCode) {
      const assignedAwb = shiprocketOrder.shipments.awb;
      const assignedCourier = shiprocketOrder.shipments.courier || "Shiprocket Partner";
      console.log(`[Shiprocket Sync] Detected AWB assigned in Shiprocket Panel: ${assignedAwb}. Syncing to MongoDB.`);
      
      orderDoc.shipping.awbCode = assignedAwb;
      orderDoc.shipping.courierName = assignedCourier;
      
      // Auto transition to shipped if currently packed/placed
      if (orderDoc.status !== "shipped" && orderDoc.status !== "delivered" && orderDoc.status !== "cancelled") {
        orderDoc.status = "shipped";
        orderDoc.timeline.push({
          status: "shipped",
          at: new Date(),
          note: `[Shiprocket Auto-Sync] Shipped via ${assignedCourier} (AWB Tracking: ${assignedAwb})`,
        });
      }
      await orderDoc.save();
    }

    // Fallback status mapping (if not cancelled, check other main states)
    if (mappedStatus && mappedStatus !== orderDoc.status) {
      console.log(`[Shiprocket Sync] Updating Order ${orderId} status: ${orderDoc.status} -> ${mappedStatus}`);
      orderDoc.status = mappedStatus;
      orderDoc.timeline.push({
        status: mappedStatus,
        at: new Date(),
        note: `[Shiprocket Auto-Sync] Mapped courier status "${srStatus}" to "${mappedStatus}"`,
      });
      await orderDoc.save();
    }
  }

  // 3. Fetch detailed transit scan logs via AWB
  const awbCode = orderDoc.shipping?.awbCode;
  if (!awbCode) {
    // If no AWB exists yet, return empty logs but with mapped main status
    return ok({
      shipment_status: shiprocketOrder?.status || "Booked",
      shipment_track_activities: [],
    });
  }

  try {
    const trackingData = await trackShipment(awbCode);
    
    // Double check status from scans and sync if changed
    const scanStatus = trackingData.shipment_status;
    const mappedScanStatus = mapShiprocketStatus(scanStatus);
    
    if (mappedScanStatus && mappedScanStatus !== orderDoc.status) {
      console.log(`[Shiprocket Scan Sync] Updating Order ${orderId} status: ${orderDoc.status} -> ${mappedScanStatus}`);
      orderDoc.status = mappedScanStatus;
      orderDoc.timeline.push({
        status: mappedScanStatus,
        at: new Date(),
        note: `[Shiprocket Auto-Sync] Mapped scan status "${scanStatus}" to "${mappedScanStatus}"`,
      });
      await orderDoc.save();
    }

    return ok(trackingData);
  } catch (err) {
    console.warn(`[Shiprocket Scan Warning] Could not fetch detailed AWB scans for ${orderId}:`, err?.message || err);
    // If scanning failed (e.g. 404 / no scans yet), return the base state we have
    return ok({
      shipment_status: shiprocketOrder?.status || "AWB Assigned",
      shipment_track_activities: [],
    });
  }
});
