/**
 * Payment audit trail — one row per gateway interaction.
 * Kept separate from Order so we retain the full history (attempts, failures,
 * webhook payloads) even when an order is retried or refunded.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    orderId: { type: String, index: true }, // our human order id
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },

    gateway: { type: String, default: "razorpay" },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },

    amount: { type: Number, required: true }, // rupees
    currency: { type: String, default: "INR" },
    method: { type: String, default: "" }, // upi / card / netbanking (from gateway)

    status: {
      type: String,
      enum: ["created", "authorized", "captured", "failed", "refunded"],
      default: "created",
      index: true,
    },

    // Raw gateway payloads, for dispute/debugging.
    raw: { type: Schema.Types.Mixed },
    source: { type: String, enum: ["checkout", "webhook"], default: "checkout" },
  },
  { timestamps: true, minimize: false }
);

const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export default Payment;
