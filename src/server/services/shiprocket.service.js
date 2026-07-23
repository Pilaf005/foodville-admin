import { env } from "@/server/config/env";
import { AppError } from "@/server/utils/apiError";

let cachedToken = null;
let tokenExpiry = null; // timestamp when token expires

/**
 * Fetch a valid Shiprocket JWT token, reusing cached one if valid.
 */
async function getShiprocketToken() {
  const credentials = env.shiprocket;
  if (!credentials.email || !credentials.password) {
    throw new AppError(
      "Shiprocket is not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.",
      503,
      "SHIPROCKET_NOT_CONFIGURED"
    );
  }

  // Tokens are valid for 10 days. We refresh 1 hour before expiry.
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry - 3600 * 1000) {
    return cachedToken;
  }

  console.log("[Shiprocket] Fetching new authentication token...");
  try {
    const cleanPassword = String(credentials.password).replace("\\$", "$");
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email,
        password: cleanPassword,
      }),
    });

    const body = await res.json();
    if (!res.ok || !body.token) {
      throw new Error(body.message || "Failed to authenticate with Shiprocket");
    }

    cachedToken = body.token;
    // Set token expiry to 9 days from now to be safe
    tokenExpiry = Date.now() + 9 * 24 * 3600 * 1000;
    return cachedToken;
  } catch (err) {
    console.error("[Shiprocket Auth Error]", err);
    throw new AppError(`Shiprocket Auth Failed: ${err.message}`, 500, "SHIPROCKET_AUTH_FAILED");
  }
}

/**
 * Make an authenticated API request to Shiprocket.
 */
async function shiprocketRequest(endpoint, options = {}) {
  const token = await getShiprocketToken();
  const url = `https://apiv2.shiprocket.in/v1/external${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError(
      body.message || `Shiprocket API error: ${response.statusText}`,
      response.status,
      "SHIPROCKET_API_ERROR"
    );
  }

  return body;
}

/**
 * Formats a Date object into 'YYYY-MM-DD HH:MM' format.
 */
function formatShiprocketDate(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Creates a shipment order on Shiprocket.
 */
export async function createShiprocketOrder(order, { weight, length, width, height }) {
  const pickupLocation = env.shiprocket.pickupLocation || "Primary";

  const totalSubtotal = order.amounts?.subtotal || order.items?.reduce((s, i) => s + (i.price * i.qty), 0) || 1;
  const totalDiscount = order.amounts?.discount || 0;
  const netSubtotal = Math.max(0, totalSubtotal - totalDiscount);

  // Format order items for Shiprocket with net effective unit price
  const orderItems = order.items.map((item) => {
    const itemTotal = item.price * item.qty;
    const itemDiscount = totalSubtotal > 0 ? (itemTotal / totalSubtotal) * totalDiscount : 0;
    const netItemTotal = Math.max(0, itemTotal - itemDiscount);
    const netUnitPrice = item.qty > 0 ? Math.round((netItemTotal / item.qty) * 100) / 100 : item.price;
    const finalPrice = Number.isNaN(netUnitPrice) || netUnitPrice <= 0 ? (item.price || 1) : netUnitPrice;

    return {
      name: item.name,
      sku: item.slug || String(item.productId || "").toLowerCase().replace(/\s+/g, "-"),
      units: item.qty,
      selling_price: String(finalPrice),
      discount: "0",
      tax: "5",
      hsn: item.hsnCode || "2106",
    };
  });

  const payload = {
    order_id: order.orderId,
    order_date: formatShiprocketDate(order.placedAt || order.createdAt || new Date()),
    pickup_location: pickupLocation,
    billing_customer_name: order.address.receiverName,
    billing_last_name: "",
    billing_address: `${order.address.houseFlat}, ${order.address.area}`,
    billing_address_2: order.address.landmark || "",
    billing_city: order.address.city,
    billing_pincode: order.address.pincode,
    billing_state: order.address.state || "Delhi",
    billing_country: "India",
    billing_email: order.customer?.email || "customer@foodville.in",
    billing_phone: order.address.phone,
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: order.paymentMethod === "cod" ? "COD" : "Prepaid",
    sub_total: netSubtotal,
    discount: 0,
    shipping_charges: order.amounts?.deliveryCharge || 0,
    length: Number(length),
    breadth: Number(width),
    height: Number(height),
    weight: Number(weight),
  };

  console.log(`[Shiprocket] Creating order for FV ID: ${order.orderId}`, payload);
  const res = await shiprocketRequest("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.order_id || !res.shipment_id) {
    throw new AppError("Shiprocket order creation returned invalid response details.", 500, "SHIPROCKET_INVALID_RESPONSE");
  }

  return {
    shiprocketOrderId: String(res.order_id),
    shiprocketShipmentId: String(res.shipment_id),
  };
}

/**
 * Assigns an AWB tracking code to the shipment using Shiprocket's automation.
 */
export async function assignAWB(shipmentId) {
  console.log(`[Shiprocket] Assigning AWB for Shipment ID: ${shipmentId}`);
  const res = await shiprocketRequest("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({ shipment_id: shipmentId }),
  });

  const responseData = res.response?.data;
  if (!responseData || !responseData.awb_code) {
    throw new AppError(
      res.response?.message || "Failed to assign AWB or no courier available.",
      500,
      "SHIPROCKET_AWB_FAILED"
    );
  }

  return {
    awbCode: responseData.awb_code,
    courierName: responseData.courier_name || "",
  };
}

/**
 * Requests shipping pickup from courier.
 */
export async function requestPickup(shipmentId) {
  console.log(`[Shiprocket] Requesting courier pickup for Shipment ID: ${shipmentId}`);
  const res = await shiprocketRequest("/couriers/generate/pickup", {
    method: "POST",
    body: JSON.stringify({ shipment_id: [Number(shipmentId)] }),
  });

  return res;
}

/**
 * Generates and returns printable shipping label URL.
 */
export async function generateShippingLabel(shipmentId) {
  console.log(`[Shiprocket] Requesting shipping label for Shipment ID: ${shipmentId}`);
  const res = await shiprocketRequest("/courier/generate/label", {
    method: "POST",
    body: JSON.stringify({ shipment_ids: [Number(shipmentId)] }),
  });

  if (!res.label_url) {
    throw new AppError("Could not generate shipping label from Shiprocket.", 500, "SHIPROCKET_LABEL_FAILED");
  }

  return {
    labelUrl: res.label_url,
  };
}

/**
 * Gets real-time tracking data for a shipment from Shiprocket.
 */
export async function trackShipment(awbCode) {
  console.log(`[Shiprocket] Fetching tracking updates for AWB Code: ${awbCode}`);
  const res = await shiprocketRequest(`/courier/track/awb/${awbCode}`, {
    method: "GET",
  });

  const trackingData = res.tracking_data;
  if (!trackingData || trackingData.track_status === 0) {
    throw new AppError("No tracking data available for this AWB code.", 404, "TRACKING_NOT_FOUND");
  }

  return trackingData;
}

/**
 * Cancels an order on Shiprocket.
 */
export async function cancelShiprocketOrder(shiprocketOrderId) {
  console.log(`[Shiprocket] Cancelling order ID: ${shiprocketOrderId}`);
  const res = await shiprocketRequest("/orders/cancel", {
    method: "POST",
    body: JSON.stringify({ ids: [Number(shiprocketOrderId)] }),
  });
  return res;
}

/**
 * Fetches general order details (including main status) from Shiprocket.
 */
export async function getShiprocketOrderDetails(shiprocketOrderId) {
  console.log(`[Shiprocket] Fetching details for Shiprocket Order ID: ${shiprocketOrderId}`);
  const res = await shiprocketRequest(`/orders/show/${shiprocketOrderId}`, {
    method: "GET",
  });
  return res.data;
}
