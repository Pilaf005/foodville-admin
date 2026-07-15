import crypto from "node:crypto";
import Razorpay from "razorpay";
import { env } from "@/server/config/env";
import { AppError } from "@/server/utils/apiError";

let client = null;

function razorpay() {
  if (client) return client;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new AppError(
      "Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      503,
      "PAYMENTS_NOT_CONFIGURED"
    );
  }
  client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return client;
}

export const toPaise = (rupees) => Math.round(Number(rupees) * 100);

export async function createRazorpayOrder({ amount, receipt, notes }) {
  const order = await razorpay().orders.create({
    amount: toPaise(amount),
    currency: "INR",
    receipt: String(receipt).slice(0, 40),
    notes: notes || {},
  });
  return order;
}

export function verifyCheckoutSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""));
  const bufB = Buffer.from(String(b || ""));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function fetchPayment(paymentId) {
  return razorpay().payments.fetch(paymentId);
}

export async function refundPayment(paymentId, amountRupees) {
  return razorpay().payments.refund(paymentId, {
    amount: toPaise(amountRupees),
    speed: "normal",
  });
}
